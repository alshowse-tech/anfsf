import { describe, it, expect, beforeEach } from '@jest/globals';
import { createServer } from '../../server';
import * as fs from 'fs';

const USERS_DB = '.anfsf/users.json';

describe('Auth Flow (JWT)', () => {
  // Clean user DB between tests to avoid 409 conflicts
  beforeEach(() => {
    try { fs.unlinkSync(USERS_DB); } catch {}
  });

  // Fix JWT_SECRET so both auth.ts and middleware use the same key
  beforeAll(() => { process.env.JWT_SECRET = 'test-jwt-secret-not-for-production'; });

  const createTestServer = async () => {
    const server = await createServer({ apiKey: 'llm-key', apiToken: 'test-token', port: 0 });
    await server.start();
    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : 3000;
    return { server, port };
  };

  it('should register a new user', async () => {
    const { server, port } = await createTestServer();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'jwt-test-user', password: 'test123456' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.status).toBe('ok');
    } finally {
      await server.stop();
    }
  });

  it('should reject registration with short password', async () => {
    const { server, port } = await createTestServer();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'short-pw', password: '123' }),
      });
      expect(res.status).toBe(400);
    } finally {
      await server.stop();
    }
  });

  it('should login with correct password and return JWT', async () => {
    const { server, port } = await createTestServer();
    try {
      // First register
      await fetch(`http://127.0.0.1:${port}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'login-test', password: 'test123456' }),
      });
      // Then login
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'login-test', password: 'test123456' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.token).toBeDefined();
      expect(typeof body.token).toBe('string');
      expect((body.token as string).length).toBeGreaterThan(10);
    } finally {
      await server.stop();
    }
  });

  it('should reject login with wrong password', async () => {
    const { server, port } = await createTestServer();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'nonexistent', password: 'wrong' }),
      });
      expect(res.status).toBe(401);
    } finally {
      await server.stop();
    }
  });

  it('should access protected route with JWT', async () => {
    const { server, port } = await createTestServer();
    try {
      // Register and login
      await fetch(`http://127.0.0.1:${port}/api/v1/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'protected-test', password: 'test123456' }),
      });
      const loginRes = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'protected-test', password: 'test123456' }),
      });
      const loginData = await loginRes.json() as { token?: string };
      const token = loginData.token;

      // Access protected route with JWT
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/pipeline`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      // Should get 200 (pipeline list) not 401
      expect(res.status).toBe(200);
    } finally {
      await server.stop();
    }
  });

  it('should reject request without token', async () => {
    const { server, port } = await createTestServer();
    const serverWithToken = await createServer({ apiKey: 'llm-key', apiToken: 'test-token', port: 0 });
    await serverWithToken.start();
    const addr = serverWithToken.app.server.address();
    const p = (typeof addr === 'object' && addr) ? addr.port : 3000;
    try {
      const res = await fetch(`http://127.0.0.1:${p}/api/v1/pipeline`);
      expect(res.status).toBe(401);
    } finally {
      await serverWithToken.stop();
    }
  });
});
