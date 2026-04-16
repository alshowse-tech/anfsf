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
    calibrationInterval: number;
    confidenceThreshold: number;
}
/**
 * Offline Optimizer - collects data and calibrates economics weights.
 */
export declare class OfflineOptimizer {
    private config;
    private projectData;
    private lastCalibration;
    private currentWeights;
    constructor(config?: Partial<OfflineOptimizerConfig>);
    /**
     * Collect project data point.
     */
    collectData(data: ProjectData): void;
    /**
     * Check if calibration should be performed.
     */
    shouldCalibrate(): boolean;
    /**
     * Perform calibration using regression analysis.
     */
    calibrate(): CalibrationResult;
    /**
     * Get current economics weights.
     */
    getCurrentWeights(): EconomicsWeights;
    /**
     * Get calibration status.
     */
    getCalibrationStatus(): {
        sampleSize: number;
        minSamples: number;
        progress: number;
        lastCalibration: number;
        ready: boolean;
    };
    /**
     * Perform multiple linear regression.
     */
    private performRegression;
    /**
     * Calculate weight adjustments based on data.
     */
    private calculateAdjustments;
    /**
     * Calculate R-squared (coefficient of determination).
     */
    private calculateRSquared;
    /**
     * Calculate confidence interval.
     */
    private calculateConfidenceInterval;
    /**
     * Clear collected data.
     */
    clearData(): void;
    /**
     * Reset calibration.
     */
    resetCalibration(): void;
}
export declare function getDefaultOptimizer(): OfflineOptimizer;
export declare function resetDefaultOptimizer(): void;
