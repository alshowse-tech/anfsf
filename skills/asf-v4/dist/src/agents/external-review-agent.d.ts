/**
 * ANFSF V1.5.0 - External Review Agent
 *
 * Independent code auditor with veto power.
 * Deployed separately from main ANFSF architecture.
 * Does NOT share memory/reward/retriever with main system.
 */
export interface ReviewPayload {
    generatedCode: string;
    requirementGraph: any;
    traceId: string;
    timestamp: number;
}
export interface ReviewResult {
    passed: boolean;
    score: number;
    hasVeto: boolean;
    issues: string[];
    traceId: string;
    latency: number;
}
export interface AuditResult {
    criticalIssues: string[];
    majorIssues: string[];
    minorIssues: string[];
    hallucinationScore: number;
}
export declare class ExternalReviewAgent {
    private dbPool;
    private readonly SCORE_THRESHOLD;
    private readonly HALLUCINATION_THRESHOLD;
    constructor(dbConfig: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
    });
    /**
     * Review generated code with independent analysis.
     */
    review(payload: ReviewPayload): Promise<ReviewResult>;
    /**
     * Run independent static analysis.
     */
    private runStaticAnalysis;
    /**
     * Run independent model audit using qwen bailian.
     */
    private runModelAudit;
    /**
     * Compute final score from multiple factors.
     */
    private computeFinalScore;
    /**
     * Check veto conditions.
     */
    private checkVetoConditions;
    /**
     * Record KPI to independent database.
     */
    private recordKPI;
    /**
     * Get recent KPI metrics.
     */
    getRecentKPIs(limit?: number): Promise<any[]>;
    /**
     * Close database connection.
     */
    destroy(): Promise<void>;
}
export declare function createExternalReviewAgent(): ExternalReviewAgent;
