/**
 * ASF V4.0 Contract Pack - Type Definitions
 *
 * Core types for contract diff and versioning.
 * Version: v0.8.5
 */
import type { BumpType } from './semver';
/**
 * Contract type enumeration.
 */
export type ContractType = 'OpenAPI' | 'DBSchema' | 'UIProps' | 'EventSchema' | 'ConfigSchema';
/**
 * Contract state for state machine.
 */
export type ContractState = 'draft' | 'approved' | 'rejected';
/**
 * Severity level for diff items.
 */
export type DiffSeverity = 'low' | 'medium' | 'high' | 'critical';
/**
 * Individual diff item.
 */
export interface DiffItem {
    /** JSON path or schema path */
    path: string;
    /** Change type (field, method, table, etc.) */
    type: string;
    /** Human-readable description */
    description: string;
    /** Severity level */
    severity: DiffSeverity;
    /** Additional details */
    details: Record<string, any>;
}
/**
 * Contract diff result.
 */
export interface ContractDiff {
    /** Contract type */
    contractType: ContractType;
    /** Version information */
    version: {
        before: string;
        after: string;
        bump: BumpType | null;
    };
    /** Changes */
    changes: {
        added: DiffItem[];
        removed: DiffItem[];
        modified: DiffItem[];
    };
    /** Whether this is a breaking change */
    breaking: boolean;
    /** Whether approval is required */
    requiresApproval: boolean;
    /** Generated changelog */
    changelog: string;
    /** Optional risk score */
    riskScore?: number;
}
/**
 * OpenAPI-specific diff.
 */
export interface OpenAPIDiff {
    contractType: 'OpenAPI';
    version: {
        before: string;
        after: string;
        bump: BumpType | null;
    };
    changes: {
        added: Array<{
            path: string;
            method: string;
            schema: any;
            details?: {
                required?: boolean;
            };
        }>;
        removed: Array<{
            path: string;
            method: string;
        }>;
        modified: Array<{
            path: string;
            method: string;
            schemaDiff: any;
        }>;
    };
    breaking: boolean;
    requiresApproval: boolean;
    changelog: string;
    riskScore?: number;
}
/**
 * DB Schema-specific diff.
 */
export interface DBSchemaDiff {
    contractType: 'DBSchema';
    version: {
        before: string;
        after: string;
        bump: BumpType | null;
    };
    changes: {
        added: Array<{
            table: string;
            columns: any[];
            indexes: any[];
        }>;
        removed: Array<{
            table: string;
        }>;
        modified: Array<{
            table: string;
            columnsDiff: any;
            indexesDiff: any;
        }>;
    };
    breaking: boolean;
    requiresApproval: boolean;
    changelog: string;
    riskScore?: number;
    /** Optional migration SQL */
    migration?: {
        up: string;
        down: string;
    };
}
/**
 * UI Props-specific diff.
 */
export interface UIPropsDiff {
    contractType: 'UIProps';
    version: {
        before: string;
        after: string;
        bump: BumpType | null;
    };
    changes: {
        added: Array<{
            prop: string;
            type: string;
            required: boolean;
        }>;
        removed: Array<{
            prop: string;
            type: string;
        }>;
        modified: Array<{
            prop: string;
            typeBefore: string;
            typeAfter: string;
        }>;
    };
    breaking: boolean;
    requiresApproval: boolean;
    changelog: string;
    riskScore?: number;
}
/**
 * State transition record.
 */
export interface StateTransition {
    from: ContractState;
    to: ContractState;
    actorRoleId: string;
    timestamp: number;
    reason?: string;
}
/**
 * Contract state machine.
 */
export interface ContractStateMachine {
    id: string;
    currentState: ContractState;
    version: string;
    history: StateTransition[];
}
/**
 * Contract proposal state.
 */
export type ProposalState = 'pending' | 'approved' | 'rejected';
/**
 * Contract proposal.
 */
export interface ContractProposal {
    /** Proposal ID */
    id: string;
    /** Contract ID */
    contractId: string;
    /** Role that submitted the proposal */
    proposerRoleId: string;
    /** Current state */
    state: ProposalState;
    /** Diff describing the proposed changes */
    diff: ContractDiff;
    /** When submitted */
    submittedAt: number;
    /** When reviewed (if applicable) */
    reviewedAt?: number;
    /** Reviewer role ID (if applicable) */
    reviewerRoleId?: string;
    /** Review comment (if applicable) */
    reviewComment?: string;
}
/**
 * Contract action types.
 */
export type ContractAction = 'read' | 'write' | 'propose' | 'approve' | 'reject';
/**
 * Permission rule condition.
 */
export interface PermissionCondition {
    type: 'risk_below' | 'auto_approve' | 'requires_review';
    value: any;
}
/**
 * Contract permission rule.
 */
export interface ContractPermissionRule {
    contractType: string;
    action: ContractAction;
    allowedRoles: string[];
    conditions?: PermissionCondition[];
}
/**
 * Auto-approve rule.
 */
export interface AutoApproveRule {
    contractType: string;
    conditions: {
        onlyAddOptionalFields?: boolean;
        noTypeChanges?: boolean;
        noConstraintTighten?: boolean;
        riskScoreBelow?: number;
    };
    autoApprove: boolean;
}
export declare function isContractDiff(obj: any): obj is ContractDiff;
export declare function isContractProposal(obj: any): obj is ContractProposal;
export declare function isContractStateMachine(obj: any): obj is ContractStateMachine;
