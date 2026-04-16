/**
 * ASF V4.0 Role Engine - KPI Types
 *
 * Type definitions for Role KPI system.
 * Version: v0.8.5
 */
/**
 * KPI time window options.
 */
export type KPIWindow = '30m' | '2h' | '1d' | '7d';
/**
 * Trend direction.
 */
export type TrendDirection = 'improving' | 'stable' | 'degrading';
/**
 * Role KPI snapshot at a point in time.
 */
export interface RoleKPISnapshot {
    /** Role ID */
    roleId: string;
    /** Timestamp of this snapshot */
    timestamp: number;
    /** Time window used for calculation */
    window: KPIWindow;
    /** Tasks completed per hour */
    throughput: number;
    /** Failed tasks / total tasks (0-1) */
    failureRate: number;
    /** Reworked tasks / total tasks (0-1) */
    reworkRate: number;
    /** Current queue length / max queue length */
    queuePressure: number;
    /** Ownership conflicts / total changes (0-1) */
    conflictRate: number;
    /** Task type distribution drift from capability (0-1) */
    driftIndex: number;
    /** Overall health score (0-100) */
    healthScore: number;
    /** Trend compared to previous period */
    trend: TrendDirection;
    /** Total tasks in window */
    taskCount: number;
    /** Total changes in window */
    changeCount: number;
}
/**
 * KPI timeseries entry for Prometheus export.
 */
export interface KPITimeseriesEntry {
    /** Metric name */
    metric: string;
    /** Labels */
    labels: Record<string, string>;
    /** Values over time */
    values: Array<{
        timestamp: number;
        value: number;
    }>;
}
/**
 * Task for KPI calculation.
 */
export interface Task {
    id: string;
    type: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    roleId: string;
    createdAt: number;
    completedAt?: number;
    reworkCount?: number;
    metadata?: Record<string, any>;
}
/**
 * Change event for KPI calculation.
 */
export interface KPIChangeEvent {
    id: string;
    action: string;
    roleId: string;
    conflict?: boolean;
    timestamp: number;
}
/**
 * Queue state for KPI calculation.
 */
export interface QueueState {
    roleId: string;
    currentLength: number;
    maxLength: number;
    processingCount: number;
}
/**
 * Capability distribution for drift calculation.
 */
export interface CapabilityDistribution {
    [taskType: string]: number;
}
/**
 * KPI-triggered action types.
 */
export type KPIAction = 'suggest_split' | 'suggest_merge' | 'suggest_reassign' | 'alert';
/**
 * Action priority.
 */
export type ActionPriority = 'low' | 'medium' | 'high';
/**
 * KPI action policy.
 */
export interface KPIActionPolicy {
    /** Policy name/ID */
    name?: string;
    /** Condition function */
    condition: (kpi: RoleKPISnapshot) => boolean;
    /** Action to trigger */
    action: KPIAction;
    /** Human-readable message (string or function) */
    message: string | ((kpi: RoleKPISnapshot) => string);
    /** Priority level */
    priority: ActionPriority;
}
/**
 * Triggered action result.
 */
export interface TriggeredAction {
    /** Policy that triggered this action */
    policy: KPIActionPolicy;
    /** Role ID */
    roleId: string;
    /** KPI snapshot that triggered */
    kpi: RoleKPISnapshot;
    /** Formatted message */
    message: string;
    /** Timestamp */
    timestamp: number;
}
/**
 * KPI query options.
 */
export interface KPIQuery {
    /** Role ID (optional, omit for all roles) */
    roleId?: string;
    /** Time window */
    window?: KPIWindow;
    /** Include trend calculation */
    includeTrend?: boolean;
    /** Compare with previous period */
    compare?: boolean;
}
/**
 * KPI export options.
 */
export interface KPIExportOptions {
    /** Export format */
    format: 'prometheus' | 'jsonl' | 'snapshot';
    /** Roles to export (omit for all) */
    roleIds?: string[];
    /** Time range */
    since?: number;
    until?: number;
    /** Output file path */
    outputPath?: string;
}
/**
 * KPI thresholds.
 */
export declare const KPI_THRESHOLDS: {
    readonly QUEUE_PRESSURE_WARNING: 0.8;
    readonly QUEUE_PRESSURE_CRITICAL: 1.2;
    readonly FAILURE_RATE_WARNING: 0.15;
    readonly FAILURE_RATE_CRITICAL: 0.25;
    readonly REWORK_RATE_WARNING: 0.2;
    readonly REWORK_RATE_CRITICAL: 0.3;
    readonly CONFLICT_RATE_WARNING: 0.1;
    readonly CONFLICT_RATE_CRITICAL: 0.15;
    readonly DRIFT_INDEX_WARNING: 0.25;
    readonly DRIFT_INDEX_CRITICAL: 0.35;
    readonly HEALTH_SCORE_GOOD: 80;
    readonly HEALTH_SCORE_WARNING: 60;
    readonly HEALTH_SCORE_CRITICAL: 40;
};
/**
 * Window duration in milliseconds.
 */
export declare const WINDOW_DURATION: Record<KPIWindow, number>;
/**
 * Health score weights.
 */
export declare const HEALTH_SCORE_WEIGHTS: {
    readonly throughput: 0.2;
    readonly failureRate: 0.25;
    readonly reworkRate: 0.15;
    readonly queuePressure: 0.15;
    readonly conflictRate: 0.15;
    readonly driftIndex: 0.1;
};
/**
 * Calculate health score from metrics.
 */
export declare function calculateHealthScore(metrics: {
    throughput: number;
    failureRate: number;
    reworkRate: number;
    queuePressure: number;
    conflictRate: number;
    driftIndex: number;
}): number;
/**
 * Determine trend from health score delta.
 */
export declare function determineTrend(currentScore: number, previousScore: number): TrendDirection;
/**
 * Get health status from score.
 */
export declare function getHealthStatus(healthScore: number): 'good' | 'warning' | 'critical';
export declare function isRoleKPISnapshot(obj: any): obj is RoleKPISnapshot;
export declare function isKPIActionPolicy(obj: any): obj is KPIActionPolicy;
