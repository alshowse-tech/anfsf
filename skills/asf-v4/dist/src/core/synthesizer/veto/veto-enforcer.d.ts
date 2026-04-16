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
export declare class VetoEnforcer {
    private rules;
    constructor(rules?: VetoRule[]);
    /**
     * Enforce veto rules against a change set.
     */
    enforce(changes: ChangeSet, approvals: ApprovalRecord[]): VetoResult;
    /**
     * Match changes against a scope selector.
     */
    private matchScope;
    /**
     * Add a veto rule.
     */
    addRule(rule: VetoRule): void;
    /**
     * Remove veto rules by authority.
     */
    removeRulesByAuthority(authority: ChangeAuthority): void;
    /**
     * Get all rules.
     */
    getRules(): VetoRule[];
    /**
     * Check if any hard veto exists for a scope.
     */
    hasHardVeto(scopeSelector: string): boolean;
    /**
     * Check if any soft veto exists for a scope.
     */
    hasSoftVeto(scopeSelector: string): boolean;
    /**
     * Check if two scope selectors match.
     */
    private scopeMatches;
}
/**
 * Default veto rules for common scenarios.
 */
export declare const DEFAULT_VETO_RULES: VetoRule[];
/**
 * Create veto enforcer with default rules.
 */
export declare function createDefaultVetoEnforcer(): VetoEnforcer;
