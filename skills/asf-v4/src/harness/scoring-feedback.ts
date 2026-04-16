/**
 * ANFSF V2.0 - Scoring & Feedback System
 * 
 * 4 维度评分系统与反馈循环集成
 * 支持迭代改进机制
 * 
 * @module asf-v4/harness/scoring-feedback
 */

import { createModuleLogger } from '../utils/logger';
import { ScoringConfig, ScoringResult, FeedbackItem, FeedbackLoopConfig, IterationResult } from './types';

const logger = createModuleLogger('ScoringFeedback');

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  dimensions: {
    productDepth: { threshold: 0.7, weight: 0.3 },
    functionality: { threshold: 0.7, weight: 0.3 },
    visualDesign: { threshold: 0.6, weight: 0.2 },
    codeQuality: { threshold: 0.8, weight: 0.2 }
  }
};

const DEFAULT_FEEDBACK_CONFIG: FeedbackLoopConfig = {
  maxIterations: 5,
  minImprovementThreshold: 0.05,  // 5% 最小改进
  pivotThreshold: 0.4  // 低于 40 分触发 pivot
};

// ============================================================================
// Scoring Engine
// ============================================================================

export class ScoringEngine {
  private config: ScoringConfig;

  constructor(config?: Partial<ScoringConfig>) {
    this.config = { ...DEFAULT_SCORING_CONFIG, ...config };
    logger.info('评分引擎初始化完成');
  }

  /**
   * 计算综合评分
   */
  calculateScore(metrics: {
    productDepth: number;
    functionality: number;
    visualDesign: number;
    codeQuality: number;
  }): ScoringResult {
    const { dimensions } = this.config;

    // 计算加权总分
    const overallScore =
      metrics.productDepth * dimensions.productDepth.weight +
      metrics.functionality * dimensions.functionality.weight +
      metrics.visualDesign * dimensions.visualDesign.weight +
      metrics.codeQuality * dimensions.codeQuality.weight;

    // 检查各维度是否达标
    const issues: string[] = [];

    if (metrics.productDepth < dimensions.productDepth.threshold) {
      issues.push(`产品深度不足：${metrics.productDepth.toFixed(2)} < ${dimensions.productDepth.threshold}`);
    }
    if (metrics.functionality < dimensions.functionality.threshold) {
      issues.push(`功能完整性不足：${metrics.functionality.toFixed(2)} < ${dimensions.functionality.threshold}`);
    }
    if (metrics.visualDesign < dimensions.visualDesign.threshold) {
      issues.push(`视觉设计不足：${metrics.visualDesign.toFixed(2)} < ${dimensions.visualDesign.threshold}`);
    }
    if (metrics.codeQuality < dimensions.codeQuality.threshold) {
      issues.push(`代码质量不足：${metrics.codeQuality.toFixed(2)} < ${dimensions.codeQuality.threshold}`);
    }

    // 生成改进建议
    const recommendations: string[] = [];

    if (metrics.productDepth < dimensions.productDepth.threshold) {
      recommendations.push('增加产品功能深度，完善核心业务流程');
    }
    if (metrics.functionality < dimensions.functionality.threshold) {
      recommendations.push('补充缺失的功能点，确保 P0/P1 功能完整实现');
    }
    if (metrics.visualDesign < dimensions.visualDesign.threshold) {
      recommendations.push('优化 UI 设计，提升视觉一致性和美观度');
    }
    if (metrics.codeQuality < dimensions.codeQuality.threshold) {
      recommendations.push('改进代码质量，增加测试覆盖率和代码规范');
    }

    const result: ScoringResult = {
      ...metrics,
      overallScore,
      issues,
      recommendations,
      passed: issues.length === 0,
      timestamp: Date.now()
    };

    logger.info(`评分完成：${overallScore.toFixed(2)} (${issues.length} 个问题)`);
    return result;
  }

  /**
   * 获取配置
   */
  getConfig(): ScoringConfig {
    return this.config;
  }
}

// ============================================================================
// Feedback Loop Engine
// ============================================================================

export class FeedbackLoopEngine {
  private config: FeedbackLoopConfig;
  private scoringEngine: ScoringEngine;
  private iterations: IterationResult[] = [];

  constructor(
    config?: Partial<FeedbackLoopConfig>,
    scoringEngine?: ScoringEngine
  ) {
    this.config = { ...DEFAULT_FEEDBACK_CONFIG, ...config };
    this.scoringEngine = scoringEngine || new ScoringEngine();
    logger.info('反馈循环引擎初始化完成');
  }

  /**
   * 执行单次迭代
   */
  async iterate(
    metrics: {
      productDepth: number;
      functionality: number;
      visualDesign: number;
      codeQuality: number;
    },
    iterationNum: number
  ): Promise<IterationResult> {
    logger.info(`执行迭代 #${iterationNum}`);

    // 计算评分
    const scoreResult = this.scoringEngine.calculateScore(metrics);

    // 生成分析
    const action = this.determineAction(scoreResult.overallScore, iterationNum);
    const rationale = this.generateRationale(action, scoreResult, iterationNum);

    // 创建反馈项
    const feedback: FeedbackItem[] = scoreResult.issues.map((issue, index) => ({
      id: `feedback-${iterationNum}-${index}`,
      type: 'e2e-test',
      severity: this.determineSeverity(issue),
      description: issue,
      suggestions: [scoreResult.recommendations[index] || '改进相关功能'],
      createdAt: Date.now()
    }));

    const result: IterationResult = {
      iteration: iterationNum,
      scores: [
        metrics.productDepth,
        metrics.functionality,
        metrics.visualDesign,
        metrics.codeQuality
      ],
      feedback,
      action,
      rationale
    };

    this.iterations.push(result);
    logger.info(`迭代 #${iterationNum} 完成：${action}`);

    return result;
  }

  /**
   * 决定下一步行动
   */
  private determineAction(overallScore: number, iterationNum: number): 'refine' | 'pivot' | 'complete' {
    // 检查是否完成
    if (overallScore >= 0.85) {
      return 'complete';
    }

    // 检查是否需要 pivot
    if (overallScore < this.config.pivotThreshold) {
      return 'pivot';
    }

    // 检查是否超过最大迭代次数
    if (iterationNum >= this.config.maxIterations) {
      return 'complete';
    }

    // 默认继续优化
    return 'refine';
  }

  /**
   * 生成决策理由
   */
  private generateRationale(
    action: string,
    scoreResult: ScoringResult,
    iterationNum: number
  ): string {
    switch (action) {
      case 'complete':
        if (scoreResult.overallScore >= 0.85) {
          return `综合评分 ${scoreResult.overallScore.toFixed(2)} 达到完成标准 (≥0.85)`;
        }
        return `达到最大迭代次数 (${this.config.maxIterations})，终止迭代`;

      case 'pivot':
        return `综合评分 ${scoreResult.overallScore.toFixed(2)} 低于 pivot 阈值 (${this.config.pivotThreshold})，建议重新设计`;

      case 'refine':
        return `综合评分 ${scoreResult.overallScore.toFixed(2)}，继续优化 ${scoreResult.issues.length} 个问题`;

      default:
        return '未知决策';
    }
  }

  /**
   * 确定问题严重程度
   */
  private determineSeverity(issue: string): 'critical' | 'major' | 'minor' {
    if (issue.includes('产品深度') || issue.includes('功能完整性')) {
      return 'critical';
    }
    if (issue.includes('代码质量')) {
      return 'major';
    }
    return 'minor';
  }

  /**
   * 检查是否应该继续迭代
   */
  shouldContinue(lastScore: number, previousScore?: number): boolean {
    if (this.iterations.length >= this.config.maxIterations) {
      return false;
    }

    if (lastScore >= 0.85) {
      return false;
    }

    if (lastScore < this.config.pivotThreshold) {
      return false;
    }

    // 检查改进是否显著
    if (previousScore !== undefined) {
      const improvement = lastScore - previousScore;
      if (improvement < this.config.minImprovementThreshold && this.iterations.length > 2) {
        logger.info(`改进幅度不足 (${improvement.toFixed(2)} < ${this.config.minImprovementThreshold})`);
        return false;
      }
    }

    return true;
  }

  /**
   * 获取迭代历史
   */
  getIterations(): IterationResult[] {
    return this.iterations;
  }

  /**
   * 重置迭代历史
   */
  reset(): void {
    this.iterations = [];
    logger.info('迭代历史已重置');
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createScoringEngine(config?: Partial<ScoringConfig>): ScoringEngine {
  return new ScoringEngine(config);
}

export function createFeedbackLoopEngine(
  config?: Partial<FeedbackLoopConfig>,
  scoringEngine?: ScoringEngine
): FeedbackLoopEngine {
  return new FeedbackLoopEngine(config, scoringEngine);
}

// ============================================================================
// 预定义评分模板
// ============================================================================

export const SCORING_TEMPLATES = {
  /**
   * 严格模式（生产环境）
   */
  strict: {
    dimensions: {
      productDepth: { threshold: 0.85, weight: 0.3 },
      functionality: { threshold: 0.85, weight: 0.3 },
      visualDesign: { threshold: 0.75, weight: 0.2 },
      codeQuality: { threshold: 0.9, weight: 0.2 }
    }
  },

  /**
   * 标准模式（默认）
   */
  standard: {
    dimensions: {
      productDepth: { threshold: 0.7, weight: 0.3 },
      functionality: { threshold: 0.7, weight: 0.3 },
      visualDesign: { threshold: 0.6, weight: 0.2 },
      codeQuality: { threshold: 0.8, weight: 0.2 }
    }
  },

  /**
   * 宽松模式（原型/测试）
   */
  lenient: {
    dimensions: {
      productDepth: { threshold: 0.5, weight: 0.3 },
      functionality: { threshold: 0.5, weight: 0.3 },
      visualDesign: { threshold: 0.4, weight: 0.2 },
      codeQuality: { threshold: 0.6, weight: 0.2 }
    }
  }
};
