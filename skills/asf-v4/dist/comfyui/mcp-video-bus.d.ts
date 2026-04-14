/**
 * MCP 视频生成总线
 *
 * 层级：Layer 8.5 - Governance Control Plane
 * 功能：视频生成任务的 MCP 通信、全链路追踪、幂等键管理
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
import { VideoGenerationRequest, VideoGenerationResponse } from './comfyui-workflow-orchestrator';
/**
 * MCP 消息类型
 */
export type MCPMessageType = 'video.generate.request' | 'video.generate.response' | 'video.generate.progress' | 'video.generate.error' | 'video.quality.check.request' | 'video.quality.check.response' | 'video.deploy.request' | 'video.deploy.response';
/**
 * MCP 消息头
 */
export interface MCPMessageHeaders {
    /** 追踪 ID */
    traceId: string;
    /** 幂等键 */
    idempotencyKey: string;
    /** 消息类型 */
    type: MCPMessageType;
    /** 发送方 */
    from: string;
    /** 接收方 */
    to: string;
    /** 时间戳 */
    timestamp: number;
    /** TTL (秒) */
    ttlSeconds: number;
    /** 过期时间 */
    expiresAt: number;
}
/**
 * MCP 消息体
 */
export interface MCPMessageBody<T = any> {
    /** 请求/响应数据 */
    data: T;
    /** 元数据 */
    metadata?: {
        projectId?: string;
        taskId?: string;
        priority?: number;
        tags?: string[];
    };
}
/**
 * MCP 消息
 */
export interface MCPMessage<T = any> {
    /** 消息头 */
    headers: MCPMessageHeaders;
    /** 消息体 */
    body: MCPMessageBody<T>;
}
/**
 * MCP 消息处理结果
 */
export interface MCPMessageResult {
    /** 处理状态 */
    status: 'success' | 'failed' | 'pending';
    /** 消息 ID */
    messageId: string;
    /** 处理耗时 (ms) */
    durationMs?: number;
    /** 错误信息 */
    error?: string;
}
/**
 * MCP 总线配置
 */
export interface MCPBusConfig {
    /** 默认 TTL (秒) */
    defaultTTLSeconds: number;
    /** 消息重试次数 */
    maxRetries: number;
    /** 重试间隔 (ms) */
    retryIntervalMs: number;
    /** 启用追踪 */
    enableTracing: boolean;
    /** 启用幂等性检查 */
    enableIdempotency: boolean;
}
/**
 * MCP 视频生成总线
 */
export declare class MCPVideoBus {
    private config;
    private messageQueue;
    private idempotencyCache;
    private traceStore;
    private listeners;
    constructor(config?: Partial<MCPBusConfig>);
    /**
     * 发送消息
     */
    send<T>(message: MCPMessage<T>): Promise<MCPMessageResult>;
    /**
     * 创建视频生成请求消息
     */
    createGenerateRequest(request: VideoGenerationRequest, from: string, to: string): MCPMessage<VideoGenerationRequest>;
    /**
     * 创建视频生成响应消息
     */
    createGenerateResponse(response: VideoGenerationResponse, traceId: string, from: string, to: string): MCPMessage<VideoGenerationResponse>;
    /**
     * 创建质量检查请求消息
     */
    createQualityCheckRequest(response: VideoGenerationResponse, from: string, to: string): MCPMessage<VideoGenerationResponse>;
    /**
     * 创建部署请求消息
     */
    createDeployRequest(videoPath: string, qualityScore: number, from: string, to: string): MCPMessage<{
        videoPath: string;
        qualityScore: number;
    }>;
    /**
     * 注册消息监听器
     */
    on(messageType: MCPMessageType, handler: (message: MCPMessage) => void): void;
    /**
     * 获取追踪信息
     */
    getTrace(traceId: string): MCPMessage[] | undefined;
    /**
     * 获取队列状态
     */
    getQueueStatus(): {
        totalMessages: number;
        tracesCount: number;
        idempotencyCacheSize: number;
    };
    /**
     * 清理过期缓存
     */
    cleanupExpiredCache(): number;
    /**
     * 存储追踪信息
     */
    private storeTrace;
    /**
     * 添加到队列
     */
    private enqueue;
    /**
     * 通知监听器
     */
    private notifyListeners;
}
export default MCPVideoBus;
