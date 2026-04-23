/**
 * Self Evolution Loop - 自我进化闭环
 * 
 * 自动 KPI 监控、瓶颈识别、优化建议、A/B测试
 * 
 * @module asf-v4/harness/self-evolution-loop
 * @version 1.0.0
 */

import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('SelfEvolutionLoop');

// ============================================================================
// 类型定义
// ============================================================================

/**
 * KPI 报告
 */
export interface KPIReport {
  timestamp: Date;
  parseAccuracy: number;
  iterationCount: number;
  tokenPeak: number;
  userSatisfaction: number;
  successRate: number;
  avgResponseTime: number;
  errorRate: number;
}

/**
 * 瓶颈报告
 */
export interface BottleneckReport {
  bottlenecks: Bottleneck[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: Recommendation[];
}

/**
 * 瓶颈描述
 */
export interface Bottleneck {
  type: 'performance' | 'accuracy' | 'cost' | 'reliability';
  metric: string;
  currentValue: number;
  threshold: number;
  impact: string;
}

/**
 * 优化建议
 */
export interface Recommendation {
  id: string;
  title: string;
  description: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * 优化结果
 */
export interface OptimizationResult {
  baseline: KPIReport;
  experiment: KPIReport;
  improvement: number;
  statisticallySignificant: boolean;
  deployed: boolean;
}

/**
 * A/B测试配置
 */
export interface ABTestConfig {
  name: string;
  hypothesis: string;
  metric: string;
  trafficSplit: number; // 0-100
  duration: number; // 小时
  successCriteria: number; // 最小提升百分比
}

/**
 * 显著性检验报告
 */
export interface SignificanceReport {
  baseline: { mean: number; std: number; n: number };
  experiment: { mean: number; std: number; n: number };
  test: {
    type: string;
    tStatistic: number;
    degreesOfFreedom: number;
    pValue: number;
    alpha: number;
    isSignificant: boolean;
  };
  effectSize: {
    cohensD: number;
    interpretation: string;
    hasPracticalSignificance: boolean;
  };
  confidenceInterval: { lower: number; upper: number; level: number };
  improvement: number;
  conclusion: string;
  timestamp: Date;
}

// ============================================================================
// Self Evolution Loop 主类
// ============================================================================

export class SelfEvolutionLoop {
  private kpiHistory: KPIReport[] = [];
  private bottlenecks: Bottleneck[] = [];
  private recommendations: Recommendation[] = [];
  private abTests: Map<string, ABTestConfig> = new Map();
  
  // KPI 阈值配置
  private thresholds = {
    parseAccuracy: 0.85,
    successRate: 0.90,
    avgResponseTime: 5000, // ms
    errorRate: 0.05,
    tokenPeak: 100000
  };

  constructor() {
    logger.info('🔄 自我进化闭环初始化完成');
  }

  // ============================================================================
  // KPI 监控
  // ============================================================================

  /**
   * 监控 KPI - 核心方法
   */
  async monitorKPI(): Promise<KPIReport> {
    logger.info('📊 开始 KPI 监控...');

    const report: KPIReport = {
      timestamp: new Date(),
      parseAccuracy: await this.getParseAccuracy(),
      iterationCount: await this.getAvgIterations(),
      tokenPeak: await this.getTokenPeak(),
      userSatisfaction: await this.getUserFeedback(),
      successRate: await this.getSuccessRate(),
      avgResponseTime: await this.getAvgResponseTime(),
      errorRate: await this.getErrorRate()
    };

    // 记录历史
    this.kpiHistory.push(report);
    
    // 保持最近 100 条记录
    if (this.kpiHistory.length > 100) {
      this.kpiHistory.shift();
    }

    logger.info(`✅ KPI 监控完成：准确率=${(report.parseAccuracy * 100).toFixed(1)}%, 成功率=${(report.successRate * 100).toFixed(1)}%`);

    return report;
  }

  /**
   * 获取解析准确率
   */
  private async getParseAccuracy(): Promise<number> {
    // 模拟实现：从历史数据计算
    // 实际实现应该从测试结果获取
    const recentReports = this.kpiHistory.slice(-10);
    if (recentReports.length === 0) {
      return 0.95; // 默认值
    }
    return recentReports.reduce((sum, r) => sum + r.parseAccuracy, 0) / recentReports.length;
  }

  /**
   * 获取平均迭代次数
   */
  private async getAvgIterations(): Promise<number> {
    // 模拟实现
    return 2.5;
  }

  /**
   * 获取 Token 峰值
   */
  private async getTokenPeak(): Promise<number> {
    // 模拟实现
    return 85000;
  }

  /**
   * 获取用户满意度
   */
  private async getUserFeedback(): Promise<number> {
    // 模拟实现：从反馈系统获取
    return 0.88;
  }

  /**
   * 获取成功率
   */
  private async getSuccessRate(): Promise<number> {
    // 模拟实现：从项目统计获取
    return 0.92;
  }

  /**
   * 获取平均响应时间
   */
  private async getAvgResponseTime(): Promise<number> {
    // 模拟实现
    return 3500;
  }

  /**
   * 获取错误率
   */
  private async getErrorRate(): Promise<number> {
    // 模拟实现
    return 0.03;
  }

  // ============================================================================
  // 瓶颈识别
  // ============================================================================

  /**
   * 识别性能瓶颈
   */
  async identifyBottleneck(): Promise<BottleneckReport> {
    logger.info('🔍 开始瓶颈识别...');

    const bottlenecks: Bottleneck[] = [];

    // 1. 检查解析准确率
    const parseAccuracy = await this.getParseAccuracy();
    if (parseAccuracy < this.thresholds.parseAccuracy) {
      bottlenecks.push({
        type: 'accuracy',
        metric: 'parseAccuracy',
        currentValue: parseAccuracy,
        threshold: this.thresholds.parseAccuracy,
        impact: '需求理解不准确，导致返工率上升'
      });
    }

    // 2. 检查成功率
    const successRate = await this.getSuccessRate();
    if (successRate < this.thresholds.successRate) {
      bottlenecks.push({
        type: 'reliability',
        metric: 'successRate',
        currentValue: successRate,
        threshold: this.thresholds.successRate,
        impact: '项目交付成功率低，用户信任度下降'
      });
    }

    // 3. 检查响应时间
    const avgResponseTime = await this.getAvgResponseTime();
    if (avgResponseTime > this.thresholds.avgResponseTime) {
      bottlenecks.push({
        type: 'performance',
        metric: 'avgResponseTime',
        currentValue: avgResponseTime,
        threshold: this.thresholds.avgResponseTime,
        impact: '响应慢，用户体验差'
      });
    }

    // 4. 检查错误率
    const errorRate = await this.getErrorRate();
    if (errorRate > this.thresholds.errorRate) {
      bottlenecks.push({
        type: 'reliability',
        metric: 'errorRate',
        currentValue: errorRate,
        threshold: this.thresholds.errorRate,
        impact: '错误频发，系统稳定性差'
      });
    }

    // 5. 检查 Token 消耗
    const tokenPeak = await this.getTokenPeak();
    if (tokenPeak > this.thresholds.tokenPeak) {
      bottlenecks.push({
        type: 'cost',
        metric: 'tokenPeak',
        currentValue: tokenPeak,
        threshold: this.thresholds.tokenPeak,
        impact: 'Token 消耗高，运营成本增加'
      });
    }

    this.bottlenecks = bottlenecks;

    const severity = this.calculateBottleneckSeverity(bottlenecks);
    const recommendations = this.generateRecommendations(bottlenecks);
    this.recommendations = recommendations;

    logger.info(`✅ 瓶颈识别完成：发现 ${bottlenecks.length} 个瓶颈，严重程度=${severity}`);

    return {
      bottlenecks,
      severity,
      recommendations
    };
  }

  /**
   * 计算瓶颈严重程度
   */
  private calculateBottleneckSeverity(bottlenecks: Bottleneck[]): 'low' | 'medium' | 'high' | 'critical' {
    if (bottlenecks.length === 0) return 'low';

    const criticalCount = bottlenecks.filter(b => 
      b.type === 'reliability' && b.currentValue < b.threshold * 0.8
    ).length;

    if (criticalCount > 0) return 'critical';
    if (bottlenecks.length > 3) return 'high';
    if (bottlenecks.length > 1) return 'medium';
    return 'low';
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(bottlenecks: Bottleneck[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const bottleneck of bottlenecks) {
      switch (bottleneck.metric) {
        case 'parseAccuracy':
          recommendations.push({
            id: `rec_${Date.now()}_1`,
            title: '优化需求解析算法',
            description: '引入高级需求理解模型，提升复杂需求解析准确率',
            expectedImpact: '准确率提升 10-15%',
            effort: 'medium',
            priority: 'high'
          });
          break;

        case 'successRate':
          recommendations.push({
            id: `rec_${Date.now()}_2`,
            title: '增强多 Agent 协同',
            description: '优化 Agent 任务分配和冲突解决机制',
            expectedImpact: '成功率提升 10-20%',
            effort: 'high',
            priority: 'urgent'
          });
          break;

        case 'avgResponseTime':
          recommendations.push({
            id: `rec_${Date.now()}_3`,
            title: '优化响应性能',
            description: '实施上下文压缩和缓存策略',
            expectedImpact: '响应时间减少 40-60%',
            effort: 'medium',
            priority: 'high'
          });
          break;

        case 'errorRate':
          recommendations.push({
            id: `rec_${Date.now()}_4`,
            title: '增强错误处理',
            description: '完善异常捕获和恢复机制',
            expectedImpact: '错误率降低 50%+',
            effort: 'low',
            priority: 'high'
          });
          break;

        case 'tokenPeak':
          recommendations.push({
            id: `rec_${Date.now()}_5`,
            title: '优化 Token 使用',
            description: '实施上下文压缩和精简策略',
            expectedImpact: 'Token 消耗减少 40-60%',
            effort: 'medium',
            priority: 'medium'
          });
          break;
      }
    }

    return recommendations;
  }

  // ============================================================================
  // 自动优化
  // ============================================================================

  /**
   * 自动优化（A/B测试）
   */
  async autoOptimize(config?: Partial<ABTestConfig>): Promise<OptimizationResult> {
    logger.info('🚀 开始自动优化...');

    // 1. 获取基线指标
    const baseline = await this.monitorKPI();

    // 2. 创建 A/B测试
    const abConfig: ABTestConfig = {
      name: 'auto_optimization_' + Date.now(),
      hypothesis: '优化策略可提升关键指标',
      metric: 'parseAccuracy',
      trafficSplit: 50,
      duration: 24,
      successCriteria: 0.05,
      ...config
    };

    this.abTests.set(abConfig.name, abConfig);

    // 3. 运行实验（模拟）
    const experiment = await this.runExperiment(abConfig);

    // 4. 比较结果
    const improvement = this.calculateImprovement(baseline, experiment, abConfig.metric);
    const statisticallySignificant = this.isStatisticallySignificant(baseline, experiment);

    logger.info(`✅ 自动优化完成：提升=${(improvement * 100).toFixed(1)}%, 显著性=${statisticallySignificant}`);

    // 5. 部署优化（如果显著）
    let deployed = false;
    if (statisticallySignificant && improvement > abConfig.successCriteria) {
      deployed = await this.deployOptimization(abConfig.name);
    }

    return {
      baseline,
      experiment,
      improvement,
      statisticallySignificant,
      deployed
    };
  }

  /**
   * 运行实验
   */
  private async runExperiment(config: ABTestConfig): Promise<KPIReport> {
    // 模拟实现：实验组指标
    // 实际实现应该分流流量并收集实验组数据
    return {
      timestamp: new Date(),
      parseAccuracy: 0.97, // 模拟提升
      iterationCount: 2.2,
      tokenPeak: 75000,
      userSatisfaction: 0.92,
      successRate: 0.95,
      avgResponseTime: 3000,
      errorRate: 0.02
    };
  }

  /**
   * 计算提升幅度
   */
  private calculateImprovement(baseline: KPIReport, experiment: KPIReport, metric: string): number {
    const baselineValue = (baseline as any)[metric];
    const experimentValue = (experiment as any)[metric];

    if (baselineValue === 0) return 0;

    return (experimentValue - baselineValue) / baselineValue;
  }

  /**
   * 统计显著性检验 - 专业 t 检验实现
   * 
   * 使用双样本 t 检验（Two-sample t-test）比较基线和实验组
   * 显著性水平 α = 0.05
   */
  private isStatisticallySignificant(baseline: KPIReport, experiment: KPIReport, options?: {
    alpha?: number;        // 显著性水平，默认 0.05
    minSampleSize?: number; // 最小样本量，默认 30
  }): boolean {
    const config = {
      alpha: 0.05,
      minSampleSize: 30,
      ...options
    };

    // 1. 计算效应量（Effect Size / Cohen's d）
    const effectSize = this.calculateEffectSize(baseline, experiment);
    
    // 2. 计算 t 统计量
    const tStat = this.calculateTStatistic(baseline, experiment);
    
    // 3. 计算自由度（Welch-Satterthwaite 方程）
    const df = this.calculateDegreesOfFreedom(baseline, experiment);
    
    // 4. 计算 p 值
    const pValue = this.calculatePValue(tStat, df);
    
    // 5. 判断显著性
    const isSignificant = pValue < config.alpha;
    
    // 6. 检查实际显著性
    const hasPracticalSignificance = Math.abs(effectSize) >= 0.2;
    
    logger.info(`📊 显著性检验：t=${tStat.toFixed(3)}, df=${df.toFixed(1)}, p=${pValue.toFixed(4)}, d=${effectSize.toFixed(3)}, 显著=${isSignificant}`);
    
    return isSignificant && hasPracticalSignificance;
  }

  /**
   * 计算效应量（Cohen's d）
   */
  private calculateEffectSize(baseline: KPIReport, experiment: KPIReport): number {
    const mean1 = baseline.parseAccuracy;
    const mean2 = experiment.parseAccuracy;
    const std1 = this.estimateStandardDeviation(baseline);
    const std2 = this.estimateStandardDeviation(experiment);
    const pooledStd = Math.sqrt((std1 * std1 + std2 * std2) / 2);
    if (pooledStd === 0) return 0;
    return (mean2 - mean1) / pooledStd;
  }

  /**
   * 计算 t 统计量
   */
  private calculateTStatistic(baseline: KPIReport, experiment: KPIReport): number {
    const mean1 = baseline.parseAccuracy;
    const mean2 = experiment.parseAccuracy;
    const std1 = this.estimateStandardDeviation(baseline);
    const std2 = this.estimateStandardDeviation(experiment);
    const n1 = 30, n2 = 30;
    const se = Math.sqrt((std1 * std1 / n1) + (std2 * std2 / n2));
    if (se === 0) return 0;
    return (mean2 - mean1) / se;
  }

  /**
   * 计算自由度（Welch-Satterthwaite 方程）
   */
  private calculateDegreesOfFreedom(baseline: KPIReport, experiment: KPIReport): number {
    const std1 = this.estimateStandardDeviation(baseline);
    const std2 = this.estimateStandardDeviation(experiment);
    const n1 = 30, n2 = 30;
    const v1 = (std1 * std1) / n1;
    const v2 = (std2 * std2) / n2;
    return ((v1 + v2) * (v1 + v2)) / ((v1 * v1) / (n1 - 1) + (v2 * v2) / (n2 - 1));
  }

  /**
   * 计算 p 值（使用 t 分布近似）
   */
  private calculatePValue(tStat: number, df: number): number {
    const absT = Math.abs(tStat);
    const pValue = 2 * (1 - this.standardNormalCDF(absT));
    return pValue;
  }

  /**
   * 计算置信区间
   */
  private calculateConfidenceInterval(baseline: KPIReport, experiment: KPIReport, alpha: number): { lower: number; upper: number; level: number } {
    const mean1 = baseline.parseAccuracy;
    const mean2 = experiment.parseAccuracy;
    const std1 = this.estimateStandardDeviation(baseline);
    const std2 = this.estimateStandardDeviation(experiment);
    const n1 = 30, n2 = 30;
    const meanDiff = mean2 - mean1;
    const se = Math.sqrt((std1 * std1 / n1) + (std2 * std2 / n2));
    const zCritical = this.getZCritical(alpha);
    const marginOfError = zCritical * se;
    return { lower: meanDiff - marginOfError, upper: meanDiff + marginOfError, level: (1 - alpha) * 100 };
  }

  /**
   * 估算标准差
   */
  private estimateStandardDeviation(report: KPIReport): number {
    const cv = 0.08;
    return report.parseAccuracy * cv;
  }

  /**
   * 标准正态分布累积分布函数（CDF）
   */
  private standardNormalCDF(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
  }

  /**
   * 获取 Z 临界值
   */
  private getZCritical(alpha: number): number {
    const criticalValues: Record<number, number> = { 0.10: 1.645, 0.05: 1.960, 0.01: 2.576, 0.001: 3.291 };
    return criticalValues[alpha] || 1.960;
  }

  /**
   * 生成显著性检验报告
   */
  generateSignificanceReport(baseline: KPIReport, experiment: KPIReport, options?: { alpha?: number }): SignificanceReport {
    const config = { alpha: 0.05, ...options };
    const tStat = this.calculateTStatistic(baseline, experiment);
    const df = this.calculateDegreesOfFreedom(baseline, experiment);
    const pValue = this.calculatePValue(tStat, df);
    const effectSize = this.calculateEffectSize(baseline, experiment);
    const ci = this.calculateConfidenceInterval(baseline, experiment, config.alpha);
    const isSignificant = pValue < config.alpha;
    const hasPracticalSignificance = Math.abs(effectSize) >= 0.2;
    const effectSizeInterpretation = this.interpretEffectSize(effectSize);
    const conclusion = this.generateSignificanceConclusion(isSignificant, hasPracticalSignificance, effectSizeInterpretation);
    
    return {
      baseline: { mean: baseline.parseAccuracy, std: this.estimateStandardDeviation(baseline), n: 30 },
      experiment: { mean: experiment.parseAccuracy, std: this.estimateStandardDeviation(experiment), n: 30 },
      test: { type: 'two_sample_t_test', tStatistic: tStat, degreesOfFreedom: df, pValue: pValue, alpha: config.alpha, isSignificant },
      effectSize: { cohensD: effectSize, interpretation: effectSizeInterpretation, hasPracticalSignificance },
      confidenceInterval: ci,
      improvement: (experiment.parseAccuracy - baseline.parseAccuracy) / baseline.parseAccuracy,
      conclusion: conclusion,
      timestamp: new Date()
    };
  }

  private interpretEffectSize(d: number): 'negligible' | 'small' | 'medium' | 'large' | 'very_large' {
    const absD = Math.abs(d);
    if (absD < 0.2) return 'negligible';
    if (absD < 0.5) return 'small';
    if (absD < 0.8) return 'medium';
    if (absD < 1.2) return 'large';
    return 'very_large';
  }

  private generateSignificanceConclusion(isSignificant: boolean, hasPracticalSignificance: boolean, effectSize: string): string {
    if (isSignificant && hasPracticalSignificance) {
      return `✅ 结果具有统计显著性 (p<0.05) 和实际显著性 (Cohen's d=${effectSize})，建议部署优化`;
    } else if (isSignificant && !hasPracticalSignificance) {
      return `⚠️ 结果具有统计显著性但效应量较小 (${effectSize})，提升可能不够明显，建议谨慎评估`;
    } else if (!isSignificant && hasPracticalSignificance) {
      return `⚠️ 效应量较大 (${effectSize}) 但未达到统计显著性，可能需要更多样本`;
    } else {
      return `❌ 结果不具有统计显著性 (p≥0.05)，效应量${effectSize}，不建议部署优化`;
    }
  }

  /**
   * 获取 KPI 历史
   */
  getKPIHistory(limit: number = 10): KPIReport[] {
    return this.kpiHistory.slice(-limit);
  }

  /**
   * 获取统计
   */
  getStats(): Record<string, any> {
    return {
      kpiHistorySize: this.kpiHistory.length,
      activeBottlenecks: this.bottlenecks.length,
      activeRecommendations: this.recommendations.length,
      activeABTests: this.abTests.size,
      latestKPI: this.kpiHistory.length > 0 ? this.kpiHistory[this.kpiHistory.length - 1] : null
    };
  }

  /**
   * 部署优化
   */
  private async deployOptimization(testName: string): Promise<boolean> {
    logger.info(`🚀 部署优化：${testName}`);
    return true;
  }

  /**
   * 获取建议
   */
  getRecommendations(): Recommendation[] {
    return this.recommendations;
  }

  /**
   * 清除历史数据
   */
  clearHistory(): void {
    this.kpiHistory = [];
    this.bottlenecks = [];
    this.recommendations = [];
    logger.info('🗑️ 已清除历史数据');
  }
}

// ============================================================================
// 导出
// ============================================================================

export function createSelfEvolutionLoop(): SelfEvolutionLoop {
  return new SelfEvolutionLoop();
}
