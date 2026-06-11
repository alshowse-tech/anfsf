import { FastifyInstance } from 'fastify';
import type { AnfsfStore } from '../index';
import * as fs from 'fs';
import * as path from 'path';

const SSE_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const OUTPUT_BASE = path.resolve(process.cwd(), 'output');
const MAX_FILE_SIZE = 500_000; // 500KB limit for file preview

export function registerPipelineRoutes(app: FastifyInstance, store: AnfsfStore): void {
  // Get run status
  app.get('/api/v1/pipeline/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = await store.getRun(id);

    if (!run) {
      return reply.code(404).send({ error: 'Pipeline run not found', id });
    }

    // Surface Agent Loop metadata if present in result
    const result = run.result as unknown as Record<string, unknown> | undefined;
    return {
      id: run.id,
      status: run.status,
      steps: run.steps,
      error: run.error,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      projectName: run.projectName,
      rounds: result?.rounds ?? null,
      tokenUsage: result?.tokenUsage ?? null,
      giteaUrl: result?.giteaUrl ?? null,
      message: result?.message ?? null,
      files: result?.files ?? null,
    };
  });

  // List generated files for a project
  app.get('/api/v1/pipeline/:id/files', async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = await store.getRun(id);

    if (!run) {
      return reply.code(404).send({ error: 'Pipeline run not found', id });
    }

    const projectDir = run.projectName ? path.join(OUTPUT_BASE, run.projectName) : null;

    if (!projectDir || !fs.existsSync(projectDir)) {
      return { files: [], message: 'No output files found' };
    }

    const listFiles = (dir: string, baseDir: string): { path: string; size: number; type: string }[] => {
      const results: { path: string; size: number; type: string }[] = [];
      if (!fs.existsSync(dir)) return results;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        if (entry.isDirectory()) {
          results.push(...listFiles(fullPath, baseDir));
        } else {
          const stat = fs.statSync(fullPath);
          const ext = path.extname(entry.name).toLowerCase();
          const type = ext.match(/\.(tsx?|jsx?|json|css|html|md|yaml|yml|toml|sql)$/i) ? 'code' : 'other';
          results.push({ path: relativePath, size: stat.size, type });
        }
      }
      return results;
    };

    const frontendDir = path.join(projectDir, 'frontend');
    const backendDir = path.join(projectDir, 'backend');
    const files: { path: string; size: number; type: string; category: string }[] = [];

    if (fs.existsSync(frontendDir)) {
      listFiles(frontendDir, frontendDir).forEach(f => files.push({ ...f, category: 'frontend' }));
    }
    if (fs.existsSync(backendDir)) {
      listFiles(backendDir, backendDir).forEach(f => files.push({ ...f, category: 'backend' }));
    }

    return { files, projectName: run.projectName };
  });

  // Get file content
  app.get('/api/v1/pipeline/:id/files/content', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { filePath, category } = request.query as { filePath: string; category: 'frontend' | 'backend' };

    if (!filePath) {
      return reply.code(400).send({ error: 'filePath is required' });
    }

    const run = await store.getRun(id);
    if (!run || !run.projectName) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const projectDir = path.join(OUTPUT_BASE, run.projectName);
    const categoryDir = category === 'frontend' ? 'frontend' : 'backend';
    const fullPath = path.join(projectDir, categoryDir, filePath);

    // Security: verify the resolved path is within the global OUTPUT_BASE directory
    // This is the final defense even if projectName itself was crafted maliciously
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(OUTPUT_BASE))) {
      return reply.code(403).send({ error: 'Access denied: path escapes output directory' });
    }

    if (!fs.existsSync(resolved)) {
      return reply.code(404).send({ error: 'File not found' });
    }

    const stat = fs.statSync(resolved);
    if (stat.size > MAX_FILE_SIZE) {
      return reply.code(413).send({ error: `File too large (${stat.size} bytes, max ${MAX_FILE_SIZE})` });
    }

    const content = fs.readFileSync(resolved, 'utf-8');
    return { path: filePath, category, content };
  });

  // SSE progress stream
  app.get('/api/v1/pipeline/:id/stream', async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = await store.getRun(id);

    if (!run) {
      return reply.code(404).send({ error: 'Pipeline run not found', id });
    }

    reply.header('Content-Type', 'text/event-stream');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');
    reply.header('X-Accel-Buffering', 'no');

    reply.hijack();
    const raw = reply.raw;

    raw.write(`event: status\ndata: ${JSON.stringify({ status: run.status, steps: run.steps })}\n\n`);

    let lastActivity = Date.now();

    const unsub = store.subscribeRun(id, (step) => {
      lastActivity = Date.now();
      raw.write(`event: step\ndata: ${JSON.stringify(step)}\n\n`);
    });

    raw.on('close', () => {
      unsub();
      clearInterval(heartbeat);
      clearInterval(idleCheck);
    });

    const heartbeat = setInterval(() => {
      try { raw.write(': heartbeat\n\n'); } catch { /* client disconnected */ }
    }, 30000);

    const idleCheck = setInterval(() => {
      if (Date.now() - lastActivity > SSE_IDLE_TIMEOUT_MS) {
        try {
          raw.write(`event: timeout\ndata: ${JSON.stringify({ message: 'SSE connection idle timeout' })}\n\n`);
          raw.end();
        } catch { /* already closed */ }
      }
    }, 30000);

    return new Promise<void>(() => {});
  });

  // List recent runs
  app.get('/api/v1/pipeline', async (request, reply) => {
    const { limit, offset } = request.query as { limit?: string; offset?: string };
    const runs = await store.listRuns(limit ? parseInt(limit, 10) : 50);
    return runs.map(r => ({
      id: r.id,
      status: r.status,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      stepCount: r.steps.length,
    }));
  });
}
