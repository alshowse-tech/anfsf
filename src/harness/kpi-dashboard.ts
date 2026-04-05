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

/**
 * KPI Dashboard for tracking evolution metrics.
 */
export class KPIDashboard {
  private metrics: KPIMetric[] = [];
  private alertCallback?: (alert: AlertConfig) => void;

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
}

/**
 * Create KPI Dashboard instance.
 */
export function createKPIDashboard(): KPIDashboard {
  return new KPIDashboard();
}
