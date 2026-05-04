/**
 * Server integration tests
 */

import { createServer } from '../server';
import { PipelineRunStore } from '../server/store';

import type { PipelineStep } from '../pipeline/product-pipeline';

describe('PipelineRunStore', () => {
  let store: PipelineRunStore;

  beforeEach(() => {
    store = new PipelineRunStore();
  });

  test('createRun creates a new run with queued status', () => {
    const run = store.createRun('test_1', 'some prd text');
    expect(run.id).toBe('test_1');
    expect(run.status).toBe('queued');
    expect(run.prdText).toBe('some prd text');
    expect(run.steps).toEqual([]);
    expect(run.result).toBeNull();
  });

  test('getRun returns undefined for unknown id', () => {
    expect(store.getRun('nonexistent')).toBeUndefined();
  });

  test('updateRun modifies an existing run', () => {
    store.createRun('test_1', 'prd');
    store.updateRun('test_1', { status: 'running' });
    const run = store.getRun('test_1');
    expect(run?.status).toBe('running');
  });

  test('listRuns returns runs sorted by startedAt descending', async () => {
    store.createRun('a', 'prd a');
    await new Promise(r => setTimeout(r, 2));
    store.createRun('b', 'prd b');
    // b was created after a
    const runs = store.listRuns();
    expect(runs[0].id).toBe('b');
    expect(runs[1].id).toBe('a');
  });

  test('listRuns respects limit', () => {
    store.createRun('r1', 'p1');
    store.createRun('r2', 'p2');
    store.createRun('r3', 'p3');
    expect(store.listRuns(2)).toHaveLength(2);
  });

  test('subscribeRun returns unsubscribe function', () => {
    store.createRun('test_1', 'prd');
    const unsub = store.subscribeRun('test_1', (_step: PipelineStep) => {});
    expect(typeof unsub).toBe('function');
  });

  test('emitStep calls all subscribers', () => {
    store.createRun('test_1', 'prd');
    const received: PipelineStep[] = [];
    store.subscribeRun('test_1', (step: PipelineStep) => received.push(step));
    store.subscribeRun('test_1', (step: PipelineStep) => received.push(step));

    store.emitStep('test_1', { name: 'test', duration: 100, status: 'ok' });
    expect(received).toHaveLength(2);
    expect(received[0].name).toBe('test');
  });

  test('unsubscribe stops receiving events', () => {
    store.createRun('test_1', 'prd');
    const received: PipelineStep[] = [];
    const unsub = store.subscribeRun('test_1', (step: PipelineStep) => received.push(step));

    store.emitStep('test_1', { name: 'step1', duration: 1, status: 'ok' });
    unsub();
    store.emitStep('test_1', { name: 'step2', duration: 2, status: 'ok' });
    expect(received).toHaveLength(1);
    expect(received[0].name).toBe('step1');
  });

  test('completeRun updates status and cleans subscribers', () => {
    store.createRun('test_1', 'prd');
    store.completeRun('test_1', true);
    const run = store.getRun('test_1');
    expect(run?.status).toBe('done');
    expect(run?.completedAt).not.toBeNull();

    // Subscribers cleaned up
    const received: PipelineStep[] = [];
    store.subscribeRun('test_1', (step: PipelineStep) => received.push(step));
    store.emitStep('test_1', { name: 'test', duration: 1, status: 'ok' });
    expect(received).toHaveLength(0);
  });

  test('getStats tracks run counts', () => {
    store.createRun('r1', 'p1');
    store.createRun('r2', 'p2');
    store.completeRun('r1', true);
    store.completeRun('r2', false);

    const stats = store.getStats();
    expect(stats.total).toBe(2);
    expect(stats.success).toBe(1);
    expect(stats.failed).toBe(1);
  });

  test('subscribeRun on nonexistent run returns no-op', () => {
    const unsub = store.subscribeRun('nope', () => { throw new Error('should not fire'); });
    expect(typeof unsub).toBe('function');
    // Should not throw
    unsub();
  });

  test('emitStep on nonexistent run does nothing', () => {
    // Should not throw
    store.emitStep('nope', { name: 'x', duration: 1, status: 'ok' });
  });
});

describe('Server', () => {
  test('createServer returns server object with expected methods', async () => {
    const server = await createServer({ apiKey: 'test-key' });
    expect(server.app).toBeDefined();
    expect(typeof server.start).toBe('function');
    expect(typeof server.stop).toBe('function');
    expect(server.store).toBeInstanceOf(PipelineRunStore);
    await server.stop();
  });

  test('server responds to health check', async () => {
    const server = await createServer({ apiKey: 'test-key', port: 0 });
    await server.start();

    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : 3000;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.status).toBe('ok');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('version');
    } finally {
      await server.stop();
    }
  });

  test('server returns metrics in Prometheus format', async () => {
    const server = await createServer({ apiKey: 'test-key', port: 0 });
    await server.start();

    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : 3000;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/metrics`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('# HELP anfsf_pipeline_total');
      expect(text).toContain('# TYPE anfsf_pipeline_total counter');
      expect(text).toContain('anfsf_pipeline_total');
    } finally {
      await server.stop();
    }
  });

  test('POST /api/v1/synthesize returns 202 with jobId', async () => {
    const server = await createServer({ apiKey: 'test-key', port: 0 });
    await server.start();

    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : 3000;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText: 'Build a todo app' }),
      });
      expect(res.status).toBe(202);
      const body = await res.json() as Record<string, unknown>;
      expect(body.jobId).toBeDefined();
      expect((body as Record<string, string>).status).toBe('running');
    } finally {
      await server.stop();
    }
  });

  test('POST /api/v1/synthesize returns 400 for empty prdText', async () => {
    const server = await createServer({ apiKey: 'test-key', port: 0 });
    await server.start();

    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : 3000;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText: '' }),
      });
      expect(res.status).toBe(400);
    } finally {
      await server.stop();
    }
  });

  test('GET /api/v1/pipeline/:id/status returns 404 for unknown run', async () => {
    const server = await createServer({ apiKey: 'test-key', port: 0 });
    await server.start();

    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : 3000;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/pipeline/nonexistent/status`);
      expect(res.status).toBe(404);
    } finally {
      await server.stop();
    }
  });

  test('GET /api/v1/pipeline returns list of runs', async () => {
    const server = await createServer({ apiKey: 'test-key', port: 0 });
    await server.start();

    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : 3000;

    try {
      // Create a run first
      await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText: 'test prd' }),
      });

      const res = await fetch(`http://127.0.0.1:${port}/api/v1/pipeline`);
      expect(res.status).toBe(200);
      const body = await res.json() as unknown[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    } finally {
      await server.stop();
    }
  });

  test('GET /ready returns 503 when API key is missing', async () => {
    const server = await createServer({ apiKey: '', port: 0 });
    await server.start();

    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : 3000;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/ready`);
      expect(res.status).toBe(503);
      const body = await res.json() as Record<string, unknown>;
      expect(body.status).toBe('not_ready');
    } finally {
      await server.stop();
    }
  });
});
