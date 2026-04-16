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
export declare class KPIDashboard {
    private metrics;
    private alertCallback?;
    private readonly THRESHOLDS;
    /**
     * Record a metric value.
     */
    record(metric: string, value: number): Promise<void>;
    /**
     * Check two-source improvement threshold.
     */
    private checkTwoSourceThreshold;
    /**
     * Get recent metric values.
     */
    getRecentValues(metric: string, count: number): number[];
    /**
     * Send alert.
     */
    sendAlert(alert: AlertConfig): Promise<void>;
    /**
     * Set alert callback.
     */
    setAlertCallback(callback: (alert: AlertConfig) => void): void;
    /**
     * Get current metrics.
     */
    getCurrentMetrics(): Record<string, number>;
    /**
     * Daily architecture self-check.
     */
    dailyArchitectureSelfCheck(currentMetrics: ArchitectureMetrics): Promise<{
        passed: boolean;
        violations: string[];
    }>;
}
/**
 * Create KPI Dashboard instance.
 */
export declare function createKPIDashboard(): KPIDashboard;
