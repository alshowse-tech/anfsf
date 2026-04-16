/**
 * ASF V4.0 Role Engine - Interface Budget Calculator
 *
 * Core budget calculation engine.
 * Version: v0.8.5
 */
import type { BudgetMetrics, BudgetAlert } from './budget-types';
/**
 * Graph store interface for budget calculation.
 */
export interface BudgetGraphStore {
    /** Get nodes owned by a role */
    getNodesByRole(roleId: string): Array<{
        id: string;
        type: string;
    }>;
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
export declare function calculateInterfaceBudget(params: {
    roleId: string;
    graph: BudgetGraphStore;
    lattice?: OwnershipLatticeLike;
    timeWindow?: number;
    totalBudget?: number;
}): BudgetMetrics;
/**
 * Calculate budget for multiple roles.
 */
export declare function calculateBudgetsForRoles(roleIds: string[], graph: BudgetGraphStore, lattice?: OwnershipLatticeLike, timeWindow?: number): Map<string, BudgetMetrics>;
/**
 * Calculate average budget metrics across roles.
 */
export declare function calculateAverageBudget(metricsList: BudgetMetrics[]): {
    averageUtilization: number;
    averageEdges: number;
    averageContracts: number;
    averageCost: number;
};
/**
 * Compare a role's budget against the average.
 */
export declare function compareBudgetToAverage(roleId: string, metrics: BudgetMetrics, average: ReturnType<typeof calculateAverageBudget>): {
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
};
/**
 * Generate budget alerts.
 */
export declare function generateBudgetAlerts(metrics: BudgetMetrics, roleId: string): BudgetAlert[];
/**
 * Get budget recommendations based on metrics.
 */
export declare function getBudgetRecommendations(metrics: BudgetMetrics): string[];
