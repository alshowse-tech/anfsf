/**
 * ANFSF V1.5.0 - Evolution Harness (独立版)
 *
 * Responsible for KPI Optimization, Data Flywheel, and Memory Consolidation.
 * Separated from Experience Harness.
 */
import { MemoryConsolidationSkill } from '../skills/memory-consolidation-skill';
import { ContextCompressorSkill } from '../skills/context-compressor-skill';
export interface ProjectData {
    projectId: string;
    tokenBudget: number;
    featureCount: number;
    complexity: number;
    economicsScore: number;
    reworkRate: number;
    successRate: number;
    timestamp: number;
}
export interface EvolutionConfig {
    enableKPIOptimizer: boolean;
    enableDataFlywheel: boolean;
    enableProgressiveEvolution: boolean;
    kpiUpdateInterval: number;
    calibrationThreshold: number;
}
export interface AgentKPI {
    name: string;
    value: number;
    target: number;
}
export interface KPIOptimizationResult {
    optimizedKPIs: AgentKPI[];
    improvements: string[];
    errors: string[];
}
export interface DataFlywheelResult {
    dataPoints: number;
    modelUpdates: number;
    feedbackLoops: number;
    timestamp: number;
}
export interface EvolutionMetrics {
    projectCount: number;
    externalDataFilterAccuracy: number;
    sandboxIsolationPassRate: number;
    l13_l17_call_rate: number;
    efficiency_ratio: number;
    twoSourceImprovement: number;
}
/**
 * Evolution Harness - manages KPI optimization, data flywheel, and memory consolidation.
 */
export declare class EvolutionHarness {
    private config;
    private memorySkill;
    private contextCompressor;
    private projectData;
    private kpiHistory;
    constructor(config?: Partial<EvolutionConfig>);
    /**
     * Get MemoryConsolidationSkill instance.
     */
    getMemorySkill(): MemoryConsolidationSkill;
    /**
     * Register MemoryConsolidationSkill to harness registry.
     */
    registerSkills(registry: any): void;
    /**
     * Optimize agent KPIs.
     */
    optimizeKPIs(agentId: string, currentKPIs: AgentKPI[]): Promise<KPIOptimizationResult>;
    /**
     * Run data flywheel.
     */
    runDataFlywheel(): Promise<DataFlywheelResult>;
    /**
     * Collect project data.
     */
    collectProjectData(data: ProjectData): void;
    /**
     * Calculate KPI trend.
     */
    private calculateTrend;
    /**
     * Average KPIs from history.
     */
    private averageKPIs;
    /**
     * Update models.
     */
    private updateModels;
    /**
     * Run feedback loops.
     */
    private runFeedbackLoops;
    /**
     * Get harness metrics.
     */
    getMetrics(): {
        kpiOptimizerEnabled: boolean;
        dataFlywheelEnabled: boolean;
        projectDataCount: number;
        kpiHistorySize: number;
        memorySkillReady: boolean;
    };
    /**
     * Check if external fusion should be enabled (KPI thresholds).
     */
    shouldEnableExternalFusion(): Promise<boolean>;
    /**
     * Auto-enable external fusion if KPI thresholds met.
     */
    autoEnableExternalFusion(): Promise<void>;
    /**
     * Rollback to baseline (when two-source improvement < threshold).
     */
    rollbackToBaseline(): Promise<void>;
    /**
     * Get current evolution metrics.
     */
    getCurrentMetrics(): Promise<EvolutionMetrics>;
    /**
     * Cleanup resources.
     */
    dispose(): void;
    /**
     * 执行自升级 (使用 ContextCompressorSkill 压缩上下文，避免 token 超限)
     * 解决 HTTP 400: InternalError.Algo.InvalidParameter - Range of input length should be [1, 196601]
     */
    performSelfUpgrade(buildUpgradeContext: () => Promise<string>, llmGenerate: (compressedContext: string) => Promise<any>): Promise<{
        success: boolean;
        result?: any;
        error?: string;
        compressedTokens: number;
    }>;
    /**
     * 构建 diff 而非全量代码 (token 下降 90%)
     */
    generateDiffForUpgrade(oldCode: string, newCode: string): Promise<string>;
    /**
     * 获取 ContextCompressor 实例
     */
    getContextCompressor(): ContextCompressorSkill;
}
export declare function createEvolutionHarness(config?: Partial<EvolutionConfig>): EvolutionHarness;
