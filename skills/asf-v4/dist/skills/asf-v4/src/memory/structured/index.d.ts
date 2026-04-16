/**
 * ANFSF V1.5.0 - 层级记忆结构 (Wings + Rooms + Halls + Tunnels)
 * 借鉴 MemPalace 架构，实现本地知识图谱导航
 */
export interface WingConfig {
    type: 'project' | 'person' | 'topic';
    keywords: string[];
    rooms: string[];
}
export interface Wings {
    [key: string]: WingConfig;
}
export interface Halls {
    hall_facts: string[];
    hall_events: string[];
    hall_discoveries: string[];
    hall_preferences: string[];
    hall_advice: string[];
}
export interface TunnelConfig {
    from_wing: string;
    to_wing: string;
    room: string;
}
export interface Tunnels {
    [key: string]: TunnelConfig;
}
export interface MemoryStructure {
    wings: Wings;
    halls: Halls;
    tunnels: Tunnels;
    default_wing: string;
}
export declare const INITIAL_STRUCTURE: MemoryStructure;
export declare class KnowledgeGraph {
    private db;
    constructor(dbPath?: string);
    /**
     * 初始化数据库表
     */
    private init;
    /**
     * 添加三元组
     */
    addTriple(subject: string, predicate: string, object: string, valid_from: string, valid_to?: string): Promise<void>;
    /**
     * 查询实体（时间感知）
     */
    queryEntity(entity: string, as_of?: string): Promise<any[]>;
    /**
     * 查询关系
     */
    queryRelation(subject: string, predicate: string, as_of?: string): Promise<string[]>;
    /**
     * 生成时间线
     */
    timeline(entity: string): Promise<any[]>;
    /**
     * 废弃三元组
     */
    invalidateTriple(subject: string, predicate: string, object: string, ended: string): Promise<void>;
    /**
     * 关闭数据库连接
     */
    close(): Promise<void>;
}
export declare class MemoryStructureManager {
    private structure;
    private kg;
    constructor(structurePath?: string);
    /**
     * 添加 wing
     */
    addWing(wingId: string, type: 'project' | 'person' | 'topic', keywords: string[], rooms: string[]): Promise<void>;
    /**
     * 添加 tunnel
     */
    addTunnel(tunnelId: string, from_wing: string, to_wing: string, room: string): Promise<void>;
    /**
     * 添加 temporal triple
     */
    addFact(subject: string, predicate: string, object: string, valid_from: string): Promise<void>;
    /**
     * 查询当前facts
     */
    getCurrentFacts(entity: string): Promise<any[]>;
    /**
     * 废弃fact
     */
    retireFact(subject: string, predicate: string, object: string, ended: string): Promise<void>;
    /**
     * 获取结构快照
     */
    getSnapshot(): MemoryStructure;
    /**
     * 保存结构
     */
    save(): Promise<void>;
    /**
     * 加载结构
     */
    load(): Promise<void>;
    /**
     * 关闭所有资源
     */
    close(): Promise<void>;
}
export declare class MemoryNavigator {
    private structure;
    constructor(structure: MemoryStructure);
    /**
     * 通过关键词找到相关 wings
     */
    findRelevantWings(query: string): Promise<string[]>;
    /**
     * 在 wing 中查找相关 rooms
     */
    findRelevantRooms(wingId: string, query: string): Promise<string[]>;
    /**
     * 查找跨 wing 的 tunnels
     */
    findTunnels(room: string, fromWing: string): Promise<any[]>;
    /**
     * 全路径导航
     */
    navigate(query: string): Promise<any[]>;
}
/**
 * 使用示例:
 *
 * // 初始化
 * const manager = new MemoryStructureManager();
 *
 * // 添加项目 wing
 * await manager.addWing('wing_jieyue', 'project',
 *   ['jieyue', 'securities', ' financial'],
 *   ['auth', ' billing', '部署', ' optimization']);
 *
 * // 添加 temporal fact
 * await manager.addFact(
 *   '用户',
 *   '选择',
 *   'PostgreSQL',
 *   '2026-04-09'
 * );
 *
 * // 导航
 * const navigator = new MemoryNavigator(manager.getSnapshot());
 * const results = await navigator.navigate('PostgreSQL decision');
 *
 * // 清理
 * await manager.close();
 */
