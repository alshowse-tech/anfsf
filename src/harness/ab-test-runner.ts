/**
 * ANFSF V4 Layer 8.5 - A/B Test Runner Implementation
 * 
 * A/B testing runner with statistical significance analysis.
 */

import {
  ABTestConfig,
  ABTestResult,
} from './types';

// ============================================================================
// Helper Functions
// ============================================================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function now(): number {
  return Date.now();
}

/** Calculate statistical significance */
function calculateSignificance(
  variantA: { mean: number; variance: number; size: number },
  variantB: { mean: number; variance: number; size: number }
): { pValue: number; isSignificant: boolean; effectSize: number } {
  const se = Math.sqrt(variantA.variance / variantA.size + variantB.variance / variantB.size);
  
  if (se === 0) {
    return { pValue: 1, isSignificant: false, effectSize: 0 };
  }

  const tStat = Math.abs(variantA.mean - variantB.mean) / se;
  const pValue = 2 * (1 - normalCDF(tStat));

  const pooledStd = Math.sqrt(
    ((variantA.size - 1) * variantA.variance + (variantB.size - 1) * variantB.variance) /
    (variantA.size + variantB.size - 2)
  );
  const effectSize = pooledStd > 0 ? Math.abs(variantA.mean - variantB.mean) / pooledStd : 0;

  return { pValue, isSignificant: pValue < 0.05, effectSize };
}

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

// ============================================================================
// ABTestRunner Class
// ============================================================================

/**
 * ABTestRunner - Runs A/B tests with statistical analysis
 */
export class ABTestRunner {
  private config: ABTestConfig;
  private variantData: Map<string, { samples: number[]; sum: number; sumSquares: number }>;

  constructor(config: ABTestConfig) {
    this.config = config;
    this.variantData = new Map();

    // Initialize variant data
    for (const variant of config.variants) {
      this.variantData.set(variant.id, { samples: [], sum: 0, sumSquares: 0 });
    }
  }

  /**
   * Add sample to variant
   */
  addSample(variantId: string, value: number): void {
    const data = this.variantData.get(variantId);
    if (!data) {
      throw new Error(`Unknown variant: ${variantId}`);
    }

    data.samples.push(value);
    data.sum += value;
    data.sumSquares += value * value;
  }

  /**
   * Get test results
   */
  getResults(): ABTestResult {
    const variantResults: ABTestResult['variantResults'] = [];

    // Calculate statistics for each variant
    for (const [variantId, data] of this.variantData.entries()) {
      const n = data.samples.length;
      if (n === 0) continue;

      const mean = data.sum / n;
      const variance = n > 1 ? (data.sumSquares - data.sum * data.sum / n) / (n - 1) : 0;
      const stdDev = Math.sqrt(variance);

      variantResults.push({
        variantId,
        sampleSize: n,
        metricValue: mean,
        confidenceInterval: {
          lower: mean - 1.96 * stdDev / Math.sqrt(n),
          upper: mean + 1.96 * stdDev / Math.sqrt(n),
          confidence: 0.95,
        },
      });
    }

    // Determine winner
    const result: ABTestResult = {
      testId: this.config.testId,
      status: 'running',
      variantResults,
    };

    // Check if we have enough samples
    const minSamples = Math.min(...variantResults.map(v => v.sampleSize));
    if (minSamples >= this.config.minSampleSize) {
      // Calculate significance between variants
      if (variantResults.length >= 2) {
        // Calculate actual variance from samples
        const getVariance = (variantId: string): number => {
          const data = this.variantData.get(variantId);
          if (!data || data.samples.length < 2) return 0;
          const n = data.samples.length;
          const mean = data.sum / n;
          const variance = (data.sumSquares - data.sum * data.sum / n) / (n - 1);
          return Math.max(0, variance); // Ensure non-negative
        };

        const variantA = {
          mean: variantResults[0].metricValue,
          variance: getVariance(variantResults[0].variantId),
          size: variantResults[0].sampleSize,
        };
        const variantB = {
          mean: variantResults[1].metricValue,
          variance: getVariance(variantResults[1].variantId),
          size: variantResults[1].sampleSize,
        };

        const significance = calculateSignificance(variantA, variantB);
        
        result.significance = {
          pValue: significance.pValue,
          isSignificant: significance.isSignificant,
          effectSize: significance.effectSize,
        };

        if (significance.isSignificant) {
          result.status = 'complete';
          result.winner = variantResults[0].metricValue > variantResults[1].metricValue
            ? variantResults[0].variantId
            : variantResults[1].variantId;
          result.recommendation = result.winner === variantResults[0].variantId
            ? 'variant_a'
            : 'variant_b';
        }
      }
    }

    return result;
  }

  /**
   * Check if test is complete
   */
  isComplete(): boolean {
    const results = this.getResults();
    return results.status === 'complete';
  }

  /**
   * Get current status
   */
  getStatus(): 'running' | 'complete' | 'inconclusive' {
    return this.getResults().status;
  }
}

export default ABTestRunner;
