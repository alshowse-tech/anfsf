/**
 * ASF V4.0 Ownership Types
 *
 * Core types for ownership management, gates, and proposals.
 */
import type { ContractDiff } from '../contract/types';
export type { ContractDiff };
/**
 * Ownership role enumeration.
 */
export type OwnershipRole = 'owner' | 'maintainer' | 'contributor' | 'viewer';
/**
 * Ownership record.
 */
export interface Ownership {
    /** Resource identifier */
    resourceId: string;
    /** Resource type */
    resourceType: string;
    /** Owner identifier */
    ownerId: string;
    /** Role */
    role: OwnershipRole;
    /** Granted timestamp */
    grantedAt: number;
    /** Expiry timestamp (optional) */
    expiresAt?: number;
    /** Metadata */
    metadata?: Record<string, any>;
}
/**
 * Ownership claim request.
 */
export interface OwnershipClaim {
    /** Resource identifier */
    resourceId: string;
    /** Resource type */
    resourceType: string;
    /** Claimant identifier */
    claimantId: string;
    /** Justification */
    justification: string;
    /** Evidence (optional) */
    evidence?: string[];
    /** Created timestamp */
    createdAt: number;
}
/**
 * Ownership transfer request.
 */
export interface OwnershipTransfer {
    /** Resource identifier */
    resourceId: string;
    /** Current owner */
    fromOwnerId: string;
    /** New owner */
    toOwnerId: string;
    /** Reason */
    reason: string;
    /** Created timestamp */
    createdAt: number;
    /** Status */
    status: 'pending' | 'approved' | 'rejected';
}
/**
 * Gate type enumeration.
 */
export type GateType = 'ownership' | 'quality' | 'security' | 'compliance' | 'custom';
/**
 * Gate severity.
 */
export type GateSeverity = 'blocking' | 'warning' | 'info';
/**
 * Gate definition.
 */
export interface Gate {
    /** Gate identifier */
    id: string;
    /** Gate name */
    name: string;
    /** Gate type */
    type: GateType;
    /** Severity level */
    severity: GateSeverity;
    /** Description */
    description: string;
    /** Check function name */
    checkFn: string;
    /** Parameters */
    params?: Record<string, any>;
    /** Enabled */
    enabled: boolean;
}
/**
 * Gate check result.
 */
export interface GateResult {
    /** Gate identifier */
    gateId: string;
    /** Whether check passed */
    passed: boolean;
    /** Message */
    message: string;
    /** Details */
    details?: Record<string, any>;
    /** Timestamp */
    timestamp: number;
}
/**
 * Proposal type enumeration.
 */
export type ProposalType = 'ownership_claim' | 'ownership_transfer' | 'gate_override' | 'policy_change' | 'role_assignment';
/**
 * Proposal status.
 */
export type ProposalStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'cancelled';
/**
 * Proposal record.
 */
export interface Proposal {
    /** Proposal identifier */
    id: string;
    /** Proposal type */
    type: ProposalType;
    /** Title */
    title: string;
    /** Description */
    description: string;
    /** Proposer identifier */
    proposerId: string;
    /** Status */
    status: ProposalStatus;
    /** Created timestamp */
    createdAt: number;
    /** Updated timestamp */
    updatedAt: number;
    /** Reviewers */
    reviewers: string[];
    /** Votes */
    votes: {
        approve: string[];
        reject: string[];
    };
    /** Metadata */
    metadata?: Record<string, any>;
}
/**
 * Vote record.
 */
export interface Vote {
    /** Proposal identifier */
    proposalId: string;
    /** Voter identifier */
    voterId: string;
    /** Vote value */
    value: 'approve' | 'reject' | 'abstain';
    /** Comment */
    comment?: string;
    /** Timestamp */
    timestamp: number;
}
/**
 * State transition.
 */
export interface Transition {
    /** From state */
    from: string;
    /** To state */
    to: string;
    /** Trigger */
    trigger: string;
    /** Guard condition (optional) */
    guard?: string;
    /** Action (optional) */
    action?: string;
}
/**
 * State machine definition.
 */
export interface StateMachine {
    /** Machine identifier */
    id: string;
    /** Initial state */
    initial: string;
    /** States */
    states: Record<string, {
        /** Entry action */
        entry?: string;
        /** Exit action */
        exit?: string;
        /** Transitions */
        transitions: Transition[];
    }>;
}
/**
 * State machine instance.
 */
export interface StateMachineInstance {
    /** Machine identifier */
    machineId: string;
    /** Entity identifier */
    entityId: string;
    /** Current state */
    currentState: string;
    /** History */
    history: Array<{
        state: string;
        timestamp: number;
        trigger?: string;
    }>;
    /** Created timestamp */
    createdAt: number;
    /** Updated timestamp */
    updatedAt: number;
}
/**
 * Contract state.
 */
export type ContractState = 'draft' | 'approved' | 'rejected';
/**
 * State transition.
 */
export interface StateTransition {
    /** From state */
    from: ContractState;
    /** To state */
    to: ContractState;
    /** Actor */
    actorRoleId: string;
    /** Timestamp */
    timestamp: number;
    /** Reason */
    reason?: string;
}
/**
 * Proposal state.
 */
export type ProposalState = 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected';
/**
 * Contract state machine instance.
 */
export interface ContractStateMachine {
    /** Contract identifier */
    id: string;
    /** Current state */
    currentState: ContractState;
    /** Version */
    version: string;
    /** History of transitions */
    history: StateTransition[];
}
/**
 * Contract permission rule.
 */
export interface ContractPermissionRule {
    /** Contract type */
    contractType: string;
    /** Action */
    action: ContractAction;
    /** Allowed roles */
    allowedRoles: string[];
    /** Conditions */
    conditions?: PermissionCondition[];
}
/**
 * Contract action.
 */
export type ContractAction = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'read' | 'propose' | 'write';
/**
 * Permission condition.
 */
export interface PermissionCondition {
    /** Condition type */
    type: string;
    /** Condition value */
    value: any;
}
/**
 * Contract proposal.
 */
export interface ContractProposal {
    /** Proposal identifier */
    id: string;
    /** Contract identifier */
    contractId: string;
    /** Contract type */
    contractType: string;
    /** Proposed changes */
    diff: ContractDiff;
    /** Proposer */
    proposerId: string;
    /** State */
    state: ProposalState;
    /** Created timestamp */
    createdAt: number;
    /** Updated timestamp */
    updatedAt: number;
    /** Submitted timestamp */
    submittedAt?: number;
    /** Reviewed timestamp */
    reviewedAt?: number;
    /** Reviewer */
    reviewerRoleId?: string;
    /** Review comment */
    reviewComment?: string;
    /** Reviewers */
    reviewers?: string[];
    /** Comments */
    comments?: Array<{
        authorId: string;
        comment: string;
        timestamp: number;
    }>;
}
/**
 * Auto-approve rule conditions.
 */
export interface AutoApproveConditions {
    /** Only allow adding optional fields */
    onlyAddOptionalFields?: boolean;
    /** Only add fields (any) */
    onlyAddFields?: boolean;
    /** No removed fields allowed */
    noRemovedFields?: boolean;
    /** No type changes allowed */
    noTypeChanges?: boolean;
    /** No constraint tightening */
    noConstraintTighten?: boolean;
    /** Risk score threshold */
    riskScoreBelow?: number;
    /** Only non-breaking changes */
    onlyNonBreaking?: boolean;
}
/**
 * Auto-approve rule definition.
 */
export interface AutoApproveRule {
    /** Contract type */
    contractType: string;
    /** Conditions */
    conditions: AutoApproveConditions;
    /** Whether to auto-approve */
    autoApprove: boolean;
    /** Rule name */
    name?: string;
    /** Description */
    description?: string;
}
/**
 * Auto-approve check result.
 */
export interface AutoApproveResult {
    /** Whether approved */
    approved: boolean;
    /** Failed conditions */
    failedConditions: string[];
    /** Message */
    message: string;
}
