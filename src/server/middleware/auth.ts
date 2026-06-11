/**
 * ANFSF Server — API Authentication Middleware
 *
 * Protects /api/v1/* routes with Bearer token authentication.
 * Public routes (/health, /ready, /metrics) are excluded.
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { timingSafeEqual } from 'crypto';

function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

/** Constant-time token comparison — prevents timing attacks */
function secureTokenCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function registerAuthMiddleware(
  app: FastifyInstance,
  apiToken: string,
): void {
  // Token not configured — allow all but log a warning on startup
  if (!apiToken) {
    app.log?.warn?.(
      'ANFSF_API_TOKEN not set — /api/v1/* routes are unprotected. ' +
      'Set ANFSF_API_TOKEN for production use.',
    );
    return;
  }

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Only protect /api/v1/* routes
    if (!request.url.startsWith('/api/v1/')) return;

    const token = extractToken(request);
    if (!token || !secureTokenCompare(token, apiToken)) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Valid Bearer token required',
      });
    }
  });
}
