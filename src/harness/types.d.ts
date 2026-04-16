/**
 * ANFSF V4 Layer 8.5 - Agent Harness Type Definitions
 *
 * Agent harness types for testing, deployment, and ownership arbitration.
 * Supports canary deployment, A/B testing, statistical significance, and automatic rollback.
 */
/** Test scenario status */
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
/** Deployment status */
export type DeploymentStatus = 'pending' | 'deploying' | 'canary' | 'rolling' | 'complete' | 'rolled_back' | 'failed';
/** Policy type */
export type PolicyType = 'routing' | 'budget' | 'veto' | 'ownership' | 'optimization';
/**
 * TestScenario - Defines a test scenario to run
 */
export interface TestScenario {
    /** Unique scenario ID */
    id: string;
    /** Scenario name */
    name: string;
    /** Scenario description */
    description?: string;
    /** Test type */
    type: 'unit' | 'integration' | 'e2e' | 'load' | 'chaos';
    /** Test configuration */
    config: TestConfig;
    /** Expected outcomes */
    expectedOutcomes: ExpectedOutcome[];
    /** Success criteria */
    successCriteria: SuccessCriteria;
    /** Timeout in milliseconds */
    timeout?: number;
    /** Number of retries */
    retries?: number;
}
/**
 * TestConfig - Configuration for test execution
 */
export interface TestConfig {
    /** Environment variables */
    env?: Record<string, string>;
    /** Test data */
    testData?: any;
    /** Mock configurations */
    mocks?: Record<string, any>;
    /** Resource limits */
    resourceLimits?: {
        maxMemoryMB?: number;
        maxCPU?: number;
        maxDuration?: number;
    };
    /** Parallel execution */
    parallel?: boolean;
    /** Number of workers */
    workers?: number;
}
/**
 * ExpectedOutcome - Expected test outcome
 */
export interface ExpectedOutcome {
    /** Metric name */
    metric: string;
    /** Expected operator */
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'contains';
    /** Expected value */
    expectedValue: any;
    /** Tolerance (for numeric comparisons) */
    tolerance?: number;
}
/**
 * SuccessCriteria - Criteria for test success
 */
export interface SuccessCriteria {
    /** Minimum pass rate (0-1) */
    minPassRate?: number;
    /** Maximum error rate (0-1) */
    maxErrorRate?: number;
    /** Required metrics */
    requiredMetrics?: string[];
    /** Statistical significance threshold (p-value) */
    significanceThreshold?: number;
    /** Minimum sample size */
    minSampleSize?: number;
}
/**
 * TestResult - Result of test execution
 */
export interface TestResult {
    /** Whether test passed */
    passed: boolean;
    /** Test scenario ID */
    scenarioId: string;
    /** Test status */
    status: TestStatus;
    /** Metrics collected */
    metrics: Record<string, any>;
    /** Error message (if failed) */
    error?: string;
    /** Stack trace (if failed) */
    stackTrace?: string;
    /** Whether approval is required */
    requiresApproval?: boolean;
    /** Execution time in milliseconds */
    executionTime: number;
    /** Sample size */
    sampleSize?: number;
    /** Statistical significance (p-value) */
    pValue?: number;
    /** Confidence interval */
    confidenceInterval?: {
        lower: number;
        upper: number;
        confidence: number;
    };
}
/**
 * Policy - Deployment policy
 */
export interface Policy {
    /** Policy ID */
    id: string;
    /** Policy name */
    name: string;
    /** Policy type */
    type: PolicyType;
    /** Policy version */
    version: string;
    /** Policy configuration */
    config: any;
    /** Policy description */
    description?: string;
    /** Rollback policy */
    rollbackPolicy?: RollbackPolicy;
}
/**
 * RollbackPolicy - Configuration for automatic rollback
 */
export interface RollbackPolicy {
    /** Enable automatic rollback */
    enabled: boolean;
    /** Rollback triggers */
    triggers: Array<{
        metric: string;
        operator: 'gt' | 'lt' | 'gte' | 'lte';
        threshold: number;
    }>;
    /** Rollback delay in milliseconds */
    delayMs?: number;
    /** Notify on rollback */
    notify?: string[];
}
/**
 * CanaryOptions - Options for canary deployment
 */
export interface CanaryOptions {
    /** Canary stages (traffic percentages) */
    stages?: number[];
    /** Stage duration in milliseconds */
    stageDurationMs?: number;
    /** Metrics to monitor */
    monitorMetrics?: string[];
    /** Auto-promote if healthy */
    autoPromote?: boolean;
    /** Rollback on failure */
    rollbackOnFailure?: boolean;
    /** Statistical significance check */
    significanceCheck?: {
        enabled: boolean;
        threshold: number;
        minSampleSize: number;
    };
}
/**
 * DeploymentResult - Result of deployment
 */
export interface DeploymentResult {
    /** Deployment ID */
    deploymentId: string;
    /** Deployment status */
    status: DeploymentStatus;
    /** Current stage (for canary) */
    currentStage?: number;
    /** Traffic percentage */
    trafficPercentage?: number;
    /** Deployment start time */
    startTime: number;
    /** Deployment end time (if completed) */
    endTime?: number;
    /** Metrics summary */
    metricsSummary?: Record<string, any>;
    /** Rollback information */
    rollbackInfo?: {
        triggered: boolean;
        reason?: string;
        timestamp?: number;
    };
    /** Approval status */
    approvalStatus?: 'pending' | 'approved' | 'rejected';
}
/**
 * OwnershipCheck - Ownership lattice check request
 */
export interface OwnershipCheck {
    /** Resource type */
    resourceType: string;
    /** Resource path */
    resourcePath: string;
    /** Action to perform */
    action: string;
    /** Requesting role ID */
    roleId: string;
    /** Optional subpath */
    subpath?: string;
}
/**
 * OwnershipCheckResult - Result of ownership check
 */
export interface OwnershipCheckResult {
    /** Whether access is allowed */
    allowed: boolean;
    /** Owning role ID */
    owningRoleId?: string;
    /** Reason for decision */
    reason?: string;
    /** Required approvals */
    requiredApprovals?: string[];
    /** Budget impact */
    budgetImpact?: number;
}
/**
 * PersonalizationBudget - Budget for personalization
 */
export interface PersonalizationBudget {
    /** Budget ID */
    id: string;
    /** Role ID */
    roleId: string;
    /** Current budget value */
    current: number;
    /** Maximum budget limit */
    limit: number;
    /** Budget type */
    type: 'interface' | 'cognitive' | 'decision';
    /** Last updated timestamp */
    updatedAt: number;
}
/**
 * PersonalizationBudgetController - Controller for budget management
 */
export interface PersonalizationBudgetController {
    /** Get budget for role */
    getBudget: (roleId: string, type: string) => Promise<PersonalizationBudget>;
    /** Update budget */
    updateBudget: (roleId: string, type: string, delta: number) => Promise<PersonalizationBudget>;
    /** Check if operation is within budget */
    checkBudget: (roleId: string, type: string, cost: number) => Promise<boolean>;
    /** Reset budget */
    resetBudget: (roleId: string, type: string) => Promise<void>;
}
/**
 * ABTestConfig - A/B test configuration
 */
export interface ABTestConfig {
    /** Test ID */
    testId: string;
    /** Test name */
    name: string;
    /** Variants */
    variants: Array<{
        id: string;
        name: string;
        config: any;
        trafficPercentage: number;
    }>;
    /** Target metric */
    targetMetric: string;
    /** Minimum sample size per variant */
    minSampleSize: number;
    /** Significance threshold */
    significanceThreshold: number;
    /** Maximum duration in milliseconds */
    maxDurationMs?: number;
}
/**
 * ABTestResult - A/B test result
 */
export interface ABTestResult {
    /** Test ID */
    testId: string;
    /** Test status */
    status: 'running' | 'complete' | 'inconclusive';
    /** Variant results */
    variantResults: Array<{
        variantId: string;
        sampleSize: number;
        metricValue: number;
        confidenceInterval: {
            lower: number;
            upper: number;
            confidence: number;
        };
    }>;
    /** Winner (if determined) */
    winner?: string;
    /** Statistical significance */
    significance?: {
        pValue: number;
        isSignificant: boolean;
        effectSize: number;
    };
    /** Recommendation */
    recommendation?: 'variant_a' | 'variant_b' | 'no_difference' | 'inconclusive';
}
/**
 * AgentHarnessConfig - Configuration for agent harness
 */
export interface AgentHarnessConfig {
    /** Ownership lattice endpoint */
    ownershipLatticeUrl?: string;
    /** Default significance threshold */
    defaultSignificanceThreshold?: number;
    /** Default canary stages */
    defaultCanaryStages?: number[];
    /** Enable automatic rollback */
    enableAutoRollback?: boolean;
    /** Budget controller */
    budgetController?: PersonalizationBudgetController | null;
    /** Metrics endpoint */
    metricsEndpoint?: string;
    /** Enable detailed logging */
    enableLogging?: boolean;
}
export declare function isTestResult(obj: any): obj is TestResult;
export declare function isDeploymentResult(obj: any): obj is DeploymentResult;
export declare function isOwnershipCheckResult(obj: any): obj is OwnershipCheckResult;
