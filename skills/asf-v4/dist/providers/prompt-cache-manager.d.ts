/**
 * Prompt 缓存管理器
 *
 * 层级：Layer 10 - Efficiency Layer
 * 功能：Prompt 缓存管理、缓存策略、成本优化
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
/**
 * 缓存条目
 */
export interface CacheEntry {
    /** 缓存键 (prompt hash) */
    key: string;
    /** 原始 prompt */
    prompt: string;
    /** 缓存响应 */
    response: any;
    /** 创建时间 */
    createdAt: number;
    /** 过期时间 */
    expiresAt: number;
    /** 访问次数 */
    accessCount: number;
    /** 缓存命中次数 */
    hitCount: number;
    /** 模型 ID */
    modelId: string;
    /** Token 数 */
    tokenCount: number;
}
/**
 * 缓存配置
 */
export interface PromptCacheConfig {
    /** 启用缓存 */
    enabled: boolean;
    /** 缓存策略 */
    strategy: 'aggressive' | 'conservative' | 'adaptive';
    /** 缓存 TTL (秒) */
    ttlSeconds: number;
    /** 最大缓存条目 */
    maxEntries: number;
    /** 缓存读取成本 */
    cacheReadCost: number;
    /** 缓存写入成本 */
    cacheWriteCost: number;
    /** 最小缓存 prompt 长度 */
    minPromptLength: number;
    /** 缓存前缀 (用于分类) */
    cachePrefix?: string;
}
/**
 * 缓存统计
 */
export interface CacheStats {
    /** 总条目数 */
    totalEntries: number;
    /** 总请求数 */
    totalRequests: number;
    /** 命中次数 */
    hits: number;
    /** 未命中次数 */
    misses: number;
    /** 命中率 */
    hitRate: number;
    /** 节省 Token 数 */
    tokensSaved: number;
    /** 节省成本 */
    costSaved: number;
    /** 平均响应时间减少 (ms) */
    avgLatencyReductionMs: number;
}
/**
 * 缓存策略配置
 */
export interface CacheStrategyConfig {
    /** Aggressive: 缓存所有 prompt */
    aggressive: {
        minPromptLength: number;
        ttlSeconds: number;
    };
    /** Conservative: 只缓存长 prompt */
    conservative: {
        minPromptLength: number;
        ttlSeconds: number;
    };
    /** Adaptive: 根据命中率动态调整 */
    adaptive: {
        minPromptLength: number;
        ttlSeconds: number;
        targetHitRate: number;
        adjustmentIntervalMs: number;
    };
}
/**
 * Prompt 缓存管理器
 */
export declare class PromptCacheManager {
    private config;
    private cache;
    private stats;
    private lastAdjustmentTime;
    constructor(config?: Partial<PromptCacheConfig>);
    /**
     * 检查缓存
     */
    check(prompt: string, modelId: string): CacheEntry | null;
    /**
     * 写入缓存
     */
    set(prompt: string, modelId: string, response: any, tokenCount: number): void;
    /**
     * 获取缓存统计
     */
    getStats(): CacheStats;
    /**
     * 清除缓存
     */
    clear(): void;
    /**
     * 清除过期条目
     */
    cleanupExpired(): number;
    /**
     * 自适应调整策略
     */
    adjustStrategy(): void;
    /**
     * 导出缓存
     */
    exportCache(): CacheEntry[];
    /**
     * 导入缓存
     */
    importCache(entries: CacheEntry[]): void;
    /**
     * 淘汰缓存 (LRU 策略)
     */
    private evictCache;
}
export default PromptCacheManager;
