/**
 * 金丝雀部署器
 *
 * 层级：Layer 8.5 - Governance Control Plane
 * 功能：视频生成技能的渐进式部署、流量切换、自动回滚
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
import { MCPVideoBus } from './mcp-video-bus';
import { ConfigManager } from './governance-config-store';
/**
 * 部署阶段
 */
export type CanaryStage = 0.01 | 0.05 | 0.2 | 0.5 | 1.0;
/**
 * 部署状态
 */
export type DeployStatus = 'pending' | 'deploying' | 'monitoring' | 'completed' | 'rolled_back' | 'failed';
/**
 * 部署配置
 */
export interface CanaryDeployConfig {
    /** 部署阶段流量比例 */
    stages: CanaryStage[];
    /** 每阶段观察时间 (分钟) */
    stageDurationMinutes: number;
    /** 成功率阈值 */
    successRateThreshold: number;
    /** 平均延迟阈值 (ms) */
    avgLatencyThresholdMs: number;
    /** 错误率阈值 */
    errorRateThreshold: number;
    /** 自动回滚启用 */
    autoRollbackEnabled: boolean;
}
/**
 * 部署指标
 */
export interface DeployMetrics {
    /** 总请求数 */
    totalRequests: number;
    /** 成功请求数 */
    successfulRequests: number;
    /** 失败请求数 */
    failedRequests: number;
    /** 平均延迟 (ms) */
    avgLatencyMs: number;
    /** P95 延迟 (ms) */
    p95LatencyMs: number;
    /** P99 延迟 (ms) */
    p99LatencyMs: number;
    /** 成功率 */
    successRate: number;
    /** 错误率 */
    errorRate: number;
}
/**
 * 部署会话
 */
export interface DeploySession {
    /** 会话 ID */
    id: string;
    /** 技能版本 */
    version: string;
    /** 当前阶段 */
    currentStage: CanaryStage;
    /** 部署状态 */
    status: DeployStatus;
    /** 开始时间 */
    startedAt: number;
    /** 阶段开始时间 */
    stageStartedAt: number;
    /** 阶段指标 */
    stageMetrics: DeployMetrics;
    /** 累计指标 */
    cumulativeMetrics: DeployMetrics;
    /** 回滚原因 */
    rollbackReason?: string;
}
/**
 * 部署结果
 */
export interface DeployResult {
    /** 部署状态 */
    status: DeployStatus;
    /** 最终阶段 */
    finalStage: CanaryStage;
    /** 部署耗时 (分钟) */
    durationMinutes: number;
    /** 最终指标 */
    finalMetrics: DeployMetrics;
    /** 回滚原因 (如果有) */
    rollbackReason?: string;
}
/**
 * 金丝雀部署器
 */
export declare class CanaryDeployer {
    private config;
    private mcpBus;
    private configManager;
    private activeSession;
    private trafficRouter;
    constructor(config: Partial<CanaryDeployConfig> | undefined, mcpBus: MCPVideoBus, configManager: ConfigManager);
    /**
     * 开始部署
     */
    startDeploy(version: string): Promise<DeploySession>;
    /**
     * 记录请求指标
     */
    recordRequest(isSuccess: boolean, latencyMs: number): void;
    /**
     * 获取当前流量分配
     */
    getTrafficAllocation(clientId: string): number;
    /**
     * 应该使用金丝雀版本吗
     */
    shouldUseCanary(clientId: string): boolean;
    /**
     * 获取部署状态
     */
    getDeployStatus(): DeploySession | null;
    /**
     * 手动推进到下一阶段
     */
    advanceStage(): Promise<void>;
    /**
     * 执行回滚
     */
    rollback(reason: string): Promise<void>;
    /**
     * 完成部署
     */
    completeDeploy(): Promise<DeployResult>;
    private createEmptyMetrics;
    private updateLatencyMetrics;
    private checkStageProgress;
    private hashClientId;
    private notifyDeployStart;
    private notifyStageAdvance;
    private notifyRollback;
    private notifyDeployComplete;
}
export default CanaryDeployer;
