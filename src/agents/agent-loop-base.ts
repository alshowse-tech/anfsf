/**
 * ANFSF Agent — Agent Loop Abstract Base Class (GAP-01)
 *
 * Template method pattern: generate -> verify -> fix (maxRetries rounds)
 * Subclasses define the three operations; run() orchestrates the loop.
 *
 * Task: GAP-03
 */

import type { TokenBudget } from '../pipeline/token-budget';
import { ToolRegistry, type ToolContext } from '../tools';
import type { SkillsRegistry } from '../skills/skills-registry';

// ============================================================================
// Generic Types
// ============================================================================

export interface AgentRoundTokenUsage {
  round: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentLoopConfig {
  maxRetries: number;
  verificationTools: string[];
  llmTimeout: number;
  maxTokens: number;
}

export interface AgentLoopResult<TOutput = unknown, TError = unknown> {
  success: boolean;
  output: TOutput;
  rounds: number;
  errors: TError[];
  tokenUsage: AgentRoundTokenUsage[];
  message: string;
  /** True if the loop was terminated by budget exhaustion */
  budgetExhausted: boolean;
  /** Budget report snapshot at loop completion (if budget was configured) */
  budgetReport?: {
    used: number;
    total: number;
    usageRate: number;
    remaining: number;
  };
}

export const DEFAULT_AGENT_CONFIG: AgentLoopConfig = {
  maxRetries: 2,
  verificationTools: ['tsc-compile'],
  llmTimeout: 180_000,
  maxTokens: 32_768,
};

// ============================================================================
// Budget-aware error
// ============================================================================

export class BudgetExhaustedError extends Error {
  constructor(
    message: string,
    public readonly usageRate: number,
    public readonly remainingBudget: number,
  ) {
    super(message);
    this.name = 'BudgetExhaustedError';
  }
}

// ============================================================================
// Abstract Base Class
// ============================================================================

export abstract class AgentLoop<TInput, TOutput, TError> {
  abstract maxRetries: number;

  /** Output path set by run(). Subclasses can read it in verify()/fix(). */
  public outputPath: string | undefined;

  /**
   * Token usage log — subclasses push into this during generate() and fix().
   * run() snapshots it into the result and resets it at each call.
   */
  protected roundTokenUsages: AgentRoundTokenUsage[] = [];

  /**
   * Optional budget tracker. Set by subclass constructor or external wiring.
   * Subclasses should call this.budget?.consume() after each LLM call,
   * and check this.budget?.preEvaluate() before each LLM call.
   */
  protected budget?: TokenBudget;

  /**
   * Optional tool registry for tool-calling loops (Phase 3+).
   * When set, generate()/fix() can use LLM tool-calling instead of pure text prompts.
   */
  protected toolRegistry?: ToolRegistry;

  /**
   * Optional tool execution context (working directory, allowed paths).
   * Must be set together with toolRegistry.
   */
  protected toolContext?: ToolContext;

  /**
   * Optional skills registry for advanced context compression and skill lookup.
   * When set, generate() can use the context-compressor skill to reduce PRD size.
   */
  protected skillsRegistry?: SkillsRegistry;

  abstract generate(input: TInput): Promise<TOutput>;
  abstract verify(output: TOutput): Promise<TError[]>;
  abstract fix(errors: TError[], output: TOutput): Promise<TOutput>;

  /** Optional: write output to disk. Called after generate and after each fix. */
  writeOutput?(output: TOutput): Promise<void>;

  async run(
    input: TInput,
    outputPath?: string,
  ): Promise<AgentLoopResult<TOutput, TError>> {
    this.outputPath = outputPath;
    this.roundTokenUsages = [];
    let output: TOutput;
    let currentErrors: TError[] = [];
    let round = 0;

    try {
      output = await this.generate(input);
    } catch (error) {
      if (error instanceof BudgetExhaustedError) {
        return this.budgetExhaustedResult(null as unknown as TOutput, 0);
      }
      return {
        success: false,
        output: null as unknown as TOutput,
        rounds: 0,
        errors: [],
        tokenUsage: [...this.roundTokenUsages],
        message: 'Generation failed: ' + (error instanceof Error ? error.message : String(error)),
        budgetExhausted: false,
      };
    }

    if (this.writeOutput) await this.writeOutput(output);

    while (round <= this.maxRetries) {
      try {
        currentErrors = await this.verify(output);
      } catch (error) {
        return { success: false, output, rounds: round, errors: [],
          tokenUsage: [...this.roundTokenUsages], message: 'Verification crashed: ' + (error instanceof Error ? error.message : String(error)), budgetExhausted: false };
      }

      if (currentErrors.length === 0) {
        return this.successResult(output, round);
      }

      if (round >= this.maxRetries) {
        return { success: false, output, rounds: round, errors: currentErrors, tokenUsage: [...this.roundTokenUsages],
          message: 'Still ' + currentErrors.length + ' error(s) after ' + this.maxRetries + ' fix round(s).', budgetExhausted: false };
      }

      // Before fix round, check if budget allows it
      if (this.budget) {
        const preEval = this.budget.preEvaluate(this.estimateFixTokens(currentErrors, output));
        if (preEval.band === 'hardBlock') {
          return this.budgetExhaustedResult(output, round);
        }
      }

      try {
        output = await this.fix(currentErrors, output);
      } catch (error) {
        if (error instanceof BudgetExhaustedError) {
          return this.budgetExhaustedResult(output, round + 1);
        }
        return { success: false, output, rounds: round + 1, errors: currentErrors, tokenUsage: [...this.roundTokenUsages],
          message: 'Fix failed: ' + (error instanceof Error ? error.message : String(error)), budgetExhausted: false };
      }

      if (this.writeOutput) await this.writeOutput(output);
      round++;
    }

    return { success: false, output, rounds: round, errors: currentErrors, tokenUsage: [...this.roundTokenUsages],
      message: 'Unexpected loop termination.', budgetExhausted: false };
  }

  /** Estimate tokens needed for a fix round. Subclasses can override. */
  protected estimateFixTokens(_errors: TError[], _output: TOutput): number {
    // Conservative: use the same maxTokens as a full generation call
    if (this.budget) {
      // Return maxTokens from config or a reasonable default
      return 32_768;
    }
    return 0;
  }

  /**
   * Set the tool registry and context for tool-calling loop support.
   * Must be called before generate/fix if tool-calling is desired.
   */
  setToolRegistry(registry: ToolRegistry, context: ToolContext): void {
    this.toolRegistry = registry;
    this.toolContext = context;
  }

  /**
   * Set the skills registry for context compression and skill lookup.
   */
  setSkillsRegistry(registry: SkillsRegistry): void {
    this.skillsRegistry = registry;
  }

  private successResult(output: TOutput, round: number): AgentLoopResult<TOutput, TError> {
    const result: AgentLoopResult<TOutput, TError> = {
      success: true, output, rounds: round, errors: [], tokenUsage: [...this.roundTokenUsages],
      message: 'All checks passed in ' + (round + 1) + ' round(s).', budgetExhausted: false,
    };
    if (this.budget) {
      result.budgetReport = {
        used: this.budget.used,
        total: this.budget.getConfig().totalBudget,
        usageRate: this.budget.usageRate(),
        remaining: this.budget.remaining(),
      };
    }
    return result;
  }

  private budgetExhaustedResult(output: TOutput, rounds: number): AgentLoopResult<TOutput, TError> {
    const result: AgentLoopResult<TOutput, TError> = {
      success: false, output, rounds, errors: [], tokenUsage: [...this.roundTokenUsages],
      message: 'Token budget exhausted. Project requires more tokens to continue.',
      budgetExhausted: true,
    };
    if (this.budget) {
      result.budgetReport = {
        used: this.budget.used,
        total: this.budget.getConfig().totalBudget,
        usageRate: this.budget.usageRate(),
        remaining: this.budget.remaining(),
      };
    }
    return result;
  }
}
