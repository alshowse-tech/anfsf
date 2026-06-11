/**
 * Tests for Skeleton Generator (T-104)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { SkeletonGenerator } from '../skeleton-generator';
import { LLMClient } from '../../integrations/llm-client';
import { TokenBudget } from '../token-budget';
import type { RequirementSpec } from '../../agents/code-generation-loop';

const VALID_RESPONSE = [
  '===FILE: package.json',
  '{"name":"test","version":"1.0.0"}',
  '===END===',
  '',
  '===FILE: src/index.ts',
  '// [generated]\nconsole.log("hello");',
  '===END===',
].join('\n');

function mockClient() {
  const client = new LLMClient({ apiKey: 'sk-test' });
  client.chat = async () => ({
    ok: true, status: 200,
    content: VALID_RESPONSE,
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  });
  return client;
}

const sampleSpec: RequirementSpec = {
  intent: 'Task management app',
  features: [{ id: 'f1', name: 'Tasks', description: 'Manage tasks', priority: 'P0' }],
};

describe('SkeletonGenerator', () => {
  let generator: SkeletonGenerator;
  let tempDir: string;

  beforeEach(() => {
    generator = new SkeletonGenerator(mockClient());
    tempDir = path.join(os.tmpdir(), `anfsf-sk-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('should generate skeleton code', async () => {
    const result = await generator.generate({
      projectId: 'test-proj',
      spec: sampleSpec,
      outputDir: tempDir,
      deploymentForm: 'web',
      stage: 'stage1_generating',
    });

    expect(result.code.files.length).toBeGreaterThan(0);
    expect(result.rounds).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('should write files to disk', async () => {
    await generator.generate({
      projectId: 'test-proj',
      spec: sampleSpec,
      outputDir: tempDir,
      deploymentForm: 'web',
      stage: 'stage1_generating',
    });

    const files = fs.readdirSync(tempDir, { recursive: true });
    expect(files.length).toBeGreaterThan(0);
  }, 30_000);

  it('should inject deployment form into spec', async () => {
    const result = await generator.generate({
      projectId: 'test-proj',
      spec: sampleSpec,
      outputDir: tempDir,
      deploymentForm: 'h5',
      stage: 'stage1_generating',
    });

    expect(result.message).toBeDefined();
  }, 30_000);

  it('should track token usage when budget configured', async () => {
    const budget = new TokenBudget('test-proj');
    const gen = new SkeletonGenerator(mockClient(), budget);

    await gen.generate({
      projectId: 'test-proj',
      spec: sampleSpec,
      outputDir: tempDir,
      deploymentForm: 'web',
      stage: 'stage1_generating',
    });

    const report = budget.getReport();
    expect(report.used).toBeGreaterThan(0);
  }, 30_000);

  it('should return failure when LLM fails', async () => {
    const client = new LLMClient({ apiKey: 'sk-test' });
    client.chat = async () => ({ ok: false, status: 500, content: '', error: 'Down', usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } });
    const gen = new SkeletonGenerator(client);

    const result = await gen.generate({
      projectId: 'test-proj',
      spec: sampleSpec,
      outputDir: tempDir,
      deploymentForm: 'web',
      stage: 'stage1_generating',
    });

    expect(result.success).toBe(false);
  });
});
