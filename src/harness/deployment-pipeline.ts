/**
 * ANFSF V1.5.0 - Deployment Pipeline with External Review
 * 
 * Integrates Inline Guard + External Review Agent双层审核架构.
 */

import { ExternalReviewAgent, ReviewPayload } from '../agents/external-review-agent';
import { CodeQualityGuardSkill } from '../skills/code-quality-guard-skill';
import { HallucinationGuardSkill } from '../skills/hallucination-guard-skill';
import { RefinedGraph } from '../skills/requirement-refiner-skill';

// ============================================================================
// Types
// ============================================================================

export interface DeploymentResult {
  success: boolean;
  stage: 'inline_guard' | 'external_review' | 'canary' | 'production';
  reason?: string;
  traceId?: string;
}

export interface GuardResult {
  passed: boolean;
  score?: number;
  reason?: string;
  details?: any;
}

// ============================================================================
// Deployment Pipeline
// ============================================================================

export class DeploymentPipeline {
  private inlineGuard: CodeQualityGuardSkill;
  private hallucinationGuard: HallucinationGuardSkill;
  private externalReviewAgent: ExternalReviewAgent;

  constructor(
    inlineGuard: CodeQualityGuardSkill,
    hallucinationGuard: HallucinationGuardSkill,
    externalReviewAgent: ExternalReviewAgent
  ) {
    this.inlineGuard = inlineGuard;
    this.hallucinationGuard = hallucinationGuard;
    this.externalReviewAgent = externalReviewAgent;
  }

  /**
   * Deploy generated code through双层审核.
   */
  async deploy(
    generatedCode: string,
    requirementGraph: RefinedGraph
  ): Promise<DeploymentResult> {
    const traceId = this.generateTraceId();

    // ========== 阶段 1: Inline Guard (实时约束，<10ms) ==========
    const guardResult = await this.runInlineGuard(generatedCode, requirementGraph, traceId);
    if (!guardResult.passed) {
      await this.triggerSelfHealing(generatedCode, guardResult, traceId);
      return {
        success: false,
        stage: 'inline_guard',
        reason: guardResult.reason,
        traceId,
      };
    }

    // ========== 阶段 2: External Review Agent (最终仲裁，50-300ms) ==========
    const reviewPayload: ReviewPayload = {
      generatedCode,
      requirementGraph,
      traceId,
      timestamp: Date.now(),
    };

    const reviewResult = await this.externalReviewAgent.review(reviewPayload);

    if (!reviewResult.passed) {
      // External review failed → veto deployment
      await this.graphAddEvent({
        type: 'ExternalReviewFailed',
        traceId,
        issues: reviewResult.issues,
        score: reviewResult.score,
        hasVeto: reviewResult.hasVeto,
        timestamp: Date.now(),
      });

      return {
        success: false,
        stage: 'external_review',
        reason: reviewResult.hasVeto ? 'veto' : `score_below_threshold: ${reviewResult.score}`,
        traceId,
      };
    }

    // ========== 阶段 3: 金丝雀部署 ==========
    return this.canaryDeploy(generatedCode, traceId);
  }

  /**
   * Run inline guard checks.
   */
  private async runInlineGuard(
    code: string,
    graph: RefinedGraph,
    traceId: string
  ): Promise<GuardResult> {
    // Parallel execution of all inline guards (<10ms target)
    const [qualityResult, hallucinationResult] = await Promise.all([
      this.inlineGuard.execute({ code, graph }),
      this.hallucinationGuard.execute({
        generatedText: code,
        sources: graph.nodes.map(n => ({ id: n.id, content: n.content, type: 'graph_node' as const, reliability: 0.9 })),
        mode: 'standard',
        enableGraphValidation: true,
      }),
    ]);

    // Combine results
    if (!qualityResult.passed) {
      return {
        passed: false,
        reason: `quality_guard_failed: ${qualityResult.reason}`,
        details: qualityResult,
      };
    }

    if (!hallucinationResult.passed) {
      return {
        passed: false,
        reason: `hallucination_guard_failed: confidence ${hallucinationResult.overallConfidence}`,
        details: hallucinationResult,
      };
    }

    return { passed: true };
  }

  /**
   * Trigger self-healing when inline guard fails.
   */
  private async triggerSelfHealing(
    code: string,
    guardResult: GuardResult,
    traceId: string
  ): Promise<void> {
    await this.graphAddEvent({
      type: 'SelfHealingTriggered',
      traceId,
      reason: guardResult.reason,
      timestamp: Date.now(),
    });

    // In production, trigger code regeneration
    console.log('[DeploymentPipeline] Self-healing triggered:', guardResult.reason);
  }

  /**
   * Add event to graph (simulated).
   */
  private async graphAddEvent(event: any): Promise<void> {
    // In production, add to GraphRAG event log
    console.log('[DeploymentPipeline] Graph event:', event);
  }

  /**
   * Canary deployment.
   */
  private async canaryDeploy(code: string, traceId: string): Promise<DeploymentResult> {
    // In production, integrate with existing CanaryDeployer
    console.log('[DeploymentPipeline] Canary deployment started:', traceId);

    // Simulated canary deployment
    return {
      success: true,
      stage: 'canary',
      traceId,
    };
  }

  /**
   * Generate trace ID.
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createDeploymentPipeline(
  inlineGuard: CodeQualityGuardSkill,
  hallucinationGuard: HallucinationGuardSkill,
  externalReviewAgent: ExternalReviewAgent
): DeploymentPipeline {
  return new DeploymentPipeline(inlineGuard, hallucinationGuard, externalReviewAgent);
}
