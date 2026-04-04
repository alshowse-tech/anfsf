/**
 * ANFSF V1.5.0 - Evolution Harness
 * 
 * Responsible for Progressive Evolution Framework, KPI Optimizer, and RL Data Flywheel.
 * Phase 2 of Layer 8.5 decomposition.
 */

import type { AgentKPI, EvolutionMetrics } from '../core/evolution/types';

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
  calibrationThreshold: 10,   // 10 projects for calibration
};

export interface KPIOptimizationResult {
  success: boolean;
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

/**
 * Evolution Harness - manages KPI optimization, data flywheel, and progressive evolution.
 */
export class EvolutionHarness {
  private config: EvolutionConfig;
  private projectData: ProjectData[];
  private kpiHistory: Map<string, AgentKPI[]>;
  private lastCalibration: number;

  constructor(config: Partial<EvolutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.projectData = [];
    this.kpiHistory = new Map();
    this.lastCalibration = 0;
  }

  /**
   * Collect project data for economics weight calibration.
   */
  collectProjectData(data: ProjectData): void {
    this.projectData.push(data);
    
    // Trigger calibration if threshold reached
    if (this.projectData.length >= this.config.calibrationThreshold && 
        this.shouldRecalibrate()) {
      this.calibrateEconomicsWeights();
    }
  }

  /**
   * Optimize agent KPIs.
   */
  async optimizeKPIs(agentId: string, currentKPIs: AgentKPI[]): Promise<KPIOptimizationResult> {
    if (!this.config.enableKPIOptimizer) {
      return {
        success: false,
        optimizedKPIs: currentKPIs,
        improvements: [],
        errors: ['KPI Optimizer disabled'],
      };
    }

    const errors: string[] = [];
    const improvements: string[] = [];

    try {
      // Analyze historical KPI data
      const history = this.kpiHistory.get(agentId) || [];
      
      // Calculate trends
      const trends = this.calculateKPITrends(history, currentKPIs);
      
      // Optimize based on trends
      const optimizedKPIs = currentKPIs.map((kpi, index) => {
        const trend = trends[index] || 0;
        
        // Adjust KPI based on trend
        if (trend > 0.1) {
          improvements.push(`KPI ${kpi.name} trending up (+${(trend * 100).toFixed(1)}%)`);
          return {
            ...kpi,
            target: kpi.target * 1.1, // Increase target by 10%
          };
        } else if (trend < -0.1) {
          improvements.push(`KPI ${kpi.name} trending down (${(trend * 100).toFixed(1)}%)`);
          return {
            ...kpi,
            target: kpi.target * 0.9, // Decrease target by 10%
          };
        }
        
        return kpi;
      });

      // Store in history
      if (!this.kpiHistory.has(agentId)) {
        this.kpiHistory.set(agentId, []);
      }
      this.kpiHistory.get(agentId)!.push(...currentKPIs);

      return {
        success: true,
        optimizedKPIs,
        improvements,
        errors,
      };
    } catch (error) {
      errors.push(`KPI optimization failed: ${error}`);
      return {
        success: false,
        optimizedKPIs: currentKPIs,
        improvements: [],
        errors,
      };
    }
  }

  /**
   * Run data flywheel for continuous learning.
   */
  async runDataFlywheel(): Promise<DataFlywheelResult> {
    if (!this.config.enableDataFlywheel) {
      return {
        dataPoints: 0,
        modelUpdates: 0,
        feedbackLoops: 0,
        timestamp: Date.now(),
      };
    }

    let dataPoints = 0;
    let modelUpdates = 0;
    let feedbackLoops = 0;

    try {
      // Process collected project data
      dataPoints = this.projectData.length;

      // Update models based on data
      if (dataPoints > 0) {
        modelUpdates = await this.updateModels();
      }

      // Run feedback loops
      feedbackLoops = await this.runFeedbackLoops();

      return {
        dataPoints,
        modelUpdates,
        feedbackLoops,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        dataPoints,
        modelUpdates: 0,
        feedbackLoops: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Calibrate economics weights using collected project data.
   */
  calibrateEconomicsWeights(): { success: boolean; newWeights?: any; confidence?: number } {
    if (this.projectData.length < this.config.calibrationThreshold) {
      return {
        success: false,
      };
    }

    try {
      // Calculate regression coefficients
      const weights = this.performRegression();
      
      // Calculate confidence interval
      const confidence = this.calculateConfidence(weights);

      // Update last calibration time
      this.lastCalibration = Date.now();

      return {
        success: true,
        newWeights: weights,
        confidence,
      };
    } catch (error) {
      return {
        success: false,
      };
    }
  }

  /**
   * Get harness metrics.
   */
  getMetrics(): {
    projectDataCount: number;
    kpiHistorySize: number;
    lastCalibration: number;
    kpiOptimizerEnabled: boolean;
    dataFlywheelEnabled: boolean;
  } {
    return {
      projectDataCount: this.projectData.length,
      kpiHistorySize: this.kpiHistory.size,
      lastCalibration: this.lastCalibration,
      kpiOptimizerEnabled: this.config.enableKPIOptimizer,
      dataFlywheelEnabled: this.config.enableDataFlywheel,
    };
  }

  /**
   * Check if recalibration is needed.
   */
  private shouldRecalibrate(): boolean {
    const now = Date.now();
    const hoursSinceLastCalibration = (now - this.lastCalibration) / (1000 * 60 * 60);
    
    // Recalibrate every 24 hours if threshold reached
    return hoursSinceLastCalibration >= 24;
  }

  /**
   * Calculate KPI trends.
   */
  private calculateKPITrends(history: AgentKPI[], current: AgentKPI[]): number[] {
    if (history.length === 0) {
      return current.map(() => 0);
    }

    const trends: number[] = [];
    const avgHistory = this.averageKPIs(history);

    for (let i = 0; i < current.length; i++) {
      const currentValue = current[i].value;
      const avgValue = avgHistory[i]?.value || 0;
      
      if (avgValue === 0) {
        trends.push(0);
      } else {
        trends.push((currentValue - avgValue) / avgValue);
      }
    }

    return trends;
  }

  /**
   * Average KPIs from history.
   */
  private averageKPIs(kpis: AgentKPI[]): AgentKPI[] {
    if (kpis.length === 0) return [];

    const sum = kpis.reduce((acc, kpi) => {
      return acc.map((val, idx) => val + (kpis[0].name === kpi.name ? kpi.value : 0));
    }, new Array(kpis.length).fill(0));

    return kpis.map((kpi, idx) => ({
      ...kpi,
      value: sum[idx] / kpis.length,
    }));
  }

  /**
   * Perform regression analysis for economics weights.
   */
  private performRegression(): any {
    // Simplified regression for demonstration
    // In production, use actual statistical library
    
    const interfaceCostWeight = -0.30;
    const bottleneckWeight = -0.20;
    const skillMatchWeight = 0.20;
    const parallelismGainWeight = 0.15;
    const reworkRiskWeight = -0.15;

    return {
      interfaceCost: interfaceCostWeight,
      bottleneck: bottleneckWeight,
      skillMatch: skillMatchWeight,
      parallelismGain: parallelismGainWeight,
      reworkRisk: reworkRiskWeight,
    };
  }

  /**
   * Calculate confidence interval for weights.
   */
  private calculateConfidence(weights: any): number {
    // Simplified confidence calculation
    // In production, use actual statistical methods
    const sampleSize = this.projectData.length;
    
    // Confidence increases with sample size
    const baseConfidence = 0.5;
    const sizeBonus = Math.min(sampleSize / 20, 0.4); // Max 0.4 bonus at 20 samples
    
    return baseConfidence + sizeBonus;
  }

  /**
   * Update models based on data.
   */
  private async updateModels(): Promise<number> {
    // Simulate model update
    return 1;
  }

  /**
   * Run feedback loops.
   */
  private async runFeedbackLoops(): Promise<number> {
    // Simulate feedback loop execution
    return this.projectData.length;
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    this.projectData = [];
    this.kpiHistory.clear();
  }
}

/**
 * Singleton harness instance.
 */
let defaultHarness: EvolutionHarness | null = null;

export function getDefaultHarness(): EvolutionHarness {
  if (!defaultHarness) {
    defaultHarness = new EvolutionHarness();
  }
  return defaultHarness;
}

export function resetDefaultHarness(): void {
  defaultHarness = null;
}
