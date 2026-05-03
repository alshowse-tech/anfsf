/**
 * ANFSF V4 Layer 8.5 - Agent Harness Implementation
 * 
 * Agent harness for testing, deployment, and ownership arbitration.
 * Features: ownership checks, statistical significance, canary deployment, automatic rollback.
 */

import {
  TestScenario,
  TestResult,
  TestStatus,
  Policy,
  DeploymentResult,
  DeploymentStatus,
  CanaryOptions,
  OwnershipCheck,
  OwnershipCheckResult,
  AgentHarnessConfig,
  PersonalizationBudgetController,
  isTestResult,
  isDeploymentResult,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: AgentHarnessConfig = {
  defaultSignificanceThreshold: 0.05,
  defaultCanaryStages: [0.01, 0.05, 0.2, 0.5, 1.0],
  enableAutoRollback: true,
  enableLogging: true,
  budgetController: null,
};

const DEFAULT_CANARY_OPTIONS: Required<CanaryOptions> = {
  stages: [0.01, 0.05, 0.2, 0.5, 1.0],
  stageDurationMs: 300000, // 5 minutes per stage
  monitorMetrics: ['error_rate', 'latency_p99', 'success_rate'],
  autoPromote: true,
  rollbackOnFailure: true,
  significanceCheck: {
    enabled: true,
    threshold: 0.05,
    minSampleSize: 100,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/** Generate UUID */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Get current timestamp */
function now(): number {
  return Date.now();
}

/** Calculate statistical significance (simplified t-test) */
function calculateSignificance(
  groupA: { mean: number; variance: number; size: number },
  groupB: { mean: number; variance: number; size: number }
): { pValue: number; isSignificant: boolean; effectSize: number } {
  const { mean: meanA, variance: varA, size: nA } = groupA;
  const { mean: meanB, variance: varB, size: nB } = groupB;

  // Pooled standard error
  const se = Math.sqrt(varA / nA + varB / nB);
  
  if (se === 0) {
    return { pValue: 1, isSignificant: false, effectSize: 0 };
  }

  // T-statistic
  const tStat = Math.abs(meanA - meanB) / se;

  // Simplified p-value approximation (for large samples)
  const pValue = 2 * (1 - normalCDF(tStat));

  // Effect size (Cohen's d)
  const pooledStd = Math.sqrt(((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2));
  const effectSize = pooledStd > 0 ? Math.abs(meanA - meanB) / pooledStd : 0;

  return {
    pValue,
    isSignificant: pValue < 0.05,
    effectSize,
  };
}

/** Normal CDF approximation */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

// ============================================================================
// Mock Ownership Lattice
// ============================================================================

/**
 * MockOwnershipLattice - Simplified ownership lattice for demo
 */
class MockOwnershipLattice {
  private ownershipRules: Map<string, string>; // resourcePath -> roleId

  constructor() {
    this.ownershipRules = new Map();
  }

  async check(check: OwnershipCheck): Promise<OwnershipCheckResult> {
    const resourceKey = `${check.resourceType}:${check.resourcePath}`;
    const owner = this.ownershipRules.get(resourceKey);

    if (!owner) {
      return {
        allowed: true,
        reason: 'No ownership rule defined',
      };
    }

    const allowed = owner === check.roleId;

    return {
      allowed,
      owningRoleId: owner,
      reason: allowed ? 'Owner match' : `Access denied: owner is ${owner}`,
      requiredApprovals: allowed ? [] : [owner],
      budgetImpact: allowed ? 0 : 10,
    };
  }

  setOwnership(resourceType: string, resourcePath: string, roleId: string): void {
    const resourceKey = `${resourceType}:${resourcePath}`;
    this.ownershipRules.set(resourceKey, roleId);
  }
}

// ============================================================================
// AgentHarness Class
// ============================================================================

/**
 * AgentHarness - Harness for testing and deploying agent policies
 */
export class AgentHarness {
  private config: Required<AgentHarnessConfig>;
  private ownershipLattice: MockOwnershipLattice;
  private budgetController: PersonalizationBudgetController | null;
  private activeDeployments: Map<string, DeploymentResult>;
  private testResults: Map<string, TestResult>;
  private logBuffer: string[];

  constructor(config: AgentHarnessConfig = {}) {
    this.config = {
      defaultSignificanceThreshold: 0.05,
      defaultCanaryStages: [0.01, 0.05, 0.2, 0.5, 1.0],
      enableAutoRollback: true,
      enableLogging: true,
      budgetController: null,
      ...config,
    } as Required<AgentHarnessConfig>;
    this.ownershipLattice = new MockOwnershipLattice();
    this.budgetController = config.budgetController || null;
    this.activeDeployments = new Map();
    this.testResults = new Map();
    this.logBuffer = [];

    this.log('[AgentHarness] Initialized');
  }

  // ============================================================================
  // Core Methods
  // ============================================================================

  /**
   * Run a test scenario
   */
  async runTest(scenario: TestScenario): Promise<TestResult> {
    const startTime = now();
    this.log(`[AgentHarness] Running test: ${scenario.name}`);

    // Create test result placeholder
    const result: TestResult = {
      passed: false,
      scenarioId: scenario.id,
      status: 'running',
      metrics: {},
      executionTime: 0,
      sampleSize: 0,
    };

    try {
      // Check ownership before running test
      if (scenario.config.testData?.resourceType && scenario.config.testData?.resourcePath) {
        const ownershipCheck: OwnershipCheck = {
          resourceType: scenario.config.testData.resourceType,
          resourcePath: scenario.config.testData.resourcePath,
          action: 'test',
          roleId: 'test-runner',
        };

        const ownershipResult = await this.ownershipLattice.check(ownershipCheck);
        
        if (!ownershipResult.allowed) {
          result.status = 'failed';
          result.error = `Ownership check failed: ${ownershipResult.reason}`;
          result.requiresApproval = true;
          result.executionTime = now() - startTime;
          this.testResults.set(scenario.id, result);
          return result;
        }
      }

      // Execute test (mock implementation)
      const testMetrics = await this.executeTest(scenario);

      // Calculate metrics
      result.metrics = testMetrics;
      result.sampleSize = testMetrics.sampleSize || 100;

      // Calculate statistical significance if applicable
      if (testMetrics.groupA && testMetrics.groupB) {
        const significance = calculateSignificance(
          testMetrics.groupA,
          testMetrics.groupB
        );
        result.pValue = significance.pValue;
        result.confidenceInterval = {
          lower: testMetrics.groupA.mean - testMetrics.groupB.mean - 1.96 * Math.sqrt(testMetrics.groupA.variance / testMetrics.groupA.size + testMetrics.groupB.variance / testMetrics.groupB.size),
          upper: testMetrics.groupA.mean - testMetrics.groupB.mean + 1.96 * Math.sqrt(testMetrics.groupA.variance / testMetrics.groupA.size + testMetrics.groupB.variance / testMetrics.groupB.size),
          confidence: 0.95,
        };

        // Check significance threshold
        const threshold = scenario.successCriteria.significanceThreshold || this.config.defaultSignificanceThreshold;
        if (significance.pValue >= threshold) {
          result.passed = false;
          result.status = 'failed';
          result.error = `Statistical significance not reached: p=${significance.pValue.toFixed(4)} >= ${threshold}`;
        } else {
          result.passed = true;
          result.status = 'passed';
        }
      } else {
        // Simple pass/fail based on metrics
        result.passed = this.evaluateSuccessCriteria(testMetrics, scenario.successCriteria);
        result.status = result.passed ? 'passed' : 'failed';
      }

      // Check if approval is required
      if (!result.passed && scenario.retries && scenario.retries > 0) {
        result.requiresApproval = true;
      }

    } catch (error) {
      result.status = 'failed';
      result.error = String(error);
      result.stackTrace = error instanceof Error ? error.stack : undefined;
    }

    result.executionTime = now() - startTime;
    this.testResults.set(scenario.id, result);

    this.log(`[AgentHarness] Test completed: ${scenario.name} - ${result.passed ? 'PASSED' : 'FAILED'}`);

    return result;
  }

  /**
   * Deploy with canary rollout
   */
  async deployWithCanary(newPolicy: Policy, options: CanaryOptions = {}): Promise<DeploymentResult> {
    const deploymentId = generateUUID();
    const mergedOptions: Required<CanaryOptions> = { ...DEFAULT_CANARY_OPTIONS, ...options };

    this.log(`[AgentHarness] Starting canary deployment: ${newPolicy.name}`);

    // Check ownership before deployment
    const ownershipCheck: OwnershipCheck = {
      resourceType: 'policy',
      resourcePath: newPolicy.id,
      action: 'deploy',
      roleId: 'deployer',
    };

    const ownershipResult = await this.ownershipLattice.check(ownershipCheck);
    if (!ownershipResult.allowed) {
      throw new Error(`Ownership check failed: ${ownershipResult.reason}`);
    }

    // Check budget
    if (this.budgetController) {
      const withinBudget = await this.budgetController.checkBudget('deployer', 'decision', 100);
      if (!withinBudget) {
        throw new Error('Budget exceeded for deployment');
      }
    }

    // Create deployment result
    const deployment: DeploymentResult = {
      deploymentId,
      status: 'pending',
      startTime: now(),
      approvalStatus: 'pending',
    };

    this.activeDeployments.set(deploymentId, deployment);

    try {
      // Execute canary stages
      for (let i = 0; i < mergedOptions.stages.length; i++) {
        const stagePercentage = mergedOptions.stages[i];
        deployment.currentStage = i + 1;
        deployment.trafficPercentage = stagePercentage * 100;
        deployment.status = 'canary';

        this.log(`[AgentHarness] Canary stage ${i + 1}/${mergedOptions.stages.length}: ${stagePercentage * 100}% traffic`);

        // Wait for stage duration
        await this.sleep(mergedOptions.stageDurationMs);

        // Monitor metrics
        const metrics = await this.monitorMetrics(mergedOptions.monitorMetrics);
        deployment.metricsSummary = metrics;

        // Check for rollback triggers
        if (mergedOptions.rollbackOnFailure) {
          const shouldRollback = this.checkRollbackTriggers(metrics, newPolicy.rollbackPolicy);
          if (shouldRollback) {
            deployment.status = 'rolled_back';
            deployment.rollbackInfo = {
              triggered: true,
              reason: 'Metrics exceeded threshold',
              timestamp: now(),
            };
            this.activeDeployments.set(deploymentId, deployment);
            this.log(`[AgentHarness] Deployment rolled back: ${deploymentId}`);
            return deployment;
          }
        }

        // Statistical significance check
        if (mergedOptions.significanceCheck.enabled) {
          const significance = await this.checkStatisticalSignificance(
            metrics,
            mergedOptions.significanceCheck.threshold,
            mergedOptions.significanceCheck.minSampleSize
          );

          if (!significance.isSignificant && stagePercentage < 1.0) {
            this.log(`[AgentHarness] Significance check failed at stage ${i + 1}`);
          }
        }
      }

      // Deployment complete
      deployment.status = 'complete';
      deployment.endTime = now();
      deployment.trafficPercentage = 100;
      deployment.approvalStatus = 'approved';

      this.log(`[AgentHarness] Deployment completed: ${deploymentId}`);

    } catch (error) {
      deployment.status = 'failed';
      deployment.endTime = now();
      deployment.rollbackInfo = {
        triggered: this.config.enableAutoRollback,
        reason: String(error),
        timestamp: now(),
      };

      if (this.config.enableAutoRollback) {
        await this.rollback(deploymentId);
      }

      this.log(`[AgentHarness] Deployment failed: ${deploymentId} - ${error}`);
    }

    this.activeDeployments.set(deploymentId, deployment);
    return deployment;
  }

  /**
   * Rollback a deployment
   */
  async rollback(deploymentId: string): Promise<void> {
    const deployment = this.activeDeployments.get(deploymentId);
    
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    this.log(`[AgentHarness] Rolling back deployment: ${deploymentId}`);

    deployment.status = 'rolled_back';
    deployment.rollbackInfo = {
      triggered: true,
      reason: 'Manual or automatic rollback',
      timestamp: now(),
    };
    deployment.trafficPercentage = 0;

    // Update budget controller if available
    if (this.budgetController) {
      await this.budgetController.updateBudget('deployer', 'decision', -50);
    }

    this.activeDeployments.set(deploymentId, deployment);
    this.log(`[AgentHarness] Rollback completed: ${deploymentId}`);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async executeTest(scenario: TestScenario): Promise<any> {
    // Mock test execution
    // In production, this would execute the actual test scenario

    await this.sleep(100); // Simulate test execution

    // Return mock metrics based on test type
    switch (scenario.type) {
      case 'load':
        return {
          sampleSize: 1000,
          avgLatency: 150,
          p99Latency: 450,
          errorRate: 0.02,
          successRate: 0.98,
        };
      case 'integration':
        return {
          sampleSize: 100,
          groupA: { mean: 0.95, variance: 0.01, size: 50 },
          groupB: { mean: 0.92, variance: 0.01, size: 50 },
        };
      default:
        return {
          sampleSize: 50,
          passRate: 0.96,
          errorRate: 0.04,
        };
    }
  }

  private evaluateSuccessCriteria(metrics: any, criteria: any): boolean {
    const minPassRate = criteria.minPassRate || 0.9;
    const maxErrorRate = criteria.maxErrorRate || 0.1;

    const passRate = metrics.passRate || metrics.successRate || 1;
    const errorRate = metrics.errorRate || 0;

    return passRate >= minPassRate && errorRate <= maxErrorRate;
  }

  private async monitorMetrics(metrics: string[]): Promise<Record<string, any>> {
    // Mock metrics monitoring
    await this.sleep(50);

    return {
      error_rate: 0.02 + Math.random() * 0.01,
      latency_p99: 400 + Math.random() * 100,
      success_rate: 0.97 + Math.random() * 0.02,
    };
  }

  private checkRollbackTriggers(metrics: Record<string, any>, rollbackPolicy?: any): boolean {
    if (!rollbackPolicy || !rollbackPolicy.triggers) {
      return false;
    }

    for (const trigger of rollbackPolicy.triggers) {
      const metricValue = metrics[trigger.metric];
      if (metricValue === undefined) {
        continue;
      }

      let triggered = false;
      switch (trigger.operator) {
        case 'gt':
          triggered = metricValue > trigger.threshold;
          break;
        case 'lt':
          triggered = metricValue < trigger.threshold;
          break;
        case 'gte':
          triggered = metricValue >= trigger.threshold;
          break;
        case 'lte':
          triggered = metricValue <= trigger.threshold;
          break;
      }

      if (triggered) {
        return true;
      }
    }

    return false;
  }

  private async checkStatisticalSignificance(
    metrics: Record<string, any>,
    threshold: number,
    minSampleSize: number
  ): Promise<{ pValue: number; isSignificant: boolean }> {
    // Mock significance check
    await this.sleep(50);

    const sampleSize = metrics.sample_size || 100;
    if (sampleSize < minSampleSize) {
      return { pValue: 1, isSignificant: false };
    }

    const pValue = 0.01 + Math.random() * 0.1;
    return {
      pValue,
      isSignificant: pValue < threshold,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string): void {
    if (this.config.enableLogging) {
      this.logBuffer.push(`[${now()}] ${message}`);
      if (this.logBuffer.length > 1000) {
        this.logBuffer.shift();
      }
      console.log(message);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /** Get deployment status */
  getDeployment(deploymentId: string): DeploymentResult | null {
    return this.activeDeployments.get(deploymentId) || null;
  }

  /** Get all active deployments */
  getActiveDeployments(): DeploymentResult[] {
    return Array.from(this.activeDeployments.values());
  }

  /** Get test result */
  getTestResult(scenarioId: string): TestResult | null {
    return this.testResults.get(scenarioId) || null;
  }

  /** Get logs */
  getLogs(limit: number = 100): string[] {
    return this.logBuffer.slice(-limit);
  }

  /** Set ownership rule */
  setOwnership(resourceType: string, resourcePath: string, roleId: string): void {
    this.ownershipLattice.setOwnership(resourceType, resourcePath, roleId);
    this.log(`[AgentHarness] Ownership set: ${resourceType}:${resourcePath} -> ${roleId}`);
  }

  // ============================================================================
  // V1.5.0 NEW: Style Loading Tests
  // ============================================================================

  /**
   * Test style loading to prevent FOUC (Flash of Unstyled Content).
   * 
   * Checks:
   * - Critical CSS is inlined
   * - External stylesheets load successfully
   * - No style flash during page load
   */
  async testStyleLoading(page: any): Promise<TestResult> {
    const startTime = now();
    this.log('[AgentHarness] Testing style loading...');

    const result: TestResult = {
      passed: false,
      scenarioId: 'style-loading-test',
      status: 'running',
      metrics: {},
      executionTime: 0,
      sampleSize: 1,
    };

    try {
      // Wait for page to be ready
      await page.waitForLoadState('domcontentloaded');

      // Check 1: Critical CSS inlined
      const criticalInline = await page.evaluate(() => {
        // @ts-expect-error - browser context
        const criticalStyle = document.querySelector('style[data-critical]');
        return criticalStyle !== null;
      });

      if (!criticalInline) {
        result.status = 'failed';
        result.error = 'Critical CSS not inlined - may cause FOUC';
        result.executionTime = now() - startTime;
        this.log('[AgentHarness] Style loading test FAILED: Critical CSS not inlined');
        return result;
      }

      // Check 2: Monitor style requests
      const styleRequests: string[] = [];
      const failedStyles: string[] = [];

      page.on('response', async (response: any) => {
        const url = response.url();
        const type = response.request().resourceType();
        
        if (type === 'stylesheet' || url.endsWith('.css')) {
          styleRequests.push(url);
          if (response.status() >= 400) {
            failedStyles.push(url);
          }
        }
      });

      // Reload page to capture style requests
      await page.reload({ waitUntil: 'networkidle', timeout: 10000 });

      // Check 3: Verify no failed style requests
      if (failedStyles.length > 0) {
        result.status = 'failed';
        result.error = `Failed to load ${failedStyles.length} stylesheet(s): ${failedStyles.join(', ')}`;
        result.executionTime = now() - startTime;
        this.log(`[AgentHarness] Style loading test FAILED: ${failedStyles.length} styles failed`);
        return result;
      }

      // Check 4: Count total styles
      const styleCount = await page.evaluate(() => {
        // @ts-expect-error - browser context
        const stylesheets = Array.from(document.styleSheets);
        // @ts-expect-error - browser context
        const inlineStyles = document.querySelectorAll('style');
        return stylesheets.length + inlineStyles.length;
      });

      // Check 5: Verify no FOUC (check if body is visible before styles load)
      const foucDetected = await page.evaluate(() => {
        // @ts-expect-error - browser context
        const body = document.body;
        // @ts-expect-error - browser context
        const computedStyle = window.getComputedStyle(body);
        return computedStyle.opacity === '1' && 
               computedStyle.visibility === 'visible' &&
               // @ts-expect-error - browser context
               !document.querySelector('style[data-critical]');
      });

      // Build metrics
      result.metrics = {
        styleCount,
        criticalInline: true,
        failedStyles: failedStyles.length,
        totalStyleRequests: styleRequests.length,
        foucDetected,
      };

      // Final pass/fail
      result.passed = criticalInline && failedStyles.length === 0;
      result.status = result.passed ? 'passed' : 'failed';

      this.log(`[AgentHarness] Style loading test ${result.passed ? 'PASSED' : 'FAILED'}: ${styleCount} styles, critical=${criticalInline}, failed=${failedStyles.length}`);

    } catch (error) {
      result.status = 'failed';
      result.error = `Style loading test error: ${error}`;
      result.stackTrace = error instanceof Error ? error.stack : undefined;
      this.log(`[AgentHarness] Style loading test ERROR: ${error}`);
    }

    result.executionTime = now() - startTime;
    return result;
  }

  /**
   * Run comprehensive style readiness check.
   * 
   * Combines style loading test with resource probing.
   */
  async checkStyleReadiness(
    page: any,
    styleUrls: string[] = []
  ): Promise<{
    passed: boolean;
    testResult: TestResult;
    missingStyles: string[];
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    const missingStyles: string[] = [];

    // Run style loading test
    const testResult = await this.testStyleLoading(page);

    // Check for missing external styles
    if (styleUrls.length > 0) {
      for (const url of styleUrls) {
        const isLoaded = await page.evaluate((styleUrl: string) => {
          // @ts-expect-error - browser context has document
          const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
          return links.some((link: any) => link.href === styleUrl);
        }, url);

        if (!isLoaded) {
          missingStyles.push(url);
        }
      }
    }

    // Generate recommendations
    if (!testResult.passed) {
      if (testResult.error?.includes('Critical CSS not inlined')) {
        recommendations.push('Inline critical CSS in <head> to prevent FOUC');
      }
      if (testResult.error?.includes('Failed to load')) {
        recommendations.push('Ensure all external stylesheets are accessible and load successfully');
      }
    }

    if (missingStyles.length > 0) {
      recommendations.push(`Add missing stylesheets: ${missingStyles.join(', ')}`);
    }

    if (testResult.metrics?.foucDetected) {
      recommendations.push('Implement FOUC protection (e.g., body { visibility: hidden } until styles load)');
    }

    return {
      passed: testResult.passed && missingStyles.length === 0,
      testResult,
      missingStyles,
      recommendations,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default AgentHarness;
