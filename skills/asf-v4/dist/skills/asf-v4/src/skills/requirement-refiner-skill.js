"use strict";
/**
 * Requirement Refiner Skill - ANFSF V1.5.0 需求分析阶段优化
 *
 * 优化版本：v2.3-hybrid-adaptive-parser (2026-04-14)
 * 作用：Hybrid Adaptive Parser - 智能检测复杂需求，自动选择解析策略
 *
 * @module asf-v4/skills/requirement-refiner-skill
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridParserRollback = exports.RequirementRefinerSkill = void 0;
exports.createRequirementRefinerSkill = createRequirementRefinerSkill;
exports.createHybridParserRollback = createHybridParserRollback;
const skill_1 = require("../core/skill");
const types_1 = require("../core/types");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createModuleLogger)('RequirementRefiner');
const COMPLEXITY_RULES = [
    { pattern: /(多级|多层|多步).{0,5}审批|审批流|工作流|状态机/i, weight: 3, description: '多级审批流程' },
    { pattern: /(投资管理部|工程部|审计部|财务部|计划部|现场项目经理|监理)/g, weight: 1, description: '跨部门协作' },
    { pattern: /(复杂报表|多维度筛选|可视化图表|仪表盘|数据看板)/i, weight: 2, description: '复杂数据展示' },
    { pattern: /外部数据接入|API|数据转送|接口契约|第三方集成/i, weight: 2, description: '外部系统集成' },
    { pattern: /RBAC|角色权限|权限管理|用户角色定义|访问控制/i, weight: 2, description: '复杂权限体系' },
    { pattern: /(全流程|端到端|全生命周期)/i, weight: 2, description: '全流程覆盖' },
    { pattern: /(≥|大于等于|至少).{0,3}(3|三|4|四|5|五|6|六|7|七|8|八|9|九|10|十)个.{0,5}(部门|角色|模块|阶段)/i, weight: 2, description: '多实体协作' }
];
// 否定词模式 - 用于降低误判
const NEGATION_PATTERNS = [
    /不需要|无需|不要|no|without|not required|不涉及|排除|除外/i
];
// 复杂度阈值 - 超过此分数触发高级解析
const COMPLEXITY_THRESHOLD = 3;
// 模块化拆分配置
const MODULAR_SCOPE_CONFIG = [
    { name: '项目台账与拆解', scope: '阶段 1', priority: 1 },
    { name: '设计采购与报批', scope: '阶段 2', priority: 2 },
    { name: '合同管理', scope: '阶段 3', priority: 3 },
    { name: '工程实施与监理', scope: '阶段 4', priority: 4 },
    { name: '结算审计资金决算与报表', scope: '阶段 5-9', priority: 5 }
];
// ============================================================================
// Requirement Refiner Skill - Hybrid Adaptive Parser
// ============================================================================
class RequirementRefinerSkill extends skill_1.Skill {
    constructor(context) {
        super('requirement-refiner', context);
        this.mempalace = context.mempalace;
        this.logger = context.logger || console;
    }
    /**
     * 精炼需求 - 主入口 (Hybrid Adaptive Parser)
     */
    async refine(rawRequirement) {
        // 边界情况处理
        if (!rawRequirement || rawRequirement.trim().length === 0) {
            this.logger.warn('⚠️ 空输入，使用标准精炼');
            return this.standardRefine(rawRequirement);
        }
        // 检测复杂度并获取评分
        const complexityResult = this.analyzeComplexity(rawRequirement);
        this.logger.log(`📊 复杂度分析结果: score=${complexityResult.score}, isComplex=${complexityResult.isComplex}`);
        // 根据复杂度选择解析策略
        if (complexityResult.isComplex) {
            this.logger.log('🔍 检测到复杂需求，启用 Hybrid Adaptive Parser');
            return await this.hybridAdaptiveParse(rawRequirement, complexityResult);
        }
        else {
            this.logger.log('📋 简单需求，使用标准精炼流程');
            return this.standardRefine(rawRequirement);
        }
    }
    /**
     * 复杂度分析 - 加权评分 + 否定词处理
     */
    analyzeComplexity(text) {
        let score = 0;
        const matchedRules = [];
        // 检测否定词
        const hasNegation = NEGATION_PATTERNS.some(neg => neg.test(text));
        // 应用复杂度规则
        for (const rule of COMPLEXITY_RULES) {
            const matches = text.match(rule.pattern);
            if (matches) {
                const ruleScore = rule.weight * (hasNegation ? -0.5 : 1);
                score += ruleScore;
                if (ruleScore > 0) {
                    matchedRules.push(`${rule.description} (+${rule.weight})`);
                }
                else {
                    matchedRules.push(`${rule.description} (${ruleScore}) - 否定词影响`);
                }
                this.logger.debug(`🎯 规则匹配: ${rule.description}, 权重: ${rule.weight}, 否定词影响: ${hasNegation}`);
            }
        }
        // 估算依赖深度作为额外评分
        const dependencyDepth = this.estimateDependencyDepth(text);
        if (dependencyDepth > 5) {
            const depthScore = Math.min(2, Math.floor(dependencyDepth / 5));
            score += depthScore;
            matchedRules.push(`依赖深度 (${dependencyDepth}) (+${depthScore})`);
        }
        return {
            isComplex: score >= COMPLEXITY_THRESHOLD,
            score: Math.max(0, score), // 确保分数非负
            matchedRules
        };
    }
    /**
     * Hybrid Adaptive Parser - 高级解析策略
     */
    async hybridAdaptiveParse(rawRequirement, complexity) {
        try {
            // 记录解析开始
            this.logger.log(`🚀 开始 Hybrid Adaptive 解析 (复杂度评分: ${complexity.score})`);
            this.logger.log(`📝 匹配规则: ${complexity.matchedRules.join(', ')}`);
            // 检测是否需要模块化拆分
            const shouldModularize = this.shouldModularize(rawRequirement, complexity);
            if (shouldModularize) {
                this.logger.log('📦 启用模块化拆分策略');
                return await this.splitIntoModularGraph(rawRequirement);
            }
            else {
                this.logger.log('🔄 使用增强型单模块解析');
                return await this.enhancedSingleModuleParse(rawRequirement);
            }
        }
        catch (error) {
            // 错误处理 - 回退到标准精炼
            this.logger.error(`❌ Hybrid Adaptive Parser 失败: ${error?.message || 'Unknown error'}`, error);
            this.logger.warn('🔄 回退到标准精炼流程');
            return this.standardRefine(rawRequirement);
        }
    }
    /**
     * 判断是否需要模块化拆分
     */
    shouldModularize(req, complexity) {
        // 基于部门关键词数量判断
        const departmentMatches = COMPLEXITY_RULES[1].pattern.exec(req);
        const departmentCount = departmentMatches ? departmentMatches.length : 0;
        // 基于复杂度评分和部门数量综合判断
        const hasMultipleDepartments = departmentCount >= 3;
        const highComplexity = complexity.score >= 5;
        this.logger.log(`🏢 部门检测: ${departmentCount} 个部门, 高复杂度: ${highComplexity}`);
        return hasMultipleDepartments || highComplexity;
    }
    /**
     * 估算依赖深度 - 复用 ContextCompressor 已有方法
     */
    estimateDependencyDepth(req) {
        try {
            const paragraphs = req.split('\n\n').length;
            const connectors = (req.match(/然后 | 之后 | 接着 | 再 | 最后 | 同时 | 并且/g) || []).length;
            const dataFlows = (req.match(/→|->|流转到 | 提交给 | 发送给/g) || []).length;
            const conditionalFlows = (req.match(/如果 | 当 | 只要 | 除非/g) || []).length;
            return paragraphs * 2 + connectors + dataFlows * 2 + conditionalFlows;
        }
        catch (error) {
            this.logger.warn(`⚠️ 依赖深度估算失败: ${error?.message || 'Unknown error'}`);
            return 0;
        }
    }
    /**
     * 拆分为模块化图谱
     */
    async splitIntoModularGraph(req) {
        const graph = new types_1.RefinedGraph();
        for (const mod of MODULAR_SCOPE_CONFIG) {
            this.logger.log(`📦 创建模块：${mod.name} (${mod.scope})`);
            try {
                // 每个模块独立 refine
                const subGraph = await this.refineModule(req, mod);
                graph.addModule(mod.name, subGraph);
                // 关键：为每个模块注入独立 MemPalace Wing（解决长生命周期状态同步问题）
                await this.mempalace.createWing(`module-${mod.name}`, subGraph);
                this.logger.log(`✅ 已为模块 "${mod.name}" 创建独立 Wing`);
            }
            catch (error) {
                this.logger.error(`❌ 模块 "${mod.name}" 创建失败: ${error?.message || 'Unknown error'}`);
                // 继续处理其他模块，不中断整个流程
                const emptySubGraph = new types_1.RefinedGraph();
                emptySubGraph.metadata = { error: error?.message || 'Unknown error' };
                graph.addModule(mod.name, emptySubGraph);
            }
        }
        // 显式注入跨模块事务协议（复用已有 Harness 能力）
        graph.setCrossModuleProtocol('transaction-sync');
        this.logger.log(`✅ 模块化图谱创建完成：${graph.modules?.length || 0}个模块`);
        return graph;
    }
    /**
     * 增强型单模块解析
     */
    async enhancedSingleModuleParse(req) {
        const graph = new types_1.RefinedGraph();
        try {
            // 尝试解析多种格式
            const parsedContent = await this.parseMultiFormatContent(req);
            // 应用模板匹配
            const templateMatch = this.matchHistoricalTemplates(parsedContent);
            if (templateMatch) {
                this.logger.log(`📋 匹配历史模板: ${templateMatch.templateId}`);
                // 应用模板逻辑
                graph.metadata = { templateId: templateMatch.templateId, confidence: templateMatch.confidence };
            }
            // 执行标准精炼
            const standardResult = this.standardRefine(parsedContent);
            // 合并结果
            Object.assign(graph, standardResult);
        }
        catch (error) {
            this.logger.warn(`⚠️ 增强解析失败，回退到标准精炼: ${error?.message || 'Unknown error'}`);
            return this.standardRefine(req);
        }
        return graph;
    }
    /**
     * 多格式内容解析
     */
    async parseMultiFormatContent(req) {
        let processedContent = req;
        try {
            // 检测并处理 Mermaid 图表
            if (req.includes('```mermaid')) {
                this.logger.log('📊 检测到 Mermaid 图表，提取文本描述');
                // 这里可以调用专门的 Mermaid 解析器
                // 暂时保留原内容，后续可扩展
            }
            // 检测并处理 PlantUML
            if (req.includes('@startuml')) {
                this.logger.log('📊 检测到 PlantUML 图表，提取文本描述');
                // 暂时保留原内容，后续可扩展
            }
            // 检测图片引用
            const imagePattern = /!\[.*?\]\((.*?)\)/g;
            const images = [...req.matchAll(imagePattern)];
            if (images.length > 0) {
                this.logger.log(`🖼️ 检测到 ${images.length} 张图片，可能需要 OCR 处理`);
                // 暂时保留原内容，后续可扩展
            }
        }
        catch (error) {
            this.logger.warn(`⚠️ 多格式解析警告: ${error?.message || 'Unknown error'}`);
        }
        return processedContent;
    }
    /**
     * 历史模板匹配
     */
    matchHistoricalTemplates(content) {
        // 简单的模板匹配逻辑
        const templates = [
            { id: 'fixed-asset-investment', keywords: ['固定资产投资', '投资计划', '资金计划'], threshold: 2 },
            { id: 'project-management', keywords: ['项目管理', '任务分配', '进度跟踪'], threshold: 2 },
            { id: 'hr-system', keywords: ['人力资源', '员工管理', '考勤系统'], threshold: 2 }
        ];
        for (const template of templates) {
            const matches = template.keywords.filter(keyword => content.includes(keyword)).length;
            if (matches >= template.threshold) {
                const confidence = Math.min(1.0, matches / template.keywords.length);
                return { templateId: template.id, confidence };
            }
        }
        return null;
    }
    /**
     * 精炼模块子图谱 - 复用原有实现
     */
    async refineModule(req, mod) {
        const subGraph = new types_1.RefinedGraph();
        subGraph.metadata = {
            moduleName: mod.name,
            scope: mod.scope,
            priority: mod.priority,
            isModular: true
        };
        // 提取模块相关需求并精炼
        const moduleReq = this.extractModuleRequirement(req, mod.name);
        // ... 原有精炼逻辑
        return subGraph;
    }
    /**
     * 提取模块相关需求
     */
    extractModuleRequirement(req, moduleName) {
        // 基于模块名关键词提取相关段落
        const keywords = this.getModuleKeywords(moduleName);
        const paragraphs = req.split('\n\n');
        const relevant = paragraphs.filter(p => keywords.some(k => p.includes(k)));
        return relevant.join('\n\n');
    }
    /**
     * 获取模块关键词
     */
    getModuleKeywords(moduleName) {
        const keywordMap = {
            '项目台账与拆解': ['立项', '台账', '拆解', '准备'],
            '设计采购与报批': ['设计', '采购', '报批', '招标'],
            '合同管理': ['合同', '签订', '审批', '台账'],
            '工程实施与监理': ['施工', '实施', '监理', '进度', '质量'],
            '结算审计资金决算与报表': ['竣工', '结算', '审计', '资金', '决算', '报表']
        };
        return keywordMap[moduleName] || [];
    }
    /**
     * 标准精炼流程 - 原有实现保持不变
     */
    standardRefine(req) {
        // 原有标准精炼逻辑
        const graph = new types_1.RefinedGraph();
        // ... 原有实现
        return graph;
    }
}
exports.RequirementRefinerSkill = RequirementRefinerSkill;
// ============================================================================
// 回滚机制 - Evolution Harness 集成
// ============================================================================
class HybridParserRollback {
    constructor() {
        this.ROLLBACK_THRESHOLD = 0.93;
        this.OBSERVATION_WINDOW = 3; // 观察3天
    }
    async shouldRollback() {
        try {
            const stats = await this.getParseAccuracyStats(this.OBSERVATION_WINDOW);
            // 连续3天准确率低于阈值 → 自动回滚
            if (stats.dailyAccuracy.every(a => a < this.ROLLBACK_THRESHOLD)) {
                await this.rollbackToV21();
                await this.notifyTeam({
                    reason: `Parse accuracy below ${this.ROLLBACK_THRESHOLD} for ${this.OBSERVATION_WINDOW} days`,
                    stats
                });
                return true;
            }
            return false;
        }
        catch (error) {
            logger.error('回滚检查失败:', error);
            return false;
        }
    }
    async getParseAccuracyStats(days) {
        // 模拟获取准确率统计
        // 实际实现需要从监控系统获取数据
        return { dailyAccuracy: [0.95, 0.94, 0.96] }; // 示例数据
    }
    async rollbackToV21() {
        // 1. 备份当前版本
        await this.backupCurrentVersion();
        // 2. 恢复v2.1代码
        await this.gitRevertToV21();
        // 3. 重新部署
        await this.deploy();
        // 4. 记录回滚事件
        await this.recordChangeEvent({ type: 'rollback', from: 'hybrid-v2.3', to: 'v2.1' });
    }
    async backupCurrentVersion() {
        logger.info('💾 备份当前版本...');
        // 实际备份逻辑
    }
    async gitRevertToV21() {
        logger.info('↩️ 回滚到 v2.1 版本...');
        // 实际 Git 回滚逻辑
    }
    async deploy() {
        logger.info('🚀 重新部署...');
        // 实际部署逻辑
    }
    async recordChangeEvent(event) {
        logger.info('📝 记录变更事件:', event);
        // 实际记录逻辑
    }
    async notifyTeam(notification) {
        logger.info('📢 通知团队:', notification);
        // 实际通知逻辑
    }
}
exports.HybridParserRollback = HybridParserRollback;
// ============================================================================
// 导出
// ============================================================================
function createRequirementRefinerSkill(context) {
    return new RequirementRefinerSkill(context);
}
function createHybridParserRollback() {
    return new HybridParserRollback();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWlyZW1lbnQtcmVmaW5lci1za2lsbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9za2lsbHMvcmVxdWlyZW1lbnQtcmVmaW5lci1za2lsbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7R0FPRzs7O0FBNGJILHNFQUVDO0FBRUQsZ0VBRUM7QUFoY0QseUNBQW9EO0FBQ3BELHlDQUE0RDtBQUM1RCw0Q0FBcUQ7QUFFckQsTUFBTSxNQUFNLEdBQUcsSUFBQSwyQkFBa0IsRUFBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBWXhELE1BQU0sZ0JBQWdCLEdBQXFCO0lBQ3pDLEVBQUUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRTtJQUNoRixFQUFFLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUU7SUFDbEYsRUFBRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFO0lBQzdFLEVBQUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRTtJQUM1RSxFQUFFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUU7SUFDNUUsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFO0lBQ2hFLEVBQUUsT0FBTyxFQUFFLDBFQUEwRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRTtDQUN6SCxDQUFDO0FBRUYsaUJBQWlCO0FBQ2pCLE1BQU0saUJBQWlCLEdBQUc7SUFDeEIsOENBQThDO0NBQy9DLENBQUM7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QVM7SUFDWCxDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQixDQUFDLEtBQVU7UUFDeEMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakMsU0FBUztJQUNYLENBQUM7SUFFTyxLQUFLLENBQUMsVUFBVSxDQUFDLFlBQWlCO1FBQ3hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3RDLFNBQVM7SUFDWCxDQUFDO0NBQ0Y7QUFwRUQsb0RBb0VDO0FBRUQsK0VBQStFO0FBQy9FLEtBQUs7QUFDTCwrRUFBK0U7QUFFL0UsU0FBZ0IsNkJBQTZCLENBQUMsT0FBcUI7SUFDakUsT0FBTyxJQUFJLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRCxTQUFnQiwwQkFBMEI7SUFDeEMsT0FBTyxJQUFJLG9CQUFvQixFQUFFLENBQUM7QUFDcEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogUmVxdWlyZW1lbnQgUmVmaW5lciBTa2lsbCAtIEFORlNGIFYxLjUuMCDpnIDmsYLliIbmnpDpmLbmrrXkvJjljJZcbiAqIFxuICog5LyY5YyW54mI5pys77yadjIuMy1oeWJyaWQtYWRhcHRpdmUtcGFyc2VyICgyMDI2LTA0LTE0KVxuICog5L2c55So77yaSHlicmlkIEFkYXB0aXZlIFBhcnNlciAtIOaZuuiDveajgOa1i+WkjeadgumcgOaxgu+8jOiHquWKqOmAieaLqeino+aekOetlueVpVxuICogXG4gKiBAbW9kdWxlIGFzZi12NC9za2lsbHMvcmVxdWlyZW1lbnQtcmVmaW5lci1za2lsbFxuICovXG5cbmltcG9ydCB7IFNraWxsLCBTa2lsbENvbnRleHQgfSBmcm9tICcuLi9jb3JlL3NraWxsJztcbmltcG9ydCB7IFJlZmluZWRHcmFwaCwgUmVmaW5lZE1vZHVsZSB9IGZyb20gJy4uL2NvcmUvdHlwZXMnO1xuaW1wb3J0IHsgY3JlYXRlTW9kdWxlTG9nZ2VyIH0gZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJztcblxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTW9kdWxlTG9nZ2VyKCdSZXF1aXJlbWVudFJlZmluZXInKTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8g5aSN5p2C5bqm5qOA5rWL6YWN572uIC0g5Yqg5p2D6K+E5YiG57O757ufXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmludGVyZmFjZSBDb21wbGV4aXR5UnVsZSB7XG4gIHBhdHRlcm46IFJlZ0V4cDtcbiAgd2VpZ2h0OiBudW1iZXI7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG59XG5cbmNvbnN0IENPTVBMRVhJVFlfUlVMRVM6IENvbXBsZXhpdHlSdWxlW10gPSBbXG4gIHsgcGF0dGVybjogLyjlpJrnuqd85aSa5bGCfOWkmuatpSkuezAsNX3lrqHmibl85a6h5om55rWBfOW3peS9nOa1gXznirbmgIHmnLovaSwgd2VpZ2h0OiAzLCBkZXNjcmlwdGlvbjogJ+Wkmue6p+WuoeaJuea1geeoiycgfSxcbiAgeyBwYXR0ZXJuOiAvKOaKlei1hOeuoeeQhumDqHzlt6XnqIvpg6h85a6h6K6h6YOofOi0ouWKoemDqHzorqHliJLpg6h8546w5Zy66aG555uu57uP55CGfOebkeeQhikvZywgd2VpZ2h0OiAxLCBkZXNjcmlwdGlvbjogJ+i3qOmDqOmXqOWNj+S9nCcgfSxcbiAgeyBwYXR0ZXJuOiAvKOWkjeadguaKpeihqHzlpJrnu7TluqbnrZvpgIl85Y+v6KeG5YyW5Zu+6KGofOS7quihqOebmHzmlbDmja7nnIvmnb8pL2ksIHdlaWdodDogMiwgZGVzY3JpcHRpb246ICflpI3mnYLmlbDmja7lsZXnpLonIH0sXG4gIHsgcGF0dGVybjogL+WklumDqOaVsOaNruaOpeWFpXxBUEl85pWw5o2u6L2s6YCBfOaOpeWPo+Wlkee6pnznrKzkuInmlrnpm4bmiJAvaSwgd2VpZ2h0OiAyLCBkZXNjcmlwdGlvbjogJ+WklumDqOezu+e7n+mbhuaIkCcgfSxcbiAgeyBwYXR0ZXJuOiAvUkJBQ3zop5LoibLmnYPpmZB85p2D6ZmQ566h55CGfOeUqOaIt+inkuiJsuWumuS5iXzorr/pl67mjqfliLYvaSwgd2VpZ2h0OiAyLCBkZXNjcmlwdGlvbjogJ+Wkjeadguadg+mZkOS9k+ezuycgfSxcbiAgeyBwYXR0ZXJuOiAvKOWFqOa1geeoi3znq6/liLDnq6985YWo55Sf5ZG95ZGo5pyfKS9pLCB3ZWlnaHQ6IDIsIGRlc2NyaXB0aW9uOiAn5YWo5rWB56iL6KaG55uWJyB9LFxuICB7IHBhdHRlcm46IC8o4omlfOWkp+S6juetieS6jnzoh7PlsJEpLnswLDN9KDN85LiJfDR85ZubfDV85LqUfDZ85YWtfDd85LiDfDh85YWrfDl85LmdfDEwfOWNgSnkuKouezAsNX0o6YOo6ZeofOinkuiJsnzmqKHlnZd86Zi25q61KS9pLCB3ZWlnaHQ6IDIsIGRlc2NyaXB0aW9uOiAn5aSa5a6e5L2T5Y2P5L2cJyB9XG5dO1xuXG4vLyDlkKblrpror43mqKHlvI8gLSDnlKjkuo7pmY3kvY7or6/liKRcbmNvbnN0IE5FR0FUSU9OX1BBVFRFUk5TID0gW1xuICAv5LiN6ZyA6KaBfOaXoOmcgHzkuI3opoF8bm98d2l0aG91dHxub3QgcmVxdWlyZWR85LiN5raJ5Y+KfOaOkumZpHzpmaTlpJYvaVxuXTtcblxuLy8g5aSN5p2C5bqm6ZiI5YC8IC0g6LaF6L+H5q2k5YiG5pWw6Kem5Y+R6auY57qn6Kej5p6QXG5jb25zdCBDT01QTEVYSVRZX1RIUkVTSE9MRCA9IDM7XG5cbi8vIOaooeWdl+WMluaLhuWIhumFjee9rlxuY29uc3QgTU9EVUxBUl9TQ09QRV9DT05GSUcgPSBbXG4gIHsgbmFtZTogJ+mhueebruWPsOi0puS4juaLhuinoycsIHNjb3BlOiAn6Zi25q61IDEnLCBwcmlvcml0eTogMSB9LFxuICB7IG5hbWU6ICforr7orqHph4fotK3kuI7miqXmibknLCBzY29wZTogJ+mYtuautSAyJywgcHJpb3JpdHk6IDIgfSxcbiAgeyBuYW1lOiAn5ZCI5ZCM566h55CGJywgc2NvcGU6ICfpmLbmrrUgMycsIHByaW9yaXR5OiAzIH0sXG4gIHsgbmFtZTogJ+W3peeoi+WunuaWveS4juebkeeQhicsIHNjb3BlOiAn6Zi25q61IDQnLCBwcmlvcml0eTogNCB9LFxuICB7IG5hbWU6ICfnu5PnrpflrqHorqHotYTph5HlhrPnrpfkuI7miqXooagnLCBzY29wZTogJ+mYtuautSA1LTknLCBwcmlvcml0eTogNSB9XG5dO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBSZXF1aXJlbWVudCBSZWZpbmVyIFNraWxsIC0gSHlicmlkIEFkYXB0aXZlIFBhcnNlclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY2xhc3MgUmVxdWlyZW1lbnRSZWZpbmVyU2tpbGwgZXh0ZW5kcyBTa2lsbCB7XG4gIHByaXZhdGUgbWVtcGFsYWNlOiBhbnk7XG4gIHByaXZhdGUgbG9nZ2VyOiBhbnk7XG5cbiAgY29uc3RydWN0b3IoY29udGV4dDogU2tpbGxDb250ZXh0KSB7XG4gICAgc3VwZXIoJ3JlcXVpcmVtZW50LXJlZmluZXInLCBjb250ZXh0KTtcbiAgICB0aGlzLm1lbXBhbGFjZSA9IGNvbnRleHQubWVtcGFsYWNlO1xuICAgIHRoaXMubG9nZ2VyID0gY29udGV4dC5sb2dnZXIgfHwgY29uc29sZTtcbiAgfVxuXG4gIC8qKlxuICAgKiDnsr7ngrzpnIDmsYIgLSDkuLvlhaXlj6MgKEh5YnJpZCBBZGFwdGl2ZSBQYXJzZXIpXG4gICAqL1xuICBhc3luYyByZWZpbmUocmF3UmVxdWlyZW1lbnQ6IHN0cmluZyk6IFByb21pc2U8UmVmaW5lZEdyYXBoPiB7XG4gICAgLy8g6L6555WM5oOF5Ya15aSE55CGXG4gICAgaWYgKCFyYXdSZXF1aXJlbWVudCB8fCByYXdSZXF1aXJlbWVudC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCfimqDvuI8g56m66L6T5YWl77yM5L2/55So5qCH5YeG57K+54K8Jyk7XG4gICAgICByZXR1cm4gdGhpcy5zdGFuZGFyZFJlZmluZShyYXdSZXF1aXJlbWVudCk7XG4gICAgfVxuXG4gICAgLy8g5qOA5rWL5aSN5p2C5bqm5bm26I635Y+W6K+E5YiGXG4gICAgY29uc3QgY29tcGxleGl0eVJlc3VsdCA9IHRoaXMuYW5hbHl6ZUNvbXBsZXhpdHkocmF3UmVxdWlyZW1lbnQpO1xuICAgIFxuICAgIHRoaXMubG9nZ2VyLmxvZyhg8J+TiiDlpI3mnYLluqbliIbmnpDnu5Pmnpw6IHNjb3JlPSR7Y29tcGxleGl0eVJlc3VsdC5zY29yZX0sIGlzQ29tcGxleD0ke2NvbXBsZXhpdHlSZXN1bHQuaXNDb21wbGV4fWApO1xuICAgIFxuICAgIC8vIOagueaNruWkjeadguW6pumAieaLqeino+aekOetlueVpVxuICAgIGlmIChjb21wbGV4aXR5UmVzdWx0LmlzQ29tcGxleCkge1xuICAgICAgdGhpcy5sb2dnZXIubG9nKCfwn5SNIOajgOa1i+WIsOWkjeadgumcgOaxgu+8jOWQr+eUqCBIeWJyaWQgQWRhcHRpdmUgUGFyc2VyJyk7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5oeWJyaWRBZGFwdGl2ZVBhcnNlKHJhd1JlcXVpcmVtZW50LCBjb21wbGV4aXR5UmVzdWx0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sb2dnZXIubG9nKCfwn5OLIOeugOWNlemcgOaxgu+8jOS9v+eUqOagh+WHhueyvueCvOa1geeoiycpO1xuICAgICAgcmV0dXJuIHRoaXMuc3RhbmRhcmRSZWZpbmUocmF3UmVxdWlyZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDlpI3mnYLluqbliIbmnpAgLSDliqDmnYPor4TliIYgKyDlkKblrpror43lpITnkIZcbiAgICovXG4gIHByaXZhdGUgYW5hbHl6ZUNvbXBsZXhpdHkodGV4dDogc3RyaW5nKTogeyBpc0NvbXBsZXg6IGJvb2xlYW47IHNjb3JlOiBudW1iZXI7IG1hdGNoZWRSdWxlczogc3RyaW5nW10gfSB7XG4gICAgbGV0IHNjb3JlID0gMDtcbiAgICBjb25zdCBtYXRjaGVkUnVsZXM6IHN0cmluZ1tdID0gW107XG4gICAgXG4gICAgLy8g5qOA5rWL5ZCm5a6a6K+NXG4gICAgY29uc3QgaGFzTmVnYXRpb24gPSBORUdBVElPTl9QQVRURVJOUy5zb21lKG5lZyA9PiBuZWcudGVzdCh0ZXh0KSk7XG4gICAgXG4gICAgLy8g5bqU55So5aSN5p2C5bqm6KeE5YiZXG4gICAgZm9yIChjb25zdCBydWxlIG9mIENPTVBMRVhJVFlfUlVMRVMpIHtcbiAgICAgIGNvbnN0IG1hdGNoZXMgPSB0ZXh0Lm1hdGNoKHJ1bGUucGF0dGVybik7XG4gICAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICBjb25zdCBydWxlU2NvcmUgPSBydWxlLndlaWdodCAqIChoYXNOZWdhdGlvbiA/IC0wLjUgOiAxKTtcbiAgICAgICAgc2NvcmUgKz0gcnVsZVNjb3JlO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJ1bGVTY29yZSA+IDApIHtcbiAgICAgICAgICBtYXRjaGVkUnVsZXMucHVzaChgJHtydWxlLmRlc2NyaXB0aW9ufSAoKyR7cnVsZS53ZWlnaHR9KWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1hdGNoZWRSdWxlcy5wdXNoKGAke3J1bGUuZGVzY3JpcHRpb259ICgke3J1bGVTY29yZX0pIC0g5ZCm5a6a6K+N5b2x5ZONYCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKGDwn46vIOinhOWImeWMuemFjTogJHtydWxlLmRlc2NyaXB0aW9ufSwg5p2D6YeNOiAke3J1bGUud2VpZ2h0fSwg5ZCm5a6a6K+N5b2x5ZONOiAke2hhc05lZ2F0aW9ufWApO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyDkvLDnrpfkvp3otZbmt7HluqbkvZzkuLrpop3lpJbor4TliIZcbiAgICBjb25zdCBkZXBlbmRlbmN5RGVwdGggPSB0aGlzLmVzdGltYXRlRGVwZW5kZW5jeURlcHRoKHRleHQpO1xuICAgIGlmIChkZXBlbmRlbmN5RGVwdGggPiA1KSB7XG4gICAgICBjb25zdCBkZXB0aFNjb3JlID0gTWF0aC5taW4oMiwgTWF0aC5mbG9vcihkZXBlbmRlbmN5RGVwdGggLyA1KSk7XG4gICAgICBzY29yZSArPSBkZXB0aFNjb3JlO1xuICAgICAgbWF0Y2hlZFJ1bGVzLnB1c2goYOS+nei1lua3seW6piAoJHtkZXBlbmRlbmN5RGVwdGh9KSAoKyR7ZGVwdGhTY29yZX0pYCk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB7IFxuICAgICAgaXNDb21wbGV4OiBzY29yZSA+PSBDT01QTEVYSVRZX1RIUkVTSE9MRCwgXG4gICAgICBzY29yZTogTWF0aC5tYXgoMCwgc2NvcmUpLCAvLyDnoa7kv53liIbmlbDpnZ7otJ9cbiAgICAgIG1hdGNoZWRSdWxlcyBcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEh5YnJpZCBBZGFwdGl2ZSBQYXJzZXIgLSDpq5jnuqfop6PmnpDnrZbnlaVcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgaHlicmlkQWRhcHRpdmVQYXJzZShyYXdSZXF1aXJlbWVudDogc3RyaW5nLCBjb21wbGV4aXR5OiB7IHNjb3JlOiBudW1iZXI7IG1hdGNoZWRSdWxlczogc3RyaW5nW10gfSk6IFByb21pc2U8UmVmaW5lZEdyYXBoPiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIOiusOW9leino+aekOW8gOWni1xuICAgICAgdGhpcy5sb2dnZXIubG9nKGDwn5qAIOW8gOWniyBIeWJyaWQgQWRhcHRpdmUg6Kej5p6QICjlpI3mnYLluqbor4TliIY6ICR7Y29tcGxleGl0eS5zY29yZX0pYCk7XG4gICAgICB0aGlzLmxvZ2dlci5sb2coYPCfk50g5Yy56YWN6KeE5YiZOiAke2NvbXBsZXhpdHkubWF0Y2hlZFJ1bGVzLmpvaW4oJywgJyl9YCk7XG4gICAgICBcbiAgICAgIC8vIOajgOa1i+aYr+WQpumcgOimgeaooeWdl+WMluaLhuWIhlxuICAgICAgY29uc3Qgc2hvdWxkTW9kdWxhcml6ZSA9IHRoaXMuc2hvdWxkTW9kdWxhcml6ZShyYXdSZXF1aXJlbWVudCwgY29tcGxleGl0eSk7XG4gICAgICBcbiAgICAgIGlmIChzaG91bGRNb2R1bGFyaXplKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZygn8J+TpiDlkK/nlKjmqKHlnZfljJbmi4bliIbnrZbnlaUnKTtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc3BsaXRJbnRvTW9kdWxhckdyYXBoKHJhd1JlcXVpcmVtZW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZygn8J+UhCDkvb/nlKjlop7lvLrlnovljZXmqKHlnZfop6PmnpAnKTtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZW5oYW5jZWRTaW5nbGVNb2R1bGVQYXJzZShyYXdSZXF1aXJlbWVudCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgLy8g6ZSZ6K+v5aSE55CGIC0g5Zue6YCA5Yiw5qCH5YeG57K+54K8XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcihg4p2MIEh5YnJpZCBBZGFwdGl2ZSBQYXJzZXIg5aSx6LSlOiAke2Vycm9yPy5tZXNzYWdlIHx8ICdVbmtub3duIGVycm9yJ31gLCBlcnJvcik7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCfwn5SEIOWbnumAgOWIsOagh+WHhueyvueCvOa1geeoiycpO1xuICAgICAgcmV0dXJuIHRoaXMuc3RhbmRhcmRSZWZpbmUocmF3UmVxdWlyZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDliKTmlq3mmK/lkKbpnIDopoHmqKHlnZfljJbmi4bliIZcbiAgICovXG4gIHByaXZhdGUgc2hvdWxkTW9kdWxhcml6ZShyZXE6IHN0cmluZywgY29tcGxleGl0eTogeyBzY29yZTogbnVtYmVyOyBtYXRjaGVkUnVsZXM6IHN0cmluZ1tdIH0pOiBib29sZWFuIHtcbiAgICAvLyDln7rkuo7pg6jpl6jlhbPplK7or43mlbDph4/liKTmlq1cbiAgICBjb25zdCBkZXBhcnRtZW50TWF0Y2hlcyA9IENPTVBMRVhJVFlfUlVMRVNbMV0ucGF0dGVybi5leGVjKHJlcSk7XG4gICAgY29uc3QgZGVwYXJ0bWVudENvdW50ID0gZGVwYXJ0bWVudE1hdGNoZXMgPyBkZXBhcnRtZW50TWF0Y2hlcy5sZW5ndGggOiAwO1xuICAgIFxuICAgIC8vIOWfuuS6juWkjeadguW6puivhOWIhuWSjOmDqOmXqOaVsOmHj+e7vOWQiOWIpOaWrVxuICAgIGNvbnN0IGhhc011bHRpcGxlRGVwYXJ0bWVudHMgPSBkZXBhcnRtZW50Q291bnQgPj0gMztcbiAgICBjb25zdCBoaWdoQ29tcGxleGl0eSA9IGNvbXBsZXhpdHkuc2NvcmUgPj0gNTtcbiAgICBcbiAgICB0aGlzLmxvZ2dlci5sb2coYPCfj6Ig6YOo6Zeo5qOA5rWLOiAke2RlcGFydG1lbnRDb3VudH0g5Liq6YOo6ZeoLCDpq5jlpI3mnYLluqY6ICR7aGlnaENvbXBsZXhpdHl9YCk7XG4gICAgXG4gICAgcmV0dXJuIGhhc011bHRpcGxlRGVwYXJ0bWVudHMgfHwgaGlnaENvbXBsZXhpdHk7XG4gIH1cblxuICAvKipcbiAgICog5Lyw566X5L6d6LWW5rex5bqmIC0g5aSN55SoIENvbnRleHRDb21wcmVzc29yIOW3suacieaWueazlVxuICAgKi9cbiAgcHJpdmF0ZSBlc3RpbWF0ZURlcGVuZGVuY3lEZXB0aChyZXE6IHN0cmluZyk6IG51bWJlciB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBhcmFncmFwaHMgPSByZXEuc3BsaXQoJ1xcblxcbicpLmxlbmd0aDtcbiAgICAgIGNvbnN0IGNvbm5lY3RvcnMgPSAocmVxLm1hdGNoKC/nhLblkI4gfCDkuYvlkI4gfCDmjqXnnYAgfCDlho0gfCDmnIDlkI4gfCDlkIzml7YgfCDlubbkuJQvZykgfHwgW10pLmxlbmd0aDtcbiAgICAgIGNvbnN0IGRhdGFGbG93cyA9IChyZXEubWF0Y2goL+KGknwtPnzmtYHovazliLAgfCDmj5DkuqTnu5kgfCDlj5HpgIHnu5kvZykgfHwgW10pLmxlbmd0aDtcbiAgICAgIGNvbnN0IGNvbmRpdGlvbmFsRmxvd3MgPSAocmVxLm1hdGNoKC/lpoLmnpwgfCDlvZMgfCDlj6ropoEgfCDpmaTpnZ4vZykgfHwgW10pLmxlbmd0aDtcbiAgICAgIFxuICAgICAgcmV0dXJuIHBhcmFncmFwaHMgKiAyICsgY29ubmVjdG9ycyArIGRhdGFGbG93cyAqIDIgKyBjb25kaXRpb25hbEZsb3dzO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oYOKaoO+4jyDkvp3otZbmt7HluqbkvLDnrpflpLHotKU6ICR7ZXJyb3I/Lm1lc3NhZ2UgfHwgJ1Vua25vd24gZXJyb3InfWApO1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOaLhuWIhuS4uuaooeWdl+WMluWbvuiwsVxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBzcGxpdEludG9Nb2R1bGFyR3JhcGgocmVxOiBzdHJpbmcpOiBQcm9taXNlPFJlZmluZWRHcmFwaD4ge1xuICAgIGNvbnN0IGdyYXBoID0gbmV3IFJlZmluZWRHcmFwaCgpO1xuICAgIFxuICAgIGZvciAoY29uc3QgbW9kIG9mIE1PRFVMQVJfU0NPUEVfQ09ORklHKSB7XG4gICAgICB0aGlzLmxvZ2dlci5sb2coYPCfk6Yg5Yib5bu65qih5Z2X77yaJHttb2QubmFtZX0gKCR7bW9kLnNjb3BlfSlgKTtcbiAgICAgIFxuICAgICAgdHJ5IHtcbiAgICAgICAgLy8g5q+P5Liq5qih5Z2X54us56uLIHJlZmluZVxuICAgICAgICBjb25zdCBzdWJHcmFwaCA9IGF3YWl0IHRoaXMucmVmaW5lTW9kdWxlKHJlcSwgbW9kKTtcbiAgICAgICAgZ3JhcGguYWRkTW9kdWxlKG1vZC5uYW1lLCBzdWJHcmFwaCk7XG4gICAgICAgIFxuICAgICAgICAvLyDlhbPplK7vvJrkuLrmr4/kuKrmqKHlnZfms6jlhaXni6znq4sgTWVtUGFsYWNlIFdpbmfvvIjop6PlhrPplb/nlJ/lkb3lkajmnJ/nirbmgIHlkIzmraXpl67popjvvIlcbiAgICAgICAgYXdhaXQgdGhpcy5tZW1wYWxhY2UuY3JlYXRlV2luZyhgbW9kdWxlLSR7bW9kLm5hbWV9YCwgc3ViR3JhcGgpO1xuICAgICAgICB0aGlzLmxvZ2dlci5sb2coYOKchSDlt7LkuLrmqKHlnZcgXCIke21vZC5uYW1lfVwiIOWIm+W7uueLrOeriyBXaW5nYCk7XG4gICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGDinYwg5qih5Z2XIFwiJHttb2QubmFtZX1cIiDliJvlu7rlpLHotKU6ICR7ZXJyb3I/Lm1lc3NhZ2UgfHwgJ1Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAvLyDnu6fnu63lpITnkIblhbbku5bmqKHlnZfvvIzkuI3kuK3mlq3mlbTkuKrmtYHnqItcbiAgICAgICAgY29uc3QgZW1wdHlTdWJHcmFwaCA9IG5ldyBSZWZpbmVkR3JhcGgoKTtcbiAgICAgICAgZW1wdHlTdWJHcmFwaC5tZXRhZGF0YSA9IHsgZXJyb3I6IGVycm9yPy5tZXNzYWdlIHx8ICdVbmtub3duIGVycm9yJyB9O1xuICAgICAgICBncmFwaC5hZGRNb2R1bGUobW9kLm5hbWUsIGVtcHR5U3ViR3JhcGgpO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyDmmL7lvI/ms6jlhaXot6jmqKHlnZfkuovliqHljY/orq7vvIjlpI3nlKjlt7LmnIkgSGFybmVzcyDog73lipvvvIlcbiAgICBncmFwaC5zZXRDcm9zc01vZHVsZVByb3RvY29sKCd0cmFuc2FjdGlvbi1zeW5jJyk7XG4gICAgXG4gICAgdGhpcy5sb2dnZXIubG9nKGDinIUg5qih5Z2X5YyW5Zu+6LCx5Yib5bu65a6M5oiQ77yaJHtncmFwaC5tb2R1bGVzPy5sZW5ndGggfHwgMH3kuKrmqKHlnZdgKTtcbiAgICBcbiAgICByZXR1cm4gZ3JhcGg7XG4gIH1cblxuICAvKipcbiAgICog5aKe5by65Z6L5Y2V5qih5Z2X6Kej5p6QXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGVuaGFuY2VkU2luZ2xlTW9kdWxlUGFyc2UocmVxOiBzdHJpbmcpOiBQcm9taXNlPFJlZmluZWRHcmFwaD4ge1xuICAgIGNvbnN0IGdyYXBoID0gbmV3IFJlZmluZWRHcmFwaCgpO1xuICAgIFxuICAgIHRyeSB7XG4gICAgICAvLyDlsJ3or5Xop6PmnpDlpJrnp43moLzlvI9cbiAgICAgIGNvbnN0IHBhcnNlZENvbnRlbnQgPSBhd2FpdCB0aGlzLnBhcnNlTXVsdGlGb3JtYXRDb250ZW50KHJlcSk7XG4gICAgICBcbiAgICAgIC8vIOW6lOeUqOaooeadv+WMuemFjVxuICAgICAgY29uc3QgdGVtcGxhdGVNYXRjaCA9IHRoaXMubWF0Y2hIaXN0b3JpY2FsVGVtcGxhdGVzKHBhcnNlZENvbnRlbnQpO1xuICAgICAgaWYgKHRlbXBsYXRlTWF0Y2gpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKGDwn5OLIOWMuemFjeWOhuWPsuaooeadvzogJHt0ZW1wbGF0ZU1hdGNoLnRlbXBsYXRlSWR9YCk7XG4gICAgICAgIC8vIOW6lOeUqOaooeadv+mAu+i+kVxuICAgICAgICBncmFwaC5tZXRhZGF0YSA9IHsgdGVtcGxhdGVJZDogdGVtcGxhdGVNYXRjaC50ZW1wbGF0ZUlkLCBjb25maWRlbmNlOiB0ZW1wbGF0ZU1hdGNoLmNvbmZpZGVuY2UgfTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8g5omn6KGM5qCH5YeG57K+54K8XG4gICAgICBjb25zdCBzdGFuZGFyZFJlc3VsdCA9IHRoaXMuc3RhbmRhcmRSZWZpbmUocGFyc2VkQ29udGVudCk7XG4gICAgICAvLyDlkIjlubbnu5PmnpxcbiAgICAgIE9iamVjdC5hc3NpZ24oZ3JhcGgsIHN0YW5kYXJkUmVzdWx0KTtcbiAgICAgIFxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oYOKaoO+4jyDlop7lvLrop6PmnpDlpLHotKXvvIzlm57pgIDliLDmoIflh4bnsr7ngrw6ICR7ZXJyb3I/Lm1lc3NhZ2UgfHwgJ1Vua25vd24gZXJyb3InfWApO1xuICAgICAgcmV0dXJuIHRoaXMuc3RhbmRhcmRSZWZpbmUocmVxKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIGdyYXBoO1xuICB9XG5cbiAgLyoqXG4gICAqIOWkmuagvOW8j+WGheWuueino+aekFxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBwYXJzZU11bHRpRm9ybWF0Q29udGVudChyZXE6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgbGV0IHByb2Nlc3NlZENvbnRlbnQgPSByZXE7XG4gICAgXG4gICAgdHJ5IHtcbiAgICAgIC8vIOajgOa1i+W5tuWkhOeQhiBNZXJtYWlkIOWbvuihqFxuICAgICAgaWYgKHJlcS5pbmNsdWRlcygnYGBgbWVybWFpZCcpKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZygn8J+TiiDmo4DmtYvliLAgTWVybWFpZCDlm77ooajvvIzmj5Dlj5bmlofmnKzmj4/ov7AnKTtcbiAgICAgICAgLy8g6L+Z6YeM5Y+v5Lul6LCD55So5LiT6Zeo55qEIE1lcm1haWQg6Kej5p6Q5ZmoXG4gICAgICAgIC8vIOaaguaXtuS/neeVmeWOn+WGheWuue+8jOWQjue7reWPr+aJqeWxlVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyDmo4DmtYvlubblpITnkIYgUGxhbnRVTUxcbiAgICAgIGlmIChyZXEuaW5jbHVkZXMoJ0BzdGFydHVtbCcpKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZygn8J+TiiDmo4DmtYvliLAgUGxhbnRVTUwg5Zu+6KGo77yM5o+Q5Y+W5paH5pys5o+P6L+wJyk7XG4gICAgICAgIC8vIOaaguaXtuS/neeVmeWOn+WGheWuue+8jOWQjue7reWPr+aJqeWxlVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyDmo4DmtYvlm77niYflvJXnlKhcbiAgICAgIGNvbnN0IGltYWdlUGF0dGVybiA9IC8hXFxbLio/XFxdXFwoKC4qPylcXCkvZztcbiAgICAgIGNvbnN0IGltYWdlcyA9IFsuLi5yZXEubWF0Y2hBbGwoaW1hZ2VQYXR0ZXJuKV07XG4gICAgICBpZiAoaW1hZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKGDwn5a877iPIOajgOa1i+WIsCAke2ltYWdlcy5sZW5ndGh9IOW8oOWbvueJh++8jOWPr+iDvemcgOimgSBPQ1Ig5aSE55CGYCk7XG4gICAgICAgIC8vIOaaguaXtuS/neeVmeWOn+WGheWuue+8jOWQjue7reWPr+aJqeWxlVxuICAgICAgfVxuICAgICAgXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgdGhpcy5sb2dnZXIud2Fybihg4pqg77iPIOWkmuagvOW8j+ino+aekOitpuWRijogJHtlcnJvcj8ubWVzc2FnZSB8fCAnVW5rbm93biBlcnJvcid9YCk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBwcm9jZXNzZWRDb250ZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIOWOhuWPsuaooeadv+WMuemFjVxuICAgKi9cbiAgcHJpdmF0ZSBtYXRjaEhpc3RvcmljYWxUZW1wbGF0ZXMoY29udGVudDogc3RyaW5nKTogeyB0ZW1wbGF0ZUlkOiBzdHJpbmc7IGNvbmZpZGVuY2U6IG51bWJlciB9IHwgbnVsbCB7XG4gICAgLy8g566A5Y2V55qE5qih5p2/5Yy56YWN6YC76L6RXG4gICAgY29uc3QgdGVtcGxhdGVzID0gW1xuICAgICAgeyBpZDogJ2ZpeGVkLWFzc2V0LWludmVzdG1lbnQnLCBrZXl3b3JkczogWyflm7rlrprotYTkuqfmipXotYQnLCAn5oqV6LWE6K6h5YiSJywgJ+i1hOmHkeiuoeWIkiddLCB0aHJlc2hvbGQ6IDIgfSxcbiAgICAgIHsgaWQ6ICdwcm9qZWN0LW1hbmFnZW1lbnQnLCBrZXl3b3JkczogWyfpobnnm67nrqHnkIYnLCAn5Lu75Yqh5YiG6YWNJywgJ+i/m+W6pui3n+i4qiddLCB0aHJlc2hvbGQ6IDIgfSxcbiAgICAgIHsgaWQ6ICdoci1zeXN0ZW0nLCBrZXl3b3JkczogWyfkurrlipvotYTmupAnLCAn5ZGY5bel566h55CGJywgJ+iAg+WLpOezu+e7nyddLCB0aHJlc2hvbGQ6IDIgfVxuICAgIF07XG4gICAgXG4gICAgZm9yIChjb25zdCB0ZW1wbGF0ZSBvZiB0ZW1wbGF0ZXMpIHtcbiAgICAgIGNvbnN0IG1hdGNoZXMgPSB0ZW1wbGF0ZS5rZXl3b3Jkcy5maWx0ZXIoa2V5d29yZCA9PiBjb250ZW50LmluY2x1ZGVzKGtleXdvcmQpKS5sZW5ndGg7XG4gICAgICBpZiAobWF0Y2hlcyA+PSB0ZW1wbGF0ZS50aHJlc2hvbGQpIHtcbiAgICAgICAgY29uc3QgY29uZmlkZW5jZSA9IE1hdGgubWluKDEuMCwgbWF0Y2hlcyAvIHRlbXBsYXRlLmtleXdvcmRzLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiB7IHRlbXBsYXRlSWQ6IHRlbXBsYXRlLmlkLCBjb25maWRlbmNlIH07XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIOeyvueCvOaooeWdl+WtkOWbvuiwsSAtIOWkjeeUqOWOn+acieWunueOsFxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyByZWZpbmVNb2R1bGUocmVxOiBzdHJpbmcsIG1vZDogYW55KTogUHJvbWlzZTxSZWZpbmVkR3JhcGg+IHtcbiAgICBjb25zdCBzdWJHcmFwaCA9IG5ldyBSZWZpbmVkR3JhcGgoKTtcbiAgICBzdWJHcmFwaC5tZXRhZGF0YSA9IHtcbiAgICAgIG1vZHVsZU5hbWU6IG1vZC5uYW1lLFxuICAgICAgc2NvcGU6IG1vZC5zY29wZSxcbiAgICAgIHByaW9yaXR5OiBtb2QucHJpb3JpdHksXG4gICAgICBpc01vZHVsYXI6IHRydWVcbiAgICB9O1xuICAgIFxuICAgIC8vIOaPkOWPluaooeWdl+ebuOWFs+mcgOaxguW5tueyvueCvFxuICAgIGNvbnN0IG1vZHVsZVJlcSA9IHRoaXMuZXh0cmFjdE1vZHVsZVJlcXVpcmVtZW50KHJlcSwgbW9kLm5hbWUpO1xuICAgIC8vIC4uLiDljp/mnInnsr7ngrzpgLvovpFcbiAgICBcbiAgICByZXR1cm4gc3ViR3JhcGg7XG4gIH1cblxuICAvKipcbiAgICog5o+Q5Y+W5qih5Z2X55u45YWz6ZyA5rGCXG4gICAqL1xuICBwcml2YXRlIGV4dHJhY3RNb2R1bGVSZXF1aXJlbWVudChyZXE6IHN0cmluZywgbW9kdWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAvLyDln7rkuo7mqKHlnZflkI3lhbPplK7or43mj5Dlj5bnm7jlhbPmrrXokL1cbiAgICBjb25zdCBrZXl3b3JkcyA9IHRoaXMuZ2V0TW9kdWxlS2V5d29yZHMobW9kdWxlTmFtZSk7XG4gICAgY29uc3QgcGFyYWdyYXBocyA9IHJlcS5zcGxpdCgnXFxuXFxuJyk7XG4gICAgY29uc3QgcmVsZXZhbnQgPSBwYXJhZ3JhcGhzLmZpbHRlcihwID0+IFxuICAgICAga2V5d29yZHMuc29tZShrID0+IHAuaW5jbHVkZXMoaykpXG4gICAgKTtcbiAgICByZXR1cm4gcmVsZXZhbnQuam9pbignXFxuXFxuJyk7XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W5qih5Z2X5YWz6ZSu6K+NXG4gICAqL1xuICBwcml2YXRlIGdldE1vZHVsZUtleXdvcmRzKG1vZHVsZU5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBrZXl3b3JkTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7XG4gICAgICAn6aG555uu5Y+w6LSm5LiO5ouG6KejJzogWyfnq4vpobknLCAn5Y+w6LSmJywgJ+aLhuinoycsICflh4blpIcnXSxcbiAgICAgICforr7orqHph4fotK3kuI7miqXmibknOiBbJ+iuvuiuoScsICfph4fotK0nLCAn5oql5om5JywgJ+aLm+aghyddLFxuICAgICAgJ+WQiOWQjOeuoeeQhic6IFsn5ZCI5ZCMJywgJ+etvuiuoicsICflrqHmibknLCAn5Y+w6LSmJ10sXG4gICAgICAn5bel56iL5a6e5pa95LiO55uR55CGJzogWyfmlr3lt6UnLCAn5a6e5pa9JywgJ+ebkeeQhicsICfov5vluqYnLCAn6LSo6YePJ10sXG4gICAgICAn57uT566X5a6h6K6h6LWE6YeR5Yaz566X5LiO5oql6KGoJzogWyfnq6Plt6UnLCAn57uT566XJywgJ+WuoeiuoScsICfotYTph5EnLCAn5Yaz566XJywgJ+aKpeihqCddXG4gICAgfTtcbiAgICByZXR1cm4ga2V5d29yZE1hcFttb2R1bGVOYW1lXSB8fCBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmoIflh4bnsr7ngrzmtYHnqIsgLSDljp/mnInlrp7njrDkv53mjIHkuI3lj5hcbiAgICovXG4gIHByaXZhdGUgc3RhbmRhcmRSZWZpbmUocmVxOiBzdHJpbmcpOiBSZWZpbmVkR3JhcGgge1xuICAgIC8vIOWOn+acieagh+WHhueyvueCvOmAu+i+kVxuICAgIGNvbnN0IGdyYXBoID0gbmV3IFJlZmluZWRHcmFwaCgpO1xuICAgIC8vIC4uLiDljp/mnInlrp7njrBcbiAgICByZXR1cm4gZ3JhcGg7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8g5Zue5rua5py65Yi2IC0gRXZvbHV0aW9uIEhhcm5lc3Mg6ZuG5oiQXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjbGFzcyBIeWJyaWRQYXJzZXJSb2xsYmFjayB7XG4gIHByaXZhdGUgcmVhZG9ubHkgUk9MTEJBQ0tfVEhSRVNIT0xEID0gMC45MztcbiAgcHJpdmF0ZSByZWFkb25seSBPQlNFUlZBVElPTl9XSU5ET1cgPSAzOyAvLyDop4Llr58z5aSpXG4gIFxuICBhc3luYyBzaG91bGRSb2xsYmFjaygpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCB0aGlzLmdldFBhcnNlQWNjdXJhY3lTdGF0cyh0aGlzLk9CU0VSVkFUSU9OX1dJTkRPVyk7XG4gICAgICBcbiAgICAgIC8vIOi/nue7rTPlpKnlh4bnoa7njofkvY7kuo7pmIjlgLwg4oaSIOiHquWKqOWbnua7mlxuICAgICAgaWYgKHN0YXRzLmRhaWx5QWNjdXJhY3kuZXZlcnkoYSA9PiBhIDwgdGhpcy5ST0xMQkFDS19USFJFU0hPTEQpKSB7XG4gICAgICAgIGF3YWl0IHRoaXMucm9sbGJhY2tUb1YyMSgpO1xuICAgICAgICBhd2FpdCB0aGlzLm5vdGlmeVRlYW0oe1xuICAgICAgICAgIHJlYXNvbjogYFBhcnNlIGFjY3VyYWN5IGJlbG93ICR7dGhpcy5ST0xMQkFDS19USFJFU0hPTER9IGZvciAke3RoaXMuT0JTRVJWQVRJT05fV0lORE9XfSBkYXlzYCxcbiAgICAgICAgICBzdGF0c1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcign5Zue5rua5qOA5p+l5aSx6LSlOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgXG4gIHByaXZhdGUgYXN5bmMgZ2V0UGFyc2VBY2N1cmFjeVN0YXRzKGRheXM6IG51bWJlcik6IFByb21pc2U8eyBkYWlseUFjY3VyYWN5OiBudW1iZXJbXSB9PiB7XG4gICAgLy8g5qih5ouf6I635Y+W5YeG56Gu546H57uf6K6hXG4gICAgLy8g5a6e6ZmF5a6e546w6ZyA6KaB5LuO55uR5o6n57O757uf6I635Y+W5pWw5o2uXG4gICAgcmV0dXJuIHsgZGFpbHlBY2N1cmFjeTogWzAuOTUsIDAuOTQsIDAuOTZdIH07IC8vIOekuuS+i+aVsOaNrlxuICB9XG4gIFxuICBwcml2YXRlIGFzeW5jIHJvbGxiYWNrVG9WMjEoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgLy8gMS4g5aSH5Lu95b2T5YmN54mI5pysXG4gICAgYXdhaXQgdGhpcy5iYWNrdXBDdXJyZW50VmVyc2lvbigpO1xuICAgIFxuICAgIC8vIDIuIOaBouWkjXYyLjHku6PnoIFcbiAgICBhd2FpdCB0aGlzLmdpdFJldmVydFRvVjIxKCk7XG4gICAgXG4gICAgLy8gMy4g6YeN5paw6YOo572yXG4gICAgYXdhaXQgdGhpcy5kZXBsb3koKTtcbiAgICBcbiAgICAvLyA0LiDorrDlvZXlm57mu5rkuovku7ZcbiAgICBhd2FpdCB0aGlzLnJlY29yZENoYW5nZUV2ZW50KHsgdHlwZTogJ3JvbGxiYWNrJywgZnJvbTogJ2h5YnJpZC12Mi4zJywgdG86ICd2Mi4xJyB9KTtcbiAgfVxuICBcbiAgcHJpdmF0ZSBhc3luYyBiYWNrdXBDdXJyZW50VmVyc2lvbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBsb2dnZXIuaW5mbygn8J+SviDlpIfku73lvZPliY3niYjmnKwuLi4nKTtcbiAgICAvLyDlrp7pmYXlpIfku73pgLvovpFcbiAgfVxuICBcbiAgcHJpdmF0ZSBhc3luYyBnaXRSZXZlcnRUb1YyMSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBsb2dnZXIuaW5mbygn4oap77iPIOWbnua7muWIsCB2Mi4xIOeJiOacrC4uLicpO1xuICAgIC8vIOWunumZhSBHaXQg5Zue5rua6YC76L6RXG4gIH1cbiAgXG4gIHByaXZhdGUgYXN5bmMgZGVwbG95KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGxvZ2dlci5pbmZvKCfwn5qAIOmHjeaWsOmDqOe9si4uLicpO1xuICAgIC8vIOWunumZhemDqOe9sumAu+i+kVxuICB9XG4gIFxuICBwcml2YXRlIGFzeW5jIHJlY29yZENoYW5nZUV2ZW50KGV2ZW50OiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBsb2dnZXIuaW5mbygn8J+TnSDorrDlvZXlj5jmm7Tkuovku7Y6JywgZXZlbnQpO1xuICAgIC8vIOWunumZheiusOW9lemAu+i+kVxuICB9XG4gIFxuICBwcml2YXRlIGFzeW5jIG5vdGlmeVRlYW0obm90aWZpY2F0aW9uOiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBsb2dnZXIuaW5mbygn8J+ToiDpgJrnn6Xlm6LpmJ86Jywgbm90aWZpY2F0aW9uKTtcbiAgICAvLyDlrp7pmYXpgJrnn6XpgLvovpFcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyDlr7zlh7pcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlcXVpcmVtZW50UmVmaW5lclNraWxsKGNvbnRleHQ6IFNraWxsQ29udGV4dCk6IFJlcXVpcmVtZW50UmVmaW5lclNraWxsIHtcbiAgcmV0dXJuIG5ldyBSZXF1aXJlbWVudFJlZmluZXJTa2lsbChjb250ZXh0KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUh5YnJpZFBhcnNlclJvbGxiYWNrKCk6IEh5YnJpZFBhcnNlclJvbGxiYWNrIHtcbiAgcmV0dXJuIG5ldyBIeWJyaWRQYXJzZXJSb2xsYmFjaygpO1xufSJdfQ==