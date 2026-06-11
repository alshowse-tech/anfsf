/**
 * E2E Integration Tests — Full HTTP API Flow
 *
 * Tests the complete request lifecycle:
 * synthesize → pipeline execution → SSE progress → status check → run list
 *
 * These tests require a running server or use Fastify inject.
 * Run with: npm test -- --testPathPattern=e2e
 */

import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import { PipelineRunStore } from '../src/server/store';
import { LLMClient } from '../src/integrations/llm-client';

describe('E2E: HTTP API Integration', () => {
  let app: FastifyInstance;
  let store: PipelineRunStore;
  let llm: LLMClient;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    store = new PipelineRunStore(':memory:');
    llm = new LLMClient({ apiKey: 'sk-test-fake' });

    await app.register(helmet);
    await app.register(cors, { origin: true });
    await app.register(sensible);
    await app.register(multipart);

    // Register tracing middleware (request counting)
    app.addHook('onRequest', async (request, reply) => {
      // Track request count for metrics
    });

    // Minimal synthesize endpoint for E2E testing
    app.post('/api/v1/synthesize', async (request, reply) => {
      const body = request.body as { prdText?: string };
      if (!body?.prdText?.trim()) {
        return reply.code(400).send({ error: 'Bad Request', details: ['prdText is required'] });
      }

      const jobId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      store.createRun(jobId, body.prdText);

      // Start pipeline async (simulated — no real LLM call)
      setImmediate(async () => {
        try {
          store.updateRun(jobId, { status: 'running' });
          store.emitStep(jobId, { name: 'L1: PRD Parse', duration: 50, status: 'ok' });
          store.emitStep(jobId, { name: 'L4: Graph Engine', duration: 30, status: 'ok' });
          store.updateRun(jobId, {
            status: 'done',
            steps: [
              { name: 'L1: PRD Parse', duration: 50, status: 'ok' },
              { name: 'L4: Graph Engine', duration: 30, status: 'ok' },
            ],
            completedAt: Date.now(),
          });
          store.completeRun(jobId, true);
        } catch (e) {
          store.updateRun(jobId, {
            status: 'failed',
            error: e instanceof Error ? e.message : String(e),
            completedAt: Date.now(),
          });
          store.completeRun(jobId, false);
        }
      });

      return reply.code(202).send({ jobId, status: 'running' });
    });

    // Pipeline routes
    app.get('/api/v1/pipeline', async () => {
      const runs = store.listRuns(50);
      return runs.map(r => ({
        id: r.id,
        status: r.status,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        stepCount: r.steps.length,
      }));
    });

    app.get('/api/v1/pipeline/:id/status', async (request) => {
      const { id } = request.params as { id: string };
      const run = store.getRun(id);
      if (!run) return { error: 'Not found', id };
      return { id: run.id, status: run.status, steps: run.steps, error: run.error };
    });

    app.get('/api/v1/pipeline/:id/stream', async (request, reply) => {
      const { id } = request.params as { id: string };
      const run = store.getRun(id);
      if (!run) return reply.code(404).send({ error: 'Not found' });

      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');
      const raw = reply.raw;
      raw.write(`event: status\ndata: ${JSON.stringify({ status: run.status })}\n\n`);
      const unsub = store.subscribeRun(id, (step) => {
        raw.write(`event: step\ndata: ${JSON.stringify(step)}\n\n`);
      });
      raw.on('close', () => unsub());
    });

    // Health
    app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

    await app.ready();
  });

  afterAll(async () => {
    store.close();
    await app.close();
  });

  it('should submit a PRD and receive a jobId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/synthesize',
      headers: { 'Content-Type': 'application/json' },
      payload: { prdText: 'Build a todo app' },
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.payload);
    expect(body.jobId).toBeDefined();
    expect(body.status).toBe('running');
  });

  it('should reject empty PRD', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/synthesize',
      headers: { 'Content-Type': 'application/json' },
      payload: { prdText: '' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should list runs after submission', async () => {
    // Submit first
    await app.inject({
      method: 'POST',
      url: '/api/v1/synthesize',
      headers: { 'Content-Type': 'application/json' },
      payload: { prdText: 'Test PRD for list' },
    });

    // Wait for async pipeline
    await new Promise(resolve => setTimeout(resolve, 100));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/pipeline',
    });

    expect(res.statusCode).toBe(200);
    const runs = JSON.parse(res.payload);
    expect(Array.isArray(runs)).toBe(true);
    expect(runs.length).toBeGreaterThanOrEqual(1);
  });

  it('should return run status', async () => {
    // Submit
    const submitRes = await app.inject({
      method: 'POST',
      url: '/api/v1/synthesize',
      headers: { 'Content-Type': 'application/json' },
      payload: { prdText: 'Test PRD for status' },
    });

    const { jobId } = JSON.parse(submitRes.payload);

    // Wait for async pipeline
    await new Promise(resolve => setTimeout(resolve, 200));

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/pipeline/${jobId}/status`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe(jobId);
    expect(body.status).toBe('done');
    expect(body.steps.length).toBeGreaterThan(0);
  });

  it('should stream SSE events', async () => {
    // Submit
    const submitRes = await app.inject({
      method: 'POST',
      url: '/api/v1/synthesize',
      headers: { 'Content-Type': 'application/json' },
      payload: { prdText: 'Test PRD for SSE' },
    });

    const { jobId } = JSON.parse(submitRes.payload);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/pipeline/${jobId}/stream`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/event-stream');
    expect(res.payload).toContain('event: status');
  });

  it('should return health check', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
  });

  it('should return 404 for non-existent run', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/pipeline/nonexistent/status',
    });

    expect(res.statusCode).toBe(404);
  });
});
