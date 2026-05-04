/**
 * ANFSF V1.5.0 - KPI Dashboard
 * 
 * Records and monitors evolution metrics with auto-alert on threshold violations.
 */

export interface KPIMetric {
  metric: string;
  value: number;
  timestamp: number;
}

export interface AlertConfig {
  level: 'warning' | 'critical';
  message: string;
  action: string;
}

export interface ArchitectureMetrics {
  l13_l17_call_rate: number;
  layer8_5_code_delta: number;
  efficiency_ratio: number;
}

/**
 * KPI Dashboard for tracking evolution metrics.
 */
export class KPIDashboard {
  private metrics: KPIMetric[] = [];
  private alertCallback?: (alert: AlertConfig) => void;

  // Architecture monitoring thresholds
  private readonly THRESHOLDS = {
    L13_L17_CALL_RATE: 0.45, // ≤45%
    LAYER_8_5_CODE_DELTA: 30, // ≤30 lines
    EFFICIENCY_RATIO: 4.8, // ≥4.8:1
  };

  /**
   * Record a metric value.
   */
  async record(metric: string, value: number): Promise<void> {
    this.metrics.push({
      metric,
      value,
      timestamp: Date.now(),
    });

    // Check for twoSourceImprovement threshold violation (3 consecutive days < 15%)
    if (metric === 'twoSourceImprovement') {
      await this.checkTwoSourceThreshold(value);
    }
  }

  /**
   * Check two-source improvement threshold.
   */
  private async checkTwoSourceThreshold(currentValue: number): Promise<void> {
    const recentValues = this.getRecentValues('twoSourceImprovement', 3);
    
    if (recentValues.length >= 3 && recentValues.every(v => v < 0.15)) {
      await this.sendAlert({
        level: 'warning',
        message: 'Two-source improvement below 15% for 3 consecutive days',
        action: 'auto_pause_two_source',
      });
    }
  }

  /**
   * Get recent metric values.
   */
  getRecentValues(metric: string, count: number): number[] {
    return this.metrics
      .filter(m => m.metric === metric)
      .slice(-count)
      .map(m => m.value);
  }

  /**
   * Send alert.
   */
  async sendAlert(alert: AlertConfig): Promise<void> {
    console.log('[KPIDashboard] Alert:', alert);
    if (this.alertCallback) {
      this.alertCallback(alert);
    }
  }

  /**
   * Set alert callback.
   */
  setAlertCallback(callback: (alert: AlertConfig) => void): void {
    this.alertCallback = callback;
  }

  /**
   * Get current metrics.
   */
  getCurrentMetrics(): Record<string, number> {
    const latest = new Map<string, number>();
    for (const m of this.metrics) {
      latest.set(m.metric, m.value);
    }
    return Object.fromEntries(latest);
  }

  /**
   * Export metrics in Prometheus text exposition format.
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    lines.push('# HELP anfsf_kpi_value Current KPI metric values');
    lines.push('# TYPE anfsf_kpi_value gauge');
    for (const [name, value] of Object.entries(this.getCurrentMetrics())) {
      lines.push(`anfsf_kpi_value{name="${name}"} ${value}`);
    }
    return lines.join('\n') + '\n';
  }

  /**
   * Export labels for Prometheus instance identification.
   */
  exportPrometheusLabels(): Record<string, string> {
    return {
      job: 'anfsf',
      instance: process.env.HOSTNAME || 'localhost',
      version: process.env.npm_package_version || '0.8.5',
    };
  }

  /**
   * Daily architecture self-check.
   */
  async dailyArchitectureSelfCheck(currentMetrics: ArchitectureMetrics): Promise<{ passed: boolean; violations: string[] }> {
    const violations: string[] = [];

    // L13-L17 call rate check (≤45%)
    if (currentMetrics.l13_l17_call_rate > this.THRESHOLDS.L13_L17_CALL_RATE) {
      violations.push(`L13-L17 call rate ${currentMetrics.l13_l17_call_rate} > ${this.THRESHOLDS.L13_L17_CALL_RATE}`);
    }

    // Layer 8.5 code delta check (≤30 lines)
    if (currentMetrics.layer8_5_code_delta > this.THRESHOLDS.LAYER_8_5_CODE_DELTA) {
      violations.push(`Layer 8.5 code delta ${currentMetrics.layer8_5_code_delta} > ${this.THRESHOLDS.LAYER_8_5_CODE_DELTA}`);
    }

    // Efficiency ratio check (≥4.8:1)
    if (currentMetrics.efficiency_ratio < this.THRESHOLDS.EFFICIENCY_RATIO) {
      violations.push(`Efficiency ratio ${currentMetrics.efficiency_ratio} < ${this.THRESHOLDS.EFFICIENCY_RATIO}`);
    }

    // Send alert if violations found
    if (violations.length > 0) {
      await this.sendAlert({
        level: 'critical',
        message: `Architecture violation detected: ${violations.join(', ')}`,
        action: 'full_rollback',
      });
    }

    return { passed: violations.length === 0, violations };
  }
}

/**
 * Create KPI Dashboard instance.
 */
export function createKPIDashboard(): KPIDashboard {
  return new KPIDashboard();
}
