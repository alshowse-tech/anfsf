/**
 * ASF V4.0 Role Engine - Interface Budget Calculator
 * 
 * Core budget calculation engine.
 * Version: v0.8.5
 */

import type {
  CrossRoleEdge,
  ContractTouch,
  InterfaceCost,
  BudgetMetrics,
  BudgetQuery,
  BudgetAlert,
} from './budget-types';
import {
  EDGE_COST,
  CONTRACT_COST,
  getEdgeCost,
  getContractCost,
  calculateRiskWeight,
  calculateCombinedRiskWeight,
  RISK_THRESHOLDS,
} from './weights';
import { BUDGET_THRESHOLDS, getBudgetStatus } from './budget-types';

/**
 * Graph store interface for budget calculation.
 */
export interface BudgetGraphStore {
  /** Get nodes owned by a role */
  getNodesByRole(roleId: string): Array<{ id: string; type: string }>;
  
  /** Get edges for a node */
  getEdges(nodeId: string): Array<{
    to: string;
    type: string;
    contractType?: string;
  }>;
  
  /** Get owner role for a node */
  getOwner(nodeId: string): string | null;
  
  /** Get node type */
  getNodeType(nodeId: string): string;
  
  /** Get risk score for a node */
  getNodeRiskScore(nodeId: string): number;
}

/**
 * Ownership lattice interface.
 */
export interface OwnershipLatticeLike {
  /** Get owner role for a node */
  getOwner(nodeId: string): string | null;
  
  /** Check if role has authority */
  hasAuthority(roleId: string, authority: string): boolean;
}

/**
 * Calculate interface budget for a role.
 * 
 * This is the main entry point for budget calculation.
 * 
 * Formula:
 * weighted_interface_cost =
 *   Σ cross_role_edge (EDGE_COST[edgeType] × riskWeight)
 *   + Σ contract_touch (CONTRACT_COST[contractType] × riskWeight)
 * 
 * @param params - Calculation parameters
 * @returns Budget metrics
 * 
 * @example
 * ```typescript
 * const metrics = calculateInterfaceBudget({
 *   roleId: 'backend-team',
 *   graph: graphStore,
 *   lattice: ownershipLattice,
 *   timeWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
 * });
 * 
 * console.log(`Utilization: ${metrics.utilizationRate * 100}%`);
 * console.log(`Status: ${getBudgetStatus(metrics.utilizationRate)}`);
 * ```
 */
export function calculateInterfaceBudget(params: {
  roleId: string;
  graph: BudgetGraphStore;
  lattice?: OwnershipLatticeLike;
  timeWindow?: number;
  totalBudget?: number;
}): BudgetMetrics {
  const {
    roleId,
    graph,
    lattice,
    timeWindow,
    totalBudget = BUDGET_THRESHOLDS.DEFAULT_TOTAL,
  } = params;

  // Get all nodes owned by this role
  const roleNodes = graph.getNodesByRole(roleId);
  const roleNodeIds = new Set(roleNodes.map((n) => n.id));

  // Initialize counters
  let totalEdgeCost = 0;
  let totalContractCost = 0;
  let crossRoleEdgeCount = 0;
  let contractTouchCount = 0;

  // Edge breakdown
  const edgeBreakdown: Array<{
    edgeType: string;
    baseCost: number;
    riskWeight: number;
    total: number;
  }> = [];

  // Contract breakdown
  const contractBreakdown: Array<{
    contractType: string;
    baseCost: number;
    riskWeight: number;
    total: number;
  }> = [];

  // Track contract touches to avoid double counting
  const contractTouches = new Set<string>();

  // Process each node
  for (const node of roleNodes) {
    const edges = graph.getEdges(node.id);
    const nodeRiskScore = graph.getNodeRiskScore(node.id);

    for (const edge of edges) {
      // Get target node's owner
      const targetRole = lattice?.getOwner(edge.to) ?? graph.getOwner(edge.to);

      // Only count cross-role edges
      if (targetRole && targetRole !== roleId) {
        crossRoleEdgeCount++;

        // Calculate edge cost
        const baseCost = getEdgeCost(edge.type);
        const riskWeight = calculateCombinedRiskWeight({
          baseRiskScore: nodeRiskScore,
          nodeType: graph.getNodeType(edge.to),
          contractType: edge.contractType,
        });

        const edgeTotal = baseCost * riskWeight;
        totalEdgeCost += edgeTotal;

        edgeBreakdown.push({
          edgeType: edge.type,
          baseCost,
          riskWeight,
          total: Math.round(edgeTotal * 100) / 100,
        });

        // Track contract touches
        if (edge.contractType) {
          const contractKey = `${edge.to}:${edge.contractType}`;
          if (!contractTouches.has(contractKey)) {
            contractTouches.add(contractKey);
            contractTouchCount++;

            // Calculate contract cost
            const contractBaseCost = getContractCost(edge.contractType);
            const contractTotal = contractBaseCost * riskWeight;
            totalContractCost += contractTotal;

            contractBreakdown.push({
              contractType: edge.contractType,
              baseCost: contractBaseCost,
              riskWeight,
              total: Math.round(contractTotal * 100) / 100,
            });
          }
        }
      }
    }
  }

  // Calculate weighted cost
  const weightedCost = totalEdgeCost + totalContractCost;

  // Calculate risk-adjusted cost (add historical failure rate factor)
  // For now, use a simple 10% buffer
  const riskAdjustedCost = weightedCost * 1.1;

  // Calculate utilization
  const usedBudget = Math.min(riskAdjustedCost, totalBudget);
  const remainingBudget = Math.max(totalBudget - riskAdjustedCost, 0);
  const utilizationRate = riskAdjustedCost / totalBudget;

  // Build breakdown
  const breakdown: InterfaceCost = {
    edgeCost: Math.round(totalEdgeCost * 100) / 100,
    contractCost: Math.round(totalContractCost * 100) / 100,
    riskMultiplier: 1.1,
    totalCost: Math.round(riskAdjustedCost * 100) / 100,
    breakdown: {
      edges: edgeBreakdown,
      contracts: contractBreakdown,
    },
  };

  return {
    totalBudget,
    usedBudget: Math.round(usedBudget * 100) / 100,
    remainingBudget: Math.round(remainingBudget * 100) / 100,
    utilizationRate: Math.round(utilizationRate * 1000) / 1000,
    crossRoleEdges: crossRoleEdgeCount,
    contractTouches: contractTouchCount,
    weightedCost: Math.round(weightedCost * 100) / 100,
    riskAdjustedCost: Math.round(riskAdjustedCost * 100) / 100,
    breakdown,
    calculatedAt: Date.now(),
    timeWindow,
  };
}

/**
 * Calculate budget for multiple roles.
 */
export function calculateBudgetsForRoles(
  roleIds: string[],
  graph: BudgetGraphStore,
  lattice?: OwnershipLatticeLike,
  timeWindow?: number
): Map<string, BudgetMetrics> {
  const results = new Map<string, BudgetMetrics>();

  for (const roleId of roleIds) {
    const metrics = calculateInterfaceBudget({
      roleId,
      graph,
      lattice,
      timeWindow,
    });
    results.set(roleId, metrics);
  }

  return results;
}

/**
 * Calculate average budget metrics across roles.
 */
export function calculateAverageBudget(
  metricsList: BudgetMetrics[]
): {
  averageUtilization: number;
  averageEdges: number;
  averageContracts: number;
  averageCost: number;
} {
  if (metricsList.length === 0) {
    return {
      averageUtilization: 0,
      averageEdges: 0,
      averageContracts: 0,
      averageCost: 0,
    };
  }

  const sum = metricsList.reduce(
    (acc, m) => ({
      utilization: acc.utilization + m.utilizationRate,
      edges: acc.edges + m.crossRoleEdges,
      contracts: acc.contracts + m.contractTouches,
      cost: acc.cost + m.riskAdjustedCost,
    }),
    { utilization: 0, edges: 0, contracts: 0, cost: 0 }
  );

  const count = metricsList.length;

  return {
    averageUtilization: sum.utilization / count,
    averageEdges: sum.edges / count,
    averageContracts: sum.contracts / count,
    averageCost: sum.cost / count,
  };
}

/**
 * Compare a role's budget against the average.
 */
export function compareBudgetToAverage(
  roleId: string,
  metrics: BudgetMetrics,
  average: ReturnType<typeof calculateAverageBudget>
): {
  roleId: string;
  metrics: BudgetMetrics;
  average: {
    utilizationRate: number;
    crossRoleEdges: number;
    riskAdjustedCost: number;
  };
  deviation: {
    utilizationRate: number;
    crossRoleEdges: number;
    riskAdjustedCost: number;
  };
  status: 'healthy' | 'warning' | 'critical';
} {
  return {
    roleId,
    metrics,
    average: {
      utilizationRate: Math.round(average.averageUtilization * 1000) / 1000,
      crossRoleEdges: Math.round(average.averageEdges),
      riskAdjustedCost: Math.round(average.averageCost * 100) / 100,
    },
    deviation: {
      utilizationRate: Math.round(
        (metrics.utilizationRate - average.averageUtilization) * 1000
      ) / 1000,
      crossRoleEdges: metrics.crossRoleEdges - Math.round(average.averageEdges),
      riskAdjustedCost: Math.round(
        (metrics.riskAdjustedCost - average.averageCost) * 100
      ) / 100,
    },
    status: getBudgetStatus(metrics.utilizationRate),
  };
}

/**
 * Generate budget alerts.
 */
export function generateBudgetAlerts(
  metrics: BudgetMetrics,
  roleId: string
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  const now = Date.now();

  // Check utilization thresholds
  if (metrics.utilizationRate >= BUDGET_THRESHOLDS.CRITICAL_THRESHOLD) {
    alerts.push({
      id: `alert-${roleId}-critical-${now}`,
      roleId,
      type: 'high_utilization',
      severity: 'critical',
      message: `Critical: Budget utilization at ${(metrics.utilizationRate * 100).toFixed(1)}%`,
      currentUtilization: metrics.utilizationRate,
      threshold: BUDGET_THRESHOLDS.CRITICAL_THRESHOLD,
      timestamp: now,
    });
  } else if (metrics.utilizationRate >= BUDGET_THRESHOLDS.WARNING_THRESHOLD) {
    alerts.push({
      id: `alert-${roleId}-warning-${now}`,
      roleId,
      type: 'high_utilization',
      severity: 'warning',
      message: `Warning: Budget utilization at ${(metrics.utilizationRate * 100).toFixed(1)}%`,
      currentUtilization: metrics.utilizationRate,
      threshold: BUDGET_THRESHOLDS.WARNING_THRESHOLD,
      timestamp: now,
    });
  }

  // Check cross-role edges
  if (metrics.crossRoleEdges > BUDGET_THRESHOLDS.MAX_HEALTHY_EDGES) {
    alerts.push({
      id: `alert-${roleId}-edges-${now}`,
      roleId,
      type: 'threshold_breach',
      severity: 'warning',
      message: `High cross-role coupling: ${metrics.crossRoleEdges} edges (threshold: ${BUDGET_THRESHOLDS.MAX_HEALTHY_EDGES})`,
      currentUtilization: metrics.utilizationRate,
      threshold: BUDGET_THRESHOLDS.MAX_HEALTHY_EDGES,
      timestamp: now,
    });
  }

  return alerts;
}

/**
 * Get budget recommendations based on metrics.
 */
export function getBudgetRecommendations(metrics: BudgetMetrics): string[] {
  const recommendations: string[] = [];

  if (metrics.utilizationRate > BUDGET_THRESHOLDS.CRITICAL_THRESHOLD) {
    recommendations.push(
      'CRITICAL: Consider splitting this role or reducing cross-role dependencies'
    );
  } else if (metrics.utilizationRate > BUDGET_THRESHOLDS.WARNING_THRESHOLD) {
    recommendations.push(
      'WARNING: Review cross-role dependencies and consider refactoring'
    );
  }

  if (metrics.crossRoleEdges > BUDGET_THRESHOLDS.MAX_HEALTHY_EDGES) {
    recommendations.push(
      `High coupling detected (${metrics.crossRoleEdges} edges). Consider:
  - Extracting shared functionality into a common service
  - Using event-driven architecture to reduce direct dependencies
  - Reviewing role boundaries`
    );
  }

  if (metrics.contractTouches > BUDGET_THRESHOLDS.MAX_HEALTHY_CONTRACTS) {
    recommendations.push(
      `Many contract touches (${metrics.contractTouches}). Consider:
  - Consolidating contract ownership
  - Using facade patterns to reduce direct contract access`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Budget utilization is healthy. No immediate action needed.');
  }

  return recommendations;
}
