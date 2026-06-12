/**
 * ANFSF Agent — Agent Loop Abstract Base Class (GAP-01)
 *
 * Template method pattern: generate -> verify -> fix (maxRetries rounds)
 * Subclasses define the three operations; run() orchestrates the loop.
 *
 * Task: GAP-03
 */

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
}

export const DEFAULT_AGENT_CONFIG: AgentLoopConfig = {
  maxRetries: 2,
  verificationTools: ['tsc-compile'],
  llmTimeout: 180_000,
  maxTokens: 32_768,
};

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
      return {
        success: false,
        output: null as unknown as TOutput,
        rounds: 0,
        errors: [],
        tokenUsage: [...this.roundTokenUsages],
        message: 'Generation failed: ' + (error instanceof Error ? error.message : String(error)),
      };
    }

    if (this.writeOutput) await this.writeOutput(output);

    while (round <= this.maxRetries) {
      try {
        currentErrors = await this.verify(output);
      } catch (error) {
        return { success: false, output, rounds: round, errors: [],
          tokenUsage: [...this.roundTokenUsages], message: 'Verification crashed: ' + (error instanceof Error ? error.message : String(error)) };
      }

      if (currentErrors.length === 0) {
        return { success: true, output, rounds: round, errors: [], tokenUsage: [...this.roundTokenUsages],
          message: 'All checks passed in ' + (round + 1) + ' round(s).' };
      }

      if (round >= this.maxRetries) {
        return { success: false, output, rounds: round, errors: currentErrors, tokenUsage: [...this.roundTokenUsages],
          message: 'Still ' + currentErrors.length + ' error(s) after ' + this.maxRetries + ' fix round(s).' };
      }

      try {
        output = await this.fix(currentErrors, output);
      } catch (error) {
        return { success: false, output, rounds: round + 1, errors: currentErrors, tokenUsage: [...this.roundTokenUsages],
          message: 'Fix failed: ' + (error instanceof Error ? error.message : String(error)) };
      }

      if (this.writeOutput) await this.writeOutput(output);
      round++;
    }

    return { success: false, output, rounds: round, errors: currentErrors, tokenUsage: [...this.roundTokenUsages],
      message: 'Unexpected loop termination.' };
  }
}
