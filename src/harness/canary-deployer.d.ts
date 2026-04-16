/**
 * ANFSF V4 Layer 8.5 - Canary Deployer Implementation
 *
 * Canary deployment orchestrator with progressive rollout and automatic rollback.
 */
import { Policy, DeploymentResult, CanaryOptions } from './types';
/**
 * CanaryDeployer - Orchestrates canary deployments
 */
export declare class CanaryDeployer {
    private stages;
    private stageDurationMs;
    private monitorMetrics;
    private autoPromote;
    private rollbackOnFailure;
    constructor(options?: CanaryOptions);
    /**
     * Execute canary deployment
     */
    deploy(policy: Policy, metricsCollector: () => Promise<Record<string, number>>, healthCheck: () => Promise<boolean>): Promise<DeploymentResult>;
    private checkMetricsHealth;
    private sleep;
}
export default CanaryDeployer;
