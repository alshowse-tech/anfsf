/**
 * ANFSF L17 — Regression Detector
 *
 * Independent regression detection module.
 * Detects performance degradation by comparing KPI trends and code changes
 * between versions. Supports: trend analysis, change impact scoring,
 * regression classification, and alert generation.
 */

// Types are defined in this file, no external imports needed

// ============================================================================
// Types
// ============================================================================

export type RegressionSeverity = 'info' | 'warning' | 'major' | 'critical';

export type RegressionType =
  | 'kpi_decline'
  | 'performance_degradation'
  | 'error_rate_increase'
  | 'contract_breaking_change'
  | 'dependency_drift';

export interface KPIHistoryPoint {
  /** Timestamp */
  timestamp: number;
  /** Version ID */
  version: string;
  /** KPI name to value */
  values: Record<string, number>;
}

export interface CodeChangeSummary {
  /** Files changed */
  filesChanged: number;
  /** Lines added */
  linesAdded: number;
  /** Lines removed */
  linesRemoved: number;
  /** Breaking contract changes */
  breakingChanges: number;
  /** Modified modules/components */
  affectedModules: string[];
}

export interface RegressionDetection {
  /** Detection ID */
  id: string;
  /** Type of regression */
  type: RegressionType;
  /** Severity level */
  severity: RegressionSeverity;
  /** KPI or metric that regressed */
  metric: string;
  /** Previous value */
  previousValue: number;
  /** Current value */
  currentValue: number;
  /** Change percentage (negative = decline) */
  changePercent: number;
  /** Affected modules */
  affectedModules: string[];
  /** Detection timestamp */
  detectedAt: number;
  /** Description of regression */
  description: string;
  /** Confidence (0-1) */
  confidence: number;
}

export interface RegressionReport {
  /** Report ID */
  id: string;
  /** Comparison between versions */
  fromVersion: string;
  toVersion: string;
  /** Detected regressions */
  regressions: RegressionDetection[];
  /** Overall health change (negative = worse) */
  healthDelta: number;
  /** Whether any regression was detected */
  hasRegressions: boolean;
  /** Maximum severity found */
  maxSeverity: RegressionSeverity | null;
  /** Report timestamp */
  generatedAt: number;
}

export interface RegressionDetectorConfig {
  /** KPI decline threshold (%) to trigger detection */
  kpiDeclineThreshold: number;
  /** Error rate increase threshold (absolute) */
  errorRateThreshold: number;
  /** Performance degradation threshold (ms increase) */
  perfDegradationThresholdMs: number;
  /** Minimum history points for trend analysis */
  minHistoryPoints: number;
  /** Trend window: analyze last N data points */
  trendWindow: number;
}

const DEFAULT_CONFIG: RegressionDetectorConfig = {
  kpiDeclineThreshold: 5.0, // 5% decline
  errorRateThreshold: 0.05, // 5% increase
  perfDegradationThresholdMs: 100,
  minHistoryPoints: 2,
  trendWindow: 10,
};

// ============================================================================
// Regression Detector
// ============================================================================

const SEVERITY_ORDER: Record<RegressionSeverity, number> = {
  info: 0,
  warning: 1,
  major: 2,
  critical: 3,
};

export class RegressionDetector {
  private config: RegressionDetectorConfig;
  private kpiHistory: KPIHistoryPoint[] = [];
  private codeChanges: Map<string, CodeChangeSummary> = new Map();

  constructor(config: Partial<RegressionDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Data Recording
  // ---------------------------------------------------------------------------

  /**
   * Record a KPI snapshot for trend analysis.
   */
  recordKPI(version: string, values: Record<string, number>): void {
    this.kpiHistory.push({
      timestamp: Date.now(),
      version,
      values: { ...values },
    });

    // Trim to trend window
    if (this.kpiHistory.length > this.config.trendWindow) {
      this.kpiHistory = this.kpiHistory.slice(-this.config.trendWindow);
    }
  }

  /**
   * Record code changes for a version.
   */
  recordCodeChange(version: string, summary: CodeChangeSummary): void {
    this.codeChanges.set(version, summary);
  }

  // ---------------------------------------------------------------------------
  // Detection
  // ---------------------------------------------------------------------------

  /**
   * Compare two versions and detect regressions.
   */
  compareVersions(fromVersion: string, toVersion: string): RegressionReport | null {
    const fromPoint = this.kpiHistory.find(p => p.version === fromVersion);
    const toPoint = this.kpiHistory.find(p => p.version === toVersion);

    if (!fromPoint || !toPoint) return null;

    const regressions: RegressionDetection[] = [];

    // Check KPI declines
    for (const [kpiName, toValue] of Object.entries(toPoint.values)) {
      const fromValue = fromPoint.values[kpiName];
      if (fromValue === undefined) continue;

      const change = toValue - fromValue;
      const changePercent = fromValue !== 0 ? (change / Math.abs(fromValue)) * 100 : 0;

      // KPIs where lower is worse (success rates, efficiency)
      const lowerIsWorse = [
        'style_loading_success_rate',
        'contract_change_success_rate',
        'role_assignment_efficiency',
        'token_budget_compliance',
        'deployment_success_rate',
        'healthScore',
      ].includes(kpiName);

      if (lowerIsWorse && changePercent < -this.config.kpiDeclineThreshold) {
        regressions.push(this.createDetection({
          type: 'kpi_decline',
          metric: kpiName,
          previousValue: fromValue,
          currentValue: toValue,
          changePercent,
        }));
      }

      // KPIs where higher is worse (error rates, latency)
      const higherIsWorse = [
        'failureRate',
        'errorRate',
        'avgLatency',
        'p99Latency',
      ].includes(kpiName);

      if (higherIsWorse && changePercent > this.config.kpiDeclineThreshold) {
        regressions.push(this.createDetection({
          type: 'error_rate_increase',
          metric: kpiName,
          previousValue: fromValue,
          currentValue: toValue,
          changePercent,
        }));
      }
    }

    // Check code change impact
    const fromChanges = this.codeChanges.get(fromVersion);
    const toChanges = this.codeChanges.get(toVersion);
    if (fromChanges && toChanges) {
      if (toChanges.breakingChanges > fromChanges.breakingChanges) {
        regressions.push(this.createDetection({
          type: 'contract_breaking_change',
          metric: 'breakingChanges',
          previousValue: fromChanges.breakingChanges,
          currentValue: toChanges.breakingChanges,
          changePercent: ((toChanges.breakingChanges - fromChanges.breakingChanges) / Math.max(1, fromChanges.breakingChanges)) * 100,
          affectedModules: toChanges.affectedModules,
        }));
      }
    }

    // Calculate overall health delta
    const healthDelta = this.calculateHealthDelta(fromPoint.values, toPoint.values);

    const maxSeverity = regressions.length > 0
      ? regressions.reduce((max, r) =>
          SEVERITY_ORDER[r.severity] > SEVERITY_ORDER[max] ? r.severity : max
        , 'info' as RegressionSeverity)
      : null;

    return {
      id: `regression-${Date.now()}`,
      fromVersion,
      toVersion,
      regressions,
      healthDelta,
      hasRegressions: regressions.length > 0,
      maxSeverity,
      generatedAt: Date.now(),
    };
  }

  /**
   * Analyze KPI trend across all recorded history.
   * Returns regressions detected by trend analysis (linear regression slope).
   */
  analyzeTrends(): RegressionDetection[] {
    if (this.kpiHistory.length < this.config.minHistoryPoints) return [];

    const regressions: RegressionDetection[] = [];
    const allKPIs = new Set<string>();

    for (const point of this.kpiHistory) {
      for (const kpi of Object.keys(point.values)) {
        allKPIs.add(kpi);
      }
    }

    for (const kpiName of allKPIs) {
      const values: number[] = [];
      for (const point of this.kpiHistory) {
        values.push(point.values[kpiName] ?? NaN);
      }

      // Simple linear regression slope
      const slope = this.computeSlope(values);
      if (slope === null) continue;

      // Compute mean of valid values for normalization
      const valid: number[] = [];
      for (const v of values) {
        if (!isNaN(v)) valid.push(v);
      }

      const lowerIsWorse = [
        'style_loading_success_rate',
        'contract_change_success_rate',
        'role_assignment_efficiency',
        'token_budget_compliance',
        'deployment_success_rate',
        'healthScore',
      ].includes(kpiName);

      const firstValue = values.find(v => !isNaN(v)) ?? 0;
      const lastValue = [...values].reverse().find(v => !isNaN(v)) ?? 0;
      const changePercent = firstValue !== 0 ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100 : 0;

      // Normalize slope by mean value to be scale-invariant
      const mean = valid.reduce((s, v) => s + v, 0) / valid.length;
      const normalizedSlope = mean !== 0 ? slope / Math.abs(mean) : slope;

      // Negative slope for lower-is-worse KPIs = regression
      if (lowerIsWorse && normalizedSlope < -0.05 && changePercent < -this.config.kpiDeclineThreshold) {
        regressions.push(this.createDetection({
          type: 'kpi_decline',
          metric: kpiName,
          previousValue: firstValue,
          currentValue: lastValue,
          changePercent,
          confidence: Math.min(1, Math.abs(normalizedSlope)),
        }));
      }

      // Positive slope for higher-is-worse KPIs = regression
      const higherIsWorse = ['failureRate', 'errorRate', 'avgLatency', 'p99Latency'].includes(kpiName);
      if (higherIsWorse && normalizedSlope > 0.05 && changePercent > this.config.kpiDeclineThreshold) {
        regressions.push(this.createDetection({
          type: 'error_rate_increase',
          metric: kpiName,
          previousValue: firstValue,
          currentValue: lastValue,
          changePercent,
          confidence: Math.min(1, normalizedSlope),
        }));
      }
    }

    return regressions;
  }

  /**
   * Get KPI history.
   */
  getKPIHistory(): KPIHistoryPoint[] {
    return [...this.kpiHistory];
  }

  /**
   * Get all recorded regressions from a report.
   */
  getRegressionsFromReport(report: RegressionReport): RegressionDetection[] {
    return [...report.regressions];
  }

  /**
   * Clear all recorded data.
   */
  clear(): void {
    this.kpiHistory = [];
    this.codeChanges.clear();
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private createDetection(params: {
    type: RegressionType;
    metric: string;
    previousValue: number;
    currentValue: number;
    changePercent: number;
    affectedModules?: string[];
    confidence?: number;
  }): RegressionDetection {
    const { changePercent, confidence } = params;
    const severity = this.classifySeverity(changePercent, confidence ?? 0.8);
    const direction = changePercent > 0 ? '+' : '';

    return {
      id: `det-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: params.type,
      severity,
      metric: params.metric,
      previousValue: params.previousValue,
      currentValue: params.currentValue,
      changePercent,
      affectedModules: params.affectedModules ?? [],
      detectedAt: Date.now(),
      description: `${params.metric}: ${params.previousValue.toFixed(2)} → ${params.currentValue.toFixed(2)} (${direction}${changePercent.toFixed(1)}%)`,
      confidence: confidence ?? 0.8,
    };
  }

  private classifySeverity(changePercent: number, confidence: number): RegressionSeverity {
    const absChange = Math.abs(changePercent);
    const adjustedSeverity = absChange * confidence;

    if (adjustedSeverity > 30) return 'critical';
    if (adjustedSeverity > 15) return 'major';
    if (adjustedSeverity > 5) return 'warning';
    return 'info';
  }

  private calculateHealthDelta(from: Record<string, number>, to: Record<string, number>): number {
    let totalDelta = 0;
    let count = 0;

    for (const [key, fromVal] of Object.entries(from)) {
      const toVal = to[key];
      if (toVal === undefined) continue;

      const lowerIsWorse = [
        'style_loading_success_rate',
        'contract_change_success_rate',
        'role_assignment_efficiency',
        'token_budget_compliance',
        'deployment_success_rate',
        'healthScore',
      ].includes(key);

      const delta = toVal - fromVal;
      if (lowerIsWorse) {
        totalDelta += delta;
      } else {
        totalDelta -= delta; // Higher is worse, so invert
      }
      count++;
    }

    return count > 0 ? totalDelta / count : 0;
  }

  /**
   * Compute linear regression slope using least squares.
   * Returns null if insufficient valid data.
   */
  private computeSlope(values: number[]): number | null {
    const valid: number[] = [];
    for (const v of values) {
      if (!isNaN(v)) valid.push(v);
    }
    if (valid.length < 2) return null;

    const n = valid.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += valid[i];
      sumXY += i * valid[i];
      sumX2 += i * i;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;

    return (n * sumXY - sumX * sumY) / denominator;
  }
}

/**
 * Create a new RegressionDetector instance.
 */
export function createRegressionDetector(config?: Partial<RegressionDetectorConfig>): RegressionDetector {
  return new RegressionDetector(config);
}
