/**
 * ANFSF — Unified Authentication Gateway
 *
 * Protects /api/v1/* routes with dual strategy:
 * 1. Static API Token (machine-to-machine, timingSafeEqual comparison)
 * 2. JWT (user sessions, jsonwebtoken verify)
 *
 * Public routes (/health, /ready, /metrics) and auth endpoints are excluded.
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';

const AUTH_EXEMPT_PATHS = ['/api/v1/auth/login', '/api/v1/auth/register'];

function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function secureTokenCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || (() => {
    const generated = require('crypto').randomBytes(32).toString('hex');
    console.warn('[auth] JWT_SECRET not set — sessions invalidated on restart');
    return generated;
  })();
}

export function registerAuthMiddleware(app: FastifyInstance, apiToken: string): void {
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip non-API routes
    if (!request.url.startsWith('/api/v1/')) return;

    // Skip exempt auth paths
    if (AUTH_EXEMPT_PATHS.some(p => request.url.startsWith(p))) return;

    const token = extractToken(request);
    if (!token) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Valid Bearer token required' });
    }

    // Strategy 1: Static API Token (machine-to-machine)
    if (apiToken && secureTokenCompare(token, apiToken)) {
      (request as any).auth = { type: 'api-token' };
      return;
    }

    // Strategy 2: JWT (user session)
    try {
      const payload = jwt.verify(token, getJwtSecret()) as { sub: string; role: string };
      (request as any).auth = { type: 'jwt', user: payload.sub, role: payload.role };
      return;
    } catch {
      // JWT verification failed → continue to 401
    }

    return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Token invalid or expired' });
  });
}
