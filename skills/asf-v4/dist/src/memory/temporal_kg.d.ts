/**
 * ANFSF V1.5.0 - 时间感知知识图谱
 * 实现 Temporal Triples，支持历史查询和时间线生成
 */
export interface TemporalTriple {
    id?: number;
    subject: string;
    predicate: string;
    object: string;
    valid_from: string;
    valid_to?: string;
    created_at: string;
}
export interface TemporalQuery {
    subject?: string;
    predicate?: string;
    object?: string;
    as_of?: string;
}
/**
 * 时间感知知识图谱
 */
export declare class TemporalKnowledgeGraph {
    private triples;
    /**
     * 添加三元组
     */
    addTriple(subject: string, predicate: string, object: string, valid_from: string, valid_to?: string): Promise<void>;
    /**
     * 生成键
     */
    private generateKey;
    /**
     * 查询实体（时间感知）
     */
    queryEntity(entity: string, as_of?: string): Promise<TemporalTriple[]>;
    /**
     * 检查三元组在指定时间点是否有效
     */
    private isActive;
    /**
     * 查询关系
     */
    queryRelation(subject: string, predicate: string, as_of?: string): Promise<string[]>;
    /**
     * 查询所有谓词
     */
    queryPredicates(subject: string, as_of?: string): Promise<string[]>;
    /**
     * 生成时间线
     */
    timeline(entity: string): Promise<TemporalTriple[]>;
    /**
     * 废弃三元组
     */
    invalidateTriple(subject: string, predicate: string, object: string, ended: string): Promise<void>;
    /**
     * 查询当前有效事实
     */
    getFacts(subject: string): Promise<TemporalTriple[]>;
    /**
     * 清理过期三元组
     */
    cleanup(): Promise<void>;
    /**
     * 获取统计信息
     */
    stats(): Promise<{
        totalTriples: number;
        activeTriples: number;
        subjects: number;
        predicates: number;
    }>;
    /**
     * 转储为 JSON
     */
    dump(): Promise<TemporalTriple[]>;
}
/**
 * 使用示例:
 *
 * // 初始化
 * const kg = new TemporalKnowledgeGraph();
 *
 * // 添加事实
 * await kg.addTriple(
 *   '用户',
 *   '选择',
 *   'PostgreSQL',
 *   '2026-04-09T10:00:00Z'
 * );
 *
 * // 添加过期事实
 * await kg.addTriple(
 *   '用户',
 *   '居住',
 *   '北京',
 *   '2025-01-01T00:00:00Z',
 *   '2026-03-31T23:59:59Z'
 * );
 *
 * // 查询当前事实
 * const facts = await kg.getFacts('用户');
 *
 * // 查询历史事实
 * const factsInJan = await kg.queryEntity('用户', '2026-01-15T12:00:00Z');
 *
 * // 查询关系
 * const cities = await kg.queryRelation('用户', '居住', '2026-01-15');
 *
 * // 废弃事实
 * await kg.invalidateTriple('用户', '居住', '北京', '2026-04-01T00:00:00Z');
 *
 * // 生成时间线
 * const timeline = await kg.timeline('用户');
 *
 * // 获取统计
 * const stats = await kg.stats();
 *
 * console.log(stats);
 */
