/**
 * ANFSF V2.1 - Karpathy Principles Integration Layer
 * 
 * 双层架构集成：
 * - Layer A: Inline Guard (快速检查，<50ms)
 * - Layer B: External Review (深度审核，2-5 秒)
 * 
 * @module asf-v4/harness/karpathy-integration
 */

import { createModuleLogger } from '../utils/logger';
import { createKarpathyInlineGuard, KarpathyInlineGuard } from './karpathy-inline-guard';
import { createKarpathyExternalReview, KarpathyExternalReview } from './karpathy-external-review';
import { KarpathyAuditReport, KarpathyConfig, SessionProgress } from './types';

const logger = createModuleLogger('KarpathyIntegration');

// ============================================================================
// Karpathy Integration Layer
// ============================================================================

export class KarpathyIntegration {
  private inlineGuard: KarpathyInlineGuard;
  private externalReview: KarpathyExternalReview;
  private config: KarpathyConfig;

  constructor(config?: Partial<KarpathyConfig>) {
    this.config = {
      inlineThresholds: { simplicityMaxRatio: 3.0, surgicalMaxRatio: 0.3, goalDrivenMinCoverage: 0.8 },
      externalTriggers: { projectSizeMinLines: 5000, complexityMinFeatures: 7, productionOnly: true },
      vetoThresholds: { overallScoreMin: 0.4, thinkBeforeRequired: true },
      ...config
    };
    this.inlineGuard = createKarpathyInlineGuard(config);
    this.externalReview = createKarpathyExternalReview(config);
    logger.info('Karpathy 双层架构集成初始化完成');
  }

  /**
   * 完整审核流程
   * 
   * 1. 先执行 Inline Guard（快速检查）
   * 2. 判断是否需要触发 External Review
   * 3. 如需 External，执行深度审核
   * 4. 返回综合结果
   */
  async performFullAudit(
    projectId: string,
    actualLines: number,
    minimalLines: number,
    touchedFiles: number,
    totalFiles: number,
    coveredTests: number,
    totalTests: number,
    projectLines: number,
    featureCount: number,
    isProduction: boolean,
    sessionLog: SessionProgress[],
    completedFeatures: number,
    totalFeatures: number,
    e2eTestResults: any[]
  ): Promise<KarpathyAuditReport> {
    logger.info(`开始完整审核流程：project=${projectId}`);

    // ========== Layer A: Inline Guard ==========
    logger.info('Layer A: 执行 Inline Guard...');
    const inlineResult = this.inlineGuard.checkAll(
      actualLines,
      minimalLines,
      touchedFiles,
      totalFiles,
      coveredTests,
      totalTests
    );

    // 判断是否需要触发 External Review
    const shouldTriggerExternal = this.inlineGuard.shouldTriggerExternal(
      projectLines,
      featureCount,
      isProduction
    );

    if (!shouldTriggerExternal) {
      logger.info('不满足 External 触发条件，仅执行 Inline Guard');
      // 返回简化的审核报告
      return {
        projectId,
        auditId: `karpathy-inline-${projectId}-${Date.now()}`,
        inlineResult,
        externalAudit: {
          thinkBeforePassed: true,
          goalDrivenPassed: true,
          overallScore: 1.0,
          vetoTriggered: false
        },
        overallPassed: inlineResult.passed,
        kpiData: {
          thinkBeforeScore: 1.0,
          simplicityScore: inlineResult.metrics.simplicityScore,
          surgicalScore: inlineResult.metrics.surgicalScore,
          goalDrivenScore: inlineResult.metrics.goalDrivenScore
        },
        timestamp: Date.now()
      };
    }

    // ========== Layer B: External Review ==========
    logger.info('Layer B: 触发 External Review...');
    const externalReport = await this.externalReview.performAudit(
      projectId,
      inlineResult,
      sessionLog,
      completedFeatures,
      totalFeatures,
      e2eTestResults
    );

    logger.info(`完整审核完成：overallPassed=${externalReport.overallPassed}`);
    return externalReport;
  }

  /**
   * 仅执行 Inline Guard（用于小改动）
   */
  performInlineOnly(
    actualLines: number,
    minimalLines: number,
    touchedFiles: number,
    totalFiles: number,
    coveredTests: number,
    totalTests: number
  ) {
    return this.inlineGuard.checkAll(
      actualLines,
      minimalLines,
      touchedFiles,
      totalFiles,
      coveredTests,
      totalTests
    );
  }

  /**
   * 仅执行 External Review（用于强制深度审核）
   */
  async performExternalOnly(
    projectId: string,
    inlineResult: Record<string, unknown>,
    sessionLog: SessionProgress[],
    completedFeatures: number,
    totalFeatures: number,
    e2eTestResults: any[]
  ): Promise<KarpathyAuditReport> {
    return this.externalReview.performAudit(
      projectId,
      inlineResult,
      sessionLog,
      completedFeatures,
      totalFeatures,
      e2eTestResults
    );
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

export function createKarpathyIntegration(config?: Partial<KarpathyConfig>): KarpathyIntegration {
  return new KarpathyIntegration(config);
}

// ============================================================================
// Exports
// ============================================================================

export { KarpathyInlineGuard, KarpathyExternalReview };
