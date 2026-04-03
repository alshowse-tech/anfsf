/**
 * ASF V4.0 DoD Guard - Auto-Approve Rules
 * 
 * Defines conditions for automatic contract approval.
 * Version: v0.8.5
 */

import type { ContractDiff } from '../contract/types';
import type { AutoApproveRule } from '../ownership/types';
import type { DiffItem } from '../contract/types';
import { canAutoApproveOpenAPI } from '../contract/diff-openapi';
import { canAutoApproveDBSchema } from '../contract/diff-dbschema';

/**
 * Default auto-approve rules.
 */
export const DEFAULT_AUTO_APPROVE_RULES: AutoApproveRule[] = [
  {
    contractType: 'OpenAPI',
    conditions: {
      onlyAddOptionalFields: true,
      noTypeChanges: true,
      noConstraintTighten: true,
      riskScoreBelow: 20,
    },
    autoApprove: true,
  },
  {
    contractType: 'DBSchema',
    conditions: {
      onlyAddOptionalFields: true,
      noTypeChanges: true,
      noConstraintTighten: true,
      riskScoreBelow: 15,
    },
    autoApprove: true,
  },
  {
    contractType: 'UIProps',
    conditions: {
      onlyAddFields: true,
      noRemovedFields: true,
      riskScoreBelow: 15,
    },
    autoApprove: true,
  },
  {
    contractType: 'EventSchema',
    conditions: {
      onlyAddOptionalFields: true,
      noRemovedFields: true,
      riskScoreBelow: 20,
    },
    autoApprove: true,
  },
];

/**
 * Check if a diff meets auto-approve conditions.
 * 
 * @param diff - Contract diff to evaluate
 * @param rules - Auto-approve rules (default: DEFAULT_AUTO_APPROVE_RULES)
 * @returns Whether the diff can be auto-approved
 */
export function canAutoApprove(
  diff: ContractDiff,
  rules: AutoApproveRule[] = DEFAULT_AUTO_APPROVE_RULES
): boolean {
  // Find matching rule
  const rule = rules.find(
    (r) => r.contractType === diff.contractType || r.contractType === '*'
  );

  if (!rule || !rule.autoApprove) {
    return false;
  }

  // Check contract-type specific rules
  switch (diff.contractType) {
    case 'OpenAPI':
      return canAutoApproveOpenAPI(diff as any);

    case 'DBSchema':
      return canAutoApproveDBSchema(diff as any);
  }

  // Generic checks for other contract types
  return evaluateGenericAutoApprove(diff, rule);
}

/**
 * Evaluate generic auto-approve conditions.
 */
function evaluateGenericAutoApprove(
  diff: ContractDiff,
  rule: AutoApproveRule
): boolean {
  const { conditions } = rule;

  // Check risk score threshold
  if (conditions.riskScoreBelow !== undefined) {
    if ((diff.riskScore || 50) >= conditions.riskScoreBelow) {
      return false;
    }
  }

  // Check for breaking changes
  if (diff.breaking) {
    return false;
  }

  // Check no removed items
  if (conditions.noRemovedFields && diff.changes.removed.length > 0) {
    return false;
  }

  // Check only adding optional fields
  if (conditions.onlyAddOptionalFields) {
    for (const item of diff.changes.added) {
      if (item.details?.required === true) {
        return false;
      }
    }
  }

  // Check no type changes
  if (conditions.noTypeChanges) {
    for (const item of diff.changes.modified) {
      if (item.type.includes('type_change')) {
        return false;
      }
    }
  }

  // Check no constraint tightening
  if (conditions.noConstraintTighten) {
    for (const item of diff.changes.modified) {
      if (item.type.includes('constraint')) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get auto-approve eligibility report.
 */
export function getAutoApproveReport(
  diff: ContractDiff,
  rules: AutoApproveRule[] = DEFAULT_AUTO_APPROVE_RULES
): {
  eligible: boolean;
  reason?: string;
  failedConditions: string[];
  rule?: AutoApproveRule;
} {
  const failedConditions: string[] = [];

  // Find matching rule
  const rule = rules.find(
    (r) => r.contractType === diff.contractType || r.contractType === '*'
  );

  if (!rule) {
    return {
      eligible: false,
      reason: `No auto-approve rule for ${diff.contractType}`,
      failedConditions,
    };
  }

  if (!rule.autoApprove) {
    return {
      eligible: false,
      reason: `Auto-approve disabled for ${diff.contractType}`,
      failedConditions,
      rule,
    };
  }

  // Check breaking
  if (diff.breaking) {
    failedConditions.push('Breaking changes not allowed');
  }

  // Check risk score
  if (rule.conditions.riskScoreBelow !== undefined) {
    const riskScore = diff.riskScore || 50;
    if (riskScore >= rule.conditions.riskScoreBelow) {
      failedConditions.push(
        `Risk score ${riskScore} >= threshold ${rule.conditions.riskScoreBelow}`
      );
    }
  }

  // Check removed items
  if (rule.conditions.noRemovedFields && diff.changes.removed.length > 0) {
    failedConditions.push(
      `Removed ${diff.changes.removed.length} items (not allowed)`
    );
  }

  // Check type changes
  if (rule.conditions.noTypeChanges) {
    const typeChanges = diff.changes.modified.filter((item: DiffItem) =>
      item.type.includes('type_change')
    );
    if (typeChanges.length > 0) {
      failedConditions.push(
        `Type changes detected (${typeChanges.length} items)`
      );
    }
  }

  // Check constraint tightening
  if (rule.conditions.noConstraintTighten) {
    const constraintChanges = diff.changes.modified.filter((item: DiffItem) =>
      item.type.includes('constraint')
    );
    if (constraintChanges.length > 0) {
      failedConditions.push(
        `Constraint changes detected (${constraintChanges.length} items)`
      );
    }
  }

  // Check optional fields only
  if (rule.conditions.onlyAddOptionalFields) {
    const requiredAdds = diff.changes.added.filter(
      (item: DiffItem) => item.details?.required === true
    );
    if (requiredAdds.length > 0) {
      failedConditions.push(
        `Added ${requiredAdds.length} required fields (must be optional)`
      );
    }
  }

  return {
    eligible: failedConditions.length === 0,
    reason: failedConditions.length === 0 ? 'All conditions met' : undefined,
    failedConditions,
    rule,
  };
}

/**
 * Create custom auto-approve rule.
 */
export function createAutoApproveRule(params: {
  contractType: string;
  maxRiskScore?: number;
  allowBreaking?: boolean;
  allowTypeChanges?: boolean;
  allowRemovedFields?: boolean;
}): AutoApproveRule {
  const {
    contractType,
    maxRiskScore = 20,
    allowBreaking = false,
    allowTypeChanges = false,
    allowRemovedFields = false,
  } = params;

  return {
    contractType,
    conditions: {
      riskScoreBelow: maxRiskScore,
      noTypeChanges: !allowTypeChanges,
      noConstraintTighten: true,
      onlyAddOptionalFields: true,
    },
    autoApprove: true,
  };
}

/**
 * Auto-approve manager.
 */
export class AutoApproveManager {
  private rules: AutoApproveRule[];

  constructor(rules: AutoApproveRule[] = []) {
    this.rules = rules.length > 0 ? rules : DEFAULT_AUTO_APPROVE_RULES;
  }

  /**
   * Check if a diff can be auto-approved.
   */
  check(diff: ContractDiff): boolean {
    return canAutoApprove(diff, this.rules);
  }

  /**
   * Get detailed eligibility report.
   */
  getReport(diff: ContractDiff): ReturnType<typeof getAutoApproveReport> {
    return getAutoApproveReport(diff, this.rules);
  }

  /**
   * Add a custom rule.
   */
  addRule(rule: AutoApproveRule): void {
    // Remove existing rule for same contract type
    this.rules = this.rules.filter(
      (r) => r.contractType !== rule.contractType
    );
    this.rules.push(rule);
  }

  /**
   * Remove rule for contract type.
   */
  removeRule(contractType: string): void {
    this.rules = this.rules.filter((r) => r.contractType !== contractType);
  }

  /**
   * Enable/disable auto-approve for contract type.
   */
  setEnabled(contractType: string, enabled: boolean): void {
    const rule = this.rules.find((r) => r.contractType === contractType);
    if (rule) {
      rule.autoApprove = enabled;
    }
  }

  /**
   * Get all rules.
   */
  getRules(): AutoApproveRule[] {
    return [...this.rules];
  }

  /**
   * Get stats on auto-approve eligibility.
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    contractTypes: string[];
  } {
    return {
      totalRules: this.rules.length,
      enabledRules: this.rules.filter((r) => r.autoApprove).length,
      contractTypes: [...new Set(this.rules.map((r) => r.contractType))],
    };
  }
}

/**
 * Singleton auto-approve manager.
 */
let defaultManager: AutoApproveManager | null = null;

export function getDefaultAutoApproveManager(): AutoApproveManager {
  if (!defaultManager) {
    defaultManager = new AutoApproveManager();
  }
  return defaultManager;
}

export function resetDefaultAutoApproveManager(): void {
  defaultManager = null;
}
