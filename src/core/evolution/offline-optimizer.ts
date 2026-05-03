/**
 * ANFSF V1.5.0 - Offline Optimizer for Economics Weight Calibration
 * 
 * Collects project data and performs regression analysis to calibrate
 * economics scoring weights.
 */

export interface ProjectData {
  projectId: string;
  tokenBudget: number;
  featureCount: number;
  complexity: number;
  economicsScore: number;
  reworkRate: number;
  successRate: number;
  timestamp: number;
}

export interface EconomicsWeights {
  interfaceCost: number;
  bottleneck: number;
  skillMatch: number;
  parallelismGain: number;
  reworkRisk: number;
}

export interface CalibrationResult {
  success: boolean;
  weights: EconomicsWeights;
  confidenceInterval: {
    lower: number;
    upper: number;
    confidence: number;
  };
  sampleSize: number;
  rSquared: number;
  timestamp: number;
}

export interface OfflineOptimizerConfig {
  minSamples: number;
  maxSamples: number;
  calibrationInterval: number; // milliseconds
  confidenceThreshold: number;
}

const DEFAULT_CONFIG: OfflineOptimizerConfig = {
  minSamples: 10,
  maxSamples: 100,
  calibrationInterval: 24 * 60 * 60 * 1000, // 24 hours
  confidenceThreshold: 0.8,
};

const DEFAULT_WEIGHTS: EconomicsWeights = {
  interfaceCost: -0.30,
  bottleneck: -0.20,
  skillMatch: 0.20,
  parallelismGain: 0.15,
  reworkRisk: -0.15,
};

/**
 * Offline Optimizer - collects data and calibrates economics weights.
 */
export class OfflineOptimizer {
  private config: OfflineOptimizerConfig;
  private projectData: ProjectData[];
  private lastCalibration: number;
  private currentWeights: EconomicsWeights;

  constructor(config: Partial<OfflineOptimizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.projectData = [];
    this.lastCalibration = 0;
    this.currentWeights = DEFAULT_WEIGHTS;
  }

  /**
   * Collect project data point.
   */
  collectData(data: ProjectData): void {
    this.projectData.push(data);

    // Keep only recent data (maxSamples)
    if (this.projectData.length > this.config.maxSamples) {
      this.projectData = this.projectData.slice(-this.config.maxSamples);
    }
  }

  /**
   * Check if calibration should be performed.
   */
  shouldCalibrate(): boolean {
    const now = Date.now();
    const timeSinceLastCalibration = now - this.lastCalibration;
    
    return (
      this.projectData.length >= this.config.minSamples &&
      timeSinceLastCalibration >= this.config.calibrationInterval
    );
  }

  /**
   * Perform calibration using regression analysis.
   */
  calibrate(): CalibrationResult {
    if (this.projectData.length < this.config.minSamples) {
      return {
        success: false,
        weights: this.currentWeights,
        confidenceInterval: {
          lower: 0,
          upper: 0,
          confidence: 0,
        },
        sampleSize: this.projectData.length,
        rSquared: 0,
        timestamp: Date.now(),
      };
    }

    try {
      // Perform multiple linear regression
      const weights = this.performRegression();
      
      // Calculate R-squared (goodness of fit)
      const rSquared = this.calculateRSquared(weights);
      
      // Calculate confidence interval
      const confidenceInterval = this.calculateConfidenceInterval(weights);

      // Update current weights if confidence is sufficient
      if (confidenceInterval.confidence >= this.config.confidenceThreshold) {
        this.currentWeights = weights;
        this.lastCalibration = Date.now();
      }

      return {
        success: true,
        weights,
        confidenceInterval,
        sampleSize: this.projectData.length,
        rSquared,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        weights: this.currentWeights,
        confidenceInterval: {
          lower: 0,
          upper: 0,
          confidence: 0,
        },
        sampleSize: this.projectData.length,
        rSquared: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get current economics weights.
   */
  getCurrentWeights(): EconomicsWeights {
    return this.currentWeights;
  }

  /**
   * Get calibration status.
   */
  getCalibrationStatus(): {
    sampleSize: number;
    minSamples: number;
    progress: number;
    lastCalibration: number;
    ready: boolean;
  } {
    const sampleSize = this.projectData.length;
    const progress = Math.min(sampleSize / this.config.minSamples, 1);
    const ready = sampleSize >= this.config.minSamples;

    return {
      sampleSize,
      minSamples: this.config.minSamples,
      progress,
      lastCalibration: this.lastCalibration,
      ready,
    };
  }

  /**
   * Perform multiple linear regression using ordinary least squares.
   * Models: economicsScore = w1*complexity + w2*reworkRate + w3*successRate
   *         + w4*(tokenBudget/featureCount) + w5*1
   * Then maps regression coefficients to EconomicsWeights.
   */
  private performRegression(): EconomicsWeights {
    const n = this.projectData.length;
    const keys: (keyof EconomicsWeights)[] = [
      'interfaceCost',
      'bottleneck',
      'skillMatch',
      'parallelismGain',
      'reworkRisk',
    ];

    // Build feature matrix: each row is [complexity, reworkRate, successRate, budgetPerFeature, 1]
    // and target vector is economicsScore
    const features = this.projectData.map(p => [
      p.complexity,
      p.reworkRate,
      p.successRate,
      p.tokenBudget / Math.max(1, p.featureCount),
      1, // bias
    ]);
    const targets = this.projectData.map(p => p.economicsScore);

    // Solve normal equations: (X^T X) beta = X^T y
    // X^T X is 5x5, X^T y is 5x1
    const numFeatures = features[0].length;
    const xtX: number[][] = Array.from({ length: numFeatures }, () => Array(numFeatures).fill(0));
    const xtY: number[] = Array(numFeatures).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < numFeatures; j++) {
        for (let k = 0; k < numFeatures; k++) {
          xtX[j][k] += features[i][j] * features[i][k];
        }
        xtY[j] += features[i][j] * targets[i];
      }
    }

    // Solve using Gauss-Jordan elimination
    const beta = this.solveLinearSystem(xtX, xtY);

    // Map coefficients to EconomicsWeights
    // beta[0] -> complexity influence (affects bottleneck)
    // beta[1] -> reworkRate influence (affects reworkRisk)
    // beta[2] -> successRate influence (affects skillMatch)
    // beta[3] -> budgetPerFeature influence (affects interfaceCost)
    // beta[4] -> bias (affects parallelismGain)
    const rawWeights: EconomicsWeights = {
      interfaceCost: this.normalizeWeight(-beta[3] * 0.5),
      bottleneck: this.normalizeWeight(-Math.abs(beta[0]) * 0.5),
      skillMatch: this.normalizeWeight(beta[2] * 0.5),
      parallelismGain: this.normalizeWeight(beta[4] * 0.3),
      reworkRisk: this.normalizeWeight(-beta[1] * 0.5),
    };

    return rawWeights;
  }

  /**
   * Normalize weight to [-1, 1] range with sensible bounds.
   */
  private normalizeWeight(w: number): number {
    return Math.min(1, Math.max(-1, w));
  }

  /**
   * Solve linear system Ax = b using Gauss-Jordan elimination with partial pivoting.
   */
  private solveLinearSystem(matrix: number[][], rhs: number[]): number[] {
    const n = matrix.length;
    // Augmented matrix
    const aug = matrix.map((row, i) => [...row, rhs[i]]);

    for (let col = 0; col < n; col++) {
      // Partial pivoting
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
          maxRow = row;
        }
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-10) continue; // Singular, skip

      // Normalize pivot row
      for (let j = col; j <= n; j++) {
        aug[col][j] /= pivot;
      }

      // Eliminate other rows
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = col; j <= n; j++) {
          aug[row][j] -= factor * aug[col][j];
        }
      }
    }

    return aug.map(row => row[n]);
  }

  /**
   * Calculate R-squared (coefficient of determination) from actual residuals.
   */
  private calculateRSquared(weights: EconomicsWeights): number {
    const n = this.projectData.length;
    if (n < 2) return 0;

    // Mean of observed targets
    const meanTarget = this.projectData.reduce((s, p) => s + p.economicsScore, 0) / n;

    // Total sum of squares
    const ssTot = this.projectData.reduce((s, p) => s + (p.economicsScore - meanTarget) ** 2, 0);
    if (ssTot < 1e-10) return 0.5; // All same values

    // Predicted values using current weights (simplified proxy model)
    const ssRes = this.projectData.reduce((s, p) => {
      const predicted = this.predictScore(p, weights);
      return s + (p.economicsScore - predicted) ** 2;
    }, 0);

    return Math.max(0, Math.min(1, 1 - ssRes / ssTot));
  }

  /**
   * Predict economics score from data point using weights.
   */
  private predictScore(data: ProjectData, weights: EconomicsWeights): number {
    return (
      weights.interfaceCost * (data.tokenBudget / Math.max(1, data.featureCount)) +
      weights.bottleneck * data.complexity +
      weights.skillMatch * data.successRate +
      weights.parallelismGain +
      weights.reworkRisk * data.reworkRate
    );
  }

  /**
   * Calculate confidence interval.
   */
  private calculateConfidenceInterval(weights: EconomicsWeights): {
    lower: number;
    upper: number;
    confidence: number;
  } {
    const sampleSize = this.projectData.length;
    
    // Confidence increases with sample size
    const baseConfidence = 0.5;
    const sizeBonus = Math.min(sampleSize / 20, 0.45); // Max 0.45 bonus at 20 samples
    const confidence = baseConfidence + sizeBonus;

    // Calculate margin of error
    const marginOfError = (1 - confidence) / 2;

    return {
      lower: confidence - marginOfError,
      upper: confidence + marginOfError,
      confidence,
    };
  }

  /**
   * Clear collected data.
   */
  clearData(): void {
    this.projectData = [];
  }

  /**
   * Reset calibration.
   */
  resetCalibration(): void {
    this.lastCalibration = 0;
    this.currentWeights = DEFAULT_WEIGHTS;
  }
}

/**
 * Singleton optimizer instance.
 */
let defaultOptimizer: OfflineOptimizer | null = null;

export function getDefaultOptimizer(): OfflineOptimizer {
  if (!defaultOptimizer) {
    defaultOptimizer = new OfflineOptimizer();
  }
  return defaultOptimizer;
}

export function resetDefaultOptimizer(): void {
  defaultOptimizer = null;
}
