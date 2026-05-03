/**
 * L14 Simulation Layer - Exception Simulator
 *
 * Injects fault conditions: network timeouts, DB connection failures, API rate limits.
 * Measures system recovery and cascade behavior.
 */

export type FaultType = 'network_timeout' | 'db_connection_failure' | 'api_rate_limit' | 'service_crash' | 'memory_pressure';

export interface FaultInjection {
  type: FaultType;
  /** Target service/endpoint */
  target: string;
  /** Duration of the fault in ms */
  durationMs: number;
  /** Probability of occurrence (0-1) */
  probability: number;
}

export interface ExceptionSimulationResult {
  /** Average recovery time across all faults */
  avgRecoveryTime: number;
  /** Whether any data loss was detected */
  dataLoss: boolean;
  /** Maximum cascade depth observed */
  cascadeDepth: number;
  /** Fault results grouped by type */
  faultResults: Array<{
    type: FaultType;
    target: string;
    triggered: boolean;
    recoveryTime: number;
    cascadeDepth: number;
    error: string | null;
  }>;
  /** Overall resilience score (0-1, higher is better) */
  resilienceScore: number;
}

export class ExceptionSimulator {
  private random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Simulate fault injections and measure system response.
   */
  simulate(faults: FaultInjection[]): ExceptionSimulationResult {
    const faultResults: ExceptionSimulationResult['faultResults'] = [];
    let totalRecoveryTime = 0;
    let maxCascadeDepth = 0;
    let hasDataLoss = false;
    let triggeredCount = 0;

    for (const fault of faults) {
      const triggered = Math.random() < fault.probability;

      if (triggered) {
        triggeredCount++;
        const response = this.injectFault(fault);
        totalRecoveryTime += response.recoveryTime;
        maxCascadeDepth = Math.max(maxCascadeDepth, response.cascadeDepth);
        hasDataLoss = hasDataLoss || response.dataLoss;

        faultResults.push({
          type: fault.type,
          target: fault.target,
          triggered: true,
          recoveryTime: response.recoveryTime,
          cascadeDepth: response.cascadeDepth,
          error: response.error,
        });
      } else {
        faultResults.push({
          type: fault.type,
          target: fault.target,
          triggered: false,
          recoveryTime: 0,
          cascadeDepth: 0,
          error: null,
        });
      }
    }

    const avgRecoveryTime = triggeredCount > 0 ? totalRecoveryTime / triggeredCount : 0;
    const resilienceScore = this.computeResilienceScore({
      avgRecoveryTime,
      hasDataLoss,
      maxCascadeDepth,
      triggeredRatio: faults.length > 0 ? triggeredCount / faults.length : 0,
    });

    return {
      avgRecoveryTime,
      dataLoss: hasDataLoss,
      cascadeDepth: maxCascadeDepth,
      faultResults,
      resilienceScore,
    };
  }

  /**
   * Inject a single fault and simulate system response.
   */
  private injectFault(fault: FaultInjection): {
    recoveryTime: number;
    cascadeDepth: number;
    dataLoss: boolean;
    error: string | null;
  } {
    switch (fault.type) {
      case 'network_timeout':
        return {
          recoveryTime: fault.durationMs + this.random(500, 2000),
          cascadeDepth: 1,
          dataLoss: false,
          error: `Network timeout on ${fault.target} after ${fault.durationMs}ms`,
        };

      case 'db_connection_failure':
        return {
          recoveryTime: fault.durationMs + this.random(2000, 5000),
          cascadeDepth: 3,
          dataLoss: false,
          error: `DB connection failed on ${fault.target}, connection pool exhausted`,
        };

      case 'api_rate_limit':
        return {
          recoveryTime: this.random(1000, 3000),
          cascadeDepth: 2,
          dataLoss: false,
          error: `Rate limit exceeded on ${fault.target}`,
        };

      case 'service_crash':
        return {
          recoveryTime: fault.durationMs + this.random(5000, 15000),
          cascadeDepth: 4,
          dataLoss: Math.random() < 0.1,
          error: `Service ${fault.target} crashed with OOM`,
        };

      case 'memory_pressure':
        return {
          recoveryTime: this.random(500, 3000),
          cascadeDepth: 1,
          dataLoss: false,
          error: `Memory pressure on ${fault.target}, GC thrashing detected`,
        };

      default:
        return {
          recoveryTime: fault.durationMs,
          cascadeDepth: 0,
          dataLoss: false,
          error: `Unknown fault type: ${fault.type}`,
        };
    }
  }

  /**
   * Compute resilience score from simulation results.
   */
  private computeResilienceScore(params: {
    avgRecoveryTime: number;
    hasDataLoss: boolean;
    maxCascadeDepth: number;
    triggeredRatio: number;
  }): number {
    let score = 1.0;

    // Recovery time penalty: >10s recovery = significant penalty
    if (params.avgRecoveryTime > 10000) {
      score -= 0.3;
    } else if (params.avgRecoveryTime > 5000) {
      score -= 0.15;
    } else if (params.avgRecoveryTime > 1000) {
      score -= 0.05;
    }

    // Data loss is critical
    if (params.hasDataLoss) {
      score -= 0.4;
    }

    // Cascade depth penalty
    score -= params.maxCascadeDepth * 0.05;

    // Trigger ratio penalty
    score -= params.triggeredRatio * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate default fault injections for a service architecture.
   */
  static fromServiceEndpoints(services: Array<{ id: string; type: string }>): FaultInjection[] {
    const faults: FaultInjection[] = [];

    for (const svc of services) {
      // Network timeout for all services
      faults.push({
        type: 'network_timeout',
        target: svc.id,
        durationMs: 5000,
        probability: 0.3,
      });

      // DB failure for database-connected services
      if (svc.type === 'database' || svc.type === 'api') {
        faults.push({
          type: 'db_connection_failure',
          target: svc.id,
          durationMs: 10000,
          probability: 0.2,
        });
      }

      // Rate limit for API services
      if (svc.type === 'api') {
        faults.push({
          type: 'api_rate_limit',
          target: svc.id,
          durationMs: 3000,
          probability: 0.3,
        });
      }
    }

    return faults;
  }
}
