/**
 * ASF V4.0 DoD Guard - Auto-Approve Rules
 *
 * Defines conditions for automatic contract approval.
 * Version: v0.8.5
 */
import type { ContractDiff } from '../contract/types';
import type { AutoApproveRule } from '../ownership/types';
/**
 * Default auto-approve rules.
 */
export declare const DEFAULT_AUTO_APPROVE_RULES: AutoApproveRule[];
/**
 * Check if a diff meets auto-approve conditions.
 *
 * @param diff - Contract diff to evaluate
 * @param rules - Auto-approve rules (default: DEFAULT_AUTO_APPROVE_RULES)
 * @returns Whether the diff can be auto-approved
 */
export declare function canAutoApprove(diff: ContractDiff, rules?: AutoApproveRule[]): boolean;
/**
 * Get auto-approve eligibility report.
 */
export declare function getAutoApproveReport(diff: ContractDiff, rules?: AutoApproveRule[]): {
    eligible: boolean;
    reason?: string;
    failedConditions: string[];
    rule?: AutoApproveRule;
};
/**
 * Create custom auto-approve rule.
 */
export declare function createAutoApproveRule(params: {
    contractType: string;
    maxRiskScore?: number;
    allowBreaking?: boolean;
    allowTypeChanges?: boolean;
    allowRemovedFields?: boolean;
}): AutoApproveRule;
/**
 * Auto-approve manager.
 */
export declare class AutoApproveManager {
    private rules;
    constructor(rules?: AutoApproveRule[]);
    /**
     * Check if a diff can be auto-approved.
     */
    check(diff: ContractDiff): boolean;
    /**
     * Get detailed eligibility report.
     */
    getReport(diff: ContractDiff): ReturnType<typeof getAutoApproveReport>;
    /**
     * Add a custom rule.
     */
    addRule(rule: AutoApproveRule): void;
    /**
     * Remove rule for contract type.
     */
    removeRule(contractType: string): void;
    /**
     * Enable/disable auto-approve for contract type.
     */
    setEnabled(contractType: string, enabled: boolean): void;
    /**
     * Get all rules.
     */
    getRules(): AutoApproveRule[];
    /**
     * Get stats on auto-approve eligibility.
     */
    getStats(): {
        totalRules: number;
        enabledRules: number;
        contractTypes: string[];
    };
}
export declare function getDefaultAutoApproveManager(): AutoApproveManager;
export declare function resetDefaultAutoApproveManager(): void;
