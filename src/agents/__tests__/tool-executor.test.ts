/**
 * Tests for ToolExecutor â€?Phase 3 tool-calling loop
 *
 * Covers:
 * - LLM returns stop immediately (no tool calls)
 * - Single tool call â†?LLM returns stop
 * - Multiple tool calls in one round
 * - Max rounds exceeded
 * - LLM failure (error returned)
 * - Tool execution failure (error fed back to LLM)
 * - Token usage tracking
 */

import { describe, it, expect } from '@jest/globals';
import { ToolExecutor, DEFAULT_TOOL_LOOP_CONFIG } from '../tool-executor';
import { ToolRegistry, ReadTool, GrepTool } from '../../tools';
import { LLMClient } from '../../integrations/llm-client';
import type { LLMResponse } from '../../integrations/llm-client';

// ============================================================================
// Mock helpers
// ============================================================================

function mockLLMWithTools(responses: Array<{
  ok?: boolean;
  finish_reason?: 'stop' | 'tool_calls' | 'length';
  content?: string;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: string;
}>): LLMClient {
  let callIndex = 0;
  const client = new LLMClient({ apiKey: 'sk-test' });
  client.chat = async (): Promise<LLMResponse> => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return {
      ok: resp.ok ?? true,
      status: (resp.ok ?? true) ? 200 : 500,
      content: resp.content ?? '',
      usage: resp.usage ?? { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 },
      finish_reason: resp.finish_reason,
      tool_calls: resp.tool_calls as any,
      error: resp.error,
    };
  };
  return client;
}

function createTestRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(new ReadTool());
  registry.register(new GrepTool());
  return registry;
}

// ============================================================================
// ToolExecutor Tests
// ============================================================================

describe('ToolExecutor', () => {
  describe('run', () => {
    it('should return content when LLM stops immediately (no tool calls)', async () => {
      const llm = mockLLMWithTools([
        { finish_reason: 'stop', content: '===FILE: src/index.ts\n// code\n===END===' },
      ]);
      const registry = createTestRegistry();
      const executor = new ToolExecutor(llm, registry, {
        workingDir: '/tmp',
        allowedPaths: ['/tmp'],
      });

      const { content, state } = await executor.run(
        'System: Generate code',
        'User: Make a counter app',
        { maxRounds: 5 },
      );

      expect(content).toContain('===FILE:');
      expect(state.round).toBe(1);
      expect(state.messages.length).toBeGreaterThanOrEqual(2);
    });

    it('should execute single tool call then return final content', async () => {
      const llm = mockLLMWithTools([
        {
          finish_reason: 'tool_calls',
          content: '',
          tool_calls: [{
            id: 'call_1',
            type: 'function',
            function: { name: 'read_file', arguments: JSON.stringify({ file_path: '/tmp/test.ts' }) },
          }],
        },
        { finish_reason: 'stop', content: '===FILE: src/index.ts\n// done\n===END===' },
      ]);
      const registry = createTestRegistry();
      const executor = new ToolExecutor(llm, registry, {
        workingDir: '/tmp',
        allowedPaths: ['/tmp'],
      });

      const { content, state } = await executor.run('Sys', 'User', { maxRounds: 5 });

      expect(content).toContain('===FILE:');
      expect(state.round).toBe(2);
      // Should have tool result message in history
      expect(state.messages.filter(m => m.role === 'tool').length).toBe(1);
    });

    it('should execute multiple tool calls in one round', async () => {
      const llm = mockLLMWithTools([
        {
          finish_reason: 'tool_calls',
          content: '',
          tool_calls: [
            { id: 'c1', type: 'function', function: { name: 'read_file', arguments: JSON.stringify({ file_path: '/tmp/a.ts' }) } },
            { id: 'c2', type: 'function', function: { name: 'search_code', arguments: JSON.stringify({ pattern: 'class', path: '/tmp' }) } },
          ],
        },
        { finish_reason: 'stop', content: '===FILE: src/index.ts\n// multi\n===END===' },
      ]);
      const registry = createTestRegistry();
      const executor = new ToolExecutor(llm, registry, {
        workingDir: '/tmp',
        allowedPaths: ['/tmp'],
      });

      const { content, state } = await executor.run('Sys', 'User', { maxRounds: 5 });

      expect(content).toContain('===FILE:');
      expect(state.round).toBe(2);
      expect(state.messages.filter(m => m.role === 'tool').length).toBe(2);
    });

    it('should throw when max rounds exceeded', async () => {
      // LLM keeps calling tools forever
      const toolCallResponse = {
        finish_reason: 'tool_calls' as const,
        content: '',
        tool_calls: [{
          id: 'call_x',
          type: 'function',
          function: { name: 'read_file', arguments: JSON.stringify({ file_path: '/tmp/x.ts' }) },
        }],
      };

      const llm = mockLLMWithTools([toolCallResponse, toolCallResponse, toolCallResponse]);
      const registry = createTestRegistry();
      const executor = new ToolExecutor(llm, registry, {
        workingDir: '/tmp',
        allowedPaths: ['/tmp'],
      });

      await expect(executor.run('Sys', 'User', { maxRounds: 2 }))
        .rejects.toThrow(/exceeded max rounds/);
    });

    it('should throw when LLM call fails', async () => {
      const llm = mockLLMWithTools([
        { ok: false, error: 'API timeout', content: '' },
      ]);
      const registry = createTestRegistry();
      const executor = new ToolExecutor(llm, registry, {
        workingDir: '/tmp',
        allowedPaths: ['/tmp'],
      });

      await expect(executor.run('Sys', 'User', { maxRounds: 3 }))
        .rejects.toThrow(/API timeout/);
    });

    it('should feed tool execution errors back to LLM', async () => {
      // Tool call to a non-existent file â†?error message fed back â†?LLM stops
      const llm = mockLLMWithTools([
        {
          finish_reason: 'tool_calls',
          content: '',
          tool_calls: [{
            id: 'call_err',
            type: 'function',
            function: { name: 'read_file', arguments: JSON.stringify({ file_path: '/nonexistent/file.ts' }) },
          }],
        },
        { finish_reason: 'stop', content: '// final answer after error' },
      ]);
      const registry = createTestRegistry();
      const executor = new ToolExecutor(llm, registry, {
        workingDir: '/tmp',
        allowedPaths: ['/tmp'],
      });

      const { content, state } = await executor.run('Sys', 'User', { maxRounds: 3 });

      // Should have tool error message
      const toolMessages = state.messages.filter(m => m.role === 'tool');
      expect(toolMessages.length).toBe(1);
      expect(toolMessages[0].content).toContain('Error:');
      // And then LLM produced its final answer
      expect(content).toContain('final answer');
    });

    it('should record token usage from each round', async () => {
      const llm = mockLLMWithTools([
        {
          finish_reason: 'tool_calls',
          tool_calls: [{
            id: 'call_u1',
            type: 'function',
            function: { name: 'read_file', arguments: JSON.stringify({ file_path: '/tmp/test.ts' }) },
          }],
          usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
        },
        {
          finish_reason: 'stop',
          content: '// done',
          usage: { prompt_tokens: 120, completion_tokens: 20, total_tokens: 140 },
        },
      ]);
      const registry = createTestRegistry();
      const executor = new ToolExecutor(llm, registry, {
        workingDir: '/tmp',
        allowedPaths: ['/tmp'],
      });

      const { state } = await executor.run('Sys', 'User', { maxRounds: 5 });

      expect(state.usage.length).toBe(2);
      expect(state.usage[0].totalTokens).toBe(110);
      expect(state.usage[1].totalTokens).toBe(140);
    });

    it('should use default config when no config provided', async () => {
      const llm = mockLLMWithTools([
        { finish_reason: 'stop', content: '// hello' },
      ]);
      const registry = createTestRegistry();
      const executor = new ToolExecutor(llm, registry, {
        workingDir: '/tmp',
        allowedPaths: ['/tmp'],
      });

      const { content } = await executor.run('Sys', 'User');

      expect(content).toBe('// hello');
    });

    it('should handle finish_reason length as final answer', async () => {
      const llm = mockLLMWithTools([
        { finish_reason: 'length', content: '===FILE: src/index.ts\n// partial content\n===END===' },
      ]);
      const registry = createTestRegistry();
      const executor = new ToolExecutor(llm, registry, {
        workingDir: '/tmp',
        allowedPaths: ['/tmp'],
      });

      const { content } = await executor.run('Sys', 'User', { maxRounds: 3 });

      expect(content).toContain('partial content');
    });

    it('should return LLMToolDefinition array from getLLMDefinitions', () => {
      const llm = mockLLMWithTools([]);
      const registry = createTestRegistry();
      const executor = new ToolExecutor(llm, registry, {
        workingDir: '/tmp',
        allowedPaths: ['/tmp'],
      });

      const defs = executor.getLLMDefinitions();
      expect(defs.length).toBeGreaterThanOrEqual(2);
      const names = defs.map(d => d.function.name);
      expect(names).toContain('read_file');
      expect(names).toContain('search_code');
    });
  });
});
