/**
 * ANFSF Pipeline — Token Budget & Cost Tracking
 *
 * Project-level token budget management with three-tier enforcement:
 *   warn (70%) — log warning, allow all
 *   block (90%) — allow only essential (fix) operations
 *   hardBlock (135%) — block everything, fix included
 *
 * Imports pricing from llm-client.ts (single source of truth).
 * Supports persistence hooks for SQLite/Postgres restore and save.
 *
 * Task: T-004
 */

import { MODEL_PRICING, type ModelPricingEntry } from '../integrations/llm-client';

// ============================================================================
// Types
// ============================================================================

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface TokenUsageRecord {
  timestamp: number;
  tokens: TokenUsage;
  model: string;
  stage: string;
  context: string; // e.g., 'generation', 'fix', 'analysis', 'prd-parse'
}

export interface TokenBudgetConfig {
  /** Total budget in tokens (default 5,000,000) */
  totalBudget: number;
  /** Warn when usage exceeds this fraction (default 0.7 = 70%) */
  warnThreshold: number;
  /** Block non-essential calls when usage exceeds this fraction (default 0.9 = 90%) */
  blockThreshold: number;
  /**
   * Hard-block everything when usage exceeds this fraction (default 1.35 = 135%).
   * This is above blockThreshold so essential fix operations have a buffer,
   * but not infinite — max ~35% overrun.
   */
  hardBlockThreshold: number;
}

export interface TokenBudgetReport {
  projectId: string;
  totalBudget: number;
  used: number;
  remaining: number;
  usageRate: number;           // 0.0 ~ 1.0+
  isWarnThreshold: boolean;    // > 70%
  isBlockThreshold: boolean;   // > 90%
  isHardBlockThreshold: boolean; // > 135%
  records: TokenUsageRecord[];
  /** Estimated cost from single-source MODEL_PRICING */
  estimatedCost?: {
    currency: string;
    amount: number;
    breakdown: { model: string; cost: number; currency: string }[];
  };
}

export interface ConsumeResult {
  allowed: boolean;
  threshold: 'ok' | 'warn' | 'block' | 'hardBlock';
  reason?: string;
}

export interface PreEvaluateResult {
  allowed: boolean;
  /** Estimated usage rate after consumption */
  projectedRate: number;
  /** Warning message if crossing a threshold */
  warning?: string;
  /** Which threshold band we'd land in */
  band: 'ok' | 'warn' | 'block' | 'hardBlock';
}

/**
 * Persistence hooks. Implement these to save/restore budget state across
 * server restarts. The store is responsible for serialization.
 */
export interface BudgetPersistence {
  /** Restore state from store */
  restore(): Promise<TokenUsageRecord[] | null>;
  /** Persist current state to store */
  save(records: TokenUsageRecord[], totalUsed: number): Promise<void>;
}

export const DEFAULT_BUDGET_CONFIG: TokenBudgetConfig = {
  totalBudget: 5_000_000,
  warnThreshold: 0.7,
  blockThreshold: 0.9,
  hardBlockThreshold: 1.35,
};

// ============================================================================
// Essential contexts — allowed in the "block" band but NOT in "hardBlock"
//
// These are operations that must continue even when the budget is at 90%,
// because stopping mid-fix would leave the project in a broken state worse
// than exceeding the budget. However, hardBlock (135%) still rejects them.
//
// NOT in this list:
//   'generation'  — one-shot; blocking it only delays the first attempt
//   'prd-parse'   — single call; if it's blocked, the project hasn't started yet
//   'analysis'    — non-critical quality assessment; can be skipped
//   'vision'      — multi-modal path; rarely used, follows same rules as generation
// ============================================================================

const ESSENTIAL_CONTEXTS = new Set([
  'fix',
  'fix-l1',
  'fix-l2',
  'fault-diagnosis',
]);

// ============================================================================
// Token Budget Tracker
// ============================================================================

export class TokenBudget {
  private config: TokenBudgetConfig;
  private records: TokenUsageRecord[] = [];
  private totalUsed: number = 0;
  private persistence?: BudgetPersistence;
  private restorePromise: Promise<void> | null = null;

  constructor(
    public readonly projectId: string,
    config: Partial<TokenBudgetConfig> = {},
    persistence?: BudgetPersistence,
  ) {
    this.config = { ...DEFAULT_BUDGET_CONFIG, ...config };
    this.persistence = persistence;
    // Kick off async restore — consume() will await if needed
    if (this.persistence) {
      this.restorePromise = this.restoreFromStore();
    }
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  private async restoreFromStore(): Promise<void> {
    try {
      const saved = await this.persistence!.restore();
      if (saved && saved.length > 0) {
        this.records = saved;
        this.totalUsed = saved.reduce((sum, r) => sum + r.tokens.totalTokens, 0);
      }
    } catch (err) {
      console.error(`[TokenBudget] Restore failed for ${this.projectId}:`, err);
    }
  }

  /** Ensure any in-flight restore is complete before consuming. */
  private async ensureRestored(): Promise<void> {
    if (this.restorePromise) {
      await this.restorePromise;
      this.restorePromise = null;
    }
  }

  // ==========================================================================
  // Consumption
  // ==========================================================================

  /**
   * Record a token consumption event.
   * Three-tier enforcement:
   *   - warn:     allow, log warning
   *   - block:    allow essential only, reject others
   *   - hardBlock: reject everything
   */
  async consume(
    tokens: TokenUsage,
    model: string,
    stage: string,
    context: string,
  ): Promise<ConsumeResult> {
    await this.ensureRestored();

    const projectedRate = (this.totalUsed + tokens.totalTokens) / this.config.totalBudget;
    const band = this.bandForRate(projectedRate);

    if (band === 'hardBlock') {
      return {
        allowed: false,
        threshold: 'hardBlock',
        reason: `Hard budget cap reached: ${(projectedRate * 100).toFixed(0)}% > ${(this.config.hardBlockThreshold * 100).toFixed(0)}%`,
      };
    }

    if (band === 'block' && !ESSENTIAL_CONTEXTS.has(context)) {
      return {
        allowed: false,
        threshold: 'block',
        reason: `Budget blocked: ${(projectedRate * 100).toFixed(0)}% > ${(this.config.blockThreshold * 100).toFixed(0)}%. Only essential operations allowed.`,
      };
    }

    // Record the consumption
    const record: TokenUsageRecord = {
      timestamp: Date.now(),
      tokens,
      model,
      stage,
      context,
    };
    this.records.push(record);
    this.totalUsed += tokens.totalTokens;

    // Persist if hook configured
    if (this.persistence) {
      this.persistence.save(this.records, this.totalUsed).catch(err => {
        console.error(`[TokenBudget] Persist failed for ${this.projectId}:`, err);
      });
    }

    const reason = band === 'warn'
      ? `Budget warning: ${(this.usageRate() * 100).toFixed(0)}% used`
      : undefined;

    return { allowed: true, threshold: band, reason };
  }

  /**
   * Synchronous consume for callers that don't need async persistence.
   * Still enforces three-tier thresholds.
   */
  consumeSync(
    tokens: TokenUsage,
    model: string,
    stage: string,
    context: string,
  ): ConsumeResult {
    const projectedRate = (this.totalUsed + tokens.totalTokens) / this.config.totalBudget;
    const band = this.bandForRate(projectedRate);

    if (band === 'hardBlock') {
      return {
        allowed: false,
        threshold: 'hardBlock',
        reason: `Hard budget cap reached: ${(projectedRate * 100).toFixed(0)}%`,
      };
    }

    if (band === 'block' && !ESSENTIAL_CONTEXTS.has(context)) {
      return {
        allowed: false,
        threshold: 'block',
        reason: `Budget blocked: only essential operations allowed.`,
      };
    }

    const record: TokenUsageRecord = {
      timestamp: Date.now(),
      tokens,
      model,
      stage,
      context,
    };
    this.records.push(record);
    this.totalUsed += tokens.totalTokens;

    return { allowed: true, threshold: band };
  }

  // ==========================================================================
  // Pre-evaluate (estimate without consuming)
  // ==========================================================================

  /**
   * Check if a planned consumption would be allowed, without recording it.
   * Use before LLM calls to avoid wasted network round-trips.
   */
  preEvaluate(estimatedTokens: number): PreEvaluateResult {
    const projectedUsed = this.totalUsed + estimatedTokens;
    const projectedRate = projectedUsed / this.config.totalBudget;
    const band = this.bandForRate(projectedRate);

    const warnings: string[] = [];
    if (band === 'warn') warnings.push(`Will reach ${(projectedRate * 100).toFixed(0)}% — warning threshold`);
    if (band === 'block') warnings.push(`Will reach ${(projectedRate * 100).toFixed(0)}% — non-essential calls blocked`);
    if (band === 'hardBlock') warnings.push(`Will reach ${(projectedRate * 100).toFixed(0)}% — all calls blocked`);

    return {
      allowed: band !== 'hardBlock',
      projectedRate,
      warning: warnings.length > 0 ? warnings.join('; ') : undefined,
      band,
    };
  }

  /**
   * Build a budgetGuard callback for LLMClient.
   * This is the canonical integration point — pass the returned function
   * as LLMClientConfig.budgetGuard.
   *
   * IMPORTANT: This guard uses preEvaluate(), NOT consumeSync().
   * It only checks whether the call would be allowed — it does NOT
   * record the consumption. Actual consumption happens after the LLM
   * response arrives (in the caller's onSuccess / usage handler).
   */
  buildBudgetGuard(): (estimatedTokens: number, model: string, context: string) => { allowed: boolean; reason?: string } {
    return (estimatedTokens: number, _model: string, context: string) => {
      const preEval = this.preEvaluate(estimatedTokens);
      return { allowed: preEval.allowed, reason: preEval.warning };
    };
  }

  // ==========================================================================
  // Threshold Checks
  // ==========================================================================

  /** Total tokens consumed so far (public for AgentLoop reporting). */
  get used(): number {
    return this.totalUsed;
  }

  /** Remaining tokens */
  remaining(): number {
    return Math.max(0, this.config.totalBudget - this.totalUsed);
  }

  /** Usage ratio: 0.0 ~ 1.0+ */
  usageRate(): number {
    if (this.config.totalBudget <= 0) return 1.0;
    return this.totalUsed / this.config.totalBudget;
  }

  /** Has the 70% warning threshold been crossed? */
  isWarnThreshold(): boolean {
    return this.usageRate() >= this.config.warnThreshold;
  }

  /** Has the 90% block threshold been crossed? */
  isBlockThreshold(): boolean {
    return this.usageRate() >= this.config.blockThreshold;
  }

  /** Has the 135% hard block threshold been crossed? */
  isHardBlockThreshold(): boolean {
    return this.usageRate() >= this.config.hardBlockThreshold;
  }

  /** Is the budget fully exhausted? */
  isExhausted(): boolean {
    return this.remaining() <= 0;
  }

  /** Which threshold band does the given rate fall into? */
  private bandForRate(rate: number): 'ok' | 'warn' | 'block' | 'hardBlock' {
    if (rate >= this.config.hardBlockThreshold) return 'hardBlock';
    if (rate >= this.config.blockThreshold) return 'block';
    if (rate >= this.config.warnThreshold) return 'warn';
    return 'ok';
  }

  // ==========================================================================
  // Reporting
  // ==========================================================================

  /** Generate a full budget report using the UNIFIED pricing from llm-client. */
  getReport(): TokenBudgetReport {
    const usageByModel = this.records.reduce((acc, r) => {
      acc[r.model] = (acc[r.model] || 0) + r.tokens.totalTokens;
      return acc;
    }, {} as Record<string, number>);

    // Cost breakdown using llm-client MODEL_PRICING (single source of truth)
    const costBreakdown: { model: string; cost: number; currency: string }[] = [];
    let totalCost = 0;
    let primaryCurrency = 'USD';

    for (const [model, totalTokens] of Object.entries(usageByModel)) {
      const pricing: ModelPricingEntry = MODEL_PRICING[model] || MODEL_PRICING['default'];
      primaryCurrency = pricing.currency;
      const modelInput = this.records
        .filter(r => r.model === model)
        .reduce((sum, r) => sum + r.tokens.promptTokens, 0);
      const modelOutput = this.records
        .filter(r => r.model === model)
        .reduce((sum, r) => sum + r.tokens.completionTokens, 0);
      const cost = (modelInput / 1000) * pricing.promptPer1k + (modelOutput / 1000) * pricing.completionPer1k;
      costBreakdown.push({ model, cost: Math.round(cost * 10000) / 10000, currency: pricing.currency });
      totalCost += cost;
    }

    return {
      projectId: this.projectId,
      totalBudget: this.config.totalBudget,
      used: this.totalUsed,
      remaining: this.remaining(),
      usageRate: this.usageRate(),
      isWarnThreshold: this.isWarnThreshold(),
      isBlockThreshold: this.isBlockThreshold(),
      isHardBlockThreshold: this.isHardBlockThreshold(),
      records: [...this.records],
      estimatedCost: {
        currency: primaryCurrency,
        amount: Math.round(totalCost * 10000) / 10000,
        breakdown: costBreakdown,
      },
    };
  }

  /** Get breakdown by stage */
  getStageBreakdown(): Record<string, number> {
    return this.records.reduce((acc, r) => {
      acc[r.stage] = (acc[r.stage] || 0) + r.tokens.totalTokens;
      return acc;
    }, {} as Record<string, number>);
  }

  /** Get breakdown by context */
  getContextBreakdown(): Record<string, number> {
    return this.records.reduce((acc, r) => {
      acc[r.context] = (acc[r.context] || 0) + r.tokens.totalTokens;
      return acc;
    }, {} as Record<string, number>);
  }

  /** Get paginated records (for large histories). */
  getRecords(limit: number = 100, offset: number = 0): TokenUsageRecord[] {
    return this.records.slice(offset, offset + limit);
  }

  /** Number of recorded consumption events. */
  get recordCount(): number {
    return this.records.length;
  }

  // ==========================================================================
  // Config
  // ==========================================================================

  /** Update the total budget (e.g., PM adds more tokens) */
  updateBudget(newTotal: number): void {
    this.config.totalBudget = newTotal;
  }

  getConfig(): Readonly<TokenBudgetConfig> {
    return this.config;
  }

  // ==========================================================================
  // Export / serialization (for caller-side persistence)
  // ==========================================================================

  export(): { records: TokenUsageRecord[]; totalUsed: number } {
    return { records: [...this.records], totalUsed: this.totalUsed };
  }

  /** Import state from a previous export (replaces in-memory state). */
  importState(records: TokenUsageRecord[], totalUsed: number): void {
    this.records = [...records];
    this.totalUsed = totalUsed;
  }
}
