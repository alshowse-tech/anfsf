/**
 * 性能优化器
 *
 * 层级：Layer 10 - Efficiency Layer
 * 功能：视频生成性能优化、缓存管理、批处理优化
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
import { VideoGenerationRequest, VideoGenerationResponse } from './comfyui-workflow-orchestrator';
/**
 * 性能指标
 */
export interface PerformanceMetrics {
    /** 平均响应时间 (ms) */
    avgResponseTimeMs: number;
    /** P95 响应时间 (ms) */
    p95ResponseTimeMs: number;
    /** P99 响应时间 (ms) */
    p99ResponseTimeMs: number;
    /** 成功率 */
    successRate: number;
    /** 每秒请求数 */
    requestsPerSecond: number;
    /** 缓存命中率 */
    cacheHitRate: number;
    /** 批处理效率提升 */
    batchEfficiencyGain: number;
}
/**
 * 缓存条目
 */
export interface CacheEntry<T> {
    /** 缓存键 */
    key: string;
    /** 缓存值 */
    value: T;
    /** 创建时间 */
    createdAt: number;
    /** 过期时间 */
    expiresAt: number;
    /** 访问次数 */
    accessCount: number;
}
/**
 * 优化配置
 */
export interface OptimizerConfig {
    /** 启用缓存 */
    enableCache: boolean;
    /** 缓存 TTL (秒) */
    cacheTTLSeconds: number;
    /** 最大缓存条目 */
    maxCacheEntries: number;
    /** 启用批处理 */
    enableBatching: boolean;
    /** 批处理窗口 (ms) */
    batchWindowMs: number;
    /** 最大批处理大小 */
    maxBatchSize: number;
    /** 启用预取 */
    enablePrefetch: boolean;
    /** 预取提前量 (秒) */
    prefetchAheadSeconds: number;
}
/**
 * 批处理请求
 */
export interface BatchRequest {
    /** 请求 ID 列表 */
    requestIds: string[];
    /** 请求列表 */
    requests: VideoGenerationRequest[];
    /** 批处理创建时间 */
    createdAt: number;
    /** 批处理状态 */
    status: 'pending' | 'processing' | 'completed';
}
/**
 * 性能优化器
 */
export declare class PerformanceOptimizer {
    private config;
    private cache;
    private batchQueue;
    private metrics;
    constructor(config?: Partial<OptimizerConfig>);
    /**
     * 检查缓存
     */
    checkCache(request: VideoGenerationRequest): VideoGenerationResponse | null;
    /**
     * 写入缓存
     */
    setCache(request: VideoGenerationRequest, response: VideoGenerationResponse): void;
    /**
     * 添加到批处理队列
     */
    addToBatch(request: VideoGenerationRequest, requestId: string): void;
    /**
     * 刷新批处理队列
     */
    private flushBatch;
    /**
     * 记录响应时间
     */
    recordResponseTime(responseTimeMs: number): void;
    /**
     * 获取性能指标
     */
    getMetrics(): PerformanceMetrics;
    /**
     * 清理缓存
     */
    clearCache(): void;
    /**
     * 获取缓存统计
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
    };
    /**
     * 预取数据
     */
    prefetch(requests: VideoGenerationRequest[]): void;
    /**
     * 淘汰缓存 (LRU 策略)
     */
    private evictCache;
}
export default PerformanceOptimizer;
