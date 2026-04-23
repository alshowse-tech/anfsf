/**
 * Confidence Calculator - 置信度计算器
 * 
 * 计算 PRD 补全建议的置信度，基于多维度评分
 * 
 * @module asf-v4/skills/prd/confidence-calculator
 * @version 1.0.0
 */

import { Completion } from './prd-completion-engine';

/**
 * 置信度上下文
 */
export interface ConfidenceContext {
  prd: string;
  industry: string;
  historicalAccuracy?: number;
}

/**
 * 置信度评分维度权重
 */
const SCORING_WEIGHTS = {
  knowledgeMatch: 0.4,      // 知识库匹配度 40%
  historicalAccuracy: 0.3,  // 历史准确率 30%
  ruleCertainty: 0.2,       // 规则确定性 20%
  contextConsistency: 0.1   // 上下文一致性 10%
};

/**
 * 置信度计算器
 */
export class ConfidenceCalculator {
  // 历史准确率缓存 - key: `${industry}_${type}`
  private historicalAccuracy: Map<string, number> = new Map();

  /**
   * 计算置信度
   */
  calculate(completion: Completion, context: ConfidenceContext): number {
    let confidence = 0;

    // 1. 知识库匹配度（40% 权重）
    const knowledgeMatch = this.getKnowledgeMatchScore(completion);
    confidence += knowledgeMatch * SCORING_WEIGHTS.knowledgeMatch;

    // 2. 历史准确率（30% 权重）
    const historicalAccuracy = this.getHistoricalAccuracy(completion.type, context.industry);
    confidence += historicalAccuracy * SCORING_WEIGHTS.historicalAccuracy;

    // 3. 规则确定性（20% 权重）
    const ruleCertainty = this.getRuleCertainty(completion);
    confidence += ruleCertainty * SCORING_WEIGHTS.ruleCertainty;

    // 4. 上下文一致性（10% 权重）
    const contextConsistency = this.checkContextConsistency(completion, context.prd);
    confidence += contextConsistency * SCORING_WEIGHTS.contextConsistency;

    return Math.min(confidence, 1.0);
  }

  /**
   * 获取知识库匹配度分数
   */
  private getKnowledgeMatchScore(completion: Completion): number {
    // 基于补全类型返回基础匹配度
    const baseScores: Record<Completion['type'], number> = {
      'org_structure': 0.95,  // 组织架构模板匹配度高
      'field': 0.90,          // 字段标准匹配度高
      'query': 0.85,          // 查询模板匹配度中高
      'permission': 0.80,     // 权限模型匹配度中
      'flow': 0.75,           // 流程模式匹配度中
      'template': 0.70        // 历史模板匹配度较低
    };

    const baseScore = baseScores[completion.type] || 0.70;

    // 根据内容质量调整
    if (completion.content) {
      if (Array.isArray(completion.content) && completion.content.length > 0) {
        return Math.min(1.0, baseScore + 0.05);
      }
      if (typeof completion.content === 'object' && Object.keys(completion.content).length > 0) {
        return Math.min(1.0, baseScore + 0.03);
      }
    }

    return baseScore;
  }

  /**
   * 获取历史准确率
   */
  private getHistoricalAccuracy(type: string, industry: string): number {
    const key = `${industry}_${type}`;
    const accuracy = this.historicalAccuracy.get(key);
    
    // 默认 75% 准确率
    return accuracy !== undefined ? accuracy : 0.75;
  }

  /**
   * 获取规则确定性
   */
  private getRuleCertainty(completion: Completion): number {
    // 基于内容确定性返回分数
    if (!completion.content) {
      return 0.50;
    }

    if (Array.isArray(completion.content)) {
      if (completion.content.length > 0) {
        return 0.90;
      }
      return 0.60;
    }

    if (typeof completion.content === 'object') {
      const keys = Object.keys(completion.content);
      if (keys.length > 0) {
        return 0.85;
      }
      return 0.60;
    }

    return 0.70;
  }

  /**
   * 检查上下文一致性
   */
  private checkContextConsistency(completion: Completion, prd: string): number {
    // 检查补全内容与 PRD 上下文是否有冲突
    
    if (completion.type === 'permission') {
      const roles = Array.isArray(completion.content) 
        ? completion.content.map((r: any) => r.name) 
        : [];
      
      for (const role of roles) {
        // 检测是否有否定词
        if (prd.includes(`不需要${role}`) || 
            prd.includes(`无${role}`) || 
            prd.includes(`不要${role}`)) {
          return 0.30; // 存在明显冲突，置信度低
        }
      }
    }

    if (completion.type === 'org_structure') {
      const departments = Array.isArray(completion.content)
        ? completion.content.map((d: any) => d.name)
        : [];
      
      for (const dept of departments) {
        if (prd.includes(`不需要${dept}`) || 
            prd.includes(`无${dept}`)) {
          return 0.40;
        }
      }
    }

    if (completion.type === 'flow') {
      // 检查流程是否与原描述冲突
      if (prd.includes('无需审批') || prd.includes('不需要流程')) {
        return 0.35;
      }
    }

    // 默认一致性良好
    return 0.85;
  }

  /**
   * 更新历史准确率（由反馈闭环调用）
   */
  updateHistoricalAccuracy(type: string, industry: string, accuracy: number): void {
    const key = `${industry}_${type}`;
    this.historicalAccuracy.set(key, accuracy);
  }

  /**
   * 获取历史准确率报告
   */
  getAccuracyReport(): Record<string, number> {
    const report: Record<string, number> = {};
    for (const [key, value] of this.historicalAccuracy.entries()) {
      report[key] = value;
    }
    return report;
  }

  /**
   * 清除历史准确率缓存
   */
  clearHistory(): void {
    this.historicalAccuracy.clear();
  }
}

// ============================================================================
// 导出
// ============================================================================

export function createConfidenceCalculator(): ConfidenceCalculator {
  return new ConfidenceCalculator();
}
