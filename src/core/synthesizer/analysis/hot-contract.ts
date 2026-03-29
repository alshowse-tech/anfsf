/**
 * ASF V4.0 Role Synthesizer - Hot Contract Convergence
 * 
 * Contract coupling analysis for role count control.
 * Version: v0.9.0
 */

import type { Task } from '../economics/scoring';

/**
 * Contract with reach information.
 */
export interface HotContract {
  id: string;
  reachCount: number;
  touchedTasks: string[];
}

/**
 * Contract coupling bound result.
 */
export interface ContractCouplingBound {
  hotContracts: HotContract[];
  adjustedMaxK: number;
}

/**
 * Requirement graph interface.
 */
export interface RequirementGraph {
  contracts?: Array<{ id: string; type: string }>;
}

/**
 * Compute contract coupling bound.
 * 
 * Hot contracts (touched by many tasks) indicate high coupling,
 * which requires fewer roles to minimize coordination overhead.
 * 
 * @param graph - Requirement graph
 * @param tasks - Task list
 * @param hotContractThreshold - Minimum touches to be "hot" (default: 3)
 * @returns Hot contracts and adjusted max role count
 */
export function computeContractCouplingBound(
  graph: RequirementGraph,
  tasks: Task[],
  hotContractThreshold: number = 3
): ContractCouplingBound {
  // Count how many different tasks touch each contract
  const contractReachCount = new Map<string, Set<string>>();

  for (const task of tasks) {
    for (const contractId of task.contractIds ?? []) {
      if (!contractReachCount.has(contractId)) {
        contractReachCount.set(contractId, new Set());
      }
      contractReachCount.get(contractId)!.add(task.id);
    }
  }

  // Identify hot contracts
  const hotContracts: HotContract[] = [];
  for (const [contractId, reachSet] of contractReachCount) {
    if (reachSet.size > hotContractThreshold) {
      hotContracts.push({
        id: contractId,
        reachCount: reachSet.size,
        touchedTasks: Array.from(reachSet),
      });
    }
  }

  // Adjust max role count based on hot contract count
  let adjustedMaxK = 8; // Default upper bound

  if (hotContracts.length >= 2) {
    // Multiple hot contracts = high coupling, need fewer roles
    adjustedMaxK = 5;
  } else if (hotContracts.length === 1) {
    // Single hot contract = moderate coupling
    adjustedMaxK = 6;
  }

  return {
    hotContracts,
    adjustedMaxK,
  };
}

/**
 * Role count decision.
 */
export interface RoleCountDecision {
  /** Theoretical minimum (from SCC/community detection) */
  theoreticalMin: number;
  
  /** Practical maximum (from √n and other constraints) */
  practicalMax: number;
  
  /** Recommended optimal count */
  optimal: number;
  
  /** Hot contracts affecting the decision */
  hotContracts: HotContract[];
  
  /** Recommendation type */
  recommendation: 'normal' | 'hot_contract_convergence' | 'scc_bound';
}

/**
 * Synth constraints.
 */
export interface SynthConstraints {
  kMin: number;
  kMax: number;
}

/**
 * Determine optimal role count.
 * 
 * Integrates:
 * 1. SCC lower bound (from task coupling graph)
 * 2. √n upper bound
 * 3. Hot contract convergence
 * 4. Historical learning (optional)
 */
export function determineOptimalRoleCount(
  tasks: Task[],
  graph: RequirementGraph,
  constraints: SynthConstraints,
  options?: {
    sccLowerBound?: number;
    historicalData?: HistoricalData;
  }
): RoleCountDecision {
  // 1. SCC lower bound (from community detection)
  const sccLowerBound = options?.sccLowerBound ?? detectNaturalCommunities(tasks);
  const lowerBound = Math.max(constraints.kMin, sccLowerBound);

  // 2. √n upper bound
  const sqrtBound = Math.floor(Math.sqrt(tasks.length));
  let practicalMax = Math.min(constraints.kMax, Math.ceil(sqrtBound * 1.2));

  // 3. Hot contract convergence (key!)
  const { hotContracts, adjustedMaxK } = computeContractCouplingBound(
    graph,
    tasks
  );
  practicalMax = Math.min(practicalMax, adjustedMaxK);

  // 4. Historical learning
  let optimal = practicalMax;
  if (options?.historicalData) {
    const learned = learnOptimalKFromHistory(
      tasks.length,
      hotContracts.length,
      options.historicalData
    );
    optimal = Math.min(practicalMax, Math.max(lowerBound, learned));
  }

  // Determine recommendation type
  let recommendation: RoleCountDecision['recommendation'] = 'normal';
  if (hotContracts.length >= 2) {
    recommendation = 'hot_contract_convergence';
  } else if (sccLowerBound >= practicalMax) {
    recommendation = 'scc_bound';
  }

  return {
    theoreticalMin: lowerBound,
    practicalMax,
    optimal,
    hotContracts,
    recommendation,
  };
}

/**
 * Detect natural communities in task coupling graph.
 * 
 * Uses simple label propagation as approximation.
 */
export function detectNaturalCommunities(tasks: Task[]): number {
  if (tasks.length === 0) return 1;
  if (tasks.length <= 3) return Math.min(tasks.length, 2);

  // Group by feature (strong coupling indicator)
  const featureGroups = new Map<string, number>();
  for (const task of tasks) {
    if (task.featureId) {
      featureGroups.set(
        task.featureId,
        (featureGroups.get(task.featureId) ?? 0) + 1
      );
    }
  }

  // Group by contract (moderate coupling indicator)
  const contractGroups = new Map<string, number>();
  for (const task of tasks) {
    for (const contractId of task.contractIds ?? []) {
      contractGroups.set(
        contractId,
        (contractGroups.get(contractId) ?? 0) + 1
      );
    }
  }

  // Estimate communities
  const featureCommunities = featureGroups.size;
  const contractCommunities = contractGroups.size;

  // Use feature groups as primary signal
  return Math.max(1, Math.min(featureCommunities, Math.floor(tasks.length / 2)));
}

/**
 * Historical project data.
 */
export interface HistoricalData {
  projects: Array<{
    taskCount: number;
    hotContractCount: number;
    optimalK: number;
    success: boolean;
  }>;
}

/**
 * Learn optimal K from historical data.
 */
export function learnOptimalKFromHistory(
  taskCount: number,
  hotContractCount: number,
  historicalData: HistoricalData
): number {
  const similarProjects = historicalData.projects.filter(
    (p) =>
      Math.abs(p.taskCount - taskCount) < taskCount * 0.3 &&
      Math.abs(p.hotContractCount - hotContractCount) <= 1
  );

  if (similarProjects.length === 0) {
    // No similar projects, use simple heuristic
    return Math.floor(Math.sqrt(taskCount));
  }

  // Weight by success and similarity
  const weightedSum = similarProjects.reduce((sum, p) => {
    const weight = p.success ? 1.5 : 0.5;
    return sum + p.optimalK * weight;
  }, 0);

  const totalWeight = similarProjects.reduce(
    (sum, p) => sum + (p.success ? 1.5 : 0.5),
    0
  );

  return Math.round(weightedSum / totalWeight);
}

/**
 * Get hot contract report.
 */
export function getHotContractReport(
  hotContracts: HotContract[],
  tasks: Task[]
): string {
  if (hotContracts.length === 0) {
    return 'No hot contracts detected (low coupling)';
  }

  const lines = [
    `Detected ${hotContracts.length} hot contract(s):`,
    '',
  ];

  for (const contract of hotContracts) {
    lines.push(
      `  - ${contract.id}: touched by ${contract.reachCount} tasks`
    );
  }

  if (hotContracts.length >= 2) {
    lines.push('');
    lines.push('Recommendation: Limit roles to 5 or fewer (high coupling)');
  } else if (hotContracts.length === 1) {
    lines.push('');
    lines.push('Recommendation: Limit roles to 6 or fewer (moderate coupling)');
  }

  return lines.join('\n');
}
