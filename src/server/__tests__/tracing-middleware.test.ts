/**
 * Request Tracing Middleware — Tests
 */

import { registerTracingMiddleware, withRequestTrace, generateTraceId } from '../middleware/tracing';
import Fastify from 'fastify';
import { runWithTrace, getCurrentTraceId } from '../../observability/logger';

describe('Request Tracing Middleware', () => {
  it('adds X-Trace-ID header to responses', async () => {
    const app = Fastify();
    registerTracingMiddleware(app);

    app.get('/test', async () => ({ ok: true }));

    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['x-trace-id']).toBeDefined();
    expect(res.headers['x-trace-id']).toMatch(/^anfsf-/);
  });

  it('respects incoming X-Trace-ID header', async () => {
    const app = Fastify();
    registerTracingMiddleware(app);

    app.get('/test', async () => ({ ok: true }));

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'X-Trace-ID': 'custom-trace-id' },
    });
    expect(res.headers['x-trace-id']).toBe('custom-trace-id');
  });

  it('generates unique trace IDs per request', async () => {
    const app = Fastify();
    registerTracingMiddleware(app);

    app.get('/test', async () => ({ ok: true }));

    const [r1, r2] = await Promise.all([
      app.inject({ method: 'GET', url: '/test' }),
      app.inject({ method: 'GET', url: '/test' }),
    ]);

    expect(r1.headers['x-trace-id']).not.toBe(r2.headers['x-trace-id']);
  });
});

describe('withRequestTrace', () => {
  it('executes function within trace context when header present', () => {
    const mockRequest = {
      headers: { 'x-trace-id': 'req-trace-123' },
    } as any;

    let captured: string | undefined;
    withRequestTrace(mockRequest, () => {
      captured = getCurrentTraceId();
    });

    expect(captured).toBe('req-trace-123');
  });

  it('executes function without trace context when header absent', () => {
    const mockRequest = {
      headers: {},
    } as any;

    let captured: string | undefined;
    withRequestTrace(mockRequest, () => {
      captured = getCurrentTraceId();
    });

    expect(captured).toBeUndefined();
  });

  it('returns the function result', () => {
    const mockRequest = { headers: {} } as any;
    const result = withRequestTrace(mockRequest, () => 'hello');
    expect(result).toBe('hello');
  });
});

describe('trace ID generation', () => {
  it('generates trace IDs in expected format', () => {
    const id = generateTraceId();
    expect(id).toMatch(/^anfsf-[a-z0-9]+-[a-z0-9]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateTraceId());
    }
    expect(ids.size).toBe(100);
  });
});
