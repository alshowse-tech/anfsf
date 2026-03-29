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
  reworkRate: number; // 0-1
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
export function predictReworkRisk(
  task: Task,
  contractChanges: ContractChange[],
  historicalData: HistoricalProject[] = []
): ReworkRisk {
  let riskScore = 0;
  const factors: string[] = [];

  // 1. Contract change types
  for (const change of contractChanges) {
    if (change.breaking) {
      riskScore += 0.4;
      factors.push(`Breaking change in ${change.contractId}`);
    }
    if (change.deprecated) {
      riskScore += 0.2;
      factors.push(`Deprecated field in ${change.contractId}`);
    }
  }

  // 2. Risk label
  if (task.risk === 'high') {
    riskScore += 0.3;
    factors.push('High risk task');
  }

  // 3. Historical rework rate
  const history = historicalData.filter((p) => p.featureId === task.featureId);
  if (history.length > 0) {
    const avgRework = history.reduce((sum, p) => sum + p.reworkRate, 0) / history.length;
    riskScore += avgRework * 0.5;
    factors.push(`Historical rework rate: ${(avgRework * 100).toFixed(0)}%`);
  }

  // Cap at 1.0
  riskScore = Math.min(riskScore, 1.0);

  // Determine mitigation
  let mitigation: string | undefined;
  if (riskScore >= 0.7) {
    mitigation = 'Requires architect review + extended testing';
  } else if (riskScore >= 0.4) {
    mitigation = 'Requires peer review';
  }

  return {
    score: Math.round(riskScore * 100) / 100,
    factors,
    mitigation,
  };
}

/**
 * Predict rework risk for multiple tasks.
 */
export function predictReworkRisks(
  tasks: Task[],
  contractChanges: ContractChange[],
  historicalData: HistoricalProject[] = []
): Map<string, ReworkRisk> {
  const risks = new Map<string, ReworkRisk>();

  for (const task of tasks) {
    risks.set(task.id, predictReworkRisk(task, contractChanges, historicalData));
  }

  return risks;
}

/**
 * Compute total rework risk for scoring.
 */
export function computeTotalReworkRisk(risks: ReworkRisk[]): number {
  if (risks.length === 0) return 0;
  return risks.reduce((sum, r) => sum + r.score, 0) / risks.length;
}

/**
 * Economics score with rework risk.
 * 
 * Updated formula:
 * Score = -0.30 × interfaceCost + -0.20 × bottleneck + 0.20 × skillMatch + 0.15 × parallelismGain - 0.15 × reworkRisk
 */
export function computeScoreWithRework(
  interfaceCost: number,
  bottleneck: number,
  skillMatch: number,
  parallelismGain: number,
  reworkRisks: ReworkRisk[]
): number {
  const totalReworkRisk = computeTotalReworkRisk(reworkRisks);

  return (
    -0.3 * normalize(interfaceCost, 0, 100) +
    -0.2 * bottleneck +
    0.2 * skillMatch +
    0.15 * parallelismGain +
    -0.15 * totalReworkRisk
  );
}

/**
 * Get high-risk tasks.
 */
export function getHighRiskTasks(
  tasks: Task[],
  contractChanges: ContractChange[],
  historicalData: HistoricalProject[] = [],
  threshold: number = 0.5
): Array<{ task: Task; risk: ReworkRisk }> {
  const highRiskTasks: Array<{ task: Task; risk: ReworkRisk }> = [];

  for (const task of tasks) {
    const risk = predictReworkRisk(task, contractChanges, historicalData);
    if (risk.score >= threshold) {
      highRiskTasks.push({ task, risk });
    }
  }

  return highRiskTasks.sort((a, b) => b.risk.score - a.risk.score);
}

/**
 * Normalize value to 0-1.
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Generate rework risk report.
 */
export function generateReworkRiskReport(
  tasks: Task[],
  contractChanges: ContractChange[],
  historicalData: HistoricalProject[] = []
): string {
  const risks = predictReworkRisks(tasks, contractChanges, historicalData);
  const highRiskTasks = getHighRiskTasks(tasks, contractChanges, historicalData);

  const lines = [
    'Rework Risk Report',
    '==================',
    '',
    `Total tasks: ${tasks.length}`,
    `High risk tasks: ${highRiskTasks.length}`,
    '',
  ];

  if (highRiskTasks.length > 0) {
    lines.push('High Risk Tasks:');
    for (const { task, risk } of highRiskTasks.slice(0, 5)) {
      lines.push(`  - ${task.id}: ${(risk.score * 100).toFixed(0)}%`);
      for (const factor of risk.factors) {
        lines.push(`    • ${factor}`);
      }
      if (risk.mitigation) {
        lines.push(`    → ${risk.mitigation}`);
      }
    }
  } else {
    lines.push('No high-risk tasks detected.');
  }

  return lines.join('\n');
}
