/**
 * ANFSF Server — Rate Limiting Middleware
 *
 * Token bucket algorithm per client IP. Applied only to /api/v1/* routes.
 * Supports per-route rate limit overrides for differentiated limits.
 * Returns 429 Too Many Requests when the bucket is empty.
 * Always includes X-RateLimit-* headers on responses.
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export interface RateLimitConfig {
  /** Tokens added per second */
  qps: number;
  /** Maximum burst size (bucket capacity) */
  burst: number;
  /** Per-route overrides */
  routes?: Record<string, { qps: number; burst: number }>;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  qps: 5,
  burst: 10,
};

/** Match a request path against route patterns (supports trailing * wildcard) */
function matchRoute(path: string, pattern: string): boolean {
  if (pattern.endsWith('*')) {
    return path.startsWith(pattern.slice(0, -1));
  }
  return path === pattern;
}

export class RateLimiter {
  private buckets: Map<string, Bucket>;
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.buckets = new Map();
  }

  /**
   * Check if a request is allowed.
   * Returns rate limit result with header values.
   */
  check(clientKey: string, path?: string): RateLimitResult {
    const now = Date.now();

    // Determine config for this route
    let qps = this.config.qps;
    let burst = this.config.burst;
    if (this.config.routes && path) {
      for (const [pattern, override] of Object.entries(this.config.routes)) {
        if (matchRoute(path, pattern)) {
          qps = override.qps;
          burst = override.burst;
          break;
        }
      }
    }

    let bucket = this.buckets.get(clientKey);

    if (!bucket) {
      bucket = {
        tokens: burst,
        lastRefill: now,
      };
      this.buckets.set(clientKey, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(burst, bucket.tokens + elapsed * qps);
    bucket.lastRefill = now;

    const remaining = Math.floor(bucket.tokens);
    const resetAt = bucket.tokens < 1
      ? now + Math.ceil((1 - bucket.tokens) / qps * 1000)
      : now;

    if (bucket.tokens < 1) {
      return { allowed: false, limit: burst, remaining: 0, resetAt };
    }

    bucket.tokens -= 1;
    return { allowed: true, limit: burst, remaining: Math.floor(bucket.tokens), resetAt };
  }

  /** Clean up stale buckets (no activity for 5 minutes) */
  cleanup(): void {
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.lastRefill < cutoff) {
        this.buckets.delete(key);
      }
    }
  }
}

let limiter: RateLimiter | null = null;

export function registerRateLimitMiddleware(
  app: FastifyInstance,
  config: Partial<RateLimitConfig> = {},
): RateLimiter {
  limiter = new RateLimiter(config);

  // Periodic cleanup every minute
  const cleanupTimer = setInterval(() => limiter?.cleanup(), 60_000);
  cleanupTimer.unref();

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.url.startsWith('/api/v1/')) return;
    if (!limiter) return;

    const clientKey = getClientKey(request);
    const result = limiter.check(clientKey, request.url);

    // Always set rate limit headers
    reply.header('X-RateLimit-Limit', String(result.limit));
    reply.header('X-RateLimit-Remaining', String(result.remaining));
    reply.header('X-RateLimit-Reset', String(result.resetAt));

    if (!result.allowed) {
      reply.header('Retry-After', Math.ceil(1000 / (limiter['config'].qps)));
      return reply.code(429).send({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Max ${limiter['config'].qps} requests/sec, burst ${limiter['config'].burst}.`,
        limit: result.limit,
        remaining: result.remaining,
        resetAt: result.resetAt,
      });
    }
  });

  return limiter;
}

function getClientKey(request: FastifyRequest): string {
  return request.ip || 'unknown';
}
