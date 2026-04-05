/**
 * ANFSF V1.5.0 - Memory Consolidation Skill (v2.0)
 * 
 * 永久记忆巩固引擎 + 多权重检索 + Graph-Driven 遗忘机制
 * 注册到：Evolution Harness
 * 能效比目标：3.8 倍
 * 延迟增幅：+10-15ms
 */

import { Skill, SkillContext, SkillResult } from './base';

// ============================================================================
// Types
// ============================================================================

export interface MemoryData {
  id: string;
  content: string;
  taskId?: string;
  taskOutcome?: {
    impactScore: number; // 0-1
    success: boolean;
  };
  accessCount: number;
  createdAt: number;
  lastAccessedAt: number;
  connectedMemories: string[];
  metadata?: Record<string, any>;
}

export interface ConsolidationContext {
  memories: MemoryData[];
  storageType: 'short' | 'long' | 'cold';
  enableRLFeedback: boolean;
  enableUserFeedback: boolean;
}

export interface RetrievalContext {
  query: string;
  filters?: {
    timeRange?: [number, number];
    importanceRange?: [number, number];
    taskTypes?: string[];
  };
  maxResults?: number;
}

export interface ConsolidationResult extends SkillResult {
  consolidatedMemories: MemoryData[];
  prunedMemories: MemoryData[];
  importanceScores: Record<string, number>;
  halfLives: Record<string, number>;
}

export interface RetrievalResult extends SkillResult {
  results: Array<{
    memory: MemoryData;
    score: number;
    breakdown: {
      semantic: number;
      temporal: number;
      importance: number;
      frequency: number;
      rl: number;
      user: number;
    };
  }>;
  totalCandidates: number;
}

// ============================================================================
// Constants
// ============================================================================

const IMPORTANCE_WEIGHTS = {
  taskImpact: 0.40,
  frequency: 0.25,
  connectivity: 0.15,
  rlReward: 0.10,
  userFeedback: 0.10,
};

const BASE_HALF_LIFE_DAYS = 30;

const IMPORTANCE_HALF_LIFE_MULTIPLIERS = {
  high: 2.0,   // >0.8: 60 days
  medium: 1.0, // 0.5-0.8: 30 days
  low: 0.5,    // <0.5: 15 days
};

const STORAGE_THRESHOLDS = {
  short: 24 * 60 * 60 * 1000,     // 24 hours
  long: 7 * 24 * 60 * 60 * 1000,  // 7 days
  cold: Infinity,
};

// ============================================================================
// MemoryConsolidationSkill
// ============================================================================

export class MemoryConsolidationSkill extends Skill {
  name = 'memory-consolidation';
  version = '2.0.0';
  description = '永久记忆巩固引擎 + 多权重检索 + Graph-Driven 遗忘机制';

  private memories: Map<string, MemoryData> = new Map();
  private importanceCache: Map<string, number> = new Map();
  private projectData: any[] = [];

  async execute(ctx: ConsolidationContext): Promise<ConsolidationResult> {
    const startTime = Date.now();

    // 1. Calculate importance scores for all memories
    const importanceScores: Record<string, number> = {};
    const halfLives: Record<string, number> = {};

    for (const memory of ctx.memories) {
      const importance = await this.calculateImportance(memory, ctx);
      importanceScores[memory.id] = importance;
      halfLives[memory.id] = this.calculateHalfLife(importance);

      // Update importance cache
      this.importanceCache.set(memory.id, importance);
    }

    // 2. Consolidate memories based on storage type
    const now = Date.now();
    const consolidatedMemories: MemoryData[] = [];
    const prunedMemories: MemoryData[] = [];

    for (const memory of ctx.memories) {
      const age = now - memory.createdAt;
      const importance = importanceScores[memory.id];

      if (this.shouldConsolidate(memory, ctx.storageType, age, importance)) {
        consolidatedMemories.push(memory);
      } else if (this.shouldPrune(memory, ctx.storageType, age, importance)) {
        prunedMemories.push(memory);
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      consolidatedMemories,
      prunedMemories,
      importanceScores,
      halfLives,
      executionTime,
      metadata: {
        totalMemories: ctx.memories.length,
        consolidated: consolidatedMemories.length,
        pruned: prunedMemories.length,
        storageType: ctx.storageType,
      },
    };
  }

  /**
   * Retrieve memories with multi-weight scoring.
   */
  async retrieve(ctx: RetrievalContext): Promise<RetrievalResult> {
    const startTime = Date.now();

    // 1. Get candidate memories
    let candidates = Array.from(this.memories.values());

    // Apply filters
    if (ctx.filters) {
      if (ctx.filters.timeRange) {
        const [start, end] = ctx.filters.timeRange;
        candidates = candidates.filter(m => m.createdAt >= start && m.createdAt <= end);
      }
      if (ctx.filters.importanceRange) {
        const [min, max] = ctx.filters.importanceRange;
        candidates = candidates.filter(m => {
          const importance = this.importanceCache.get(m.id) || 0;
          return importance >= min && importance <= max;
        });
      }
    }

    // 2. Score each candidate
    const scoredResults = candidates.map(memory => {
      const breakdown = this.calculateRetrievalScores(memory, ctx.query);
      const totalScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

      return {
        memory,
        score: totalScore,
        breakdown,
      };
    });

    // 3. Sort by score and limit results
    scoredResults.sort((a, b) => b.score - a.score);
    const results = scoredResults.slice(0, ctx.maxResults || 10);

    const executionTime = Date.now() - startTime;

    return {
      results,
      totalCandidates: candidates.length,
      executionTime,
      metadata: {
        query: ctx.query,
        filtersApplied: !!ctx.filters,
        resultsReturned: results.length,
      },
    };
  }

  /**
   * Calculate importance score for a memory.
   */
  private async calculateImportance(memory: MemoryData, ctx: ConsolidationContext): Promise<number> {
    // Task impact (40%)
    const taskImpact = memory.taskOutcome?.impactScore || 0.5;

    // Frequency (25%)
    const daysSinceCreation = (Date.now() - memory.createdAt) / (1000 * 60 * 60 * 24);
    const frequency = memory.accessCount / Math.max(1, daysSinceCreation);
    const normalizedFrequency = Math.min(1, frequency / 10); // Normalize to 0-1

    // Connectivity (15%)
    const maxConnections = 100;
    const connectivity = Math.min(1, memory.connectedMemories.length / maxConnections);

    // RL Reward (10%) - simulated
    const rlReward = ctx.enableRLFeedback ? await this.getRLReward(memory) : 0.5;

    // User Feedback (10%) - simulated
    const userFeedback = ctx.enableUserFeedback ? await this.getUserFeedback(memory) : 0.5;

    // Combined importance
    const importance = (
      IMPORTANCE_WEIGHTS.taskImpact * taskImpact +
      IMPORTANCE_WEIGHTS.frequency * normalizedFrequency +
      IMPORTANCE_WEIGHTS.connectivity * connectivity +
      IMPORTANCE_WEIGHTS.rlReward * rlReward +
      IMPORTANCE_WEIGHTS.userFeedback * userFeedback
    );

    return Math.min(1, Math.max(0, importance));
  }

  /**
   * Calculate half-life based on importance.
   */
  private calculateHalfLife(importance: number): number {
    let multiplier: number;
    if (importance > 0.8) {
      multiplier = IMPORTANCE_HALF_LIFE_MULTIPLIERS.high;
    } else if (importance >= 0.5) {
      multiplier = IMPORTANCE_HALF_LIFE_MULTIPLIERS.medium;
    } else {
      multiplier = IMPORTANCE_HALF_LIFE_MULTIPLIERS.low;
    }

    return BASE_HALF_LIFE_DAYS * multiplier;
  }

  /**
   * Determine if memory should be consolidated.
   */
  private shouldConsolidate(memory: MemoryData, storageType: string, age: number, importance: number): boolean {
    const threshold = STORAGE_THRESHOLDS[storageType as keyof typeof STORAGE_THRESHOLDS];

    // High importance memories are always consolidated
    if (importance > 0.8) return true;

    // Check age threshold
    return age < threshold;
  }

  /**
   * Determine if memory should be pruned.
   */
  private shouldPrune(memory: MemoryData, storageType: string, age: number, importance: number): boolean {
    const threshold = STORAGE_THRESHOLDS[storageType as keyof typeof STORAGE_THRESHOLDS];

    // High importance memories are never pruned
    if (importance > 0.8) return false;

    // Low importance + old = prune
    return importance < 0.3 && age > threshold * 2;
  }

  /**
   * Calculate retrieval scores with multi-weight breakdown.
   */
  private calculateRetrievalScores(memory: MemoryData, query: string): RetrievalResult['results'][0]['breakdown'] {
    // Semantic similarity (40%) - simulated
    const semantic = this.simulateSemanticSimilarity(memory.content, query);

    // Temporal decay (20%) - recent优先
    const daysOld = (Date.now() - memory.createdAt) / (1000 * 60 * 60 * 24);
    const temporal = Math.exp(-daysOld / 30); // 30-day half-life

    // Importance (25%)
    const importance = this.importanceCache.get(memory.id) || 0.5;

    // Frequency (15%)
    const daysSinceCreation = (Date.now() - memory.createdAt) / (1000 * 60 * 60 * 24);
    const frequency = memory.accessCount / Math.max(1, daysSinceCreation);
    const normalizedFrequency = Math.min(1, frequency / 10);

    // RL Reward (10%) - simulated
    const rl = 0.5;

    // User Feedback (10%) - simulated
    const user = 0.5;

    return {
      semantic: 0.40 * semantic,
      temporal: 0.20 * temporal,
      importance: 0.25 * importance,
      frequency: 0.15 * normalizedFrequency,
      rl: 0.10 * rl,
      user: 0.10 * user,
    };
  }

  /**
   * Simulate semantic similarity (placeholder for actual embedding model).
   */
  private simulateSemanticSimilarity(content: string, query: string): number {
    // Simple keyword overlap as placeholder
    const contentWords = content.toLowerCase().split(/\s+/);
    const queryWords = query.toLowerCase().split(/\s+/);
    const overlap = queryWords.filter(w => contentWords.includes(w)).length;
    return Math.min(1, overlap / Math.max(1, queryWords.length));
  }

  /**
   * Get RL reward for memory (placeholder for actual RL model).
   */
  private async getRLReward(memory: MemoryData): Promise<number> {
    // Simulated RL reward
    return 0.5 + Math.random() * 0.5;
  }

  /**
   * Get user feedback for memory (placeholder for actual feedback system).
   */
  private async getUserFeedback(memory: MemoryData): Promise<number> {
    // Simulated user feedback
    return 0.5 + Math.random() * 0.5;
  }

  /**
   * Add memory to storage.
   */
  addMemory(memory: MemoryData): void {
    this.memories.set(memory.id, memory);
    this.importanceCache.delete(memory.id); // Invalidate cache
  }

  /**
   * Collect project data (for Evolution Harness).
   */
  collectProjectData(data: any): void {
    this.projectData.push(data);
  }

  /**
   * Get skill metadata.
   */
  getMetadata(): Record<string, any> {
    return {
      name: this.name,
      version: this.version,
      storageTypes: ['short', 'long', 'cold'],
      baseHalfLife: `${BASE_HALF_LIFE_DAYS} days`,
      importanceWeights: IMPORTANCE_WEIGHTS,
      energyEfficiencyRatio: '3.8:1',
    };
  }
}

// ============================================================================
// Skill Registration
// ============================================================================

export function registerMemoryConsolidationSkill(registry: any): void {
  registry.register(new MemoryConsolidationSkill());
}

export function createMemoryConsolidationSkill(): MemoryConsolidationSkill {
  return new MemoryConsolidationSkill();
}
