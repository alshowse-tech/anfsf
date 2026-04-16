/**
 * ANFSF V1.5.0 - Governance Harness
 *
 * Responsible for Ownership Lattice, Policy Version Manager, and Canary Deployment.
 * Phase 1 of Layer 8.5 decomposition.
 */
import type { Policy } from '../harness/types';
export interface GovernanceConfig {
    enableVetoCheck: boolean;
    enableOwnershipProof: boolean;
    enableCanaryDeployment: boolean;
    canaryStages: number[];
    rollbackOnFailure: boolean;
}
export interface VetoCheckResult {
    passed: boolean;
    reason?: string;
    requiredRole?: string;
}
export interface OwnershipProofResult {
    valid: boolean;
    proofs: any[];
    invalidCount: number;
}
export interface CanaryDeploymentResult {
    deploymentId: string;
    status: 'deploying' | 'complete' | 'rolled_back' | 'failed';
    currentStage: number;
    trafficPercentage: number;
    rollbackInfo?: {
        triggered: boolean;
        reason: string;
        timestamp: number;
    };
}
/**
 * Governance Harness - manages ownership, veto, and deployment governance.
 */
export declare class GovernanceHarness {
    private config;
    private vetoEnforcer;
    private policyVersions;
    constructor(config?: Partial<GovernanceConfig>);
    /**
     * Set veto enforcer instance.
     */
    setVetoEnforcer(enforcer: any): void;
    /**
     * Check veto rules for changes.
     */
    checkVeto(changes: any[], approvals: any[]): Promise<VetoCheckResult>;
    /**
     * Generate ownership proofs for resources.
     */
    generateOwnershipProof(resources: any[], roles: any[]): Promise<OwnershipProofResult>;
    /**
     * Register policy version.
     */
    registerPolicyVersion(policyId: string, policy: Policy): void;
    /**
     * Get latest policy version.
     */
    getLatestPolicy(policyId: string): Policy | null;
    /**
     * Execute canary deployment.
     */
    executeCanaryDeployment(policy: Policy, metricsCollector: () => Promise<Record<string, number>>, healthCheck: () => Promise<boolean>): Promise<CanaryDeploymentResult>;
    /**
     * Get harness metrics.
     */
    getMetrics(): {
        policyCount: number;
        vetoCheckEnabled: boolean;
        canaryEnabled: boolean;
    };
    /**
     * Cleanup resources.
     */
    dispose(): void;
}
export declare function getDefaultHarness(): GovernanceHarness;
export declare function resetDefaultHarness(): void;
