"use strict";
/**
 * ANFSF V1.5.0 - Governance Harness
 *
 * Responsible for Ownership Lattice, Policy Version Manager, and Canary Deployment.
 * Phase 1 of Layer 8.5 decomposition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceHarness = void 0;
exports.getDefaultHarness = getDefaultHarness;
exports.resetDefaultHarness = resetDefaultHarness;
const DEFAULT_CONFIG = {
    enableVetoCheck: true,
    enableOwnershipProof: true,
    enableCanaryDeployment: true,
    canaryStages: [0.01, 0.05, 0.2, 0.5, 1.0],
    rollbackOnFailure: true,
};
/**
 * Governance Harness - manages ownership, veto, and deployment governance.
 */
class GovernanceHarness {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.policyVersions = new Map();
        // VetoEnforcer will be injected or lazily initialized
        this.vetoEnforcer = null;
    }
    /**
     * Set veto enforcer instance.
     */
    setVetoEnforcer(enforcer) {
        this.vetoEnforcer = enforcer;
    }
    /**
     * Check veto rules for changes.
     */
    async checkVeto(changes, approvals) {
        if (!this.config.enableVetoCheck || !this.vetoEnforcer) {
            return { passed: true, reason: 'Veto check disabled' };
        }
        try {
            const result = this.vetoEnforcer.enforce(changes, approvals);
            return {
                passed: result.passed,
                reason: result.reason,
                requiredRole: result.requiredRole,
            };
        }
        catch (error) {
            return {
                passed: false,
                reason: `Veto check failed: ${error}`,
            };
        }
    }
    /**
     * Generate ownership proofs for resources.
     */
    async generateOwnershipProof(resources, roles) {
        if (!this.config.enableOwnershipProof) {
            return {
                valid: true,
                proofs: [],
                invalidCount: 0,
            };
        }
        // Lazy import to avoid circular dependency
        const { generateOwnershipProof, DEFAULT_OWNERSHIP_RULES } = await Promise.resolve().then(() => __importStar(require('../core/synthesizer/ownership/proof-generator')));
        try {
            const proofs = generateOwnershipProof(resources, roles, DEFAULT_OWNERSHIP_RULES || []);
            return {
                valid: proofs.length > 0,
                proofs,
                invalidCount: 0,
            };
        }
        catch (error) {
            return {
                valid: false,
                proofs: [],
                invalidCount: resources.length,
            };
        }
    }
    /**
     * Register policy version.
     */
    registerPolicyVersion(policyId, policy) {
        if (!this.policyVersions.has(policyId)) {
            this.policyVersions.set(policyId, []);
        }
        this.policyVersions.get(policyId).push(policy);
    }
    /**
     * Get latest policy version.
     */
    getLatestPolicy(policyId) {
        const versions = this.policyVersions.get(policyId);
        if (!versions || versions.length === 0) {
            return null;
        }
        return versions[versions.length - 1];
    }
    /**
     * Execute canary deployment.
     */
    async executeCanaryDeployment(policy, metricsCollector, healthCheck) {
        if (!this.config.enableCanaryDeployment) {
            return {
                deploymentId: 'disabled',
                status: 'complete',
                currentStage: 0,
                trafficPercentage: 0,
            };
        }
        // Lazy import to avoid circular dependency
        const { CanaryDeployer } = await Promise.resolve().then(() => __importStar(require('./canary-deployer')));
        const deployer = new CanaryDeployer({
            stages: this.config.canaryStages,
            rollbackOnFailure: this.config.rollbackOnFailure,
        });
        try {
            const result = await deployer.deploy(policy, metricsCollector, healthCheck);
            return {
                deploymentId: result.deploymentId,
                status: result.status,
                currentStage: result.currentStage || 0,
                trafficPercentage: result.trafficPercentage || 0,
                rollbackInfo: result.rollbackInfo ? {
                    triggered: result.rollbackInfo.triggered,
                    reason: result.rollbackInfo.reason || 'Unknown',
                    timestamp: result.rollbackInfo.timestamp || Date.now(),
                } : undefined,
            };
        }
        catch (error) {
            return {
                deploymentId: 'failed',
                status: 'failed',
                currentStage: 0,
                trafficPercentage: 0,
                rollbackInfo: {
                    triggered: true,
                    reason: String(error),
                    timestamp: Date.now(),
                },
            };
        }
    }
    /**
     * Get harness metrics.
     */
    getMetrics() {
        return {
            policyCount: this.policyVersions.size,
            vetoCheckEnabled: this.config.enableVetoCheck,
            canaryEnabled: this.config.enableCanaryDeployment,
        };
    }
    /**
     * Cleanup resources.
     */
    dispose() {
        this.policyVersions.clear();
        this.vetoEnforcer = null;
    }
}
exports.GovernanceHarness = GovernanceHarness;
/**
 * Singleton harness instance.
 */
let defaultHarness = null;
function getDefaultHarness() {
    if (!defaultHarness) {
        defaultHarness = new GovernanceHarness();
    }
    return defaultHarness;
}
function resetDefaultHarness() {
    defaultHarness = null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ292ZXJuYW5jZS1oYXJuZXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2hhcm5lc3MvZ292ZXJuYW5jZS1oYXJuZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBc09ILDhDQUtDO0FBRUQsa0RBRUM7QUFsT0QsTUFBTSxjQUFjLEdBQXFCO0lBQ3ZDLGVBQWUsRUFBRSxJQUFJO0lBQ3JCLG9CQUFvQixFQUFFLElBQUk7SUFDMUIsc0JBQXNCLEVBQUUsSUFBSTtJQUM1QixZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO0lBQ3pDLGlCQUFpQixFQUFFLElBQUk7Q0FDeEIsQ0FBQztBQTBCRjs7R0FFRztBQUNILE1BQWEsaUJBQWlCO0lBSzVCLFlBQVksU0FBb0MsRUFBRTtRQUNoRCxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBRyxjQUFjLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQztRQUMvQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFDaEMsc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO0lBQzNCLENBQUM7SUFFRDs7T0FFRztJQUNILGVBQWUsQ0FBQyxRQUFhO1FBQzNCLElBQUksQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDO0lBQy9CLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxTQUFTLENBQ2IsT0FBYyxFQUNkLFNBQWdCO1FBRWhCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN2RCxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUs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O2FBQ0YsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxVQUFVO1FBS1IsT0FBTztZQUNMLFdBQVcsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUk7WUFDckMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlO1lBQzdDLGFBQWEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLHNCQUFzQjtTQUNsRCxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTztRQUNMLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7SUFDM0IsQ0FBQztDQUNGO0FBL0tELDhDQStLQztBQUVEOztHQUVHO0FBQ0gsSUFBSSxjQUFjLEdBQTZCLElBQUksQ0FBQztBQUVwRCxTQUFnQixpQkFBaUI7SUFDL0IsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3BCLGNBQWMsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7SUFDM0MsQ0FBQztJQUNELE9BQU8sY0FBYyxDQUFDO0FBQ3hCLENBQUM7QUFFRCxTQUFnQixtQkFBbUI7SUFDakMsY0FBYyxHQUFHLElBQUksQ0FBQztBQUN4QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBTkZTRiBWMS41LjAgLSBHb3Zlcm5hbmNlIEhhcm5lc3NcbiAqIFxuICogUmVzcG9uc2libGUgZm9yIE93bmVyc2hpcCBMYXR0aWNlLCBQb2xpY3kgVmVyc2lvbiBNYW5hZ2VyLCBhbmQgQ2FuYXJ5IERlcGxveW1lbnQuXG4gKiBQaGFzZSAxIG9mIExheWVyIDguNSBkZWNvbXBvc2l0aW9uLlxuICovXG5cbmltcG9ydCB0eXBlIHsgVmV0b0VuZm9yY2VyIH0gZnJvbSAnLi4vY29yZS9zeW50aGVzaXplci92ZXRvL3ZldG8tZW5mb3JjZXInO1xuaW1wb3J0IHR5cGUgeyBQb2xpY3kgfSBmcm9tICcuLi9oYXJuZXNzL3R5cGVzJztcblxuZXhwb3J0IGludGVyZmFjZSBHb3Zlcm5hbmNlQ29uZmlnIHtcbiAgZW5hYmxlVmV0b0NoZWNrOiBib29sZWFuO1xuICBlbmFibGVPd25lcnNoaXBQcm9vZjogYm9vbGVhbjtcbiAgZW5hYmxlQ2FuYXJ5RGVwbG95bWVudDogYm9vbGVhbjtcbiAgY2FuYXJ5U3RhZ2VzOiBudW1iZXJbXTtcbiAgcm9sbGJhY2tPbkZhaWx1cmU6IGJvb2xlYW47XG59XG5cbmNvbnN0IERFRkFVTFRfQ09ORklHOiBHb3Zlcm5hbmNlQ29uZmlnID0ge1xuICBlbmFibGVWZXRvQ2hlY2s6IHRydWUsXG4gIGVuYWJsZU93bmVyc2hpcFByb29mOiB0cnVlLFxuICBlbmFibGVDYW5hcnlEZXBsb3ltZW50OiB0cnVlLFxuICBjYW5hcnlTdGFnZXM6IFswLjAxLCAwLjA1LCAwLjIsIDAuNSwgMS4wXSxcbiAgcm9sbGJhY2tPbkZhaWx1cmU6IHRydWUsXG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIFZldG9DaGVja1Jlc3VsdCB7XG4gIHBhc3NlZDogYm9vbGVhbjtcbiAgcmVhc29uPzogc3RyaW5nO1xuICByZXF1aXJlZFJvbGU/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3duZXJzaGlwUHJvb2ZSZXN1bHQge1xuICB2YWxpZDogYm9vbGVhbjtcbiAgcHJvb2ZzOiBhbnlbXTtcbiAgaW52YWxpZENvdW50OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuYXJ5RGVwbG95bWVudFJlc3VsdCB7XG4gIGRlcGxveW1lbnRJZDogc3RyaW5nO1xuICBzdGF0dXM6ICdkZXBsb3lpbmcnIHwgJ2NvbXBsZXRlJyB8ICdyb2xsZWRfYmFjaycgfCAnZmFpbGVkJztcbiAgY3VycmVudFN0YWdlOiBudW1iZXI7XG4gIHRyYWZmaWNQZXJjZW50YWdlOiBudW1iZXI7XG4gIHJvbGxiYWNrSW5mbz86IHtcbiAgICB0cmlnZ2VyZWQ6IGJvb2xlYW47XG4gICAgcmVhc29uOiBzdHJpbmc7XG4gICAgdGltZXN0YW1wOiBudW1iZXI7XG4gIH07XG59XG5cbi8qKlxuICogR292ZXJuYW5jZSBIYXJuZXNzIC0gbWFuYWdlcyBvd25lcnNoaXAsIHZldG8sIGFuZCBkZXBsb3ltZW50IGdvdmVybmFuY2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBHb3Zlcm5hbmNlSGFybmVzcyB7XG4gIHByaXZhdGUgY29uZmlnOiBHb3Zlcm5hbmNlQ29uZmlnO1xuICBwcml2YXRlIHZldG9FbmZvcmNlcjogYW55O1xuICBwcml2YXRlIHBvbGljeVZlcnNpb25zOiBNYXA8c3RyaW5nLCBQb2xpY3lbXT47XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBQYXJ0aWFsPEdvdmVybmFuY2VDb25maWc+ID0ge30pIHtcbiAgICB0aGlzLmNvbmZpZyA9IHsgLi4uREVGQVVMVF9DT05GSUcsIC4uLmNvbmZpZyB9O1xuICAgIHRoaXMucG9saWN5VmVyc2lvbnMgPSBuZXcgTWFwKCk7XG4gICAgLy8gVmV0b0VuZm9yY2VyIHdpbGwgYmUgaW5qZWN0ZWQgb3IgbGF6aWx5IGluaXRpYWxpemVkXG4gICAgdGhpcy52ZXRvRW5mb3JjZXIgPSBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCB2ZXRvIGVuZm9yY2VyIGluc3RhbmNlLlxuICAgKi9cbiAgc2V0VmV0b0VuZm9yY2VyKGVuZm9yY2VyOiBhbnkpOiB2b2lkIHtcbiAgICB0aGlzLnZldG9FbmZvcmNlciA9IGVuZm9yY2VyO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHZldG8gcnVsZXMgZm9yIGNoYW5nZXMuXG4gICAqL1xuICBhc3luYyBjaGVja1ZldG8oXG4gICAgY2hhbmdlczogYW55W10sXG4gICAgYXBwcm92YWxzOiBhbnlbXVxuICApOiBQcm9taXNlPFZldG9DaGVja1Jlc3VsdD4ge1xuICAgIGlmICghdGhpcy5jb25maWcuZW5hYmxlVmV0b0NoZWNrIHx8ICF0aGlzLnZldG9FbmZvcmNlcikge1xuICAgICAgcmV0dXJuIHsgcGFzc2VkOiB0cnVlLCByZWFzb246ICdWZXRvIGNoZWNrIGRpc2FibGVkJyB9O1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnZldG9FbmZvcmNlci5lbmZvcmNlKGNoYW5nZXMsIGFwcHJvdmFscyk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBwYXNzZWQ6IHJlc3VsdC5wYXNzZWQsXG4gICAgICAgIHJlYXNvbjogcmVzdWx0LnJlYXNvbixcbiAgICAgICAgcmVxdWlyZWRSb2xlOiByZXN1bHQucmVxdWlyZWRSb2xlLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcGFzc2VkOiBmYWxzZSxcbiAgICAgICAgcmVhc29uOiBgVmV0byBjaGVjayBmYWlsZWQ6ICR7ZXJyb3J9YCxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIG93bmVyc2hpcCBwcm9vZnMgZm9yIHJlc291cmNlcy5cbiAgICovXG4gIGFzeW5jIGdlbmVyYXRlT3duZXJzaGlwUHJvb2YoXG4gICAgcmVzb3VyY2VzOiBhbnlbXSxcbiAgICByb2xlczogYW55W11cbiAgKTogUHJvbWlzZTxPd25lcnNoaXBQcm9vZlJlc3VsdD4ge1xuICAgIGlmICghdGhpcy5jb25maWcuZW5hYmxlT3duZXJzaGlwUHJvb2YpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbGlkOiB0cnVlLFxuICAgICAgICBwcm9vZnM6IFtdLFxuICAgICAgICBpbnZhbGlkQ291bnQ6IDAsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIExhenkgaW1wb3J0IHRvIGF2b2lkIGNpcmN1bGFyIGRlcGVuZGVuY3lcbiAgICBjb25zdCB7IGdlbmVyYXRlT3duZXJzaGlwUHJvb2YsIERFRkFVTFRfT1dORVJTSElQX1JVTEVTIH0gPSBhd2FpdCBpbXBvcnQoJy4uL2NvcmUvc3ludGhlc2l6ZXIvb3duZXJzaGlwL3Byb29mLWdlbmVyYXRvcicpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHByb29mcyA9IGdlbmVyYXRlT3duZXJzaGlwUHJvb2YocmVzb3VyY2VzLCByb2xlcywgREVGQVVMVF9PV05FUlNISVBfUlVMRVMgfHwgW10pO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsaWQ6IHByb29mcy5sZW5ndGggPiAwLFxuICAgICAgICBwcm9vZnMsXG4gICAgICAgIGludmFsaWRDb3VudDogMCxcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbGlkOiBmYWxzZSxcbiAgICAgICAgcHJvb2ZzOiBbXSxcbiAgICAgICAgaW52YWxpZENvdW50OiByZXNvdXJjZXMubGVuZ3RoLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgcG9saWN5IHZlcnNpb24uXG4gICAqL1xuICByZWdpc3RlclBvbGljeVZlcnNpb24ocG9saWN5SWQ6IHN0cmluZywgcG9saWN5OiBQb2xpY3kpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucG9saWN5VmVyc2lvbnMuaGFzKHBvbGljeUlkKSkge1xuICAgICAgdGhpcy5wb2xpY3lWZXJzaW9ucy5zZXQocG9saWN5SWQsIFtdKTtcbiAgICB9XG4gICAgdGhpcy5wb2xpY3lWZXJzaW9ucy5nZXQocG9saWN5SWQpIS5wdXNoKHBvbGljeSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGxhdGVzdCBwb2xpY3kgdmVyc2lvbi5cbiAgICovXG4gIGdldExhdGVzdFBvbGljeShwb2xpY3lJZDogc3RyaW5nKTogUG9saWN5IHwgbnVsbCB7XG4gICAgY29uc3QgdmVyc2lvbnMgPSB0aGlzLnBvbGljeVZlcnNpb25zLmdldChwb2xpY3lJZCk7XG4gICAgaWYgKCF2ZXJzaW9ucyB8fCB2ZXJzaW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdmVyc2lvbnNbdmVyc2lvbnMubGVuZ3RoIC0gMV07XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZSBjYW5hcnkgZGVwbG95bWVudC5cbiAgICovXG4gIGFzeW5jIGV4ZWN1dGVDYW5hcnlEZXBsb3ltZW50KFxuICAgIHBvbGljeTogUG9saWN5LFxuICAgIG1ldHJpY3NDb2xsZWN0b3I6ICgpID0+IFByb21pc2U8UmVjb3JkPHN0cmluZywgbnVtYmVyPj4sXG4gICAgaGVhbHRoQ2hlY2s6ICgpID0+IFByb21pc2U8Ym9vbGVhbj5cbiAgKTogUHJvbWlzZTxDYW5hcnlEZXBsb3ltZW50UmVzdWx0PiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5lbmFibGVDYW5hcnlEZXBsb3ltZW50KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkZXBsb3ltZW50SWQ6ICdkaXNhYmxlZCcsXG4gICAgICAgIHN0YXR1czogJ2NvbXBsZXRlJyxcbiAgICAgICAgY3VycmVudFN0YWdlOiAwLFxuICAgICAgICB0cmFmZmljUGVyY2VudGFnZTogMCxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gTGF6eSBpbXBvcnQgdG8gYXZvaWQgY2lyY3VsYXIgZGVwZW5kZW5jeVxuICAgIGNvbnN0IHsgQ2FuYXJ5RGVwbG95ZXIgfSA9IGF3YWl0IGltcG9ydCgnLi9jYW5hcnktZGVwbG95ZXInKTtcblxuICAgIGNvbnN0IGRlcGxveWVyID0gbmV3IENhbmFyeURlcGxveWVyKHtcbiAgICAgIHN0YWdlczogdGhpcy5jb25maWcuY2FuYXJ5U3RhZ2VzLFxuICAgICAgcm9sbGJhY2tPbkZhaWx1cmU6IHRoaXMuY29uZmlnLnJvbGxiYWNrT25GYWlsdXJlLFxuICAgIH0pO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRlcGxveWVyLmRlcGxveShwb2xpY3ksIG1ldHJpY3NDb2xsZWN0b3IsIGhlYWx0aENoZWNrKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRlcGxveW1lbnRJZDogcmVzdWx0LmRlcGxveW1lbnRJZCxcbiAgICAgICAgc3RhdHVzOiByZXN1bHQuc3RhdHVzIGFzICdkZXBsb3lpbmcnIHwgJ2NvbXBsZXRlJyB8ICdyb2xsZWRfYmFjaycgfCAnZmFpbGVkJyxcbiAgICAgICAgY3VycmVudFN0YWdlOiByZXN1bHQuY3VycmVudFN0YWdlIHx8IDAsXG4gICAgICAgIHRyYWZmaWNQZXJjZW50YWdlOiByZXN1bHQudHJhZmZpY1BlcmNlbnRhZ2UgfHwgMCxcbiAgICAgICAgcm9sbGJhY2tJbmZvOiByZXN1bHQucm9sbGJhY2tJbmZvID8ge1xuICAgICAgICAgIHRyaWdnZXJlZDogcmVzdWx0LnJvbGxiYWNrSW5mby50cmlnZ2VyZWQsXG4gICAgICAgICAgcmVhc29uOiByZXN1bHQucm9sbGJhY2tJbmZvLnJlYXNvbiB8fCAnVW5rbm93bicsXG4gICAgICAgICAgdGltZXN0YW1wOiByZXN1bHQucm9sbGJhY2tJbmZvLnRpbWVzdGFtcCB8fCBEYXRlLm5vdygpLFxuICAgICAgICB9IDogdW5kZWZpbmVkLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGVwbG95bWVudElkOiAnZmFpbGVkJyxcbiAgICAgICAgc3RhdHVzOiAnZmFpbGVkJyxcbiAgICAgICAgY3VycmVudFN0YWdlOiAwLFxuICAgICAgICB0cmFmZmljUGVyY2VudGFnZTogMCxcbiAgICAgICAgcm9sbGJhY2tJbmZvOiB7XG4gICAgICAgICAgdHJpZ2dlcmVkOiB0cnVlLFxuICAgICAgICAgIHJlYXNvbjogU3RyaW5nKGVycm9yKSxcbiAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgaGFybmVzcyBtZXRyaWNzLlxuICAgKi9cbiAgZ2V0TWV0cmljcygpOiB7XG4gICAgcG9saWN5Q291bnQ6IG51bWJlcjtcbiAgICB2ZXRvQ2hlY2tFbmFibGVkOiBib29sZWFuO1xuICAgIGNhbmFyeUVuYWJsZWQ6IGJvb2xlYW47XG4gIH0ge1xuICAgIHJldHVybiB7XG4gICAgICBwb2xpY3lDb3VudDogdGhpcy5wb2xpY3lWZXJzaW9ucy5zaXplLFxuICAgICAgdmV0b0NoZWNrRW5hYmxlZDogdGhpcy5jb25maWcuZW5hYmxlVmV0b0NoZWNrLFxuICAgICAgY2FuYXJ5RW5hYmxlZDogdGhpcy5jb25maWcuZW5hYmxlQ2FuYXJ5RGVwbG95bWVudCxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFudXAgcmVzb3VyY2VzLlxuICAgKi9cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLnBvbGljeVZlcnNpb25zLmNsZWFyKCk7XG4gICAgdGhpcy52ZXRvRW5mb3JjZXIgPSBudWxsO1xuICB9XG59XG5cbi8qKlxuICogU2luZ2xldG9uIGhhcm5lc3MgaW5zdGFuY2UuXG4gKi9cbmxldCBkZWZhdWx0SGFybmVzczogR292ZXJuYW5jZUhhcm5lc3MgfCBudWxsID0gbnVsbDtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRIYXJuZXNzKCk6IEdvdmVybmFuY2VIYXJuZXNzIHtcbiAgaWYgKCFkZWZhdWx0SGFybmVzcykge1xuICAgIGRlZmF1bHRIYXJuZXNzID0gbmV3IEdvdmVybmFuY2VIYXJuZXNzKCk7XG4gIH1cbiAgcmV0dXJuIGRlZmF1bHRIYXJuZXNzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzZXREZWZhdWx0SGFybmVzcygpOiB2b2lkIHtcbiAgZGVmYXVsdEhhcm5lc3MgPSBudWxsO1xufVxuIl19