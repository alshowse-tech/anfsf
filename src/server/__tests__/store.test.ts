/**
 * ANFSF Server — SQLite Pipeline Run Store Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PipelineRunStore } from '../store';

describe('PipelineRunStore (SQLite)', () => {
  let tmpDir: string;
  let dbPath: string;
  let store: PipelineRunStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anfsf-store-'));
    dbPath = path.join(tmpDir, 'runs.db');
    store = new PipelineRunStore(dbPath);
    store.init();
  });

  afterEach(() => {
    store.close();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('creates and retrieves a run', () => {
    const run = store.createRun('run-1', 'Build a todo app');
    expect(run.id).toBe('run-1');
    expect(run.status).toBe('queued');
    expect(run.prdText).toBe('Build a todo app');

    const retrieved = store.getRun('run-1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe('run-1');
  });

  it('updates a run', () => {
    store.createRun('run-1', 'test');
    store.updateRun('run-1', { status: 'running' });

    const run = store.getRun('run-1');
    expect(run!.status).toBe('running');
  });

  it('updates steps and result', () => {
    store.createRun('run-1', 'test');
    store.updateRun('run-1', {
      steps: [{ name: 'parse', status: 'ok', duration: 100 }],
      result: { files: [] } as any,
    });

    const run = store.getRun('run-1');
    expect(run!.steps).toHaveLength(1);
    expect(run!.steps[0].name).toBe('parse');
    expect(run!.result).toBeDefined();
  });

  it('lists runs in reverse chronological order', () => {
    store.createRun('run-1', 'first');
    store.createRun('run-2', 'second');

    const runs = store.listRuns();
    expect(runs).toHaveLength(2);
    // Both created in same ms, so order is by insert order (newest rowid first)
    expect(runs[0].id).toBe('run-2');
    expect(runs[1].id).toBe('run-1');
  });

  it('respects limit on listRuns', () => {
    for (let i = 0; i < 10; i++) {
      store.createRun(`run-${i}`, `prd ${i}`);
    }
    const runs = store.listRuns(3);
    expect(runs).toHaveLength(3);
  });

  it('returns undefined for non-existent run', () => {
    expect(store.getRun('non-existent')).toBeUndefined();
  });

  it('completes a run and updates stats', () => {
    store.createRun('run-1', 'test');
    store.completeRun('run-1', true);

    const run = store.getRun('run-1');
    expect(run!.status).toBe('done');
    expect(run!.completedAt).toBeDefined();

    const stats = store.getStats();
    expect(stats.total).toBe(1);
    expect(stats.success).toBe(1);
    expect(stats.failed).toBe(0);
  });

  it('tracks failed runs in stats', () => {
    store.createRun('run-1', 'test');
    store.completeRun('run-1', false);

    const stats = store.getStats();
    expect(stats.failed).toBe(1);
  });

  it('emits step events to subscribers', () => {
    store.createRun('run-1', 'test');
    const steps: Array<{ name: string }> = [];
    const unsub = store.subscribeRun('run-1', (step) => { steps.push(step); });

    store.emitStep('run-1', { name: 'parse', status: 'ok', duration: 50 });
    store.emitStep('run-1', { name: 'gen', status: 'ok', duration: 120 });

    expect(steps).toHaveLength(2);
    expect(steps[0].name).toBe('parse');

    unsub();
    store.emitStep('run-1', { name: 'skip', status: 'ok', duration: 10 });
    expect(steps).toHaveLength(2); // unsubscribed, no new steps
  });

  it('persists runs across store re-instantiation', () => {
    store.createRun('run-1', 'persistent run');
    store.completeRun('run-1', true);
    store.close();

    // Re-open the same database
    const store2 = new PipelineRunStore(dbPath);
    store2.init();
    const run = store2.getRun('run-1');
    expect(run).toBeDefined();
    expect(run!.status).toBe('done');
    expect(run!.prdText).toBe('persistent run');
    store2.close();
  });

  it('returns empty stats on fresh database', () => {
    const stats = store.getStats();
    expect(stats.total).toBe(0);
    expect(stats.success).toBe(0);
    expect(stats.failed).toBe(0);
  });

  it('does not crash on completing non-existent run', () => {
    store.completeRun('non-existent', true); // should not throw
  });
});
