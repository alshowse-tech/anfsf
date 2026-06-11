/**
 * Tests for CodeGenerationLoop (T-002)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import {
  CodeGenerationLoop,
  DEFAULT_AGENT_CONFIG,
  parseCodeFromResponse,
} from '../code-generation-loop';
import type { RequirementSpec, AgentLoopConfig, GeneratedCode, AgentRoundTokenUsage } from '../code-generation-loop';
import { LLMClient } from '../../integrations/llm-client';

function mockLLMClient(responses: Array<{ ok: boolean; content: string; error?: string; usage?: object }>) {
  let callIndex = 0;
  const client = new LLMClient({ apiKey: 'sk-test' });
  client.chat = async () => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return {
      ok: resp.ok,
      status: resp.ok ? 200 : 500,
      content: resp.content,
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150, ...resp.usage },
      error: resp.error,
    };
  };
  return { client, getCallCount: () => callIndex };
}

const sampleSpec: RequirementSpec = {
  intent: 'Build a simple task management app',
  features: [
    { id: 'f1', name: 'Task CRUD', description: 'Create, read, update, delete tasks', priority: 'P0' },
    { id: 'f2', name: 'Task List', description: 'Display tasks in a list', priority: 'P0' },
  ],
  deploymentForm: 'web',
};

const validDelimiterResponse = [
  '===FILE: package.json',
  '{"name":"test","version":"1.0.0"}',
  '===END===',
  '',
  '===FILE: src/index.ts',
  '// [generated]\nconsole.log("hello");',
  '===END===',
].join('\n');

const validJsonResponse = JSON.stringify({
  files: [
    { path: 'package.json', content: '{"name":"test","version":"1.0.0"}' },
    { path: 'src/index.ts', content: '// [generated]\nconsole.log("hello");' },
    { path: 'TASK.md', content: '# Tasks\n- [ ] Implement task CRUD logic' },
  ],
  contracts: {
    openapi: { openapi: '3.0.0', paths: {} },
    dbSchema: { tables: [] },
  },
});

describe('parseCodeFromResponse', () => {
  it('should parse delimiter format', () => {
    const result = parseCodeFromResponse(validDelimiterResponse);
    expect(result.files).toHaveLength(2);
    expect(result.files[0].path).toBe('package.json');
    expect(result.files[1].path).toBe('src/index.ts');
  });

  it('should parse valid JSON as fallback', () => {
    const json = JSON.stringify({ files: [{ path: 'a.ts', content: '// code' }] });
    const result = parseCodeFromResponse(json);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('a.ts');
  });

  it('should strip markdown code fences for JSON', () => {
    const json = JSON.stringify({ files: [{ path: 'a.ts', content: 'x' }] });
    const result = parseCodeFromResponse('```json\n' + json + '\n```');
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('a.ts');
  });

  it('should return 0 files when all parsing strategies fail', () => {
    const result = parseCodeFromResponse('not valid json or delimited format at all');
    expect(result.files).toHaveLength(0);
  });

  it('should mark all parsed files as generated', () => {
    const result = parseCodeFromResponse(validDelimiterResponse);
    for (const f of result.files) {
      expect(f.source).toBe('generated');
    }
  });

  it('should prefer delimiter format over JSON when both present', () => {
    const mixed = validDelimiterResponse + '\n' + validJsonResponse;
    const result = parseCodeFromResponse(mixed);
    expect(result.files).toHaveLength(2);
    expect(result.files[0].path).toBe('package.json');
  });
});

describe('CodeGenerationLoop', () => {
  let loop: CodeGenerationLoop;
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `anfsf-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  describe('successful generation (single round)', () => {
    it('should return success when LLM returns valid code', async () => {
      const { client } = mockLLMClient([{ ok: true, content: validDelimiterResponse }]);
      loop = new CodeGenerationLoop(client);

      const result = await loop.generate(sampleSpec, tempDir);

      expect(result.rounds).toBeGreaterThanOrEqual(1);
      expect(result.code.files.length).toBeGreaterThan(0);
      expect(result.tokenUsage.length).toBeGreaterThan(0);
    }, 30_000);
  });

  describe('LLM failure', () => {
    it('should return failure when LLM call fails', async () => {
      const { client } = mockLLMClient([{ ok: false, content: '', error: 'API down' }]);
      loop = new CodeGenerationLoop(client);

      const result = await loop.generate(sampleSpec, tempDir);

      expect(result.success).toBe(false);
      expect(result.rounds).toBe(0);
      expect(result.message).toContain('API down');
    });

    it('should return failure when LLM returns 0 files', async () => {
      const { client } = mockLLMClient([{ ok: true, content: 'no parseable content here' }]);
      loop = new CodeGenerationLoop(client);

      const result = await loop.generate(sampleSpec, tempDir);

      expect(result.success).toBe(false);
      expect(result.code.files).toHaveLength(0);
      expect(result.message).toContain('0 parseable files');
    });
  });

  describe('config', () => {
    it('should use default config when none provided', () => {
      const { client } = mockLLMClient([]);
      loop = new CodeGenerationLoop(client);
      expect(loop).toBeDefined();
    });

    it('should accept custom maxRetries', async () => {
      const { client } = mockLLMClient([
        { ok: true, content: validDelimiterResponse },
      ]);
      loop = new CodeGenerationLoop(client, { maxRetries: 1 });

      const result = await loop.generate(sampleSpec, tempDir);
      expect(result.rounds).toBeGreaterThanOrEqual(1);
    }, 30_000);
  });

  describe('token tracking', () => {
    it('should track token usage per round', async () => {
      const { client } = mockLLMClient([{ ok: true, content: validDelimiterResponse }]);
      loop = new CodeGenerationLoop(client);

      const result = await loop.generate(sampleSpec, tempDir);

      expect(result.tokenUsage.length).toBeGreaterThan(0);
      expect(result.tokenUsage[0].totalTokens).toBeGreaterThan(0);
    }, 30_000);
  });

  describe('file writing', () => {
    it('should write generated files to disk', async () => {
      const { client } = mockLLMClient([{ ok: true, content: validDelimiterResponse }]);
      loop = new CodeGenerationLoop(client);

      await loop.generate(sampleSpec, tempDir);

      const files = fs.readdirSync(tempDir, { recursive: true });
      expect(files.length).toBeGreaterThan(0);
    }, 30_000);
  });
});
