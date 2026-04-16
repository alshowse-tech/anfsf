/**
 * ANFSF V1.5.0 - Memory Consolidation Skill (v2.0)
 *
 * 永久记忆巩固引擎 + 多权重检索 + Graph-Driven 遗忘机制
 * 注册到：Evolution Harness
 * 能效比目标：3.8 倍
 * 延迟增幅：+10-15ms
 */
import { Skill, SkillResult } from './base';
export interface MemoryData {
    id: string;
    content: string;
    taskId?: string;
    taskOutcome?: {
        impactScore: number;
        success: boolean;
    };
    accessCount: number;
    createdAt: number;
    lastAccessedAt: number;
    connectedMemories: string[];
    metadata?: Record<string, any>;
}
export interface ConsolidationContext {
    memories: MemoryData[];
    storageType: 'short' | 'long' | 'cold';
    enableRLFeedback: boolean;
    enableUserFeedback: boolean;
}
export interface RetrievalContext {
    query: string;
    filters?: {
        timeRange?: [number, number];
        importanceRange?: [number, number];
        taskTypes?: string[];
    };
    maxResults?: number;
}
export interface ConsolidationResult extends SkillResult {
    consolidatedMemories: MemoryData[];
    prunedMemories: MemoryData[];
    importanceScores: Record<string, number>;
    halfLives: Record<string, number>;
}
export interface RetrievalResult extends SkillResult {
    results: Array<{
        memory: MemoryData;
        score: number;
        breakdown: {
            semantic: number;
            temporal: number;
            importance: number;
            frequency: number;
            rl: number;
            user: number;
        };
    }>;
    totalCandidates: number;
}
export declare class MemoryConsolidationSkill extends Skill {
    name: string;
    version: string;
    description: string;
    private memories;
    private importanceCache;
    private projectData;
    execute(ctx: ConsolidationContext): Promise<ConsolidationResult>;
    /**
     * Retrieve memories with multi-weight scoring.
     */
    retrieve(ctx: RetrievalContext): Promise<RetrievalResult>;
    /**
     * Calculate importance score for a memory.
     */
    private calculateImportance;
    /**
     * Calculate half-life based on importance.
     */
    private calculateHalfLife;
    /**
     * Determine if memory should be consolidated.
     */
    private shouldConsolidate;
    /**
     * Determine if memory should be pruned.
     */
    private shouldPrune;
    /**
     * Calculate retrieval scores with multi-weight breakdown.
     */
    private calculateRetrievalScores;
    /**
     * Simulate semantic similarity (placeholder for actual embedding model).
     */
    private simulateSemanticSimilarity;
    /**
     * Get RL reward for memory (placeholder for actual RL model).
     */
    private getRLReward;
    /**
     * Get user feedback for memory (placeholder for actual feedback system).
     */
    private getUserFeedback;
    /**
     * Add memory to storage.
     */
    addMemory(memory: MemoryData): void;
    /**
     * Collect project data (for Evolution Harness).
     */
    collectProjectData(data: any): void;
    /**
     * Get skill metadata.
     */
    getMetadata(): Record<string, any>;
}
export declare function registerMemoryConsolidationSkill(registry: any): void;
export declare function createMemoryConsolidationSkill(): MemoryConsolidationSkill;
