/**
 * 成本优化器
 *
 * 层级：Layer 10 - Efficiency Layer
 * 功能：视频生成成本优化、预算控制、资源调度优化
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
/**
 * 成本明细
 */
export interface CostBreakdown {
    /** 基础成本 */
    baseCost: number;
    /** 分辨率加成 */
    resolutionMultiplier: number;
    /** 时长加成 */
    durationMultiplier: number;
    /** 音频加成 */
    audioMultiplier: number;
    /** 总成本 */
    totalCost: number;
}
/**
 * 预算配置
 */
export interface BudgetConfig {
    /** 每日预算 */
    dailyBudget: number;
    /** 每请求预算上限 */
    maxCostPerRequest: number;
    /** 预算警告阈值 (80%) */
    warningThreshold: number;
    /** 预算阻止阈值 (100%) */
    blockThreshold: number;
    /** 预算重置时间 */
    budgetResetHour: number;
}
/**
 * 成本优化策略
 */
export type CostOptimizationStrategy = 'quality_priority' | 'cost_priority' | 'balanced';
/**
 * 优化建议
 */
export interface OptimizationSuggestion {
    /** 建议类型 */
    type: 'resolution_downgrade' | 'duration_reduction' | 'batch_processing' | 'off_peak';
    /** 建议描述 */
    description: string;
    /** 预计节省 */
    estimatedSavings: number;
    /** 影响评估 */
    impact: 'none' | 'low' | 'medium' | 'high';
}
/**
 * 使用统计
 */
export interface UsageStats {
    /** 今日已用预算 */
    spentToday: number;
    /** 今日剩余预算 */
    remainingToday: number;
    /** 今日请求数 */
    requestsToday: number;
    /** 平均单次成本 */
    avgCostPerRequest: number;
    /** 预算使用率 */
    budgetUtilization: number;
}
/**
 * 成本优化器
 */
export declare class CostOptimizer {
    private budgetConfig;
    private spentToday;
    private requestsToday;
    private lastResetDate;
    constructor(budgetConfig?: Partial<BudgetConfig>);
    /**
     * 计算成本明细
     */
    calculateCost(durationSeconds?: number, resolution?: '480P' | '720P' | '1080P', hasAudio?: boolean): CostBreakdown;
    /**
     * 检查预算
     */
    checkBudget(estimatedCost: number): {
        allowed: boolean;
        reason?: string;
        remainingBudget?: number;
    };
    /**
     * 记录支出
     */
    recordExpense(cost: number): void;
    /**
     * 获取使用统计
     */
    getUsageStats(): UsageStats;
    /**
     * 获取优化建议
     */
    getSuggestions(currentResolution: string, currentDuration: number): OptimizationSuggestion[];
    /**
     * 根据策略优化请求
     */
    optimizeRequest(request: any, strategy: CostOptimizationStrategy): {
        optimized: any;
        savings: number;
    };
    /**
     * 重置预算 (日期变更时)
     */
    private checkDateReset;
    /**
     * 手动重置预算
     */
    resetBudget(): void;
}
export default CostOptimizer;
