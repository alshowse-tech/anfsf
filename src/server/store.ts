/**
 * ANFSF Server — Pipeline Run Store
 *
 * SQLite-backed store for tracking pipeline runs and SSE subscriptions.
 * Runs persist across server restarts.
 */

import Database from 'better-sqlite3';
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
  projectName: string | null;
}

type ProgressCallback = (step: PipelineStep) => void;

/** Common interface for both SQLite and PostgreSQL stores */
export interface PipelineRunStoreLike {
  createRun(id: string, prdText: string): PipelineRun | Promise<PipelineRun>;
  updateRun(id: string, updates: Partial<PipelineRun>): void | Promise<void>;
  getRun(id: string): PipelineRun | undefined | Promise<PipelineRun | undefined>;
  listRuns(limit?: number): PipelineRun[] | Promise<PipelineRun[]>;
  subscribeRun(id: string, callback: ProgressCallback): () => void;
  emitStep(id: string, step: PipelineStep): void;
  completeRun(id: string, success: boolean): void | Promise<void>;
  getStats(): { total: number; success: number; failed: number } | Promise<{ total: number; success: number; failed: number }>;
  cleanupOldRuns(maxAgeDays?: number): number | Promise<number>;
  startPeriodicCleanup(intervalHours?: number, maxAgeDays?: number): void;
  close(): void | Promise<void>;
}

export class PipelineRunStore {
  private db: Database.Database;
  private subscribers: Map<string, Set<ProgressCallback>>;
  private initialized: boolean;
  private open: boolean;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(dbPath: string | null = null) {
    this.db = new Database(dbPath ?? ':memory:');
    this.subscribers = new Map();
    this.initialized = false;
    this.open = true;
    this.init(); // Auto-initialize schema on construction
  }

  /** Initialize schema and WAL mode */
  init(): void {
    if (this.initialized) return;

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pipeline_runs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'queued',
        steps TEXT NOT NULL DEFAULT '[]',
        result TEXT DEFAULT NULL,
        error TEXT DEFAULT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER DEFAULT NULL,
        prd_text TEXT NOT NULL DEFAULT '',
        project_name TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_runs_status ON pipeline_runs(status);
      CREATE INDEX IF NOT EXISTS idx_runs_started ON pipeline_runs(started_at DESC);

      CREATE TABLE IF NOT EXISTS run_stats (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total INTEGER NOT NULL DEFAULT 0,
        success INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      INSERT OR IGNORE INTO run_stats (id, total, success, failed) VALUES (1, 0, 0, 0);
    `);

    this.initialized = true;
  }

  close(): void {
    this.open = false;
    this.db.close();
  }

  createRun(id: string, prdText: string, projectName?: string): PipelineRun {
    if (!this.open) throw new Error('Store is closed');
    const now = Date.now();
    const run: PipelineRun = {
      id,
      status: 'queued',
      steps: [],
      result: null,
      error: null,
      startedAt: now,
      completedAt: null,
      prdText,
      projectName: projectName || null,
    };

    this.db.prepare(`
      INSERT INTO pipeline_runs (id, status, steps, started_at, prd_text, project_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, 'queued', '[]', now, prdText, projectName || null);

    this.db.prepare(`
      UPDATE run_stats SET total = total + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1
    `).run();

    this.subscribers.set(id, new Set());
    return run;
  }

  updateRun(id: string, updates: Partial<PipelineRun>): void {
    if (!this.open) return;
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.steps !== undefined) { fields.push('steps = ?'); values.push(JSON.stringify(updates.steps)); }
    if (updates.result !== undefined) { fields.push('result = ?'); values.push(JSON.stringify(updates.result)); }
    if (updates.error !== undefined) { fields.push('error = ?'); values.push(updates.error); }
    if (updates.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(updates.completedAt); }

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    this.db.prepare(`UPDATE pipeline_runs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  getRun(id: string): PipelineRun | undefined {
    const row = this.db.prepare('SELECT * FROM pipeline_runs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.rowToRun(row);
  }

  listRuns(limit: number = 50): PipelineRun[] {
    const rows = this.db.prepare(
      'SELECT * FROM pipeline_runs ORDER BY started_at DESC, rowid DESC LIMIT ?',
    ).all(limit) as Record<string, unknown>[];
    return rows.map(r => this.rowToRun(r));
  }

  subscribeRun(id: string, callback: ProgressCallback): () => void {
    // Don't allow new subscriptions for completed/failed runs
    const run = this.getRun(id);
    if (run && (run.status === 'done' || run.status === 'failed')) {
      return () => {};
    }
    let subs = this.subscribers.get(id);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(id, subs);
    }
    subs.add(callback);
    return () => { subs.delete(callback); };
  }

  emitStep(id: string, step: PipelineStep): void {
    const subs = this.subscribers.get(id);
    if (!subs) return;
    for (const cb of subs) {
      try { cb(step); } catch { /* ignore subscriber errors */ }
    }
  }

  completeRun(id: string, success: boolean): void {
    if (!this.open) return;
    const run = this.getRun(id);
    if (!run) return;

    this.updateRun(id, { status: success ? 'done' : 'failed', completedAt: Date.now() });
    this.db.prepare(`
      UPDATE run_stats SET
        success = success + CASE WHEN ? THEN 1 ELSE 0 END,
        failed = failed + CASE WHEN ? THEN 1 ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(success ? 1 : 0, success ? 0 : 1);

    // Notify subscribers of final status before cleanup
    const subs = this.subscribers.get(id);
    if (subs) {
      const finalStatus: PipelineStep = {
        name: '_pipeline_complete',
        duration: run.completedAt ? run.completedAt - run.startedAt : 0,
        status: success ? 'ok' : 'error',
      };
      for (const cb of subs) {
        try { cb(finalStatus); } catch { /* ignore */ }
      }
    }

    this.subscribers.delete(id);
  }

  getStats() {
    const row = this.db.prepare('SELECT total, success, failed FROM run_stats WHERE id = 1').get() as Record<string, number>;
    return { total: row.total, success: row.success, failed: row.failed };
  }

  /**
   * Delete runs older than maxAgeDays to prevent unbounded growth.
   * Returns the number of deleted runs.
   */
  cleanupOldRuns(maxAgeDays: number = 30): number {
    if (!this.open) return 0;
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const rows = this.db.prepare('SELECT id, status FROM pipeline_runs WHERE started_at < ?').all(cutoff) as Array<Record<string, unknown>>;
    const deleted = rows.length;
    if (deleted > 0) {
      this.db.prepare('DELETE FROM pipeline_runs WHERE started_at < ?').run(cutoff);
      const successCount = rows.filter(r => r.status === 'done').length;
      const failedCount = rows.filter(r => r.status === 'failed').length;
      this.db.prepare(`
        UPDATE run_stats SET
          total = MAX(0, total - ?),
          success = MAX(0, success - ?),
          failed = MAX(0, failed - ?),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `).run(deleted, successCount, failedCount);
    }
    return deleted;
  }

  /** Start periodic cleanup of old runs */
  startPeriodicCleanup(intervalHours: number = 6, maxAgeDays: number = 30): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = setInterval(() => {
      try {
        const deleted = this.cleanupOldRuns(maxAgeDays);
        if (deleted > 0) {
          console.log(`[cleanup] Deleted ${deleted} old pipeline runs (>${maxAgeDays} days)`);
        }
      } catch (e) {
        console.error('[cleanup] Failed to clean up old runs:', e);
      }
    }, intervalHours * 60 * 60 * 1000);
    this.cleanupTimer.unref();
  }

  private rowToRun(row: Record<string, unknown>): PipelineRun {
    return {
      id: row.id as string,
      status: row.status as RunStatus,
      steps: JSON.parse(row.steps as string) as PipelineStep[],
      result: row.result ? JSON.parse(row.result as string) as PipelineOutput : null,
      error: row.error as string | null,
      startedAt: row.started_at as number,
      completedAt: row.completed_at as number | null,
      prdText: row.prd_text as string,
      projectName: row.project_name as string | null,
    };
  }
}
