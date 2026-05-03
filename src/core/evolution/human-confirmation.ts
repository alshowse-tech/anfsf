/**
 * ANFSF L17 — Human Confirmation Workflow
 *
 * Human-in-the-loop confirmation for evolution proposals.
 * Supports: approve / reject / modify operations,
 * confirmation history, timeout handling, and batch approvals.
 */

import type { EvolutionProposal } from './framework';

// ============================================================================
// Types
// ============================================================================

export type ConfirmationStatus = 'pending' | 'approved' | 'rejected' | 'modified' | 'expired' | 'cancelled';

export interface ModificationRequest {
  /** Field path to modify (e.g., "budgetImpact", "riskScore") */
  field: string;
  /** Current value */
  currentValue: unknown;
  /** Proposed new value */
  proposedValue: unknown;
  /** Reason for modification */
  reason: string;
}

export interface ConfirmationResponse {
  /** Confirmation ID */
  id: string;
  /** Proposal ID */
  proposalId: string;
  /** Reviewer identity */
  reviewer: string;
  /** Decision status */
  status: ConfirmationStatus;
  /** Review timestamp */
  reviewedAt: number;
  /** Reviewer comments */
  comments?: string;
  /** Modifications requested */
  modifications?: ModificationRequest[];
}

export interface ConfirmationRequest {
  /** Unique confirmation ID */
  id: string;
  /** Associated proposal */
  proposal: EvolutionProposal;
  /** Requested at timestamp */
  requestedAt: number;
  /** Required reviewer role (e.g., "admin", "architect") */
  requiredRole?: string;
  /** Timeout in ms (0 = no timeout) */
  timeoutMs: number;
  /** Whether batch approval is allowed */
  allowBatchApproval: boolean;
  /** Current status */
  status: ConfirmationStatus;
  /** Response if reviewed */
  response?: ConfirmationResponse;
}

export interface BatchConfirmationResult {
  /** Total requests in batch */
  total: number;
  /** Approved count */
  approved: number;
  /** Rejected count */
  rejected: number;
  /** Modified count */
  modified: number;
  /** Expired count */
  expired: number;
  /** Individual results */
  results: ConfirmationResponse[];
}

export interface HumanConfirmationConfig {
  /** Default timeout for confirmation requests (ms) */
  defaultTimeoutMs: number;
  /** Maximum pending confirmations before auto-expire */
  maxPendingConfirmations: number;
  /** Auto-expire old confirmations (ms, 0 = disabled) */
  autoExpireAfterMs: number;
}

const DEFAULT_CONFIG: HumanConfirmationConfig = {
  defaultTimeoutMs: 300000, // 5 minutes
  maxPendingConfirmations: 20,
  autoExpireAfterMs: 3600000, // 1 hour
};

// ============================================================================
// Human Confirmation
// ============================================================================

export class HumanConfirmation {
  private config: HumanConfirmationConfig;
  private requests: Map<string, ConfirmationRequest> = new Map();
  private history: ConfirmationResponse[] = [];

  constructor(config: Partial<HumanConfirmationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Request Management
  // ---------------------------------------------------------------------------

  /**
   * Create a confirmation request for an evolution proposal.
   */
  createRequest(proposal: EvolutionProposal, options?: {
    reviewer?: string;
    requiredRole?: string;
    timeoutMs?: number;
    allowBatchApproval?: boolean;
  }): ConfirmationRequest {
    // Enforce max pending limit
    const pendingCount = this.getPendingCount();
    if (pendingCount >= this.config.maxPendingConfirmations) {
      this.expireOldestPending();
    }

    const request: ConfirmationRequest = {
      id: `confirm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      proposal,
      requestedAt: Date.now(),
      requiredRole: options?.requiredRole,
      timeoutMs: options?.timeoutMs ?? this.config.defaultTimeoutMs,
      allowBatchApproval: options?.allowBatchApproval ?? true,
      status: 'pending',
    };

    this.requests.set(request.id, request);
    return request;
  }

  /**
   * Get a confirmation request by ID.
   */
  getRequest(id: string): ConfirmationRequest | null {
    return this.requests.get(id) ?? null;
  }

  /**
   * Get all pending confirmation requests.
   */
  getPendingRequests(): ConfirmationRequest[] {
    return [...this.requests.values()].filter(r => r.status === 'pending');
  }

  /**
   * Get pending confirmation count.
   */
  getPendingCount(): number {
    return [...this.requests.values()].filter(r => r.status === 'pending').length;
  }

  // ---------------------------------------------------------------------------
  // Review Actions
  // ---------------------------------------------------------------------------

  /**
   * Approve a confirmation request.
   */
  approve(id: string, reviewer: string, comments?: string): ConfirmationResponse | null {
    const request = this.requests.get(id);
    if (!request || request.status !== 'pending') return null;

    const response: ConfirmationResponse = {
      id: request.id,
      proposalId: request.proposal.id,
      reviewer,
      status: 'approved',
      reviewedAt: Date.now(),
      comments,
    };

    this.finalize(request, response);
    return response;
  }

  /**
   * Reject a confirmation request.
   */
  reject(id: string, reviewer: string, comments?: string): ConfirmationResponse | null {
    const request = this.requests.get(id);
    if (!request || request.status !== 'pending') return null;

    const response: ConfirmationResponse = {
      id: request.id,
      proposalId: request.proposal.id,
      reviewer,
      status: 'rejected',
      reviewedAt: Date.now(),
      comments,
    };

    this.finalize(request, response);
    return response;
  }

  /**
   * Request modifications to a proposal.
   */
  modify(id: string, reviewer: string, modifications: ModificationRequest[], comments?: string): ConfirmationResponse | null {
    const request = this.requests.get(id);
    if (!request || request.status !== 'pending') return null;

    const response: ConfirmationResponse = {
      id: request.id,
      proposalId: request.proposal.id,
      reviewer,
      status: 'modified',
      reviewedAt: Date.now(),
      comments,
      modifications,
    };

    this.finalize(request, response);
    return response;
  }

  /**
   * Approve multiple requests in a batch.
   * Only works for requests that allow batch approval.
   */
  batchApprove(ids: string[], reviewer: string, comments?: string): BatchConfirmationResult {
    const results: ConfirmationResponse[] = [];
    let approved = 0;
    let expired = 0;

    for (const id of ids) {
      const request = this.requests.get(id);
      if (!request || request.status !== 'pending' || !request.allowBatchApproval) {
        expired++;
        continue;
      }

      const response = this.approve(id, reviewer, comments);
      if (response) {
        results.push(response);
        approved++;
      }
    }

    return {
      total: ids.length,
      approved,
      rejected: 0,
      modified: 0,
      expired,
      results,
    };
  }

  // ---------------------------------------------------------------------------
  // Expiration and Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Check for expired confirmations and update their status.
   */
  checkExpirations(): string[] {
    const expired: string[] = [];
    const now = Date.now();

    for (const [id, request] of this.requests) {
      if (request.status !== 'pending') continue;

      const isExpired = (request.timeoutMs > 0 && now - request.requestedAt > request.timeoutMs) ||
                        (this.config.autoExpireAfterMs > 0 && now - request.requestedAt > this.config.autoExpireAfterMs);

      if (isExpired) {
        request.status = 'expired';

        const response: ConfirmationResponse = {
          id: request.id,
          proposalId: request.proposal.id,
          reviewer: 'system',
          status: 'expired',
          reviewedAt: now,
          comments: 'Confirmation request expired due to timeout',
        };

        this.history.push(response);
        expired.push(id);
      }
    }

    return expired;
  }

  /**
   * Cancel a pending confirmation request.
   */
  cancel(id: string): boolean {
    const request = this.requests.get(id);
    if (!request || request.status !== 'pending') return false;

    request.status = 'cancelled';
    return true;
  }

  /**
   * Expire the oldest pending confirmation.
   */
  private expireOldestPending(): void {
    const pending = this.getPendingRequests();
    if (pending.length === 0) return;

    const oldest = pending.reduce((a, b) =>
      a.requestedAt < b.requestedAt ? a : b
    );

    oldest.status = 'expired';
  }

  /**
   * Get confirmation history.
   */
  getHistory(): ConfirmationResponse[] {
    return [...this.history];
  }

  /**
   * Get history for a specific proposal.
   */
  getHistoryForProposal(proposalId: string): ConfirmationResponse[] {
    return this.history.filter(r => r.proposalId === proposalId);
  }

  /**
   * Get statistics.
   */
  getStats(): {
    totalRequests: number;
    pending: number;
    approved: number;
    rejected: number;
    modified: number;
    expired: number;
    cancelled: number;
  } {
    const all = [...this.requests.values()];
    return {
      totalRequests: all.length,
      pending: all.filter(r => r.status === 'pending').length,
      approved: all.filter(r => r.status === 'approved').length,
      rejected: all.filter(r => r.status === 'rejected').length,
      modified: all.filter(r => r.status === 'modified').length,
      expired: all.filter(r => r.status === 'expired').length,
      cancelled: all.filter(r => r.status === 'cancelled').length,
    };
  }

  /**
   * Clear all data.
   */
  clear(): void {
    this.requests.clear();
    this.history = [];
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private finalize(request: ConfirmationRequest, response: ConfirmationResponse): void {
    request.status = response.status;
    request.response = response;
    this.history.push(response);
  }
}

/**
 * Create a new HumanConfirmation instance.
 */
export function createHumanConfirmation(config?: Partial<HumanConfirmationConfig>): HumanConfirmation {
  return new HumanConfirmation(config);
}
