/**
 * GET /api/v1/pipeline/:id/status — Pipeline run status
 * GET /api/v1/pipeline/:id/stream — SSE progress stream
 */

import { FastifyInstance } from 'fastify';
import { PipelineRunStore } from '../store';

export function registerPipelineRoutes(app: FastifyInstance, store: PipelineRunStore): void {
  // Get run status
  app.get('/api/v1/pipeline/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = store.getRun(id);

    if (!run) {
      return reply.code(404).send({ error: 'Pipeline run not found', id });
    }

    return {
      id: run.id,
      status: run.status,
      steps: run.steps,
      error: run.error,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    };
  });

  // SSE progress stream
  app.get('/api/v1/pipeline/:id/stream', async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = store.getRun(id);

    if (!run) {
      return reply.code(404).send({ error: 'Pipeline run not found', id });
    }

    reply.header('Content-Type', 'text/event-stream');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');
    reply.header('X-Accel-Buffering', 'no');

    // Send initial state
    const raw = reply.raw;
    raw.write(`event: status\ndata: ${JSON.stringify({ status: run.status, steps: run.steps })}\n\n`);

    // Subscribe to step events
    const unsub = store.subscribeRun(id, (step) => {
      raw.write(`event: step\ndata: ${JSON.stringify(step)}\n\n`);
    });

    // When client disconnects, unsubscribe
    raw.on('close', () => {
      unsub();
    });

    // Keep connection alive
    const heartbeat = setInterval(() => {
      raw.write(': heartbeat\n\n');
    }, 30000);

    raw.on('close', () => {
      clearInterval(heartbeat);
    });
  });

  // List recent runs
  app.get('/api/v1/pipeline', async (request, reply) => {
    const { limit } = request.query as { limit?: string };
    const runs = store.listRuns(limit ? parseInt(limit, 10) : 50);
    return runs.map(r => ({
      id: r.id,
      status: r.status,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      stepCount: r.steps.length,
    }));
  });
}
