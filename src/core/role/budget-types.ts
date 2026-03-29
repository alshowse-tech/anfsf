/**
 * ASF V4.0 Role Engine - Interface Budget Types
 * 
 * Type definitions for interface budget calculation.
 * Version: v0.8.5
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Cross-role edge representation.
 */
export interface CrossRoleEdge {
  /** Unique edge ID */
  id: string;
  
  /** Source node and role */
  from: {
    nodeId: string;
    roleId: string;
  };
  
  /** Target node and role */
  to: {
    nodeId: string;
    roleId: string;
  };
  
  /** Edge type (depends_on, calls, updates, etc.) */
  edgeType: string;
  
  /** Optional contract type if edge involves a contract */
  contractType?: string;
  
  /** Optional risk score */
  riskScore?: number;
}

/**
 * Contract touch representation.
 */
export interface ContractTouch {
  /** Contract ID */
  contractId: string;
  
  /** Contract type (OpenAPI, DBSchema, etc.) */
  contractType: string;
  
  /** Role that owns the contract */
  ownerRoleId: string;
  
  /** Role that is touching the contract */
  toucherRoleId: string;
  
  /** Risk score for this touch */
  riskScore?: number;
}

/**
 * Interface cost breakdown.
 */
export interface InterfaceCost {
  /** Cost from cross-role edges */
  edgeCost: number;
  
  /** Cost from contract touches */
  contractCost: number;
  
  /** Risk multiplier applied */
  riskMultiplier: number;
  
  /** Total weighted cost */
  totalCost: number;
  
  /** Detailed breakdown */
  breakdown: {
    edges: Array<{
      edgeType: string;
      baseCost: number;
      riskWeight: number;
      total: number;
    }>;
    contracts: Array<{
      contractType: string;
      baseCost: number;
      riskWeight: number;
      total: number;
    }>;
  };
}

/**
 * Budget metrics for a role.
 */
export interface BudgetMetrics {
  /** Total budget allocated (default: 100) */
  totalBudget: number;
  
  /** Budget used */
  usedBudget: number;
  
  /** Budget remaining */
  remainingBudget: number;
  
  /** Utilization rate (0-1) */
  utilizationRate: number;
  
  /** Number of cross-role edges */
  crossRoleEdges: number;
  
  /** Number of contract touches */
  contractTouches: number;
  
  /** Weighted cost (before risk adjustment) */
  weightedCost: number;
  
  /** Risk-adjusted cost */
  riskAdjustedCost: number;
  
  /** Cost breakdown */
  breakdown: InterfaceCost;
  
  /** Timestamp of calculation */
  calculatedAt: number;
  
  /** Time window used for calculation */
  timeWindow?: number;
}

/**
 * Budget comparison between roles.
 */
export interface BudgetComparison {
  /** Role ID */
  roleId: string;
  
  /** This role's metrics */
  metrics: BudgetMetrics;
  
  /** Average metrics across all roles */
  average: {
    utilizationRate: number;
    crossRoleEdges: number;
    riskAdjustedCost: number;
  };
  
  /** Deviation from average */
  deviation: {
    utilizationRate: number;
    crossRoleEdges: number;
    riskAdjustedCost: number;
  };
  
  /** Status indicator */
  status: 'healthy' | 'warning' | 'critical';
}

/**
 * Budget history entry.
 */
export interface BudgetHistoryEntry {
  /** Role ID */
  roleId: string;
  
  /** Timestamp */
  timestamp: number;
  
  /** Metrics at this point in time */
  metrics: BudgetMetrics;
}

/**
 * Budget query options.
 */
export interface BudgetQuery {
  /** Role ID to query (optional, omit for all roles) */
  roleId?: string;
  
  /** Time window in ms */
  timeWindow?: number;
  
  /** Include breakdown details */
  includeBreakdown?: boolean;
  
  /** Compare with average */
  compare?: boolean;
}

/**
 * Budget alert.
 */
export interface BudgetAlert {
  /** Alert ID */
  id: string;
  
  /** Role ID */
  roleId: string;
  
  /** Alert type */
  type: 'high_utilization' | 'rapid_growth' | 'threshold_breach';
  
  /** Severity */
  severity: 'warning' | 'critical';
  
  /** Message */
  message: string;
  
  /** Current utilization */
  currentUtilization: number;
  
  /** Threshold that was breached */
  threshold: number;
  
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Thresholds and Constants
// ============================================================================

/**
 * Budget thresholds.
 */
export const BUDGET_THRESHOLDS = {
  /** Default total budget per role */
  DEFAULT_TOTAL: 100,
  
  /** Warning threshold (utilization > 0.7) */
  WARNING_THRESHOLD: 0.7,
  
  /** Critical threshold (utilization > 0.9) */
  CRITICAL_THRESHOLD: 0.9,
  
  /** Maximum healthy cross-role edges */
  MAX_HEALTHY_EDGES: 20,
  
  /** Maximum healthy contract touches */
  MAX_HEALTHY_CONTRACTS: 10,
} as const;

/**
 * Determine budget status from utilization rate.
 */
export function getBudgetStatus(utilizationRate: number): 'healthy' | 'warning' | 'critical' {
  if (utilizationRate >= BUDGET_THRESHOLDS.CRITICAL_THRESHOLD) {
    return 'critical';
  }
  if (utilizationRate >= BUDGET_THRESHOLDS.WARNING_THRESHOLD) {
    return 'warning';
  }
  return 'healthy';
}

// ============================================================================
// Type Guards
// ============================================================================

export function isBudgetMetrics(obj: any): obj is BudgetMetrics {
  return (
    typeof obj === 'object' &&
    typeof obj.totalBudget === 'number' &&
    typeof obj.usedBudget === 'number' &&
    typeof obj.remainingBudget === 'number' &&
    typeof obj.utilizationRate === 'number' &&
    typeof obj.crossRoleEdges === 'number' &&
    typeof obj.contractTouches === 'number' &&
    typeof obj.weightedCost === 'number' &&
    typeof obj.riskAdjustedCost === 'number' &&
    typeof obj.calculatedAt === 'number'
  );
}

export function isBudgetAlert(obj: any): obj is BudgetAlert {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.roleId === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.severity === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.currentUtilization === 'number' &&
    typeof obj.threshold === 'number' &&
    typeof obj.timestamp === 'number'
  );
}
