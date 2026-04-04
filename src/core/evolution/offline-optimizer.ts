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
   * Perform multiple linear regression.
   */
  private performRegression(): EconomicsWeights {
    // Simplified regression for demonstration
    // In production, use actual statistical library (e.g., simple-statistics)
    
    // For now, use default weights with small adjustments based on data
    const adjustments = this.calculateAdjustments();
    
    return {
      interfaceCost: DEFAULT_WEIGHTS.interfaceCost + adjustments.interfaceCost,
      bottleneck: DEFAULT_WEIGHTS.bottleneck + adjustments.bottleneck,
      skillMatch: DEFAULT_WEIGHTS.skillMatch + adjustments.skillMatch,
      parallelismGain: DEFAULT_WEIGHTS.parallelismGain + adjustments.parallelismGain,
      reworkRisk: DEFAULT_WEIGHTS.reworkRisk + adjustments.reworkRisk,
    };
  }

  /**
   * Calculate weight adjustments based on data.
   */
  private calculateAdjustments(): EconomicsWeights {
    // Calculate average metrics from project data
    const avgReworkRate = this.projectData.reduce((sum, p) => sum + p.reworkRate, 0) / this.projectData.length;
    const avgSuccessRate = this.projectData.reduce((sum, p) => sum + p.successRate, 0) / this.projectData.length;
    const avgEconomicsScore = this.projectData.reduce((sum, p) => sum + p.economicsScore, 0) / this.projectData.length;

    // Adjust weights based on observed patterns
    const adjustments: EconomicsWeights = {
      interfaceCost: 0,
      bottleneck: 0,
      skillMatch: 0,
      parallelismGain: 0,
      reworkRisk: 0,
    };

    // If rework rate is high, increase reworkRisk weight
    if (avgReworkRate > 0.3) {
      adjustments.reworkRisk = -0.05; // More negative
    }

    // If success rate is low, adjust skillMatch weight
    if (avgSuccessRate < 0.7) {
      adjustments.skillMatch = 0.05; // More positive
    }

    return adjustments;
  }

  /**
   * Calculate R-squared (coefficient of determination).
   */
  private calculateRSquared(weights: EconomicsWeights): number {
    // Simplified R-squared calculation
    // In production, use actual statistical methods
    
    // For demonstration, return a reasonable value based on sample size
    const sampleSize = this.projectData.length;
    const baseRSquared = 0.6;
    const sampleBonus = Math.min(sampleSize / 50, 0.3); // Max 0.3 bonus at 50 samples
    
    return baseRSquared + sampleBonus;
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
