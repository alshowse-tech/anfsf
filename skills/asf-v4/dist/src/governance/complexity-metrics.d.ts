/**
 * ANFSF V1.5.0 - Governance Complexity Metrics
 *
 * Measures and tracks governance complexity for Layer 8.5 optimization.
 * Formula: (Harness Count × Average Code Lines) / Feature Points
 */
export interface ComplexityMetrics {
    harnessCount: number;
    averageCodeLines: number;
    featurePoints: number;
    complexityScore: number;
    timestamp: number;
}
export interface FeaturePointConfig {
    basePoints: number;
    featureWeight: number;
    integrationWeight: number;
    complianceWeight: number;
}
/**
 * Calculate governance complexity score.
 * Formula: (Harness Count × Average Code Lines) / Feature Points
 */
export declare function calculateComplexity(harnessCount: number, totalCodeLines: number, featureCount: number, integrationCount: number, complianceCount: number, config?: FeaturePointConfig): number;
/**
 * Collect complexity metrics from harnesses.
 */
export declare function collectMetrics(harnesses: Array<{
    name: string;
    codeLines: number;
}>): ComplexityMetrics;
/**
 * Compare complexity before and after optimization.
 */
export declare function compareComplexity(before: ComplexityMetrics, after: ComplexityMetrics): {
    reduction: number;
    percentageReduction: number;
    improved: boolean;
};
/**
 * Track L13-L17 layer utilization.
 */
export interface LayerUtilization {
    layer: number;
    callCount: number;
    totalCalls: number;
    utilizationRate: number;
}
export declare function calculateLayerUtilization(layerCalls: Map<number, number>, totalCalls: number): LayerUtilization[];
/**
 * Check if L13-L17 utilization meets threshold.
 */
export declare function checkLayerUtilizationThreshold(utilization: LayerUtilization[], threshold?: number): {
    passed: boolean;
    averageUtilization: number;
    details: string;
};
