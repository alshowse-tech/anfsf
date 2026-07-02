import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
const STORAGE = '.anfsf/pipeline-config.json';

export function registerPipelineConfigRoutes(app: FastifyInstance): void {
  app.get('/api/v1/config/pipeline', async () => {
    try { return JSON.parse(fs.readFileSync(STORAGE, 'utf-8')); }
    catch { return { maxRetries: 2, llmTimeout: 180000, bottleneckThreshold: 1000 }; }
  });
  app.put('/api/v1/config/pipeline', async (req) => {
    const body = req.body as any;
    fs.mkdirSync(path.dirname(STORAGE), { recursive: true });
    fs.writeFileSync(STORAGE, JSON.stringify(body, null, 2), 'utf-8');
    return { status: 'ok' };
  });
}