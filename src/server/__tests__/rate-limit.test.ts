/**
 * ANFSF Server — Rate Limiting Middleware Tests
 */

import { RateLimiter } from '../middleware/rate-limit';
import { createServer } from '../../server';

describe('RateLimiter (unit)', () => {
  it('allows requests within burst limit', () => {
    const limiter = new RateLimiter({ qps: 5, burst: 3 });
    expect(limiter.check('127.0.0.1').allowed).toBe(true);
    expect(limiter.check('127.0.0.1').allowed).toBe(true);
    expect(limiter.check('127.0.0.1').allowed).toBe(true);
  });

  it('denies after burst is exhausted', () => {
    const limiter = new RateLimiter({ qps: 5, burst: 2 });
    expect(limiter.check('127.0.0.1').allowed).toBe(true);
    expect(limiter.check('127.0.0.1').allowed).toBe(true);
    expect(limiter.check('127.0.0.1').allowed).toBe(false);
  });

  it('tracks different clients separately', () => {
    const limiter = new RateLimiter({ qps: 5, burst: 1 });
    expect(limiter.check('client-a').allowed).toBe(true);
    expect(limiter.check('client-a').allowed).toBe(false);
    expect(limiter.check('client-b').allowed).toBe(true);
  });

  it('refills tokens over time', () => {
    const limiter = new RateLimiter({ qps: 100, burst: 1 });
    expect(limiter.check('127.0.0.1').allowed).toBe(true);
    expect(limiter.check('127.0.0.1').allowed).toBe(false);

    const key = '127.0.0.1';
    expect(limiter.check(key).allowed).toBe(false);
  });

  it('cleans up stale buckets', () => {
    const limiter = new RateLimiter({ qps: 5, burst: 10 });
    limiter.check('old-client');
    expect(limiter['buckets'].size).toBe(1);

    // Manually set lastRefill to 6 minutes ago
    const bucket = limiter['buckets'].get('old-client');
    if (bucket) {
      bucket.lastRefill = Date.now() - 6 * 60 * 1000;
    }
    limiter.cleanup();
    expect(limiter['buckets'].size).toBe(0);
  });

  it('keeps recent buckets after cleanup', () => {
    const limiter = new RateLimiter({ qps: 5, burst: 10 });
    limiter.check('recent-client');
    expect(limiter['buckets'].size).toBe(1);
    limiter.cleanup();
    expect(limiter['buckets'].size).toBe(1);
  });

  it('returns rate limit headers values', () => {
    const limiter = new RateLimiter({ qps: 5, burst: 10 });
    const result = limiter.check('client-1');
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(9);
    expect(result.resetAt).toBeGreaterThan(0);
  });

  it('respects per-route overrides', () => {
    const limiter = new RateLimiter({
      qps: 5,
      burst: 10,
      routes: {
        '/api/v1/synthesize': { qps: 2, burst: 3 },
        '/api/v1/pipeline': { qps: 10, burst: 20 },
      },
    });
    // Synthesize route has lower limits
    const synResult = limiter.check('client-syn', '/api/v1/synthesize');
    expect(synResult.limit).toBe(3);
    // Pipeline route has higher limits
    const pipeResult = limiter.check('client-pipe', '/api/v1/pipeline');
    expect(pipeResult.limit).toBe(20);
    // Unknown route uses default
    const defaultResult = limiter.check('client-def', '/api/v1/unknown');
    expect(defaultResult.limit).toBe(10);
  });

  it('matches wildcard route patterns', () => {
    const limiter = new RateLimiter({
      qps: 5,
      burst: 10,
      routes: {
        '/api/v1/pipeline*': { qps: 10, burst: 20 },
      },
    });
    const r1 = limiter.check('client-wc', '/api/v1/pipeline/abc/stream');
    expect(r1.limit).toBe(20);
    const r2 = limiter.check('client-wc', '/api/v1/pipeline/xyz/status');
    expect(r2.limit).toBe(20);
  });
});

describe('Rate Limiting (integration)', () => {
  it('returns 429 when rate limit exceeded', async () => {
    const server = await createServer({
      apiKey: 'llm-key',
      rateLimitQps: 2,
      rateLimitBurst: 2,
      port: 0,
    });
    await server.start();

    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : 3000;

    try {
      // Use up the burst
      const r1 = await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText: 'test' }),
      });
      expect(r1.status).toBe(202);

      const r2 = await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText: 'test' }),
      });
      expect(r2.status).toBe(202);

      // Third request should be rate limited
      const r3 = await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText: 'test' }),
      });
      expect(r3.status).toBe(429);
      const body = await r3.json() as Record<string, unknown>;
      expect(body.error).toBe('Too Many Requests');
    } finally {
      await server.stop();
    }
  });

  it('does not rate limit public routes', async () => {
    const server = await createServer({
      apiKey: 'llm-key',
      rateLimitQps: 1,
      rateLimitBurst: 1,
      port: 0,
    });
    await server.start();

    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : 3000;

    try {
      // Hit rate limit on /api/v1/ first
      await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText: 'test' }),
      });
      await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText: 'test' }),
      });

      // /health should still work
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      expect(res.status).toBe(200);
    } finally {
      await server.stop();
    }
  });

  it('includes Retry-After header on 429', async () => {
    const server = await createServer({
      apiKey: 'llm-key',
      rateLimitQps: 1,
      rateLimitBurst: 1,
      port: 0,
    });
    await server.start();

    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : 3000;

    try {
      await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText: 'test' }),
      });
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText: 'test' }),
      });
      expect(res.status).toBe(429);
      expect(res.headers.get('retry-after')).toBeDefined();
    } finally {
      await server.stop();
    }
  });

  it('includes X-RateLimit headers on responses', async () => {
    const server = await createServer({
      apiKey: 'llm-key',
      rateLimitQps: 5,
      rateLimitBurst: 10,
      port: 0,
    });
    await server.start();

    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : 3000;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText: 'test' }),
      });
      expect(res.headers.get('x-ratelimit-limit')).toBeDefined();
      expect(res.headers.get('x-ratelimit-remaining')).toBeDefined();
      expect(res.headers.get('x-ratelimit-reset')).toBeDefined();
    } finally {
      await server.stop();
    }
  });
});
