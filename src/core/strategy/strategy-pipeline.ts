/**
 * ANFSF L5 — Strategy Pipeline
 *
 * Composes Interface Budget Calculator + KPI Engine + Offline Optimizer
 * into a unified strategy pass.
 *
 * Input: IR + Assignment + TaskDAG + RoleEconomics
 * Output: BudgetMetrics[] + RoleKPISnapshot[] + KPIAction[] + calibrated EconomicsWeights
 */

import { calculateInterfaceBudget, generateBudgetAlerts, getBudgetRecommendations, type BudgetGraphStore } from '../role/interface-budget';
import type { BudgetMetrics, BudgetAlert } from '../role/budget-types';
import { calculateRoleKPI, evaluateTriggersForRoles, DEFAULT_KPI_POLICIES, type KPIDataSource } from '../role/kpi-engine';
import type { RoleKPISnapshot, KPIWindow, TriggeredAction, KPIActionPolicy } from '../role/kpi-types';
import { OfflineOptimizer, type EconomicsWeights, type CalibrationResult } from '../evolution/offline-optimizer';
import { GuardPipeline, type GuardPipelineConfig, type CheckResult } from '../guard-pipeline';

// ============================================================================
// Types
// ============================================================================

export interface StrategyPipelineInput {
  /** Role IDs to evaluate */
  roleIds: string[];
  /** Graph store for budget calculation */
  graphStore: BudgetGraphStore;
  /** KPI data source for each role */
  kpiDataSource: (roleId: string) => KPIDataSource;
  /** Optional offline optimizer instance */
  optimizer?: OfflineOptimizer;
  /** KPI time window */
  kpiWindow?: KPIWindow;
  /** Custom KPI action policies (overrides defaults) */
  kpiPolicies?: KPIActionPolicy[];
  /** Custom guard pipeline config */
  guardConfig?: Partial<GuardPipelineConfig>;
}

export interface StrategyPipelineResult {
  /** Per-role budget metrics */
  budgetMetrics: Map<string, BudgetMetrics>;
  /** Per-role KPI snapshots */
  kpiSnapshots: Map<string, RoleKPISnapshot>;
  /** Triggered actions from KPI evaluation */
  triggeredActions: TriggeredAction[];
  /** Budget alerts */
  budgetAlerts: BudgetAlert[];
  /** Budget recommendations */
  budgetRecommendations: Map<string, string[]>;
  /** Calibrated economics weights */
  economicsWeights: EconomicsWeights;
  /** Calibration result from offline optimizer */
  calibrationResult: CalibrationResult | null;
  /** Guard pipeline result */
  guardPassed: boolean;
  /** Guard score (0-1) */
  guardScore: number;
  /** Execution time in ms */
  executionTime: number;
}

export interface StrategyPipelineConfig {
  /** Run offline optimizer calibration */
  enableCalibration: boolean;
  /** Run guard pipeline validation */
  enableGuardChecks: boolean;
  /** Minimum health score to pass guard (0-100) */
  minHealthScore: number;
  /** Maximum budget utilization to pass guard (0-1) */
  maxBudgetUtilization: number;
}

const DEFAULT_PIPELINE_CONFIG: StrategyPipelineConfig = {
  enableCalibration: true,
  enableGuardChecks: true,
  minHealthScore: 60,
  maxBudgetUtilization: 0.85,
};

const DEFAULT_WEIGHTS: EconomicsWeights = {
  interfaceCost: -0.30,
  bottleneck: -0.20,
  skillMatch: 0.20,
  parallelismGain: 0.15,
  reworkRisk: -0.15,
};

// ============================================================================
// Strategy Pipeline
// ============================================================================

export class StrategyPipeline {
  private config: StrategyPipelineConfig;

  constructor(config: Partial<StrategyPipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  }

  /**
   * Execute the full strategy pipeline.
   *
   * Pipeline stages:
   *   1. Calculate interface budgets for all roles
   *   2. Calculate KPI snapshots for all roles
   *   3. Evaluate KPI triggers → actions
   *   4. Run offline optimizer calibration (if enabled)
   *   5. Run guard pipeline validation (if enabled)
   */
  async execute(input: StrategyPipelineInput): Promise<StrategyPipelineResult> {
    const startTime = Date.now();
    const { roleIds, graphStore, kpiDataSource } = input;
    const policies = input.kpiPolicies ?? DEFAULT_KPI_POLICIES;

    // Stage 1: Calculate interface budgets
    const budgetMetrics = await this.calculateBudgets(roleIds, graphStore);

    // Stage 2: Calculate KPI snapshots
    const kpiSnapshots = await this.calculateKPIs(roleIds, kpiDataSource, input.kpiWindow);

    // Stage 3: Evaluate KPI triggers
    const kpiMap = new Map<string, RoleKPISnapshot>();
    for (const [roleId, snapshot] of kpiSnapshots) {
      kpiMap.set(roleId, snapshot);
    }
    const triggeredActions = evaluateTriggersForRoles([...kpiMap.values()], policies);

    // Stage 4: Generate budget alerts and recommendations
    const budgetAlerts: BudgetAlert[] = [];
    const budgetRecommendations = new Map<string, string[]>();
    for (const [roleId, metrics] of budgetMetrics) {
      budgetAlerts.push(...generateBudgetAlerts(metrics, roleId));
      budgetRecommendations.set(roleId, getBudgetRecommendations(metrics));
    }

    // Stage 5: Run offline optimizer calibration
    let calibrationResult: CalibrationResult | null = null;
    if (this.config.enableCalibration && input.optimizer) {
      if (input.optimizer.shouldCalibrate()) {
        calibrationResult = input.optimizer.calibrate();
      }
    }
    const economicsWeights = input.optimizer
      ? input.optimizer.getCurrentWeights()
      : DEFAULT_WEIGHTS;

    // Stage 6: Run guard pipeline validation
    let guardPassed = true;
    let guardScore = 1.0;
    if (this.config.enableGuardChecks) {
      const guardResult = this.runGuardChecks(kpiMap, budgetMetrics);
      guardPassed = guardResult.passed;
      guardScore = guardResult.score;
    }

    const executionTime = Date.now() - startTime;

    return {
      budgetMetrics,
      kpiSnapshots,
      triggeredActions,
      budgetAlerts,
      budgetRecommendations,
      economicsWeights,
      calibrationResult,
      guardPassed,
      guardScore,
      executionTime,
    };
  }

  // ---------------------------------------------------------------------------
  // Stage 1: Budget Calculation
  // ---------------------------------------------------------------------------

  private async calculateBudgets(
    roleIds: string[],
    graphStore: BudgetGraphStore
  ): Promise<Map<string, BudgetMetrics>> {
    const results = new Map<string, BudgetMetrics>();
    for (const roleId of roleIds) {
      const metrics = calculateInterfaceBudget({ roleId, graph: graphStore });
      results.set(roleId, metrics);
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // Stage 2: KPI Calculation
  // ---------------------------------------------------------------------------

  private async calculateKPIs(
    roleIds: string[],
    kpiDataSource: (roleId: string) => KPIDataSource,
    window?: KPIWindow
  ): Promise<Map<string, RoleKPISnapshot>> {
    const results = new Map<string, RoleKPISnapshot>();
    for (const roleId of roleIds) {
      const dataSource = kpiDataSource(roleId);
      const snapshot = await calculateRoleKPI(roleId, dataSource, window);
      results.set(roleId, snapshot);
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // Stage 6: Guard Checks
  // ---------------------------------------------------------------------------

  private runGuardChecks(
    kpiMap: Map<string, RoleKPISnapshot>,
    budgetMap: Map<string, BudgetMetrics>
  ): { passed: boolean; score: number } {
    const checks: CheckResult[] = [];

    // Check 1: KPI health scores
    for (const [roleId, kpi] of kpiMap) {
      const kpiPassed = kpi.healthScore >= this.config.minHealthScore;
      checks.push({
        score: kpi.healthScore / 100,
        passed: kpiPassed,
        violations: kpiPassed
          ? []
          : [{ severity: kpi.healthScore >= 40 ? 'major' : 'critical', message: `${roleId} health score ${kpi.healthScore} < ${this.config.minHealthScore}` }],
      });
    }

    // Check 2: Budget utilization
    for (const [roleId, budget] of budgetMap) {
      const utilOk = budget.utilizationRate <= this.config.maxBudgetUtilization;
      checks.push({
        score: 1 - budget.utilizationRate,
        passed: utilOk,
        violations: utilOk
          ? []
          : [{ severity: budget.utilizationRate >= 0.95 ? 'critical' : 'major', message: `${roleId} budget utilization ${(budget.utilizationRate * 100).toFixed(1)}% > ${(this.config.maxBudgetUtilization * 100).toFixed(0)}%` }],
      });
    }

    // Check 3: No critical KPI failures
    const hasCriticalFailure = [...kpiMap.values()].some(
      k => k.failureRate > 0.5
    );
    checks.push({
      score: hasCriticalFailure ? 0 : 1,
      passed: !hasCriticalFailure,
      violations: hasCriticalFailure
        ? [{ severity: 'critical' as const, message: 'One or more roles have failure rate > 50%' }]
        : [],
    });

    // Aggregate: overall score = average of check scores
    const totalScore = checks.reduce((s, c) => s + c.score, 0) / checks.length;
    const anyCritical = checks.some(c => c.violations.some(v => v.severity === 'critical'));
    const passed = !anyCritical && totalScore >= 0.5;

    return { passed, score: totalScore };
  }
}

/**
 * Create a new StrategyPipeline instance.
 */
export function createStrategyPipeline(config?: Partial<StrategyPipelineConfig>): StrategyPipeline {
  return new StrategyPipeline(config);
}
