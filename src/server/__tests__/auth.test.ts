/**
 * ANFSF Server — API Authentication Middleware Tests
 */

import { createServer } from '../../server';

describe('API Authentication Middleware', () => {
  describe('POST /api/v1/synthesize', () => {
    it('rejects with 401 when no token is sent and apiToken is configured', async () => {
      const server = await createServer({ apiKey: 'llm-key', apiToken: 'secret-token', port: 0 });
      await server.start();

      const address = server.app.server.address();
      const port = (typeof address === 'object' && address) ? address.port : 3000;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prdText: 'test' }),
        });
        expect(res.status).toBe(401);
        const body = await res.json() as Record<string, unknown>;
        expect(body.error).toBe('Unauthorized');
      } finally {
        await server.stop();
      }
    });

    it('rejects with 401 when wrong token is sent', async () => {
      const server = await createServer({ apiKey: 'llm-key', apiToken: 'secret-token', port: 0 });
      await server.start();

      const address = server.app.server.address();
      const port = (typeof address === 'object' && address) ? address.port : 3000;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer wrong-token',
          },
          body: JSON.stringify({ prdText: 'test' }),
        });
        expect(res.status).toBe(401);
      } finally {
        await server.stop();
      }
    });

    it('rejects with 401 when Authorization header is not Bearer scheme', async () => {
      const server = await createServer({ apiKey: 'llm-key', apiToken: 'secret-token', port: 0 });
      await server.start();

      const address = server.app.server.address();
      const port = (typeof address === 'object' && address) ? address.port : 3000;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic c2VjcmV0LXRva2Vu',
          },
          body: JSON.stringify({ prdText: 'test' }),
        });
        expect(res.status).toBe(401);
      } finally {
        await server.stop();
      }
    });

    it('accepts with correct Bearer token', async () => {
      const server = await createServer({ apiKey: 'llm-key', apiToken: 'secret-token', port: 0 });
      await server.start();

      const address = server.app.server.address();
      const port = (typeof address === 'object' && address) ? address.port : 3000;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer secret-token',
          },
          body: JSON.stringify({ prdText: 'Build a todo app' }),
        });
        expect(res.status).toBe(202);
        const body = await res.json() as Record<string, unknown>;
        expect(body.jobId).toBeDefined();
      } finally {
        await server.stop();
      }
    });
  });

  describe('GET /api/v1/pipeline/:id/status', () => {
    it('rejects without token when apiToken is configured', async () => {
      const server = await createServer({ apiKey: 'llm-key', apiToken: 'secret-token', port: 0 });
      await server.start();

      const address = server.app.server.address();
      const port = (typeof address === 'object' && address) ? address.port : 3000;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/v1/pipeline/fake-id/status`);
        expect(res.status).toBe(401);
      } finally {
        await server.stop();
      }
    });

    it('accepts with correct token', async () => {
      const server = await createServer({ apiKey: 'llm-key', apiToken: 'secret-token', port: 0 });
      await server.start();

      const address = server.app.server.address();
      const port = (typeof address === 'object' && address) ? address.port : 3000;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/v1/pipeline/fake-id/status`, {
          headers: { 'Authorization': 'Bearer secret-token' },
        });
        expect(res.status).toBe(404); // valid auth, but run not found
      } finally {
        await server.stop();
      }
    });
  });

  describe('Public routes (not affected by auth)', () => {
    it('GET /health works without token', async () => {
      const server = await createServer({ apiKey: 'llm-key', apiToken: 'secret-token', port: 0 });
      await server.start();

      const address = server.app.server.address();
      const port = (typeof address === 'object' && address) ? address.port : 3000;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/health`);
        expect(res.status).toBe(200);
      } finally {
        await server.stop();
      }
    });

    it('GET /ready works without token', async () => {
      const server = await createServer({ apiKey: 'llm-key', apiToken: 'secret-token', port: 0 });
      await server.start();

      const address = server.app.server.address();
      const port = (typeof address === 'object' && address) ? address.port : 3000;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/ready`);
        expect(res.status).toBe(503); // apiToken is set but apiKey is different, readiness checks apiKey
      } finally {
        await server.stop();
      }
    });

    it('GET /metrics works without token', async () => {
      const server = await createServer({ apiKey: 'llm-key', apiToken: 'secret-token', port: 0 });
      await server.start();

      const address = server.app.server.address();
      const port = (typeof address === 'object' && address) ? address.port : 3000;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/metrics`);
        expect(res.status).toBe(200);
      } finally {
        await server.stop();
      }
    });
  });

  describe('Backward compatibility (no apiToken configured)', () => {
    it('allows all requests when apiToken is empty', async () => {
      const server = await createServer({ apiKey: 'llm-key', apiToken: '', port: 0 });
      await server.start();

      const address = server.app.server.address();
      const port = (typeof address === 'object' && address) ? address.port : 3000;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prdText: 'test' }),
        });
        expect(res.status).toBe(202);
      } finally {
        await server.stop();
      }
    });
  });

  describe('Request body size limits', () => {
    it('returns 413 when body exceeds 20MB limit', async () => {
      const server = await createServer({ apiKey: 'llm-key', apiToken: 'secret-token', port: 0 });
      await server.start();

      const address = server.app.server.address();
      const port = (typeof address === 'object' && address) ? address.port : 3000;

      try {
        const largePayload = JSON.stringify({ prdText: 'x'.repeat(21 * 1024 * 1024) });
        const res = await fetch(`http://127.0.0.1:${port}/api/v1/synthesize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer secret-token',
          },
          body: largePayload,
        });
        expect(res.status).toBe(413);
      } finally {
        await server.stop();
      }
    });
  });
});
