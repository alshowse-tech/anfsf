/**
 * PRD Feedback Loop - PRD 反馈闭环
 * 
 * 记录用户对补全建议的反馈，持续优化知识库和置信度计算
 * 
 * @module asf-v4/skills/prd/prd-feedback-loop
 * @version 1.0.0
 */

import { DomainKnowledgeBase } from '../../knowledge/domain-knowledge-base';
import { ConfidenceCalculator } from './confidence-calculator';
import { Completion } from './prd-completion-engine';
import { Logger, createModuleLogger } from '../../utils/logger';

const logger: Logger = createModuleLogger('PRDFeedbackLoop');

/**
 * 反馈记录
 */
export interface FeedbackRecord {
  completionId: string;
  type: string;
  content: any;
  confidence: number;
  action: 'accept' | 'reject' | 'modify';
  modifiedValue?: string;
  timestamp: Date;
  projectId?: string;
  industry?: string;
}

/**
 * 优化建议
 */
export interface OptimizationRecommendation {
  type: string;
  issue: string;
  suggestion: string;
}

/**
 * 准确率报告
 */
export interface AccuracyReport {
  totalFeedback: number;
  acceptanceRates: Record<string, number>;
  recommendations: OptimizationRecommendation[];
  timestamp: Date;
}

/**
 * PRD 反馈闭环
 */
export class PRDFeedbackLoop {
  private knowledgeBase: DomainKnowledgeBase;
  private confidenceCalculator: ConfidenceCalculator;
  private feedbackStore: FeedbackRecord[] = [];
  private readonly OPTIMIZE_INTERVAL = 10; // 每 10 条反馈触发一次优化

  constructor(
    knowledgeBase: DomainKnowledgeBase,
    confidenceCalculator: ConfidenceCalculator
  ) {
    this.knowledgeBase = knowledgeBase;
    this.confidenceCalculator = confidenceCalculator;
  }

  /**
   * 记录反馈
   */
  async recordFeedback(record: FeedbackRecord): Promise<void> {
    this.feedbackStore.push(record);
    logger.info(`📝 反馈记录：${record.completionId} - ${record.action}`);

    // 异步更新准确率
    this.updateAccuracyMetrics(record.type, record.industry || 'default')
      .catch(err => logger.error('更新准确率失败:', err));

    // 每 10 条反馈触发一次知识库优化
    if (this.feedbackStore.length % this.OPTIMIZE_INTERVAL === 0) {
      await this.optimizeKnowledgeBase();
    }
  }

  /**
   * 批量记录反馈
   */
  async recordFeedbackBatch(records: FeedbackRecord[]): Promise<void> {
    for (const record of records) {
      await this.recordFeedback(record);
    }
  }

  /**
   * 更新准确率指标
   */
  private async updateAccuracyMetrics(type: string, industry: string): Promise<void> {
    const typeRecords = this.feedbackStore.filter(r => r.type === type && r.industry === industry);
    
    if (typeRecords.length === 0) return;

    const acceptedCount = typeRecords.filter(r => r.action === 'accept').length;
    const accuracy = acceptedCount / typeRecords.length;

    // 更新置信度计算器的历史准确率
    this.confidenceCalculator.updateHistoricalAccuracy(type, industry, accuracy);

    logger.info(`📊 ${industry}_${type} 准确率：${(accuracy * 100).toFixed(1)}% (${acceptedCount}/${typeRecords.length})`);

    // 如果准确率低于 60%，发出警告
    if (accuracy < 0.6) {
      logger.warn(`⚠️ ${type}类型补全准确率过低 (${(accuracy * 100).toFixed(0)}%)，建议暂停自动补全`);
    }
  }

  /**
   * 优化知识库
   */
  private async optimizeKnowledgeBase(): Promise<void> {
    logger.info('🔧 开始知识库优化...');

    try {
      // 1. 分析接受率
      const acceptanceRates = await this.calculateAcceptanceRates();

      // 2. 提取新模式（从用户修改中学习）
      const newPatterns = await this.extractNewPatterns();

      // 3. 更新知识库
      for (const pattern of newPatterns) {
        this.knowledgeBase.addPattern(pattern);
        logger.info(`✅ 添加新模式：${pattern.type}`);
      }

      // 4. 生成优化报告
      const report = await this.generateOptimizationReport(acceptanceRates);
      logger.info('📊 优化报告已生成');

      // 5. 保存报告
      await this.saveReport(report);
    } catch (error) {
      logger.error('知识库优化失败:', error as Error);
    }
  }

  /**
   * 计算接受率
   */
  private async calculateAcceptanceRates(): Promise<Map<string, number>> {
    const rates = new Map<string, number>();
    const types = ['org_structure', 'permission', 'flow', 'field', 'query', 'template'];

    for (const type of types) {
      const records = this.feedbackStore.filter(r => r.type === type);
      if (records.length > 0) {
        const accepted = records.filter(r => r.action === 'accept').length;
        rates.set(type, accepted / records.length);
      }
    }

    return rates;
  }

  /**
   * 提取新模式
   */
  private async extractNewPatterns(): Promise<Array<Record<string, unknown>>> {
    const newPatterns: Array<Record<string, unknown>> = [];
    const modifications = this.feedbackStore.filter(r => r.action === 'modify' && r.modifiedValue);

    for (const mod of modifications) {
      // 分析用户修改，提取新模式
      newPatterns.push({
        type: mod.type,
        content: {
          original: mod.content,
          modified: mod.modifiedValue,
          learnedAt: mod.timestamp
        },
        confidence: 0.7,
        source: 'user_feedback',
        timestamp: mod.timestamp
      });
    }

    return newPatterns;
  }

  /**
   * 生成优化报告
   */
  private async generateOptimizationReport(rates: Map<string, number>): Promise<AccuracyReport> {
    const recommendations: OptimizationRecommendation[] = [];

    for (const [type, rate] of rates.entries()) {
      if (rate < 0.6) {
        recommendations.push({
          type,
          issue: `补全准确率过低 (${(rate * 100).toFixed(0)}%)`,
          suggestion: `暂停${type}类型自动补全，转为建议模式`
        });
      } else if (rate > 0.9) {
        recommendations.push({
          type,
          issue: `补全准确率高 (${(rate * 100).toFixed(0)}%)`,
          suggestion: `可考虑提升${type}类型补全的置信度阈值`
        });
      }
    }

    return {
      totalFeedback: this.feedbackStore.length,
      acceptanceRates: Object.fromEntries(rates),
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * 保存报告
   */
  private async saveReport(report: AccuracyReport): Promise<void> {
    // 在实际环境中，这里应该写入文件系统
    // 由于 OpenClaw 沙箱限制，这里只记录日志
    logger.info('📊 优化报告：' + JSON.stringify(report, null, 2));
  }

  /**
   * 获取准确率报告
   */
  async getAccuracyReport(): Promise<AccuracyReport> {
    const rates = await this.calculateAcceptanceRates();
    const recommendations = this.generateRecommendations(rates);

    return {
      totalFeedback: this.feedbackStore.length,
      acceptanceRates: Object.fromEntries(rates),
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(rates: Map<string, number>): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    for (const [type, rate] of rates.entries()) {
      if (rate < 0.6) {
        recommendations.push({
          type,
          issue: `补全准确率过低 (${(rate * 100).toFixed(0)}%)`,
          suggestion: `暂停${type}类型自动补全，转为建议模式`
        });
      } else if (rate > 0.9) {
        recommendations.push({
          type,
          issue: `补全准确率高 (${(rate * 100).toFixed(0)}%)`,
          suggestion: `可考虑提升${type}类型补全的置信度阈值`
        });
      }
    }

    return recommendations;
  }

  /**
   * 获取反馈统计
   */
  getStats(): Record<string, unknown> {
    const byType: Record<string, { total: number; accept: number; reject: number; modify: number }> = {};
    
    for (const record of this.feedbackStore) {
      if (!byType[record.type]) {
        byType[record.type] = { total: 0, accept: 0, reject: 0, modify: 0 };
      }
      byType[record.type].total++;
      byType[record.type][record.action]++;
    }

    return {
      totalFeedback: this.feedbackStore.length,
      byType,
      feedbackStoreSize: this.feedbackStore.length
    };
  }

  /**
   * 清除反馈记录
   */
  clearFeedback(): void {
    this.feedbackStore = [];
    logger.info('🗑️ 已清除所有反馈记录');
  }

  /**
   * 导出反馈数据
   */
  exportFeedback(): FeedbackRecord[] {
    return [...this.feedbackStore];
  }

  /**
   * 导入反馈数据
   */
  importFeedback(records: FeedbackRecord[]): void {
    this.feedbackStore = [...this.feedbackStore, ...records];
    logger.info(`📥 已导入 ${records.length} 条反馈记录`);
  }
}

// ============================================================================
// 导出
// ============================================================================

export function createPRDFeedbackLoop(
  knowledgeBase: DomainKnowledgeBase,
  confidenceCalculator: ConfidenceCalculator
): PRDFeedbackLoop {
  return new PRDFeedbackLoop(knowledgeBase, confidenceCalculator);
}
