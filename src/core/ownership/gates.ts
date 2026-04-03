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
} from './types';
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
      // V1.5.0 NEW: UI Style resources - auto-approve for Frontend Role
      {
        contractType: 'ui:style/**',
        action: 'write',
        allowedRoles: ['frontend', 'ui-designer', 'architect', 'system'],
        conditions: [{ type: 'auto_approve', value: true }],
      },
      // V1.5.0 NEW: UI Style resources - immutable protection
      {
        contractType: 'ui:style/critical/**',
        action: 'write',
        allowedRoles: ['architect', 'system'],
        conditions: [{ type: 'requires_review', value: true }],
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
      const hasAuthority = rule.allowedRoles.some((role: string) =>
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
    if (proposal.state !== 'pending' && proposal.state !== 'submitted') {
      return {
        allowed: false,
        reason: `Proposal is already ${proposal.state}`,
      };
    }

    // Cannot approve own proposal (separation of duties)
    if (proposal.proposerId === actorRoleId) {
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
    // V1.5.0 NEW: UI style resources have special auto-approve rules
    if (this.isUIStyleResource(diff.contractType)) {
      return this.canAutoApproveUIStyle(diff);
    }

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
   * Check if contract type is a UI style resource.
   */
  private isUIStyleResource(contractType: string): boolean {
    return contractType.startsWith('ui:style');
  }

  /**
   * Auto-approve rules for UI style resources.
   * 
   * V1.5.0: UI styles can be auto-approved if:
   * - Not breaking changes
   * - No critical CSS removal
   * - Risk score below threshold
   */
  private canAutoApproveUIStyle(diff: ContractDiff): boolean {
    // Critical CSS changes require review (immutable protection)
    if (diff.contractType.includes('ui:style/critical')) {
      return false;
    }

    // Must not be breaking
    if (diff.breaking) {
      return false;
    }

    // No removed external styles (could cause FOUC)
    for (const item of diff.changes.removed) {
      if (item.type === 'external_style' || item.type === 'stylesheet') {
        return false;
      }
    }

    // Check risk score (lower threshold for styles)
    const riskScore = diff.riskScore || 50;
    if (riskScore >= 15) {
      return false;
    }

    // Adding styles is generally safe
    if (diff.changes.added.length > 0 && diff.changes.modified.length === 0 && diff.changes.removed.length === 0) {
      return true;
    }

    // Modifying non-critical styles with low risk is safe
    if (diff.changes.modified.length > 0) {
      for (const item of diff.changes.modified) {
        // Color changes, spacing changes are safe
        if (
          item.type.includes('color') ||
          item.type.includes('spacing') ||
          item.type.includes('margin') ||
          item.type.includes('padding')
        ) {
          continue;
        }
        // Other modifications need review
        return false;
      }
      return true;
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
