/**
 * ANFSF Pipeline — Skeleton Generator (T-104)
 *
 * Bridges the CodeGenerationLoop (T-002) with the pipeline's skeleton
 * generation step. Replaces direct LLM calls in product-pipeline.ts
 * with the Agent Loop's "generate → verify → fix" cycle.
 *
 * Task: T-104
 */

import { CodeGenerationLoop, type RequirementSpec, type AgentLoopConfig, type AgentLoopResult, type GeneratedCode, type VerificationError, type AgentRoundTokenUsage } from '../agents/code-generation-loop';
import { LLMClient } from '../integrations/llm-client';
import type { ProjectState } from './pipeline-state-machine';
import { TokenBudget } from './token-budget';

// ============================================================================
// Types
// ============================================================================

export interface SkeletonGenerationInput {
  /** Project ID for tracking */
  projectId: string;
  /** Parsed and confirmed requirement spec */
  spec: RequirementSpec;
  /** Output directory for generated code */
  outputDir: string;
  /** Deployment form */
  deploymentForm: 'web' | 'h5' | 'miniprogram';
  /** Current pipeline stage */
  stage: ProjectState;
}

export interface SkeletonGenerationOutput {
  /** Whether generation succeeded (agent loop verification passed) */
  success: boolean;
  /** Generated code files */
  code: GeneratedCode;
  /** Number of agent loop rounds */
  rounds: number;
  /** Any remaining errors */
  errors: VerificationError[];
  /** Token usage report */
  tokenUsage: AgentRoundTokenUsage[];
  /** Summary message */
  message: string;
}

// ============================================================================
// Skeleton Generator
// ============================================================================

export class SkeletonGenerator {
  private agentLoop: CodeGenerationLoop;

  constructor(
    llmClient: LLMClient,
    private budget?: TokenBudget,
    agentConfig?: Partial<AgentLoopConfig>,
  ) {
    this.agentLoop = new CodeGenerationLoop(llmClient, agentConfig);
  }

  /**
   * Generate project skeleton using the Agent Loop.
   *
   * This replaces the previous direct LLM call in product-pipeline.ts.
   * The agent loop generates code, writes it to disk, verifies it,
   * and retries fixes up to maxRetries times.
   */
  async generate(input: SkeletonGenerationInput): Promise<SkeletonGenerationOutput> {
    const { projectId, spec, outputDir, deploymentForm, stage } = input;

    // Inject deployment form into spec
    const enrichedSpec: RequirementSpec = {
      ...spec,
      deploymentForm,
      context: {
        ...spec.context,
        projectId,
        stage,
      },
    };

    // Run the agent loop
    const result = await this.agentLoop.run(enrichedSpec, outputDir);

    // Track token usage in budget (if configured)
    if (this.budget) {
      for (const usage of result.tokenUsage) {
        const allowed = this.budget.consume(
          { promptTokens: usage.promptTokens, completionTokens: usage.completionTokens, totalTokens: usage.totalTokens },
          'default',
          stage,
          usage.round === 0 ? 'generation' : 'fix',
        );
        if (!allowed) {
          return {
            success: false,
            code: result.output,
            rounds: result.rounds,
            errors: result.errors,
            tokenUsage: result.tokenUsage,
            message: 'Token budget exceeded during skeleton generation',
          };
        }
      }
    }

    return {
      success: result.success,
      code: result.output,
      rounds: result.rounds,
      errors: result.errors,
      tokenUsage: result.tokenUsage,
      message: result.message,
    };
  }
}
