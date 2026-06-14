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
import { getComponentMiner } from './component-miner';
import { syncToKnowledgeBase } from './knowledge-bridge';
import { MetricsCollector } from './metrics-collector';

export interface EvolutionResult {
  compileRecords: number;
  uniquePatterns: number;
  pruned: number;
  componentPatterns: number;
  timestamp: number;
}

export async function runEvolution(projectId: string): Promise<EvolutionResult> {
  const startTime = Date.now();
  const db = getCompileLearningDB();
  db.flush();
  const pruned = db.pruneOlderThan(90);
  const result: EvolutionResult = {
    compileRecords: db.totalRecords,
    uniquePatterns: db.uniquePatterns,
    pruned,
    componentPatterns: 0,
    timestamp: Date.now(),
  };
  console.log(
    `[Evolution] Project ${projectId}: ${result.compileRecords} records, ` +
    `${result.uniquePatterns} patterns, ${result.pruned} pruned`
  );
  try {
    const collector = new MetricsCollector();
    collector.record({
      projectId, stage: "evolution", durationMs: Date.now() - startTime,
      success: true, promptTokens: 0, completionTokens: 0,
      errorCount: result.compileRecords, fixL1: 0, fixL2: 0, fixL3: 0,
      timestamp: Date.now()
    });
    collector.flush();
  } catch {}
  return result;
}

export async function runProjectEvolution(
  projectId: string,
  projectPath: string,
  projectType: string,
  modifiedFiles?: string[],
): Promise<EvolutionResult> {
  const startTime = Date.now();
  const result = await runEvolution(projectId);
  if (modifiedFiles && modifiedFiles.length > 0) {
    try {
      const miner = getComponentMiner();
      const discovered = miner.scan(projectPath, projectType, modifiedFiles);
      miner.flush();
      result.componentPatterns = discovered.length;
      await syncToKnowledgeBase(projectId);
      console.log(
        `[Evolution] Component miner: ${discovered.length} patterns found in ${projectId}`
      );
    } catch (e) {
      console.error(`[Evolution] Component miner failed for ${projectId}:`, e);
    }
  }
  try {
    const collector = new MetricsCollector();
    collector.record({
      projectId, stage: "project-evolution", durationMs: Date.now() - startTime,
      success: true, promptTokens: 0, completionTokens: 0,
      errorCount: result.compileRecords, fixL1: 0, fixL2: 0, fixL3: 0,
      timestamp: Date.now()
    });
    collector.flush();
  } catch {}
  return result;
}