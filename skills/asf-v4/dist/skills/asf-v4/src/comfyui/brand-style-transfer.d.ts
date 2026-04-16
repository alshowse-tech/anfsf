/**
 * 品牌风格迁移引擎
 *
 * 层级：Layer 6 - System Architecture Layer
 * 功能：将品牌视觉风格应用到生成的视频
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
import { VideoGenerationSkill } from './video-generation-skill';
/**
 * 品牌风格定义
 */
export interface BrandStyle {
    /** 品牌 ID */
    brandId: string;
    /** 品牌名称 */
    brandName: string;
    /** 主色调 */
    primaryColor: string;
    /** 辅助色调 */
    secondaryColors: string[];
    /** 品牌字体 */
    fonts: {
        heading?: string;
        body?: string;
    };
    /** Logo 路径 */
    logoPath?: string;
    /** 风格关键词 */
    styleKeywords: string[];
    /** 视觉规范 */
    visualGuidelines: {
        /** 最小留白 */
        minWhitespace: string;
        /** 圆角大小 */
        cornerRadius: string;
        /** 阴影强度 */
        shadowIntensity: 'none' | 'light' | 'medium' | 'heavy';
        /** 动画风格 */
        animationStyle: 'subtle' | 'moderate' | 'bold';
    };
    /** 禁用元素 */
    forbiddenElements: string[];
}
/**
 * 风格迁移配置
 */
export interface StyleTransferConfig {
    /** 源视频路径 */
    sourceVideoPath: string;
    /** 目标品牌风格 */
    targetBrand: BrandStyle;
    /** 迁移强度 (0-1) */
    transferStrength: number;
    /** 保持内容完整性 */
    preserveContent: boolean;
    /** 添加品牌水印 */
    addWatermark: boolean;
    /** 添加 Logo */
    addLogo: boolean;
    /** 颜色校正 */
    colorCorrection: boolean;
    /** 输出分辨率 */
    outputResolution: '480P' | '720P' | '1080P';
}
/**
 * 风格迁移结果
 */
export interface StyleTransferResult {
    /** 任务 ID */
    taskId: string;
    /** 状态 */
    status: 'success' | 'failed';
    /** 输出视频路径 */
    outputVideoPath?: string;
    /** 预览图路径 */
    thumbnailPath?: string;
    /** 生成耗时 (秒) */
    durationSeconds: number;
    /** 错误信息 */
    error?: string;
    /** 应用的风格 */
    appliedStyle: {
        colorGrading: boolean;
        logoAdded: boolean;
        watermarkAdded: boolean;
        fontApplied: boolean;
    };
}
/**
 * 品牌风格迁移引擎
 */
export declare class BrandStyleTransferEngine {
    private videoSkill;
    private brandStyles;
    constructor(videoSkill: VideoGenerationSkill);
    /**
     * 注册品牌风格
     */
    registerBrand(brand: BrandStyle): void;
    /**
     * 获取品牌风格
     */
    getBrand(brandId: string): BrandStyle | undefined;
    /**
     * 执行风格迁移
     */
    transferStyle(config: StyleTransferConfig): Promise<StyleTransferResult>;
    /**
     * 批量应用品牌风格到多个视频
     */
    batchTransferStyle(videoPaths: string[], brand: BrandStyle, config?: Partial<StyleTransferConfig>): Promise<StyleTransferResult[]>;
    /**
     * 验证视频是否符合品牌规范
     */
    validateBrandCompliance(videoPath: string, brand: BrandStyle): {
        compliant: boolean;
        issues: string[];
    };
    /**
     * 生成品牌风格指南
     */
    generateStyleGuide(brand: BrandStyle): string;
    /**
     * 创建风格迁移提示
     */
    private createTransferPrompt;
}
export default BrandStyleTransferEngine;
