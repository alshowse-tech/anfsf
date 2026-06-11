/**
 * LLM Client Tests
 *
 * Tests retry, circuit breaker, timeout, cost tracking, and token counting.
 * Uses `fetch` mocking via a local HTTP server.
 */

import { createServer } from 'http';
import { LLMClient, type LLMClientConfig } from '../llm-client';

// ============================================================================
// Test helpers
// ============================================================================

function startMockServer(handler: (req: any, res: any) => void): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({
        port: addr.port,
        close: () => new Promise(r => server.close(() => r())),
      });
    });
  });
}

function makeConfig(baseUrl: string): LLMClientConfig {
  return {
    apiKey: 'test-key',
    baseUrl,
    defaultModel: 'qwen3.5-plus',
    maxRetries: 2,
    retryBackoffMs: 10,
    timeoutMs: 5000,
    circuitBreakerThreshold: 3,
    circuitBreakerResetMs: 50,
  };
}

describe('LLMClient', () => {
  describe('successful requests', () => {
    it('returns content and usage on success', async () => {
      const server = await startMockServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          choices: [{ message: { content: 'hello' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }));
      });

      try {
        const client = new LLMClient(makeConfig(`http://127.0.0.1:${server.port}`));
        const result = await client.chat({ messages: [{ role: 'user', content: 'hi' }] });
        expect(result.ok).toBe(true);
        expect(result.content).toBe('hello');
        expect(result.usage.total_tokens).toBe(15);
      } finally {
        await server.close();
      }
    });

    it('tracks cumulative token usage', async () => {
      const server = await startMockServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }));
      });

      try {
        const client = new LLMClient(makeConfig(`http://127.0.0.1:${server.port}`));
        await client.chat({ messages: [{ role: 'user', content: 'hi' }] });
        await client.chat({ messages: [{ role: 'user', content: 'hi' }] });

        const total = client.getTotalUsage();
        expect(total.prompt_tokens).toBe(20);
        expect(total.completion_tokens).toBe(10);
        expect(total.total_tokens).toBe(30);
      } finally {
        await server.close();
      }
    });
  });

  describe('retry logic', () => {
    it('retries on 500 errors and succeeds', async () => {
      let attempts = 0;
      const server = await startMockServer((_req, res) => {
        attempts++;
        if (attempts < 3) {
          res.writeHead(500);
          res.end('internal error');
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            choices: [{ message: { content: 'recovered' } }],
            usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
          }));
        }
      });

      try {
        const client = new LLMClient(makeConfig(`http://127.0.0.1:${server.port}`));
        const result = await client.chat({ messages: [{ role: 'user', content: 'test' }] });
        expect(result.ok).toBe(true);
        expect(result.content).toBe('recovered');
        expect(attempts).toBe(3);
      } finally {
        await server.close();
      }
    });

    it('gives up after max retries exceeded', async () => {
      const server = await startMockServer((_req, res) => {
        res.writeHead(502);
        res.end('bad gateway');
      });

      try {
        const client = new LLMClient(makeConfig(`http://127.0.0.1:${server.port}`));
        const result = await client.chat({ messages: [{ role: 'user', content: 'test' }] });
        expect(result.ok).toBe(false);
        expect(result.error).toContain('3 attempts');
      } finally {
        await server.close();
      }
    });

    it('does not retry 400 errors', async () => {
      let attempts = 0;
      const server = await startMockServer((_req, res) => {
        attempts++;
        res.writeHead(400);
        res.end('bad request');
      });

      try {
        const client = new LLMClient(makeConfig(`http://127.0.0.1:${server.port}`));
        const result = await client.chat({ messages: [{ role: 'user', content: 'test' }] });
        expect(result.ok).toBe(false);
        expect(result.status).toBe(400);
        expect(attempts).toBe(1); // No retry
      } finally {
        await server.close();
      }
    });

    it('retries 429 rate limit with backoff', async () => {
      let attempts = 0;
      const server = await startMockServer((_req, res) => {
        attempts++;
        if (attempts < 2) {
          res.writeHead(429);
          res.end('rate limited');
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            choices: [{ message: { content: 'ok' } }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }));
        }
      });

      try {
        const client = new LLMClient({
          ...makeConfig(`http://127.0.0.1:${server.port}`),
          maxRetries: 3,
          retryBackoffMs: 10,
        });
        const result = await client.chat({ messages: [{ role: 'user', content: 'test' }] });
        expect(result.ok).toBe(true);
        expect(attempts).toBe(2);
      } finally {
        await server.close();
      }
    });
  });

  describe('circuit breaker', () => {
    it('opens circuit after consecutive failures', async () => {
      const server = await startMockServer((_req, res) => {
        res.writeHead(500);
        res.end('fail');
      });

      try {
        const client = new LLMClient({
          ...makeConfig(`http://127.0.0.1:${server.port}`),
          maxRetries: 0, // No retries so each call is one failure
          circuitBreakerThreshold: 3,
        });

        for (let i = 0; i < 3; i++) {
          await client.chat({ messages: [{ role: 'user', content: 'test' }] });
        }

        const state = client.getCircuitState();
        expect(state.state).toBe('open');
      } finally {
        await server.close();
      }
    });

    it('rejects requests when circuit is open', async () => {
      const server = await startMockServer((_req, res) => {
        res.writeHead(500);
        res.end('fail');
      });

      try {
        const client = new LLMClient({
          ...makeConfig(`http://127.0.0.1:${server.port}`),
          maxRetries: 0,
          circuitBreakerThreshold: 2,
        });

        // Trip the breaker
        await client.chat({ messages: [{ role: 'user', content: 'test' }] });
        await client.chat({ messages: [{ role: 'user', content: 'test' }] });

        // Should be immediately rejected
        const result = await client.chat({ messages: [{ role: 'user', content: 'test' }] });
        expect(result.ok).toBe(false);
        expect(result.error).toContain('Circuit breaker');
      } finally {
        await server.close();
      }
    });

    it('transitions to half-open after reset period', async () => {
      const server = await startMockServer((_req, res) => {
        res.writeHead(500);
        res.end('fail');
      });

      try {
        const client = new LLMClient({
          ...makeConfig(`http://127.0.0.1:${server.port}`),
          maxRetries: 0,
          circuitBreakerThreshold: 2,
          circuitBreakerResetMs: 50,
        });

        await client.chat({ messages: [{ role: 'user', content: 'test' }] });
        await client.chat({ messages: [{ role: 'user', content: 'test' }] });
        expect(client.getCircuitState().state).toBe('open');

        // Wait for reset period
        await new Promise(r => setTimeout(r, 100));

        // Next request should be allowed (half-open)
        // But still fails since server returns 500
        await client.chat({ messages: [{ role: 'user', content: 'test' }] });
        expect(client.getCircuitState().state).toBe('open'); // Goes back to open
      } finally {
        await server.close();
      }
    });

    it('resets circuit manually', async () => {
      const client = new LLMClient({
        maxRetries: 0,
        circuitBreakerThreshold: 2,
        apiKey: '',
      });
      client.resetCircuit();
      expect(client.getCircuitState().state).toBe('closed');
    });
  });

  describe('timeout', () => {
    it('aborts request after timeout', async () => {
      const server = await startMockServer((_req, res) => {
        // Never respond — will timeout
        setTimeout(() => {
          res.writeHead(200);
          res.end(JSON.stringify({ choices: [{ message: { content: 'late' } }] }));
        }, 10000);
      });

      try {
        const client = new LLMClient({
          ...makeConfig(`http://127.0.0.1:${server.port}`),
          timeoutMs: 100,
          maxRetries: 0,
        });
        const result = await client.chat({ messages: [{ role: 'user', content: 'test' }] });
        expect(result.ok).toBe(false);
        expect(result.error).toContain('timed out');
      } finally {
        await server.close();
      }
    }, 5000);

    afterEach(() => {
      // Ensure no lingering timers
      jest.useRealTimers();
    });
  });

  describe('cost estimation', () => {
    it('estimates cost from usage', () => {
      const client = new LLMClient({ apiKey: 'test' });
      const cost = client.estimateCost({
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500,
      });
      expect(cost.promptCost).toBeGreaterThan(0);
      expect(cost.completionCost).toBeGreaterThan(0);
      expect(cost.totalCost).toBeGreaterThan(0);
      expect(cost.currency).toBe('USD');
    });

    it('tracks cumulative cost', async () => {
      const server = await startMockServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        }));
      });

      try {
        const client = new LLMClient(makeConfig(`http://127.0.0.1:${server.port}`));
        await client.chat({ messages: [{ role: 'user', content: 'hi' }] });
        await client.chat({ messages: [{ role: 'user', content: 'hi' }] });

        const total = client.getTotalCost();
        expect(total.totalCost).toBeGreaterThan(0);
        expect(total.promptCost).toBeGreaterThan(0);
      } finally {
        await server.close();
      }
    });

    it('resets counters', async () => {
      const server = await startMockServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        }));
      });

      try {
        const client = new LLMClient(makeConfig(`http://127.0.0.1:${server.port}`));
        await client.chat({ messages: [{ role: 'user', content: 'hi' }] });
        client.resetCounters();
        expect(client.getTotalUsage().total_tokens).toBe(0);
        expect(client.getTotalCost().totalCost).toBe(0);
      } finally {
        await server.close();
      }
    });

    it('supports different model pricing', () => {
      const client = new LLMClient({ apiKey: 'test', defaultModel: 'deepseek-chat' });
      const qwenCost = client.estimateCost({ prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 2000 }, 'qwen3.5-plus');
      const deepseekCost = client.estimateCost({ prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 2000 }, 'deepseek-chat');
      // Different models have different pricing
      expect(qwenCost.totalCost).not.toBe(deepseekCost.totalCost);
    });
  });

  describe('error handling', () => {
    it('handles network errors', async () => {
      const client = new LLMClient({
        ...makeConfig('http://127.0.0.1:1'), // Port 1 — connection refused
        maxRetries: 0,
      });
      const result = await client.chat({ messages: [{ role: 'user', content: 'test' }] });
      expect(result.ok).toBe(false);
    });

    it('handles malformed JSON response', async () => {
      const server = await startMockServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('not json');
      });

      try {
        const client = new LLMClient({
          ...makeConfig(`http://127.0.0.1:${server.port}`),
          maxRetries: 0,
        });
        const result = await client.chat({ messages: [{ role: 'user', content: 'test' }] });
        expect(result.ok).toBe(false);
      } finally {
        await server.close();
      }
    });

    it('handles missing choices in response', async () => {
      const server = await startMockServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }));
      });

      try {
        const client = new LLMClient({
          ...makeConfig(`http://127.0.0.1:${server.port}`),
        });
        const result = await client.chat({ messages: [{ role: 'user', content: 'test' }] });
        expect(result.ok).toBe(true);
        expect(result.content).toBe(''); // Empty content, but still ok
      } finally {
        await server.close();
      }
    });
  });
});
