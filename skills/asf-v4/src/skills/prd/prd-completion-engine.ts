/**
 * PRD Completion Engine - PRD 智能补全引擎
 * 
 * 核心引擎：解析 PRD，检测缺失内容，基于知识库智能补全
 * 
 * @module asf-v4/skills/prd/prd-completion-engine
 * @version 1.0.0
 */

import { DomainKnowledgeBase, OrgStructure, RolePermission, FlowPattern, FieldStandard, QueryTemplate, HistoricalTemplate } from '../../knowledge/domain-knowledge-base';
import { ConfidenceCalculator } from './confidence-calculator';

/**
 * 补全结果
 */
export interface CompletionResult {
  originalPrd: string;
  completedPrd: string;
  completions: Completion[];
  confidence: number;
  needsReview: Completion[];
}

/**
 * 补全项
 */
export interface Completion {
  id: string;
  type: 'org_structure' | 'permission' | 'flow' | 'field' | 'query' | 'template';
  content: any;
  confidence: number;
  displayType: 'tree' | 'table' | 'flow' | 'text';
  suggestion: string;
  location?: {
    section: string;
    line?: number;
  };
  autoApplied?: boolean;
}

/**
 * 补全配置
 */
export interface CompletionConfig {
  autoApplyThreshold: number;  // 自动应用阈值，默认 0.85
  minConfidence: number;       // 最小置信度，默认 0.5
}

/**
 * PRD 补全引擎
 */
export class PRDCompletionEngine {
  private knowledgeBase: DomainKnowledgeBase;
  private confidenceCalculator: ConfidenceCalculator;
  private config: CompletionConfig;

  constructor(
    knowledgeBase: DomainKnowledgeBase,
    confidenceCalculator: ConfidenceCalculator,
    config?: Partial<CompletionConfig>
  ) {
    this.knowledgeBase = knowledgeBase;
    this.confidenceCalculator = confidenceCalculator;
    this.config = {
      autoApplyThreshold: 0.85,
      minConfidence: 0.5,
      ...config
    };
  }

  /**
   * 获取置信度计算器（供外部访问）
   */
  getConfidenceCalculator(): ConfidenceCalculator {
    return this.confidenceCalculator;
  }

  /**
   * 补全 PRD - 主入口
   */
  async complete(prd: string, industry: string = 'education'): Promise<CompletionResult> {
    const completions: Completion[] = [];

    // 1. 组织架构补全
    const orgCompletions = await this.completeOrgStructure(prd, industry);
    completions.push(...orgCompletions);

    // 2. 权限模型补全
    const permissionCompletions = await this.completePermissions(prd, industry);
    completions.push(...permissionCompletions);

    // 3. 流程补全
    const flowCompletions = await this.completeFlows(prd);
    completions.push(...flowCompletions);

    // 4. 字段补全
    const fieldCompletions = await this.completeFields(prd);
    completions.push(...fieldCompletions);

    // 5. 查询条件补全
    const queryCompletions = await this.completeQueries(prd);
    completions.push(...queryCompletions);

    // 6. 历史模板匹配
    const templateCompletions = await this.matchHistoricalTemplate(prd);
    completions.push(...templateCompletions);

    // 计算置信度
    for (const completion of completions) {
      completion.confidence = this.confidenceCalculator.calculate(completion, { prd, industry });
      completion.autoApplied = completion.confidence >= this.config.autoApplyThreshold;
    }

    // 分离需要人工确认的补全（置信度<85%）
    const needsReview = completions.filter(c => c.confidence < this.config.autoApplyThreshold);
    const autoApply = completions.filter(c => c.confidence >= this.config.autoApplyThreshold);

    // 应用自动补全
    let completedPrd = prd;
    for (const completion of autoApply) {
      completedPrd = this.applyCompletion(completedPrd, completion);
    }

    // 计算整体置信度
    const overallConfidence = completions.length > 0
      ? completions.reduce((sum, c) => sum + c.confidence, 0) / completions.length
      : 1;

    return {
      originalPrd: prd,
      completedPrd,
      completions,
      confidence: overallConfidence,
      needsReview
    };
  }

  /**
   * 组织架构补全
   */
  private async completeOrgStructure(prd: string, industry: string): Promise<Completion[]> {
    const template = this.knowledgeBase.getOrgStructure(industry);
    if (!template) return [];

    // 检测 PRD 中是否已有组织架构描述
    const hasOrg = this.hasOrgStructure(prd);
    if (hasOrg) return [];

    return [{
      id: `org_${Date.now()}`,
      type: 'org_structure',
      content: template.departments,
      confidence: 0, // 将由外部计算
      displayType: 'tree',
      suggestion: `建议补充组织架构：${template.departments.map(d => d.name).join(' → ')}`
    }];
  }

  /**
   * 权限模型补全
   */
  private async completePermissions(prd: string, industry: string): Promise<Completion[]> {
    const template = this.knowledgeBase.getRolePermission(industry);
    if (!template) return [];

    // 提取 PRD 中提到的角色
    const mentionedRoles = await this.extractRoles(prd);
    const missingRoles = template.roles.filter(r => !mentionedRoles.includes(r.name));

    if (missingRoles.length === 0) return [];

    return [{
      id: `perm_${Date.now()}`,
      type: 'permission',
      content: missingRoles,
      confidence: 0,
      displayType: 'table',
      suggestion: `建议补充以下角色权限：${missingRoles.map(r => r.name).join(', ')}`
    }];
  }

  /**
   * 流程补全
   */
  private async completeFlows(prd: string): Promise<Completion[]> {
    const completions: Completion[] = [];
    const flows = await this.extractFlowDescriptions(prd);

    for (const flow of flows) {
      // 匹配流程模式
      const matchedPattern = this.knowledgeBase.getAllFlowPatterns().find(p =>
        flow.description.includes(p.domain) || flow.name.includes(p.name)
      );

      if (matchedPattern && !this.hasCompleteFlow(prd, matchedPattern)) {
        completions.push({
          id: `flow_${Date.now()}_${flow.id}`,
          type: 'flow',
          content: matchedPattern,
          confidence: 0,
          displayType: 'flow',
          suggestion: `建议补充完整的${matchedPattern.name}流程`,
          location: { section: flow.section }
        });
      }
    }

    return completions;
  }

  /**
   * 字段补全
   */
  private async completeFields(prd: string): Promise<Completion[]> {
    const completions: Completion[] = [];
    const entities = await this.extractEntities(prd);

    for (const entity of entities) {
      const standard = this.knowledgeBase.getFieldStandard(entity.type);
      if (!standard) continue;

      const existingFields = await this.extractFields(prd, entity.name);
      const missingFields = standard.requiredFields.filter(f => !existingFields.includes(f.name));

      if (missingFields.length > 0) {
        completions.push({
          id: `field_${Date.now()}_${entity.id}`,
          type: 'field',
          content: missingFields,
          confidence: 0,
          displayType: 'table',
          suggestion: `建议为实体"${entity.name}"补充字段：${missingFields.map(f => f.name).join(', ')}`,
          location: { section: entity.section }
        });
      }
    }

    return completions;
  }

  /**
   * 查询条件补全
   */
  private async completeQueries(prd: string): Promise<Completion[]> {
    const completions: Completion[] = [];
    const scenes = await this.extractQueryScenes(prd);

    for (const scene of scenes) {
      const template = this.knowledgeBase.getQueryTemplate(scene.type);
      if (template && !this.hasQueryConditions(prd, scene)) {
        completions.push({
          id: `query_${Date.now()}_${scene.id}`,
          type: 'query',
          content: template.defaultConditions,
          confidence: 0,
          displayType: 'table',
          suggestion: `建议为${scene.name}补充查询条件：${template.defaultConditions.map(c => c.name).join(', ')}`,
          location: { section: scene.section }
        });
      }
    }

    return completions;
  }

  /**
   * 历史模板匹配
   */
  private async matchHistoricalTemplate(prd: string): Promise<Completion[]> {
    const similarTemplates = this.knowledgeBase.findSimilarTemplates(prd);

    if (similarTemplates.length === 0) return [];

    const bestMatch = similarTemplates[0];
    if (bestMatch.similarity < 0.7) return [];

    return [{
      id: `template_${Date.now()}`,
      type: 'template',
      content: bestMatch.template.structure,
      confidence: 0,
      displayType: 'text',
      suggestion: `检测到与历史项目"${bestMatch.template.name}"相似 (相似度${(bestMatch.similarity * 100).toFixed(0)}%)，建议参考其 PRD 结构`
    }];
  }

  /**
   * 应用补全到 PRD
   */
  private applyCompletion(prd: string, completion: Completion): string {
    // 根据补全类型应用修改
    switch (completion.type) {
      case 'org_structure':
        return this.insertOrgStructure(prd, completion.content);
      case 'permission':
        return this.insertPermissions(prd, completion.content);
      case 'flow':
        return this.insertFlow(prd, completion.content);
      case 'field':
        return this.insertFields(prd, completion.content);
      case 'query':
        return this.insertQueryConditions(prd, completion.content);
      default:
        return prd;
    }
  }

  // ============================================================================
  // 辅助方法 - 检测
  // ============================================================================

  /**
   * 检测 PRD 中是否有组织架构
   */
  private hasOrgStructure(prd: string): boolean {
    const orgKeywords = ['组织架构', '部门', '职责', '组织结构', '部门设置'];
    return orgKeywords.some(keyword => prd.includes(keyword));
  }

  /**
   * 检测 PRD 中是否有完整的流程
   */
  private hasCompleteFlow(prd: string, pattern: FlowPattern): boolean {
    // 检查是否包含流程的所有关键节点
    const nodeNames = pattern.nodes.map(n => n.name);
    const matchCount = nodeNames.filter(name => prd.includes(name)).length;
    return matchCount >= nodeNames.length * 0.7; // 70% 节点已提及视为完整
  }

  /**
   * 检测 PRD 中是否有查询条件
   */
  private hasQueryConditions(prd: string, scene: any): boolean {
    const queryKeywords = ['查询', '筛选', '搜索', '条件'];
    return queryKeywords.some(keyword => prd.includes(keyword));
  }

  // ============================================================================
  // 辅助方法 - 提取
  // ============================================================================

  /**
   * 提取 PRD 中提到的角色
   */
  private async extractRoles(prd: string): Promise<string[]> {
    const rolePatterns = [
      /(\w+经理)/g,
      /(\w+主管)/g,
      /(\w+员)/g,
      /(管理员)/g,
      /(审计 [员司])/g,
      /(财务 [人员司]?)/g
    ];

    const roles = new Set<string>();

    for (const pattern of rolePatterns) {
      const matches = prd.match(pattern);
      if (matches) {
        matches.forEach(m => roles.add(m));
      }
    }

    return Array.from(roles);
  }

  /**
   * 提取 PRD 中的流程描述
   */
  private async extractFlowDescriptions(prd: string): Promise<Array<{ id: string; name: string; description: string; section: string }>> {
    const flows: Array<{ id: string; name: string; description: string; section: string }> = [];
    
    // 检测流程关键词
    const flowKeywords = ['流程', '审批', '工作流', '步骤', '环节'];
    const sections = prd.split(/\n\n+/);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (flowKeywords.some(k => section.includes(k))) {
        flows.push({
          id: `flow_${i}`,
          name: `流程${i + 1}`,
          description: section,
          section: `section_${i}`
        });
      }
    }

    return flows;
  }

  /**
   * 提取 PRD 中的实体
   */
  private async extractEntities(prd: string): Promise<Array<{ id: string; name: string; type: string; section: string }>> {
    const entities: Array<{ id: string; name: string; type: string; section: string }> = [];
    
    // 实体类型映射
    const entityPatterns: Record<string, RegExp> = {
      'project': /项目/g,
      'contract': /合同/g,
      'order': /订单/g,
      'user': /用户/g,
      'task': /任务/g
    };

    const sections = prd.split(/\n\n+/);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      for (const [type, pattern] of Object.entries(entityPatterns)) {
        if (pattern.test(section)) {
          entities.push({
            id: `entity_${type}_${i}`,
            name: type,
            type,
            section: `section_${i}`
          });
        }
      }
    }

    return entities;
  }

  /**
   * 提取 PRD 中的字段
   */
  private async extractFields(prd: string, entityName: string): Promise<string[]> {
    const fieldPatterns = [
      /(\w+) 字段/g,
      /(\w+) 属性/g,
      /(\w+) 信息/g,
      /包括[\s\S]*?(?:、|,|\n)/g
    ];

    const fields = new Set<string>();

    for (const pattern of fieldPatterns) {
      const matches = prd.match(pattern);
      if (matches) {
        matches.forEach(m => {
          // 简化处理，提取字段名
          const fieldName = m.replace(/字段 | 属性 | 信息 | 包括/g, '').trim();
          if (fieldName) fields.add(fieldName);
        });
      }
    }

    return Array.from(fields);
  }

  /**
   * 提取 PRD 中的查询场景
   */
  private async extractQueryScenes(prd: string): Promise<Array<{ id: string; name: string; type: string; section: string }>> {
    const scenes: Array<{ id: string; name: string; type: string; section: string }> = [];
    
    const scenePatterns = [
      { type: '列表查询', pattern: /列表 | 清单 | 汇总/g },
      { type: '报表查询', pattern: /报表 | 统计 | 分析/g },
      { type: '筛选', pattern: /筛选 | 过滤 | 搜索/g }
    ];

    const sections = prd.split(/\n\n+/);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      for (const scene of scenePatterns) {
        if (scene.pattern.test(section)) {
          scenes.push({
            id: `scene_${scene.type}_${i}`,
            name: scene.type,
            type: scene.type,
            section: `section_${i}`
          });
        }
      }
    }

    return scenes;
  }

  // ============================================================================
  // 辅助方法 - 插入
  // ============================================================================

  /**
   * 插入组织架构到 PRD
   */
  private insertOrgStructure(prd: string, content: OrgStructure['departments']): string {
    const orgSection = `\n\n## 组织架构\n\n建议的组织架构如下：\n\n${content.map(d => `- **${d.name}**: ${d.responsibilities.join('、')}`).join('\n')}\n`;
    return prd + orgSection;
  }

  /**
   * 插入权限模型到 PRD
   */
  private insertPermissions(prd: string, content: any[]): string {
    const permSection = `\n\n## 角色权限\n\n建议补充以下角色：\n\n${content.map(r => `- **${r.name}**: ${r.description} (权限：${r.permissions.join(', ')})`).join('\n')}\n`;
    return prd + permSection;
  }

  /**
   * 插入流程到 PRD
   */
  private insertFlow(prd: string, content: FlowPattern): string {
    const flowSection = `\n\n## 业务流程\n\n建议的${content.name}流程：\n\n${content.nodes.map(n => `${n.name}`).join(' → ')}\n`;
    return prd + flowSection;
  }

  /**
   * 插入字段到 PRD
   */
  private insertFields(prd: string, content: any[]): string {
    const fieldSection = `\n\n## 数据字段\n\n建议补充以下字段：\n\n${content.map(f => `- **${f.name}** (${f.type}): ${f.description || ''}`).join('\n')}\n`;
    return prd + fieldSection;
  }

  /**
   * 插入查询条件到 PRD
   */
  private insertQueryConditions(prd: string, content: any[]): string {
    const querySection = `\n\n## 查询条件\n\n建议补充以下查询条件：\n\n${content.map(c => `- **${c.label}** (${c.type})`).join('\n')}\n`;
    return prd + querySection;
  }
}

// ============================================================================
// 导出
// ============================================================================

export function createPRDCompletionEngine(
  knowledgeBase: DomainKnowledgeBase,
  confidenceCalculator: ConfidenceCalculator
): PRDCompletionEngine {
  return new PRDCompletionEngine(knowledgeBase, confidenceCalculator);
}
