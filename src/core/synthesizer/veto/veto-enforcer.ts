/**
 * ASF V4.0 Role Synthesizer - Veto Enforcer
 * 
 * Hard/soft veto execution for governance constraints.
 * Version: v0.9.0
 */

import type { ChangeAuthority, ApprovalRecord } from '../types';

/**
 * Veto rule definition.
 */
export interface VetoRule {
  /** Authority required to override */
  authority: ChangeAuthority;
  
  /** Hard veto blocks, soft veto warns */
  mode: 'hard' | 'soft';
  
  /** Scope selector (e.g., "contract:OpenAPI:*", "graph:Entity:Order") */
  scopeSelector: string;
  
  /** Optional reason for the veto */
  reason?: string;
  
  /** For hard veto: which role must approve */
  requiredApprovalRole?: string;
}

/**
 * Veto result.
 */
export interface VetoResult {
  /** Whether veto check passed */
  passed: boolean;
  
  /** Rejection reason (if failed) */
  reason?: string;
  
  /** Required role for approval (hard veto) */
  requiredRole?: string;
  
  /** Warnings (soft veto) */
  warnings?: string[];
  
  /** Risk multiplier for soft veto */
  riskMultiplier?: number;
  
  /** Require additional probe */
  requireProbe?: boolean;
}

/**
 * Change set for veto matching.
 */
export interface ChangeSet {
  changes: Array<{
    resourceType: string;
    resourcePath: string;
    action: 'create' | 'update' | 'delete';
  }>;
}

/**
 * Veto Enforcer - Executes hard/soft veto rules.
 */
export class VetoEnforcer {
  private rules: VetoRule[];

  constructor(rules: VetoRule[] = []) {
    this.rules = rules;
  }

  /**
   * Enforce veto rules against a change set.
   */
  enforce(
    changes: ChangeSet,
    approvals: ApprovalRecord[]
  ): VetoResult {
    for (const rule of this.rules) {
      const matchedChanges = this.matchScope(changes, rule.scopeSelector);
      
      if (matchedChanges.length === 0) {
        continue;
      }

      if (rule.mode === 'hard') {
        const hasApproval = approvals.some(
          (a) =>
            a.authority === rule.authority &&
            a.scope === rule.scopeSelector &&
            a.status === 'approved'
        );

        if (!hasApproval) {
          return {
            passed: false,
            reason: `Hard veto: ${rule.authority} required for ${rule.scopeSelector}${
              rule.reason ? ` - ${rule.reason}` : ''
            }`,
            requiredRole: rule.requiredApprovalRole,
          };
        }
      } else if (rule.mode === 'soft') {
        return {
          passed: true,
          warnings: [
            `Soft veto: ${rule.authority} recommends review for ${rule.scopeSelector}${
              rule.reason ? ` - ${rule.reason}` : ''
            }`,
          ],
          riskMultiplier: 1.5,
          requireProbe: true,
        };
      }
    }

    return { passed: true };
  }

  /**
   * Match changes against a scope selector.
   */
  private matchScope(changes: ChangeSet, scopeSelector: string): ChangeSet['changes'] {
    return changes.changes.filter((change) => {
      const resourceKey = `${change.resourceType}:${change.resourcePath}`;
      
      // Wildcard matching
      if (scopeSelector.endsWith('*')) {
        const prefix = scopeSelector.slice(0, -1);
        return resourceKey.startsWith(prefix);
      }
      
      // Exact matching
      return resourceKey === scopeSelector;
    });
  }

  /**
   * Add a veto rule.
   */
  addRule(rule: VetoRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove veto rules by authority.
   */
  removeRulesByAuthority(authority: ChangeAuthority): void {
    this.rules = this.rules.filter((r) => r.authority !== authority);
  }

  /**
   * Get all rules.
   */
  getRules(): VetoRule[] {
    return [...this.rules];
  }

  /**
   * Check if any hard veto exists for a scope.
   */
  hasHardVeto(scopeSelector: string): boolean {
    return this.rules.some(
      (r) => r.mode === 'hard' && this.scopeMatches(r.scopeSelector, scopeSelector)
    );
  }

  /**
   * Check if any soft veto exists for a scope.
   */
  hasSoftVeto(scopeSelector: string): boolean {
    return this.rules.some(
      (r) => r.mode === 'soft' && this.scopeMatches(r.scopeSelector, scopeSelector)
    );
  }

  /**
   * Check if two scope selectors match.
   */
  private scopeMatches(selector: string, scope: string): boolean {
    if (selector.endsWith('*')) {
      return scope.startsWith(selector.slice(0, -1));
    }
    return selector === scope;
  }
}

/**
 * Default veto rules for common scenarios.
 */
export const DEFAULT_VETO_RULES: VetoRule[] = [
  {
    authority: 'architect',
    mode: 'hard',
    scopeSelector: 'contract:OpenAPI:*',
    reason: 'API contract changes require architect approval',
    requiredApprovalRole: 'architect',
  },
  {
    authority: 'architect',
    mode: 'hard',
    scopeSelector: 'contract:DBSchema:*',
    reason: 'Database schema changes require architect approval',
    requiredApprovalRole: 'architect',
  },
  {
    authority: 'security',
    mode: 'hard',
    scopeSelector: 'contract:*:auth*',
    reason: 'Auth-related changes require security approval',
    requiredApprovalRole: 'security-team',
  },
  {
    authority: 'backend-lead',
    mode: 'soft',
    scopeSelector: 'graph:Entity:*',
    reason: 'Entity changes should be reviewed by backend lead',
  },
];

/**
 * Create veto enforcer with default rules.
 */
export function createDefaultVetoEnforcer(): VetoEnforcer {
  return new VetoEnforcer(DEFAULT_VETO_RULES);
}
