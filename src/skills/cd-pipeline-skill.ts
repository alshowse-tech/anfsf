/**
 * ANFSF L15 — CD Pipeline Skill
 *
 * Continuous deployment pipeline with canary deployment support.
 * Manages: build validation, staged rollout, health checks,
 * automatic rollback on deployment failure, and deployment history.
 */

import { Skill, SkillResult } from './base';

export interface CDConfig {
  /** Deployment environment */
  environment: 'staging' | 'production';
  /** Canary deployment: percentage of traffic (0-100) */
  canaryPercentage?: number;
  /** Health check endpoint */
  healthCheckPath?: string;
  /** Health check interval (ms) */
  healthCheckIntervalMs?: number;
  /** Maximum health check retries */
  maxHealthCheckRetries?: number;
  /** Rollback on failure */
  autoRollback?: boolean;
  /** Deployment timeout (ms) */
  timeoutMs?: number;
}

export interface DeploymentStage {
  /** Stage name */
  name: string;
  /** Stage status */
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  /** Started at */
  startedAt?: number;
  /** Completed at */
  completedAt?: number;
  /** Duration (ms) */
  durationMs?: number;
  /** Stage output */
  output?: string;
  /** Error message */
  error?: string;
}

export interface CanaryConfig {
  /** Traffic percentage for canary (0-100) */
  initialPercentage: number;
  /** Increment step (%) */
  incrementStep: number;
  /** Interval between increments (ms) */
  incrementIntervalMs: number;
  /** Health threshold to proceed */
  healthThreshold: number;
}

export interface DeployOptions {
  /** Build artifact */
  artifact: {
    /** Artifact name/version */
    name: string;
    /** Artifact checksum */
    checksum: string;
    /** Artifact size (bytes) */
    size: number;
  };
  /** Target environment */
  environment: string;
  /** Deployment tags */
  tags?: string[];
  /** Canary configuration */
  canary?: Partial<CanaryConfig>;
}

export interface DeploymentRecord {
  /** Deployment ID */
  id: string;
  /** Artifact name */
  artifact: string;
  /** Target environment */
  environment: string;
  /** Status */
  status: 'pending' | 'deploying' | 'canary' | 'running' | 'completed' | 'failed' | 'rolled_back';
  /** Deployment stages */
  stages: DeploymentStage[];
  /** Canary percentage (if applicable) */
  canaryPercentage?: number;
  /** Started at */
  startedAt: number;
  /** Completed at */
  completedAt?: number;
  /** Duration (ms) */
  durationMs?: number;
  /** Deployer */
  deployedBy: string;
  /** Error message */
  error?: string;
}

export interface DeploymentResult extends SkillResult {
  /** Deployment record */
  deployment: DeploymentRecord;
  /** Whether deployment succeeded */
  success: boolean;
}

export interface CanaryResult {
  /** Whether canary promotion is safe */
  safeToPromote: boolean;
  /** Current canary percentage */
  currentPercentage: number;
  /** Health check results */
  healthChecks: Array<{
    timestamp: number;
    healthy: boolean;
    latency: number;
    errorRate: number;
  }>;
  /** Recommendation */
  recommendation: 'promote' | 'rollback' | 'hold';
}

const DEFAULT_CANARY_CONFIG: CanaryConfig = {
  initialPercentage: 10,
  incrementStep: 20,
  incrementIntervalMs: 60000,
  healthThreshold: 0.95,
};

const DEFAULT_STAGES = ['build', 'test', 'security-scan', 'staging-deploy', 'canary-deploy', 'production-deploy'];

/**
 * CD Pipeline Skill — continuous deployment with canary support.
 */
export class CDPipelineSkill extends Skill {
  name = 'cd-pipeline';
  version = '1.0.0';
  description = 'CD 管道 Skill — 持续部署与金丝雀发布';

  private deploymentHistory: DeploymentRecord[] = [];

  execute(ctx: {
    options: DeployOptions;
    config?: Partial<CDConfig>;
    healthCheckFn?: () => Promise<{ healthy: boolean; latency: number; errorRate: number }>;
    deployFn?: (stage: string) => Promise<void>;
  }): Promise<DeploymentResult> {
    const startTime = Date.now();
    const { options, config } = ctx;

    const deploymentId = `deploy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const stages = this.createStages(options.environment);

    const deployment: DeploymentRecord = {
      id: deploymentId,
      artifact: options.artifact.name,
      environment: options.environment,
      status: 'pending',
      stages,
      startedAt: startTime,
      deployedBy: 'anfsf-pipeline',
    };

    this.deploymentHistory.push(deployment);

    // Execute deployment stages
    const resolvedConfig: CDConfig = { environment: config?.environment ?? 'production', ...config };
    return this.executeDeployment(deployment, options, resolvedConfig, ctx).then(result => ({
      ...result,
      executionTime: Date.now() - startTime,
      metadata: { name: this.name, version: this.version },
    }));
  }

  // ---------------------------------------------------------------------------
  // Stage Execution
  // ---------------------------------------------------------------------------

  private async executeDeployment(
    deployment: DeploymentRecord,
    options: DeployOptions,
    config: CDConfig,
    ctx: {
      healthCheckFn?: () => Promise<{ healthy: boolean; latency: number; errorRate: number }>;
      deployFn?: (stage: string) => Promise<void>;
    }
  ): Promise<DeploymentResult> {
    const autoRollback = config.autoRollback ?? true;

    for (const stage of deployment.stages) {
      stage.status = 'running';
      stage.startedAt = Date.now();

      try {
        if (ctx.deployFn) {
          await ctx.deployFn(stage.name);
        } else {
          await this.runStage(stage.name, options, deployment);
        }

        stage.status = 'passed';
        stage.completedAt = Date.now();
        stage.durationMs = stage.completedAt - stage.startedAt;
      } catch (error) {
        stage.status = 'failed';
        stage.error = String(error);
        stage.completedAt = Date.now();
        stage.durationMs = stage.completedAt - stage.startedAt;

        deployment.status = 'failed';
        deployment.error = `Stage "${stage.name}" failed: ${String(error)}`;
        deployment.completedAt = Date.now();
        deployment.durationMs = deployment.completedAt - deployment.startedAt;

        // Auto rollback if enabled and past canary stage
        if (autoRollback && this.isPastCanary(deployment.stages, stage.name)) {
          await this.rollback(deployment);
        }

        return { deployment, success: false };
      }
    }

    deployment.status = 'completed';
    deployment.completedAt = Date.now();
    deployment.durationMs = deployment.completedAt - deployment.startedAt;

    return { deployment, success: true };
  }

  private async runStage(stageName: string, options: DeployOptions, deployment: DeploymentRecord): Promise<void> {
    switch (stageName) {
      case 'build':
        await this.validateBuild(options.artifact);
        break;
      case 'test':
        await this.runPreDeployChecks(options);
        break;
      case 'security-scan':
        await this.runSecurityScan(options);
        break;
      case 'staging-deploy':
        await this.deployToStaging(options);
        break;
      case 'canary-deploy':
        await this.deployCanary(options, deployment);
        break;
      case 'production-deploy':
        await this.deployToProduction(options, deployment);
        break;
      default:
        throw new Error(`Unknown stage: ${stageName}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Stage Implementations
  // ---------------------------------------------------------------------------

  private async validateBuild(artifact: DeployOptions['artifact']): Promise<void> {
    if (!artifact.name || !artifact.checksum) {
      throw new Error('Invalid artifact: missing name or checksum');
    }
    if (artifact.size === 0) {
      throw new Error('Invalid artifact: empty size');
    }
  }

  private async runPreDeployChecks(options: DeployOptions): Promise<void> {
    // Simulate pre-deploy checks
    if (!options.environment) {
      throw new Error('No target environment specified');
    }
  }

  private async runSecurityScan(_options: DeployOptions): Promise<void> {
    // Simulate security scan
    // In production, this would run SAST/DAST tools
  }

  private async deployToStaging(options: DeployOptions): Promise<void> {
    // Simulate staging deployment
    if (options.environment === 'production') {
      // Always deploy to staging first even for production targets
    }
  }

  private async deployCanary(options: DeployOptions, deployment: DeploymentRecord): Promise<void> {
    const canaryConfig = options.canary
      ? { ...DEFAULT_CANARY_CONFIG, ...options.canary }
      : DEFAULT_CANARY_CONFIG;

    deployment.status = 'canary';
    deployment.canaryPercentage = canaryConfig.initialPercentage;

    // In production, this would:
    // 1. Deploy to canary instances
    // 2. Route configured % of traffic
    // 3. Monitor health metrics
    // 4. Increment percentage if healthy
    // 5. Repeat until 100% or failure
  }

  private async deployToProduction(options: DeployOptions, deployment: DeploymentRecord): Promise<void> {
    // Final production deployment
    deployment.status = 'running';
    // In production, this would update DNS/Load balancer
  }

  private async rollback(deployment: DeploymentRecord): Promise<void> {
    deployment.status = 'rolled_back';
    deployment.error = (deployment.error || '') + ' [Auto-rollback triggered]';
  }

  // ---------------------------------------------------------------------------
  // Canary Analysis
  // ---------------------------------------------------------------------------

  analyzeCanary(
    healthChecks: Array<{ timestamp: number; healthy: boolean; latency: number; errorRate: number }>,
    config?: Partial<CanaryConfig>
  ): CanaryResult {
    const canaryConfig = { ...DEFAULT_CANARY_CONFIG, ...config };

    if (healthChecks.length === 0) {
      return {
        safeToPromote: false,
        currentPercentage: 0,
        healthChecks: [],
        recommendation: 'hold',
      };
    }

    // Calculate health metrics
    const healthyCount = healthChecks.filter(h => h.healthy).length;
    const avgErrorRate = healthChecks.reduce((s, h) => s + h.errorRate, 0) / healthChecks.length;

    const healthRate = healthyCount / healthChecks.length;
    const safeToPromote = healthRate >= canaryConfig.healthThreshold && avgErrorRate < 0.05;

    const recommendation: 'promote' | 'rollback' | 'hold' = safeToPromote
      ? 'promote'
      : avgErrorRate > 0.1
        ? 'rollback'
        : 'hold';

    return {
      safeToPromote,
      currentPercentage: safeToPromote ? 100 : canaryConfig.initialPercentage,
      healthChecks,
      recommendation,
    };
  }

  // ---------------------------------------------------------------------------
  // History and Status
  // ---------------------------------------------------------------------------

  getDeploymentHistory(): DeploymentRecord[] {
    return [...this.deploymentHistory];
  }

  getDeployment(id: string): DeploymentRecord | null {
    return this.deploymentHistory.find(d => d.id === id) ?? null;
  }

  getLatestDeployment(environment: string): DeploymentRecord | null {
    return this.deploymentHistory
      .filter(d => d.environment === environment)
      .sort((a, b) => b.startedAt - a.startedAt)[0] ?? null;
  }

  clearHistory(): void {
    this.deploymentHistory = [];
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private createStages(environment: string): DeploymentStage[] {
    // For staging environment, skip canary and production stages
    if (environment === 'staging') {
      return DEFAULT_STAGES.slice(0, 4).map(name => ({
        name,
        status: 'pending' as const,
      }));
    }

    return DEFAULT_STAGES.map(name => ({
      name,
      status: 'pending' as const,
    }));
  }

  private isPastCanary(stages: DeploymentStage[], failedStage: string): boolean {
    const canaryIndex = stages.findIndex(s => s.name === 'canary-deploy');
    const failedIndex = stages.findIndex(s => s.name === failedStage);
    return failedIndex > canaryIndex;
  }
}

/**
 * Create a CDPipelineSkill instance.
 */
export function createCDPipelineSkill(): CDPipelineSkill {
  return new CDPipelineSkill();
}
