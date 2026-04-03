/**
 * ASF V4.0 Role Engine - KPI Types
 * 
 * Type definitions for Role KPI system.
 * Version: v0.8.5
 */

// ============================================================================
// Core Types
// ============================================================================

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
  
  // --- Core Metrics ---
  
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
  
  // --- Derived Metrics ---
  
  /** Overall health score (0-100) */
  healthScore: number;
  
  /** Trend compared to previous period */
  trend: TrendDirection;
  
  // --- Metadata ---
  
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
  [taskType: string]: number; // Probability (0-1)
}

// ============================================================================
// KPI Action Policy Types
// ============================================================================

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

// ============================================================================
// Query Options
// ============================================================================

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

// ============================================================================
// Thresholds and Constants
// ============================================================================

/**
 * KPI thresholds.
 */
export const KPI_THRESHOLDS = {
  // Queue pressure thresholds
  QUEUE_PRESSURE_WARNING: 0.8,
  QUEUE_PRESSURE_CRITICAL: 1.2,
  
  // Failure rate thresholds
  FAILURE_RATE_WARNING: 0.15,
  FAILURE_RATE_CRITICAL: 0.25,
  
  // Rework rate thresholds
  REWORK_RATE_WARNING: 0.2,
  REWORK_RATE_CRITICAL: 0.3,
  
  // Conflict rate thresholds
  CONFLICT_RATE_WARNING: 0.1,
  CONFLICT_RATE_CRITICAL: 0.15,
  
  // Drift index thresholds
  DRIFT_INDEX_WARNING: 0.25,
  DRIFT_INDEX_CRITICAL: 0.35,
  
  // Health score thresholds
  HEALTH_SCORE_GOOD: 80,
  HEALTH_SCORE_WARNING: 60,
  HEALTH_SCORE_CRITICAL: 40,
} as const;

/**
 * Window duration in milliseconds.
 */
export const WINDOW_DURATION: Record<KPIWindow, number> = {
  '30m': 30 * 60 * 1000,
  '2h': 2 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// Health Score Calculation
// ============================================================================

/**
 * Health score weights.
 */
export const HEALTH_SCORE_WEIGHTS = {
  throughput: 0.2,
  failureRate: 0.25,
  reworkRate: 0.15,
  queuePressure: 0.15,
  conflictRate: 0.15,
  driftIndex: 0.1,
} as const;

/**
 * Calculate health score from metrics.
 */
export function calculateHealthScore(metrics: {
  throughput: number;
  failureRate: number;
  reworkRate: number;
  queuePressure: number;
  conflictRate: number;
  driftIndex: number;
}): number {
  let score = 100;
  
  // Deduct for negative metrics
  score -= metrics.failureRate * 100 * HEALTH_SCORE_WEIGHTS.failureRate;
  score -= metrics.reworkRate * 100 * HEALTH_SCORE_WEIGHTS.reworkRate;
  score -= metrics.queuePressure * 100 * HEALTH_SCORE_WEIGHTS.queuePressure;
  score -= metrics.conflictRate * 100 * HEALTH_SCORE_WEIGHTS.conflictRate;
  score -= metrics.driftIndex * 100 * HEALTH_SCORE_WEIGHTS.driftIndex;
  
  // Bonus for high throughput
  if (metrics.throughput > 5) {
    score += 5;
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Determine trend from health score delta.
 */
export function determineTrend(currentScore: number, previousScore: number): TrendDirection {
  const delta = currentScore - previousScore;
  
  if (delta > 5) return 'improving';
  if (delta < -5) return 'degrading';
  return 'stable';
}

/**
 * Get health status from score.
 */
export function getHealthStatus(healthScore: number): 'good' | 'warning' | 'critical' {
  if (healthScore >= KPI_THRESHOLDS.HEALTH_SCORE_GOOD) return 'good';
  if (healthScore >= KPI_THRESHOLDS.HEALTH_SCORE_WARNING) return 'warning';
  return 'critical';
}

// ============================================================================
// Type Guards
// ============================================================================

export function isRoleKPISnapshot(obj: any): obj is RoleKPISnapshot {
  return (
    typeof obj === 'object' &&
    typeof obj.roleId === 'string' &&
    typeof obj.timestamp === 'number' &&
    typeof obj.window === 'string' &&
    typeof obj.throughput === 'number' &&
    typeof obj.failureRate === 'number' &&
    typeof obj.reworkRate === 'number' &&
    typeof obj.queuePressure === 'number' &&
    typeof obj.conflictRate === 'number' &&
    typeof obj.driftIndex === 'number' &&
    typeof obj.healthScore === 'number' &&
    typeof obj.trend === 'string'
  );
}

export function isKPIActionPolicy(obj: any): obj is KPIActionPolicy {
  return (
    typeof obj === 'object' &&
    typeof obj.condition === 'function' &&
    typeof obj.action === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.priority === 'string'
  );
}
