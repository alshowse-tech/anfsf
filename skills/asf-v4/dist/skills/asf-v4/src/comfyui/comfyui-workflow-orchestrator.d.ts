/**
 * ComfyUI 工作流编排器
 *
 * 层级：Layer 6 - System Architecture Layer
 * 功能：ComfyUI 工作流编排、视频生成管道、多媒体资产管理
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
/**
 * 视频生成请求参数
 */
export interface VideoGenerationRequest {
    /** 生成提示词 */
    prompt: string;
    /** 参考图片路径 (可选) */
    image?: string;
    /** 参考图片数组 (可选，最多 5 张) */
    images?: string[];
    /** 参考视频路径 (可选) */
    video?: string;
    /** 参考视频数组 (可选，最多 4 个) */
    videos?: string[];
    /** 目标时长 (秒) */
    durationSeconds?: number;
    /** 分辨率 (480P|720P|1080P) */
    resolution?: '480P' | '720P' | '1080P';
    /** 宽高比 */
    aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
    /** 尺寸 (如 1280x720) */
    size?: string;
    /** 模型 override */
    model?: string;
    /** 是否启用音频 */
    audio?: boolean;
    /** 是否添加水印 */
    watermark?: boolean;
    /** 输出文件名 */
    filename?: string;
}
/**
 * 视频生成响应
 */
export interface VideoGenerationResponse {
    /** 生成状态 */
    status: 'success' | 'failed' | 'pending';
    /** 视频路径 (成功时) */
    videoPath?: string;
    /** 错误信息 (失败时) */
    error?: string;
    /** 生成耗时 (ms) */
    durationMs?: number;
    /** 成本估算 (USD) */
    costEstimate?: number;
    /** 质量评分 (0-1) */
    qualityScore?: number;
    /** 元数据 */
    metadata?: {
        model: string;
        resolution: string;
        duration: number;
        aspectRatio: string;
    };
}
/**
 * 治理门禁配置
 */
export interface GovernanceConfig {
    /** 最大时长 (秒) */
    maxDurationSeconds: number;
    /** 最大分辨率 */
    maxResolution: '480P' | '720P' | '1080P';
    /** 最大生成时间 (秒) */
    maxGenerationTimeSeconds: number;
    /** 最小质量评分 */
    minQualityScore: number;
    /** 单次成本预算 (USD) */
    maxCostPerRequest: number;
    /** 每分钟请求限制 */
    requestsPerMinute: number;
    /** 每日配额 */
    dailyQuota: number;
}
/**
 * 沙箱配置
 */
export interface SandboxConfig {
    /** 内存限制 (MB) */
    memoryLimitMB: number;
    /** 超时时间 (秒) */
    timeoutSeconds: number;
    /** GPU 隔离 */
    gpuIsolated: boolean;
    /** 允许的 API */
    allowedApis: string[];
    /** 禁止的 API */
    deniedApis: string[];
}
/**
 * ComfyUI 工作流编排器
 */
export declare class ComfyUIWorkflowOrchestrator {
    private governanceConfig;
    private sandboxConfig;
    private requestCount;
    private dailyQuotaUsed;
    private lastResetTime;
    constructor(governanceConfig?: Partial<GovernanceConfig>, sandboxConfig?: Partial<SandboxConfig>);
    /**
     * 验证生成请求
     */
    validateRequest(request: VideoGenerationRequest): {
        valid: boolean;
        errors: string[];
    };
    /**
     * 检查速率限制
     */
    checkRateLimit(clientId: string): {
        allowed: boolean;
        reason?: string;
    };
    /**
     * 估算成本
     */
    estimateCost(request: VideoGenerationRequest): number;
    /**
     * 执行视频生成
     */
    generateVideo(request: VideoGenerationRequest, clientId?: string): Promise<VideoGenerationResponse>;
    /**
     * 获取使用统计
     */
    getUsageStats(): {
        dailyQuotaUsed: number;
        dailyQuotaRemaining: number;
        requestCount: number;
    };
    /**
     * 重置配额 (管理员操作)
     */
    resetQuota(): void;
}
export default ComfyUIWorkflowOrchestrator;
