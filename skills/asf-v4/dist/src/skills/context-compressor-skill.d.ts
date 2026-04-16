/**
 * ANFSF V1.5.0 - Context Compressor Skill (v2.0)
 *
 * 超长上下文分层压缩 + 4-bit 量化 + 稀疏注意力路由
 * 注册到：Orchestration Harness
 * 能效比目标：5,200 倍
 * 延迟增幅：+5-10ms
 */
import { Skill, SkillResult } from './base';
export interface PriorityRules {
    keep: string[];
    drop: string[];
}
export interface CompressedContext {
    tokens: string[];
    tokenCount: number;
    compressionRatio: number;
    truncated: boolean;
    droppedSections: string[];
}
export interface CompressionContext {
    rawTokens: string[];
    tokenCount: number;
    tokenBudget: number;
    performanceMode: 'fast' | 'balanced' | 'deep';
    taskType: 'code' | 'document' | 'conversation';
}
export interface CompressionStrategy {
    compressionLevel: number;
    attentionType: 'full' | 'sparse' | 'quantized';
    layers: {
        L1: number;
        L2: number;
        L3: number;
    };
}
export interface CompressionResult extends SkillResult {
    compressedTokens: string[];
    compressionRatio: number;
    strategy: CompressionStrategy;
    estimatedOps: number;
}
export declare class ContextCompressorSkill extends Skill {
    name: string;
    version: string;
    description: string;
    private quantizer;
    constructor();
    execute(ctx: CompressionContext): Promise<CompressionResult>;
    /**
     * Select compression strategy based on token count, budget, and performance mode.
     */
    private selectStrategy;
    /**
     * Apply 4-bit quantization to tokens.
     */
    private apply4BitQuantization;
    /**
     * Simulate quantization (fallback).
     */
    private simulateQuantization;
    /**
     * Compress tokens hierarchically (L1 + L2 + L3).
     */
    private compressHierarchical;
    /**
     * Generate semantic summary for L2 layer.
     */
    private generateSemanticSummary;
    /**
     * Build graph index for L3 layer.
     */
    private buildGraphIndex;
    /**
     * Calculate estimated operations based on attention type.
     */
    private calculateOps;
    /**
     * Token 超限解决方案 - 为自升级场景定制压缩
     * 解决 HTTP 400: InternalError.Algo.InvalidParameter - Range of input length should be [1, 196601]
     */
    compressForUpgrade(rawInput: string): Promise<CompressedContext>;
    /**
     * 估算 token 数量 (简化算法: 1 token ≈ 4 chars)
     */
    private estimateTokens;
    /**
     * 按优先级裁剪输入内容
     */
    private truncateByPriority;
    /**
     * 获取区域优先级
     */
    private getPriority;
    /**
     * Get skill metadata.
     */
    getMetadata(): Record<string, any>;
}
export declare function registerContextCompressorSkill(registry: any): void;
export declare function createContextCompressorSkill(): ContextCompressorSkill;
