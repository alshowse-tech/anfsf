/**
 * ANFSF V4 Layer 8.5 - A/B Test Runner Implementation
 *
 * A/B testing runner with statistical significance analysis.
 */
import { ABTestConfig, ABTestResult } from './types';
/**
 * ABTestRunner - Runs A/B tests with statistical analysis
 */
export declare class ABTestRunner {
    private config;
    private variantData;
    constructor(config: ABTestConfig);
    /**
     * Add sample to variant
     */
    addSample(variantId: string, value: number): void;
    /**
     * Get test results
     */
    getResults(): ABTestResult;
    /**
     * Check if test is complete
     */
    isComplete(): boolean;
    /**
     * Get current status
     */
    getStatus(): 'running' | 'complete' | 'inconclusive';
}
export default ABTestRunner;
