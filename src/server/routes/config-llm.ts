import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE = '.anfsf/llm-config.json';

interface LLMConfigStore { apiKey: string; baseUrl: string; defaultModel: string; }

export function registerLLMConfigRoutes(app: FastifyInstance): void {
  app.get('/api/v1/config/llm', async () => {
    try { const d: LLMConfigStore = JSON.parse(fs.readFileSync(STORAGE, 'utf-8')); return { ...d, apiKey: d.apiKey ? '••••••••' : '' }; }
    catch { return { apiKey: '', baseUrl: '', defaultModel: 'qwen3.5-plus' }; }
  });
  app.put('/api/v1/config/llm', async (req) => {
    const body = req.body as Partial<LLMConfigStore>;
    try { const cur: LLMConfigStore = JSON.parse(fs.readFileSync(STORAGE, 'utf-8')); Object.assign(cur, body); fs.writeFileSync(STORAGE, JSON.stringify(cur, null, 2), 'utf-8'); }
    catch { fs.mkdirSync(path.dirname(STORAGE), { recursive: true }); fs.writeFileSync(STORAGE, JSON.stringify(body, null, 2), 'utf-8'); }
    return { status: 'ok' };
  });
}