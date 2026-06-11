/**
 * Pipeline SSE Stream Tests
 *
 * Tests store subscription behavior and route registration.
 * Full SSE streaming is tested in e2e/api-flow.test.ts.
 */

import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { PipelineRunStore } from '../store';

describe('pipeline routes', () => {
  let app: FastifyInstance;
  let store: PipelineRunStore;

  beforeAll(async () => {
    store = new PipelineRunStore(':memory:');
    app = Fastify({ logger: false });

    const { registerPipelineRoutes } = await import('../routes/pipeline');
    registerPipelineRoutes(app, store);

    await app.ready();
  });

  afterAll(async () => {
    store.close();
    await app.close();
  });

  it('should return 404 for non-existent run stream', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/pipeline/nonexistent/stream',
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for non-existent run status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/pipeline/nonexistent/status',
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return run status for existing run', async () => {
    store.createRun('status-test-1', 'Test PRD');
    store.updateRun('status-test-1', { status: 'running' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/pipeline/status-test-1/status',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe('status-test-1');
    expect(body.status).toBe('running');
  });

  it('should emit and receive step events via store', () => {
    store.createRun('emit-test-1', 'Test PRD');

    const events: string[] = [];
    const unsub = store.subscribeRun('emit-test-1', (step) => {
      events.push(step.name);
    });

    store.emitStep('emit-test-1', { name: 'L1: PRD Parse', duration: 500, status: 'ok' });
    store.emitStep('emit-test-1', { name: 'L4: Graph Engine', duration: 300, status: 'ok' });

    expect(events).toEqual(['L1: PRD Parse', 'L4: Graph Engine']);
    unsub();
  });

  it('should list pipeline runs with limit', async () => {
    store.createRun('list-test-1', 'PRD 1');
    store.createRun('list-test-2', 'PRD 2');
    store.createRun('list-test-3', 'PRD 3');

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/pipeline?limit=2',
    });

    expect(res.statusCode).toBe(200);
    const runs = JSON.parse(res.payload);
    expect(Array.isArray(runs)).toBe(true);
    expect(runs.length).toBeLessThanOrEqual(2);
  });
});
