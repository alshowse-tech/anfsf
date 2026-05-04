/**
 * GET /health — Liveness check
 * GET /ready — Readiness check
 */

import { FastifyInstance } from 'fastify';

const VERSION = process.env.npm_package_version || '0.8.5';

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/health', async (_request, reply) => {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      version: VERSION,
      timestamp: Date.now(),
    };
  });

  app.get('/ready', async (_request, reply) => {
    const apiKey = process.env.DASHSCOPE_API_KEY || '';
    const hasApiKey = apiKey.length > 0;

    if (!hasApiKey) {
      return reply.code(503).send({
        status: 'not_ready',
        checks: {
          apiKey: false,
        },
        message: 'DASHSCOPE_API_KEY not configured',
      });
    }

    return {
      status: 'ok',
      checks: {
        apiKey: true,
      },
    };
  });
}
