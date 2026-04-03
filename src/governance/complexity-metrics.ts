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

const DEFAULT_CONFIG: FeaturePointConfig = {
  basePoints: 10,
  featureWeight: 2,
  integrationWeight: 5,
  complianceWeight: 10,
};

/**
 * Calculate governance complexity score.
 * Formula: (Harness Count × Average Code Lines) / Feature Points
 */
export function calculateComplexity(
  harnessCount: number,
  totalCodeLines: number,
  featureCount: number,
  integrationCount: number,
  complianceCount: number,
  config: FeaturePointConfig = DEFAULT_CONFIG
): number {
  // Calculate feature points
  const featurePoints =
    config.basePoints +
    featureCount * config.featureWeight +
    integrationCount * config.integrationWeight +
    complianceCount * config.complianceWeight;

  // Calculate average code lines per harness
  const averageCodeLines = totalCodeLines / harnessCount;

  // Calculate complexity score
  const complexityScore = (harnessCount * averageCodeLines) / featurePoints;

  return complexityScore;
}

/**
 * Collect complexity metrics from harnesses.
 */
export function collectMetrics(
  harnesses: Array<{ name: string; codeLines: number }>
): ComplexityMetrics {
  const harnessCount = harnesses.length;
  const totalCodeLines = harnesses.reduce((sum, h) => sum + h.codeLines, 0);
  const averageCodeLines = harnessCount > 0 ? totalCodeLines / harnessCount : 0;

  // Placeholder feature points (should be calculated from project profile)
  const featurePoints = 100; // Default

  const complexityScore = calculateComplexity(
    harnessCount,
    totalCodeLines,
    50, // featureCount
    10, // integrationCount
    2   // complianceCount
  );

  return {
    harnessCount,
    averageCodeLines,
    featurePoints,
    complexityScore,
    timestamp: Date.now(),
  };
}

/**
 * Compare complexity before and after optimization.
 */
export function compareComplexity(
  before: ComplexityMetrics,
  after: ComplexityMetrics
): {
  reduction: number;
  percentageReduction: number;
  improved: boolean;
} {
  const reduction = before.complexityScore - after.complexityScore;
  const percentageReduction = (reduction / before.complexityScore) * 100;

  return {
    reduction,
    percentageReduction,
    improved: reduction > 0,
  };
}

/**
 * Track L13-L17 layer utilization.
 */
export interface LayerUtilization {
  layer: number;
  callCount: number;
  totalCalls: number;
  utilizationRate: number;
}

export function calculateLayerUtilization(
  layerCalls: Map<number, number>,
  totalCalls: number
): LayerUtilization[] {
  const layers = [13, 14, 15, 16, 17];
  
  return layers.map((layer) => {
    const callCount = layerCalls.get(layer) || 0;
    const utilizationRate = totalCalls > 0 ? (callCount / totalCalls) * 100 : 0;
    
    return {
      layer,
      callCount,
      totalCalls,
      utilizationRate,
    };
  });
}

/**
 * Check if L13-L17 utilization meets threshold.
 */
export function checkLayerUtilizationThreshold(
  utilization: LayerUtilization[],
  threshold: number = 50
): {
  passed: boolean;
  averageUtilization: number;
  details: string;
} {
  const averageUtilization =
    utilization.reduce((sum, l) => sum + l.utilizationRate, 0) / utilization.length;

  return {
    passed: averageUtilization >= threshold,
    averageUtilization,
    details: `Average L13-L17 utilization: ${averageUtilization.toFixed(1)}% (threshold: ${threshold}%)`,
  };
}
