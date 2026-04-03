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

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Evolution KPI types.
 */
export type KPIType = 
  | 'style_loading_success_rate'
  | 'contract_change_success_rate'
  | 'role_assignment_efficiency'
  | 'token_budget_compliance'
  | 'deployment_success_rate';

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

// ============================================================================
// Progressive Evolution Framework
// ============================================================================

/**
 * Progressive Evolution Framework - Manages controlled evolution with KPI guardrails.
 */
export class ProgressiveEvolutionFramework {
  private config: Required<EvolutionFrameworkConfig>;
  private kpiTargets: Map<KPIType, KPITarget>;
  private styleLoadingKPI: StyleLoadingKPI;
  private personalizationBudget: PersonalizationBudgetConfig;
  private violationCount: number;
  private onKPIViolation?: (violation: KPIViolation) => void;

  constructor(config: EvolutionFrameworkConfig = {}) {
    this.config = {
      enableKPITracking: true,
      enableBudgetEnforcement: true,
      enableAutoRollback: true,
      kpiCheckIntervalMs: 60000, // 1 minute
      rollbackThreshold: 3,
      ...config,
    } as Required<EvolutionFrameworkConfig>;

    // Initialize KPI targets
    this.kpiTargets = new Map();
    this.initializeKPITargets();

    // Initialize style loading KPI
    this.styleLoadingKPI = this.createStyleLoadingKPI();

    // Initialize personalization budget
    this.personalizationBudget = this.createDefaultBudget();

    this.violationCount = 0;
  }

  /**
   * Initialize default KPI targets.
   */
  private initializeKPITargets(): void {
    // Style loading success rate (V1.5.0 target: >99%)
    this.kpiTargets.set('style_loading_success_rate', {
      type: 'style_loading_success_rate',
      target: 99.5,
      minimum: 99.0,
      current: 100.0,
      trend: 0,
      lastUpdated: Date.now(),
    });

    // Contract change success rate
    this.kpiTargets.set('contract_change_success_rate', {
      type: 'contract_change_success_rate',
      target: 95.0,
      minimum: 90.0,
      current: 100.0,
      trend: 0,
      lastUpdated: Date.now(),
    });

    // Role assignment efficiency
    this.kpiTargets.set('role_assignment_efficiency', {
      type: 'role_assignment_efficiency',
      target: 85.0,
      minimum: 75.0,
      current: 100.0,
      trend: 0,
      lastUpdated: Date.now(),
    });

    // Token budget compliance
    this.kpiTargets.set('token_budget_compliance', {
      type: 'token_budget_compliance',
      target: 100.0,
      minimum: 95.0,
      current: 100.0,
      trend: 0,
      lastUpdated: Date.now(),
    });

    // Deployment success rate
    this.kpiTargets.set('deployment_success_rate', {
      type: 'deployment_success_rate',
      target: 98.0,
      minimum: 95.0,
      current: 100.0,
      trend: 0,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Create style loading KPI.
   */
  private createStyleLoadingKPI(): StyleLoadingKPI {
    return {
      type: 'style_loading_success_rate',
      target: 99.5,
      minimum: 99.0,
      current: 100.0,
      trend: 0,
      lastUpdated: Date.now(),
      totalAttempts: 0,
      successfulLoads: 0,
      failedLoads: 0,
      avgLoadTimeMs: 0,
      p99LoadTimeMs: 0,
      foucIncidents: 0,
      criticalCSSInliningRate: 100.0,
    };
  }

  /**
   * Create default personalization budget.
   */
  private createDefaultBudget(): PersonalizationBudgetConfig {
    const now = Date.now();
    return {
      totalBudget: 1000000, // 1M tokens
      usedBudget: 0,
      styleBudget: 100000, // 100K tokens for styles (10%)
      usedStyleBudget: 0,
      periodMs: 86400000, // 24 hours
      resetAt: now + 86400000,
    };
  }

  /**
   * Record style load attempt.
   */
  recordStyleLoad(success: boolean, loadTimeMs: number, isCriticalCSS: boolean = false): void {
    this.styleLoadingKPI.totalAttempts++;
    
    if (success) {
      this.styleLoadingKPI.successfulLoads++;
    } else {
      this.styleLoadingKPI.failedLoads++;
    }

    // Update average load time
    const totalLoads = this.styleLoadingKPI.successfulLoads + this.styleLoadingKPI.failedLoads;
    this.styleLoadingKPI.avgLoadTimeMs = 
      (this.styleLoadingKPI.avgLoadTimeMs * (totalLoads - 1) + loadTimeMs) / totalLoads;

    // Update P99 (simplified)
    if (loadTimeMs > this.styleLoadingKPI.p99LoadTimeMs) {
      this.styleLoadingKPI.p99LoadTimeMs = loadTimeMs;
    }

    // Track FOUC incidents
    if (!success && isCriticalCSS) {
      this.styleLoadingKPI.foucIncidents++;
    }

    // Update success rate
    this.styleLoadingKPI.current = 
      (this.styleLoadingKPI.successfulLoads / this.styleLoadingKPI.totalAttempts) * 100;

    // Update critical CSS inlining rate
    if (isCriticalCSS) {
      const totalCritical = this.styleLoadingKPI.totalAttempts; // Simplified
      const successfulCritical = success ? this.styleLoadingKPI.successfulLoads : this.styleLoadingKPI.successfulLoads - 1;
      this.styleLoadingKPI.criticalCSSInliningRate = 
        totalCritical > 0 ? (successfulCritical / totalCritical) * 100 : 100;
    }

    this.styleLoadingKPI.lastUpdated = Date.now();

    // Update main KPI target
    const kpiTarget = this.kpiTargets.get('style_loading_success_rate');
    if (kpiTarget) {
      kpiTarget.current = this.styleLoadingKPI.current;
      kpiTarget.lastUpdated = Date.now();
    }

    // Check for KPI violation
    this.checkKPIViolation('style_loading_success_rate');
  }

  /**
   * Check for KPI violation.
   */
  private checkKPIViolation(kpiType: KPIType): KPIViolation | null {
    const kpi = this.kpiTargets.get(kpiType);
    if (!kpi) {
      return null;
    }

    if (kpi.current < kpi.minimum) {
      const violation: KPIViolation = {
        type: kpiType,
        currentValue: kpi.current,
        minimum: kpi.minimum,
        severity: kpi.current < (kpi.minimum * 0.9) ? 'critical' : 'warning',
      };

      this.violationCount++;
      console.log(`⚠️  KPI Violation: ${kpiType} = ${kpi.current.toFixed(2)}% (minimum: ${kpi.minimum}%)`);

      // Trigger callback
      if (this.onKPIViolation) {
        this.onKPIViolation(violation);
      }

      // Check for automatic rollback
      if (this.config.enableAutoRollback && this.violationCount >= this.config.rollbackThreshold) {
        console.log(`🔄 Automatic rollback triggered: ${this.violationCount} consecutive violations`);
        this.triggerRollback(violation);
      }

      return violation;
    }

    return null;
  }

  /**
   * Evaluate evolution proposal.
   */
  async evaluateProposal(proposal: EvolutionProposal): Promise<EvolutionResult> {
    const kpiViolations: KPIViolation[] = [];
    let budgetViolation: BudgetViolation | undefined;

    // Check KPI impact
    for (const [kpiType, impact] of Object.entries(proposal.kpiImpact)) {
      const kpi = this.kpiTargets.get(kpiType as KPIType);
      if (kpi && impact < 0) {
        const projectedValue = kpi.current + impact;
        if (projectedValue < kpi.minimum) {
          kpiViolations.push({
            type: kpiType as KPIType,
            currentValue: projectedValue,
            minimum: kpi.minimum,
            severity: projectedValue < (kpi.minimum * 0.9) ? 'critical' : 'warning',
          });
        }
      }
    }

    // Check budget
    if (this.config.enableBudgetEnforcement) {
      budgetViolation = this.checkBudget(proposal.budgetImpact);
    }

    // Determine approval
    const approved = kpiViolations.length === 0 && !budgetViolation;

    const result: EvolutionResult = {
      approved,
      kpiViolations,
      budgetViolation,
    };

    if (!approved) {
      if (kpiViolations.length > 0) {
        result.rejectionReason = `KPI violations: ${kpiViolations.map(v => `${v.type}=${v.currentValue.toFixed(2)}%`).join(', ')}`;
      } else if (budgetViolation) {
        result.rejectionReason = `Budget exceeded: requested ${budgetViolation.requested}, available ${budgetViolation.available}`;
      }
    }

    return result;
  }

  /**
   * Check budget for evolution proposal.
   */
  private checkBudget(requestedAmount: number): BudgetViolation | undefined {
    const now = Date.now();

    // Reset budget if period expired
    if (now >= this.personalizationBudget.resetAt) {
      this.personalizationBudget.usedBudget = 0;
      this.personalizationBudget.usedStyleBudget = 0;
      this.personalizationBudget.resetAt = now + this.personalizationBudget.periodMs;
    }

    // Check total budget
    if (this.personalizationBudget.usedBudget + requestedAmount > this.personalizationBudget.totalBudget) {
      return {
        type: 'total',
        requested: requestedAmount,
        available: this.personalizationBudget.totalBudget - this.personalizationBudget.usedBudget,
        overBy: (this.personalizationBudget.usedBudget + requestedAmount) - this.personalizationBudget.totalBudget,
      };
    }

    // Check style budget (if this is a style-related change)
    const isStyleRelated = requestedAmount <= this.personalizationBudget.styleBudget;
    if (!isStyleRelated && requestedAmount > this.personalizationBudget.styleBudget) {
      if (this.personalizationBudget.usedStyleBudget + requestedAmount > this.personalizationBudget.styleBudget) {
        return {
          type: 'style',
          requested: requestedAmount,
          available: this.personalizationBudget.styleBudget - this.personalizationBudget.usedStyleBudget,
          overBy: (this.personalizationBudget.usedStyleBudget + requestedAmount) - this.personalizationBudget.styleBudget,
        };
      }
    }

    return undefined;
  }

  /**
   * Trigger automatic rollback.
   */
  private triggerRollback(violation: KPIViolation): void {
    console.log(`🚨 ROLLBACK TRIGGERED: ${violation.type} violation (severity: ${violation.severity})`);
    
    // Reset violation count
    this.violationCount = 0;

    // In production, this would trigger actual rollback logic
    // For now, just log the event
  }

  /**
   * Get current KPI status.
   */
  getKPIStatus(kpiType: KPIType): KPITarget | null {
    return this.kpiTargets.get(kpiType) || null;
  }

  /**
   * Get style loading KPI details.
   */
  getStyleLoadingKPI(): StyleLoadingKPI {
    return { ...this.styleLoadingKPI };
  }

  /**
   * Get all KPIs.
   */
  getAllKPIs(): Map<KPIType, KPITarget> {
    return new Map(this.kpiTargets);
  }

  /**
   * Get budget status.
   */
  getBudgetStatus(): PersonalizationBudgetConfig {
    return { ...this.personalizationBudget };
  }

  /**
   * Update budget usage.
   */
  updateBudgetUsage(amount: number, isStyleRelated: boolean = false): void {
    const now = Date.now();

    // Reset if period expired
    if (now >= this.personalizationBudget.resetAt) {
      this.personalizationBudget.usedBudget = 0;
      this.personalizationBudget.usedStyleBudget = 0;
      this.personalizationBudget.resetAt = now + this.personalizationBudget.periodMs;
    }

    this.personalizationBudget.usedBudget += amount;
    
    if (isStyleRelated) {
      this.personalizationBudget.usedStyleBudget += amount;
    }
  }

  /**
   * Set KPI violation callback.
   */
  onKPIViolationCallback(callback: (violation: KPIViolation) => void): void {
    this.onKPIViolation = callback;
  }

  /**
   * Reset violation count.
   */
  resetViolationCount(): void {
    this.violationCount = 0;
  }

  /**
   * Get framework health status.
   */
  getHealthStatus(): {
    healthy: boolean;
    kpiStatus: 'healthy' | 'warning' | 'critical';
    budgetStatus: 'healthy' | 'warning' | 'critical';
    violations: number;
  } {
    let kpiStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    let budgetStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check KPIs
    for (const kpi of this.kpiTargets.values()) {
      if (kpi.current < kpi.minimum) {
        kpiStatus = 'critical';
        break;
      } else if (kpi.current < kpi.target) {
        kpiStatus = 'warning';
      }
    }

    // Check budget
    const budgetUsagePercent = (this.personalizationBudget.usedBudget / this.personalizationBudget.totalBudget) * 100;
    if (budgetUsagePercent >= 100) {
      budgetStatus = 'critical';
    } else if (budgetUsagePercent >= 80) {
      budgetStatus = 'warning';
    }

    return {
      healthy: kpiStatus === 'healthy' && budgetStatus === 'healthy' && this.violationCount === 0,
      kpiStatus,
      budgetStatus,
      violations: this.violationCount,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create progressive evolution framework.
 */
export function createProgressiveEvolutionFramework(
  config?: EvolutionFrameworkConfig
): ProgressiveEvolutionFramework {
  return new ProgressiveEvolutionFramework(config);
}

// ============================================================================
// Exports
// ============================================================================

export default ProgressiveEvolutionFramework;
