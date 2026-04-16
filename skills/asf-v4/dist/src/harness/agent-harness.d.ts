/**
 * ANFSF V4 Layer 8.5 - Agent Harness Implementation
 *
 * Agent harness for testing, deployment, and ownership arbitration.
 * Features: ownership checks, statistical significance, canary deployment, automatic rollback.
 */
import { TestScenario, TestResult, Policy, DeploymentResult, CanaryOptions, AgentHarnessConfig } from './types';
/**
 * AgentHarness - Harness for testing and deploying agent policies
 */
export declare class AgentHarness {
    private config;
    private ownershipLattice;
    private budgetController;
    private activeDeployments;
    private testResults;
    private logBuffer;
    constructor(config?: AgentHarnessConfig);
    /**
     * Run a test scenario
     */
    runTest(scenario: TestScenario): Promise<TestResult>;
    /**
     * Deploy with canary rollout
     */
    deployWithCanary(newPolicy: Policy, options?: CanaryOptions): Promise<DeploymentResult>;
    /**
     * Rollback a deployment
     */
    rollback(deploymentId: string): Promise<void>;
    private executeTest;
    private evaluateSuccessCriteria;
    private monitorMetrics;
    private checkRollbackTriggers;
    private checkStatisticalSignificance;
    private sleep;
    private log;
    /** Get deployment status */
    getDeployment(deploymentId: string): DeploymentResult | null;
    /** Get all active deployments */
    getActiveDeployments(): DeploymentResult[];
    /** Get test result */
    getTestResult(scenarioId: string): TestResult | null;
    /** Get logs */
    getLogs(limit?: number): string[];
    /** Set ownership rule */
    setOwnership(resourceType: string, resourcePath: string, roleId: string): void;
    /**
     * Test style loading to prevent FOUC (Flash of Unstyled Content).
     *
     * Checks:
     * - Critical CSS is inlined
     * - External stylesheets load successfully
     * - No style flash during page load
     */
    testStyleLoading(page: any): Promise<TestResult>;
    /**
     * Run comprehensive style readiness check.
     *
     * Combines style loading test with resource probing.
     */
    checkStyleReadiness(page: any, styleUrls?: string[]): Promise<{
        passed: boolean;
        testResult: TestResult;
        missingStyles: string[];
        recommendations: string[];
    }>;
}
export default AgentHarness;
