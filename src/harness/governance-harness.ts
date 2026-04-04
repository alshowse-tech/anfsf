/**
 * ANFSF V1.5.0 - Governance Harness
 * 
 * Responsible for Ownership Lattice, Policy Version Manager, and Canary Deployment.
 * Phase 1 of Layer 8.5 decomposition.
 */

import type { VetoEnforcer } from '../core/synthesizer/veto/veto-enforcer';
import type { Policy } from '../harness/types';

export interface GovernanceConfig {
  enableVetoCheck: boolean;
  enableOwnershipProof: boolean;
  enableCanaryDeployment: boolean;
  canaryStages: number[];
  rollbackOnFailure: boolean;
}

const DEFAULT_CONFIG: GovernanceConfig = {
  enableVetoCheck: true,
  enableOwnershipProof: true,
  enableCanaryDeployment: true,
  canaryStages: [0.01, 0.05, 0.2, 0.5, 1.0],
  rollbackOnFailure: true,
};

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
export class GovernanceHarness {
  private config: GovernanceConfig;
  private vetoEnforcer: any;
  private policyVersions: Map<string, Policy[]>;

  constructor(config: Partial<GovernanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.policyVersions = new Map();
    // VetoEnforcer will be injected or lazily initialized
    this.vetoEnforcer = null;
  }

  /**
   * Set veto enforcer instance.
   */
  setVetoEnforcer(enforcer: any): void {
    this.vetoEnforcer = enforcer;
  }

  /**
   * Check veto rules for changes.
   */
  async checkVeto(
    changes: any[],
    approvals: any[]
  ): Promise<VetoCheckResult> {
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
    } catch (error) {
      return {
        passed: false,
        reason: `Veto check failed: ${error}`,
      };
    }
  }

  /**
   * Generate ownership proofs for resources.
   */
  async generateOwnershipProof(
    resources: any[],
    roles: any[]
  ): Promise<OwnershipProofResult> {
    if (!this.config.enableOwnershipProof) {
      return {
        valid: true,
        proofs: [],
        invalidCount: 0,
      };
    }

    // Lazy import to avoid circular dependency
    const { generateOwnershipProof, DEFAULT_OWNERSHIP_RULES } = await import('../core/synthesizer/ownership/proof-generator');

    try {
      const proofs = generateOwnershipProof(resources, roles, DEFAULT_OWNERSHIP_RULES || []);
      return {
        valid: proofs.length > 0,
        proofs,
        invalidCount: 0,
      };
    } catch (error) {
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
  registerPolicyVersion(policyId: string, policy: Policy): void {
    if (!this.policyVersions.has(policyId)) {
      this.policyVersions.set(policyId, []);
    }
    this.policyVersions.get(policyId)!.push(policy);
  }

  /**
   * Get latest policy version.
   */
  getLatestPolicy(policyId: string): Policy | null {
    const versions = this.policyVersions.get(policyId);
    if (!versions || versions.length === 0) {
      return null;
    }
    return versions[versions.length - 1];
  }

  /**
   * Execute canary deployment.
   */
  async executeCanaryDeployment(
    policy: Policy,
    metricsCollector: () => Promise<Record<string, number>>,
    healthCheck: () => Promise<boolean>
  ): Promise<CanaryDeploymentResult> {
    if (!this.config.enableCanaryDeployment) {
      return {
        deploymentId: 'disabled',
        status: 'complete',
        currentStage: 0,
        trafficPercentage: 0,
      };
    }

    // Lazy import to avoid circular dependency
    const { CanaryDeployer } = await import('./canary-deployer');

    const deployer = new CanaryDeployer({
      stages: this.config.canaryStages,
      rollbackOnFailure: this.config.rollbackOnFailure,
    });

    try {
      const result = await deployer.deploy(policy, metricsCollector, healthCheck);
      return {
        deploymentId: result.deploymentId,
        status: result.status as 'deploying' | 'complete' | 'rolled_back' | 'failed',
        currentStage: result.currentStage || 0,
        trafficPercentage: result.trafficPercentage || 0,
        rollbackInfo: result.rollbackInfo ? {
          triggered: result.rollbackInfo.triggered,
          reason: result.rollbackInfo.reason || 'Unknown',
          timestamp: result.rollbackInfo.timestamp || Date.now(),
        } : undefined,
      };
    } catch (error) {
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
  getMetrics(): {
    policyCount: number;
    vetoCheckEnabled: boolean;
    canaryEnabled: boolean;
  } {
    return {
      policyCount: this.policyVersions.size,
      vetoCheckEnabled: this.config.enableVetoCheck,
      canaryEnabled: this.config.enableCanaryDeployment,
    };
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    this.policyVersions.clear();
    this.vetoEnforcer = null;
  }
}

/**
 * Singleton harness instance.
 */
let defaultHarness: GovernanceHarness | null = null;

export function getDefaultHarness(): GovernanceHarness {
  if (!defaultHarness) {
    defaultHarness = new GovernanceHarness();
  }
  return defaultHarness;
}

export function resetDefaultHarness(): void {
  defaultHarness = null;
}
