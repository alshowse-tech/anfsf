/**
 * ANFSF V1.5.0 - Hybrid Retriever Skill (v2.0)
 *
 * 混合检索引擎 (BM25 + 向量 + 图) + Reciprocal Rank Fusion
 * 注册到：Governance Harness
 * 能效比目标：2.4 倍
 * 延迟增幅：+8-15ms
 */
import { Skill, SkillResult } from './base';
export interface Document {
    id: string;
    content: string;
    metadata?: Record<string, any>;
    embeddings?: number[];
}
export interface RetrievalContext {
    query: string;
    documents: Document[];
    mode: 'sparse_only' | 'hybrid' | 'full';
    maxResults?: number;
}
export interface RetrievalResult extends SkillResult {
    results: Array<{
        document: Document;
        score: number;
        sources: {
            bm25?: number;
            vector?: number;
            graph?: number;
        };
    }>;
    fusionMethod: 'RRF' | 'weighted';
    totalCandidates: number;
}
export declare class HybridRetrieverSkill extends Skill {
    name: string;
    version: string;
    description: string;
    execute(ctx: RetrievalContext): Promise<RetrievalResult>;
    /**
     * Run retrieval for a specific method.
     */
    private runRetrieval;
    /**
     * BM25 retrieval (keyword-based) with caching.
     */
    private bm25Retrieval;
    /**
     * Vector retrieval (embedding-based).
     */
    private vectorRetrieval;
    /**
     * Graph retrieval (relationship-based).
     */
    private graphRetrieval;
    /**
     * Reciprocal Rank Fusion (RRF) for combining multiple retrieval results.
     */
    private reciprocalRankFusion;
    /**
     * Get skill metadata.
     */
    getMetadata(): Record<string, any>;
}
export declare function registerHybridRetrieverSkill(registry: any): void;
export declare function createHybridRetrieverSkill(): HybridRetrieverSkill;
