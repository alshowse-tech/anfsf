/**
 * ANFSF V1.5.0 - Deployment Pipeline with External Review
 *
 * Integrates Inline Guard + External Review Agent双层审核架构.
 */
import { ExternalReviewAgent } from '../agents/external-review-agent';
import { CodeQualityGuardSkill } from '../skills/code-quality-guard-skill';
import { HallucinationGuardSkill } from '../skills/hallucination-guard-skill';
import { RefinedGraph } from '../skills/requirement-refiner-skill';
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
export declare class DeploymentPipeline {
    private inlineGuard;
    private hallucinationGuard;
    private externalReviewAgent;
    constructor(inlineGuard: CodeQualityGuardSkill, hallucinationGuard: HallucinationGuardSkill, externalReviewAgent: ExternalReviewAgent);
    /**
     * Deploy generated code through双层审核.
     */
    deploy(generatedCode: string, requirementGraph: RefinedGraph): Promise<DeploymentResult>;
    /**
     * Run inline guard checks.
     */
    private runInlineGuard;
    /**
     * Trigger self-healing when inline guard fails.
     */
    private triggerSelfHealing;
    /**
     * Add event to graph (simulated).
     */
    private graphAddEvent;
    /**
     * Canary deployment.
     */
    private canaryDeploy;
    /**
     * Generate trace ID.
     */
    private generateTraceId;
}
export declare function createDeploymentPipeline(inlineGuard: CodeQualityGuardSkill, hallucinationGuard: HallucinationGuardSkill, externalReviewAgent: ExternalReviewAgent): DeploymentPipeline;
