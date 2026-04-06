/**
 * ANFSF V1.5.0 - External Review Agent Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ExternalReviewAgent, createExternalReviewAgent } from '../external-review-agent';

describe('ExternalReviewAgent Tests', () => {
  let agent: ExternalReviewAgent;

  beforeEach(() => {
    agent = createExternalReviewAgent();
  });

  afterEach(async () => {
    await agent.destroy();
  });

  describe('review', () => {
    it('should review code and return result', async () => {
      const payload = {
        generatedCode: 'function test() { return 42; }',
        requirementGraph: { nodes: [], edges: [] },
        traceId: 'test-trace-1',
        timestamp: Date.now(),
      };

      const result = await agent.review(payload);

      expect(result).toBeDefined();
      expect(result.traceId).toBe(payload.traceId);
      expect(result.passed).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should veto code with critical issues', async () => {
      const payload = {
        generatedCode: 'function test() { unknown_api(); not_defined(); }',
        requirementGraph: { nodes: [], edges: [] },
        traceId: 'test-trace-2',
        timestamp: Date.now(),
      };

      const result = await agent.review(payload);

      // Should have low hallucination score
      expect(result.hasVeto).toBe(true);
      expect(result.passed).toBe(false);
    });

    it('should record KPI to database', async () => {
      const payload = {
        generatedCode: 'function test() { return 42; }',
        requirementGraph: { nodes: [], edges: [] },
        traceId: 'test-trace-3',
        timestamp: Date.now(),
      };

      await agent.review(payload);

      // Verify KPI was recorded
      const kpis = await agent.getRecentKPIs(10);
      expect(kpis.length).toBeGreaterThan(0);
    });

    it('should handle long code files', async () => {
      const longCode = Array(600).fill('// line').join('\n');
      const payload = {
        generatedCode: longCode,
        requirementGraph: { nodes: [], edges: [] },
        traceId: 'test-trace-4',
        timestamp: Date.now(),
      };

      const result = await agent.review(payload);

      expect(result.issues).toContain('Code file too long (>500 lines)');
    });

    it('should handle code with many TODOs', async () => {
      const codeWithTodos = Array(10).fill('// TODO: fix this').join('\n');
      const payload = {
        generatedCode: codeWithTodos,
        requirementGraph: { nodes: [], edges: [] },
        traceId: 'test-trace-5',
        timestamp: Date.now(),
      };

      const result = await agent.review(payload);

      expect(result.issues).toContain('Too many TODO/FIXME comments (10)');
    });

    it('should pass clean code', async () => {
      const cleanCode = `
        function calculateSum(a: number, b: number): number {
          return a + b;
        }
        
        export { calculateSum };
      `;

      const payload = {
        generatedCode: cleanCode,
        requirementGraph: { nodes: [{ id: 'n1', type: 'requirement', content: 'calculate sum' }], edges: [] },
        traceId: 'test-trace-6',
        timestamp: Date.now(),
      };

      const result = await agent.review(payload);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('getRecentKPIs', () => {
    it('should return recent KPI metrics', async () => {
      // First, add some KPIs
      await agent.review({
        generatedCode: 'function test() {}',
        requirementGraph: { nodes: [], edges: [] },
        traceId: 'kpi-test-1',
        timestamp: Date.now(),
      });

      const kpis = await agent.getRecentKPIs(10);

      expect(kpis.length).toBeGreaterThan(0);
      expect(kpis[0]).toHaveProperty('trace_id');
      expect(kpis[0]).toHaveProperty('score');
      expect(kpis[0]).toHaveProperty('has_veto');
      expect(kpis[0]).toHaveProperty('latency_ms');
    });

    it('should respect limit parameter', async () => {
      const kpis = await agent.getRecentKPIs(5);
      expect(kpis.length).toBeLessThanOrEqual(5);
    });
  });

  describe('computeFinalScore', () => {
    it('should compute score correctly', async () => {
      // This is tested indirectly through review()
      const payload = {
        generatedCode: 'function test() { return 42; }',
        requirementGraph: { nodes: [], edges: [] },
        traceId: 'score-test-1',
        timestamp: Date.now(),
      };

      const result = await agent.review(payload);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe('checkVetoConditions', () => {
    it('should veto on hallucination', async () => {
      const payload = {
        generatedCode: 'function test() { unknown_api(); }',
        requirementGraph: { nodes: [], edges: [] },
        traceId: 'veto-test-1',
        timestamp: Date.now(),
      };

      const result = await agent.review(payload);

      expect(result.hasVeto).toBe(true);
    });
  });
});
