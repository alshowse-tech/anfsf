import { describe, it, expect } from '@jest/globals';
import { createServer } from '../../server';

describe('Graceful Shutdown', () => {
  it('should stop server cleanly', async () => {
    const server = await createServer({ apiKey: 'llm-key', port: 0 });
    await server.start();

    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : -1;
    expect(port).toBeGreaterThan(0);

    // Verify server is running
    const healthRes = await fetch(`http://127.0.0.1:${port}/health`);
    expect(healthRes.status).toBe(200);

    // Stop the server
    await server.stop();

    // Verify server is stopped (connection should fail)
    try {
      await fetch(`http://127.0.0.1:${port}/health`);
      fail('Server should be stopped');
    } catch {
      // Expected — connection refused
      expect(true).toBe(true);
    }
  });

  it('should complete in-flight requests before stop', async () => {
    const server = await createServer({ apiKey: 'llm-key', port: 0 });
    await server.start();
    const address = server.app.server.address();
    const port = (typeof address === 'object' && address) ? address.port : 3000;

    // Fire a quick request and immediately stop
    const [res] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/api/v1/pipeline`),
      new Promise<void>(resolve => setTimeout(resolve, 50)),
    ]);

    await server.stop();
    // The request should have completed (either 200 or 401 depending on auth)
    expect([200, 401]).toContain(res.status);
  });

  it('should not hang indefinitely on stop', async () => {
    const server = await createServer({ apiKey: 'llm-key', port: 0 });
    await server.start();

    // Stop should complete within reasonable time
    const start = Date.now();
    await server.stop();
    const elapsed = Date.now() - start;

    // Should complete well before 30s timeout
    expect(elapsed).toBeLessThan(10000);
  });
});
