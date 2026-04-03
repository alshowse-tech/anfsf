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
export function generateProposalId(): string {
  return `prop_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new contract proposal.
 */
export function createProposal(params: {
  contractId: string;
  contractType?: string;
  proposerRoleId: string;
  diff: ContractDiff;
}): ContractProposal {
  return {
    id: generateProposalId(),
    contractId: params.contractId,
    contractType: params.contractType || 'OpenAPI',
    proposerId: params.proposerRoleId,
    state: 'pending',
    diff: params.diff,
    submittedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

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
export class InMemoryProposalStore implements ProposalStore {
  private proposals: Map<string, ContractProposal>;

  constructor() {
    this.proposals = new Map();
  }

  async save(proposal: ContractProposal): Promise<void> {
    this.proposals.set(proposal.id, proposal);
  }

  async getById(id: string): Promise<ContractProposal | null> {
    return this.proposals.get(id) || null;
  }

  async getByContract(contractId: string): Promise<ContractProposal[]> {
    return Array.from(this.proposals.values()).filter(
      (p) => p.contractId === contractId
    );
  }

  async getByProposer(roleId: string): Promise<ContractProposal[]> {
    return Array.from(this.proposals.values()).filter(
      (p) => p.proposerId === roleId
    );
  }

  async getPending(): Promise<ContractProposal[]> {
    return Array.from(this.proposals.values()).filter(
      (p) => p.state === 'pending' || p.state === 'submitted'
    );
  }

  async getByState(state: ProposalState): Promise<ContractProposal[]> {
    return Array.from(this.proposals.values()).filter(
      (p) => p.state === state
    );
  }

  async delete(id: string): Promise<void> {
    this.proposals.delete(id);
  }

  /**
   * Clear all proposals (for testing).
   */
  clear(): void {
    this.proposals.clear();
  }

  /**
   * Get count by state.
   */
  getCountByState(): Record<ProposalState, number> {
    const counts: Record<ProposalState, number> = {
      draft: 0,
      pending: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
    };

    for (const proposal of this.proposals.values()) {
      counts[proposal.state]++;
    }

    return counts;
  }
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
export class ProposalManager {
  private store: ProposalStore;
  private lattice: OwnershipLattice;

  constructor(store: ProposalStore, lattice: OwnershipLattice) {
    this.store = store;
    this.lattice = lattice;
  }

  /**
   * Submit a new proposal.
   */
  async submit(params: {
    contractId: string;
    proposerRoleId: string;
    diff: ContractDiff;
  }): Promise<ContractProposal> {
    const proposal = createProposal(params);
    await this.store.save(proposal);
    return proposal;
  }

  /**
   * Approve a proposal.
   */
  async approve(
    proposalId: string,
    reviewerRoleId: string,
    comment?: string
  ): Promise<{ success: boolean; error?: string }> {
    const proposal = await this.store.getById(proposalId);

    if (!proposal) {
      return { success: false, error: 'Proposal not found' };
    }

    if (proposal.state !== 'pending' && proposal.state !== 'submitted') {
      return {
        success: false,
        error: `Proposal is already ${proposal.state}`,
      };
    }

    // Check if reviewer has architect authority
    if (!this.lattice.hasAuthority(reviewerRoleId, 'architect')) {
      return {
        success: false,
        error: 'Only architect can approve contract changes',
      };
    }

    // Check if reviewer is the proposer (self-approval not allowed)
    if (proposal.proposerId === reviewerRoleId) {
      return {
        success: false,
        error: 'Cannot approve own proposal',
      };
    }

    proposal.state = 'approved';
    proposal.reviewedAt = Date.now();
    proposal.reviewerRoleId = reviewerRoleId;
    proposal.reviewComment = comment;
    proposal.updatedAt = Date.now();

    await this.store.save(proposal);
    return { success: true };
  }

  /**
   * Reject a proposal.
   */
  async reject(
    proposalId: string,
    reviewerRoleId: string,
    comment: string
  ): Promise<{ success: boolean; error?: string }> {
    const proposal = await this.store.getById(proposalId);

    if (!proposal) {
      return { success: false, error: 'Proposal not found' };
    }

    if (proposal.state !== 'pending' && proposal.state !== 'submitted') {
      return {
        success: false,
        error: `Proposal is already ${proposal.state}`,
      };
    }

    proposal.state = 'rejected';
    proposal.reviewedAt = Date.now();
    proposal.reviewerRoleId = reviewerRoleId;
    proposal.reviewComment = comment;
    proposal.updatedAt = Date.now();

    await this.store.save(proposal);
    return { success: true };
  }

  /**
   * Get pending proposals for a contract.
   */
  async getPendingForContract(contractId: string): Promise<ContractProposal[]> {
    const proposals = await this.store.getByContract(contractId);
    return proposals.filter((p) => p.state === 'pending' || p.state === 'submitted');
  }

  /**
   * Get approved proposals for a contract.
   */
  async getApprovedForContract(contractId: string): Promise<ContractProposal[]> {
    const proposals = await this.store.getByContract(contractId);
    return proposals.filter((p) => p.state === 'approved');
  }

  /**
   * Get latest approved proposal for a contract.
   */
  async getLatestApproved(contractId: string): Promise<ContractProposal | null> {
    const approved = await this.getApprovedForContract(contractId);
    if (approved.length === 0) return null;

    // Sort by updated date descending
    approved.sort((a, b) => b.updatedAt - a.updatedAt);
    return approved[0];
  }

  /**
   * Check if there are any pending proposals that would block compilation.
   */
  async hasBlockingProposals(contractIds: string[]): Promise<{
    blocking: boolean;
    blockingProposals: ContractProposal[];
  }> {
    const allPending = await this.store.getPending();
    const blockingProposals = allPending.filter((p) =>
      contractIds.includes(p.contractId)
    );

    return {
      blocking: blockingProposals.length > 0,
      blockingProposals,
    };
  }

  /**
   * Get proposal statistics.
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    avgReviewTime?: number;
  }> {
    const counts = (this.store as InMemoryProposalStore).getCountByState?.() || {
      draft: 0,
      pending: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
    };

    // Calculate average review time
    const allProposals = [
      ...(await this.store.getByState('approved')),
      ...(await this.store.getByState('rejected')),
    ];

    let totalReviewTime = 0;
    let reviewedCount = 0;

    for (const proposal of allProposals) {
      if (proposal.reviewedAt && proposal.submittedAt) {
        totalReviewTime += proposal.reviewedAt - proposal.submittedAt;
        reviewedCount++;
      }
    }

    return {
      total: counts.pending + counts.submitted + counts.approved + counts.rejected + counts.draft,
      pending: counts.pending + counts.submitted,
      approved: counts.approved,
      rejected: counts.rejected,
      avgReviewTime: reviewedCount > 0 ? totalReviewTime / reviewedCount : undefined,
    };
  }
}

/**
 * Singleton proposal manager instance.
 */
let defaultManager: ProposalManager | null = null;

export function getDefaultProposalManager(): ProposalManager {
  if (!defaultManager) {
    defaultManager = new ProposalManager(new InMemoryProposalStore());
  }
  return defaultManager;
}

export function resetDefaultProposalManager(): void {
  defaultManager = null;
}
