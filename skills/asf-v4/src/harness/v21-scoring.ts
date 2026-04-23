/**
 * ANFSF V2.1 - Enhanced Scoring System
 * 
 * 针对 SparkPath 项目问题的评分维度增强
 * 新增：User Journey, UI Consistency, Real Data 验证
 * 
 * @module asf-v4/harness/v21-scoring
 */

import { createModuleLogger } from '../utils/logger';
import { V21ScoringMetrics, V21ScoringResult, ScoringConfig } from './types';

const logger = createModuleLogger('V21Scoring');

// ============================================================================
// V2.1 默认配置
// ============================================================================

const V21_DEFAULT_CONFIG: ScoringConfig = {
  dimensions: {
    productDepth: { threshold: 0.7, weight: 0.15 },
    functionality: { threshold: 0.7, weight: 0.15 },
    visualDesign: { threshold: 0.85, weight: 0.20 },  // 提升阈值从 0.6→0.85
    codeQuality: { threshold: 0.8, weight: 0.10 },     // 降低权重从 0.2→0.10
    userJourney: { threshold: 0.85, weight: 0.25 },    // 新增
    uiConsistency: { threshold: 0.85, weight: 0.20 },  // 新增
    realData: { threshold: 0.80, weight: 0.15 }        // 新增
  }
};

// 演示级标准
const DEMO_READY_THRESHOLDS = {
  overallScore: 0.85,
  userJourney: 0.85,
  uiConsistency: 0.85,
  realData: 0.80,
  functionality: 0.80
};

// ============================================================================
// V2.1 Scoring Engine
// ============================================================================

export class V21ScoringEngine {
  private config: ScoringConfig;

  constructor(config?: Partial<ScoringConfig>) {
    this.config = { ...V21_DEFAULT_CONFIG, ...config };
    logger.info('V2.1 评分引擎初始化完成');
    logger.info('新增维度：userJourney(25%), uiConsistency(20%), realData(15%)');
  }

  /**
   * 计算 V2.1 综合评分
   */
  calculateScore(metrics: V21ScoringMetrics): V21ScoringResult {
    const { dimensions } = this.config;

    // 计算加权总分（7 维度）
    const overallScore =
      metrics.productDepth * (dimensions.productDepth?.weight || 0) +
      metrics.functionality * (dimensions.functionality?.weight || 0) +
      metrics.visualDesign * (dimensions.visualDesign?.weight || 0) +
      metrics.codeQuality * (dimensions.codeQuality?.weight || 0) +
      metrics.userJourney * (dimensions.userJourney?.weight || 0) +
      metrics.uiConsistency * (dimensions.uiConsistency?.weight || 0) +
      metrics.realData * (dimensions.realData?.weight || 0);

    // 检查各维度是否达标
    const issues: string[] = [];

    if (metrics.productDepth < (dimensions.productDepth?.threshold || 0.7)) {
      issues.push(`产品深度不足：${metrics.productDepth.toFixed(2)}`);
    }
    if (metrics.functionality < (dimensions.functionality?.threshold || 0.7)) {
      issues.push(`功能完整性不足：${metrics.functionality.toFixed(2)}`);
    }
    if (metrics.visualDesign < (dimensions.visualDesign?.threshold || 0.85)) {
      issues.push(`视觉设计不足：${metrics.visualDesign.toFixed(2)} < 0.85`);
    }
    if (metrics.codeQuality < (dimensions.codeQuality?.threshold || 0.8)) {
      issues.push(`代码质量不足：${metrics.codeQuality.toFixed(2)}`);
    }
    if (metrics.userJourney < (dimensions.userJourney?.threshold || 0.85)) {
      issues.push(`用户旅程不完整：${metrics.userJourney.toFixed(2)} < 0.85`);
    }
    if (metrics.uiConsistency < (dimensions.uiConsistency?.threshold || 0.85)) {
      issues.push(`UI 一致性不足：${metrics.uiConsistency.toFixed(2)} < 0.85`);
    }
    if (metrics.realData < (dimensions.realData?.threshold || 0.80)) {
      issues.push(`真实数据验证不足：${metrics.realData.toFixed(2)} < 0.80`);
    }

    // 生成改进建议
    const recommendations: string[] = [];

    if (metrics.userJourney < 0.85) {
      recommendations.push('补充完整用户旅程：列表→详情→CRUD 完整流程');
    }
    if (metrics.uiConsistency < 0.85) {
      recommendations.push('统一 UI 风格，使用设计系统组件库');
    }
    if (metrics.realData < 0.80) {
      recommendations.push('替换模拟数据为真实场景数据，移除"模拟"文案');
    }
    if (metrics.functionality < 0.80) {
      recommendations.push('确保 P0/P1功能完整实现，包括详情页和 CRUD 操作');
    }

    // 检查是否达到演示级标准
    const demoReady =
      overallScore >= DEMO_READY_THRESHOLDS.overallScore &&
      metrics.userJourney >= DEMO_READY_THRESHOLDS.userJourney &&
      metrics.uiConsistency >= DEMO_READY_THRESHOLDS.uiConsistency &&
      metrics.realData >= DEMO_READY_THRESHOLDS.realData &&
      metrics.functionality >= DEMO_READY_THRESHOLDS.functionality;

    // 计算自检准确率（对比自评和实际评分）
    const selfCheckAccuracy = this.calculateSelfCheckAccuracy(metrics, overallScore);

    const result: V21ScoringResult = {
      ...metrics,
      overallScore,
      issues,
      recommendations,
      passed: overallScore >= 0.80,  // Standard 模板阈值
      timestamp: Date.now(),
      demoReady,
      selfCheckAccuracy
    };

    logger.info(`评分完成：总分=${overallScore.toFixed(2)}, demoReady=${demoReady}`);
    return result;
  }

  /**
   * 计算自检准确率
   * 用于检测自评虚高问题（SparkPath 项目自评 100%→实际 60%）
   */
  private calculateSelfCheckAccuracy(metrics: V21ScoringMetrics, overallScore: number): number {
    // 基于各维度一致性计算自检准确率
    const variance = Math.abs(metrics.userJourney - metrics.codeQuality);
    // 方差越大，自检准确率越低（功能不完整但代码质量高 = 自检虚高）
    return Math.max(0, 1 - variance * 2);
  }

  /**
   * 获取评分模板
   */
  getTemplate(template: 'strict' | 'standard' | 'lenient' = 'standard'): ScoringConfig {
    const templates: Record<string, ScoringConfig> = {
      strict: {
        dimensions: {
          productDepth: { threshold: 0.85, weight: 0.15 },
          functionality: { threshold: 0.85, weight: 0.15 },
          visualDesign: { threshold: 0.90, weight: 0.20 },
          codeQuality: { threshold: 0.90, weight: 0.10 },
          userJourney: { threshold: 0.90, weight: 0.25 },
          uiConsistency: { threshold: 0.90, weight: 0.20 },
          realData: { threshold: 0.85, weight: 0.15 }
        }
      },
      standard: V21_DEFAULT_CONFIG,
      lenient: {
        dimensions: {
          productDepth: { threshold: 0.65, weight: 0.15 },
          functionality: { threshold: 0.65, weight: 0.15 },
          visualDesign: { threshold: 0.75, weight: 0.20 },
          codeQuality: { threshold: 0.70, weight: 0.10 },
          userJourney: { threshold: 0.75, weight: 0.25 },
          uiConsistency: { threshold: 0.75, weight: 0.20 },
          realData: { threshold: 0.70, weight: 0.15 }
        }
      }
    };

    return templates[template] || V21_DEFAULT_CONFIG;
  }

  /**
   * 检查是否达到演示级标准
   */
  isDemoReady(result: V21ScoringResult): boolean {
    return result.demoReady;
  }

  /**
   * 生成完成度校准因子
   * 用于修正自评虚高问题
   */
  getCalibrationFactor(metrics: V21ScoringMetrics): number {
    if (metrics.userJourney < 0.5) return 0.6;        // 仅一级页面
    if (metrics.userJourney < 0.7) return 0.75;       // 列表 + 详情
    if (metrics.userJourney < 0.85) return 0.9;       // 完整 CRUD
    return 1.0;                                        // 完整 CRUD+ 真实数据
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createV21ScoringEngine(config?: Partial<ScoringConfig>): V21ScoringEngine {
  return new V21ScoringEngine(config);
}

// ============================================================================
// Exports
// ============================================================================

export { V21_DEFAULT_CONFIG, DEMO_READY_THRESHOLDS };
