/**
 * ASF V4.0 Ownership Lattice - Contract Permission Gates
 *
 * Enforces access control for contract operations.
 * Version: v0.8.5
 */
import type { ContractPermissionRule, ContractAction, PermissionCondition, ContractProposal } from './types';
import type { ContractDiff } from '../contract/types';
/**
 * Ownership lattice interface.
 */
export interface OwnershipLatticeLike {
    /** Get owner role for a node/contract */
    getOwner(nodeId: string): string | null;
    /** Check if role has specific authority */
    hasAuthority(roleId: string, authority: string): boolean;
    /** Get roles with specific authority */
    getRolesWithAuthority(authority: string): string[];
}
/**
 * Contract Gate - Enforces permission rules for contract operations.
 */
export declare class ContractGate {
    private lattice;
    private rules;
    constructor(lattice: OwnershipLatticeLike, rules?: ContractPermissionRule[]);
    /**
     * Get default permission rules.
     */
    private getDefaultRules;
    /**
     * Check if a role can perform an action on a contract.
     */
    checkPermission(contractType: string, action: ContractAction, actorRoleId: string): {
        allowed: boolean;
        reason?: string;
        conditions?: PermissionCondition[];
    };
    /**
     * Check write permission for a contract.
     *
     * Non-Architect roles can only propose, not write directly.
     */
    checkWritePermission(contractId: string, contractType: string, actorRoleId: string): {
        allowed: boolean;
        reason?: string;
        proposalRequired?: boolean;
    };
    /**
     * Check approve permission for a proposal.
     */
    checkApprovePermission(proposal: ContractProposal, actorRoleId: string): {
        allowed: boolean;
        reason?: string;
    };
    /**
     * Check reject permission for a proposal.
     */
    checkRejectPermission(proposal: ContractProposal, actorRoleId: string): {
        allowed: boolean;
        reason?: string;
    };
    /**
     * Check if a diff can be auto-approved (low-risk changes).
     */
    canAutoApprove(diff: ContractDiff): boolean;
    /**
     * Check if contract type is a UI style resource.
     */
    private isUIStyleResource;
    /**
     * Auto-approve rules for UI style resources.
     *
     * V1.5.0: UI styles can be auto-approved if:
     * - Not breaking changes
     * - No critical CSS removal
     * - Risk score below threshold
     */
    private canAutoApproveUIStyle;
    /**
     * Evaluate conditions for auto-approval.
     */
    evaluateConditions(conditions: PermissionCondition[] | undefined, diff: ContractDiff): boolean;
    /**
     * Add a custom rule.
     */
    addRule(rule: ContractPermissionRule): void;
    /**
     * Remove rules for a contract type.
     */
    removeRules(contractType: string, action?: ContractAction): void;
    /**
     * Get all rules.
     */
    getRules(): ContractPermissionRule[];
}
/**
 * Create default contract gate.
 */
export declare function createDefaultContractGate(lattice: OwnershipLatticeLike): ContractGate;
/**
 * Create strict contract gate (no auto-approve).
 */
export declare function createStrictContractGate(lattice: OwnershipLatticeLike): ContractGate;
