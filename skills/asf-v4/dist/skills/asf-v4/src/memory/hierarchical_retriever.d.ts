/**
 * ANFSF V1.5.0 - 层级记忆检索器
 * 结合 Wings + Rooms + TemporalKG + Embedding
 */
import { MemoryStructureManager } from './structured';
export interface QueryContext {
    text: string;
    wing_filter?: string;
    room_filter?: string;
    as_of?: string;
}
export interface SearchResult {
    id: string;
    content: string;
    score: number;
    wing: string;
    room: string;
    timestamp: string;
}
export interface SearchOptions {
    topK?: number;
    minScore?: number;
    includeTemporal?: boolean;
}
export declare class HierarchicalMemoryRetriever {
    private结构: MemoryStructureManager;
    private embedder;
    private db;
    private temporalKG;
    private useLocalEmbedder;
    constructor();
    /**
     * 初始化
     */
    initialize(): Promise<void>;
    /**
     * 存储记忆
     */
    store(content: string, wing: string, room: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * 搜索记忆
     */
    search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * 获取内容（模拟）
     */
    private getContent;
    /**
     * 层级导航搜索
     */
    navigateSearch(query: string, wing: string, room: string): Promise<SearchResult[]>;
    /**
     * 时间感知搜索
     */
    temporalSearch(query: string, as_of: string): Promise<SearchResult[]>;
    /**
     * 获取统计
     */
    stats(): Promise<{
        totalMemories: number;
        wings: number;
        rooms: number;
        tempFacts: number;
    }>;
    /**
     * 计算向量相似度
     */
    cosineSimilarity(a: number[], b: number[]): number;
    /**
     * 关闭资源
     */
    close(): Promise<void>;
}
declare module './local_embedder' {
    interface SimpleVectorDB {
        size(): number;
    }
}
/**
 * // 初始化检索器
 * const retriever = new HierarchicalMemoryRetriever();
 * await retriever.initialize();
 *
 * // 存储记忆
 * await retriever.store(
 *   '用户决定使用 PostgreSQL 而不是 SQLite',
 *   'wing_postgres_project',
 *   'hall_facts',
 *   { type: 'decision', priority: 'high' }
 * );
 *
 * // 搜索
 * const results = await retriever.search('database decision', {
 *   topK: 5,
 *   minScore: 0.7
 * });
 *
 * // 层级导航搜索
 * const wingResults = await retriever.navigateSearch(
 *   'database decision',
 *   'wing_postgres_project',
 *   'hall_facts'
 * );
 *
 * // 时间感知搜索
 * const historyResults = await retriever.temporalSearch(
 *   'database decision',
 *   '2026-04-09T12:00:00Z'
 * );
 *
 * // 获取统计
 * const stats = await retriever.stats();
 *
 * // 清理
 * await retriever.close();
 */
