/**
 * ASF V4.0 Role Synthesizer - Rework Risk Predictor
 *
 * Predicts rework risk based on contract changes and historical data.
 * Version: v0.9.0
 */
import type { Task } from '../economics/scoring';
/**
 * Contract change record.
 */
export interface ContractChange {
    contractId: string;
    breaking: boolean;
    deprecated?: boolean;
    added?: string[];
    removed?: string[];
    modified?: string[];
}
/**
 * Rework risk assessment.
 */
export interface ReworkRisk {
    /** Risk score 0-1 */
    score: number;
    /** Risk factors */
    factors: string[];
    /** Recommended mitigation */
    mitigation?: string;
}
/**
 * Historical project data.
 */
export interface HistoricalProject {
    featureId?: string;
    taskCount: number;
    reworkRate: number;
    contractChanges: number;
    success: boolean;
}
/**
 * Predict rework risk for a task.
 *
 * Factors:
 * 1. Breaking contract changes (+0.4)
 * 2. Deprecated fields (+0.2)
 * 3. High risk task label (+0.3)
 * 4. Historical rework rate (avg × 0.5)
 */
export declare function predictReworkRisk(task: Task, contractChanges: ContractChange[], historicalData?: HistoricalProject[]): ReworkRisk;
/**
 * Predict rework risk for multiple tasks.
 */
export declare function predictReworkRisks(tasks: Task[], contractChanges: ContractChange[], historicalData?: HistoricalProject[]): Map<string, ReworkRisk>;
/**
 * Compute total rework risk for scoring.
 */
export declare function computeTotalReworkRisk(risks: ReworkRisk[]): number;
/**
 * Economics score with rework risk.
 *
 * Updated formula:
 * Score = -0.30 × interfaceCost + -0.20 × bottleneck + 0.20 × skillMatch + 0.15 × parallelismGain - 0.15 × reworkRisk
 */
export declare function computeScoreWithRework(interfaceCost: number, bottleneck: number, skillMatch: number, parallelismGain: number, reworkRisks: ReworkRisk[]): number;
/**
 * Get high-risk tasks.
 */
export declare function getHighRiskTasks(tasks: Task[], contractChanges: ContractChange[], historicalData?: HistoricalProject[], threshold?: number): Array<{
    task: Task;
    risk: ReworkRisk;
}>;
/**
 * Generate rework risk report.
 */
export declare function generateReworkRiskReport(tasks: Task[], contractChanges: ContractChange[], historicalData?: HistoricalProject[]): string;
