-- ANFSF Migration 001: Initial Schema
-- Applied to fresh PostgreSQL databases.

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
