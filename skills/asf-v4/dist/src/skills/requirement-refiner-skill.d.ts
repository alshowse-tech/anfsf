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
    nodes: Array<{
        id: string;
        type: string;
        content: string;
    }>;
    edges: Array<{
        from: string;
        to: string;
        type: string;
    }>;
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
export declare class RequirementRefinerSkill extends Skill {
    name: string;
    version: string;
    description: string;
    private memorySkill;
    private contextCompressor;
    private hybridRetriever;
    private hallucinationGuard;
    private evolutionHarness;
    private kpiDashboard;
    private readonly IMPROVEMENT_THRESHOLD;
    constructor(memorySkill: MemoryConsolidationSkill, contextCompressor: ContextCompressorSkill, hybridRetriever: HybridRetrieverSkill, hallucinationGuard: HallucinationGuardSkill, evolutionHarness: EvolutionHarness, kpiDashboard: KPIDashboard);
    /**
     * Execute requirement refinement with A/B self-validation.
     */
    execute(ctx: RequirementRefinerContext): Promise<RequirementRefinerResult>;
    /**
     * Run two-source context (history + current).
     */
    private runTwoSource;
    /**
     * Run baseline one-source context (current only).
     */
    private runBaselineOneSource;
    /**
     * Calculate improvement between two-source and baseline.
     */
    private calculateImprovement;
    /**
     * Build Requirement Graph from verified statements.
     */
    private buildGraph;
    /**
     * Generate trace ID.
     */
    private generateTraceId;
    /**
     * Get skill metadata.
     */
    getMetadata(): Record<string, any>;
}
/**
 * Create Requirement Refiner Skill.
 */
export declare function createRequirementRefinerSkill(memorySkill: MemoryConsolidationSkill, contextCompressor: ContextCompressorSkill, hybridRetriever: HybridRetrieverSkill, hallucinationGuard: HallucinationGuardSkill, evolutionHarness: EvolutionHarness, kpiDashboard: KPIDashboard): RequirementRefinerSkill;
