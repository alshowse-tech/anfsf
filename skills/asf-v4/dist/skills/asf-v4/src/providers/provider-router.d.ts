/**
 * Provider 路由管理器
 *
 * 层级：Layer 8.5 - Governance Control Plane
 * 功能：多 Provider 路由、故障切换、负载均衡
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
/**
 * Provider 配置
 */
export interface ProviderConfig {
    /** Provider ID */
    id: string;
    /** Provider 名称 */
    name: string;
    /** Base URL */
    baseUrl: string;
    /** API 类型 */
    api: string;
    /** 优先级 (1-10, 1 最高) */
    priority: number;
    /** 权重 (用于负载均衡) */
    weight: number;
    /** 超时时间 (ms) */
    timeoutMs: number;
    /** 最大重试次数 */
    maxRetries: number;
    /** 是否启用 */
    enabled: boolean;
    /** 健康检查配置 */
    healthCheck: {
        enabled: boolean;
        intervalMs: number;
        timeoutMs: number;
    };
}
/**
 * Provider 健康状态
 */
export interface ProviderHealthStatus {
    /** Provider ID */
    providerId: string;
    /** 是否健康 */
    healthy: boolean;
    /** 最后检查时间 */
    lastCheckAt: number;
    /** 连续失败次数 */
    consecutiveFailures: number;
    /** 平均响应时间 (ms) */
    avgResponseTimeMs: number;
    /** 成功率 */
    successRate: number;
}
/**
 * 路由策略
 */
export type RoutingStrategy = 'priority' | 'round_robin' | 'weighted' | 'latency' | 'cost_optimized';
/**
 * 路由配置
 */
export interface RouterConfig {
    /** 路由策略 */
    strategy: RoutingStrategy;
    /** Fallback 链 */
    fallbackChain: string[];
    /** 最大重试次数 */
    maxRetries: number;
    /** 超时时间 (ms) */
    timeoutMs: number;
    /** 启用健康检查 */
    enableHealthCheck: boolean;
    /** 健康检查间隔 (ms) */
    healthCheckIntervalMs: number;
    /** 自动剔除不健康 Provider */
    autoExcludeUnhealthy: boolean;
    /** 剔除时长 (ms) */
    excludeDurationMs: number;
}
/**
 * 路由结果
 */
export interface RoutingResult {
    /** 选中的 Provider */
    selectedProvider: string;
    /** 选择原因 */
    reason: string;
    /** 备选 Provider */
    alternatives: string[];
    /** 路由耗时 (ms) */
    routingTimeMs: number;
}
/**
 * Provider 路由管理器
 */
export declare class ProviderRouter {
    private config;
    private providers;
    private healthStatus;
    private roundRobinIndex;
    private lastHealthCheckTime;
    constructor(config?: Partial<RouterConfig>);
    /**
     * 注册 Provider
     */
    registerProvider(provider: ProviderConfig): void;
    /**
     * 选择 Provider
     */
    selectProvider(modelPreference?: string): RoutingResult;
    /**
     * 记录 Provider 请求结果
     */
    recordResult(providerId: string, success: boolean, responseTimeMs: number): void;
    /**
     * 获取 Provider 健康状态
     */
    getHealthStatus(providerId: string): ProviderHealthStatus | undefined;
    /**
     * 获取所有 Provider 状态
     */
    getAllHealthStatus(): ProviderHealthStatus[];
    /**
     * 手动恢复 Provider
     */
    recoverProvider(providerId: string): void;
    /**
     * 获取路由统计
     */
    getStats(): {
        totalProviders: number;
        healthyProviders: number;
        unhealthyProviders: number;
        avgSuccessRate: number;
        avgResponseTimeMs: number;
    };
    /**
     * 获取可用的 Provider 列表
     */
    private getAvailableProviders;
    /**
     * 按优先级选择
     */
    private selectByPriority;
    /**
     * 轮询选择
     */
    private selectRoundRobin;
    /**
     * 加权选择
     */
    private selectWeighted;
    /**
     * 按延迟选择
     */
    private selectByLatency;
    /**
     * 按成本选择 (模拟)
     */
    private selectByCost;
}
export default ProviderRouter;
