/**
 * ASF V4.0 Ownership Lattice - Contract Proposals
 *
 * Manages contract change proposals and review workflow.
 * Version: v0.8.5
 */
import type { ContractProposal, ProposalState } from './types';
import type { ContractDiff } from '../contract/types';
/**
 * Generate unique proposal ID.
 */
export declare function generateProposalId(): string;
/**
 * Create a new contract proposal.
 */
export declare function createProposal(params: {
    contractId: string;
    contractType?: string;
    proposerRoleId: string;
    diff: ContractDiff;
}): ContractProposal;
/**
 * Proposal store interface.
 */
export interface ProposalStore {
    /** Save a proposal */
    save(proposal: ContractProposal): Promise<void>;
    /** Get proposal by ID */
    getById(id: string): Promise<ContractProposal | null>;
    /** Get proposals by contract ID */
    getByContract(contractId: string): Promise<ContractProposal[]>;
    /** Get proposals by proposer role */
    getByProposer(roleId: string): Promise<ContractProposal[]>;
    /** Get pending proposals */
    getPending(): Promise<ContractProposal[]>;
    /** Get proposals by state */
    getByState(state: ProposalState): Promise<ContractProposal[]>;
    /** Delete proposal */
    delete(id: string): Promise<void>;
}
/**
 * In-memory proposal store.
 */
export declare class InMemoryProposalStore implements ProposalStore {
    private proposals;
    constructor();
    save(proposal: ContractProposal): Promise<void>;
    getById(id: string): Promise<ContractProposal | null>;
    getByContract(contractId: string): Promise<ContractProposal[]>;
    getByProposer(roleId: string): Promise<ContractProposal[]>;
    getPending(): Promise<ContractProposal[]>;
    getByState(state: ProposalState): Promise<ContractProposal[]>;
    delete(id: string): Promise<void>;
    /**
     * Clear all proposals (for testing).
     */
    clear(): void;
    /**
     * Get count by state.
     */
    getCountByState(): Record<ProposalState, number>;
}
/**
 * Ownership lattice interface for authority checks.
 */
export interface OwnershipLattice {
    hasAuthority(roleId: string, authority: string): boolean;
    getOwner(nodeId: string): string | null;
}
/**
 * Proposal manager for workflow operations.
 */
export declare class ProposalManager {
    private store;
    private lattice;
    constructor(store: ProposalStore, lattice: OwnershipLattice);
    /**
     * Submit a new proposal.
     */
    submit(params: {
        contractId: string;
        proposerRoleId: string;
        diff: ContractDiff;
    }): Promise<ContractProposal>;
    /**
     * Approve a proposal.
     */
    approve(proposalId: string, reviewerRoleId: string, comment?: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Reject a proposal.
     */
    reject(proposalId: string, reviewerRoleId: string, comment: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get pending proposals for a contract.
     */
    getPendingForContract(contractId: string): Promise<ContractProposal[]>;
    /**
     * Get approved proposals for a contract.
     */
    getApprovedForContract(contractId: string): Promise<ContractProposal[]>;
    /**
     * Get latest approved proposal for a contract.
     */
    getLatestApproved(contractId: string): Promise<ContractProposal | null>;
    /**
     * Check if there are any pending proposals that would block compilation.
     */
    hasBlockingProposals(contractIds: string[]): Promise<{
        blocking: boolean;
        blockingProposals: ContractProposal[];
    }>;
    /**
     * Get proposal statistics.
     */
    getStats(): Promise<{
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        avgReviewTime?: number;
    }>;
}
export declare function getDefaultProposalManager(): ProposalManager;
export declare function resetDefaultProposalManager(): void;
