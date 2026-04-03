/**
 * ANFSF V4 Layer 8.5 - Canary Deployer Implementation
 * 
 * Canary deployment orchestrator with progressive rollout and automatic rollback.
 */

import {
  Policy,
  DeploymentResult,
  CanaryOptions,
  DeploymentStatus,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CANARY_STAGES = [0.01, 0.05, 0.2, 0.5, 1.0];
const DEFAULT_STAGE_DURATION_MS = 300000; // 5 minutes

// ============================================================================
// Helper Functions
// ============================================================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function now(): number {
  return Date.now();
}

// ============================================================================
// CanaryDeployer Class
// ============================================================================

/**
 * CanaryDeployer - Orchestrates canary deployments
 */
export class CanaryDeployer {
  private stages: number[];
  private stageDurationMs: number;
  private monitorMetrics: string[];
  private autoPromote: boolean;
  private rollbackOnFailure: boolean;

  constructor(options: CanaryOptions = {}) {
    this.stages = options.stages || DEFAULT_CANARY_STAGES;
    this.stageDurationMs = options.stageDurationMs || DEFAULT_STAGE_DURATION_MS;
    this.monitorMetrics = options.monitorMetrics || ['error_rate', 'latency_p99'];
    this.autoPromote = options.autoPromote !== false;
    this.rollbackOnFailure = options.rollbackOnFailure !== false;
  }

  /**
   * Execute canary deployment
   */
  async deploy(
    policy: Policy,
    metricsCollector: () => Promise<Record<string, number>>,
    healthCheck: () => Promise<boolean>
  ): Promise<DeploymentResult> {
    const deploymentId = generateUUID();
    const startTime = now();

    const deployment: DeploymentResult = {
      deploymentId,
      status: 'deploying',
      startTime,
      currentStage: 0,
      trafficPercentage: 0,
    };

    try {
      for (let i = 0; i < this.stages.length; i++) {
        deployment.currentStage = i + 1;
        deployment.trafficPercentage = this.stages[i] * 100;
        deployment.status = 'canary';

        // Wait for stage duration
        await this.sleep(this.stageDurationMs);

        // Health check
        const isHealthy = await healthCheck();
        if (!isHealthy && this.rollbackOnFailure) {
          deployment.status = 'rolled_back';
          deployment.rollbackInfo = {
            triggered: true,
            reason: 'Health check failed',
            timestamp: now(),
          };
          return deployment;
        }

        // Collect metrics
        const metrics = await metricsCollector();
        deployment.metricsSummary = metrics;

        // Check metrics thresholds
        const metricsHealthy = this.checkMetricsHealth(metrics);
        if (!metricsHealthy && this.rollbackOnFailure) {
          deployment.status = 'rolled_back';
          deployment.rollbackInfo = {
            triggered: true,
            reason: 'Metrics exceeded threshold',
            timestamp: now(),
          };
          return deployment;
        }
      }

      // Deployment complete
      deployment.status = 'complete';
      deployment.endTime = now();
      deployment.trafficPercentage = 100;

      return deployment;

    } catch (error) {
      deployment.status = 'failed';
      deployment.endTime = now();
      deployment.rollbackInfo = {
        triggered: this.rollbackOnFailure,
        reason: String(error),
        timestamp: now(),
      };
      return deployment;
    }
  }

  private checkMetricsHealth(metrics: Record<string, number>): boolean {
    // Default thresholds
    const thresholds = {
      error_rate: 0.05,
      latency_p99: 1000,
      success_rate: 0.95,
    };

    for (const [metric, value] of Object.entries(metrics)) {
      const threshold = thresholds[metric as keyof typeof thresholds];
      if (threshold !== undefined) {
        // Boundary condition: value AT threshold is considered unhealthy for error/latency
        // and unhealthy for success rate (conservative approach)
        if (metric.includes('error') || metric.includes('latency')) {
          if (value >= threshold) return false;
        } else if (metric.includes('success') || metric.includes('rate')) {
          if (value <= threshold) return false;
        }
      }
    }

    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default CanaryDeployer;
