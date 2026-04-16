/**
 * ANFSF V1.5.0 - Hallucination Guard Skill (v2.0)
 *
 * 幻觉检测系统 + 自洽性检查 + Graph 验证 + 事实核查
 * 注册到：Governance Harness
 * 能效比目标：2.4 倍 (与 RAG 共享)
 * 延迟增幅：+8-12ms
 */
import { Skill, SkillResult } from './base';
export interface VerificationSource {
    id: string;
    content: string;
    type: 'document' | 'database' | 'graph_node' | 'external_api';
    reliability?: number;
}
export interface VerificationContext {
    generatedText: string;
    sources: VerificationSource[];
    mode: 'fast' | 'standard' | 'thorough';
    enableGraphValidation?: boolean;
}
export interface VerificationResult extends SkillResult {
    passed: boolean;
    hallucinations: Array<{
        statement: string;
        type: 'unsupported' | 'contradictory' | 'fabricated';
        confidence: number;
        suggestion?: string;
    }>;
    verifiedStatements: string[];
    overallConfidence: number;
    graphValidation?: {
        passed: boolean;
        validatedNodes: number[];
        conflictingNodes: number[];
    };
}
export declare class HallucinationGuardSkill extends Skill {
    name: string;
    version: string;
    description: string;
    private graphRAG;
    constructor();
    execute(ctx: VerificationContext): Promise<VerificationResult>;
    /**
     * Split text into statements.
     */
    private splitIntoStatements;
    /**
     * Check self-consistency by generating variants.
     */
    private checkSelfConsistency;
    /**
     * Check if statements are grounded in sources.
     */
    private checkSourceGrounding;
    /**
     * Validate statements with GraphRAG.
     */
    private validateWithGraphRAG;
    /**
     * Simulate graph validation (fallback).
     */
    private simulateGraphValidation;
    /**
     * Classify hallucination type.
     */
    private classifyHallucination;
    /**
     * Simulate semantic similarity.
     */
    private simulateSemanticSimilarity;
    /**
     * Get skill metadata.
     */
    getMetadata(): Record<string, any>;
}
export declare function registerHallucinationGuardSkill(registry: any): void;
export declare function createHallucinationGuardSkill(): HallucinationGuardSkill;
