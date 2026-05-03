/**
 * L14 Simulation Layer - User Behavior Simulator
 *
 * Simulates user interaction paths based on workflow definitions.
 * Validates path coverage, error rate, and average latency.
 */

export interface UserPath {
  id: string;
  name: string;
  steps: UserStep[];
  weight: number;
}

export interface UserStep {
  action: string;
  target: string;
  params?: Record<string, any>;
}

export interface UserBehaviorConfig {
  mode: 'normal' | 'peak' | 'error';
  paths: UserPath[];
  iterationsPerPath: number;
}

export interface UserBehaviorResult {
  pathCoverage: number;
  errorRate: number;
  avgLatency: number;
  totalRequests: number;
  failedRequests: number;
  pathResults: Array<{
    pathId: string;
    pathName: string;
    successRate: number;
    avgLatency: number;
    errors: string[];
  }>;
}

export class UserBehaviorSimulator {
  private random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Simulate user behavior across defined paths.
   */
  simulate(config: UserBehaviorConfig): UserBehaviorResult {
    const pathResults: UserBehaviorResult['pathResults'] = [];
    let totalRequests = 0;
    let failedRequests = 0;
    let totalLatency = 0;

    for (const path of config.paths) {
      const pathIterations = path.weight * config.iterationsPerPath;
      let pathFailures = 0;
      let pathLatency = 0;
      const errors: string[] = [];

      for (let i = 0; i < pathIterations; i++) {
        const stepResult = this.simulateSteps(path.steps, config.mode);
        pathLatency += stepResult.latency;
        if (!stepResult.success) {
          pathFailures++;
          if (stepResult.error) {
            errors.push(stepResult.error);
          }
        }
      }

      const pathSuccessRate = 1 - pathFailures / Math.max(1, pathIterations);

      pathResults.push({
        pathId: path.id,
        pathName: path.name,
        successRate: pathSuccessRate,
        avgLatency: pathIterations > 0 ? pathLatency / pathIterations : 0,
        errors,
      });

      totalRequests += pathIterations;
      failedRequests += pathFailures;
      totalLatency += pathLatency;
    }

    const successfulPaths = pathResults.filter((r) => r.successRate > 0).length;
    const pathCoverage = config.paths.length > 0 ? successfulPaths / config.paths.length : 0;

    return {
      pathCoverage,
      errorRate: totalRequests > 0 ? failedRequests / totalRequests : 0,
      avgLatency: totalRequests > 0 ? totalLatency / totalRequests : 0,
      totalRequests,
      failedRequests,
      pathResults,
    };
  }

  /**
   * Simulate executing a sequence of steps.
   */
  private simulateSteps(
    steps: UserStep[],
    mode: 'normal' | 'peak' | 'error'
  ): { success: boolean; latency: number; error?: string } {
    let latency = 0;

    for (const step of steps) {
      let stepLatency: number;
      let success: boolean;

      switch (mode) {
        case 'normal':
          success = Math.random() > 0.02;
          stepLatency = this.random(20, 200);
          break;
        case 'peak':
          success = Math.random() > 0.05;
          stepLatency = this.random(100, 800);
          break;
        case 'error':
          success = Math.random() > 0.20;
          stepLatency = this.random(50, 2000);
          break;
        default:
          success = true;
          stepLatency = 50;
      }

      latency += stepLatency;

      if (!success) {
        return {
          success: false,
          latency,
          error: `Step '${step.action}' on '${step.target}' failed in ${mode} mode`,
        };
      }
    }

    return { success: true, latency };
  }

  /**
   * Generate default user paths from workflow IR nodes.
   */
  static fromWorkflowIR(workflowNodes: Array<{ id: string; content: string; edges?: string[] }>): UserBehaviorConfig {
    const paths: UserPath[] = [];

    for (const node of workflowNodes) {
      paths.push({
        id: node.id,
        name: node.content || `Path ${node.id}`,
        steps: [
          { action: 'navigate', target: node.id },
          { action: 'interact', target: node.id },
          { action: 'verify', target: node.id },
        ],
        weight: 1.0,
      });
    }

    return {
      mode: 'normal',
      paths,
      iterationsPerPath: 100,
    };
  }
}
