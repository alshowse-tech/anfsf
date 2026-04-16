/**
 * Requirement Refiner Skill - ANFSF V1.5.0 需求分析阶段优化
 *
 * 优化版本：v2.3-hybrid-adaptive-parser (2026-04-14)
 * 作用：Hybrid Adaptive Parser - 智能检测复杂需求，自动选择解析策略
 *
 * @module asf-v4/skills/requirement-refiner-skill
 */
import { Skill, SkillContext } from '../core/skill';
import { RefinedGraph } from '../core/types';
export declare class RequirementRefinerSkill extends Skill {
    private mempalace;
    private logger;
    constructor(context: SkillContext);
    /**
     * 精炼需求 - 主入口 (Hybrid Adaptive Parser)
     */
    refine(rawRequirement: string): Promise<RefinedGraph>;
    /**
     * 复杂度分析 - 加权评分 + 否定词处理
     */
    private analyzeComplexity;
    /**
     * Hybrid Adaptive Parser - 高级解析策略
     */
    private hybridAdaptiveParse;
    /**
     * 判断是否需要模块化拆分
     */
    private shouldModularize;
    /**
     * 估算依赖深度 - 复用 ContextCompressor 已有方法
     */
    private estimateDependencyDepth;
    /**
     * 拆分为模块化图谱
     */
    private splitIntoModularGraph;
    /**
     * 增强型单模块解析
     */
    private enhancedSingleModuleParse;
    /**
     * 多格式内容解析
     */
    private parseMultiFormatContent;
    /**
     * 历史模板匹配
     */
    private matchHistoricalTemplates;
    /**
     * 精炼模块子图谱 - 复用原有实现
     */
    private refineModule;
    /**
     * 提取模块相关需求
     */
    private extractModuleRequirement;
    /**
     * 获取模块关键词
     */
    private getModuleKeywords;
    /**
     * 标准精炼流程 - 原有实现保持不变
     */
    private standardRefine;
}
export declare class HybridParserRollback {
    private readonly ROLLBACK_THRESHOLD;
    private readonly OBSERVATION_WINDOW;
    shouldRollback(): Promise<boolean>;
    private getParseAccuracyStats;
    private rollbackToV21;
    private backupCurrentVersion;
    private gitRevertToV21;
    private deploy;
    private recordChangeEvent;
    private notifyTeam;
}
export declare function createRequirementRefinerSkill(context: SkillContext): RequirementRefinerSkill;
export declare function createHybridParserRollback(): HybridParserRollback;
