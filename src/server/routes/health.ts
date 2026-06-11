/**
 * ANFSF V4 Layer 8.6 — Health & Readiness Checks
 *
 * GET /health — Liveness: is the process alive?
 * GET /ready — Readiness: LLM reachable, DB writable, disk space sufficient
 */

import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { AnfsfStore } from '../index';

const VERSION = process.env.npm_package_version || '0.8.5';

// Disk space thresholds (in MB)
const DISK_WARNING_MB = 500;
const DISK_CRITICAL_MB = 100;

// LLM timeout for readiness check (ms)
const LLM_READINESS_TIMEOUT = 5_000;

export interface HealthCheckConfig {
  /** API key for LLM connectivity check */
  apiKey?: string;
  /** Full chat completions URL (e.g., https://api.deepseek.com/v1/chat/completions) */
  llmChatUrl?: string;
  /** LLM model for connectivity check */
  llmModel?: string;
  /** Path to SQLite database for writability check */
  dbPath?: string;
  /** Path to check disk space (default: project root) */
  diskCheckPath?: string;
  /** Active store instance — used for PostgreSQL health checks */
  store?: AnfsfStore;
}

export function registerHealthRoutes(app: FastifyInstance, config: HealthCheckConfig = {}): void {
  app.get('/health', async (_request, reply) => {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      version: VERSION,
      timestamp: Date.now(),
    };
  });

  app.get('/ready', async (request, reply) => {
    const checks: Record<string, { status: 'ok' | 'degraded' | 'fail'; detail?: string }> = {};
    let overall = 'ok';

    // 1. LLM connectivity
    const llmResult = await checkLLMConnectivity(config);
    checks.llm = llmResult;
    if (llmResult.status === 'fail') overall = 'fail';

    // 2. Database writability
    const dbResult = await checkDBWritability(config);
    checks.database = dbResult;
    if (dbResult.status === 'fail') overall = 'fail';

    // 3. Disk space
    const diskResult = checkDiskSpace(config);
    checks.disk = diskResult;
    if (diskResult.status === 'fail') overall = 'fail';

    const statusCode = overall === 'ok' ? 200 : 503;

    return reply.code(statusCode).send({
      status: overall === 'ok' ? 'ok' : 'not_ready',
      checks,
      timestamp: Date.now(),
      version: VERSION,
    });
  });
}

/**
 * Check LLM API connectivity by sending a minimal request.
 * Uses the DashScope-compatible endpoint with a tiny prompt.
 */
async function checkLLMConnectivity(config: HealthCheckConfig): Promise<{ status: 'ok' | 'fail'; detail?: string }> {
  const apiKey = config.apiKey || process.env.LLM_API_KEY || process.env.DASHSCOPE_API_KEY || '';
  if (!apiKey) {
    return { status: 'fail', detail: 'LLM_API_KEY not configured' };
  }

  const chatUrl = config.llmChatUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  const model = config.llmModel || 'qwen3.5-plus';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_READINESS_TIMEOUT);

    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      return { status: 'ok', detail: `${model} reachable` };
    }
    return { status: 'fail', detail: `LLM returned ${response.status} ${response.statusText}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('abort')) {
      return { status: 'fail', detail: `LLM timeout after ${LLM_READINESS_TIMEOUT}ms` };
    }
    return { status: 'fail', detail: `LLM unreachable: ${message}` };
  }
}

/**
 * Check database writability — SQLite or PostgreSQL.
 */
async function checkDBWritability(config: HealthCheckConfig): Promise<{ status: 'ok' | 'degraded' | 'fail'; detail?: string }> {
  // PostgreSQL path: use the store's built-in connectivity check
  if (config.store && 'checkConnectivity' in config.store && typeof config.store.checkConnectivity === 'function') {
    return config.store.checkConnectivity();
  }

  // SQLite path: insert/delete a test row
  const dbPath = config.dbPath || '.anfsf/runs.db';

  try {
    // Import dynamically to avoid circular deps
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(dbPath, { fileMustExist: true });

    try {
      // Write test
      const testId = `health-check-${Date.now()}`;
      const now = Date.now();
      db.prepare(`
        INSERT INTO pipeline_runs (id, status, steps, started_at, prd_text)
        VALUES (?, 'queued', '[]', ?, 'health-check')
      `).run(testId, now);

      // Read back
      const row = db.prepare('SELECT id, status FROM pipeline_runs WHERE id = ?').get(testId) as Record<string, unknown> | undefined;
      if (!row || row.status !== 'queued') {
        return { status: 'fail', detail: 'Write succeeded but read returned wrong data' };
      }

      // Cleanup
      db.prepare('DELETE FROM pipeline_runs WHERE id = ?').run(testId);

      return { status: 'ok', detail: `${dbPath} writable` };
    } finally {
      db.close();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('SQLITE_CANTOPEN') || message.includes('no such table')) {
      return { status: 'degraded', detail: `Database file missing or schema not initialized: ${message}` };
    }
    return { status: 'fail', detail: `Database write failed: ${message}` };
  }
}

/**
 * Check available disk space on the project volume.
 * Uses os.freemem() as a proxy (not exact disk space, but practical for containers).
 */
function checkDiskSpace(config: HealthCheckConfig): { status: 'ok' | 'degraded' | 'fail'; detail?: string } {
  const checkPath = config.diskCheckPath || process.cwd();

  try {
    // Check if the directory exists and is writable
    fs.accessSync(checkPath, fs.constants.R_OK | fs.constants.W_OK);

    // Use os.freemem() for available memory as a rough disk health indicator
    // For actual disk space, use statfs on the directory
    const stat = fs.statfsSync ? fs.statfsSync(checkPath) : null;
    let freeMB = 0;
    if (stat) {
      freeMB = Math.round((stat as any).bavail * (stat as any).bsize / (1024 * 1024));
    } else {
      // Fallback: check available memory as a rough proxy
      freeMB = Math.round(os.freemem() / (1024 * 1024));
    }

    if (freeMB < DISK_CRITICAL_MB) {
      return { status: 'fail', detail: `Only ${freeMB}MB free (critical threshold: ${DISK_CRITICAL_MB}MB)` };
    }
    if (freeMB < DISK_WARNING_MB) {
      return { status: 'degraded', detail: `Only ${freeMB}MB free (warning threshold: ${DISK_WARNING_MB}MB)` };
    }

    return { status: 'ok', detail: `${freeMB}MB free` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'fail', detail: `Disk check failed: ${message}` };
  }
}
