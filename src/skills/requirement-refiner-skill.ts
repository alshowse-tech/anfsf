/**
 * ANFSF V1.5.0 - Requirement Refiner Skill
 * 
 * Core skill for refining simple requirements into complete, validated Requirement Graphs.
 * Implements two-source context (history + current) with A/B self-validation.
 */

import { Skill, SkillResult } from './base';
import { MemoryConsolidationSkill } from './memory-consolidation-skill';
import { ContextCompressorSkill } from './context-compressor-skill';
import { HybridRetrieverSkill } from './hybrid-retriever-skill';
import { HallucinationGuardSkill } from './hallucination-guard-skill';
import { EvolutionHarness } from '../harness/evolution-harness';
import { KPIDashboard } from '../harness/kpi-dashboard';

export interface RefinedGraph {
  nodes: Array<{ id: string; type: string; content: string }>;
  edges: Array<{ from: string; to: string; type: string }>;
  quality: number;
  completeness: number;
  traceId: string;
}

export interface RequirementRefinerContext {
  rawRequirement: string;
  enableTwoSource: boolean;
  enableABValidation: boolean;
}

export interface RequirementRefinerResult extends SkillResult {
  graph: RefinedGraph;
  improvement: number;
  usedBaseline: boolean;
  traceId: string;
}

/**
 * Requirement Refiner Skill - refines simple requirements into complete graphs.
 */
export class RequirementRefinerSkill extends Skill {
  name = 'requirement-refiner';
  version = '1.0.0';
  description = '需求精炼 Skill - 将简单需求转换为完整、验证的需求图谱';

  private memorySkill: MemoryConsolidationSkill;
  private contextCompressor: ContextCompressorSkill;
  private hybridRetriever: HybridRetrieverSkill;
  private hallucinationGuard: HallucinationGuardSkill;
  private evolutionHarness: EvolutionHarness;
  private kpiDashboard: KPIDashboard;

  private readonly IMPROVEMENT_THRESHOLD = 0.15; // 15% 收益阈值

  constructor(
    memorySkill: MemoryConsolidationSkill,
    contextCompressor: ContextCompressorSkill,
    hybridRetriever: HybridRetrieverSkill,
    hallucinationGuard: HallucinationGuardSkill,
    evolutionHarness: EvolutionHarness,
    kpiDashboard: KPIDashboard
  ) {
    super();
    this.memorySkill = memorySkill;
    this.contextCompressor = contextCompressor;
    this.hybridRetriever = hybridRetriever;
    this.hallucinationGuard = hallucinationGuard;
    this.evolutionHarness = evolutionHarness;
    this.kpiDashboard = kpiDashboard;
  }

  /**
   * Execute requirement refinement with A/B self-validation.
   */
  async execute(ctx: RequirementRefinerContext): Promise<RequirementRefinerResult> {
    const traceId = this.generateTraceId();

    // Run two-source refinement (history + current)
    const twoSourceResult = await this.runTwoSource(ctx.rawRequirement, traceId);

    let usedBaseline = false;
    let improvement = 0;

    // A/B self-validation (if enabled)
    if (ctx.enableABValidation) {
      const baselineResult = await this.runBaselineOneSource(ctx.rawRequirement, traceId);
      improvement = this.calculateImprovement(twoSourceResult, baselineResult);

      // Record to KPI Dashboard
      await this.kpiDashboard.record('twoSourceImprovement', improvement);

      // Rollback if improvement < 15%
      if (improvement < this.IMPROVEMENT_THRESHOLD) {
        await this.evolutionHarness.rollbackToBaseline();
        usedBaseline = true;
      }
    }

    return {
      graph: usedBaseline ? await this.runBaselineOneSource(ctx.rawRequirement, traceId) : twoSourceResult,
      improvement,
      usedBaseline,
      traceId,
    };
  }

  /**
   * Run two-source context (history + current).
   */
  private async runTwoSource(rawRequirement: string, traceId: string): Promise<RefinedGraph> {
    // 1. Retrieve internal history from memory
    const memoryContext = await this.memorySkill.retrieve({
      query: rawRequirement,
      maxResults: 5,
    });

    // 2. Compress current requirement
    const currentContext = await this.contextCompressor.execute({
      rawTokens: rawRequirement.split(' '),
      tokenCount: rawRequirement.split(' ').length,
      tokenBudget: 10000,
      performanceMode: 'balanced',
      taskType: 'document',
    });

    // 3. Combine contexts
    const combinedContext = [
      ...memoryContext.results.map(r => r.memory.content),
      ...currentContext.compressedTokens,
    ].join(' ');

    // 4. RAG hybrid retrieval + validation
    const ragResult = await this.hybridRetriever.execute({
      query: combinedContext,
      documents: [],
      mode: 'hybrid',
      maxResults: 10,
    });

    // 5. Hallucination guard verification
    const verification = await this.hallucinationGuard.execute({
      generatedText: rawRequirement,
      sources: ragResult.results.map(r => ({
        id: r.document.id,
        content: r.document.content,
        type: 'document',
        reliability: 0.9,
      })),
      mode: 'standard',
      enableGraphValidation: true,
    });

    // 6. Build Requirement Graph
    return this.buildGraph(rawRequirement, verification.verifiedStatements, traceId);
  }

  /**
   * Run baseline one-source context (current only).
   */
  private async runBaselineOneSource(rawRequirement: string, traceId: string): Promise<RefinedGraph> {
    // Compress current requirement only (no history)
    const currentContext = await this.contextCompressor.execute({
      rawTokens: rawRequirement.split(' '),
      tokenCount: rawRequirement.split(' ').length,
      tokenBudget: 10000,
      performanceMode: 'balanced',
      taskType: 'document',
    });

    // Build graph from current context only
    return this.buildGraph(rawRequirement, currentContext.compressedTokens, traceId);
  }

  /**
   * Calculate improvement between two-source and baseline.
   */
  private calculateImprovement(twoSource: RefinedGraph, baseline: RefinedGraph): number {
    const completenessDelta = twoSource.completeness - baseline.completeness;
    const qualityDelta = twoSource.quality - baseline.quality;
    const nodeDelta = (twoSource.nodes.length - baseline.nodes.length) / Math.max(1, baseline.nodes.length);

    return (completenessDelta + qualityDelta + nodeDelta) / 3;
  }

  /**
   * Build Requirement Graph from verified statements.
   */
  private buildGraph(rawRequirement: string, verifiedStatements: string[], traceId: string): RefinedGraph {
    // Simple graph construction (in production, use Role Synthesizer)
    const nodes = verifiedStatements.map((stmt, idx) => ({
      id: `node-${idx}`,
      type: 'requirement',
      content: stmt,
    }));

    const edges = nodes.slice(1).map((node, idx) => ({
      from: nodes[idx].id,
      to: node.id,
      type: 'depends_on',
    }));

    return {
      nodes,
      edges,
      quality: 0.9,
      completeness: nodes.length / Math.max(1, verifiedStatements.length),
      traceId,
    };
  }

  /**
   * Generate trace ID.
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get skill metadata.
   */
  getMetadata(): Record<string, any> {
    return {
      name: this.name,
      version: this.version,
      improvementThreshold: this.IMPROVEMENT_THRESHOLD,
      abValidationEnabled: true,
    };
  }
}

/**
 * Create Requirement Refiner Skill.
 */
export function createRequirementRefinerSkill(
  memorySkill: MemoryConsolidationSkill,
  contextCompressor: ContextCompressorSkill,
  hybridRetriever: HybridRetrieverSkill,
  hallucinationGuard: HallucinationGuardSkill,
  evolutionHarness: EvolutionHarness,
  kpiDashboard: KPIDashboard
): RequirementRefinerSkill {
  return new RequirementRefinerSkill(
    memorySkill,
    contextCompressor,
    hybridRetriever,
    hallucinationGuard,
    evolutionHarness,
    kpiDashboard
  );
}
