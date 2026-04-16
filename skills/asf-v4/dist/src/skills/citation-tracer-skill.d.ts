/**
 * ANFSF V1.5.0 - Citation Tracer Skill (v2.0)
 *
 * 引用溯源系统 + 片段级引用 + 置信度评分
 * 注册到：Governance Harness
 * 能效比目标：2.4 倍 (与 HybridRetriever 共享)
 * 延迟增幅：+5-8ms
 */
import { Skill, SkillResult } from './base';
export interface CitationSource {
    documentId: string;
    fragmentId: string;
    content: string;
    startOffset: number;
    endOffset: number;
    metadata?: {
        author?: string;
        createdAt?: number;
        version?: string;
    };
}
export interface CitationContext {
    generatedText: string;
    sources: CitationSource[];
    minConfidence?: number;
}
export interface CitationResult extends SkillResult {
    citations: Array<{
        statement: string;
        sources: CitationSource[];
        confidence: number;
        verified: boolean;
    }>;
    unverifiedStatements: string[];
    overallConfidence: number;
}
export declare class CitationTracerSkill extends Skill {
    name: string;
    version: string;
    description: string;
    execute(ctx: CitationContext): Promise<CitationResult>;
    /**
     * Split text into statements.
     */
    private splitIntoStatements;
    /**
     * Find matching sources for a statement.
     */
    private findMatchingSources;
    /**
     * Calculate confidence score for a citation.
     */
    private calculateConfidence;
    /**
     * Get skill metadata.
     */
    getMetadata(): Record<string, any>;
}
export declare function registerCitationTracerSkill(registry: any): void;
export declare function createCitationTracerSkill(): CitationTracerSkill;
