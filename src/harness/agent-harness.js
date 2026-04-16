"use strict";
/**
 * ANFSF V4 Layer 8.5 - Agent Harness Implementation
 *
 * Agent harness for testing, deployment, and ownership arbitration.
 * Features: ownership checks, statistical significance, canary deployment, automatic rollback.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentHarness = void 0;
// ============================================================================
// Constants
// ============================================================================
const DEFAULT_CONFIG = {
    defaultSignificanceThreshold: 0.05,
    defaultCanaryStages: [0.01, 0.05, 0.2, 0.5, 1.0],
    enableAutoRollback: true,
    enableLogging: true,
    budgetController: null,
};
const DEFAULT_CANARY_OPTIONS = {
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
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
/** Get current timestamp */
function now() {
    return Date.now();
}
/** Calculate statistical significance (simplified t-test) */
function calculateSignificance(groupA, groupB) {
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
function normalCDF(x) {
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
    constructor() {
        this.ownershipRules = new Map();
    }
    async check(check) {
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
    setOwnership(resourceType, resourcePath, roleId) {
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
class AgentHarness {
    constructor(config = {}) {
        this.config = {
            defaultSignificanceThreshold: 0.05,
            defaultCanaryStages: [0.01, 0.05, 0.2, 0.5, 1.0],
            enableAutoRollback: true,
            enableLogging: true,
            budgetController: null,
            ...config,
        };
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
    async runTest(scenario) {
        const startTime = now();
        this.log(`[AgentHarness] Running test: ${scenario.name}`);
        // Create test result placeholder
        const result = {
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
                const ownershipCheck = {
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
                const significance = calculateSignificance(testMetrics.groupA, testMetrics.groupB);
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
                }
                else {
                    result.passed = true;
                    result.status = 'passed';
                }
            }
            else {
                // Simple pass/fail based on metrics
                result.passed = this.evaluateSuccessCriteria(testMetrics, scenario.successCriteria);
                result.status = result.passed ? 'passed' : 'failed';
            }
            // Check if approval is required
            if (!result.passed && scenario.retries && scenario.retries > 0) {
                result.requiresApproval = true;
            }
        }
        catch (error) {
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
    async deployWithCanary(newPolicy, options = {}) {
        const deploymentId = generateUUID();
        const mergedOptions = { ...DEFAULT_CANARY_OPTIONS, ...options };
        this.log(`[AgentHarness] Starting canary deployment: ${newPolicy.name}`);
        // Check ownership before deployment
        const ownershipCheck = {
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
        const deployment = {
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
                    const significance = await this.checkStatisticalSignificance(metrics, mergedOptions.significanceCheck.threshold, mergedOptions.significanceCheck.minSampleSize);
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
        }
        catch (error) {
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
    async rollback(deploymentId) {
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
    async executeTest(scenario) {
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
    evaluateSuccessCriteria(metrics, criteria) {
        const minPassRate = criteria.minPassRate || 0.9;
        const maxErrorRate = criteria.maxErrorRate || 0.1;
        const passRate = metrics.passRate || metrics.successRate || 1;
        const errorRate = metrics.errorRate || 0;
        return passRate >= minPassRate && errorRate <= maxErrorRate;
    }
    async monitorMetrics(metrics) {
        // Mock metrics monitoring
        await this.sleep(50);
        return {
            error_rate: 0.02 + Math.random() * 0.01,
            latency_p99: 400 + Math.random() * 100,
            success_rate: 0.97 + Math.random() * 0.02,
        };
    }
    checkRollbackTriggers(metrics, rollbackPolicy) {
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
    async checkStatisticalSignificance(metrics, threshold, minSampleSize) {
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
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    log(message) {
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
    getDeployment(deploymentId) {
        return this.activeDeployments.get(deploymentId) || null;
    }
    /** Get all active deployments */
    getActiveDeployments() {
        return Array.from(this.activeDeployments.values());
    }
    /** Get test result */
    getTestResult(scenarioId) {
        return this.testResults.get(scenarioId) || null;
    }
    /** Get logs */
    getLogs(limit = 100) {
        return this.logBuffer.slice(-limit);
    }
    /** Set ownership rule */
    setOwnership(resourceType, resourcePath, roleId) {
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
    async testStyleLoading(page) {
        const startTime = now();
        this.log('[AgentHarness] Testing style loading...');
        const result = {
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
                // @ts-ignore - browser context
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
            const styleRequests = [];
            const failedStyles = [];
            page.on('response', async (response) => {
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
                // @ts-ignore - browser context
                const stylesheets = Array.from(document.styleSheets);
                // @ts-ignore - browser context
                const inlineStyles = document.querySelectorAll('style');
                return stylesheets.length + inlineStyles.length;
            });
            // Check 5: Verify no FOUC (check if body is visible before styles load)
            const foucDetected = await page.evaluate(() => {
                // @ts-ignore - browser context
                const body = document.body;
                // @ts-ignore - browser context
                const computedStyle = window.getComputedStyle(body);
                // @ts-ignore - browser context
                return computedStyle.opacity === '1' &&
                    computedStyle.visibility === 'visible' &&
                    // @ts-ignore - browser context
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
        }
        catch (error) {
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
    async checkStyleReadiness(page, styleUrls = []) {
        const recommendations = [];
        const missingStyles = [];
        // Run style loading test
        const testResult = await this.testStyleLoading(page);
        // Check for missing external styles
        if (styleUrls.length > 0) {
            for (const url of styleUrls) {
                const isLoaded = await page.evaluate((styleUrl) => {
                    // @ts-ignore - browser context has document
                    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
                    // @ts-ignore - browser context
                    return links.some((link) => link.href === styleUrl);
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
exports.AgentHarness = AgentHarness;
// ============================================================================
// Exports
// ============================================================================
exports.default = AgentHarness;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnQtaGFybmVzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFnZW50LWhhcm5lc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOzs7QUFrQkgsK0VBQStFO0FBQy9FLFlBQVk7QUFDWiwrRUFBK0U7QUFFL0UsTUFBTSxjQUFjLEdBQXVCO0lBQ3pDLDRCQUE0QixFQUFFLElBQUk7SUFDbEMsbUJBQW1CLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO0lBQ2hELGtCQUFrQixFQUFFLElBQUk7SUFDeEIsYUFBYSxFQUFFLElBQUk7SUFDbkIsZ0JBQWdCLEVBQUUsSUFBSTtDQUN2QixDQUFDO0FBRUYsTUFBTSxzQkFBc0IsR0FBNEI7SUFDdEQsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztJQUNuQyxlQUFlLEVBQUUsTUFBTSxFQUFFLHNCQUFzQjtJQUMvQyxjQUFjLEVBQUUsQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLGNBQWMsQ0FBQztJQUM3RCxXQUFXLEVBQUUsSUFBSTtJQUNqQixpQkFBaUIsRUFBRSxJQUFJO0lBQ3ZCLGlCQUFpQixFQUFFO1FBQ2pCLE9BQU8sRUFBRSxJQUFJO1FBQ2IsU0FBUyxFQUFFLElBQUk7UUFDZixhQUFhLEVBQUUsR0FBRztLQUNuQjtDQUNGLENBQUM7QUFFRiwrRUFBK0U7QUFDL0UsbUJBQW1CO0FBQ25CLCtFQUErRTtBQUUvRSxvQkFBb0I7QUFDcEIsU0FBUyxZQUFZO0lBQ25CLE9BQU8sc0NBQXNDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ25FLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsR0FB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LENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUM7Z0JBQzNELGVBQWUsQ0FBQyxJQUFJLENBQUMsK0NBQStDLENBQUMsQ0FBQztZQUN4RSxDQUFDO1lBQ0QsSUFBSSxVQUFVLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pELGVBQWUsQ0FBQyxJQUFJLENBQUMsc0VBQXNFLENBQUMsQ0FBQztZQUMvRixDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM3QixlQUFlLENBQUMsSUFBSSxDQUFDLDRCQUE0QixhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvRSxDQUFDO1FBRUQsSUFBSSxVQUFVLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxDQUFDO1lBQ3JDLGVBQWUsQ0FBQyxJQUFJLENBQUMsaUZBQWlGLENBQUMsQ0FBQztRQUMxRyxDQUFDO1FBRUQsT0FBTztZQUNMLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUN2RCxVQUFVO1lBQ1YsYUFBYTtZQUNiLGVBQWU7U0FDaEIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTVsQkQsb0NBNGxCQztBQUVELCtFQUErRTtBQUMvRSxVQUFVO0FBQ1YsK0VBQStFO0FBRS9FLGtCQUFlLFlBQVksQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQU5GU0YgVjQgTGF5ZXIgOC41IC0gQWdlbnQgSGFybmVzcyBJbXBsZW1lbnRhdGlvblxuICogXG4gKiBBZ2VudCBoYXJuZXNzIGZvciB0ZXN0aW5nLCBkZXBsb3ltZW50LCBhbmQgb3duZXJzaGlwIGFyYml0cmF0aW9uLlxuICogRmVhdHVyZXM6IG93bmVyc2hpcCBjaGVja3MsIHN0YXRpc3RpY2FsIHNpZ25pZmljYW5jZSwgY2FuYXJ5IGRlcGxveW1lbnQsIGF1dG9tYXRpYyByb2xsYmFjay5cbiAqL1xuXG5pbXBvcnQge1xuICBUZXN0U2NlbmFyaW8sXG4gIFRlc3RSZXN1bHQsXG4gIFRlc3RTdGF0dXMsXG4gIFBvbGljeSxcbiAgRGVwbG95bWVudFJlc3VsdCxcbiAgRGVwbG95bWVudFN0YXR1cyxcbiAgQ2FuYXJ5T3B0aW9ucyxcbiAgT3duZXJzaGlwQ2hlY2ssXG4gIE93bmVyc2hpcENoZWNrUmVzdWx0LFxuICBBZ2VudEhhcm5lc3NDb25maWcsXG4gIFBlcnNvbmFsaXphdGlvbkJ1ZGdldENvbnRyb2xsZXIsXG4gIGlzVGVzdFJlc3VsdCxcbiAgaXNEZXBsb3ltZW50UmVzdWx0LFxufSBmcm9tICcuL3R5cGVzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmNvbnN0IERFRkFVTFRfQ09ORklHOiBBZ2VudEhhcm5lc3NDb25maWcgPSB7XG4gIGRlZmF1bHRTaWduaWZpY2FuY2VUaHJlc2hvbGQ6IDAuMDUsXG4gIGRlZmF1bHRDYW5hcnlTdGFnZXM6IFswLjAxLCAwLjA1LCAwLjIsIDAuNSwgMS4wXSxcbiAgZW5hYmxlQXV0b1JvbGxiYWNrOiB0cnVlLFxuICBlbmFibGVMb2dnaW5nOiB0cnVlLFxuICBidWRnZXRDb250cm9sbGVyOiBudWxsLFxufTtcblxuY29uc3QgREVGQVVMVF9DQU5BUllfT1BUSU9OUzogUmVxdWlyZWQ8Q2FuYXJ5T3B0aW9ucz4gPSB7XG4gIHN0YWdlczogWzAuMDEsIDAuMDUsIDAuMiwgMC41LCAxLjBdLFxuICBzdGFnZUR1cmF0aW9uTXM6IDMwMDAwMCwgLy8gNSBtaW51dGVzIHBlciBzdGFnZVxuICBtb25pdG9yTWV0cmljczogWydlcnJvcl9yYXRlJywgJ2xhdGVuY3lfcDk5JywgJ3N1Y2Nlc3NfcmF0ZSddLFxuICBhdXRvUHJvbW90ZTogdHJ1ZSxcbiAgcm9sbGJhY2tPbkZhaWx1cmU6IHRydWUsXG4gIHNpZ25pZmljYW5jZUNoZWNrOiB7XG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgICB0aHJlc2hvbGQ6IDAuMDUsXG4gICAgbWluU2FtcGxlU2l6ZTogMTAwLFxuICB9LFxufTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSGVscGVyIEZ1bmN0aW9uc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKiogR2VuZXJhdGUgVVVJRCAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKCk6IHN0cmluZyB7XG4gIHJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIChjKSA9PiB7XG4gICAgY29uc3QgciA9IChNYXRoLnJhbmRvbSgpICogMTYpIHwgMDtcbiAgICBjb25zdCB2ID0gYyA9PT0gJ3gnID8gciA6IChyICYgMHgzKSB8IDB4ODtcbiAgICByZXR1cm4gdi50b1N0cmluZygxNik7XG4gIH0pO1xufVxuXG4vKiogR2V0IGN1cnJlbnQgdGltZXN0YW1wICovXG5mdW5jdGlvbiBub3coKTogbnVtYmVyIHtcbiAgcmV0dXJuIERhdGUubm93KCk7XG59XG5cbi8qKiBDYWxjdWxhdGUgc3RhdGlzdGljYWwgc2lnbmlmaWNhbmNlIChzaW1wbGlmaWVkIHQtdGVzdCkgKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZVNpZ25pZmljYW5jZShcbiAgZ3JvdXBBOiB7IG1lYW46IG51bWJlcjsgdmFyaWFuY2U6IG51bWJlcjsgc2l6ZTogbnVtYmVyIH0sXG4gIGdyb3VwQjogeyBtZWFuOiBudW1iZXI7IHZhcmlhbmNlOiBudW1iZXI7IHNpemU6IG51bWJlciB9XG4pOiB7IHBWYWx1ZTogbnVtYmVyOyBpc1NpZ25pZmljYW50OiBib29sZWFuOyBlZmZlY3RTaXplOiBudW1iZXIgfSB7XG4gIGNvbnN0IHsgbWVhbjogbWVhbkEsIHZhcmlhbmNlOiB2YXJBLCBzaXplOiBuQSB9ID0gZ3JvdXBBO1xuICBjb25zdCB7IG1lYW46IG1lYW5CLCB2YXJpYW5jZTogdmFyQiwgc2l6ZTogbkIgfSA9IGdyb3VwQjtcblxuICAvLyBQb29sZWQgc3RhbmRhcmQgZXJyb3JcbiAgY29uc3Qgc2UgPSBNYXRoLnNxcnQodmFyQSAvIG5BICsgdmFyQiAvIG5CKTtcbiAgXG4gIGlmIChzZSA9PT0gMCkge1xuICAgIHJldHVybiB7IHBWYWx1ZTogMSwgaXNTaWduaWZpY2FudDogZmFsc2UsIGVmZmVjdFNpemU6IDAgfTtcbiAgfVxuXG4gIC8vIFQtc3RhdGlzdGljXG4gIGNvbnN0IHRTdGF0ID0gTWF0aC5hYnMobWVhbkEgLSBtZWFuQikgLyBzZTtcblxuICAvLyBTaW1wbGlmaWVkIHAtdmFsdWUgYXBwcm94aW1hdGlvbiAoZm9yIGxhcmdlIHNhbXBsZXMpXG4gIGNvbnN0IHBWYWx1ZSA9IDIgKiAoMSAtIG5vcm1hbENERih0U3RhdCkpO1xuXG4gIC8vIEVmZmVjdCBzaXplIChDb2hlbidzIGQpXG4gIGNvbnN0IHBvb2xlZFN0ZCA9IE1hdGguc3FydCgoKG5BIC0gMSkgKiB2YXJBICsgKG5CIC0gMSkgKiB2YXJCKSAvIChuQSArIG5CIC0gMikpO1xuICBjb25zdCBlZmZlY3RTaXplID0gcG9vbGVkU3RkID4gMCA/IE1hdGguYWJzKG1lYW5BIC0gbWVhbkIpIC8gcG9vbGVkU3RkIDogMDtcblxuICByZXR1cm4ge1xuICAgIHBWYWx1ZSxcbiAgICBpc1NpZ25pZmljYW50OiBwVmFsdWUgPCAwLjA1LFxuICAgIGVmZmVjdFNpemUsXG4gIH07XG59XG5cbi8qKiBOb3JtYWwgQ0RGIGFwcHJveGltYXRpb24gKi9cbmZ1bmN0aW9uIG5vcm1hbENERih4OiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCB0ID0gMSAvICgxICsgMC4yMzE2NDE5ICogTWF0aC5hYnMoeCkpO1xuICBjb25zdCBkID0gMC4zOTg5NDIzICogTWF0aC5leHAoLXggKiB4IC8gMik7XG4gIGNvbnN0IHByb2IgPSBkICogdCAqICgwLjMxOTM4MTUgKyB0ICogKC0wLjM1NjU2MzggKyB0ICogKDEuNzgxNDc4ICsgdCAqICgtMS44MjEyNTYgKyB0ICogMS4zMzAyNzQpKSkpO1xuICByZXR1cm4geCA+IDAgPyAxIC0gcHJvYiA6IHByb2I7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE1vY2sgT3duZXJzaGlwIExhdHRpY2Vcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBNb2NrT3duZXJzaGlwTGF0dGljZSAtIFNpbXBsaWZpZWQgb3duZXJzaGlwIGxhdHRpY2UgZm9yIGRlbW9cbiAqL1xuY2xhc3MgTW9ja093bmVyc2hpcExhdHRpY2Uge1xuICBwcml2YXRlIG93bmVyc2hpcFJ1bGVzOiBNYXA8c3RyaW5nLCBzdHJpbmc+OyAvLyByZXNvdXJjZVBhdGggLT4gcm9sZUlkXG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5vd25lcnNoaXBSdWxlcyA9IG5ldyBNYXAoKTtcbiAgfVxuXG4gIGFzeW5jIGNoZWNrKGNoZWNrOiBPd25lcnNoaXBDaGVjayk6IFByb21pc2U8T3duZXJzaGlwQ2hlY2tSZXN1bHQ+IHtcbiAgICBjb25zdCByZXNvdXJjZUtleSA9IGAke2NoZWNrLnJlc291cmNlVHlwZX06JHtjaGVjay5yZXNvdXJjZVBhdGh9YDtcbiAgICBjb25zdCBvd25lciA9IHRoaXMub3duZXJzaGlwUnVsZXMuZ2V0KHJlc291cmNlS2V5KTtcblxuICAgIGlmICghb3duZXIpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFsbG93ZWQ6IHRydWUsXG4gICAgICAgIHJlYXNvbjogJ05vIG93bmVyc2hpcCBydWxlIGRlZmluZWQnLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCBhbGxvd2VkID0gb3duZXIgPT09IGNoZWNrLnJvbGVJZDtcblxuICAgIHJldHVybiB7XG4gICAgICBhbGxvd2VkLFxuICAgICAgb3duaW5nUm9sZUlkOiBvd25lcixcbiAgICAgIHJlYXNvbjogYWxsb3dlZCA/ICdPd25lciBtYXRjaCcgOiBgQWNjZXNzIGRlbmllZDogb3duZXIgaXMgJHtvd25lcn1gLFxuICAgICAgcmVxdWlyZWRBcHByb3ZhbHM6IGFsbG93ZWQgPyBbXSA6IFtvd25lcl0sXG4gICAgICBidWRnZXRJbXBhY3Q6IGFsbG93ZWQgPyAwIDogMTAsXG4gICAgfTtcbiAgfVxuXG4gIHNldE93bmVyc2hpcChyZXNvdXJjZVR5cGU6IHN0cmluZywgcmVzb3VyY2VQYXRoOiBzdHJpbmcsIHJvbGVJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgcmVzb3VyY2VLZXkgPSBgJHtyZXNvdXJjZVR5cGV9OiR7cmVzb3VyY2VQYXRofWA7XG4gICAgdGhpcy5vd25lcnNoaXBSdWxlcy5zZXQocmVzb3VyY2VLZXksIHJvbGVJZCk7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQWdlbnRIYXJuZXNzIENsYXNzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQWdlbnRIYXJuZXNzIC0gSGFybmVzcyBmb3IgdGVzdGluZyBhbmQgZGVwbG95aW5nIGFnZW50IHBvbGljaWVzXG4gKi9cbmV4cG9ydCBjbGFzcyBBZ2VudEhhcm5lc3Mge1xuICBwcml2YXRlIGNvbmZpZzogUmVxdWlyZWQ8QWdlbnRIYXJuZXNzQ29uZmlnPjtcbiAgcHJpdmF0ZSBvd25lcnNoaXBMYXR0aWNlOiBNb2NrT3duZXJzaGlwTGF0dGljZTtcbiAgcHJpdmF0ZSBidWRnZXRDb250cm9sbGVyOiBQZXJzb25hbGl6YXRpb25CdWRnZXRDb250cm9sbGVyIHwgbnVsbDtcbiAgcHJpdmF0ZSBhY3RpdmVEZXBsb3ltZW50czogTWFwPHN0cmluZywgRGVwbG95bWVudFJlc3VsdD47XG4gIHByaXZhdGUgdGVzdFJlc3VsdHM6IE1hcDxzdHJpbmcsIFRlc3RSZXN1bHQ+O1xuICBwcml2YXRlIGxvZ0J1ZmZlcjogc3RyaW5nW107XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBBZ2VudEhhcm5lc3NDb25maWcgPSB7fSkge1xuICAgIHRoaXMuY29uZmlnID0ge1xuICAgICAgZGVmYXVsdFNpZ25pZmljYW5jZVRocmVzaG9sZDogMC4wNSxcbiAgICAgIGRlZmF1bHRDYW5hcnlTdGFnZXM6IFswLjAxLCAwLjA1LCAwLjIsIDAuNSwgMS4wXSxcbiAgICAgIGVuYWJsZUF1dG9Sb2xsYmFjazogdHJ1ZSxcbiAgICAgIGVuYWJsZUxvZ2dpbmc6IHRydWUsXG4gICAgICBidWRnZXRDb250cm9sbGVyOiBudWxsLFxuICAgICAgLi4uY29uZmlnLFxuICAgIH0gYXMgUmVxdWlyZWQ8QWdlbnRIYXJuZXNzQ29uZmlnPjtcbiAgICB0aGlzLm93bmVyc2hpcExhdHRpY2UgPSBuZXcgTW9ja093bmVyc2hpcExhdHRpY2UoKTtcbiAgICB0aGlzLmJ1ZGdldENvbnRyb2xsZXIgPSBjb25maWcuYnVkZ2V0Q29udHJvbGxlciB8fCBudWxsO1xuICAgIHRoaXMuYWN0aXZlRGVwbG95bWVudHMgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy50ZXN0UmVzdWx0cyA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLmxvZ0J1ZmZlciA9IFtdO1xuXG4gICAgdGhpcy5sb2coJ1tBZ2VudEhhcm5lc3NdIEluaXRpYWxpemVkJyk7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIENvcmUgTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgLyoqXG4gICAqIFJ1biBhIHRlc3Qgc2NlbmFyaW9cbiAgICovXG4gIGFzeW5jIHJ1blRlc3Qoc2NlbmFyaW86IFRlc3RTY2VuYXJpbyk6IFByb21pc2U8VGVzdFJlc3VsdD4ge1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IG5vdygpO1xuICAgIHRoaXMubG9nKGBbQWdlbnRIYXJuZXNzXSBSdW5uaW5nIHRlc3Q6ICR7c2NlbmFyaW8ubmFtZX1gKTtcblxuICAgIC8vIENyZWF0ZSB0ZXN0IHJlc3VsdCBwbGFjZWhvbGRlclxuICAgIGNvbnN0IHJlc3VsdDogVGVzdFJlc3VsdCA9IHtcbiAgICAgIHBhc3NlZDogZmFsc2UsXG4gICAgICBzY2VuYXJpb0lkOiBzY2VuYXJpby5pZCxcbiAgICAgIHN0YXR1czogJ3J1bm5pbmcnLFxuICAgICAgbWV0cmljczoge30sXG4gICAgICBleGVjdXRpb25UaW1lOiAwLFxuICAgICAgc2FtcGxlU2l6ZTogMCxcbiAgICB9O1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIENoZWNrIG93bmVyc2hpcCBiZWZvcmUgcnVubmluZyB0ZXN0XG4gICAgICBpZiAoc2NlbmFyaW8uY29uZmlnLnRlc3REYXRhPy5yZXNvdXJjZVR5cGUgJiYgc2NlbmFyaW8uY29uZmlnLnRlc3REYXRhPy5yZXNvdXJjZVBhdGgpIHtcbiAgICAgICAgY29uc3Qgb3duZXJzaGlwQ2hlY2s6IE93bmVyc2hpcENoZWNrID0ge1xuICAgICAgICAgIHJlc291cmNlVHlwZTogc2NlbmFyaW8uY29uZmlnLnRlc3REYXRhLnJlc291cmNlVHlwZSxcbiAgICAgICAgICByZXNvdXJjZVBhdGg6IHNjZW5hcmlvLmNvbmZpZy50ZXN0RGF0YS5yZXNvdXJjZVBhdGgsXG4gICAgICAgICAgYWN0aW9uOiAndGVzdCcsXG4gICAgICAgICAgcm9sZUlkOiAndGVzdC1ydW5uZXInLFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IG93bmVyc2hpcFJlc3VsdCA9IGF3YWl0IHRoaXMub3duZXJzaGlwTGF0dGljZS5jaGVjayhvd25lcnNoaXBDaGVjayk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIW93bmVyc2hpcFJlc3VsdC5hbGxvd2VkKSB7XG4gICAgICAgICAgcmVzdWx0LnN0YXR1cyA9ICdmYWlsZWQnO1xuICAgICAgICAgIHJlc3VsdC5lcnJvciA9IGBPd25lcnNoaXAgY2hlY2sgZmFpbGVkOiAke293bmVyc2hpcFJlc3VsdC5yZWFzb259YDtcbiAgICAgICAgICByZXN1bHQucmVxdWlyZXNBcHByb3ZhbCA9IHRydWU7XG4gICAgICAgICAgcmVzdWx0LmV4ZWN1dGlvblRpbWUgPSBub3coKSAtIHN0YXJ0VGltZTtcbiAgICAgICAgICB0aGlzLnRlc3RSZXN1bHRzLnNldChzY2VuYXJpby5pZCwgcmVzdWx0KTtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEV4ZWN1dGUgdGVzdCAobW9jayBpbXBsZW1lbnRhdGlvbilcbiAgICAgIGNvbnN0IHRlc3RNZXRyaWNzID0gYXdhaXQgdGhpcy5leGVjdXRlVGVzdChzY2VuYXJpbyk7XG5cbiAgICAgIC8vIENhbGN1bGF0ZSBtZXRyaWNzXG4gICAgICByZXN1bHQubWV0cmljcyA9IHRlc3RNZXRyaWNzO1xuICAgICAgcmVzdWx0LnNhbXBsZVNpemUgPSB0ZXN0TWV0cmljcy5zYW1wbGVTaXplIHx8IDEwMDtcblxuICAgICAgLy8gQ2FsY3VsYXRlIHN0YXRpc3RpY2FsIHNpZ25pZmljYW5jZSBpZiBhcHBsaWNhYmxlXG4gICAgICBpZiAodGVzdE1ldHJpY3MuZ3JvdXBBICYmIHRlc3RNZXRyaWNzLmdyb3VwQikge1xuICAgICAgICBjb25zdCBzaWduaWZpY2FuY2UgPSBjYWxjdWxhdGVTaWduaWZpY2FuY2UoXG4gICAgICAgICAgdGVzdE1ldHJpY3MuZ3JvdXBBLFxuICAgICAgICAgIHRlc3RNZXRyaWNzLmdyb3VwQlxuICAgICAgICApO1xuICAgICAgICByZXN1bHQucFZhbHVlID0gc2lnbmlmaWNhbmNlLnBWYWx1ZTtcbiAgICAgICAgcmVzdWx0LmNvbmZpZGVuY2VJbnRlcnZhbCA9IHtcbiAgICAgICAgICBsb3dlcjogdGVzdE1ldHJpY3MuZ3JvdXBBLm1lYW4gLSB0ZXN0TWV0cmljcy5ncm91cEIubWVhbiAtIDEuOTYgKiBNYXRoLnNxcnQodGVzdE1ldHJpY3MuZ3JvdXBBLnZhcmlhbmNlIC8gdGVzdE1ldHJpY3MuZ3JvdXBBLnNpemUgKyB0ZXN0TWV0cmljcy5ncm91cEIudmFyaWFuY2UgLyB0ZXN0TWV0cmljcy5ncm91cEIuc2l6ZSksXG4gICAgICAgICAgdXBwZXI6IHRlc3RNZXRyaWNzLmdyb3VwQS5tZWFuIC0gdGVzdE1ldHJpY3MuZ3JvdXBCLm1lYW4gKyAxLjk2ICogTWF0aC5zcXJ0KHRlc3RNZXRyaWNzLmdyb3VwQS52YXJpYW5jZSAvIHRlc3RNZXRyaWNzLmdyb3VwQS5zaXplICsgdGVzdE1ldHJpY3MuZ3JvdXBCLnZhcmlhbmNlIC8gdGVzdE1ldHJpY3MuZ3JvdXBCLnNpemUpLFxuICAgICAgICAgIGNvbmZpZGVuY2U6IDAuOTUsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQ2hlY2sgc2lnbmlmaWNhbmNlIHRocmVzaG9sZFxuICAgICAgICBjb25zdCB0aHJlc2hvbGQgPSBzY2VuYXJpby5zdWNjZXNzQ3JpdGVyaWEuc2lnbmlmaWNhbmNlVGhyZXNob2xkIHx8IHRoaXMuY29uZmlnLmRlZmF1bHRTaWduaWZpY2FuY2VUaHJlc2hvbGQ7XG4gICAgICAgIGlmIChzaWduaWZpY2FuY2UucFZhbHVlID49IHRocmVzaG9sZCkge1xuICAgICAgICAgIHJlc3VsdC5wYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgICByZXN1bHQuc3RhdHVzID0gJ2ZhaWxlZCc7XG4gICAgICAgICAgcmVzdWx0LmVycm9yID0gYFN0YXRpc3RpY2FsIHNpZ25pZmljYW5jZSBub3QgcmVhY2hlZDogcD0ke3NpZ25pZmljYW5jZS5wVmFsdWUudG9GaXhlZCg0KX0gPj0gJHt0aHJlc2hvbGR9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQucGFzc2VkID0gdHJ1ZTtcbiAgICAgICAgICByZXN1bHQuc3RhdHVzID0gJ3Bhc3NlZCc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFNpbXBsZSBwYXNzL2ZhaWwgYmFzZWQgb24gbWV0cmljc1xuICAgICAgICByZXN1bHQucGFzc2VkID0gdGhpcy5ldmFsdWF0ZVN1Y2Nlc3NDcml0ZXJpYSh0ZXN0TWV0cmljcywgc2NlbmFyaW8uc3VjY2Vzc0NyaXRlcmlhKTtcbiAgICAgICAgcmVzdWx0LnN0YXR1cyA9IHJlc3VsdC5wYXNzZWQgPyAncGFzc2VkJyA6ICdmYWlsZWQnO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBpZiBhcHByb3ZhbCBpcyByZXF1aXJlZFxuICAgICAgaWYgKCFyZXN1bHQucGFzc2VkICYmIHNjZW5hcmlvLnJldHJpZXMgJiYgc2NlbmFyaW8ucmV0cmllcyA+IDApIHtcbiAgICAgICAgcmVzdWx0LnJlcXVpcmVzQXBwcm92YWwgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJlc3VsdC5zdGF0dXMgPSAnZmFpbGVkJztcbiAgICAgIHJlc3VsdC5lcnJvciA9IFN0cmluZyhlcnJvcik7XG4gICAgICByZXN1bHQuc3RhY2tUcmFjZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXN1bHQuZXhlY3V0aW9uVGltZSA9IG5vdygpIC0gc3RhcnRUaW1lO1xuICAgIHRoaXMudGVzdFJlc3VsdHMuc2V0KHNjZW5hcmlvLmlkLCByZXN1bHQpO1xuXG4gICAgdGhpcy5sb2coYFtBZ2VudEhhcm5lc3NdIFRlc3QgY29tcGxldGVkOiAke3NjZW5hcmlvLm5hbWV9IC0gJHtyZXN1bHQucGFzc2VkID8gJ1BBU1NFRCcgOiAnRkFJTEVEJ31gKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogRGVwbG95IHdpdGggY2FuYXJ5IHJvbGxvdXRcbiAgICovXG4gIGFzeW5jIGRlcGxveVdpdGhDYW5hcnkobmV3UG9saWN5OiBQb2xpY3ksIG9wdGlvbnM6IENhbmFyeU9wdGlvbnMgPSB7fSk6IFByb21pc2U8RGVwbG95bWVudFJlc3VsdD4ge1xuICAgIGNvbnN0IGRlcGxveW1lbnRJZCA9IGdlbmVyYXRlVVVJRCgpO1xuICAgIGNvbnN0IG1lcmdlZE9wdGlvbnM6IFJlcXVpcmVkPENhbmFyeU9wdGlvbnM+ID0geyAuLi5ERUZBVUxUX0NBTkFSWV9PUFRJT05TLCAuLi5vcHRpb25zIH07XG5cbiAgICB0aGlzLmxvZyhgW0FnZW50SGFybmVzc10gU3RhcnRpbmcgY2FuYXJ5IGRlcGxveW1lbnQ6ICR7bmV3UG9saWN5Lm5hbWV9YCk7XG5cbiAgICAvLyBDaGVjayBvd25lcnNoaXAgYmVmb3JlIGRlcGxveW1lbnRcbiAgICBjb25zdCBvd25lcnNoaXBDaGVjazogT3duZXJzaGlwQ2hlY2sgPSB7XG4gICAgICByZXNvdXJjZVR5cGU6ICdwb2xpY3knLFxuICAgICAgcmVzb3VyY2VQYXRoOiBuZXdQb2xpY3kuaWQsXG4gICAgICBhY3Rpb246ICdkZXBsb3knLFxuICAgICAgcm9sZUlkOiAnZGVwbG95ZXInLFxuICAgIH07XG5cbiAgICBjb25zdCBvd25lcnNoaXBSZXN1bHQgPSBhd2FpdCB0aGlzLm93bmVyc2hpcExhdHRpY2UuY2hlY2sob3duZXJzaGlwQ2hlY2spO1xuICAgIGlmICghb3duZXJzaGlwUmVzdWx0LmFsbG93ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgT3duZXJzaGlwIGNoZWNrIGZhaWxlZDogJHtvd25lcnNoaXBSZXN1bHQucmVhc29ufWApO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGJ1ZGdldFxuICAgIGlmICh0aGlzLmJ1ZGdldENvbnRyb2xsZXIpIHtcbiAgICAgIGNvbnN0IHdpdGhpbkJ1ZGdldCA9IGF3YWl0IHRoaXMuYnVkZ2V0Q29udHJvbGxlci5jaGVja0J1ZGdldCgnZGVwbG95ZXInLCAnZGVjaXNpb24nLCAxMDApO1xuICAgICAgaWYgKCF3aXRoaW5CdWRnZXQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdCdWRnZXQgZXhjZWVkZWQgZm9yIGRlcGxveW1lbnQnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgZGVwbG95bWVudCByZXN1bHRcbiAgICBjb25zdCBkZXBsb3ltZW50OiBEZXBsb3ltZW50UmVzdWx0ID0ge1xuICAgICAgZGVwbG95bWVudElkLFxuICAgICAgc3RhdHVzOiAncGVuZGluZycsXG4gICAgICBzdGFydFRpbWU6IG5vdygpLFxuICAgICAgYXBwcm92YWxTdGF0dXM6ICdwZW5kaW5nJyxcbiAgICB9O1xuXG4gICAgdGhpcy5hY3RpdmVEZXBsb3ltZW50cy5zZXQoZGVwbG95bWVudElkLCBkZXBsb3ltZW50KTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBFeGVjdXRlIGNhbmFyeSBzdGFnZXNcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWVyZ2VkT3B0aW9ucy5zdGFnZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3Qgc3RhZ2VQZXJjZW50YWdlID0gbWVyZ2VkT3B0aW9ucy5zdGFnZXNbaV07XG4gICAgICAgIGRlcGxveW1lbnQuY3VycmVudFN0YWdlID0gaSArIDE7XG4gICAgICAgIGRlcGxveW1lbnQudHJhZmZpY1BlcmNlbnRhZ2UgPSBzdGFnZVBlcmNlbnRhZ2UgKiAxMDA7XG4gICAgICAgIGRlcGxveW1lbnQuc3RhdHVzID0gJ2NhbmFyeSc7XG5cbiAgICAgICAgdGhpcy5sb2coYFtBZ2VudEhhcm5lc3NdIENhbmFyeSBzdGFnZSAke2kgKyAxfS8ke21lcmdlZE9wdGlvbnMuc3RhZ2VzLmxlbmd0aH06ICR7c3RhZ2VQZXJjZW50YWdlICogMTAwfSUgdHJhZmZpY2ApO1xuXG4gICAgICAgIC8vIFdhaXQgZm9yIHN0YWdlIGR1cmF0aW9uXG4gICAgICAgIGF3YWl0IHRoaXMuc2xlZXAobWVyZ2VkT3B0aW9ucy5zdGFnZUR1cmF0aW9uTXMpO1xuXG4gICAgICAgIC8vIE1vbml0b3IgbWV0cmljc1xuICAgICAgICBjb25zdCBtZXRyaWNzID0gYXdhaXQgdGhpcy5tb25pdG9yTWV0cmljcyhtZXJnZWRPcHRpb25zLm1vbml0b3JNZXRyaWNzKTtcbiAgICAgICAgZGVwbG95bWVudC5tZXRyaWNzU3VtbWFyeSA9IG1ldHJpY3M7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIHJvbGxiYWNrIHRyaWdnZXJzXG4gICAgICAgIGlmIChtZXJnZWRPcHRpb25zLnJvbGxiYWNrT25GYWlsdXJlKSB7XG4gICAgICAgICAgY29uc3Qgc2hvdWxkUm9sbGJhY2sgPSB0aGlzLmNoZWNrUm9sbGJhY2tUcmlnZ2VycyhtZXRyaWNzLCBuZXdQb2xpY3kucm9sbGJhY2tQb2xpY3kpO1xuICAgICAgICAgIGlmIChzaG91bGRSb2xsYmFjaykge1xuICAgICAgICAgICAgZGVwbG95bWVudC5zdGF0dXMgPSAncm9sbGVkX2JhY2snO1xuICAgICAgICAgICAgZGVwbG95bWVudC5yb2xsYmFja0luZm8gPSB7XG4gICAgICAgICAgICAgIHRyaWdnZXJlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgcmVhc29uOiAnTWV0cmljcyBleGNlZWRlZCB0aHJlc2hvbGQnLFxuICAgICAgICAgICAgICB0aW1lc3RhbXA6IG5vdygpLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlRGVwbG95bWVudHMuc2V0KGRlcGxveW1lbnRJZCwgZGVwbG95bWVudCk7XG4gICAgICAgICAgICB0aGlzLmxvZyhgW0FnZW50SGFybmVzc10gRGVwbG95bWVudCByb2xsZWQgYmFjazogJHtkZXBsb3ltZW50SWR9YCk7XG4gICAgICAgICAgICByZXR1cm4gZGVwbG95bWVudDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTdGF0aXN0aWNhbCBzaWduaWZpY2FuY2UgY2hlY2tcbiAgICAgICAgaWYgKG1lcmdlZE9wdGlvbnMuc2lnbmlmaWNhbmNlQ2hlY2suZW5hYmxlZCkge1xuICAgICAgICAgIGNvbnN0IHNpZ25pZmljYW5jZSA9IGF3YWl0IHRoaXMuY2hlY2tTdGF0aXN0aWNhbFNpZ25pZmljYW5jZShcbiAgICAgICAgICAgIG1ldHJpY3MsXG4gICAgICAgICAgICBtZXJnZWRPcHRpb25zLnNpZ25pZmljYW5jZUNoZWNrLnRocmVzaG9sZCxcbiAgICAgICAgICAgIG1lcmdlZE9wdGlvbnMuc2lnbmlmaWNhbmNlQ2hlY2subWluU2FtcGxlU2l6ZVxuICAgICAgICAgICk7XG5cbiAgICAgICAgICBpZiAoIXNpZ25pZmljYW5jZS5pc1NpZ25pZmljYW50ICYmIHN0YWdlUGVyY2VudGFnZSA8IDEuMCkge1xuICAgICAgICAgICAgdGhpcy5sb2coYFtBZ2VudEhhcm5lc3NdIFNpZ25pZmljYW5jZSBjaGVjayBmYWlsZWQgYXQgc3RhZ2UgJHtpICsgMX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gRGVwbG95bWVudCBjb21wbGV0ZVxuICAgICAgZGVwbG95bWVudC5zdGF0dXMgPSAnY29tcGxldGUnO1xuICAgICAgZGVwbG95bWVudC5lbmRUaW1lID0gbm93KCk7XG4gICAgICBkZXBsb3ltZW50LnRyYWZmaWNQZXJjZW50YWdlID0gMTAwO1xuICAgICAgZGVwbG95bWVudC5hcHByb3ZhbFN0YXR1cyA9ICdhcHByb3ZlZCc7XG5cbiAgICAgIHRoaXMubG9nKGBbQWdlbnRIYXJuZXNzXSBEZXBsb3ltZW50IGNvbXBsZXRlZDogJHtkZXBsb3ltZW50SWR9YCk7XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgZGVwbG95bWVudC5zdGF0dXMgPSAnZmFpbGVkJztcbiAgICAgIGRlcGxveW1lbnQuZW5kVGltZSA9IG5vdygpO1xuICAgICAgZGVwbG95bWVudC5yb2xsYmFja0luZm8gPSB7XG4gICAgICAgIHRyaWdnZXJlZDogdGhpcy5jb25maWcuZW5hYmxlQXV0b1JvbGxiYWNrLFxuICAgICAgICByZWFzb246IFN0cmluZyhlcnJvciksXG4gICAgICAgIHRpbWVzdGFtcDogbm93KCksXG4gICAgICB9O1xuXG4gICAgICBpZiAodGhpcy5jb25maWcuZW5hYmxlQXV0b1JvbGxiYWNrKSB7XG4gICAgICAgIGF3YWl0IHRoaXMucm9sbGJhY2soZGVwbG95bWVudElkKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5sb2coYFtBZ2VudEhhcm5lc3NdIERlcGxveW1lbnQgZmFpbGVkOiAke2RlcGxveW1lbnRJZH0gLSAke2Vycm9yfWApO1xuICAgIH1cblxuICAgIHRoaXMuYWN0aXZlRGVwbG95bWVudHMuc2V0KGRlcGxveW1lbnRJZCwgZGVwbG95bWVudCk7XG4gICAgcmV0dXJuIGRlcGxveW1lbnQ7XG4gIH1cblxuICAvKipcbiAgICogUm9sbGJhY2sgYSBkZXBsb3ltZW50XG4gICAqL1xuICBhc3luYyByb2xsYmFjayhkZXBsb3ltZW50SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGRlcGxveW1lbnQgPSB0aGlzLmFjdGl2ZURlcGxveW1lbnRzLmdldChkZXBsb3ltZW50SWQpO1xuICAgIFxuICAgIGlmICghZGVwbG95bWVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBEZXBsb3ltZW50IG5vdCBmb3VuZDogJHtkZXBsb3ltZW50SWR9YCk7XG4gICAgfVxuXG4gICAgdGhpcy5sb2coYFtBZ2VudEhhcm5lc3NdIFJvbGxpbmcgYmFjayBkZXBsb3ltZW50OiAke2RlcGxveW1lbnRJZH1gKTtcblxuICAgIGRlcGxveW1lbnQuc3RhdHVzID0gJ3JvbGxlZF9iYWNrJztcbiAgICBkZXBsb3ltZW50LnJvbGxiYWNrSW5mbyA9IHtcbiAgICAgIHRyaWdnZXJlZDogdHJ1ZSxcbiAgICAgIHJlYXNvbjogJ01hbnVhbCBvciBhdXRvbWF0aWMgcm9sbGJhY2snLFxuICAgICAgdGltZXN0YW1wOiBub3coKSxcbiAgICB9O1xuICAgIGRlcGxveW1lbnQudHJhZmZpY1BlcmNlbnRhZ2UgPSAwO1xuXG4gICAgLy8gVXBkYXRlIGJ1ZGdldCBjb250cm9sbGVyIGlmIGF2YWlsYWJsZVxuICAgIGlmICh0aGlzLmJ1ZGdldENvbnRyb2xsZXIpIHtcbiAgICAgIGF3YWl0IHRoaXMuYnVkZ2V0Q29udHJvbGxlci51cGRhdGVCdWRnZXQoJ2RlcGxveWVyJywgJ2RlY2lzaW9uJywgLTUwKTtcbiAgICB9XG5cbiAgICB0aGlzLmFjdGl2ZURlcGxveW1lbnRzLnNldChkZXBsb3ltZW50SWQsIGRlcGxveW1lbnQpO1xuICAgIHRoaXMubG9nKGBbQWdlbnRIYXJuZXNzXSBSb2xsYmFjayBjb21wbGV0ZWQ6ICR7ZGVwbG95bWVudElkfWApO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQcml2YXRlIE1ldGhvZHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVRlc3Qoc2NlbmFyaW86IFRlc3RTY2VuYXJpbyk6IFByb21pc2U8YW55PiB7XG4gICAgLy8gTW9jayB0ZXN0IGV4ZWN1dGlvblxuICAgIC8vIEluIHByb2R1Y3Rpb24sIHRoaXMgd291bGQgZXhlY3V0ZSB0aGUgYWN0dWFsIHRlc3Qgc2NlbmFyaW9cblxuICAgIGF3YWl0IHRoaXMuc2xlZXAoMTAwKTsgLy8gU2ltdWxhdGUgdGVzdCBleGVjdXRpb25cblxuICAgIC8vIFJldHVybiBtb2NrIG1ldHJpY3MgYmFzZWQgb24gdGVzdCB0eXBlXG4gICAgc3dpdGNoIChzY2VuYXJpby50eXBlKSB7XG4gICAgICBjYXNlICdsb2FkJzpcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzYW1wbGVTaXplOiAxMDAwLFxuICAgICAgICAgIGF2Z0xhdGVuY3k6IDE1MCxcbiAgICAgICAgICBwOTlMYXRlbmN5OiA0NTAsXG4gICAgICAgICAgZXJyb3JSYXRlOiAwLjAyLFxuICAgICAgICAgIHN1Y2Nlc3NSYXRlOiAwLjk4LFxuICAgICAgICB9O1xuICAgICAgY2FzZSAnaW50ZWdyYXRpb24nOlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNhbXBsZVNpemU6IDEwMCxcbiAgICAgICAgICBncm91cEE6IHsgbWVhbjogMC45NSwgdmFyaWFuY2U6IDAuMDEsIHNpemU6IDUwIH0sXG4gICAgICAgICAgZ3JvdXBCOiB7IG1lYW46IDAuOTIsIHZhcmlhbmNlOiAwLjAxLCBzaXplOiA1MCB9LFxuICAgICAgICB9O1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzYW1wbGVTaXplOiA1MCxcbiAgICAgICAgICBwYXNzUmF0ZTogMC45NixcbiAgICAgICAgICBlcnJvclJhdGU6IDAuMDQsXG4gICAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBldmFsdWF0ZVN1Y2Nlc3NDcml0ZXJpYShtZXRyaWNzOiBhbnksIGNyaXRlcmlhOiBhbnkpOiBib29sZWFuIHtcbiAgICBjb25zdCBtaW5QYXNzUmF0ZSA9IGNyaXRlcmlhLm1pblBhc3NSYXRlIHx8IDAuOTtcbiAgICBjb25zdCBtYXhFcnJvclJhdGUgPSBjcml0ZXJpYS5tYXhFcnJvclJhdGUgfHwgMC4xO1xuXG4gICAgY29uc3QgcGFzc1JhdGUgPSBtZXRyaWNzLnBhc3NSYXRlIHx8IG1ldHJpY3Muc3VjY2Vzc1JhdGUgfHwgMTtcbiAgICBjb25zdCBlcnJvclJhdGUgPSBtZXRyaWNzLmVycm9yUmF0ZSB8fCAwO1xuXG4gICAgcmV0dXJuIHBhc3NSYXRlID49IG1pblBhc3NSYXRlICYmIGVycm9yUmF0ZSA8PSBtYXhFcnJvclJhdGU7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG1vbml0b3JNZXRyaWNzKG1ldHJpY3M6IHN0cmluZ1tdKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBhbnk+PiB7XG4gICAgLy8gTW9jayBtZXRyaWNzIG1vbml0b3JpbmdcbiAgICBhd2FpdCB0aGlzLnNsZWVwKDUwKTtcblxuICAgIHJldHVybiB7XG4gICAgICBlcnJvcl9yYXRlOiAwLjAyICsgTWF0aC5yYW5kb20oKSAqIDAuMDEsXG4gICAgICBsYXRlbmN5X3A5OTogNDAwICsgTWF0aC5yYW5kb20oKSAqIDEwMCxcbiAgICAgIHN1Y2Nlc3NfcmF0ZTogMC45NyArIE1hdGgucmFuZG9tKCkgKiAwLjAyLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGNoZWNrUm9sbGJhY2tUcmlnZ2VycyhtZXRyaWNzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+LCByb2xsYmFja1BvbGljeT86IGFueSk6IGJvb2xlYW4ge1xuICAgIGlmICghcm9sbGJhY2tQb2xpY3kgfHwgIXJvbGxiYWNrUG9saWN5LnRyaWdnZXJzKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCB0cmlnZ2VyIG9mIHJvbGxiYWNrUG9saWN5LnRyaWdnZXJzKSB7XG4gICAgICBjb25zdCBtZXRyaWNWYWx1ZSA9IG1ldHJpY3NbdHJpZ2dlci5tZXRyaWNdO1xuICAgICAgaWYgKG1ldHJpY1ZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGxldCB0cmlnZ2VyZWQgPSBmYWxzZTtcbiAgICAgIHN3aXRjaCAodHJpZ2dlci5vcGVyYXRvcikge1xuICAgICAgICBjYXNlICdndCc6XG4gICAgICAgICAgdHJpZ2dlcmVkID0gbWV0cmljVmFsdWUgPiB0cmlnZ2VyLnRocmVzaG9sZDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnbHQnOlxuICAgICAgICAgIHRyaWdnZXJlZCA9IG1ldHJpY1ZhbHVlIDwgdHJpZ2dlci50aHJlc2hvbGQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2d0ZSc6XG4gICAgICAgICAgdHJpZ2dlcmVkID0gbWV0cmljVmFsdWUgPj0gdHJpZ2dlci50aHJlc2hvbGQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2x0ZSc6XG4gICAgICAgICAgdHJpZ2dlcmVkID0gbWV0cmljVmFsdWUgPD0gdHJpZ2dlci50aHJlc2hvbGQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmICh0cmlnZ2VyZWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjaGVja1N0YXRpc3RpY2FsU2lnbmlmaWNhbmNlKFxuICAgIG1ldHJpY3M6IFJlY29yZDxzdHJpbmcsIGFueT4sXG4gICAgdGhyZXNob2xkOiBudW1iZXIsXG4gICAgbWluU2FtcGxlU2l6ZTogbnVtYmVyXG4gICk6IFByb21pc2U8eyBwVmFsdWU6IG51bWJlcjsgaXNTaWduaWZpY2FudDogYm9vbGVhbiB9PiB7XG4gICAgLy8gTW9jayBzaWduaWZpY2FuY2UgY2hlY2tcbiAgICBhd2FpdCB0aGlzLnNsZWVwKDUwKTtcblxuICAgIGNvbnN0IHNhbXBsZVNpemUgPSBtZXRyaWNzLnNhbXBsZV9zaXplIHx8IDEwMDtcbiAgICBpZiAoc2FtcGxlU2l6ZSA8IG1pblNhbXBsZVNpemUpIHtcbiAgICAgIHJldHVybiB7IHBWYWx1ZTogMSwgaXNTaWduaWZpY2FudDogZmFsc2UgfTtcbiAgICB9XG5cbiAgICBjb25zdCBwVmFsdWUgPSAwLjAxICsgTWF0aC5yYW5kb20oKSAqIDAuMTtcbiAgICByZXR1cm4ge1xuICAgICAgcFZhbHVlLFxuICAgICAgaXNTaWduaWZpY2FudDogcFZhbHVlIDwgdGhyZXNob2xkLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHNsZWVwKG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XG4gIH1cblxuICBwcml2YXRlIGxvZyhtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jb25maWcuZW5hYmxlTG9nZ2luZykge1xuICAgICAgdGhpcy5sb2dCdWZmZXIucHVzaChgWyR7bm93KCl9XSAke21lc3NhZ2V9YCk7XG4gICAgICBpZiAodGhpcy5sb2dCdWZmZXIubGVuZ3RoID4gMTAwMCkge1xuICAgICAgICB0aGlzLmxvZ0J1ZmZlci5zaGlmdCgpO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2cobWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBVdGlsaXR5IE1ldGhvZHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIC8qKiBHZXQgZGVwbG95bWVudCBzdGF0dXMgKi9cbiAgZ2V0RGVwbG95bWVudChkZXBsb3ltZW50SWQ6IHN0cmluZyk6IERlcGxveW1lbnRSZXN1bHQgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5hY3RpdmVEZXBsb3ltZW50cy5nZXQoZGVwbG95bWVudElkKSB8fCBudWxsO1xuICB9XG5cbiAgLyoqIEdldCBhbGwgYWN0aXZlIGRlcGxveW1lbnRzICovXG4gIGdldEFjdGl2ZURlcGxveW1lbnRzKCk6IERlcGxveW1lbnRSZXN1bHRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5hY3RpdmVEZXBsb3ltZW50cy52YWx1ZXMoKSk7XG4gIH1cblxuICAvKiogR2V0IHRlc3QgcmVzdWx0ICovXG4gIGdldFRlc3RSZXN1bHQoc2NlbmFyaW9JZDogc3RyaW5nKTogVGVzdFJlc3VsdCB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLnRlc3RSZXN1bHRzLmdldChzY2VuYXJpb0lkKSB8fCBudWxsO1xuICB9XG5cbiAgLyoqIEdldCBsb2dzICovXG4gIGdldExvZ3MobGltaXQ6IG51bWJlciA9IDEwMCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gdGhpcy5sb2dCdWZmZXIuc2xpY2UoLWxpbWl0KTtcbiAgfVxuXG4gIC8qKiBTZXQgb3duZXJzaGlwIHJ1bGUgKi9cbiAgc2V0T3duZXJzaGlwKHJlc291cmNlVHlwZTogc3RyaW5nLCByZXNvdXJjZVBhdGg6IHN0cmluZywgcm9sZUlkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLm93bmVyc2hpcExhdHRpY2Uuc2V0T3duZXJzaGlwKHJlc291cmNlVHlwZSwgcmVzb3VyY2VQYXRoLCByb2xlSWQpO1xuICAgIHRoaXMubG9nKGBbQWdlbnRIYXJuZXNzXSBPd25lcnNoaXAgc2V0OiAke3Jlc291cmNlVHlwZX06JHtyZXNvdXJjZVBhdGh9IC0+ICR7cm9sZUlkfWApO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBWMS41LjAgTkVXOiBTdHlsZSBMb2FkaW5nIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvKipcbiAgICogVGVzdCBzdHlsZSBsb2FkaW5nIHRvIHByZXZlbnQgRk9VQyAoRmxhc2ggb2YgVW5zdHlsZWQgQ29udGVudCkuXG4gICAqIFxuICAgKiBDaGVja3M6XG4gICAqIC0gQ3JpdGljYWwgQ1NTIGlzIGlubGluZWRcbiAgICogLSBFeHRlcm5hbCBzdHlsZXNoZWV0cyBsb2FkIHN1Y2Nlc3NmdWxseVxuICAgKiAtIE5vIHN0eWxlIGZsYXNoIGR1cmluZyBwYWdlIGxvYWRcbiAgICovXG4gIGFzeW5jIHRlc3RTdHlsZUxvYWRpbmcocGFnZTogYW55KTogUHJvbWlzZTxUZXN0UmVzdWx0PiB7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gbm93KCk7XG4gICAgdGhpcy5sb2coJ1tBZ2VudEhhcm5lc3NdIFRlc3Rpbmcgc3R5bGUgbG9hZGluZy4uLicpO1xuXG4gICAgY29uc3QgcmVzdWx0OiBUZXN0UmVzdWx0ID0ge1xuICAgICAgcGFzc2VkOiBmYWxzZSxcbiAgICAgIHNjZW5hcmlvSWQ6ICdzdHlsZS1sb2FkaW5nLXRlc3QnLFxuICAgICAgc3RhdHVzOiAncnVubmluZycsXG4gICAgICBtZXRyaWNzOiB7fSxcbiAgICAgIGV4ZWN1dGlvblRpbWU6IDAsXG4gICAgICBzYW1wbGVTaXplOiAxLFxuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgLy8gV2FpdCBmb3IgcGFnZSB0byBiZSByZWFkeVxuICAgICAgYXdhaXQgcGFnZS53YWl0Rm9yTG9hZFN0YXRlKCdkb21jb250ZW50bG9hZGVkJyk7XG5cbiAgICAgIC8vIENoZWNrIDE6IENyaXRpY2FsIENTUyBpbmxpbmVkXG4gICAgICBjb25zdCBjcml0aWNhbElubGluZSA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4ge1xuICAgICAgICAvLyBAdHMtaWdub3JlIC0gYnJvd3NlciBjb250ZXh0XG4gICAgICAgIGNvbnN0IGNyaXRpY2FsU3R5bGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdzdHlsZVtkYXRhLWNyaXRpY2FsXScpO1xuICAgICAgICByZXR1cm4gY3JpdGljYWxTdHlsZSAhPT0gbnVsbDtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIWNyaXRpY2FsSW5saW5lKSB7XG4gICAgICAgIHJlc3VsdC5zdGF0dXMgPSAnZmFpbGVkJztcbiAgICAgICAgcmVzdWx0LmVycm9yID0gJ0NyaXRpY2FsIENTUyBub3QgaW5saW5lZCAtIG1heSBjYXVzZSBGT1VDJztcbiAgICAgICAgcmVzdWx0LmV4ZWN1dGlvblRpbWUgPSBub3coKSAtIHN0YXJ0VGltZTtcbiAgICAgICAgdGhpcy5sb2coJ1tBZ2VudEhhcm5lc3NdIFN0eWxlIGxvYWRpbmcgdGVzdCBGQUlMRUQ6IENyaXRpY2FsIENTUyBub3QgaW5saW5lZCcpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayAyOiBNb25pdG9yIHN0eWxlIHJlcXVlc3RzXG4gICAgICBjb25zdCBzdHlsZVJlcXVlc3RzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgY29uc3QgZmFpbGVkU3R5bGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgICBwYWdlLm9uKCdyZXNwb25zZScsIGFzeW5jIChyZXNwb25zZTogYW55KSA9PiB7XG4gICAgICAgIGNvbnN0IHVybCA9IHJlc3BvbnNlLnVybCgpO1xuICAgICAgICBjb25zdCB0eXBlID0gcmVzcG9uc2UucmVxdWVzdCgpLnJlc291cmNlVHlwZSgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGUgPT09ICdzdHlsZXNoZWV0JyB8fCB1cmwuZW5kc1dpdGgoJy5jc3MnKSkge1xuICAgICAgICAgIHN0eWxlUmVxdWVzdHMucHVzaCh1cmwpO1xuICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMoKSA+PSA0MDApIHtcbiAgICAgICAgICAgIGZhaWxlZFN0eWxlcy5wdXNoKHVybCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gUmVsb2FkIHBhZ2UgdG8gY2FwdHVyZSBzdHlsZSByZXF1ZXN0c1xuICAgICAgYXdhaXQgcGFnZS5yZWxvYWQoeyB3YWl0VW50aWw6ICduZXR3b3JraWRsZScsIHRpbWVvdXQ6IDEwMDAwIH0pO1xuXG4gICAgICAvLyBDaGVjayAzOiBWZXJpZnkgbm8gZmFpbGVkIHN0eWxlIHJlcXVlc3RzXG4gICAgICBpZiAoZmFpbGVkU3R5bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmVzdWx0LnN0YXR1cyA9ICdmYWlsZWQnO1xuICAgICAgICByZXN1bHQuZXJyb3IgPSBgRmFpbGVkIHRvIGxvYWQgJHtmYWlsZWRTdHlsZXMubGVuZ3RofSBzdHlsZXNoZWV0KHMpOiAke2ZhaWxlZFN0eWxlcy5qb2luKCcsICcpfWA7XG4gICAgICAgIHJlc3VsdC5leGVjdXRpb25UaW1lID0gbm93KCkgLSBzdGFydFRpbWU7XG4gICAgICAgIHRoaXMubG9nKGBbQWdlbnRIYXJuZXNzXSBTdHlsZSBsb2FkaW5nIHRlc3QgRkFJTEVEOiAke2ZhaWxlZFN0eWxlcy5sZW5ndGh9IHN0eWxlcyBmYWlsZWRgKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgNDogQ291bnQgdG90YWwgc3R5bGVzXG4gICAgICBjb25zdCBzdHlsZUNvdW50ID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiB7XG4gICAgICAgIC8vIEB0cy1pZ25vcmUgLSBicm93c2VyIGNvbnRleHRcbiAgICAgICAgY29uc3Qgc3R5bGVzaGVldHMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnN0eWxlU2hlZXRzKTtcbiAgICAgICAgLy8gQHRzLWlnbm9yZSAtIGJyb3dzZXIgY29udGV4dFxuICAgICAgICBjb25zdCBpbmxpbmVTdHlsZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdzdHlsZScpO1xuICAgICAgICByZXR1cm4gc3R5bGVzaGVldHMubGVuZ3RoICsgaW5saW5lU3R5bGVzLmxlbmd0aDtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBDaGVjayA1OiBWZXJpZnkgbm8gRk9VQyAoY2hlY2sgaWYgYm9keSBpcyB2aXNpYmxlIGJlZm9yZSBzdHlsZXMgbG9hZClcbiAgICAgIGNvbnN0IGZvdWNEZXRlY3RlZCA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4ge1xuICAgICAgICAvLyBAdHMtaWdub3JlIC0gYnJvd3NlciBjb250ZXh0XG4gICAgICAgIGNvbnN0IGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuICAgICAgICAvLyBAdHMtaWdub3JlIC0gYnJvd3NlciBjb250ZXh0XG4gICAgICAgIGNvbnN0IGNvbXB1dGVkU3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShib2R5KTtcbiAgICAgICAgLy8gQHRzLWlnbm9yZSAtIGJyb3dzZXIgY29udGV4dFxuICAgICAgICByZXR1cm4gY29tcHV0ZWRTdHlsZS5vcGFjaXR5ID09PSAnMScgJiYgXG4gICAgICAgICAgICAgICBjb21wdXRlZFN0eWxlLnZpc2liaWxpdHkgPT09ICd2aXNpYmxlJyAmJlxuICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSAtIGJyb3dzZXIgY29udGV4dFxuICAgICAgICAgICAgICAgIWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3N0eWxlW2RhdGEtY3JpdGljYWxdJyk7XG4gICAgICB9KTtcblxuICAgICAgLy8gQnVpbGQgbWV0cmljc1xuICAgICAgcmVzdWx0Lm1ldHJpY3MgPSB7XG4gICAgICAgIHN0eWxlQ291bnQsXG4gICAgICAgIGNyaXRpY2FsSW5saW5lOiB0cnVlLFxuICAgICAgICBmYWlsZWRTdHlsZXM6IGZhaWxlZFN0eWxlcy5sZW5ndGgsXG4gICAgICAgIHRvdGFsU3R5bGVSZXF1ZXN0czogc3R5bGVSZXF1ZXN0cy5sZW5ndGgsXG4gICAgICAgIGZvdWNEZXRlY3RlZCxcbiAgICAgIH07XG5cbiAgICAgIC8vIEZpbmFsIHBhc3MvZmFpbFxuICAgICAgcmVzdWx0LnBhc3NlZCA9IGNyaXRpY2FsSW5saW5lICYmIGZhaWxlZFN0eWxlcy5sZW5ndGggPT09IDA7XG4gICAgICByZXN1bHQuc3RhdHVzID0gcmVzdWx0LnBhc3NlZCA/ICdwYXNzZWQnIDogJ2ZhaWxlZCc7XG5cbiAgICAgIHRoaXMubG9nKGBbQWdlbnRIYXJuZXNzXSBTdHlsZSBsb2FkaW5nIHRlc3QgJHtyZXN1bHQucGFzc2VkID8gJ1BBU1NFRCcgOiAnRkFJTEVEJ306ICR7c3R5bGVDb3VudH0gc3R5bGVzLCBjcml0aWNhbD0ke2NyaXRpY2FsSW5saW5lfSwgZmFpbGVkPSR7ZmFpbGVkU3R5bGVzLmxlbmd0aH1gKTtcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXN1bHQuc3RhdHVzID0gJ2ZhaWxlZCc7XG4gICAgICByZXN1bHQuZXJyb3IgPSBgU3R5bGUgbG9hZGluZyB0ZXN0IGVycm9yOiAke2Vycm9yfWA7XG4gICAgICByZXN1bHQuc3RhY2tUcmFjZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA6IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMubG9nKGBbQWdlbnRIYXJuZXNzXSBTdHlsZSBsb2FkaW5nIHRlc3QgRVJST1I6ICR7ZXJyb3J9YCk7XG4gICAgfVxuXG4gICAgcmVzdWx0LmV4ZWN1dGlvblRpbWUgPSBub3coKSAtIHN0YXJ0VGltZTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIFJ1biBjb21wcmVoZW5zaXZlIHN0eWxlIHJlYWRpbmVzcyBjaGVjay5cbiAgICogXG4gICAqIENvbWJpbmVzIHN0eWxlIGxvYWRpbmcgdGVzdCB3aXRoIHJlc291cmNlIHByb2JpbmcuXG4gICAqL1xuICBhc3luYyBjaGVja1N0eWxlUmVhZGluZXNzKFxuICAgIHBhZ2U6IGFueSxcbiAgICBzdHlsZVVybHM6IHN0cmluZ1tdID0gW11cbiAgKTogUHJvbWlzZTx7XG4gICAgcGFzc2VkOiBib29sZWFuO1xuICAgIHRlc3RSZXN1bHQ6IFRlc3RSZXN1bHQ7XG4gICAgbWlzc2luZ1N0eWxlczogc3RyaW5nW107XG4gICAgcmVjb21tZW5kYXRpb25zOiBzdHJpbmdbXTtcbiAgfT4ge1xuICAgIGNvbnN0IHJlY29tbWVuZGF0aW9uczogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCBtaXNzaW5nU3R5bGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgLy8gUnVuIHN0eWxlIGxvYWRpbmcgdGVzdFxuICAgIGNvbnN0IHRlc3RSZXN1bHQgPSBhd2FpdCB0aGlzLnRlc3RTdHlsZUxvYWRpbmcocGFnZSk7XG5cbiAgICAvLyBDaGVjayBmb3IgbWlzc2luZyBleHRlcm5hbCBzdHlsZXNcbiAgICBpZiAoc3R5bGVVcmxzLmxlbmd0aCA+IDApIHtcbiAgICAgIGZvciAoY29uc3QgdXJsIG9mIHN0eWxlVXJscykge1xuICAgICAgICBjb25zdCBpc0xvYWRlZCA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKHN0eWxlVXJsOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAvLyBAdHMtaWdub3JlIC0gYnJvd3NlciBjb250ZXh0IGhhcyBkb2N1bWVudFxuICAgICAgICAgIGNvbnN0IGxpbmtzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdsaW5rW3JlbD1cInN0eWxlc2hlZXRcIl0nKSk7XG4gICAgICAgICAgLy8gQHRzLWlnbm9yZSAtIGJyb3dzZXIgY29udGV4dFxuICAgICAgICAgIHJldHVybiBsaW5rcy5zb21lKChsaW5rOiBhbnkpID0+IGxpbmsuaHJlZiA9PT0gc3R5bGVVcmwpO1xuICAgICAgICB9LCB1cmwpO1xuXG4gICAgICAgIGlmICghaXNMb2FkZWQpIHtcbiAgICAgICAgICBtaXNzaW5nU3R5bGVzLnB1c2godXJsKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEdlbmVyYXRlIHJlY29tbWVuZGF0aW9uc1xuICAgIGlmICghdGVzdFJlc3VsdC5wYXNzZWQpIHtcbiAgICAgIGlmICh0ZXN0UmVzdWx0LmVycm9yPy5pbmNsdWRlcygnQ3JpdGljYWwgQ1NTIG5vdCBpbmxpbmVkJykpIHtcbiAgICAgICAgcmVjb21tZW5kYXRpb25zLnB1c2goJ0lubGluZSBjcml0aWNhbCBDU1MgaW4gPGhlYWQ+IHRvIHByZXZlbnQgRk9VQycpO1xuICAgICAgfVxuICAgICAgaWYgKHRlc3RSZXN1bHQuZXJyb3I/LmluY2x1ZGVzKCdGYWlsZWQgdG8gbG9hZCcpKSB7XG4gICAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKCdFbnN1cmUgYWxsIGV4dGVybmFsIHN0eWxlc2hlZXRzIGFyZSBhY2Nlc3NpYmxlIGFuZCBsb2FkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtaXNzaW5nU3R5bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKGBBZGQgbWlzc2luZyBzdHlsZXNoZWV0czogJHttaXNzaW5nU3R5bGVzLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuXG4gICAgaWYgKHRlc3RSZXN1bHQubWV0cmljcz8uZm91Y0RldGVjdGVkKSB7XG4gICAgICByZWNvbW1lbmRhdGlvbnMucHVzaCgnSW1wbGVtZW50IEZPVUMgcHJvdGVjdGlvbiAoZS5nLiwgYm9keSB7IHZpc2liaWxpdHk6IGhpZGRlbiB9IHVudGlsIHN0eWxlcyBsb2FkKScpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBwYXNzZWQ6IHRlc3RSZXN1bHQucGFzc2VkICYmIG1pc3NpbmdTdHlsZXMubGVuZ3RoID09PSAwLFxuICAgICAgdGVzdFJlc3VsdCxcbiAgICAgIG1pc3NpbmdTdHlsZXMsXG4gICAgICByZWNvbW1lbmRhdGlvbnMsXG4gICAgfTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeHBvcnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBkZWZhdWx0IEFnZW50SGFybmVzcztcbiJdfQ==