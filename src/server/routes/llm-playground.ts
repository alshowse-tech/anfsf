/**
 * ANFSF LLM Playground API
 *
 * POST /api/v1/llm/chat       — Send chat message to LLM
 * GET  /api/v1/llm/models     — List available models
 * GET  /api/v1/llm/usage      — Get token/cost usage
 * POST /api/v1/llm/reset      — Reset counters
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LLMClient, type LLMMessage, type LLMResponse } from '../../integrations/llm-client';
import type { ServerConfig } from '../index';

const PLAYGROUND_MAX_TOKENS = 4096;
const PLAYGROUND_MAX_HISTORY = 10;

export function registerLLMPlaygroundRoutes(
  app: FastifyInstance,
  llm: LLMClient,
  serverConfig: ServerConfig,
): void {
  // Chat
  app.post('/api/v1/llm/chat', async (request, reply) => {
    const body = request.body as {
      messages: LLMMessage[];
      model?: string;
      temperature?: number;
      max_tokens?: number;
    };
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return reply.code(400).send({ error: 'Bad Request', details: ['messages array is required'] });
    }

    // Enforce max_tokens cap to prevent excessive token consumption
    const maxTokens = Math.min(body.max_tokens || PLAYGROUND_MAX_TOKENS, PLAYGROUND_MAX_TOKENS);

    // Truncate message history to prevent excessive context
    const messages = body.messages.length > PLAYGROUND_MAX_HISTORY
      ? body.messages.slice(-PLAYGROUND_MAX_HISTORY)
      : body.messages;

    const response: LLMResponse = await llm.chat({
      messages,
      model: body.model,
      temperature: body.temperature,
      max_tokens: maxTokens,
    });
    if (!response.ok) {
      return reply.code(502).send({
        error: 'LLM Error',
        message: response.error || 'LLM call failed',
        status: response.status,
      });
    }
    const cost = llm.estimateCost(response.usage, body.model || serverConfig.defaultModel);
    return {
      content: response.content,
      usage: response.usage,
      cost,
      model: body.model || serverConfig.defaultModel,
      maxTokens,
    };
  });

  // Models
  app.get('/api/v1/llm/models', async (_request, _reply) => {
    const models = [
      { id: 'qwen3.5-plus', provider: 'DashScope', type: 'chat' },
      { id: 'qwen3.5-turbo', provider: 'DashScope', type: 'chat' },
      { id: 'qwen-max', provider: 'DashScope', type: 'chat' },
      { id: 'deepseek-chat', provider: 'DeepSeek', type: 'chat' },
      { id: 'deepseek-v4', provider: 'DeepSeek', type: 'chat' },
      { id: 'deepseek-v4-pro', provider: 'DeepSeek', type: 'chat' },
      { id: 'deepseek-r1', provider: 'DeepSeek', type: 'chat' },
    ];
    return {
      models,
      defaultModel: serverConfig.defaultModel,
      baseUrl: serverConfig.baseUrl,
    };
  });

  // Usage
  app.get('/api/v1/llm/usage', async (_request, _reply) => {
    const usage = llm.getTotalUsage();
    const cost = llm.getTotalCost();
    const circuit = llm.getCircuitState();
    return { usage, cost, circuit };
  });

  // Reset counters
  app.post('/api/v1/llm/reset', async (_request, _reply) => {
    llm.resetCounters();
    return { message: 'Counters reset' };
  });

  // Reset circuit breaker
  app.post('/api/v1/llm/reset-circuit', async (_request, _reply) => {
    llm.resetCircuit();
    return { message: 'Circuit breaker reset' };
  });
}
