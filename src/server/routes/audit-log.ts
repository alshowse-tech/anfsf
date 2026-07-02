import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE = '.anfsf/audit-log.json';

interface AuditEntry {
  timestamp: number;
  operation: string;
  user: string;
  ip: string;
  details: string;
}

export function registerAuditLogRoutes(app: FastifyInstance): void {
  app.get('/api/v1/audit-log', async (request) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = parseInt(query.limit || '50', 10);
    const offset = parseInt(query.offset || '0', 10);

    let entries: AuditEntry[] = [];
    try {
      entries = JSON.parse(fs.readFileSync(STORAGE, 'utf-8'));
    } catch { entries = []; }

    const paged = entries.slice(offset, offset + limit);
    return { entries: paged, total: entries.length, offset, limit };
  });

  app.post('/api/v1/audit-log', async (request) => {
    const body = request.body as Partial<AuditEntry>;
    const entry: AuditEntry = {
      timestamp: Date.now(),
      operation: body.operation || 'unknown',
      user: body.user || 'system',
      ip: body.ip || request.ip,
      details: body.details || '',
    };

    let entries: AuditEntry[] = [];
    try {
      entries = JSON.parse(fs.readFileSync(STORAGE, 'utf-8'));
    } catch { entries = []; }

    entries.unshift(entry); // newest first
    fs.mkdirSync(path.dirname(STORAGE), { recursive: true });
    fs.writeFileSync(STORAGE, JSON.stringify(entries.slice(0, 10000), null, 2), 'utf-8'); // keep last 10000

    return { status: 'ok', entry };
  });
}
