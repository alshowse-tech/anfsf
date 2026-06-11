/**
 * Health & Readiness Checks — Tests
 */

import Fastify from 'fastify';
import { registerHealthRoutes } from '../routes/health';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = Fastify();
    registerHealthRoutes(app);

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body.status).toBe('ok');
    expect(body.uptime).toBeDefined();
    expect(body.version).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it('uptime is a positive number', async () => {
    const app = Fastify();
    registerHealthRoutes(app);

    const res = await app.inject({ method: 'GET', url: '/health' });
    const body = res.json() as Record<string, unknown>;
    expect(typeof body.uptime).toBe('number');
    expect((body.uptime as number)).toBeGreaterThanOrEqual(0);
  });
});

describe('GET /ready', () => {
  it('returns 503 when no API key configured', async () => {
    const app = Fastify();
    registerHealthRoutes(app, { apiKey: '' });

    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(503);
    const body = res.json() as Record<string, unknown>;
    expect(body.status).toBe('not_ready');
    expect(body.checks).toBeDefined();
  });

  it('includes all three checks in response', async () => {
    const app = Fastify();
    registerHealthRoutes(app, { apiKey: '' });

    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json() as Record<string, unknown>;
    const checks = body.checks as Record<string, { status: string }>;
    expect(checks.llm).toBeDefined();
    expect(checks.database).toBeDefined();
    expect(checks.disk).toBeDefined();
  });

  it('llm check fails when API key is empty', async () => {
    const app = Fastify();
    registerHealthRoutes(app, { apiKey: '' });

    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json() as Record<string, unknown>;
    const checks = body.checks as Record<string, { status: string }>;
    expect(checks.llm.status).toBe('fail');
  });

  it('returns version and timestamp', async () => {
    const app = Fastify();
    registerHealthRoutes(app, { apiKey: '' });

    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json() as Record<string, unknown>;
    expect(body.version).toBeDefined();
    expect(body.timestamp).toBeDefined();
    expect(typeof body.timestamp).toBe('number');
  });
});
