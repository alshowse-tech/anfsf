/**
 * ANFSF Pipeline — Evolution Runner (GAP-11)
 *
 * Lightweight evolution orchestrator triggered on stage5_evolving.
 * Aggregates data from CompileLearningDB and triggers retrospectives.
 *
 * Phase 3: adds retrospective-engine + ComponentMiner integration.
 * Phase 4: adds IntrospectionEngine for self-modification.
 */

import { getCompileLearningDB } from './compile-learning-db';

export interface EvolutionResult {
  compileRecords: number;
  uniquePatterns: number;
  pruned: number;
  timestamp: number;
}

export async function runEvolution(projectId: string): Promise<EvolutionResult> {
  const db = getCompileLearningDB();
  db.flush();
  const pruned = db.pruneOlderThan(90);
  const result: EvolutionResult = {
    compileRecords: db.totalRecords,
    uniquePatterns: db.uniquePatterns,
    pruned,
    timestamp: Date.now(),
  };
  console.log(
    `[Evolution] Project ${projectId}: ${result.compileRecords} records, ` +
    `${result.uniquePatterns} patterns, ${result.pruned} pruned`
  );
  return result;
}
