/**
 * 视频生成技能 (Video Generation Skill)
 *
 * 层级：Layer 9 - Agent Operating System
 * 功能：视频生成执行、多 Agent 协同、任务编排
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
import { VideoGenerationRequest, VideoGenerationResponse, GovernanceConfig, SandboxConfig } from './comfyui-workflow-orchestrator';
/**
 * 视频生成任务
 */
export interface VideoGenerationTask {
    /** 任务 ID */
    id: string;
    /** 任务描述 */
    description: string;
    /** 优先级 (1-5, 5 最高) */
    priority: number;
    /** 生成请求 */
    request: VideoGenerationRequest;
    /** 客户端 ID */
    clientId: string;
    /** 创建时间 */
    createdAt: number;
    /** 截止时间 (可选) */
    deadline?: number;
    /** 重试次数 */
    retryCount: number;
    /** 最大重试次数 */
    maxRetries: number;
}
/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
/**
 * 任务执行结果
 */
export interface TaskExecutionResult {
    /** 任务 ID */
    taskId: string;
    /** 执行状态 */
    status: TaskStatus;
    /** 生成响应 */
    response?: VideoGenerationResponse;
    /** 错误信息 */
    error?: string;
    /** 执行耗时 (ms) */
    durationMs: number;
    /** 执行时间戳 */
    executedAt: number;
}
/**
 * Agent 通信消息
 */
export interface AgentMessage {
    /** 消息类型 */
    type: 'request' | 'response' | 'status' | 'error';
    /** 发送方 Agent */
    from: string;
    /** 接收方 Agent */
    to: string;
    /** 消息内容 */
    payload: any;
    /** 时间戳 */
    timestamp: number;
    /** 追踪 ID */
    traceId?: string;
}
/**
 * 视频生成技能 (Video Production Agent)
 */
export declare class VideoGenerationSkill {
    private orchestrator;
    private taskQueue;
    private runningTasks;
    private taskHistory;
    private maxConcurrentTasks;
    private currentRunningTasks;
    constructor(governanceConfig?: Partial<GovernanceConfig>, sandboxConfig?: Partial<SandboxConfig>);
    /**
     * 提交视频生成任务
     */
    submitTask(task: VideoGenerationTask): {
        success: boolean;
        taskId: string;
        message?: string;
    };
    /**
     * 处理任务队列
     */
    private processQueue;
    /**
     * 执行单个任务
     */
    private executeTask;
    /**
     * 通知相关 Agent
     */
    private notifyAgents;
    /**
     * 获取任务状态
     */
    getTaskStatus(taskId: string): TaskExecutionResult | undefined;
    /**
     * 获取队列状态
     */
    getQueueStatus(): {
        pendingTasks: number;
        runningTasks: number;
        maxConcurrentTasks: number;
    };
    /**
     * 取消任务
     */
    cancelTask(taskId: string): {
        success: boolean;
        message: string;
    };
    /**
     * 获取使用统计
     */
    getUsageStats(): {
        totalTasks: number;
        completedTasks: number;
        failedTasks: number;
        pendingTasks: number;
        averageDurationMs: number;
        successRate: number;
    };
    /**
     * 获取 Orchestrator 使用统计
     */
    getOrchestratorStats(): {
        dailyQuotaUsed: number;
        dailyQuotaRemaining: number;
        requestCount: number;
    };
    /**
     * 清空历史记录 (保留最近 N 条)
     */
    clearHistory(keepLast?: number): void;
}
export default VideoGenerationSkill;
