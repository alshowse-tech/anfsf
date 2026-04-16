/**
 * ASF V4.0 Progressive Evolution Framework
 *
 * Manages controlled evolution of agent roles and contracts with KPI tracking.
 * Version: v1.5.0
 *
 * Features:
 * - Style loading KPI tracking (target >99%)
 * - Personalization budget integration
 * - Evolution guardrails
 * - Automatic rollback on KPI violation
 */
import type { ContractDiff } from '../contract/types';
/**
 * Evolution KPI types.
 */
export type KPIType = 'style_loading_success_rate' | 'contract_change_success_rate' | 'role_assignment_efficiency' | 'token_budget_compliance' | 'deployment_success_rate';
/**
 * KPI target configuration.
 */
export interface KPITarget {
    /** KPI type */
    type: KPIType;
    /** Target value (0-100 for percentages) */
    target: number;
    /** Minimum acceptable value */
    minimum: number;
    /** Current value */
    current: number;
    /** Trend (positive = improving) */
    trend: number;
    /** Last updated timestamp */
    lastUpdated: number;
}
/**
 * Style loading KPI specific configuration.
 */
export interface StyleLoadingKPI extends KPITarget {
    type: 'style_loading_success_rate';
    /** Total style load attempts */
    totalAttempts: number;
    /** Successful style loads */
    successfulLoads: number;
    /** Failed style loads */
    failedLoads: number;
    /** Average load time (ms) */
    avgLoadTimeMs: number;
    /** P99 load time (ms) */
    p99LoadTimeMs: number;
    /** FOUC incidents count */
    foucIncidents: number;
    /** Critical CSS inlining rate */
    criticalCSSInliningRate: number;
}
/**
 * Personalization budget configuration.
 */
export interface PersonalizationBudgetConfig {
    /** Total budget (tokens/credits) */
    totalBudget: number;
    /** Used budget */
    usedBudget: number;
    /** Budget for styles specifically */
    styleBudget: number;
    /** Used style budget */
    usedStyleBudget: number;
    /** Budget period (ms) */
    periodMs: number;
    /** Reset timestamp */
    resetAt: number;
}
/**
 * Evolution proposal.
 */
export interface EvolutionProposal {
    /** Proposal ID */
    id: string;
    /** Description */
    description: string;
    /** Expected KPI impact */
    kpiImpact: Record<KPIType, number>;
    /** Budget impact */
    budgetImpact: number;
    /** Risk score (0-100) */
    riskScore: number;
    /** Proposed changes */
    changes: ContractDiff[];
}
/**
 * Evolution result.
 */
export interface EvolutionResult {
    /** Whether evolution was approved */
    approved: boolean;
    /** Reason for rejection (if applicable) */
    rejectionReason?: string;
    /** KPI violations (if any) */
    kpiViolations: KPIViolation[];
    /** Budget violation (if applicable) */
    budgetViolation?: BudgetViolation;
}
/**
 * KPI violation record.
 */
export interface KPIViolation {
    /** KPI type */
    type: KPIType;
    /** Current value */
    currentValue: number;
    /** Minimum required */
    minimum: number;
    /** Severity */
    severity: 'warning' | 'critical';
}
/**
 * Budget violation record.
 */
export interface BudgetViolation {
    /** Budget type */
    type: 'total' | 'style';
    /** Requested amount */
    requested: number;
    /** Available amount */
    available: number;
    /** Over by */
    overBy: number;
}
/**
 * Progressive Evolution Framework configuration.
 */
export interface EvolutionFrameworkConfig {
    /** Enable KPI tracking */
    enableKPITracking?: boolean;
    /** Enable budget enforcement */
    enableBudgetEnforcement?: boolean;
    /** Enable automatic rollback */
    enableAutoRollback?: boolean;
    /** KPI check interval (ms) */
    kpiCheckIntervalMs?: number;
    /** Rollback threshold (consecutive violations) */
    rollbackThreshold?: number;
}
/**
 * Progressive Evolution Framework - Manages controlled evolution with KPI guardrails.
 */
export declare class ProgressiveEvolutionFramework {
    private config;
    private kpiTargets;
    private styleLoadingKPI;
    private personalizationBudget;
    private violationCount;
    private onKPIViolation?;
    constructor(config?: EvolutionFrameworkConfig);
    /**
     * Initialize default KPI targets.
     */
    private initializeKPITargets;
    /**
     * Create style loading KPI.
     */
    private createStyleLoadingKPI;
    /**
     * Create default personalization budget.
     */
    private createDefaultBudget;
    /**
     * Record style load attempt.
     */
    recordStyleLoad(success: boolean, loadTimeMs: number, isCriticalCSS?: boolean): void;
    /**
     * Check for KPI violation.
     */
    private checkKPIViolation;
    /**
     * Evaluate evolution proposal.
     */
    evaluateProposal(proposal: EvolutionProposal): Promise<EvolutionResult>;
    /**
     * Check budget for evolution proposal.
     */
    private checkBudget;
    /**
     * Trigger automatic rollback.
     */
    private triggerRollback;
    /**
     * Get current KPI status.
     */
    getKPIStatus(kpiType: KPIType): KPITarget | null;
    /**
     * Get style loading KPI details.
     */
    getStyleLoadingKPI(): StyleLoadingKPI;
    /**
     * Get all KPIs.
     */
    getAllKPIs(): Map<KPIType, KPITarget>;
    /**
     * Get budget status.
     */
    getBudgetStatus(): PersonalizationBudgetConfig;
    /**
     * Update budget usage.
     */
    updateBudgetUsage(amount: number, isStyleRelated?: boolean): void;
    /**
     * Set KPI violation callback.
     */
    onKPIViolationCallback(callback: (violation: KPIViolation) => void): void;
    /**
     * Reset violation count.
     */
    resetViolationCount(): void;
    /**
     * Get framework health status.
     */
    getHealthStatus(): {
        healthy: boolean;
        kpiStatus: 'healthy' | 'warning' | 'critical';
        budgetStatus: 'healthy' | 'warning' | 'critical';
        violations: number;
    };
}
/**
 * Create progressive evolution framework.
 */
export declare function createProgressiveEvolutionFramework(config?: EvolutionFrameworkConfig): ProgressiveEvolutionFramework;
export default ProgressiveEvolutionFramework;
