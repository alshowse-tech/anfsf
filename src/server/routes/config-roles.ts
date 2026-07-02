import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
const STORAGE = '.anfsf/role-config.json';

interface RoleConfigStore { roles: { role: string; permissions: string[] }[]; }

const DEFAULTS: RoleConfigStore = { roles: [] };

export function registerRoleConfigRoutes(app: FastifyInstance): void {
  app.get('/api/v1/config/roles', async () => {
    try { return JSON.parse(fs.readFileSync(STORAGE, 'utf-8')); }
    catch { return { ...DEFAULTS }; }
  });
  app.put('/api/v1/config/roles', async (req) => {
    const body = req.body as RoleConfigStore;
    fs.mkdirSync(path.dirname(STORAGE), { recursive: true });
    fs.writeFileSync(STORAGE, JSON.stringify(body, null, 2), 'utf-8');
    return { status: 'ok' };
  });
}
