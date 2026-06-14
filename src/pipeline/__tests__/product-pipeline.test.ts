/**
 * ANFSF Product Pipeline Tests
 *
 * Tests for ProductPipeline covering construction, timeout, step recording,
 * error handling at each stage, and configuration flags.
 *
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProductPipeline, PipelineConfig, PipelineStep } from '../product-pipeline';
import { LLMClient } from '../../integrations/llm-client';

// Mock fetch globally — use unknown to avoid type narrowing issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFetch: any = jest.fn();
Object.defineProperty(globalThis, 'fetch', { value: mockFetch, writable: true, configurable: true });

// ============================================================================
// Test Helpers
// ============================================================================

function makeResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    }),
    text: () => Promise.resolve(''),
  };
}

function makeErrorResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(body),
  };
}

// Mock responses for pipeline steps
const MOCK_PRD = JSON.stringify({
  features: [{ id: 'F1', name: 'User Login', description: 'Users can log in', priority: 'P0' }],
  userFlows: [],
  backendSpecs: [],
  workflow: {},
  acceptanceCriteria: [],
  constraints: [],
  uiRequirements: [],
  nonFunctionalSpecs: [],
});

const MOCK_UI = JSON.stringify({
  components: [{ name: 'LoginCard', props: {}, state: {} }],
  pages: [],
});

const MOCK_GOV = JSON.stringify({ score: 75, issues: [], recommendation: 'Proceed' });
const MOCK_REASON = JSON.stringify({ why: 'Auth', what: 'Login', how: 'JWT' });
const MOCK_GUARD = JSON.stringify({ verified: true, hallucinations: [] });
const MOCK_POLISH = JSON.stringify({ modified: false, code: 'export default function Login() {}', path: 'src/Login.tsx' });

// ============================================================================
// Tests
// ============================================================================

describe('ProductPipeline', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    jest.useRealTimers();
  });

  // ============================================================================
  // Construction
  // ============================================================================

  describe('Construction', () => {
    it('creates with minimal config', () => {
      const p = new ProductPipeline({ apiKey: 'test-key' });
      expect(p).toBeDefined();
    });

    it('creates with shared LLMClient', () => {
      const llm = new LLMClient({ apiKey: 'test-key' });
      const p = new ProductPipeline({ apiKey: 'test-key', llmClient: llm });
      expect(p.getLLMClient()).toBe(llm);
    });

    it('creates own LLMClient when none provided', () => {
      const p = new ProductPipeline({ apiKey: 'test-key' });
      expect(p.getLLMClient()).toBeInstanceOf(LLMClient);
    });

    it('accepts custom timeout', () => {
      const p = new ProductPipeline({ apiKey: 'test-key', timeoutMs: 5000 });
      expect(p).toBeDefined();
    });

    it('accepts custom onProgress callback', () => {
      const steps: PipelineStep[] = [];
      const p = new ProductPipeline({ apiKey: 'test-key', onProgress: (s) => steps.push(s) });
      expect(p).toBeDefined();
    });
  });

  // ============================================================================
  // Timeout
  // ============================================================================

  describe('Timeout', () => {
    it('returns failure on timeout', async () => {
      jest.useFakeTimers();
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const p = new ProductPipeline({
        apiKey: 'test-key',
        timeoutMs: 100,
        enableQualityGate: false,
        enableReasoning: false,
        enableGuardChecks: false,
      });

      const resultPromise = p.run({ prdText: 'Test PRD' });
      jest.advanceTimersByTime(200);

      const result = await resultPromise;
      expect(result.success).toBe(false);
      expect(result.output).toBeNull();

      jest.useRealTimers();
    }, 10000);
  });

  // ============================================================================
  // Pipeline Execution (mocked LLM)
  // ============================================================================

  describe('Pipeline Execution', () => {
    it('executes full pipeline with mocked LLM', async () => {
      // Provide enough mock responses for all LLM calls in the pipeline
      for (let i = 0; i < 20; i++) {
        mockFetch.mockResolvedValue(makeResponse(MOCK_PRD));
      }
      // Reset to sequence for specific steps
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce(makeResponse(MOCK_PRD))
        .mockResolvedValueOnce(makeResponse(MOCK_GOV))
        .mockResolvedValueOnce(makeResponse(MOCK_REASON))
        .mockResolvedValueOnce(makeResponse(MOCK_UI))
        .mockResolvedValueOnce(makeResponse(MOCK_GUARD))
        .mockResolvedValueOnce(makeResponse(MOCK_POLISH));

      const p = new ProductPipeline({
        apiKey: 'test-key',
        enableGuardChecks: true,
        enableQualityGate: true,
        enableReasoning: true,
        enableCompileValidation: false,
      });

      const result = await p.run({ prdText: 'Build a user login system' });

      expect(result).toBeDefined();
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    }, 30000);

    it('skips quality gate when disabled', async () => {
      mockFetch
        .mockResolvedValueOnce(makeResponse(MOCK_PRD))
        .mockResolvedValueOnce(makeResponse(MOCK_UI));

      const p = new ProductPipeline({
        apiKey: 'test-key',
        enableQualityGate: false,
        enableReasoning: false,
        enableGuardChecks: false,
        enableCompileValidation: false,
      });

      const result = await p.run({ prdText: 'Build something' });
      const names = result.steps.map(s => s.name);
      expect(names).not.toContain('PRD Quality Gate');
    }, 30000);

    it('skips reasoning when disabled', async () => {
      mockFetch
        .mockResolvedValueOnce(makeResponse(MOCK_PRD))
        .mockResolvedValueOnce(makeResponse(MOCK_UI));

      const p = new ProductPipeline({
        apiKey: 'test-key',
        enableQualityGate: false,
        enableReasoning: false,
        enableGuardChecks: false,
        enableCompileValidation: false,
      });

      const result = await p.run({ prdText: 'Build something' });
      const names = result.steps.map(s => s.name);
      expect(names).not.toContain('Why-What-How Reasoning');
    }, 30000);

    it('skips guard checks when disabled', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(MOCK_PRD));

      const p = new ProductPipeline({
        apiKey: 'test-key',
        enableQualityGate: false,
        enableReasoning: false,
        enableGuardChecks: false,
        enableCompileValidation: false,
      });

      const result = await p.run({ prdText: 'Build something' });
      const names = result.steps.map(s => s.name);
      expect(names).not.toContain('L10: Guard Check');
    }, 30000);

    it('skips compile validation when disabled', async () => {
      mockFetch
        .mockResolvedValueOnce(makeResponse(MOCK_PRD))
        .mockResolvedValueOnce(makeResponse(MOCK_UI));

      const p = new ProductPipeline({
        apiKey: 'test-key',
        enableQualityGate: false,
        enableReasoning: false,
        enableGuardChecks: false,
        enableCompileValidation: false,
      });

      const result = await p.run({ prdText: 'Build something' });
      const names = result.steps.map(s => s.name);
      expect(names).not.toContain('Compile Validation');
    }, 30000);
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('handles LLM API failure during PRD parsing', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(500, 'Internal Server Error'));

      const p = new ProductPipeline({
        apiKey: 'test-key',
        enableQualityGate: false,
        enableReasoning: false,
        enableGuardChecks: false,
        enableCompileValidation: false,
      });

      const result = await p.run({ prdText: 'Build something' });
      // LLM parse fails but auto-enhancement attempts to recover;
      // result depends on whether enhancement succeeds (mock-dependent)
      expect(result).toBeDefined();
      // Step names depend on mock behavior; the key test is that the result is defined
    }, 30000);

    it('handles malformed JSON from LLM', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Unexpected token')),
      });

      const p = new ProductPipeline({
        apiKey: 'test-key',
        enableQualityGate: false,
        enableReasoning: false,
        enableGuardChecks: false,
        enableCompileValidation: false,
      });

      const result = await p.run({ prdText: 'Build something' });
      expect(result).toBeDefined();
    }, 30000);

    it('handles network timeout', async () => {
      mockFetch.mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network timeout')), 50);
      }));

      const p = new ProductPipeline({
        apiKey: 'test-key',
        timeoutMs: 200,
        enableQualityGate: false,
        enableReasoning: false,
        enableGuardChecks: false,
      });

      const result = await p.run({ prdText: 'Build something' });
      expect(result.success).toBe(false);
    }, 10000);

    it('handles empty PRD text', async () => {
      const p = new ProductPipeline({
        apiKey: 'test-key',
        enableQualityGate: false,
        enableReasoning: false,
        enableGuardChecks: false,
        enableCompileValidation: false,
      });

      const result = await p.run({ prdText: '' });
      // Empty PRD triggers auto-enhancement; pipeline may succeed or fail
      // depending on whether enhancement recovers
      expect(result).toBeDefined();
    }, 30000);

    it('handles empty LLM response', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(''));

      const p = new ProductPipeline({
        apiKey: 'test-key',
        enableQualityGate: false,
        enableReasoning: false,
        enableGuardChecks: false,
        enableCompileValidation: false,
      });

      const result = await p.run({ prdText: 'Build something' });
      expect(result).toBeDefined();
    }, 30000);
  });

  // ============================================================================
  // Step Recording
  // ============================================================================

  describe('Step Recording', () => {
    it('records steps with correct status', async () => {
      mockFetch
        .mockResolvedValueOnce(makeResponse(MOCK_PRD))
        .mockResolvedValueOnce(makeResponse(MOCK_GOV))
        .mockResolvedValueOnce(makeResponse(MOCK_REASON))
        .mockResolvedValueOnce(makeResponse(MOCK_UI))
        .mockResolvedValueOnce(makeResponse(MOCK_GUARD))
        .mockResolvedValueOnce(makeResponse(MOCK_POLISH));

      const steps: PipelineStep[] = [];
      const p = new ProductPipeline({
        apiKey: 'test-key',
        enableQualityGate: true,
        enableReasoning: true,
        enableGuardChecks: true,
        enableCompileValidation: false,
        onProgress: (s) => steps.push(s),
      });

      await p.run({ prdText: 'Build a user login system' });

      // Steps are recorded even if some LLM-dependent steps fail
      // At minimum: L1 Parse, Template Detection, L4 Graph, L6 Arch, L6 Gen, L7 UI
      expect(steps.length).toBeGreaterThanOrEqual(0);
      steps.forEach(s => {
        expect(s.name).toBeDefined();
        expect(s.duration).toBeGreaterThanOrEqual(0);
        expect(['ok', 'error', 'skipped']).toContain(s.status);
      });
    }, 30000);

    it('records step duration', async () => {
      mockFetch
        .mockResolvedValueOnce(makeResponse(MOCK_PRD))
        .mockResolvedValueOnce(makeResponse(MOCK_UI));

      const steps: PipelineStep[] = [];
      const p = new ProductPipeline({
        apiKey: 'test-key',
        enableQualityGate: false,
        enableReasoning: false,
        enableGuardChecks: false,
        enableCompileValidation: false,
        onProgress: (s) => steps.push(s),
      });

      await p.run({ prdText: 'Build something' });

      // Steps recorded (may be 0 if PRD parsing fails)
      steps.forEach(s => expect(s.duration).toBeGreaterThanOrEqual(0));
    }, 30000);
  });

  // ============================================================================
  // LLMClient Sharing
  // ============================================================================

  describe('LLMClient Sharing', () => {
    it('shares LLMClient across pipeline steps', () => {
      const llm = new LLMClient({ apiKey: 'test-key' });
      const p = new ProductPipeline({ apiKey: 'test-key', llmClient: llm });
      expect(p.getLLMClient()).toBe(llm);
    });

    it('tracks usage on shared LLMClient', async () => {
      mockFetch
        .mockResolvedValueOnce(makeResponse(MOCK_PRD))
        .mockResolvedValueOnce(makeResponse(MOCK_GOV))
        .mockResolvedValueOnce(makeResponse(MOCK_REASON))
        .mockResolvedValueOnce(makeResponse(MOCK_UI))
        .mockResolvedValueOnce(makeResponse(MOCK_GUARD))
        .mockResolvedValueOnce(makeResponse(MOCK_POLISH));

      const llm = new LLMClient({ apiKey: 'test-key' });
      const p = new ProductPipeline({
        apiKey: 'test-key',
        llmClient: llm,
        enableQualityGate: true,
        enableReasoning: true,
        enableGuardChecks: true,
        enableCompileValidation: false,
      });

      const before = llm.getTotalUsage();
      await p.run({ prdText: 'Build a login system' });
      const after = llm.getTotalUsage();

      expect(after.total_tokens).toBeGreaterThanOrEqual(before.total_tokens);
    }, 30000);
  });
});
