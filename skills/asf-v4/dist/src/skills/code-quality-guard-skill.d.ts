/**
 * ANFSF V1.5.0 - Code Quality Guard Skill
 *
 * Inline guard for code quality checking.
 * Integrated into Governance Harness.
 * Target latency: <10ms
 */
import { Skill, SkillResult } from './base';
export interface GuardResult extends SkillResult {
    passed: boolean;
    score?: number;
    reason?: string;
    details?: {
        staticResult?: StaticAnalysisResult;
        semanticResult?: SemanticValidationResult;
        performanceResult?: PerformancePredictionResult;
        policyResult?: PolicyCheckResult;
    };
}
export interface StaticAnalysisResult {
    passed: boolean;
    score: number;
    issues: string[];
    complexity?: number;
    readability?: number;
}
export interface SemanticValidationResult {
    passed: boolean;
    score: number;
    mismatches: string[];
}
export interface PerformancePredictionResult {
    passed: boolean;
    score: number;
    issues: string[];
    estimatedLatency?: number;
    estimatedMemory?: number;
}
export interface PolicyCheckResult {
    passed: boolean;
    score: number;
    violations: string[];
}
export declare class CodeQualityGuardSkill extends Skill {
    name: string;
    version: string;
    description: string;
    private readonly qualityThreshold;
    /**
     * Execute code quality guard checks.
     * Target: <10ms (parallel execution)
     */
    execute(ctx: any): Promise<GuardResult>;
    /**
     * Run static analysis (complexity, readability, security scan).
     */
    private runStaticAnalysis;
    /**
     * Run semantic validation (cross-validate with requirement graph).
     */
    private runSemanticValidation;
    /**
     * Run performance prediction (estimate latency and memory).
     */
    private runPerformancePrediction;
    /**
     * Run policy check (ownership, security, compliance).
     */
    private runPolicyCheck;
    /**
     * Calculate weighted overall score.
     */
    private calculateWeightedScore;
    /**
     * Get skill metadata.
     */
    getMetadata(): Record<string, any>;
}
/**
 * Create CodeQualityGuardSkill instance.
 */
export declare function createCodeQualityGuardSkill(): CodeQualityGuardSkill;
