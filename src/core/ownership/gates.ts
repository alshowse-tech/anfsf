/**
 * ASF V4.0 Ownership Lattice - Contract Permission Gates
 * 
 * Enforces access control for contract operations.
 * Version: v0.8.5
 */

import type {
  ContractPermissionRule,
  ContractAction,
  PermissionCondition,
  ContractProposal,
  ContractDiff,
} from './types';

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
export class ContractGate {
  private lattice: OwnershipLatticeLike;
  private rules: ContractPermissionRule[];

  constructor(
    lattice: OwnershipLatticeLike,
    rules?: ContractPermissionRule[]
  ) {
    this.lattice = lattice;
    this.rules = rules || this.getDefaultRules();
  }

  /**
   * Get default permission rules.
   */
  private getDefaultRules(): ContractPermissionRule[] {
    return [
      // Read: Everyone can read
      {
        contractType: '*',
        action: 'read',
        allowedRoles: ['*'],
      },
      // Propose: Any role can propose changes
      {
        contractType: '*',
        action: 'propose',
        allowedRoles: ['*'],
      },
      // Write (direct): Only Architect can write directly
      {
        contractType: '*',
        action: 'write',
        allowedRoles: ['architect', 'system'],
      },
      // Approve: Only Architect can approve
      {
        contractType: '*',
        action: 'approve',
        allowedRoles: ['architect'],
        conditions: [{ type: 'requires_review', value: true }],
      },
      // Reject: Only Architect can reject
      {
        contractType: '*',
        action: 'reject',
        allowedRoles: ['architect'],
      },
    ];
  }

  /**
   * Check if a role can perform an action on a contract.
   */
  checkPermission(
    contractType: string,
    action: ContractAction,
    actorRoleId: string
  ): {
    allowed: boolean;
    reason?: string;
    conditions?: PermissionCondition[];
  } {
    // Find matching rule
    const rule = this.rules.find(
      (r) =>
        (r.contractType === '*' || r.contractType === contractType) &&
        r.action === action
    );

    if (!rule) {
      return {
        allowed: false,
        reason: `No rule found for ${action} on ${contractType}`,
      };
    }

    // Check if role is allowed
    const isAllowed =
      rule.allowedRoles.includes('*') ||
      rule.allowedRoles.includes(actorRoleId) ||
      this.lattice.hasAuthority(actorRoleId, actorRoleId);

    if (!isAllowed) {
      // Check if role has required authority
      const hasAuthority = rule.allowedRoles.some((role) =>
        this.lattice.hasAuthority(actorRoleId, role)
      );

      if (!hasAuthority) {
        return {
          allowed: false,
          reason: `Role ${actorRoleId} is not authorized to ${action} ${contractType} contracts`,
        };
      }
    }

    return {
      allowed: true,
      conditions: rule.conditions,
    };
  }

  /**
   * Check write permission for a contract.
   * 
   * Non-Architect roles can only propose, not write directly.
   */
  checkWritePermission(
    contractId: string,
    contractType: string,
    actorRoleId: string
  ): {
    allowed: boolean;
    reason?: string;
    proposalRequired?: boolean;
  } {
    // Check if actor is Architect
    const isArchitect = this.lattice.hasAuthority(actorRoleId, 'architect');

    if (isArchitect) {
      return { allowed: true };
    }

    // Non-Architect: must propose
    return {
      allowed: false,
      reason: 'Non-Architect roles cannot directly modify contracts. Please submit a proposal.',
      proposalRequired: true,
    };
  }

  /**
   * Check approve permission for a proposal.
   */
  checkApprovePermission(
    proposal: ContractProposal,
    actorRoleId: string
  ): {
    allowed: boolean;
    reason?: string;
  } {
    // Check if actor is Architect
    const isArchitect = this.lattice.hasAuthority(actorRoleId, 'architect');

    if (!isArchitect) {
      return {
        allowed: false,
        reason: 'Only Architect roles can approve contract changes',
      };
    }

    // Check proposal state
    if (proposal.state !== 'pending') {
      return {
        allowed: false,
        reason: `Proposal is already ${proposal.state}`,
      };
    }

    // Cannot approve own proposal (separation of duties)
    if (proposal.proposerRoleId === actorRoleId) {
      return {
        allowed: false,
        reason: 'Cannot approve your own proposal',
      };
    }

    return { allowed: true };
  }

  /**
   * Check reject permission for a proposal.
   */
  checkRejectPermission(
    proposal: ContractProposal,
    actorRoleId: string
  ): {
    allowed: boolean;
    reason?: string;
  } {
    return this.checkApprovePermission(proposal, actorRoleId);
  }

  /**
   * Check if a diff can be auto-approved (low-risk changes).
   */
  canAutoApprove(diff: ContractDiff): boolean {
    // Must not be breaking
    if (diff.breaking) {
      return false;
    }

    // No removed items
    if (diff.changes.removed.length > 0) {
      return false;
    }

    // Check for type changes in modified items
    for (const item of diff.changes.modified) {
      if (item.type.includes('type_change')) {
        return false;
      }
      if (item.type.includes('constraint_tighten')) {
        return false;
      }
    }

    // Check risk score
    const riskScore = diff.riskScore || 50;
    if (riskScore >= 20) {
      return false;
    }

    // Only adding optional fields is safe
    for (const item of diff.changes.added) {
      if (item.details?.required === true) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate conditions for auto-approval.
   */
  evaluateConditions(
    conditions: PermissionCondition[] | undefined,
    diff: ContractDiff
  ): boolean {
    if (!conditions) {
      return true;
    }

    for (const condition of conditions) {
      switch (condition.type) {
        case 'risk_below':
          if ((diff.riskScore || 50) >= condition.value) {
            return false;
          }
          break;

        case 'auto_approve':
          if (!condition.value) {
            return false;
          }
          break;

        case 'requires_review':
          // This condition means manual review is required
          return false;
      }
    }

    return true;
  }

  /**
   * Add a custom rule.
   */
  addRule(rule: ContractPermissionRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove rules for a contract type.
   */
  removeRules(contractType: string, action?: ContractAction): void {
    this.rules = this.rules.filter(
      (r) =>
        !(
          r.contractType === contractType &&
          (action === undefined || r.action === action)
        )
    );
  }

  /**
   * Get all rules.
   */
  getRules(): ContractPermissionRule[] {
    return [...this.rules];
  }
}

/**
 * Create default contract gate.
 */
export function createDefaultContractGate(
  lattice: OwnershipLatticeLike
): ContractGate {
  return new ContractGate(lattice);
}

/**
 * Create strict contract gate (no auto-approve).
 */
export function createStrictContractGate(
  lattice: OwnershipLatticeLike
): ContractGate {
  const gate = new ContractGate(lattice, []);
  
  // Add strict rules
  gate.addRule({
    contractType: '*',
    action: 'approve',
    allowedRoles: ['architect'],
    conditions: [{ type: 'requires_review', value: true }],
  });

  return gate;
}
