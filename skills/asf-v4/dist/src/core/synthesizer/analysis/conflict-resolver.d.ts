/**
 * ASF V4.0 Role Synthesizer - Conflict Resolver
 *
 * Resolves ownership conflicts with budget-driven decisions.
 * Version: v0.9.0
 */
import type { Role, Contract } from '../types';
/**
 * Resource for conflict resolution.
 */
export interface ConflictResource {
    id: string;
    type: string;
    path: string;
}
/**
 * Resolution action.
 */
export type ResolutionAction = 'merge_roles' | 'introduce_contract';
/**
 * Resolution result.
 */
export interface Resolution {
    action: ResolutionAction;
    reason: string;
    contractCost?: number;
    rolesToMerge?: string[];
    contract?: Contract;
}
/**
 * Estimate contract cost.
 */
export declare function estimateContractCost(resource: ConflictResource, roles: Role[]): number;
/**
 * Generate contract between roles.
 */
export declare function generateContractBetween(roles: Role[], resource: ConflictResource): Contract;
/**
 * Resolve ownership conflict.
 *
 * Decision logic:
 * - If adding contract would exceed budget → merge roles
 * - Otherwise → introduce contract
 */
export declare function resolveOwnershipConflict(resource: ConflictResource, conflictingRoles: Role[], currentBudget: number, budgetLimit: number): Resolution;
/**
 * Batch conflict resolution.
 */
export interface ConflictBatch {
    resource: ConflictResource;
    conflictingRoles: Role[];
}
export declare function resolveConflicts(conflicts: ConflictBatch[], currentBudget: number, budgetLimit: number): Resolution[];
/**
 * Generate conflict resolution report.
 */
export declare function generateConflictReport(resolutions: Resolution[]): string;
