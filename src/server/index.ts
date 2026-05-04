/**
 * ANFSF Server — Fastify HTTP API
 *
 * Exposes ANFSF pipeline as HTTP endpoints with SSE progress streaming
 * and Prometheus metrics.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { registerSynthesizeRoute } from './routes/synthesize';
import { registerPipelineRoutes } from './routes/pipeline';
import { registerMetricsRoute } from './routes/metrics';
import { registerHealthRoutes } from './routes/health';
import { PipelineRunStore } from './store';

export interface ServerConfig {
  port?: number;
  host?: string;
  apiKey?: string;
  defaultModel?: string;
}

const DEFAULT_CONFIG: Required<ServerConfig> = {
  port: parseInt(process.env.ANFSF_PORT || '3000', 10),
  host: process.env.ANFSF_HOST || '0.0.0.0',
  apiKey: process.env.DASHSCOPE_API_KEY || '',
  defaultModel: process.env.ANFSF_MODEL || 'qwen3.5-plus',
};

export async function createServer(config: ServerConfig = {}) {
  const resolved = { ...DEFAULT_CONFIG, ...config };
  const store = new PipelineRunStore();

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  await app.register(cors, { origin: true });
  await app.register(sensible);

  // Register routes
  registerSynthesizeRoute(app, store, resolved);
  registerPipelineRoutes(app, store);
  registerMetricsRoute(app, store);
  registerHealthRoutes(app);

  return {
    app,
    store,
    async start() {
      await app.listen({ port: resolved.port, host: resolved.host });
      app.log.info(`ANFSF server listening on ${resolved.host}:${resolved.port}`);
    },
    async stop() {
      await app.close();
    },
  };
}

export type AnfsfServer = Awaited<ReturnType<typeof createServer>>;

// Allow running directly with ts-node
if (process.argv[1]?.endsWith('server/index.ts')) {
  createServer().then(s => s.start()).catch(err => {
    console.error('Failed to start ANFSF server:', err);
    process.exit(1);
  });
}
