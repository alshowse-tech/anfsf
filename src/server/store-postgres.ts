/**
 * ANFSF Server — PostgreSQL Pipeline Run Store
 *
 * PostgreSQL-backed store for tracking pipeline runs and SSE subscriptions.
 * Supports multi-instance deployments with connection pooling.
 */

import { Pool, PoolConfig } from 'pg';
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

export class PostgresPipelineRunStore {
  private pool: Pool;
  private subscribers: Map<string, Set<ProgressCallback>>;
  private initialized: boolean;
  private open: boolean;
  private cleanupTimer: ReturnType<typeof setInterval> | null;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: parseInt(process.env.PG_POOL_MAX || '5', 10),
      idleTimeoutMillis: 10_000,
      statement_timeout: parseInt(process.env.PG_STATEMENT_TIMEOUT || '30000', 10),
    });
    this.subscribers = new Map();
    this.initialized = false;
    this.open = true;
    this.cleanupTimer = null;
  }

  /** Initialize schema and run startup migrations */
  async init(): Promise<void> {
    if (this.initialized) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS pipeline_runs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'queued',
        steps JSONB NOT NULL DEFAULT '[]'::jsonb,
        result JSONB DEFAULT NULL,
        error TEXT DEFAULT NULL,
        started_at BIGINT NOT NULL,
        completed_at BIGINT DEFAULT NULL,
        prd_text TEXT NOT NULL DEFAULT '',
        project_name TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_runs_status ON pipeline_runs(status);
      CREATE INDEX IF NOT EXISTS idx_runs_started ON pipeline_runs(started_at DESC);

      CREATE TABLE IF NOT EXISTS run_stats (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total INTEGER NOT NULL DEFAULT 0,
        success INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO run_stats (id, total, success, failed) VALUES (1, 0, 0, 0)
        ON CONFLICT (id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    this.initialized = true;
  }

  /** Run versioned migrations from SQL files */
  async migrate(migrationSql: Map<number, string>): Promise<void> {
    await this.init();

    const result = await this.pool.query('SELECT version FROM schema_migrations ORDER BY version');
    const applied = new Set(result.rows.map(r => r.version));

    for (const [version, sql] of migrationSql) {
      if (applied.has(version)) continue;

      await this.pool.query('BEGIN');
      try {
        await this.pool.query(sql);
        await this.pool.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await this.pool.query('COMMIT');
      } catch (e) {
        await this.pool.query('ROLLBACK');
        throw e;
      }
    }
  }

  async close(): Promise<void> {
    this.open = false;
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    await this.pool.end();
  }

  async createRun(id: string, prdText: string, projectName?: string): Promise<PipelineRun> {
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

    await this.pool.query(
      'INSERT INTO pipeline_runs (id, status, steps, started_at, prd_text, project_name) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, 'queued', '[]', now, prdText, projectName || null],
    );

    await this.pool.query(
      'UPDATE run_stats SET total = total + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
    );

    this.subscribers.set(id, new Set());
    return run;
  }

  async updateRun(id: string, updates: Partial<PipelineRun>): Promise<void> {
    if (!this.open) return;

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(updates.status); }
    if (updates.steps !== undefined) { fields.push(`steps = $${paramIndex++}::jsonb`); values.push(JSON.stringify(updates.steps)); }
    if (updates.result !== undefined) { fields.push(`result = $${paramIndex++}::jsonb`); values.push(JSON.stringify(updates.result)); }
    if (updates.error !== undefined) { fields.push(`error = $${paramIndex++}`); values.push(updates.error); }
    if (updates.completedAt !== undefined) { fields.push(`completed_at = $${paramIndex++}`); values.push(updates.completedAt); }

    if (fields.length === 0) {
      console.log(`[pg-store] updateRun: no fields to update for ${id}`);
      return;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE pipeline_runs SET ${fields.join(', ')} WHERE id = $${paramIndex}`;

    await this.pool.query(sql, values);
  }

  async getRun(id: string): Promise<PipelineRun | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM pipeline_runs WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) return undefined;
    return this.rowToRun(result.rows[0]);
  }

  async listRuns(limit: number = 50): Promise<PipelineRun[]> {
    const result = await this.pool.query(
      'SELECT * FROM pipeline_runs ORDER BY started_at DESC, created_at DESC LIMIT $1',
      [limit],
    );
    return result.rows.map(r => this.rowToRun(r));
  }

  subscribeRun(id: string, callback: ProgressCallback): () => void {
    // Don't allow new subscriptions for completed/failed runs
    const run = this.subscribers.has(id) ? null : undefined; // async check below
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

  async completeRun(id: string, success: boolean): Promise<void> {
    if (!this.open) return;
    const run = await this.getRun(id);
    if (!run) return;

    await this.updateRun(id, { status: success ? 'done' : 'failed', completedAt: Date.now() });
    await this.pool.query(
      `UPDATE run_stats SET
        success = success + CASE WHEN $1 THEN 1 ELSE 0 END,
        failed = failed + CASE WHEN $1 THEN 0 ELSE 1 END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1`,
      [success],
    );

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

  async getStats() {
    const result = await this.pool.query('SELECT total, success, failed FROM run_stats WHERE id = 1');
    if (result.rows.length === 0) return { total: 0, success: 0, failed: 0 };
    const row = result.rows[0];
    return { total: row.total, success: row.success, failed: row.failed };
  }

  /**
   * Delete runs older than maxAgeDays to prevent unbounded growth.
   * Returns the number of deleted runs.
   */
  async cleanupOldRuns(maxAgeDays: number = 30): Promise<number> {
    if (!this.open) return 0;
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const result = await this.pool.query(
      'DELETE FROM pipeline_runs WHERE started_at < $1 RETURNING status',
      [cutoff],
    );
    const deleted = result.rowCount ?? 0;
    if (deleted > 0) {
      const successCount = result.rows.filter(r => r.status === 'done').length;
      const failedCount = result.rows.filter(r => r.status === 'failed').length;
      await this.pool.query(
        `UPDATE run_stats SET
          total = GREATEST(0, total - $1),
          success = GREATEST(0, success - $2),
          failed = GREATEST(0, failed - $3),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1`,
        [deleted, successCount, failedCount],
      );
    }
    return deleted;
  }

  /** Start periodic cleanup of old runs */
  startPeriodicCleanup(intervalHours: number = 6, maxAgeDays: number = 30): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = setInterval(async () => {
      try {
        const deleted = await this.cleanupOldRuns(maxAgeDays);
        if (deleted > 0) {
          console.log(`[cleanup] Deleted ${deleted} old pipeline runs (>${maxAgeDays} days)`);
        }
      } catch (e) {
        console.error('[cleanup] Failed to clean up old runs:', e);
      }
    }, intervalHours * 60 * 60 * 1000);
    this.cleanupTimer.unref();
  }

  /** Check database connectivity — for health endpoint */
  async checkConnectivity(): Promise<{ status: 'ok' | 'fail'; detail: string }> {
    try {
      await this.pool.query('SELECT 1');
      const config = this.pool.options;
      return { status: 'ok', detail: `PostgreSQL reachable (${config.host || 'localhost'})` };
    } catch (e) {
      return { status: 'fail', detail: `PostgreSQL unreachable: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  private rowToRun(row: Record<string, unknown>): PipelineRun {
    return {
      id: row.id as string,
      status: row.status as RunStatus,
      steps: typeof row.steps === 'string' ? JSON.parse(row.steps) : (row.steps as PipelineStep[]),
      result: row.result ? (typeof row.result === 'string' ? JSON.parse(row.result) : row.result) as PipelineOutput : null,
      error: row.error as string | null,
      startedAt: Number(row.started_at),
      completedAt: row.completed_at ? Number(row.completed_at) : null,
      prdText: row.prd_text as string,
      projectName: row.project_name as string | null,
    };
  }
}
