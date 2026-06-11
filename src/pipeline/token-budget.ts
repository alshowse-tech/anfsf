/**
 * ANFSF Pipeline — Token Budget & Cost Tracking
 *
 * Project-level token budget management. Tracks consumption per project,
 * warns at 70% usage, blocks non-essential LLM calls at 90%.
 *
 * Task: T-004
 */

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
  context: string; // e.g., 'generation', 'fix', 'analysis'
}

export interface TokenBudgetConfig {
  /** Total budget in tokens (default 5,000,000) */
  totalBudget: number;
  /** Warn when usage exceeds this fraction (default 0.7 = 70%) */
  warnThreshold: number;
  /** Block non-essential calls when usage exceeds this fraction (default 0.9 = 90%) */
  blockThreshold: number;
}

export interface TokenBudgetReport {
  projectId: string;
  totalBudget: number;
  used: number;
  remaining: number;
  usageRate: number;           // 0.0 ~ 1.0
  isWarnThreshold: boolean;    // > 70%
  isBlockThreshold: boolean;   // > 90%
  records: TokenUsageRecord[];
  /** Estimated cost (requires model pricing config) */
  estimatedCost?: {
    currency: string;
    amount: number;
  };
}

export const DEFAULT_BUDGET_CONFIG: TokenBudgetConfig = {
  totalBudget: 5_000_000,
  warnThreshold: 0.7,
  blockThreshold: 0.9,
};

// ============================================================================
// Model Pricing (Phase 1: estimated defaults, can be configured)
// ============================================================================

export interface ModelPricing {
  inputPer1K: number;   // cost per 1000 input tokens
  outputPer1K: number;  // cost per 1000 output tokens
  currency: string;
}

const DEFAULT_PRICING: Record<string, ModelPricing> = {
  'deepseek-chat': { inputPer1K: 0.00014, outputPer1K: 0.00028, currency: 'USD' },
  'qwen-plus':    { inputPer1K: 0.0008,  outputPer1K: 0.002,   currency: 'CNY' },
  'qwen-turbo':   { inputPer1K: 0.0003,  outputPer1K: 0.0006,  currency: 'CNY' },
  'flash':        { inputPer1K: 0.0001,  outputPer1K: 0.0002,  currency: 'USD' },
  'pro':          { inputPer1K: 0.001,   outputPer1K: 0.002,   currency: 'USD' },
  'default':      { inputPer1K: 0.001,   outputPer1K: 0.002,   currency: 'USD' },
};

// ============================================================================
// Token Budget Tracker
// ============================================================================

export class TokenBudget {
  private config: TokenBudgetConfig;
  private records: TokenUsageRecord[] = [];
  private totalUsed: number = 0;

  constructor(
    public readonly projectId: string,
    config: Partial<TokenBudgetConfig> = {},
  ) {
    this.config = { ...DEFAULT_BUDGET_CONFIG, ...config };
  }

  // ==========================================================================
  // Consumption
  // ==========================================================================

  /**
   * Record a token consumption event.
   * @returns true if the consumption was allowed, false if blocked
   */
  consume(tokens: TokenUsage, model: string, stage: string, context: string): boolean {
    // If we're over block threshold, only allow "essential" contexts
    if (this.isBlockThreshold() && !this.isEssential(context)) {
      return false;
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
    return true;
  }

  /**
   * Force-consume tokens (bypasses block threshold check).
   * Use sparingly — only for critical operations.
   */
  forceConsume(tokens: TokenUsage, model: string, stage: string, context: string): void {
    const record: TokenUsageRecord = {
      timestamp: Date.now(),
      tokens,
      model,
      stage,
      context,
    };
    this.records.push(record);
    this.totalUsed += tokens.totalTokens;
  }

  // ==========================================================================
  // Threshold Checks
  // ==========================================================================

  /** Remaining tokens */
  remaining(): number {
    return Math.max(0, this.config.totalBudget - this.totalUsed);
  }

  /** Usage ratio: 0.0 ~ 1.0 */
  usageRate(): number {
    if (this.config.totalBudget <= 0) return 1.0; // Zero budget: treat as fully consumed
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

  /** Is the budget fully exhausted? */
  isExhausted(): boolean {
    return this.remaining() <= 0;
  }

  // ==========================================================================
  // Reporting
  // ==========================================================================

  /** Generate a full budget report */
  getReport(model?: string): TokenBudgetReport {
    const usageByModel = this.records.reduce((acc, r) => {
      acc[r.model] = (acc[r.model] || 0) + r.tokens.totalTokens;
      return acc;
    }, {} as Record<string, number>);

    let estimatedCost;
    const primaryModel = model || Object.keys(usageByModel)[0] || 'default';
    const pricing = DEFAULT_PRICING[primaryModel] || DEFAULT_PRICING['default'];

    const totalInput = this.records.reduce((sum, r) => sum + r.tokens.promptTokens, 0);
    const totalOutput = this.records.reduce((sum, r) => sum + r.tokens.completionTokens, 0);

    estimatedCost = {
      currency: pricing.currency,
      amount: (totalInput / 1000) * pricing.inputPer1K + (totalOutput / 1000) * pricing.outputPer1K,
    };

    return {
      projectId: this.projectId,
      totalBudget: this.config.totalBudget,
      used: this.totalUsed,
      remaining: this.remaining(),
      usageRate: this.usageRate(),
      isWarnThreshold: this.isWarnThreshold(),
      isBlockThreshold: this.isBlockThreshold(),
      records: [...this.records],
      estimatedCost,
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
  // Private
  // ==========================================================================

  /**
   * Essential operations are always allowed, even over block threshold:
   * - Fix operations (L1 auto-fixes, L2 suggestions)
   * - Critical analysis (fault diagnosis)
   */
  private isEssential(context: string): boolean {
    const essential = ['fix', 'fix-l1', 'fix-l2', 'fault-diagnosis', 'release-check'];
    return essential.includes(context);
  }
}
