/**
 * ANFSF Database Migration System
 *
 * Versioned SQL migrations loaded from embedded definitions.
 * Applied in order on server startup when using PostgreSQL.
 */

import { Pool } from 'pg';

/** Embedded migration SQL — in production, these would be loaded from files */
export const MIGRATIONS = new Map<number, string>([
  [1, `
    -- Initial schema: pipeline_runs + run_stats
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'queued',
      steps JSONB NOT NULL DEFAULT '[]'::jsonb,
      result JSONB DEFAULT NULL,
      error TEXT DEFAULT NULL,
      started_at BIGINT NOT NULL,
      completed_at BIGINT DEFAULT NULL,
      prd_text TEXT NOT NULL DEFAULT '',
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

    INSERT INTO schema_migrations (version) VALUES (1)
      ON CONFLICT (version) DO NOTHING;
  `],
  [2, `
    -- Add project_name column for tracking output directory
    ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT NULL;
  `],
]);

export async function runMigrations(pool: Pool): Promise<number> {
  const result = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
  const applied = new Set(result.rows.map(r => r.version));

  let migrated = 0;
  for (const [version, sql] of MIGRATIONS) {
    if (applied.has(version)) continue;

    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      await pool.query('COMMIT');
      migrated++;
      console.log(`[migrations] Applied migration v${version}`);
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  }

  if (migrated === 0) {
    console.log('[migrations] Database is up to date');
  } else {
    console.log(`[migrations] Applied ${migrated} migration(s)`);
  }
  return migrated;
}
