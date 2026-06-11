/**
 * Synthesize Multipart Tests
 */

import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { PipelineRunStore } from '../store';

describe('synthesize multipart', () => {
  let app: FastifyInstance;
  let store: PipelineRunStore;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    store = new PipelineRunStore(':memory:');

    await app.register(multipart);

    // Register a minimal synthesize/multipart route for testing
    app.post('/api/v1/synthesize/multipart', async (request, reply) => {
      let prdText = '';
      const files: Array<{ filename: string; data: Buffer }> = [];

      try {
        const parts = request.parts();
        for await (const part of parts) {
          if (part.type === 'field' && part.fieldname === 'prdText') {
            prdText = part.value as string;
          } else if (part.type === 'file') {
            const chunks: Buffer[] = [];
            for await (const chunk of part.file) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            files.push({ filename: part.filename!, data: Buffer.concat(chunks) });
          }
        }
      } catch (e) {
        return reply.code(400).send({ error: 'Parse failed', details: e instanceof Error ? e.message : String(e) });
      }

      if (!prdText.trim() && files.length === 0) {
        return reply.code(400).send({ error: 'Bad Request', details: ['prdText or at least one file is required'] });
      }

      const jobId = `run_${Date.now()}`;
      store.createRun(jobId, prdText);

      return reply.code(202).send({ jobId, status: 'running', fileCount: files.length });
    });

    await app.ready();
  });

  afterAll(async () => {
    store.close();
    await app.close();
  });

  it('should accept prdText field via multipart', async () => {
    // Build multipart payload manually using FormData-like approach
    const boundary = '----test-boundary';
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="prdText"',
      '',
      'Build a todo app',
      `--${boundary}--`,
      '',
    ].join('\r\n');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/synthesize/multipart',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(body),
    });

    expect(res.statusCode).toBe(202);
    const data = JSON.parse(res.payload);
    expect(data.jobId).toBeDefined();
  });

  it('should reject empty multipart request', async () => {
    const boundary = '----test-boundary-empty';
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="prdText"',
      '',
      '   ',  // whitespace only
      `--${boundary}--`,
      '',
    ].join('\r\n');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/synthesize/multipart',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(body),
    });

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res.payload);
    expect(data.details).toContain('prdText or at least one file is required');
  });
});
