/**
 * ANFSF V1.5.0 - Requirement Refiner Skill Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { RequirementRefinerSkill } from '../requirement-refiner-skill';
import { MemoryConsolidationSkill } from '../memory-consolidation-skill';
import { ContextCompressorSkill } from '../context-compressor-skill';
import { HybridRetrieverSkill } from '../hybrid-retriever-skill';
import { HallucinationGuardSkill } from '../hallucination-guard-skill';
import { EvolutionHarness } from '../../harness/evolution-harness';
import { KPIDashboard } from '../../harness/kpi-dashboard';

describe('RequirementRefinerSkill Tests', () => {
  let skill: RequirementRefinerSkill;
  let memorySkill: MemoryConsolidationSkill;
  let contextCompressor: ContextCompressorSkill;
  let hybridRetriever: HybridRetrieverSkill;
  let hallucinationGuard: HallucinationGuardSkill;
  let evolutionHarness: EvolutionHarness;
  let kpiDashboard: KPIDashboard;

  beforeEach(() => {
    memorySkill = new MemoryConsolidationSkill();
    contextCompressor = new ContextCompressorSkill();
    hybridRetriever = new HybridRetrieverSkill();
    hallucinationGuard = new HallucinationGuardSkill();
    evolutionHarness = new EvolutionHarness();
    kpiDashboard = new KPIDashboard();

    skill = new RequirementRefinerSkill(
      memorySkill,
      contextCompressor,
      hybridRetriever,
      hallucinationGuard,
      evolutionHarness,
      kpiDashboard
    );
  });

  describe('execute', () => {
    it('should refine simple requirement with two-source context', async () => {
      const ctx = {
        rawRequirement: '开发一个 AI 辅助的近视防控管理系统',
        enableTwoSource: true,
        enableABValidation: true,
      };

      const result = await skill.execute(ctx);

      expect(result.graph).toBeDefined();
      expect(result.graph.nodes.length).toBeGreaterThan(0);
      expect(result.traceId).toBeDefined();
    });

    it('should perform A/B self-validation when enabled', async () => {
      const ctx = {
        rawRequirement: '开发一个证券信息系统',
        enableTwoSource: true,
        enableABValidation: true,
      };

      const result = await skill.execute(ctx);

      expect(result.improvement).toBeDefined();
      // Improvement can be negative (two-source worse than baseline)
      expect(result.usedBaseline).toBeDefined();
    });

    it('should rollback to baseline when improvement < 15%', async () => {
      const ctx = {
        rawRequirement: '简单需求',
        enableTwoSource: true,
        enableABValidation: true,
      };

      const result = await skill.execute(ctx);

      // If improvement < 0.15, should use baseline
      if (result.improvement < 0.15) {
        expect(result.usedBaseline).toBe(true);
      }
    });

    it('should record twoSourceImprovement to KPI Dashboard', async () => {
      const ctx = {
        rawRequirement: '测试需求',
        enableTwoSource: true,
        enableABValidation: true,
      };

      await skill.execute(ctx);

      const metrics = kpiDashboard.getCurrentMetrics();
      expect(metrics).toBeDefined();
    });

    it('should work with two-source disabled', async () => {
      const ctx = {
        rawRequirement: '简单需求',
        enableTwoSource: false,
        enableABValidation: false,
      };

      const result = await skill.execute(ctx);

      expect(result.graph).toBeDefined();
      expect(result.usedBaseline).toBe(false);
    });
  });

  describe('runTwoSource', () => {
    it('should combine history and current context', async () => {
      const rawRequirement = '开发一个电商系统';
      const traceId = 'test-trace';

      // Access private method via typed cast for testing
      const typed = skill as unknown as { runTwoSource(req: string, trace: string): Promise<{ nodes: unknown[]; edges: unknown[] }> };
      const twoSourceResult = await typed.runTwoSource(rawRequirement, traceId);

      expect(twoSourceResult).toBeDefined();
      expect(twoSourceResult.nodes).toBeDefined();
      expect(twoSourceResult.edges).toBeDefined();
    });
  });

  describe('runBaselineOneSource', () => {
    it('should use current context only', async () => {
      const rawRequirement = '开发一个博客系统';
      const traceId = 'test-trace';

      const typed2 = skill as unknown as { runBaselineOneSource(req: string, trace: string): Promise<{ nodes: unknown[] }> };
      const baselineResult = await typed2.runBaselineOneSource(rawRequirement, traceId);

      expect(baselineResult).toBeDefined();
      expect(baselineResult.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('calculateImprovement', () => {
    it('should calculate improvement between two-source and baseline', () => {
      const twoSource = {
        nodes: Array(10).fill({ id: 'n1', type: 'requirement', content: 'test' }),
        edges: Array(9).fill({ from: 'n1', to: 'n2', type: 'depends_on' }),
        quality: 0.9,
        completeness: 0.95,
        traceId: 'trace1',
      };

      const baseline = {
        nodes: Array(7).fill({ id: 'n1', type: 'requirement', content: 'test' }),
        edges: Array(6).fill({ from: 'n1', to: 'n2', type: 'depends_on' }),
        quality: 0.8,
        completeness: 0.85,
        traceId: 'trace2',
      };

      const typed3 = skill as unknown as { calculateImprovement(a: object, b: object): number };
      const improvement = typed3.calculateImprovement(twoSource, baseline);

      expect(improvement).toBeGreaterThan(0);
      expect(improvement).toBeLessThanOrEqual(1);
    });

    it('should return negative improvement when two-source is worse', () => {
      const twoSource = {
        nodes: Array(5).fill({ id: 'n1', type: 'requirement', content: 'test' }),
        edges: Array(4).fill({ from: 'n1', to: 'n2', type: 'depends_on' }),
        quality: 0.7,
        completeness: 0.75,
        traceId: 'trace1',
      };

      const baseline = {
        nodes: Array(10).fill({ id: 'n1', type: 'requirement', content: 'test' }),
        edges: Array(9).fill({ from: 'n1', to: 'n2', type: 'depends_on' }),
        quality: 0.9,
        completeness: 0.95,
        traceId: 'trace2',
      };

      const typed3 = skill as unknown as { calculateImprovement(a: object, b: object): number };
      const improvement = typed3.calculateImprovement(twoSource, baseline);

      expect(improvement).toBeLessThan(0);
    });
  });

  describe('buildGraph', () => {
    it('should build Requirement Graph from verified statements', () => {
      const rawRequirement = '测试需求';
      const verifiedStatements = ['需求 1', '需求 2', '需求 3'];
      const traceId = 'test-trace';

      const typed4 = skill as unknown as { buildGraph(req: string, stmts: string[], trace: string): { nodes: unknown[]; edges: unknown[]; quality: number; traceId: string } };
      const graph = typed4.buildGraph(rawRequirement, verifiedStatements, traceId);

      expect(graph.nodes.length).toBe(3);
      expect(graph.edges.length).toBe(2);
      expect(graph.quality).toBe(0.9);
      expect(graph.traceId).toBe(traceId);
    });

    it('should handle empty verified statements', () => {
      const rawRequirement = '测试需求';
      const verifiedStatements: string[] = [];
      const traceId = 'test-trace';

      const typed4 = skill as unknown as { buildGraph(req: string, stmts: string[], trace: string): { nodes: unknown[]; edges: unknown[]; quality: number; traceId: string } };
      const graph = typed4.buildGraph(rawRequirement, verifiedStatements, traceId);

      expect(graph.nodes.length).toBe(0);
      expect(graph.edges.length).toBe(0);
    });
  });

  describe('getMetadata', () => {
    it('should return skill metadata', () => {
      const metadata = skill.getMetadata();

      expect(metadata.name).toBe('requirement-refiner');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.improvementThreshold).toBe(0.20); // Updated threshold
      expect(metadata.abValidationEnabled).toBe(true);
    });
  });
});
