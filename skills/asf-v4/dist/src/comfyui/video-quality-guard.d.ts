/**
 * 视频质量门禁 (Video Quality Guard)
 *
 * 层级：Layer 17 - Evolution Guard
 * 功能：视频质量验收、自动回滚、进化安全护栏
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
import { VideoGenerationResponse } from './comfyui-workflow-orchestrator';
/**
 * 质量检查项
 */
export interface QualityCheckItem {
    /** 检查项名称 */
    name: string;
    /** 检查项描述 */
    description: string;
    /** 权重 (1-10) */
    weight: number;
    /** 得分 (0-1) */
    score: number;
    /** 是否通过 */
    passed: boolean;
    /** 详细信息 */
    details?: string;
}
/**
 * 质量检查报告
 */
export interface QualityReport {
    /** 视频路径 */
    videoPath: string;
    /** 总体得分 (0-1) */
    overallScore: number;
    /** 是否通过 */
    passed: boolean;
    /** 检查时间 */
    checkedAt: number;
    /** 检查耗时 (ms) */
    durationMs: number;
    /** 检查项列表 */
    items: QualityCheckItem[];
    /** 建议操作 */
    recommendation: 'accept' | 'retry' | 'reject' | 'manual_review';
    /** 错误信息 */
    error?: string;
}
/**
 * 质量门禁配置
 */
export interface QualityGuardConfig {
    /** 最低通过分数 */
    minPassScore: number;
    /** 自动重试阈值 */
    retryThreshold: number;
    /** 最大重试次数 */
    maxRetries: number;
    /** 人工审核阈值 */
    manualReviewThreshold: number;
    /** 启用检查项 */
    enabledChecks: string[];
    /** 关键检查项 (必须通过) */
    criticalChecks: string[];
}
/**
 * 回滚配置
 */
export interface RollbackConfig {
    /** 启用自动回滚 */
    enabled: boolean;
    /** 回滚触发条件 */
    triggerConditions: {
        /** 质量分数低于阈值 */
        qualityScoreBelow: number;
        /** 关键检查项失败 */
        criticalCheckFailed: boolean;
        /** 连续失败次数 */
        consecutiveFailures: number;
    };
    /** 回滚动作 */
    actions: {
        /** 通知管理员 */
        notifyAdmin: boolean;
        /** 标记为高风险 */
        markAsHighRisk: boolean;
        /** 暂停自动部署 */
        pauseAutoDeploy: boolean;
    };
}
/**
 * 视频质量门禁
 */
export declare class VideoQualityGuard {
    private config;
    private rollbackConfig;
    private consecutiveFailures;
    private failureHistory;
    constructor(config?: Partial<QualityGuardConfig>, rollbackConfig?: Partial<RollbackConfig>);
    /**
     * 检查分辨率
     */
    private checkResolution;
    /**
     * 检查时长
     */
    private checkDuration;
    /**
     * 检查宽高比
     */
    private checkAspectRatio;
    /**
     * 检查视觉质量 (模拟)
     */
    private checkVisualQuality;
    /**
     * 检查内容安全 (模拟)
     */
    private checkContentSafety;
    /**
     * 检查音频质量 (如果启用)
     */
    private checkAudioQuality;
    /**
     * 检查品牌一致性 (模拟)
     */
    /**
     * 检查品牌一致性 (模拟)
     */
    private checkBrandConsistency;
    /**
     * 执行质量检查
     */
    checkQuality(response: VideoGenerationResponse): Promise<QualityReport>;
    /**
     * 检查是否触发回滚
     */
    private shouldTriggerRollback;
    /**
     * 触发回滚
     */
    private triggerRollback;
    /**
     * 获取门禁状态
     */
    getStatus(): {
        consecutiveFailures: number;
        failureHistory: {
            timestamp: number;
            score: number;
            reason: string;
        }[];
        config: QualityGuardConfig;
    };
    /**
     * 重置失败计数
     */
    resetFailureCount(): void;
    /**
     * 更新配置
     */
    updateConfig(config: Partial<QualityGuardConfig>): void;
}
export default VideoQualityGuard;
