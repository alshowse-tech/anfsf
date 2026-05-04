/**
 * ANFSF Server — Pipeline Run Store
 *
 * In-memory store for tracking pipeline runs and SSE subscriptions.
 */

import type { PipelineResult, PipelineStep, PipelineOutput } from '../pipeline/product-pipeline';

export type RunStatus = 'queued' | 'running' | 'done' | 'failed';

export interface PipelineRun {
  id: string;
  status: RunStatus;
  steps: PipelineStep[];
  result: PipelineOutput | null;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
  prdText: string;
}

type ProgressCallback = (step: PipelineStep) => void;

export class PipelineRunStore {
  private runs: Map<string, PipelineRun>;
  private subscribers: Map<string, Set<ProgressCallback>>;
  private stats: { total: number; success: number; failed: number };

  constructor() {
    this.runs = new Map();
    this.subscribers = new Map();
    this.stats = { total: 0, success: 0, failed: 0 };
  }

  createRun(id: string, prdText: string): PipelineRun {
    const run: PipelineRun = {
      id,
      status: 'queued',
      steps: [],
      result: null,
      error: null,
      startedAt: Date.now(),
      completedAt: null,
      prdText,
    };
    this.runs.set(id, run);
    this.subscribers.set(id, new Set());
    this.stats.total++;
    return run;
  }

  updateRun(id: string, updates: Partial<PipelineRun>): void {
    const run = this.runs.get(id);
    if (!run) return;
    Object.assign(run, updates);
  }

  getRun(id: string): PipelineRun | undefined {
    return this.runs.get(id);
  }

  listRuns(limit: number = 50): PipelineRun[] {
    return Array.from(this.runs.values())
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  }

  /**
   * Register a callback to receive step events for a run.
   * Returns an unsubscribe function.
   */
  subscribeRun(id: string, callback: ProgressCallback): () => void {
    const subs = this.subscribers.get(id);
    if (!subs) return () => {};
    subs.add(callback);
    return () => { subs.delete(callback); };
  }

  /**
   * Emit a step event to all subscribers of a run.
   */
  emitStep(id: string, step: PipelineStep): void {
    const subs = this.subscribers.get(id);
    if (!subs) return;
    for (const cb of subs) {
      try { cb(step); } catch { /* ignore subscriber errors */ }
    }
  }

  /**
   * Record a completed run and clean up subscribers.
   */
  completeRun(id: string, success: boolean): void {
    const run = this.runs.get(id);
    if (!run) return;
    run.status = success ? 'done' : 'failed';
    run.completedAt = Date.now();
    if (success) this.stats.success++; else this.stats.failed++;
    this.subscribers.delete(id);
  }

  getStats() {
    return { ...this.stats };
  }
}
