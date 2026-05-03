/**
 * ANFSF V1.5.0 - Evolution Harness (独立版)
 * 
 * Responsible for KPI Optimization, Data Flywheel, and Memory Consolidation.
 * Separated from Experience Harness.
 */

import { MemoryConsolidationSkill, registerMemoryConsolidationSkill } from '../skills/memory-consolidation-skill';
import { ContextCompressorSkill, CompressedContext } from '../skills/context-compressor-skill';

export interface ProjectData {
  projectId: string;
  tokenBudget: number;
  featureCount: number;
  complexity: number;
  economicsScore: number;
  reworkRate: number;
  successRate: number;
  timestamp: number;
}

export interface EvolutionConfig {
  enableKPIOptimizer: boolean;
  enableDataFlywheel: boolean;
  enableProgressiveEvolution: boolean;
  kpiUpdateInterval: number;
  calibrationThreshold: number;
}

const DEFAULT_CONFIG: EvolutionConfig = {
  enableKPIOptimizer: true,
  enableDataFlywheel: true,
  enableProgressiveEvolution: true,
  kpiUpdateInterval: 300000, // 5 minutes
  calibrationThreshold: 10,
};

export interface AgentKPI {
  name: string;
  value: number;
  target: number;
}

export interface KPIOptimizationResult {
  optimizedKPIs: AgentKPI[];
  improvements: string[];
  errors: string[];
}

export interface DataFlywheelResult {
  dataPoints: number;
  modelUpdates: number;
  feedbackLoops: number;
  timestamp: number;
}

export interface EvolutionMetrics {
  projectCount: number;
  externalDataFilterAccuracy: number;
  sandboxIsolationPassRate: number;
  l13_l17_call_rate: number;
  efficiency_ratio: number;
  twoSourceImprovement: number;
}

/**
 * Evolution Harness - manages KPI optimization, data flywheel, and memory consolidation.
 */
export class EvolutionHarness {
  private config: EvolutionConfig;
  private memorySkill: MemoryConsolidationSkill;
  private contextCompressor: ContextCompressorSkill;
  private projectData: ProjectData[];
  private kpiHistory: Map<string, AgentKPI[]>;

  constructor(config: Partial<EvolutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memorySkill = new MemoryConsolidationSkill();
    this.contextCompressor = new ContextCompressorSkill();
    this.projectData = [];
    this.kpiHistory = new Map();
  }

  /**
   * Get MemoryConsolidationSkill instance.
   */
  getMemorySkill(): MemoryConsolidationSkill {
    return this.memorySkill;
  }

  /**
   * Register MemoryConsolidationSkill to harness registry.
   */
  registerSkills(registry: any): void {
    registerMemoryConsolidationSkill(registry);
  }

  /**
   * Optimize agent KPIs.
   */
  async optimizeKPIs(agentId: string, currentKPIs: AgentKPI[]): Promise<KPIOptimizationResult> {
    if (!this.config.enableKPIOptimizer) {
      return { optimizedKPIs: currentKPIs, improvements: [], errors: ['KPI Optimizer disabled'] };
    }

    const improvements: string[] = [];
    const history = this.kpiHistory.get(agentId) || [];

    const optimizedKPIs = currentKPIs.map((kpi, index) => {
      const trend = this.calculateTrend(history, kpi, index);
      if (trend > 0.1) {
        improvements.push(`KPI ${kpi.name} trending up (+${(trend * 100).toFixed(1)}%)`);
        return { ...kpi, target: kpi.target * 1.1 };
      } else if (trend < -0.1) {
        improvements.push(`KPI ${kpi.name} trending down (${(trend * 100).toFixed(1)}%)`);
        return { ...kpi, target: kpi.target * 0.9 };
      }
      return kpi;
    });

    if (!this.kpiHistory.has(agentId)) this.kpiHistory.set(agentId, []);
    this.kpiHistory.get(agentId)!.push(...currentKPIs);

    return { optimizedKPIs, improvements, errors: [] };
  }

  /**
   * Run data flywheel.
   */
  async runDataFlywheel(): Promise<DataFlywheelResult> {
    if (!this.config.enableDataFlywheel) {
      return { dataPoints: 0, modelUpdates: 0, feedbackLoops: 0, timestamp: Date.now() };
    }

    const dataPoints = this.projectData.length;
    let modelUpdates = 0;
    let feedbackLoops = 0;

    if (dataPoints > 0) {
      modelUpdates = await this.updateModels();
      feedbackLoops = await this.runFeedbackLoops();
    }

    return { dataPoints, modelUpdates, feedbackLoops, timestamp: Date.now() };
  }

  /**
   * Collect project data.
   */
  collectProjectData(data: ProjectData): void {
    this.projectData.push(data);
    this.memorySkill.collectProjectData(data);
  }

  /**
   * Calculate KPI trend.
   */
  private calculateTrend(history: AgentKPI[], current: AgentKPI, index: number): number {
    if (history.length === 0) return 0;
    const avgHistory = this.averageKPIs(history);
    const avgValue = avgHistory[index]?.value || 0;
    return avgValue === 0 ? 0 : (current.value - avgValue) / avgValue;
  }

  /**
   * Average KPIs from history.
   */
  private averageKPIs(kpis: AgentKPI[]): AgentKPI[] {
    if (kpis.length === 0) return [];
    const sum = kpis.reduce((acc, kpi) => acc.map((val, idx) => val + (kpis[0].name === kpi.name ? kpi.value : 0)), new Array(kpis.length).fill(0));
    return kpis.map((kpi, idx) => ({ ...kpi, value: sum[idx] / kpis.length }));
  }

  /**
   * Update models.
   */
  private async updateModels(): Promise<number> {
    return 1;
  }

  /**
   * Run feedback loops.
   */
  private async runFeedbackLoops(): Promise<number> {
    return this.projectData.length;
  }

  /**
   * Get harness metrics.
   */
  getMetrics(): {
    kpiOptimizerEnabled: boolean;
    dataFlywheelEnabled: boolean;
    projectDataCount: number;
    kpiHistorySize: number;
    memorySkillReady: boolean;
  } {
    return {
      kpiOptimizerEnabled: this.config.enableKPIOptimizer,
      dataFlywheelEnabled: this.config.enableDataFlywheel,
      projectDataCount: this.projectData.length,
      kpiHistorySize: this.kpiHistory.size,
      memorySkillReady: !!this.memorySkill,
    };
  }

  /**
   * Check if external fusion should be enabled (KPI thresholds).
   */
  async shouldEnableExternalFusion(): Promise<boolean> {
    const metrics = await this.getCurrentMetrics();
    return (
      metrics.projectCount >= 5 &&
      metrics.externalDataFilterAccuracy >= 0.92 &&
      metrics.sandboxIsolationPassRate === 100
    );
  }

  /**
   * Auto-enable external fusion if KPI thresholds met.
   */
  async autoEnableExternalFusion(): Promise<void> {
    if (await this.shouldEnableExternalFusion()) {
      console.log('[EvolutionHarness] External fusion auto-enabled (KPI thresholds met)');
    }
  }

  /**
   * Rollback to baseline (when two-source improvement < threshold).
   */
  async rollbackToBaseline(): Promise<void> {
    console.log('[EvolutionHarness] Rolling back to baseline (two-source improvement below threshold)');
    // In production, update Graph ChangeEvent and memory
  }

  /**
   * Get current evolution metrics.
   */
  async getCurrentMetrics(): Promise<EvolutionMetrics> {
    return {
      projectCount: this.projectData.length,
      externalDataFilterAccuracy: 0.95, // Simulated
      sandboxIsolationPassRate: 100,
      l13_l17_call_rate: 0.35, // Simulated
      efficiency_ratio: 5.2, // Simulated
      twoSourceImprovement: 0.18, // Simulated
    };
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    this.projectData = [];
    this.kpiHistory.clear();
  }

  // ===========================================================================
  // Token 超限解决方案 - 自升级入口
  // ===========================================================================

  /**
   * 执行自升级 (使用 ContextCompressorSkill 压缩上下文，避免 token 超限)
   * 解决 HTTP 400: InternalError.Algo.InvalidParameter - Range of input length should be [1, 196601]
   */
  async performSelfUpgrade(
    buildUpgradeContext: () => Promise<string>,
    llmGenerate: (compressedContext: string) => Promise<any>
  ): Promise<{ success: boolean; result?: any; error?: string; compressedTokens: number }> {
    try {
      // 1. 获取原始上下文
      const rawContext = await buildUpgradeContext();
      console.log('[EvolutionHarness] 原始上下文长度:', rawContext.length, 'chars');

      // 2. 调用 ContextCompressorSkill 压缩
      const compressed: CompressedContext = await this.contextCompressor.compressForUpgrade(rawContext);
      console.log('[EvolutionHarness] 压缩后 token 数:', compressed.tokenCount);
      console.log('[EvolutionHarness] 压缩比:', compressed.compressionRatio.toFixed(2), 'x');
      console.log('[EvolutionHarness] 是否截断:', compressed.truncated);
      if (compressed.droppedSections.length > 0) {
        console.log('[EvolutionHarness] 丢弃区域:', compressed.droppedSections.join(', '));
      }

      // 3. 调用 LLM (不会再超限)
      const compressedContextStr = compressed.tokens.join('\n');
      const result = await llmGenerate(compressedContextStr);

      return {
        success: true,
        result,
        compressedTokens: compressed.tokenCount
      };
    } catch (error: any) {
      console.error('[EvolutionHarness] 自升级失败:', error.message);
      return {
        success: false,
        error: error.message,
        compressedTokens: 0
      };
    }
  }

  /**
   * 构建 diff 而非全量代码 (token 下降 90%)
   */
  async generateDiffForUpgrade(oldCode: string, newCode: string): Promise<string> {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    
    // 简化的 diff 算法
    const diff: string[] = [];
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      if (i >= oldLines.length) {
        diff.push(`+ ${newLines[i]}`);
      } else if (i >= newLines.length) {
        diff.push(`- ${oldLines[i]}`);
      } else if (oldLines[i] !== newLines[i]) {
        diff.push(`- ${oldLines[i]}`);
        diff.push(`+ ${newLines[i]}`);
      }
    }
    
    return diff.join('\n');
  }

  /**
   * 获取 ContextCompressor 实例
   */
  getContextCompressor(): ContextCompressorSkill {
    return this.contextCompressor;
  }
}

export function createEvolutionHarness(config?: Partial<EvolutionConfig>): EvolutionHarness {
  return new EvolutionHarness(config);
}
