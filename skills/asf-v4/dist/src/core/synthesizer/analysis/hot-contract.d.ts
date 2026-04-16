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
    contracts?: Array<{
        id: string;
        type: string;
    }>;
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
export declare function computeContractCouplingBound(graph: RequirementGraph, tasks: Task[], hotContractThreshold?: number): ContractCouplingBound;
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
export declare function determineOptimalRoleCount(tasks: Task[], graph: RequirementGraph, constraints: SynthConstraints, options?: {
    sccLowerBound?: number;
    historicalData?: HistoricalData;
}): RoleCountDecision;
/**
 * Detect natural communities in task coupling graph.
 *
 * Uses simple label propagation as approximation.
 */
export declare function detectNaturalCommunities(tasks: Task[]): number;
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
export declare function learnOptimalKFromHistory(taskCount: number, hotContractCount: number, historicalData: HistoricalData): number;
/**
 * Get hot contract report.
 */
export declare function getHotContractReport(hotContracts: HotContract[], tasks: Task[]): string;
