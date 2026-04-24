/**
 * ANFSF V2.1 - Karpathy Principles Layer B (External Review)
 * 
 * 深度审核：Think Before Coding, Goal-Driven Execution
 * 独立 TimescaleDB KPI 存储，Veto 权机制
 * 延迟：2-5 秒
 * 
 * @module asf-v4/harness/karpathy-external-review
 */

import { createModuleLogger } from '../utils/logger';
import {
  KarpathyExternalAudit,
  KarpathyAuditReport,
  KarpathyInlineResult,
  KarpathyConfig,
  SessionProgress
} from './types';

const logger = createModuleLogger('KarpathyExternalReview');

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_EXTERNAL_CONFIG: KarpathyConfig = {
  inlineThresholds: {
    simplicityMaxRatio: 3.0,
    surgicalMaxRatio: 0.3,
    goalDrivenMinCoverage: 0.8
  },
  externalTriggers: {
    projectSizeMinLines: 5000,
    complexityMinFeatures: 7,
    productionOnly: true
  },
  vetoThresholds: {
    overallScoreMin: 0.4,
    thinkBeforeRequired: true
  }
};

// ============================================================================
// Karpathy External Review
// ============================================================================

export class KarpathyExternalReview {
  private config: KarpathyConfig;
  private timescaleDbConnection?: Record<string, unknown>;  // TimescaleDB 连接

  constructor(config?: Partial<KarpathyConfig>) {
    this.config = { ...DEFAULT_EXTERNAL_CONFIG, ...config };
    logger.info('Karpathy External Review 初始化完成');
    logger.info(`Veto 阈值：overallScore>${this.config.vetoThresholds.overallScoreMin}, thinkBefore=${this.config.vetoThresholds.thinkBeforeRequired}`);
  }

  /**
   * 审核 Think Before Coding 原则
   * Karpathy: "Don't assume. Don't hide confusion. Surface tradeoffs."
   */
  async auditThinkBefore(sessionLog: SessionProgress[]): Promise<{ passed: boolean; score: number }> {
    logger.info('开始 Think Before 审核...');

    // 检查需求展开前是否有提问确认
    let hasClarification = false;
    let clarificationCount = 0;

    for (const session of sessionLog) {
      // 检查是否有澄清问题
      if (session.issues.length > 0 && session.metrics.accuracy < 1.0) {
        clarificationCount++;
      }

      // 检查是否有假设确认记录
      if (session.nextSteps && session.nextSteps.length > 0) {
        hasClarification = true;
      }
    }

    // 计算分数
    const score = hasClarification
      ? Math.min(1.0, 0.5 + clarificationCount * 0.1)
      : 0.0;

    const passed = !this.config.vetoThresholds.thinkBeforeRequired || hasClarification;

    logger.info(`Think Before 审核：passed=${passed}, score=${score.toFixed(2)}, clarifications=${clarificationCount}`);
    return { passed, score };
  }

  /**
   * 审核 Goal-Driven Execution 原则
   * Karpathy: "Define success criteria. Loop until verified."
   */
  async auditGoalDriven(
    completedFeatures: number,
    totalFeatures: number,
    e2eTestResults: Array<Record<string, unknown>>
  ): Promise<{ passed: boolean; score: number }> {
    logger.info('开始 Goal-Driven 审核...');

    // 检查功能完整度
    const featureCompletionRate = completedFeatures / Math.max(1, totalFeatures);

    // 检查 E2E 测试通过率
    const e2ePassRate = e2eTestResults.length > 0
      ? e2eTestResults.filter(r => r.passed).length / e2eTestResults.length
      : 0;

    // 综合评分
    const score = (featureCompletionRate * 0.6 + e2ePassRate * 0.4);
    const passed = featureCompletionRate >= 0.85 && e2ePassRate >= 0.80;

    logger.info(`Goal-Driven 审核：passed=${passed}, score=${score.toFixed(2)}, features=${featureCompletionRate.toFixed(2)}, e2e=${e2ePassRate.toFixed(2)}`);
    return { passed, score };
  }

  /**
   * 计算 Karpathy 综合评分
   */
  calculateOverallScore(
    thinkBeforeScore: number,
    simplicityScore: number,
    surgicalScore: number,
    goalDrivenScore: number
  ): number {
    // 4 原则加权平均
    return (
      thinkBeforeScore * 0.25 +
      simplicityScore * 0.25 +
      surgicalScore * 0.25 +
      goalDrivenScore * 0.25
    );
  }

  /**
   * 判断是否触发 Veto 权
   */
  shouldVeto(overallScore: number, thinkBeforePassed: boolean): boolean {
    const vetoByScore = overallScore < this.config.vetoThresholds.overallScoreMin;
    const vetoByThinkBefore = this.config.vetoThresholds.thinkBeforeRequired && !thinkBeforePassed;

    const shouldVeto = vetoByScore || vetoByThinkBefore;

    if (shouldVeto) {
      logger.warn(`Veto 权触发：score=${overallScore.toFixed(2)}<${this.config.vetoThresholds.overallScoreMin}, thinkBefore=${thinkBeforePassed}`);
    }

    return shouldVeto;
  }

  /**
   * 完整 External 审核流程
   */
  async performAudit(
    projectId: string,
    inlineResult: KarpathyInlineResult,
    sessionLog: SessionProgress[],
    completedFeatures: number,
    totalFeatures: number,
    e2eTestResults: Array<Record<string, unknown>>
  ): Promise<KarpathyAuditReport> {
    logger.info(`开始 External 审核：project=${projectId}`);

    // Layer B 审核
    const thinkBefore = await this.auditThinkBefore(sessionLog);
    const goalDriven = await this.auditGoalDriven(completedFeatures, totalFeatures, e2eTestResults);

    // 计算综合评分
    const overallScore = this.calculateOverallScore(
      thinkBefore.score,
      inlineResult.metrics.simplicityScore,
      inlineResult.metrics.surgicalScore,
      goalDriven.score
    );

    // 判断 Veto
    const vetoTriggered = this.shouldVeto(overallScore, thinkBefore.passed);

    // 生成审核报告
    const audit: KarpathyExternalAudit = {
      thinkBeforePassed: thinkBefore.passed,
      goalDrivenPassed: goalDriven.passed,
      overallScore,
      vetoTriggered
    };

    const report: KarpathyAuditReport = {
      projectId,
      auditId: `karpathy-${projectId}-${Date.now()}`,
      inlineResult,
      externalAudit: audit,
      overallPassed: !vetoTriggered,
      kpiData: {
        thinkBeforeScore: thinkBefore.score,
        simplicityScore: inlineResult.metrics.simplicityScore,
        surgicalScore: inlineResult.metrics.surgicalScore,
        goalDrivenScore: goalDriven.score
      },
      timestamp: Date.now()
    };

    // 存储 KPI 到 TimescaleDB
    await this.storeKpiToTimescale(report);

    logger.info(`External 审核完成：overallScore=${overallScore.toFixed(2)}, veto=${vetoTriggered}`);
    return report;
  }

  /**
   * 存储 KPI 到 TimescaleDB
   */
  private async storeKpiToTimescale(report: KarpathyAuditReport): Promise<void> {
    // TODO: 实现 TimescaleDB 存储
    // 当前为模拟实现
    logger.info(`KPI 存储：${report.auditId} → TimescaleDB`);
    logger.debug(JSON.stringify(report.kpiData, null, 2));
  }

  /**
   * 连接 TimescaleDB
   */
  async connectTimescale(_connectionString?: string): Promise<void> {
    void _connectionString;
    // TODO: 实现 TimescaleDB 连接
    // 默认端口 5433（与 External Review Agent 共享）
    logger.info('TimescaleDB 连接初始化（模拟）');
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createKarpathyExternalReview(config?: Partial<KarpathyConfig>): KarpathyExternalReview {
  return new KarpathyExternalReview(config);
}

// ============================================================================
// Exports
// ============================================================================

export { DEFAULT_EXTERNAL_CONFIG };
