/**
 * 产品演示视频生成器
 *
 * 层级：Layer 6 - System Architecture Layer
 * 功能：从 PRD/产品描述自动生成产品演示视频
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
import { VideoGenerationSkill } from './video-generation-skill';
import { MCPVideoBus } from './mcp-video-bus';
/**
 * 产品信息
 */
export interface ProductInfo {
    /** 产品名称 */
    name: string;
    /** 产品描述 */
    description: string;
    /** 核心功能 */
    features: string[];
    /** 目标用户 */
    targetAudience?: string;
    /** 使用场景 */
    useCases?: string[];
    /** 品牌色调 */
    brandColor?: string;
    /** Logo 路径 */
    logoPath?: string;
}
/**
 * 演示视频配置
 */
export interface DemoVideoConfig {
    /** 视频时长 (秒) */
    durationSeconds: number;
    /** 视频风格 */
    style: 'professional' | 'casual' | 'energetic' | 'minimalist';
    /** 旁白语言 */
    language: 'zh-CN' | 'en-US' | 'ja-JP';
    /** 背景音乐 */
    backgroundMusic: boolean;
    /** 显示字幕 */
    showSubtitles: boolean;
    /** 宽高比 */
    aspectRatio: '16:9' | '9:16' | '1:1';
    /** 分辨率 */
    resolution: '480P' | '720P' | '1080P';
}
/**
 * 演示视频场景
 */
export interface DemoScene {
    /** 场景序号 */
    sequence: number;
    /** 场景描述 */
    description: string;
    /** 展示功能 */
    feature?: string;
    /** 视觉提示 */
    visualPrompt: string;
    /** 预计时长 (秒) */
    durationSeconds: number;
}
/**
 * 生成任务
 */
export interface DemoGenerationTask {
    /** 任务 ID */
    taskId: string;
    /** 产品信息 */
    product: ProductInfo;
    /** 视频配置 */
    config: DemoVideoConfig;
    /** 生成场景 */
    scenes: DemoScene[];
    /** 创建时间 */
    createdAt: number;
    /** 状态 */
    status: 'pending' | 'generating' | 'completed' | 'failed';
}
/**
 * 生成结果
 */
export interface DemoGenerationResult {
    /** 任务 ID */
    taskId: string;
    /** 状态 */
    status: 'success' | 'failed' | 'partial';
    /** 生成的视频路径 */
    videoPaths: string[];
    /** 合并后的视频路径 */
    mergedVideoPath?: string;
    /** 生成耗时 (秒) */
    durationSeconds: number;
    /** 错误信息 */
    errors?: string[];
    /** 元数据 */
    metadata: {
        totalScenes: number;
        successfulScenes: number;
        failedScenes: number;
        totalDuration: number;
    };
}
/**
 * 产品演示视频生成器
 */
export declare class ProductDemoGenerator {
    private videoSkill;
    private mcpBus;
    constructor(videoSkill: VideoGenerationSkill, mcpBus: MCPVideoBus);
    /**
     * 从产品信息生成演示视频
     */
    generateDemo(product: ProductInfo, config?: Partial<DemoVideoConfig>): Promise<DemoGenerationResult>;
    /**
     * 分析产品并生成场景
     */
    private analyzeProductAndGenerateScenes;
    /**
     * 创建视觉提示
     */
    private createVisualPrompt;
    /**
     * 生成所有场景
     */
    private generateScenes;
    /**
     * 合并场景视频 (模拟)
     */
    private mergeSceneVideos;
    /**
     * 发送任务开始通知
     */
    private notifyTaskStart;
    /**
     * 发送任务完成通知
     */
    private notifyTaskComplete;
}
export default ProductDemoGenerator;
