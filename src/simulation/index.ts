/**
 * L14 Simulation Layer - Entry Point & Pipeline
 *
 * Unified orchestration of all simulators based on AutoDecisionEngine output level.
 *
 * Level 0: skip
 * Level 1: user-behavior only
 * Level 2: user-behavior + load
 * Level 3: all 4 simulators (user-behavior + load + exception + boundary)
 */

export { UserBehaviorSimulator } from './user-behavior-simulator';
export type {
  UserPath,
  UserStep,
  UserBehaviorConfig,
  UserBehaviorResult,
} from './user-behavior-simulator';

export { LoadSimulator } from './load-simulator';
export type { LoadProfile, ServiceEndpoint, LoadSimulationResult } from './load-simulator';

export { ExceptionSimulator } from './exception-simulator';
export type { FaultType, FaultInjection, ExceptionSimulationResult } from './exception-simulator';

export { BoundarySimulator } from './boundary-simulator';
export type { BoundaryTest, BoundaryCondition, BoundarySimulationResult } from './boundary-simulator';

export { AutoDecisionEngine } from './auto-decision-engine';
export type { ProjectRiskProfile, SimulationLevel } from './auto-decision-engine';

import type { UserBehaviorConfig, UserBehaviorResult } from './user-behavior-simulator';
import type { LoadProfile, ServiceEndpoint, LoadSimulationResult } from './load-simulator';
import type { FaultInjection, ExceptionSimulationResult } from './exception-simulator';
import type { BoundaryTest, BoundarySimulationResult } from './boundary-simulator';
import type { SimulationLevel } from './auto-decision-engine';
import { UserBehaviorSimulator } from './user-behavior-simulator';
import { LoadSimulator } from './load-simulator';
import { ExceptionSimulator } from './exception-simulator';
import { BoundarySimulator } from './boundary-simulator';

/**
 * Combined simulation result from all executed simulators.
 */
export interface SimulationPipelineResult {
  /** Simulation level (0-3) */
  level: number;
  /** Whether simulation was skipped */
  skipped: boolean;
  /** User behavior result (if level >= 1) */
  userBehavior?: UserBehaviorResult;
  /** Load simulation result (if level >= 2) */
  load?: LoadSimulationResult;
  /** Exception simulation result (if level >= 3) */
  exception?: ExceptionSimulationResult;
  /** Boundary simulation result (if level >= 3) */
  boundary?: BoundarySimulationResult;
  /** Overall passed (true if no simulator failed its threshold) */
  passed: boolean;
  /** Summary of findings */
  summary: string[];
}

/**
 * Simulation Pipeline - orchestrates all simulators based on decision level.
 */
export class SimulationPipeline {
  private userBehaviorSim = new UserBehaviorSimulator();
  private loadSim = new LoadSimulator();
  private exceptionSim = new ExceptionSimulator();
  private boundarySim = new BoundarySimulator();

  /**
   * Execute simulations based on the decided level.
   *
   * @param level - Simulation level from AutoDecisionEngine
   * @param userConfig - User behavior simulation config (required for level >= 1)
   * @param endpoints - Service endpoints for load testing (required for level >= 2)
   * @param loadProfile - Load profile configuration (required for level >= 2)
   * @param faults - Fault injection definitions (required for level >= 3)
   * @param boundaryTests - Boundary test definitions (required for level >= 3)
   */
  run(params: {
    level: SimulationLevel;
    userConfig: UserBehaviorConfig;
    endpoints?: ServiceEndpoint[];
    loadProfile?: LoadProfile;
    faults?: FaultInjection[];
    boundaryTests?: BoundaryTest[];
  }): SimulationPipelineResult {
    const { level, userConfig, endpoints, loadProfile, faults, boundaryTests } = params;
    const summaries: string[] = [];
    let passed = true;

    // Level 0: skip
    if (level.level === 0) {
      summaries.push(`Simulation skipped (level 0: ${level.description})`);
      return { level: 0, skipped: true, passed: true, summary: summaries };
    }

    // Level 1+: user behavior simulation
    const userResult = this.userBehaviorSim.simulate(userConfig);
    summaries.push(`User behavior: ${userResult.pathCoverage.toFixed(0)}% path coverage, ${userResult.errorRate.toFixed(1)}% error rate`);
    if (userResult.errorRate > 0.10) passed = false;

    // Level 2+: load simulation
    let loadResult: LoadSimulationResult | undefined;
    if (level.level >= 2 && endpoints && loadProfile) {
      loadResult = this.loadSim.simulate(endpoints, loadProfile);
      summaries.push(`Load: throughput ${loadResult.throughput.toFixed(0)} rps, p99 ${loadResult.p99.toFixed(0)}ms, error ${loadResult.errorRate.toFixed(1)}%`);
      if (loadResult.errorRate > 0.05) passed = false;
    }

    // Level 3: exception + boundary simulation
    let exceptionResult: ExceptionSimulationResult | undefined;
    let boundaryResult: BoundarySimulationResult | undefined;
    if (level.level >= 3) {
      if (faults) {
        exceptionResult = this.exceptionSim.simulate(faults);
        summaries.push(`Exception: resilience ${exceptionResult.resilienceScore.toFixed(2)}, cascade depth ${exceptionResult.cascadeDepth}, data loss: ${exceptionResult.dataLoss}`);
        if (exceptionResult.dataLoss || exceptionResult.resilienceScore < 0.5) passed = false;
      }

      if (boundaryTests) {
        boundaryResult = this.boundarySim.simulate(boundaryTests);
        summaries.push(`Boundary: ${boundaryResult.passed}/${boundaryResult.totalCases} passed, ${boundaryResult.failed} failed`);
        if (boundaryResult.failed > 0) passed = false;
      }
    }

    return {
      level: level.level,
      skipped: false,
      userBehavior: userResult,
      load: loadResult,
      exception: exceptionResult,
      boundary: boundaryResult,
      passed,
      summary: summaries,
    };
  }
}
