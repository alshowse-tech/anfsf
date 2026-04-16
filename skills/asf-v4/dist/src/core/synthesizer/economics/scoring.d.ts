/**
 * ASF V4.0 Role Synthesizer - Economics Scoring
 *
 * Role cost calculation with economics decision variables.
 * Version: v0.9.0
 */
import type { Role, Assignment } from '../types';
/**
 * Task DAG for economics calculation.
 */
export interface TaskDAG {
    tasks: Task[];
    edges: TaskEdge[];
}
export interface Task {
    id: string;
    estCost?: number;
    featureId?: string;
    contractIds?: string[];
    risk?: 'low' | 'medium' | 'high';
}
export interface TaskEdge {
    from: string;
    to: string;
    type: 'depends_on' | 'calls' | 'updates';
}
/**
 * Role economics configuration.
 */
export interface RoleEconomics {
    /** Cost per task unit */
    costPerTask: number;
    /** Overhead per cross-role dependency */
    overheadPerDependency: number;
    /** Maximum parallel tasks */
    parallelismCap: number;
}
/**
 * Role cost calculation result.
 */
export interface RoleCostResult {
    /** Base task cost */
    baseCost: number;
    /** Cross-role dependency cost */
    dependencyCost: number;
    /** Concurrent capacity */
    concurrentCap: number;
    /** Total cost */
    totalCost: number;
}
/**
 * Compute role cost for an assignment.
 *
 * Formula:
 * totalCost = baseCost + dependencyCost
 * baseCost = Σ task.estCost × role.costPerTask
 * dependencyCost = crossRoleEdges × role.overheadPerDependency
 */
export declare function computeRoleCost(role: Role & {
    economics: RoleEconomics;
}, assignment: Assignment, dag: TaskDAG): RoleCostResult;
/**
 * Compute total assignment cost across all roles.
 */
export declare function computeTotalAssignmentCost(roles: Array<Role & {
    economics: RoleEconomics;
}>, assignment: Assignment, dag: TaskDAG): {
    totalCost: number;
    roleCosts: Map<string, RoleCostResult>;
    bottleneckRole?: string;
};
/**
 * Compute interface cost for economics scoring.
 */
export declare function computeInterfaceCost(assignment: Assignment, dag: TaskDAG, interfaceWeights?: {
    depends_on: number;
    calls: number;
    updates: number;
}): number;
/**
 * Compute parallelism gain score.
 */
export declare function computeParallelismGain(assignment: Assignment, dag: TaskDAG, roles: Role[]): number;
/**
 * Economics-based role assignment scorer.
 */
export interface EconomicsScore {
    interfaceCost: number;
    bottleneck: number;
    skillMatch: number;
    parallelismGain: number;
    totalScore: number;
}
/**
 * Compute economics score for an assignment.
 *
 * Score = -0.30 × interfaceCost + -0.20 × bottleneck + 0.20 × skillMatch + 0.15 × parallelismGain
 */
export declare function computeEconomicsScore(assignment: Assignment, dag: TaskDAG, roles: Role[], options?: {
    interfaceWeights?: Parameters<typeof computeInterfaceCost>[2];
    skillMatchFn?: (task: Task, role: Role) => number;
}): EconomicsScore;
