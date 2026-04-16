"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressiveEvolutionFramework = void 0;
exports.createProgressiveEvolutionFramework = createProgressiveEvolutionFramework;
// ============================================================================
// Progressive Evolution Framework
// ============================================================================
/**
 * Progressive Evolution Framework - Manages controlled evolution with KPI guardrails.
 */
class ProgressiveEvolutionFramework {
    constructor(config = {}) {
        this.config = {
            enableKPITracking: true,
            enableBudgetEnforcement: true,
            enableAutoRollback: true,
            kpiCheckIntervalMs: 60000, // 1 minute
            rollbackThreshold: 3,
            ...config,
        };
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
    initializeKPITargets() {
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
    createStyleLoadingKPI() {
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
    createDefaultBudget() {
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
    recordStyleLoad(success, loadTimeMs, isCriticalCSS = false) {
        this.styleLoadingKPI.totalAttempts++;
        if (success) {
            this.styleLoadingKPI.successfulLoads++;
        }
        else {
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
    checkKPIViolation(kpiType) {
        const kpi = this.kpiTargets.get(kpiType);
        if (!kpi) {
            return null;
        }
        if (kpi.current < kpi.minimum) {
            const violation = {
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
    async evaluateProposal(proposal) {
        const kpiViolations = [];
        let budgetViolation;
        // Check KPI impact
        for (const [kpiType, impact] of Object.entries(proposal.kpiImpact)) {
            const kpi = this.kpiTargets.get(kpiType);
            if (kpi && impact < 0) {
                const projectedValue = kpi.current + impact;
                if (projectedValue < kpi.minimum) {
                    kpiViolations.push({
                        type: kpiType,
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
        const result = {
            approved,
            kpiViolations,
            budgetViolation,
        };
        if (!approved) {
            if (kpiViolations.length > 0) {
                result.rejectionReason = `KPI violations: ${kpiViolations.map(v => `${v.type}=${v.currentValue.toFixed(2)}%`).join(', ')}`;
            }
            else if (budgetViolation) {
                result.rejectionReason = `Budget exceeded: requested ${budgetViolation.requested}, available ${budgetViolation.available}`;
            }
        }
        return result;
    }
    /**
     * Check budget for evolution proposal.
     */
    checkBudget(requestedAmount) {
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
    triggerRollback(violation) {
        console.log(`🚨 ROLLBACK TRIGGERED: ${violation.type} violation (severity: ${violation.severity})`);
        // Reset violation count
        this.violationCount = 0;
        // In production, this would trigger actual rollback logic
        // For now, just log the event
    }
    /**
     * Get current KPI status.
     */
    getKPIStatus(kpiType) {
        return this.kpiTargets.get(kpiType) || null;
    }
    /**
     * Get style loading KPI details.
     */
    getStyleLoadingKPI() {
        return { ...this.styleLoadingKPI };
    }
    /**
     * Get all KPIs.
     */
    getAllKPIs() {
        return new Map(this.kpiTargets);
    }
    /**
     * Get budget status.
     */
    getBudgetStatus() {
        return { ...this.personalizationBudget };
    }
    /**
     * Update budget usage.
     */
    updateBudgetUsage(amount, isStyleRelated = false) {
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
    onKPIViolationCallback(callback) {
        this.onKPIViolation = callback;
    }
    /**
     * Reset violation count.
     */
    resetViolationCount() {
        this.violationCount = 0;
    }
    /**
     * Get framework health status.
     */
    getHealthStatus() {
        let kpiStatus = 'healthy';
        let budgetStatus = 'healthy';
        // Check KPIs
        for (const kpi of this.kpiTargets.values()) {
            if (kpi.current < kpi.minimum) {
                kpiStatus = 'critical';
                break;
            }
            else if (kpi.current < kpi.target) {
                kpiStatus = 'warning';
            }
        }
        // Check budget
        const budgetUsagePercent = (this.personalizationBudget.usedBudget / this.personalizationBudget.totalBudget) * 100;
        if (budgetUsagePercent >= 100) {
            budgetStatus = 'critical';
        }
        else if (budgetUsagePercent >= 80) {
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
exports.ProgressiveEvolutionFramework = ProgressiveEvolutionFramework;
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create progressive evolution framework.
 */
function createProgressiveEvolutionFramework(config) {
    return new ProgressiveEvolutionFramework(config);
}
// ============================================================================
// Exports
// ============================================================================
exports.default = ProgressiveEvolutionFramework;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJhbWV3b3JrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvcmUvZXZvbHV0aW9uL2ZyYW1ld29yay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O0dBV0c7OztBQW9tQkgsa0ZBSUM7QUE5YUQsK0VBQStFO0FBQy9FLGtDQUFrQztBQUNsQywrRUFBK0U7QUFFL0U7O0dBRUc7QUFDSCxNQUFhLDZCQUE2QjtJQVF4QyxZQUFZLFNBQW1DLEVBQUU7UUFDL0MsSUFBSSxDQUFDLE1BQU0sR0FBRztZQUNaLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsdUJBQXVCLEVBQUUsSUFBSTtZQUM3QixrQkFBa0IsRUFBRSxJQUFJO1lBQ3hCLGtCQUFrQixFQUFFLEtBQUssRUFBRSxXQUFXO1lBQ3RDLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsR0FBRyxNQUFNO1NBQzRCLENBQUM7UUFFeEMseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUU1QiwrQkFBK0I7UUFDL0IsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUVwRCxvQ0FBb0M7UUFDcEMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBRXhELElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFRDs7T0FFRztJQUNLLG9CQUFvQjtRQUMxQixtREFBbUQ7UUFDbkQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUU7WUFDaEQsSUFBSSxFQUFFLDRCQUE0QjtZQUNsQyxNQUFNLEVBQUUsSUFBSTtZQUNaLE9BQU8sRUFBRSxJQUFJO1lBQ2IsT0FBTyxFQUFFLEtBQUs7WUFDZCxLQUFLLEVBQUUsQ0FBQztZQUNSLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO1NBQ3hCLENBQUMsQ0FBQztRQUVILCtCQUErQjtRQUMvQixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsRUFBRTtZQUNsRCxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLE1BQU0sRUFBRSxJQUFJO1lBQ1osT0FBTyxFQUFFLElBQUk7WUFDYixPQUFPLEVBQUUsS0FBSztZQUNkLEtBQUssRUFBRSxDQUFDO1lBQ1IsV0FBVyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7U0FDeEIsQ0FBQyxDQUFDO1FBRUgsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFO1lBQ2hELElBQUksRUFBRSw0QkFBNEI7WUFDbEMsTUFBTSxFQUFFLElBQUk7WUFDWixPQUFPLEVBQUUsSUFBSTtZQUNiLE9BQU8sRUFBRSxLQUFLO1lBQ2QsS0FBSyxFQUFFLENBQUM7WUFDUixXQUFXLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtTQUN4QixDQUFDLENBQUM7UUFFSCwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUU7WUFDN0MsSUFBSSxFQUFFLHlCQUF5QjtZQUMvQixNQUFNLEVBQUUsS0FBSztZQUNiLE9BQU8sRUFBRSxJQUFJO1lBQ2IsT0FBTyxFQUFFLEtBQUs7WUFDZCxLQUFLLEVBQUUsQ0FBQztZQUNSLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO1NBQ3hCLENBQUMsQ0FBQztRQUVILDBCQUEwQjtRQUMxQixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRTtZQUM3QyxJQUFJLEVBQUUseUJBQXlCO1lBQy9CLE1BQU0sRUFBRSxJQUFJO1lBQ1osT0FBTyxFQUFFLElBQUk7WUFDYixPQUFPLEVBQUUsS0FBSztZQUNkLEtBQUssRUFBRSxDQUFDO1lBQ1IsV0FBVyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7U0FDeEIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ0sscUJBQXFCO1FBQzNCLE9BQU87WUFDTCxJQUFJLEVBQUUsNEJBQTRCO1lBQ2xDLE1BQU0sRUFBRSxJQUFJO1lBQ1osT0FBTyxFQUFFLElBQUk7WUFDYixPQUFPLEVBQUUsS0FBSztZQUNkLEtBQUssRUFBRSxDQUFDO1lBQ1IsV0FBVyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDdkIsYUFBYSxFQUFFLENBQUM7WUFDaEIsZUFBZSxFQUFFLENBQUM7WUFDbEIsV0FBVyxFQUFFLENBQUM7WUFDZCxhQUFhLEVBQUUsQ0FBQztZQUNoQixhQUFhLEVBQUUsQ0FBQztZQUNoQixhQUFhLEVBQUUsQ0FBQztZQUNoQix1QkFBdUIsRUFBRSxLQUFLO1NBQy9CLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSyxtQkFBbUI7UUFDekIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLE9BQU87WUFDTCxXQUFXLEVBQUUsT0FBTyxFQUFFLFlBQVk7WUFDbEMsVUFBVSxFQUFFLENBQUM7WUFDYixXQUFXLEVBQUUsTUFBTSxFQUFFLCtCQUErQjtZQUNwRCxlQUFlLEVBQUUsQ0FBQztZQUNsQixRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVc7WUFDL0IsT0FBTyxFQUFFLEdBQUcsR0FBRyxRQUFRO1NBQ3hCLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxlQUFlLENBQUMsT0FBZ0IsRUFBRSxVQUFrQixFQUFFLGdCQUF5QixLQUFLO1FBQ2xGLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFLENBQUM7UUFFckMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDekMsQ0FBQzthQUFNLENBQUM7WUFDTixJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3JDLENBQUM7UUFFRCwyQkFBMkI7UUFDM0IsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUM7UUFDM0YsSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhO1lBQ2hDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLEdBQUcsVUFBVSxDQUFDO1FBRXBGLDBCQUEwQjtRQUMxQixJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BELElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQztRQUNsRCxDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxPQUFPLElBQUksYUFBYSxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUN2QyxDQUFDO1FBRUQsc0JBQXNCO1FBQ3RCLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTztZQUMxQixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBRXBGLG9DQUFvQztRQUNwQyxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ2xCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUMsYUFBYTtZQUN2RSxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQztZQUNySCxJQUFJLENBQUMsZUFBZSxDQUFDLHVCQUF1QjtnQkFDMUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBRyxhQUFhLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUN6RSxDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRTlDLHlCQUF5QjtRQUN6QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQ3BFLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZCxTQUFTLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDO1lBQ2pELFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3JDLENBQUM7UUFFRCwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLDRCQUE0QixDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVEOztPQUVHO0lBQ0ssaUJBQWlCLENBQUMsT0FBZ0I7UUFDeEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxHQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM5QixNQUFNLFNBQVMsR0FBaUI7Z0JBQzlCLElBQUksRUFBRSxPQUFPO2dCQUNiLFlBQVksRUFBRSxHQUFHLENBQUMsT0FBTztnQkFDekIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPO2dCQUNwQixRQUFRLEVBQUUsR0FBRyxDQUFDLE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUzthQUNyRSxDQUFDO1lBRUYsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLE9BQU8sTUFBTSxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxHQUFHLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQztZQUVyRyxtQkFBbUI7WUFDbkIsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDakMsQ0FBQztZQUVELCtCQUErQjtZQUMvQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQzNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLElBQUksQ0FBQyxjQUFjLHlCQUF5QixDQUFDLENBQUM7Z0JBQzlGLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbEMsQ0FBQztZQUVELE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxRQUEyQjtRQUNoRCxNQUFNLGFBQWEsR0FBbUIsRUFBRSxDQUFDO1FBQ3pDLElBQUksZUFBNEMsQ0FBQztRQUVqRCxtQkFBbUI7UUFDbkIsS0FBSyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDbkUsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsT0FBa0IsQ0FBQyxDQUFDO1lBQ3BELElBQUksR0FBRyxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7Z0JBQzVDLElBQUksY0FBYyxHQUFHLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDakMsYUFBYSxDQUFDLElBQUksQ0FBQzt3QkFDakIsSUFBSSxFQUFFLE9BQWtCO3dCQUN4QixZQUFZLEVBQUUsY0FBYzt3QkFDNUIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPO3dCQUNwQixRQUFRLEVBQUUsY0FBYyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTO3FCQUN4RSxDQUFDLENBQUM7Z0JBQ0wsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsZUFBZTtRQUNmLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ3hDLGVBQWUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBRUQscUJBQXFCO1FBQ3JCLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO1FBRWhFLE1BQU0sTUFBTSxHQUFvQjtZQUM5QixRQUFRO1lBQ1IsYUFBYTtZQUNiLGVBQWU7U0FDaEIsQ0FBQztRQUVGLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNkLElBQUksYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxDQUFDLGVBQWUsR0FBRyxtQkFBbUIsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDN0gsQ0FBQztpQkFBTSxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUMzQixNQUFNLENBQUMsZUFBZSxHQUFHLDhCQUE4QixlQUFlLENBQUMsU0FBUyxlQUFlLGVBQWUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUM3SCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFRDs7T0FFRztJQUNLLFdBQVcsQ0FBQyxlQUF1QjtRQUN6QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFdkIsaUNBQWlDO1FBQ2pDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMscUJBQXFCLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQztZQUMvQyxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDO1FBQ2pGLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxHQUFHLGVBQWUsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDckcsT0FBTztnQkFDTCxJQUFJLEVBQUUsT0FBTztnQkFDYixTQUFTLEVBQUUsZUFBZTtnQkFDMUIsU0FBUyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVU7Z0JBQ3pGLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEdBQUcsZUFBZSxDQUFDLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVc7YUFDM0csQ0FBQztRQUNKLENBQUM7UUFFRCx5REFBeUQ7UUFDekQsTUFBTSxjQUFjLEdBQUcsZUFBZSxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUM7UUFDakYsSUFBSSxDQUFDLGNBQWMsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2hGLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLGVBQWUsR0FBRyxlQUFlLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUMxRyxPQUFPO29CQUNMLElBQUksRUFBRSxPQUFPO29CQUNiLFNBQVMsRUFBRSxlQUFlO29CQUMxQixTQUFTLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsZUFBZTtvQkFDOUYsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVztpQkFDaEgsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUVEOztPQUVHO0lBQ0ssZUFBZSxDQUFDLFNBQXVCO1FBQzdDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLFNBQVMsQ0FBQyxJQUFJLHlCQUF5QixTQUFTLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztRQUVwRyx3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUM7UUFFeEIsMERBQTBEO1FBQzFELDhCQUE4QjtJQUNoQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxZQUFZLENBQUMsT0FBZ0I7UUFDM0IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDOUMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsa0JBQWtCO1FBQ2hCLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxVQUFVO1FBQ1IsT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZUFBZTtRQUNiLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0lBQzNDLENBQUM7SUFFRDs7T0FFRztJQUNILGlCQUFpQixDQUFDLE1BQWMsRUFBRSxpQkFBMEIsS0FBSztRQUMvRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFdkIsMEJBQTBCO1FBQzFCLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMscUJBQXFCLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQztZQUMvQyxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDO1FBQ2pGLENBQUM7UUFFRCxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxJQUFJLE1BQU0sQ0FBQztRQUVoRCxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLElBQUksTUFBTSxDQUFDO1FBQ3ZELENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxzQkFBc0IsQ0FBQyxRQUEyQztRQUNoRSxJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQztJQUNqQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxtQkFBbUI7UUFDakIsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZUFBZTtRQU1iLElBQUksU0FBUyxHQUF1QyxTQUFTLENBQUM7UUFDOUQsSUFBSSxZQUFZLEdBQXVDLFNBQVMsQ0FBQztRQUVqRSxhQUFhO1FBQ2IsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDM0MsSUFBSSxHQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDOUIsU0FBUyxHQUFHLFVBQVUsQ0FBQztnQkFDdkIsTUFBTTtZQUNSLENBQUM7aUJBQU0sSUFBSSxHQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDcEMsU0FBUyxHQUFHLFNBQVMsQ0FBQztZQUN4QixDQUFDO1FBQ0gsQ0FBQztRQUVELGVBQWU7UUFDZixNQUFNLGtCQUFrQixHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQ2xILElBQUksa0JBQWtCLElBQUksR0FBRyxFQUFFLENBQUM7WUFDOUIsWUFBWSxHQUFHLFVBQVUsQ0FBQztRQUM1QixDQUFDO2FBQU0sSUFBSSxrQkFBa0IsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNwQyxZQUFZLEdBQUcsU0FBUyxDQUFDO1FBQzNCLENBQUM7UUFFRCxPQUFPO1lBQ0wsT0FBTyxFQUFFLFNBQVMsS0FBSyxTQUFTLElBQUksWUFBWSxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLENBQUM7WUFDM0YsU0FBUztZQUNULFlBQVk7WUFDWixVQUFVLEVBQUUsSUFBSSxDQUFDLGNBQWM7U0FDaEMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTFaRCxzRUEwWkM7QUFFRCwrRUFBK0U7QUFDL0Usb0JBQW9CO0FBQ3BCLCtFQUErRTtBQUUvRTs7R0FFRztBQUNILFNBQWdCLG1DQUFtQyxDQUNqRCxNQUFpQztJQUVqQyxPQUFPLElBQUksNkJBQTZCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUVELCtFQUErRTtBQUMvRSxVQUFVO0FBQ1YsK0VBQStFO0FBRS9FLGtCQUFlLDZCQUE2QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBU0YgVjQuMCBQcm9ncmVzc2l2ZSBFdm9sdXRpb24gRnJhbWV3b3JrXG4gKiBcbiAqIE1hbmFnZXMgY29udHJvbGxlZCBldm9sdXRpb24gb2YgYWdlbnQgcm9sZXMgYW5kIGNvbnRyYWN0cyB3aXRoIEtQSSB0cmFja2luZy5cbiAqIFZlcnNpb246IHYxLjUuMFxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gU3R5bGUgbG9hZGluZyBLUEkgdHJhY2tpbmcgKHRhcmdldCA+OTklKVxuICogLSBQZXJzb25hbGl6YXRpb24gYnVkZ2V0IGludGVncmF0aW9uXG4gKiAtIEV2b2x1dGlvbiBndWFyZHJhaWxzXG4gKiAtIEF1dG9tYXRpYyByb2xsYmFjayBvbiBLUEkgdmlvbGF0aW9uXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBDb250cmFjdERpZmYgfSBmcm9tICcuLi9jb250cmFjdC90eXBlcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGUgRGVmaW5pdGlvbnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFdm9sdXRpb24gS1BJIHR5cGVzLlxuICovXG5leHBvcnQgdHlwZSBLUElUeXBlID0gXG4gIHwgJ3N0eWxlX2xvYWRpbmdfc3VjY2Vzc19yYXRlJ1xuICB8ICdjb250cmFjdF9jaGFuZ2Vfc3VjY2Vzc19yYXRlJ1xuICB8ICdyb2xlX2Fzc2lnbm1lbnRfZWZmaWNpZW5jeSdcbiAgfCAndG9rZW5fYnVkZ2V0X2NvbXBsaWFuY2UnXG4gIHwgJ2RlcGxveW1lbnRfc3VjY2Vzc19yYXRlJztcblxuLyoqXG4gKiBLUEkgdGFyZ2V0IGNvbmZpZ3VyYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgS1BJVGFyZ2V0IHtcbiAgLyoqIEtQSSB0eXBlICovXG4gIHR5cGU6IEtQSVR5cGU7XG4gIFxuICAvKiogVGFyZ2V0IHZhbHVlICgwLTEwMCBmb3IgcGVyY2VudGFnZXMpICovXG4gIHRhcmdldDogbnVtYmVyO1xuICBcbiAgLyoqIE1pbmltdW0gYWNjZXB0YWJsZSB2YWx1ZSAqL1xuICBtaW5pbXVtOiBudW1iZXI7XG4gIFxuICAvKiogQ3VycmVudCB2YWx1ZSAqL1xuICBjdXJyZW50OiBudW1iZXI7XG4gIFxuICAvKiogVHJlbmQgKHBvc2l0aXZlID0gaW1wcm92aW5nKSAqL1xuICB0cmVuZDogbnVtYmVyO1xuICBcbiAgLyoqIExhc3QgdXBkYXRlZCB0aW1lc3RhbXAgKi9cbiAgbGFzdFVwZGF0ZWQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBTdHlsZSBsb2FkaW5nIEtQSSBzcGVjaWZpYyBjb25maWd1cmF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0eWxlTG9hZGluZ0tQSSBleHRlbmRzIEtQSVRhcmdldCB7XG4gIHR5cGU6ICdzdHlsZV9sb2FkaW5nX3N1Y2Nlc3NfcmF0ZSc7XG4gIFxuICAvKiogVG90YWwgc3R5bGUgbG9hZCBhdHRlbXB0cyAqL1xuICB0b3RhbEF0dGVtcHRzOiBudW1iZXI7XG4gIFxuICAvKiogU3VjY2Vzc2Z1bCBzdHlsZSBsb2FkcyAqL1xuICBzdWNjZXNzZnVsTG9hZHM6IG51bWJlcjtcbiAgXG4gIC8qKiBGYWlsZWQgc3R5bGUgbG9hZHMgKi9cbiAgZmFpbGVkTG9hZHM6IG51bWJlcjtcbiAgXG4gIC8qKiBBdmVyYWdlIGxvYWQgdGltZSAobXMpICovXG4gIGF2Z0xvYWRUaW1lTXM6IG51bWJlcjtcbiAgXG4gIC8qKiBQOTkgbG9hZCB0aW1lIChtcykgKi9cbiAgcDk5TG9hZFRpbWVNczogbnVtYmVyO1xuICBcbiAgLyoqIEZPVUMgaW5jaWRlbnRzIGNvdW50ICovXG4gIGZvdWNJbmNpZGVudHM6IG51bWJlcjtcbiAgXG4gIC8qKiBDcml0aWNhbCBDU1MgaW5saW5pbmcgcmF0ZSAqL1xuICBjcml0aWNhbENTU0lubGluaW5nUmF0ZTogbnVtYmVyO1xufVxuXG4vKipcbiAqIFBlcnNvbmFsaXphdGlvbiBidWRnZXQgY29uZmlndXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQZXJzb25hbGl6YXRpb25CdWRnZXRDb25maWcge1xuICAvKiogVG90YWwgYnVkZ2V0ICh0b2tlbnMvY3JlZGl0cykgKi9cbiAgdG90YWxCdWRnZXQ6IG51bWJlcjtcbiAgXG4gIC8qKiBVc2VkIGJ1ZGdldCAqL1xuICB1c2VkQnVkZ2V0OiBudW1iZXI7XG4gIFxuICAvKiogQnVkZ2V0IGZvciBzdHlsZXMgc3BlY2lmaWNhbGx5ICovXG4gIHN0eWxlQnVkZ2V0OiBudW1iZXI7XG4gIFxuICAvKiogVXNlZCBzdHlsZSBidWRnZXQgKi9cbiAgdXNlZFN0eWxlQnVkZ2V0OiBudW1iZXI7XG4gIFxuICAvKiogQnVkZ2V0IHBlcmlvZCAobXMpICovXG4gIHBlcmlvZE1zOiBudW1iZXI7XG4gIFxuICAvKiogUmVzZXQgdGltZXN0YW1wICovXG4gIHJlc2V0QXQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBFdm9sdXRpb24gcHJvcG9zYWwuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZvbHV0aW9uUHJvcG9zYWwge1xuICAvKiogUHJvcG9zYWwgSUQgKi9cbiAgaWQ6IHN0cmluZztcbiAgXG4gIC8qKiBEZXNjcmlwdGlvbiAqL1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBcbiAgLyoqIEV4cGVjdGVkIEtQSSBpbXBhY3QgKi9cbiAga3BpSW1wYWN0OiBSZWNvcmQ8S1BJVHlwZSwgbnVtYmVyPjtcbiAgXG4gIC8qKiBCdWRnZXQgaW1wYWN0ICovXG4gIGJ1ZGdldEltcGFjdDogbnVtYmVyO1xuICBcbiAgLyoqIFJpc2sgc2NvcmUgKDAtMTAwKSAqL1xuICByaXNrU2NvcmU6IG51bWJlcjtcbiAgXG4gIC8qKiBQcm9wb3NlZCBjaGFuZ2VzICovXG4gIGNoYW5nZXM6IENvbnRyYWN0RGlmZltdO1xufVxuXG4vKipcbiAqIEV2b2x1dGlvbiByZXN1bHQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZvbHV0aW9uUmVzdWx0IHtcbiAgLyoqIFdoZXRoZXIgZXZvbHV0aW9uIHdhcyBhcHByb3ZlZCAqL1xuICBhcHByb3ZlZDogYm9vbGVhbjtcbiAgXG4gIC8qKiBSZWFzb24gZm9yIHJlamVjdGlvbiAoaWYgYXBwbGljYWJsZSkgKi9cbiAgcmVqZWN0aW9uUmVhc29uPzogc3RyaW5nO1xuICBcbiAgLyoqIEtQSSB2aW9sYXRpb25zIChpZiBhbnkpICovXG4gIGtwaVZpb2xhdGlvbnM6IEtQSVZpb2xhdGlvbltdO1xuICBcbiAgLyoqIEJ1ZGdldCB2aW9sYXRpb24gKGlmIGFwcGxpY2FibGUpICovXG4gIGJ1ZGdldFZpb2xhdGlvbj86IEJ1ZGdldFZpb2xhdGlvbjtcbn1cblxuLyoqXG4gKiBLUEkgdmlvbGF0aW9uIHJlY29yZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBLUElWaW9sYXRpb24ge1xuICAvKiogS1BJIHR5cGUgKi9cbiAgdHlwZTogS1BJVHlwZTtcbiAgXG4gIC8qKiBDdXJyZW50IHZhbHVlICovXG4gIGN1cnJlbnRWYWx1ZTogbnVtYmVyO1xuICBcbiAgLyoqIE1pbmltdW0gcmVxdWlyZWQgKi9cbiAgbWluaW11bTogbnVtYmVyO1xuICBcbiAgLyoqIFNldmVyaXR5ICovXG4gIHNldmVyaXR5OiAnd2FybmluZycgfCAnY3JpdGljYWwnO1xufVxuXG4vKipcbiAqIEJ1ZGdldCB2aW9sYXRpb24gcmVjb3JkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEJ1ZGdldFZpb2xhdGlvbiB7XG4gIC8qKiBCdWRnZXQgdHlwZSAqL1xuICB0eXBlOiAndG90YWwnIHwgJ3N0eWxlJztcbiAgXG4gIC8qKiBSZXF1ZXN0ZWQgYW1vdW50ICovXG4gIHJlcXVlc3RlZDogbnVtYmVyO1xuICBcbiAgLyoqIEF2YWlsYWJsZSBhbW91bnQgKi9cbiAgYXZhaWxhYmxlOiBudW1iZXI7XG4gIFxuICAvKiogT3ZlciBieSAqL1xuICBvdmVyQnk6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBQcm9ncmVzc2l2ZSBFdm9sdXRpb24gRnJhbWV3b3JrIGNvbmZpZ3VyYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZvbHV0aW9uRnJhbWV3b3JrQ29uZmlnIHtcbiAgLyoqIEVuYWJsZSBLUEkgdHJhY2tpbmcgKi9cbiAgZW5hYmxlS1BJVHJhY2tpbmc/OiBib29sZWFuO1xuICBcbiAgLyoqIEVuYWJsZSBidWRnZXQgZW5mb3JjZW1lbnQgKi9cbiAgZW5hYmxlQnVkZ2V0RW5mb3JjZW1lbnQ/OiBib29sZWFuO1xuICBcbiAgLyoqIEVuYWJsZSBhdXRvbWF0aWMgcm9sbGJhY2sgKi9cbiAgZW5hYmxlQXV0b1JvbGxiYWNrPzogYm9vbGVhbjtcbiAgXG4gIC8qKiBLUEkgY2hlY2sgaW50ZXJ2YWwgKG1zKSAqL1xuICBrcGlDaGVja0ludGVydmFsTXM/OiBudW1iZXI7XG4gIFxuICAvKiogUm9sbGJhY2sgdGhyZXNob2xkIChjb25zZWN1dGl2ZSB2aW9sYXRpb25zKSAqL1xuICByb2xsYmFja1RocmVzaG9sZD86IG51bWJlcjtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUHJvZ3Jlc3NpdmUgRXZvbHV0aW9uIEZyYW1ld29ya1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFByb2dyZXNzaXZlIEV2b2x1dGlvbiBGcmFtZXdvcmsgLSBNYW5hZ2VzIGNvbnRyb2xsZWQgZXZvbHV0aW9uIHdpdGggS1BJIGd1YXJkcmFpbHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBQcm9ncmVzc2l2ZUV2b2x1dGlvbkZyYW1ld29yayB7XG4gIHByaXZhdGUgY29uZmlnOiBSZXF1aXJlZDxFdm9sdXRpb25GcmFtZXdvcmtDb25maWc+O1xuICBwcml2YXRlIGtwaVRhcmdldHM6IE1hcDxLUElUeXBlLCBLUElUYXJnZXQ+O1xuICBwcml2YXRlIHN0eWxlTG9hZGluZ0tQSTogU3R5bGVMb2FkaW5nS1BJO1xuICBwcml2YXRlIHBlcnNvbmFsaXphdGlvbkJ1ZGdldDogUGVyc29uYWxpemF0aW9uQnVkZ2V0Q29uZmlnO1xuICBwcml2YXRlIHZpb2xhdGlvbkNvdW50OiBudW1iZXI7XG4gIHByaXZhdGUgb25LUElWaW9sYXRpb24/OiAodmlvbGF0aW9uOiBLUElWaW9sYXRpb24pID0+IHZvaWQ7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBFdm9sdXRpb25GcmFtZXdvcmtDb25maWcgPSB7fSkge1xuICAgIHRoaXMuY29uZmlnID0ge1xuICAgICAgZW5hYmxlS1BJVHJhY2tpbmc6IHRydWUsXG4gICAgICBlbmFibGVCdWRnZXRFbmZvcmNlbWVudDogdHJ1ZSxcbiAgICAgIGVuYWJsZUF1dG9Sb2xsYmFjazogdHJ1ZSxcbiAgICAgIGtwaUNoZWNrSW50ZXJ2YWxNczogNjAwMDAsIC8vIDEgbWludXRlXG4gICAgICByb2xsYmFja1RocmVzaG9sZDogMyxcbiAgICAgIC4uLmNvbmZpZyxcbiAgICB9IGFzIFJlcXVpcmVkPEV2b2x1dGlvbkZyYW1ld29ya0NvbmZpZz47XG5cbiAgICAvLyBJbml0aWFsaXplIEtQSSB0YXJnZXRzXG4gICAgdGhpcy5rcGlUYXJnZXRzID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZUtQSVRhcmdldHMoKTtcblxuICAgIC8vIEluaXRpYWxpemUgc3R5bGUgbG9hZGluZyBLUElcbiAgICB0aGlzLnN0eWxlTG9hZGluZ0tQSSA9IHRoaXMuY3JlYXRlU3R5bGVMb2FkaW5nS1BJKCk7XG5cbiAgICAvLyBJbml0aWFsaXplIHBlcnNvbmFsaXphdGlvbiBidWRnZXRcbiAgICB0aGlzLnBlcnNvbmFsaXphdGlvbkJ1ZGdldCA9IHRoaXMuY3JlYXRlRGVmYXVsdEJ1ZGdldCgpO1xuXG4gICAgdGhpcy52aW9sYXRpb25Db3VudCA9IDA7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBkZWZhdWx0IEtQSSB0YXJnZXRzLlxuICAgKi9cbiAgcHJpdmF0ZSBpbml0aWFsaXplS1BJVGFyZ2V0cygpOiB2b2lkIHtcbiAgICAvLyBTdHlsZSBsb2FkaW5nIHN1Y2Nlc3MgcmF0ZSAoVjEuNS4wIHRhcmdldDogPjk5JSlcbiAgICB0aGlzLmtwaVRhcmdldHMuc2V0KCdzdHlsZV9sb2FkaW5nX3N1Y2Nlc3NfcmF0ZScsIHtcbiAgICAgIHR5cGU6ICdzdHlsZV9sb2FkaW5nX3N1Y2Nlc3NfcmF0ZScsXG4gICAgICB0YXJnZXQ6IDk5LjUsXG4gICAgICBtaW5pbXVtOiA5OS4wLFxuICAgICAgY3VycmVudDogMTAwLjAsXG4gICAgICB0cmVuZDogMCxcbiAgICAgIGxhc3RVcGRhdGVkOiBEYXRlLm5vdygpLFxuICAgIH0pO1xuXG4gICAgLy8gQ29udHJhY3QgY2hhbmdlIHN1Y2Nlc3MgcmF0ZVxuICAgIHRoaXMua3BpVGFyZ2V0cy5zZXQoJ2NvbnRyYWN0X2NoYW5nZV9zdWNjZXNzX3JhdGUnLCB7XG4gICAgICB0eXBlOiAnY29udHJhY3RfY2hhbmdlX3N1Y2Nlc3NfcmF0ZScsXG4gICAgICB0YXJnZXQ6IDk1LjAsXG4gICAgICBtaW5pbXVtOiA5MC4wLFxuICAgICAgY3VycmVudDogMTAwLjAsXG4gICAgICB0cmVuZDogMCxcbiAgICAgIGxhc3RVcGRhdGVkOiBEYXRlLm5vdygpLFxuICAgIH0pO1xuXG4gICAgLy8gUm9sZSBhc3NpZ25tZW50IGVmZmljaWVuY3lcbiAgICB0aGlzLmtwaVRhcmdldHMuc2V0KCdyb2xlX2Fzc2lnbm1lbnRfZWZmaWNpZW5jeScsIHtcbiAgICAgIHR5cGU6ICdyb2xlX2Fzc2lnbm1lbnRfZWZmaWNpZW5jeScsXG4gICAgICB0YXJnZXQ6IDg1LjAsXG4gICAgICBtaW5pbXVtOiA3NS4wLFxuICAgICAgY3VycmVudDogMTAwLjAsXG4gICAgICB0cmVuZDogMCxcbiAgICAgIGxhc3RVcGRhdGVkOiBEYXRlLm5vdygpLFxuICAgIH0pO1xuXG4gICAgLy8gVG9rZW4gYnVkZ2V0IGNvbXBsaWFuY2VcbiAgICB0aGlzLmtwaVRhcmdldHMuc2V0KCd0b2tlbl9idWRnZXRfY29tcGxpYW5jZScsIHtcbiAgICAgIHR5cGU6ICd0b2tlbl9idWRnZXRfY29tcGxpYW5jZScsXG4gICAgICB0YXJnZXQ6IDEwMC4wLFxuICAgICAgbWluaW11bTogOTUuMCxcbiAgICAgIGN1cnJlbnQ6IDEwMC4wLFxuICAgICAgdHJlbmQ6IDAsXG4gICAgICBsYXN0VXBkYXRlZDogRGF0ZS5ub3coKSxcbiAgICB9KTtcblxuICAgIC8vIERlcGxveW1lbnQgc3VjY2VzcyByYXRlXG4gICAgdGhpcy5rcGlUYXJnZXRzLnNldCgnZGVwbG95bWVudF9zdWNjZXNzX3JhdGUnLCB7XG4gICAgICB0eXBlOiAnZGVwbG95bWVudF9zdWNjZXNzX3JhdGUnLFxuICAgICAgdGFyZ2V0OiA5OC4wLFxuICAgICAgbWluaW11bTogOTUuMCxcbiAgICAgIGN1cnJlbnQ6IDEwMC4wLFxuICAgICAgdHJlbmQ6IDAsXG4gICAgICBsYXN0VXBkYXRlZDogRGF0ZS5ub3coKSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgc3R5bGUgbG9hZGluZyBLUEkuXG4gICAqL1xuICBwcml2YXRlIGNyZWF0ZVN0eWxlTG9hZGluZ0tQSSgpOiBTdHlsZUxvYWRpbmdLUEkge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnc3R5bGVfbG9hZGluZ19zdWNjZXNzX3JhdGUnLFxuICAgICAgdGFyZ2V0OiA5OS41LFxuICAgICAgbWluaW11bTogOTkuMCxcbiAgICAgIGN1cnJlbnQ6IDEwMC4wLFxuICAgICAgdHJlbmQ6IDAsXG4gICAgICBsYXN0VXBkYXRlZDogRGF0ZS5ub3coKSxcbiAgICAgIHRvdGFsQXR0ZW1wdHM6IDAsXG4gICAgICBzdWNjZXNzZnVsTG9hZHM6IDAsXG4gICAgICBmYWlsZWRMb2FkczogMCxcbiAgICAgIGF2Z0xvYWRUaW1lTXM6IDAsXG4gICAgICBwOTlMb2FkVGltZU1zOiAwLFxuICAgICAgZm91Y0luY2lkZW50czogMCxcbiAgICAgIGNyaXRpY2FsQ1NTSW5saW5pbmdSYXRlOiAxMDAuMCxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBkZWZhdWx0IHBlcnNvbmFsaXphdGlvbiBidWRnZXQuXG4gICAqL1xuICBwcml2YXRlIGNyZWF0ZURlZmF1bHRCdWRnZXQoKTogUGVyc29uYWxpemF0aW9uQnVkZ2V0Q29uZmlnIHtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgIHJldHVybiB7XG4gICAgICB0b3RhbEJ1ZGdldDogMTAwMDAwMCwgLy8gMU0gdG9rZW5zXG4gICAgICB1c2VkQnVkZ2V0OiAwLFxuICAgICAgc3R5bGVCdWRnZXQ6IDEwMDAwMCwgLy8gMTAwSyB0b2tlbnMgZm9yIHN0eWxlcyAoMTAlKVxuICAgICAgdXNlZFN0eWxlQnVkZ2V0OiAwLFxuICAgICAgcGVyaW9kTXM6IDg2NDAwMDAwLCAvLyAyNCBob3Vyc1xuICAgICAgcmVzZXRBdDogbm93ICsgODY0MDAwMDAsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmQgc3R5bGUgbG9hZCBhdHRlbXB0LlxuICAgKi9cbiAgcmVjb3JkU3R5bGVMb2FkKHN1Y2Nlc3M6IGJvb2xlYW4sIGxvYWRUaW1lTXM6IG51bWJlciwgaXNDcml0aWNhbENTUzogYm9vbGVhbiA9IGZhbHNlKTogdm9pZCB7XG4gICAgdGhpcy5zdHlsZUxvYWRpbmdLUEkudG90YWxBdHRlbXB0cysrO1xuICAgIFxuICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICB0aGlzLnN0eWxlTG9hZGluZ0tQSS5zdWNjZXNzZnVsTG9hZHMrKztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdHlsZUxvYWRpbmdLUEkuZmFpbGVkTG9hZHMrKztcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgYXZlcmFnZSBsb2FkIHRpbWVcbiAgICBjb25zdCB0b3RhbExvYWRzID0gdGhpcy5zdHlsZUxvYWRpbmdLUEkuc3VjY2Vzc2Z1bExvYWRzICsgdGhpcy5zdHlsZUxvYWRpbmdLUEkuZmFpbGVkTG9hZHM7XG4gICAgdGhpcy5zdHlsZUxvYWRpbmdLUEkuYXZnTG9hZFRpbWVNcyA9IFxuICAgICAgKHRoaXMuc3R5bGVMb2FkaW5nS1BJLmF2Z0xvYWRUaW1lTXMgKiAodG90YWxMb2FkcyAtIDEpICsgbG9hZFRpbWVNcykgLyB0b3RhbExvYWRzO1xuXG4gICAgLy8gVXBkYXRlIFA5OSAoc2ltcGxpZmllZClcbiAgICBpZiAobG9hZFRpbWVNcyA+IHRoaXMuc3R5bGVMb2FkaW5nS1BJLnA5OUxvYWRUaW1lTXMpIHtcbiAgICAgIHRoaXMuc3R5bGVMb2FkaW5nS1BJLnA5OUxvYWRUaW1lTXMgPSBsb2FkVGltZU1zO1xuICAgIH1cblxuICAgIC8vIFRyYWNrIEZPVUMgaW5jaWRlbnRzXG4gICAgaWYgKCFzdWNjZXNzICYmIGlzQ3JpdGljYWxDU1MpIHtcbiAgICAgIHRoaXMuc3R5bGVMb2FkaW5nS1BJLmZvdWNJbmNpZGVudHMrKztcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgc3VjY2VzcyByYXRlXG4gICAgdGhpcy5zdHlsZUxvYWRpbmdLUEkuY3VycmVudCA9IFxuICAgICAgKHRoaXMuc3R5bGVMb2FkaW5nS1BJLnN1Y2Nlc3NmdWxMb2FkcyAvIHRoaXMuc3R5bGVMb2FkaW5nS1BJLnRvdGFsQXR0ZW1wdHMpICogMTAwO1xuXG4gICAgLy8gVXBkYXRlIGNyaXRpY2FsIENTUyBpbmxpbmluZyByYXRlXG4gICAgaWYgKGlzQ3JpdGljYWxDU1MpIHtcbiAgICAgIGNvbnN0IHRvdGFsQ3JpdGljYWwgPSB0aGlzLnN0eWxlTG9hZGluZ0tQSS50b3RhbEF0dGVtcHRzOyAvLyBTaW1wbGlmaWVkXG4gICAgICBjb25zdCBzdWNjZXNzZnVsQ3JpdGljYWwgPSBzdWNjZXNzID8gdGhpcy5zdHlsZUxvYWRpbmdLUEkuc3VjY2Vzc2Z1bExvYWRzIDogdGhpcy5zdHlsZUxvYWRpbmdLUEkuc3VjY2Vzc2Z1bExvYWRzIC0gMTtcbiAgICAgIHRoaXMuc3R5bGVMb2FkaW5nS1BJLmNyaXRpY2FsQ1NTSW5saW5pbmdSYXRlID0gXG4gICAgICAgIHRvdGFsQ3JpdGljYWwgPiAwID8gKHN1Y2Nlc3NmdWxDcml0aWNhbCAvIHRvdGFsQ3JpdGljYWwpICogMTAwIDogMTAwO1xuICAgIH1cblxuICAgIHRoaXMuc3R5bGVMb2FkaW5nS1BJLmxhc3RVcGRhdGVkID0gRGF0ZS5ub3coKTtcblxuICAgIC8vIFVwZGF0ZSBtYWluIEtQSSB0YXJnZXRcbiAgICBjb25zdCBrcGlUYXJnZXQgPSB0aGlzLmtwaVRhcmdldHMuZ2V0KCdzdHlsZV9sb2FkaW5nX3N1Y2Nlc3NfcmF0ZScpO1xuICAgIGlmIChrcGlUYXJnZXQpIHtcbiAgICAgIGtwaVRhcmdldC5jdXJyZW50ID0gdGhpcy5zdHlsZUxvYWRpbmdLUEkuY3VycmVudDtcbiAgICAgIGtwaVRhcmdldC5sYXN0VXBkYXRlZCA9IERhdGUubm93KCk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIEtQSSB2aW9sYXRpb25cbiAgICB0aGlzLmNoZWNrS1BJVmlvbGF0aW9uKCdzdHlsZV9sb2FkaW5nX3N1Y2Nlc3NfcmF0ZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGZvciBLUEkgdmlvbGF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBjaGVja0tQSVZpb2xhdGlvbihrcGlUeXBlOiBLUElUeXBlKTogS1BJVmlvbGF0aW9uIHwgbnVsbCB7XG4gICAgY29uc3Qga3BpID0gdGhpcy5rcGlUYXJnZXRzLmdldChrcGlUeXBlKTtcbiAgICBpZiAoIWtwaSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGtwaS5jdXJyZW50IDwga3BpLm1pbmltdW0pIHtcbiAgICAgIGNvbnN0IHZpb2xhdGlvbjogS1BJVmlvbGF0aW9uID0ge1xuICAgICAgICB0eXBlOiBrcGlUeXBlLFxuICAgICAgICBjdXJyZW50VmFsdWU6IGtwaS5jdXJyZW50LFxuICAgICAgICBtaW5pbXVtOiBrcGkubWluaW11bSxcbiAgICAgICAgc2V2ZXJpdHk6IGtwaS5jdXJyZW50IDwgKGtwaS5taW5pbXVtICogMC45KSA/ICdjcml0aWNhbCcgOiAnd2FybmluZycsXG4gICAgICB9O1xuXG4gICAgICB0aGlzLnZpb2xhdGlvbkNvdW50Kys7XG4gICAgICBjb25zb2xlLmxvZyhg4pqg77iPICBLUEkgVmlvbGF0aW9uOiAke2twaVR5cGV9ID0gJHtrcGkuY3VycmVudC50b0ZpeGVkKDIpfSUgKG1pbmltdW06ICR7a3BpLm1pbmltdW19JSlgKTtcblxuICAgICAgLy8gVHJpZ2dlciBjYWxsYmFja1xuICAgICAgaWYgKHRoaXMub25LUElWaW9sYXRpb24pIHtcbiAgICAgICAgdGhpcy5vbktQSVZpb2xhdGlvbih2aW9sYXRpb24pO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBmb3IgYXV0b21hdGljIHJvbGxiYWNrXG4gICAgICBpZiAodGhpcy5jb25maWcuZW5hYmxlQXV0b1JvbGxiYWNrICYmIHRoaXMudmlvbGF0aW9uQ291bnQgPj0gdGhpcy5jb25maWcucm9sbGJhY2tUaHJlc2hvbGQpIHtcbiAgICAgICAgY29uc29sZS5sb2coYPCflIQgQXV0b21hdGljIHJvbGxiYWNrIHRyaWdnZXJlZDogJHt0aGlzLnZpb2xhdGlvbkNvdW50fSBjb25zZWN1dGl2ZSB2aW9sYXRpb25zYCk7XG4gICAgICAgIHRoaXMudHJpZ2dlclJvbGxiYWNrKHZpb2xhdGlvbik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2aW9sYXRpb247XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRXZhbHVhdGUgZXZvbHV0aW9uIHByb3Bvc2FsLlxuICAgKi9cbiAgYXN5bmMgZXZhbHVhdGVQcm9wb3NhbChwcm9wb3NhbDogRXZvbHV0aW9uUHJvcG9zYWwpOiBQcm9taXNlPEV2b2x1dGlvblJlc3VsdD4ge1xuICAgIGNvbnN0IGtwaVZpb2xhdGlvbnM6IEtQSVZpb2xhdGlvbltdID0gW107XG4gICAgbGV0IGJ1ZGdldFZpb2xhdGlvbjogQnVkZ2V0VmlvbGF0aW9uIHwgdW5kZWZpbmVkO1xuXG4gICAgLy8gQ2hlY2sgS1BJIGltcGFjdFxuICAgIGZvciAoY29uc3QgW2twaVR5cGUsIGltcGFjdF0gb2YgT2JqZWN0LmVudHJpZXMocHJvcG9zYWwua3BpSW1wYWN0KSkge1xuICAgICAgY29uc3Qga3BpID0gdGhpcy5rcGlUYXJnZXRzLmdldChrcGlUeXBlIGFzIEtQSVR5cGUpO1xuICAgICAgaWYgKGtwaSAmJiBpbXBhY3QgPCAwKSB7XG4gICAgICAgIGNvbnN0IHByb2plY3RlZFZhbHVlID0ga3BpLmN1cnJlbnQgKyBpbXBhY3Q7XG4gICAgICAgIGlmIChwcm9qZWN0ZWRWYWx1ZSA8IGtwaS5taW5pbXVtKSB7XG4gICAgICAgICAga3BpVmlvbGF0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGU6IGtwaVR5cGUgYXMgS1BJVHlwZSxcbiAgICAgICAgICAgIGN1cnJlbnRWYWx1ZTogcHJvamVjdGVkVmFsdWUsXG4gICAgICAgICAgICBtaW5pbXVtOiBrcGkubWluaW11bSxcbiAgICAgICAgICAgIHNldmVyaXR5OiBwcm9qZWN0ZWRWYWx1ZSA8IChrcGkubWluaW11bSAqIDAuOSkgPyAnY3JpdGljYWwnIDogJ3dhcm5pbmcnLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgYnVkZ2V0XG4gICAgaWYgKHRoaXMuY29uZmlnLmVuYWJsZUJ1ZGdldEVuZm9yY2VtZW50KSB7XG4gICAgICBidWRnZXRWaW9sYXRpb24gPSB0aGlzLmNoZWNrQnVkZ2V0KHByb3Bvc2FsLmJ1ZGdldEltcGFjdCk7XG4gICAgfVxuXG4gICAgLy8gRGV0ZXJtaW5lIGFwcHJvdmFsXG4gICAgY29uc3QgYXBwcm92ZWQgPSBrcGlWaW9sYXRpb25zLmxlbmd0aCA9PT0gMCAmJiAhYnVkZ2V0VmlvbGF0aW9uO1xuXG4gICAgY29uc3QgcmVzdWx0OiBFdm9sdXRpb25SZXN1bHQgPSB7XG4gICAgICBhcHByb3ZlZCxcbiAgICAgIGtwaVZpb2xhdGlvbnMsXG4gICAgICBidWRnZXRWaW9sYXRpb24sXG4gICAgfTtcblxuICAgIGlmICghYXBwcm92ZWQpIHtcbiAgICAgIGlmIChrcGlWaW9sYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmVzdWx0LnJlamVjdGlvblJlYXNvbiA9IGBLUEkgdmlvbGF0aW9uczogJHtrcGlWaW9sYXRpb25zLm1hcCh2ID0+IGAke3YudHlwZX09JHt2LmN1cnJlbnRWYWx1ZS50b0ZpeGVkKDIpfSVgKS5qb2luKCcsICcpfWA7XG4gICAgICB9IGVsc2UgaWYgKGJ1ZGdldFZpb2xhdGlvbikge1xuICAgICAgICByZXN1bHQucmVqZWN0aW9uUmVhc29uID0gYEJ1ZGdldCBleGNlZWRlZDogcmVxdWVzdGVkICR7YnVkZ2V0VmlvbGF0aW9uLnJlcXVlc3RlZH0sIGF2YWlsYWJsZSAke2J1ZGdldFZpb2xhdGlvbi5hdmFpbGFibGV9YDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGJ1ZGdldCBmb3IgZXZvbHV0aW9uIHByb3Bvc2FsLlxuICAgKi9cbiAgcHJpdmF0ZSBjaGVja0J1ZGdldChyZXF1ZXN0ZWRBbW91bnQ6IG51bWJlcik6IEJ1ZGdldFZpb2xhdGlvbiB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcblxuICAgIC8vIFJlc2V0IGJ1ZGdldCBpZiBwZXJpb2QgZXhwaXJlZFxuICAgIGlmIChub3cgPj0gdGhpcy5wZXJzb25hbGl6YXRpb25CdWRnZXQucmVzZXRBdCkge1xuICAgICAgdGhpcy5wZXJzb25hbGl6YXRpb25CdWRnZXQudXNlZEJ1ZGdldCA9IDA7XG4gICAgICB0aGlzLnBlcnNvbmFsaXphdGlvbkJ1ZGdldC51c2VkU3R5bGVCdWRnZXQgPSAwO1xuICAgICAgdGhpcy5wZXJzb25hbGl6YXRpb25CdWRnZXQucmVzZXRBdCA9IG5vdyArIHRoaXMucGVyc29uYWxpemF0aW9uQnVkZ2V0LnBlcmlvZE1zO1xuICAgIH1cblxuICAgIC8vIENoZWNrIHRvdGFsIGJ1ZGdldFxuICAgIGlmICh0aGlzLnBlcnNvbmFsaXphdGlvbkJ1ZGdldC51c2VkQnVkZ2V0ICsgcmVxdWVzdGVkQW1vdW50ID4gdGhpcy5wZXJzb25hbGl6YXRpb25CdWRnZXQudG90YWxCdWRnZXQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICd0b3RhbCcsXG4gICAgICAgIHJlcXVlc3RlZDogcmVxdWVzdGVkQW1vdW50LFxuICAgICAgICBhdmFpbGFibGU6IHRoaXMucGVyc29uYWxpemF0aW9uQnVkZ2V0LnRvdGFsQnVkZ2V0IC0gdGhpcy5wZXJzb25hbGl6YXRpb25CdWRnZXQudXNlZEJ1ZGdldCxcbiAgICAgICAgb3ZlckJ5OiAodGhpcy5wZXJzb25hbGl6YXRpb25CdWRnZXQudXNlZEJ1ZGdldCArIHJlcXVlc3RlZEFtb3VudCkgLSB0aGlzLnBlcnNvbmFsaXphdGlvbkJ1ZGdldC50b3RhbEJ1ZGdldCxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgc3R5bGUgYnVkZ2V0IChpZiB0aGlzIGlzIGEgc3R5bGUtcmVsYXRlZCBjaGFuZ2UpXG4gICAgY29uc3QgaXNTdHlsZVJlbGF0ZWQgPSByZXF1ZXN0ZWRBbW91bnQgPD0gdGhpcy5wZXJzb25hbGl6YXRpb25CdWRnZXQuc3R5bGVCdWRnZXQ7XG4gICAgaWYgKCFpc1N0eWxlUmVsYXRlZCAmJiByZXF1ZXN0ZWRBbW91bnQgPiB0aGlzLnBlcnNvbmFsaXphdGlvbkJ1ZGdldC5zdHlsZUJ1ZGdldCkge1xuICAgICAgaWYgKHRoaXMucGVyc29uYWxpemF0aW9uQnVkZ2V0LnVzZWRTdHlsZUJ1ZGdldCArIHJlcXVlc3RlZEFtb3VudCA+IHRoaXMucGVyc29uYWxpemF0aW9uQnVkZ2V0LnN0eWxlQnVkZ2V0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdHlwZTogJ3N0eWxlJyxcbiAgICAgICAgICByZXF1ZXN0ZWQ6IHJlcXVlc3RlZEFtb3VudCxcbiAgICAgICAgICBhdmFpbGFibGU6IHRoaXMucGVyc29uYWxpemF0aW9uQnVkZ2V0LnN0eWxlQnVkZ2V0IC0gdGhpcy5wZXJzb25hbGl6YXRpb25CdWRnZXQudXNlZFN0eWxlQnVkZ2V0LFxuICAgICAgICAgIG92ZXJCeTogKHRoaXMucGVyc29uYWxpemF0aW9uQnVkZ2V0LnVzZWRTdHlsZUJ1ZGdldCArIHJlcXVlc3RlZEFtb3VudCkgLSB0aGlzLnBlcnNvbmFsaXphdGlvbkJ1ZGdldC5zdHlsZUJ1ZGdldCxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyaWdnZXIgYXV0b21hdGljIHJvbGxiYWNrLlxuICAgKi9cbiAgcHJpdmF0ZSB0cmlnZ2VyUm9sbGJhY2sodmlvbGF0aW9uOiBLUElWaW9sYXRpb24pOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZyhg8J+aqCBST0xMQkFDSyBUUklHR0VSRUQ6ICR7dmlvbGF0aW9uLnR5cGV9IHZpb2xhdGlvbiAoc2V2ZXJpdHk6ICR7dmlvbGF0aW9uLnNldmVyaXR5fSlgKTtcbiAgICBcbiAgICAvLyBSZXNldCB2aW9sYXRpb24gY291bnRcbiAgICB0aGlzLnZpb2xhdGlvbkNvdW50ID0gMDtcblxuICAgIC8vIEluIHByb2R1Y3Rpb24sIHRoaXMgd291bGQgdHJpZ2dlciBhY3R1YWwgcm9sbGJhY2sgbG9naWNcbiAgICAvLyBGb3Igbm93LCBqdXN0IGxvZyB0aGUgZXZlbnRcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY3VycmVudCBLUEkgc3RhdHVzLlxuICAgKi9cbiAgZ2V0S1BJU3RhdHVzKGtwaVR5cGU6IEtQSVR5cGUpOiBLUElUYXJnZXQgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5rcGlUYXJnZXRzLmdldChrcGlUeXBlKSB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBzdHlsZSBsb2FkaW5nIEtQSSBkZXRhaWxzLlxuICAgKi9cbiAgZ2V0U3R5bGVMb2FkaW5nS1BJKCk6IFN0eWxlTG9hZGluZ0tQSSB7XG4gICAgcmV0dXJuIHsgLi4udGhpcy5zdHlsZUxvYWRpbmdLUEkgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIEtQSXMuXG4gICAqL1xuICBnZXRBbGxLUElzKCk6IE1hcDxLUElUeXBlLCBLUElUYXJnZXQ+IHtcbiAgICByZXR1cm4gbmV3IE1hcCh0aGlzLmtwaVRhcmdldHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBidWRnZXQgc3RhdHVzLlxuICAgKi9cbiAgZ2V0QnVkZ2V0U3RhdHVzKCk6IFBlcnNvbmFsaXphdGlvbkJ1ZGdldENvbmZpZyB7XG4gICAgcmV0dXJuIHsgLi4udGhpcy5wZXJzb25hbGl6YXRpb25CdWRnZXQgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGUgYnVkZ2V0IHVzYWdlLlxuICAgKi9cbiAgdXBkYXRlQnVkZ2V0VXNhZ2UoYW1vdW50OiBudW1iZXIsIGlzU3R5bGVSZWxhdGVkOiBib29sZWFuID0gZmFsc2UpOiB2b2lkIHtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuXG4gICAgLy8gUmVzZXQgaWYgcGVyaW9kIGV4cGlyZWRcbiAgICBpZiAobm93ID49IHRoaXMucGVyc29uYWxpemF0aW9uQnVkZ2V0LnJlc2V0QXQpIHtcbiAgICAgIHRoaXMucGVyc29uYWxpemF0aW9uQnVkZ2V0LnVzZWRCdWRnZXQgPSAwO1xuICAgICAgdGhpcy5wZXJzb25hbGl6YXRpb25CdWRnZXQudXNlZFN0eWxlQnVkZ2V0ID0gMDtcbiAgICAgIHRoaXMucGVyc29uYWxpemF0aW9uQnVkZ2V0LnJlc2V0QXQgPSBub3cgKyB0aGlzLnBlcnNvbmFsaXphdGlvbkJ1ZGdldC5wZXJpb2RNcztcbiAgICB9XG5cbiAgICB0aGlzLnBlcnNvbmFsaXphdGlvbkJ1ZGdldC51c2VkQnVkZ2V0ICs9IGFtb3VudDtcbiAgICBcbiAgICBpZiAoaXNTdHlsZVJlbGF0ZWQpIHtcbiAgICAgIHRoaXMucGVyc29uYWxpemF0aW9uQnVkZ2V0LnVzZWRTdHlsZUJ1ZGdldCArPSBhbW91bnQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldCBLUEkgdmlvbGF0aW9uIGNhbGxiYWNrLlxuICAgKi9cbiAgb25LUElWaW9sYXRpb25DYWxsYmFjayhjYWxsYmFjazogKHZpb2xhdGlvbjogS1BJVmlvbGF0aW9uKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5vbktQSVZpb2xhdGlvbiA9IGNhbGxiYWNrO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0IHZpb2xhdGlvbiBjb3VudC5cbiAgICovXG4gIHJlc2V0VmlvbGF0aW9uQ291bnQoKTogdm9pZCB7XG4gICAgdGhpcy52aW9sYXRpb25Db3VudCA9IDA7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGZyYW1ld29yayBoZWFsdGggc3RhdHVzLlxuICAgKi9cbiAgZ2V0SGVhbHRoU3RhdHVzKCk6IHtcbiAgICBoZWFsdGh5OiBib29sZWFuO1xuICAgIGtwaVN0YXR1czogJ2hlYWx0aHknIHwgJ3dhcm5pbmcnIHwgJ2NyaXRpY2FsJztcbiAgICBidWRnZXRTdGF0dXM6ICdoZWFsdGh5JyB8ICd3YXJuaW5nJyB8ICdjcml0aWNhbCc7XG4gICAgdmlvbGF0aW9uczogbnVtYmVyO1xuICB9IHtcbiAgICBsZXQga3BpU3RhdHVzOiAnaGVhbHRoeScgfCAnd2FybmluZycgfCAnY3JpdGljYWwnID0gJ2hlYWx0aHknO1xuICAgIGxldCBidWRnZXRTdGF0dXM6ICdoZWFsdGh5JyB8ICd3YXJuaW5nJyB8ICdjcml0aWNhbCcgPSAnaGVhbHRoeSc7XG5cbiAgICAvLyBDaGVjayBLUElzXG4gICAgZm9yIChjb25zdCBrcGkgb2YgdGhpcy5rcGlUYXJnZXRzLnZhbHVlcygpKSB7XG4gICAgICBpZiAoa3BpLmN1cnJlbnQgPCBrcGkubWluaW11bSkge1xuICAgICAgICBrcGlTdGF0dXMgPSAnY3JpdGljYWwnO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSBpZiAoa3BpLmN1cnJlbnQgPCBrcGkudGFyZ2V0KSB7XG4gICAgICAgIGtwaVN0YXR1cyA9ICd3YXJuaW5nJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBidWRnZXRcbiAgICBjb25zdCBidWRnZXRVc2FnZVBlcmNlbnQgPSAodGhpcy5wZXJzb25hbGl6YXRpb25CdWRnZXQudXNlZEJ1ZGdldCAvIHRoaXMucGVyc29uYWxpemF0aW9uQnVkZ2V0LnRvdGFsQnVkZ2V0KSAqIDEwMDtcbiAgICBpZiAoYnVkZ2V0VXNhZ2VQZXJjZW50ID49IDEwMCkge1xuICAgICAgYnVkZ2V0U3RhdHVzID0gJ2NyaXRpY2FsJztcbiAgICB9IGVsc2UgaWYgKGJ1ZGdldFVzYWdlUGVyY2VudCA+PSA4MCkge1xuICAgICAgYnVkZ2V0U3RhdHVzID0gJ3dhcm5pbmcnO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBoZWFsdGh5OiBrcGlTdGF0dXMgPT09ICdoZWFsdGh5JyAmJiBidWRnZXRTdGF0dXMgPT09ICdoZWFsdGh5JyAmJiB0aGlzLnZpb2xhdGlvbkNvdW50ID09PSAwLFxuICAgICAga3BpU3RhdHVzLFxuICAgICAgYnVkZ2V0U3RhdHVzLFxuICAgICAgdmlvbGF0aW9uczogdGhpcy52aW9sYXRpb25Db3VudCxcbiAgICB9O1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZhY3RvcnkgRnVuY3Rpb25zXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ3JlYXRlIHByb2dyZXNzaXZlIGV2b2x1dGlvbiBmcmFtZXdvcmsuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm9ncmVzc2l2ZUV2b2x1dGlvbkZyYW1ld29yayhcbiAgY29uZmlnPzogRXZvbHV0aW9uRnJhbWV3b3JrQ29uZmlnXG4pOiBQcm9ncmVzc2l2ZUV2b2x1dGlvbkZyYW1ld29yayB7XG4gIHJldHVybiBuZXcgUHJvZ3Jlc3NpdmVFdm9sdXRpb25GcmFtZXdvcmsoY29uZmlnKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhwb3J0c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgZGVmYXVsdCBQcm9ncmVzc2l2ZUV2b2x1dGlvbkZyYW1ld29yaztcbiJdfQ==