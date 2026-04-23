/**
 * ANFSF V2.1 - Karpathy Principles Layer A (Inline Guard)
 * 
 * 快速检查：Simplicity, Surgical Changes, Goal-Driven Execution
 * 延迟目标：<50ms
 * 
 * @module asf-v4/harness/karpathy-inline-guard
 */

import { createModuleLogger } from '../utils/logger';
import { KarpathyInlineMetrics, KarpathyInlineResult, KarpathyConfig } from './types';

const logger = createModuleLogger('KarpathyInlineGuard');

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_KARPATHY_CONFIG: KarpathyConfig = {
  inlineThresholds: {
    simplicityMaxRatio: 3.0,      // 实际行数/最小行数 <3x
    surgicalMaxRatio: 0.3,        // 修改文件数/总文件数 <30%
    goalDrivenMinCoverage: 0.8    // E2E 测试覆盖率 >80%
  },
  externalTriggers: {
    projectSizeMinLines: 5000,    // >5000 行触发 External
    complexityMinFeatures: 7,     // >7 个功能触发 External
    productionOnly: true          // 仅生产环境触发 External
  },
  vetoThresholds: {
    overallScoreMin: 0.4,         // <40 分触发 Veto
    thinkBeforeRequired: true     // 必须有假设确认
  }
};

// ============================================================================
// Karpathy Inline Guard
// ============================================================================

export class KarpathyInlineGuard {
  private config: KarpathyConfig;

  constructor(config?: Partial<KarpathyConfig>) {
    this.config = { ...DEFAULT_KARPATHY_CONFIG, ...config };
    logger.info('Karpathy Inline Guard 初始化完成');
    logger.info(`阈值：simplicity<${this.config.inlineThresholds.simplicityMaxRatio}x, surgical<${this.config.inlineThresholds.surgicalMaxRatio * 100}%, goalDriven>${this.config.inlineThresholds.goalDrivenMinCoverage * 100}%`);
  }

  /**
   * 检查 Simplicity First 原则
   * Karpathy: "If you write 200 lines and it could be 50, rewrite it."
   */
  checkSimplicity(actualLines: number, minimalLines: number): { passed: boolean; score: number } {
    const ratio = actualLines / Math.max(1, minimalLines);
    const passed = ratio < this.config.inlineThresholds.simplicityMaxRatio;
    const score = Math.max(0, 1 - (ratio / this.config.inlineThresholds.simplicityMaxRatio));

    logger.debug(`Simplicity 检查：${actualLines}/${minimalLines}=${ratio.toFixed(2)}x, passed=${passed}`);
    return { passed, score };
  }

  /**
   * 检查 Surgical Changes 原则
   * Karpathy: "Touch only what you must. Clean up only your own mess."
   */
  checkSurgicalChanges(touchedFiles: number, totalFiles: number): { passed: boolean; score: number } {
    const ratio = touchedFiles / Math.max(1, totalFiles);
    const passed = ratio < this.config.inlineThresholds.surgicalMaxRatio;
    const score = Math.max(0, 1 - (ratio / this.config.inlineThresholds.surgicalMaxRatio));

    logger.debug(`Surgical 检查：${touchedFiles}/${totalFiles}=${(ratio * 100).toFixed(1)}%, passed=${passed}`);
    return { passed, score };
  }

  /**
   * 检查 Goal-Driven Execution 原则
   * Karpathy: "Transform tasks into verifiable goals."
   */
  checkGoalDriven(coveredTests: number, totalTests: number): { passed: boolean; score: number } {
    const coverage = coveredTests / Math.max(1, totalTests);
    const passed = coverage >= this.config.inlineThresholds.goalDrivenMinCoverage;
    const score = coverage;

    logger.debug(`Goal-Driven 检查：${coveredTests}/${totalTests}=${(coverage * 100).toFixed(1)}%, passed=${passed}`);
    return { passed, score };
  }

  /**
   * 综合 Inline 检查
   */
  checkAll(
    actualLines: number,
    minimalLines: number,
    touchedFiles: number,
    totalFiles: number,
    coveredTests: number,
    totalTests: number
  ): KarpathyInlineResult {
    const simplicity = this.checkSimplicity(actualLines, minimalLines);
    const surgical = this.checkSurgicalChanges(touchedFiles, totalFiles);
    const goalDriven = this.checkGoalDriven(coveredTests, totalTests);

    const metrics: KarpathyInlineMetrics = {
      simplicityScore: simplicity.score,
      surgicalScore: surgical.score,
      goalDrivenScore: goalDriven.score
    };

    const passed = simplicity.passed && surgical.passed && goalDriven.passed;
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!simplicity.passed) {
      const ratio = actualLines / minimalLines;
      issues.push(`代码过于复杂：${ratio.toFixed(1)}x (阈值<${this.config.inlineThresholds.simplicityMaxRatio}x)`);
      recommendations.push(`简化代码：${actualLines}行 → 目标<${minimalLines * this.config.inlineThresholds.simplicityMaxRatio}行`);
    }

    if (!surgical.passed) {
      const pct = (touchedFiles / totalFiles * 100).toFixed(1);
      issues.push(`修改范围过大：${pct}% (阈值<${this.config.inlineThresholds.surgicalMaxRatio * 100}%)`);
      recommendations.push('聚焦核心修改，避免重构无关代码');
    }

    if (!goalDriven.passed) {
      const pct = (coveredTests / totalTests * 100).toFixed(1);
      issues.push(`测试覆盖不足：${pct}% (阈值>${this.config.inlineThresholds.goalDrivenMinCoverage * 100}%)`);
      recommendations.push('补充 E2E 测试，确保核心用户流程覆盖');
    }

    const result: KarpathyInlineResult = {
      passed,
      metrics,
      issues,
      recommendations,
      timestamp: Date.now()
    };

    logger.info(`Inline 检查完成：passed=${passed}, issues=${issues.length}`);
    return result;
  }

  /**
   * 判断是否需要触发 External Review
   */
  shouldTriggerExternal(
    projectLines: number,
    featureCount: number,
    isProduction: boolean
  ): boolean {
    const { externalTriggers } = this.config;

    const triggerBySize = projectLines >= externalTriggers.projectSizeMinLines;
    const triggerByComplexity = featureCount >= externalTriggers.complexityMinFeatures;
    const triggerByEnv = isProduction && externalTriggers.productionOnly;

    const shouldTrigger = triggerBySize || triggerByComplexity || triggerByEnv;

    logger.info(`External 触发检查：size=${triggerBySize}, complexity=${triggerByComplexity}, env=${triggerByEnv} → ${shouldTrigger}`);
    return shouldTrigger;
  }

  /**
   * 获取配置
   */
  getConfig(): KarpathyConfig {
    return this.config;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createKarpathyInlineGuard(config?: Partial<KarpathyConfig>): KarpathyInlineGuard {
  return new KarpathyInlineGuard(config);
}

// ============================================================================
// Exports
// ============================================================================

export { DEFAULT_KARPATHY_CONFIG };
