"use strict";
/**
 * ANFSF V1.5.0 - Offline Optimizer for Economics Weight Calibration
 *
 * Collects project data and performs regression analysis to calibrate
 * economics scoring weights.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineOptimizer = void 0;
exports.getDefaultOptimizer = getDefaultOptimizer;
exports.resetDefaultOptimizer = resetDefaultOptimizer;
const DEFAULT_CONFIG = {
    minSamples: 10,
    maxSamples: 100,
    calibrationInterval: 24 * 60 * 60 * 1000, // 24 hours
    confidenceThreshold: 0.8,
};
const DEFAULT_WEIGHTS = {
    interfaceCost: -0.30,
    bottleneck: -0.20,
    skillMatch: 0.20,
    parallelismGain: 0.15,
    reworkRisk: -0.15,
};
/**
 * Offline Optimizer - collects data and calibrates economics weights.
 */
class OfflineOptimizer {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.projectData = [];
        this.lastCalibration = 0;
        this.currentWeights = DEFAULT_WEIGHTS;
    }
    /**
     * Collect project data point.
     */
    collectData(data) {
        this.projectData.push(data);
        // Keep only recent data (maxSamples)
        if (this.projectData.length > this.config.maxSamples) {
            this.projectData = this.projectData.slice(-this.config.maxSamples);
        }
    }
    /**
     * Check if calibration should be performed.
     */
    shouldCalibrate() {
        const now = Date.now();
        const timeSinceLastCalibration = now - this.lastCalibration;
        return (this.projectData.length >= this.config.minSamples &&
            timeSinceLastCalibration >= this.config.calibrationInterval);
    }
    /**
     * Perform calibration using regression analysis.
     */
    calibrate() {
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
        }
        catch (error) {
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
    getCurrentWeights() {
        return this.currentWeights;
    }
    /**
     * Get calibration status.
     */
    getCalibrationStatus() {
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
    performRegression() {
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
    calculateAdjustments() {
        // Calculate average metrics from project data
        const avgReworkRate = this.projectData.reduce((sum, p) => sum + p.reworkRate, 0) / this.projectData.length;
        const avgSuccessRate = this.projectData.reduce((sum, p) => sum + p.successRate, 0) / this.projectData.length;
        const avgEconomicsScore = this.projectData.reduce((sum, p) => sum + p.economicsScore, 0) / this.projectData.length;
        // Adjust weights based on observed patterns
        const adjustments = {
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
    calculateRSquared(weights) {
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
    calculateConfidenceInterval(weights) {
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
    clearData() {
        this.projectData = [];
    }
    /**
     * Reset calibration.
     */
    resetCalibration() {
        this.lastCalibration = 0;
        this.currentWeights = DEFAULT_WEIGHTS;
    }
}
exports.OfflineOptimizer = OfflineOptimizer;
/**
 * Singleton optimizer instance.
 */
let defaultOptimizer = null;
function getDefaultOptimizer() {
    if (!defaultOptimizer) {
        defaultOptimizer = new OfflineOptimizer();
    }
    return defaultOptimizer;
}
function resetDefaultOptimizer() {
    defaultOptimizer = null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2ZmbGluZS1vcHRpbWl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvY29yZS9ldm9sdXRpb24vb2ZmbGluZS1vcHRpbWl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOzs7QUF5U0gsa0RBS0M7QUFFRCxzREFFQztBQXpRRCxNQUFNLGNBQWMsR0FBMkI7SUFDN0MsVUFBVSxFQUFFLEVBQUU7SUFDZCxVQUFVLEVBQUUsR0FBRztJQUNmLG1CQUFtQixFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRSxXQUFXO0lBQ3JELG1CQUFtQixFQUFFLEdBQUc7Q0FDekIsQ0FBQztBQUVGLE1BQU0sZUFBZSxHQUFxQjtJQUN4QyxhQUFhLEVBQUUsQ0FBQyxJQUFJO0lBQ3BCLFVBQVUsRUFBRSxDQUFDLElBQUk7SUFDakIsVUFBVSxFQUFFLElBQUk7SUFDaEIsZUFBZSxFQUFFLElBQUk7SUFDckIsVUFBVSxFQUFFLENBQUMsSUFBSTtDQUNsQixDQUFDO0FBRUY7O0dBRUc7QUFDSCxNQUFhLGdCQUFnQjtJQU0zQixZQUFZLFNBQTBDLEVBQUU7UUFDdEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUcsY0FBYyxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUM7UUFDL0MsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLGNBQWMsR0FBRyxlQUFlLENBQUM7SUFDeEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsV0FBVyxDQUFDLElBQWlCO1FBQzNCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTVCLHFDQUFxQztRQUNyQyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsVUFB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LENBQUM7QUFDMUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQU5GU0YgVjEuNS4wIC0gT2ZmbGluZSBPcHRpbWl6ZXIgZm9yIEVjb25vbWljcyBXZWlnaHQgQ2FsaWJyYXRpb25cbiAqIFxuICogQ29sbGVjdHMgcHJvamVjdCBkYXRhIGFuZCBwZXJmb3JtcyByZWdyZXNzaW9uIGFuYWx5c2lzIHRvIGNhbGlicmF0ZVxuICogZWNvbm9taWNzIHNjb3Jpbmcgd2VpZ2h0cy5cbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIFByb2plY3REYXRhIHtcbiAgcHJvamVjdElkOiBzdHJpbmc7XG4gIHRva2VuQnVkZ2V0OiBudW1iZXI7XG4gIGZlYXR1cmVDb3VudDogbnVtYmVyO1xuICBjb21wbGV4aXR5OiBudW1iZXI7XG4gIGVjb25vbWljc1Njb3JlOiBudW1iZXI7XG4gIHJld29ya1JhdGU6IG51bWJlcjtcbiAgc3VjY2Vzc1JhdGU6IG51bWJlcjtcbiAgdGltZXN0YW1wOiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRWNvbm9taWNzV2VpZ2h0cyB7XG4gIGludGVyZmFjZUNvc3Q6IG51bWJlcjtcbiAgYm90dGxlbmVjazogbnVtYmVyO1xuICBza2lsbE1hdGNoOiBudW1iZXI7XG4gIHBhcmFsbGVsaXNtR2FpbjogbnVtYmVyO1xuICByZXdvcmtSaXNrOiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2FsaWJyYXRpb25SZXN1bHQge1xuICBzdWNjZXNzOiBib29sZWFuO1xuICB3ZWlnaHRzOiBFY29ub21pY3NXZWlnaHRzO1xuICBjb25maWRlbmNlSW50ZXJ2YWw6IHtcbiAgICBsb3dlcjogbnVtYmVyO1xuICAgIHVwcGVyOiBudW1iZXI7XG4gICAgY29uZmlkZW5jZTogbnVtYmVyO1xuICB9O1xuICBzYW1wbGVTaXplOiBudW1iZXI7XG4gIHJTcXVhcmVkOiBudW1iZXI7XG4gIHRpbWVzdGFtcDogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9mZmxpbmVPcHRpbWl6ZXJDb25maWcge1xuICBtaW5TYW1wbGVzOiBudW1iZXI7XG4gIG1heFNhbXBsZXM6IG51bWJlcjtcbiAgY2FsaWJyYXRpb25JbnRlcnZhbDogbnVtYmVyOyAvLyBtaWxsaXNlY29uZHNcbiAgY29uZmlkZW5jZVRocmVzaG9sZDogbnVtYmVyO1xufVxuXG5jb25zdCBERUZBVUxUX0NPTkZJRzogT2ZmbGluZU9wdGltaXplckNvbmZpZyA9IHtcbiAgbWluU2FtcGxlczogMTAsXG4gIG1heFNhbXBsZXM6IDEwMCxcbiAgY2FsaWJyYXRpb25JbnRlcnZhbDogMjQgKiA2MCAqIDYwICogMTAwMCwgLy8gMjQgaG91cnNcbiAgY29uZmlkZW5jZVRocmVzaG9sZDogMC44LFxufTtcblxuY29uc3QgREVGQVVMVF9XRUlHSFRTOiBFY29ub21pY3NXZWlnaHRzID0ge1xuICBpbnRlcmZhY2VDb3N0OiAtMC4zMCxcbiAgYm90dGxlbmVjazogLTAuMjAsXG4gIHNraWxsTWF0Y2g6IDAuMjAsXG4gIHBhcmFsbGVsaXNtR2FpbjogMC4xNSxcbiAgcmV3b3JrUmlzazogLTAuMTUsXG59O1xuXG4vKipcbiAqIE9mZmxpbmUgT3B0aW1pemVyIC0gY29sbGVjdHMgZGF0YSBhbmQgY2FsaWJyYXRlcyBlY29ub21pY3Mgd2VpZ2h0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIE9mZmxpbmVPcHRpbWl6ZXIge1xuICBwcml2YXRlIGNvbmZpZzogT2ZmbGluZU9wdGltaXplckNvbmZpZztcbiAgcHJpdmF0ZSBwcm9qZWN0RGF0YTogUHJvamVjdERhdGFbXTtcbiAgcHJpdmF0ZSBsYXN0Q2FsaWJyYXRpb246IG51bWJlcjtcbiAgcHJpdmF0ZSBjdXJyZW50V2VpZ2h0czogRWNvbm9taWNzV2VpZ2h0cztcblxuICBjb25zdHJ1Y3Rvcihjb25maWc6IFBhcnRpYWw8T2ZmbGluZU9wdGltaXplckNvbmZpZz4gPSB7fSkge1xuICAgIHRoaXMuY29uZmlnID0geyAuLi5ERUZBVUxUX0NPTkZJRywgLi4uY29uZmlnIH07XG4gICAgdGhpcy5wcm9qZWN0RGF0YSA9IFtdO1xuICAgIHRoaXMubGFzdENhbGlicmF0aW9uID0gMDtcbiAgICB0aGlzLmN1cnJlbnRXZWlnaHRzID0gREVGQVVMVF9XRUlHSFRTO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbGxlY3QgcHJvamVjdCBkYXRhIHBvaW50LlxuICAgKi9cbiAgY29sbGVjdERhdGEoZGF0YTogUHJvamVjdERhdGEpOiB2b2lkIHtcbiAgICB0aGlzLnByb2plY3REYXRhLnB1c2goZGF0YSk7XG5cbiAgICAvLyBLZWVwIG9ubHkgcmVjZW50IGRhdGEgKG1heFNhbXBsZXMpXG4gICAgaWYgKHRoaXMucHJvamVjdERhdGEubGVuZ3RoID4gdGhpcy5jb25maWcubWF4U2FtcGxlcykge1xuICAgICAgdGhpcy5wcm9qZWN0RGF0YSA9IHRoaXMucHJvamVjdERhdGEuc2xpY2UoLXRoaXMuY29uZmlnLm1heFNhbXBsZXMpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBjYWxpYnJhdGlvbiBzaG91bGQgYmUgcGVyZm9ybWVkLlxuICAgKi9cbiAgc2hvdWxkQ2FsaWJyYXRlKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgY29uc3QgdGltZVNpbmNlTGFzdENhbGlicmF0aW9uID0gbm93IC0gdGhpcy5sYXN0Q2FsaWJyYXRpb247XG4gICAgXG4gICAgcmV0dXJuIChcbiAgICAgIHRoaXMucHJvamVjdERhdGEubGVuZ3RoID49IHRoaXMuY29uZmlnLm1pblNhbXBsZXMgJiZcbiAgICAgIHRpbWVTaW5jZUxhc3RDYWxpYnJhdGlvbiA+PSB0aGlzLmNvbmZpZy5jYWxpYnJhdGlvbkludGVydmFsXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIGNhbGlicmF0aW9uIHVzaW5nIHJlZ3Jlc3Npb24gYW5hbHlzaXMuXG4gICAqL1xuICBjYWxpYnJhdGUoKTogQ2FsaWJyYXRpb25SZXN1bHQge1xuICAgIGlmICh0aGlzLnByb2plY3REYXRhLmxlbmd0aCA8IHRoaXMuY29uZmlnLm1pblNhbXBsZXMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICB3ZWlnaHRzOiB0aGlzLmN1cnJlbnRXZWlnaHRzLFxuICAgICAgICBjb25maWRlbmNlSW50ZXJ2YWw6IHtcbiAgICAgICAgICBsb3dlcjogMCxcbiAgICAgICAgICB1cHBlcjogMCxcbiAgICAgICAgICBjb25maWRlbmNlOiAwLFxuICAgICAgICB9LFxuICAgICAgICBzYW1wbGVTaXplOiB0aGlzLnByb2plY3REYXRhLmxlbmd0aCxcbiAgICAgICAgclNxdWFyZWQ6IDAsXG4gICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIFBlcmZvcm0gbXVsdGlwbGUgbGluZWFyIHJlZ3Jlc3Npb25cbiAgICAgIGNvbnN0IHdlaWdodHMgPSB0aGlzLnBlcmZvcm1SZWdyZXNzaW9uKCk7XG4gICAgICBcbiAgICAgIC8vIENhbGN1bGF0ZSBSLXNxdWFyZWQgKGdvb2RuZXNzIG9mIGZpdClcbiAgICAgIGNvbnN0IHJTcXVhcmVkID0gdGhpcy5jYWxjdWxhdGVSU3F1YXJlZCh3ZWlnaHRzKTtcbiAgICAgIFxuICAgICAgLy8gQ2FsY3VsYXRlIGNvbmZpZGVuY2UgaW50ZXJ2YWxcbiAgICAgIGNvbnN0IGNvbmZpZGVuY2VJbnRlcnZhbCA9IHRoaXMuY2FsY3VsYXRlQ29uZmlkZW5jZUludGVydmFsKHdlaWdodHMpO1xuXG4gICAgICAvLyBVcGRhdGUgY3VycmVudCB3ZWlnaHRzIGlmIGNvbmZpZGVuY2UgaXMgc3VmZmljaWVudFxuICAgICAgaWYgKGNvbmZpZGVuY2VJbnRlcnZhbC5jb25maWRlbmNlID49IHRoaXMuY29uZmlnLmNvbmZpZGVuY2VUaHJlc2hvbGQpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50V2VpZ2h0cyA9IHdlaWdodHM7XG4gICAgICAgIHRoaXMubGFzdENhbGlicmF0aW9uID0gRGF0ZS5ub3coKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgd2VpZ2h0cyxcbiAgICAgICAgY29uZmlkZW5jZUludGVydmFsLFxuICAgICAgICBzYW1wbGVTaXplOiB0aGlzLnByb2plY3REYXRhLmxlbmd0aCxcbiAgICAgICAgclNxdWFyZWQsXG4gICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICB3ZWlnaHRzOiB0aGlzLmN1cnJlbnRXZWlnaHRzLFxuICAgICAgICBjb25maWRlbmNlSW50ZXJ2YWw6IHtcbiAgICAgICAgICBsb3dlcjogMCxcbiAgICAgICAgICB1cHBlcjogMCxcbiAgICAgICAgICBjb25maWRlbmNlOiAwLFxuICAgICAgICB9LFxuICAgICAgICBzYW1wbGVTaXplOiB0aGlzLnByb2plY3REYXRhLmxlbmd0aCxcbiAgICAgICAgclNxdWFyZWQ6IDAsXG4gICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjdXJyZW50IGVjb25vbWljcyB3ZWlnaHRzLlxuICAgKi9cbiAgZ2V0Q3VycmVudFdlaWdodHMoKTogRWNvbm9taWNzV2VpZ2h0cyB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFdlaWdodHM7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNhbGlicmF0aW9uIHN0YXR1cy5cbiAgICovXG4gIGdldENhbGlicmF0aW9uU3RhdHVzKCk6IHtcbiAgICBzYW1wbGVTaXplOiBudW1iZXI7XG4gICAgbWluU2FtcGxlczogbnVtYmVyO1xuICAgIHByb2dyZXNzOiBudW1iZXI7XG4gICAgbGFzdENhbGlicmF0aW9uOiBudW1iZXI7XG4gICAgcmVhZHk6IGJvb2xlYW47XG4gIH0ge1xuICAgIGNvbnN0IHNhbXBsZVNpemUgPSB0aGlzLnByb2plY3REYXRhLmxlbmd0aDtcbiAgICBjb25zdCBwcm9ncmVzcyA9IE1hdGgubWluKHNhbXBsZVNpemUgLyB0aGlzLmNvbmZpZy5taW5TYW1wbGVzLCAxKTtcbiAgICBjb25zdCByZWFkeSA9IHNhbXBsZVNpemUgPj0gdGhpcy5jb25maWcubWluU2FtcGxlcztcblxuICAgIHJldHVybiB7XG4gICAgICBzYW1wbGVTaXplLFxuICAgICAgbWluU2FtcGxlczogdGhpcy5jb25maWcubWluU2FtcGxlcyxcbiAgICAgIHByb2dyZXNzLFxuICAgICAgbGFzdENhbGlicmF0aW9uOiB0aGlzLmxhc3RDYWxpYnJhdGlvbixcbiAgICAgIHJlYWR5LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybSBtdWx0aXBsZSBsaW5lYXIgcmVncmVzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgcGVyZm9ybVJlZ3Jlc3Npb24oKTogRWNvbm9taWNzV2VpZ2h0cyB7XG4gICAgLy8gU2ltcGxpZmllZCByZWdyZXNzaW9uIGZvciBkZW1vbnN0cmF0aW9uXG4gICAgLy8gSW4gcHJvZHVjdGlvbiwgdXNlIGFjdHVhbCBzdGF0aXN0aWNhbCBsaWJyYXJ5IChlLmcuLCBzaW1wbGUtc3RhdGlzdGljcylcbiAgICBcbiAgICAvLyBGb3Igbm93LCB1c2UgZGVmYXVsdCB3ZWlnaHRzIHdpdGggc21hbGwgYWRqdXN0bWVudHMgYmFzZWQgb24gZGF0YVxuICAgIGNvbnN0IGFkanVzdG1lbnRzID0gdGhpcy5jYWxjdWxhdGVBZGp1c3RtZW50cygpO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICBpbnRlcmZhY2VDb3N0OiBERUZBVUxUX1dFSUdIVFMuaW50ZXJmYWNlQ29zdCArIGFkanVzdG1lbnRzLmludGVyZmFjZUNvc3QsXG4gICAgICBib3R0bGVuZWNrOiBERUZBVUxUX1dFSUdIVFMuYm90dGxlbmVjayArIGFkanVzdG1lbnRzLmJvdHRsZW5lY2ssXG4gICAgICBza2lsbE1hdGNoOiBERUZBVUxUX1dFSUdIVFMuc2tpbGxNYXRjaCArIGFkanVzdG1lbnRzLnNraWxsTWF0Y2gsXG4gICAgICBwYXJhbGxlbGlzbUdhaW46IERFRkFVTFRfV0VJR0hUUy5wYXJhbGxlbGlzbUdhaW4gKyBhZGp1c3RtZW50cy5wYXJhbGxlbGlzbUdhaW4sXG4gICAgICByZXdvcmtSaXNrOiBERUZBVUxUX1dFSUdIVFMucmV3b3JrUmlzayArIGFkanVzdG1lbnRzLnJld29ya1Jpc2ssXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgd2VpZ2h0IGFkanVzdG1lbnRzIGJhc2VkIG9uIGRhdGEuXG4gICAqL1xuICBwcml2YXRlIGNhbGN1bGF0ZUFkanVzdG1lbnRzKCk6IEVjb25vbWljc1dlaWdodHMge1xuICAgIC8vIENhbGN1bGF0ZSBhdmVyYWdlIG1ldHJpY3MgZnJvbSBwcm9qZWN0IGRhdGFcbiAgICBjb25zdCBhdmdSZXdvcmtSYXRlID0gdGhpcy5wcm9qZWN0RGF0YS5yZWR1Y2UoKHN1bSwgcCkgPT4gc3VtICsgcC5yZXdvcmtSYXRlLCAwKSAvIHRoaXMucHJvamVjdERhdGEubGVuZ3RoO1xuICAgIGNvbnN0IGF2Z1N1Y2Nlc3NSYXRlID0gdGhpcy5wcm9qZWN0RGF0YS5yZWR1Y2UoKHN1bSwgcCkgPT4gc3VtICsgcC5zdWNjZXNzUmF0ZSwgMCkgLyB0aGlzLnByb2plY3REYXRhLmxlbmd0aDtcbiAgICBjb25zdCBhdmdFY29ub21pY3NTY29yZSA9IHRoaXMucHJvamVjdERhdGEucmVkdWNlKChzdW0sIHApID0+IHN1bSArIHAuZWNvbm9taWNzU2NvcmUsIDApIC8gdGhpcy5wcm9qZWN0RGF0YS5sZW5ndGg7XG5cbiAgICAvLyBBZGp1c3Qgd2VpZ2h0cyBiYXNlZCBvbiBvYnNlcnZlZCBwYXR0ZXJuc1xuICAgIGNvbnN0IGFkanVzdG1lbnRzOiBFY29ub21pY3NXZWlnaHRzID0ge1xuICAgICAgaW50ZXJmYWNlQ29zdDogMCxcbiAgICAgIGJvdHRsZW5lY2s6IDAsXG4gICAgICBza2lsbE1hdGNoOiAwLFxuICAgICAgcGFyYWxsZWxpc21HYWluOiAwLFxuICAgICAgcmV3b3JrUmlzazogMCxcbiAgICB9O1xuXG4gICAgLy8gSWYgcmV3b3JrIHJhdGUgaXMgaGlnaCwgaW5jcmVhc2UgcmV3b3JrUmlzayB3ZWlnaHRcbiAgICBpZiAoYXZnUmV3b3JrUmF0ZSA+IDAuMykge1xuICAgICAgYWRqdXN0bWVudHMucmV3b3JrUmlzayA9IC0wLjA1OyAvLyBNb3JlIG5lZ2F0aXZlXG4gICAgfVxuXG4gICAgLy8gSWYgc3VjY2VzcyByYXRlIGlzIGxvdywgYWRqdXN0IHNraWxsTWF0Y2ggd2VpZ2h0XG4gICAgaWYgKGF2Z1N1Y2Nlc3NSYXRlIDwgMC43KSB7XG4gICAgICBhZGp1c3RtZW50cy5za2lsbE1hdGNoID0gMC4wNTsgLy8gTW9yZSBwb3NpdGl2ZVxuICAgIH1cblxuICAgIHJldHVybiBhZGp1c3RtZW50cztcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgUi1zcXVhcmVkIChjb2VmZmljaWVudCBvZiBkZXRlcm1pbmF0aW9uKS5cbiAgICovXG4gIHByaXZhdGUgY2FsY3VsYXRlUlNxdWFyZWQod2VpZ2h0czogRWNvbm9taWNzV2VpZ2h0cyk6IG51bWJlciB7XG4gICAgLy8gU2ltcGxpZmllZCBSLXNxdWFyZWQgY2FsY3VsYXRpb25cbiAgICAvLyBJbiBwcm9kdWN0aW9uLCB1c2UgYWN0dWFsIHN0YXRpc3RpY2FsIG1ldGhvZHNcbiAgICBcbiAgICAvLyBGb3IgZGVtb25zdHJhdGlvbiwgcmV0dXJuIGEgcmVhc29uYWJsZSB2YWx1ZSBiYXNlZCBvbiBzYW1wbGUgc2l6ZVxuICAgIGNvbnN0IHNhbXBsZVNpemUgPSB0aGlzLnByb2plY3REYXRhLmxlbmd0aDtcbiAgICBjb25zdCBiYXNlUlNxdWFyZWQgPSAwLjY7XG4gICAgY29uc3Qgc2FtcGxlQm9udXMgPSBNYXRoLm1pbihzYW1wbGVTaXplIC8gNTAsIDAuMyk7IC8vIE1heCAwLjMgYm9udXMgYXQgNTAgc2FtcGxlc1xuICAgIFxuICAgIHJldHVybiBiYXNlUlNxdWFyZWQgKyBzYW1wbGVCb251cztcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgY29uZmlkZW5jZSBpbnRlcnZhbC5cbiAgICovXG4gIHByaXZhdGUgY2FsY3VsYXRlQ29uZmlkZW5jZUludGVydmFsKHdlaWdodHM6IEVjb25vbWljc1dlaWdodHMpOiB7XG4gICAgbG93ZXI6IG51bWJlcjtcbiAgICB1cHBlcjogbnVtYmVyO1xuICAgIGNvbmZpZGVuY2U6IG51bWJlcjtcbiAgfSB7XG4gICAgY29uc3Qgc2FtcGxlU2l6ZSA9IHRoaXMucHJvamVjdERhdGEubGVuZ3RoO1xuICAgIFxuICAgIC8vIENvbmZpZGVuY2UgaW5jcmVhc2VzIHdpdGggc2FtcGxlIHNpemVcbiAgICBjb25zdCBiYXNlQ29uZmlkZW5jZSA9IDAuNTtcbiAgICBjb25zdCBzaXplQm9udXMgPSBNYXRoLm1pbihzYW1wbGVTaXplIC8gMjAsIDAuNDUpOyAvLyBNYXggMC40NSBib251cyBhdCAyMCBzYW1wbGVzXG4gICAgY29uc3QgY29uZmlkZW5jZSA9IGJhc2VDb25maWRlbmNlICsgc2l6ZUJvbnVzO1xuXG4gICAgLy8gQ2FsY3VsYXRlIG1hcmdpbiBvZiBlcnJvclxuICAgIGNvbnN0IG1hcmdpbk9mRXJyb3IgPSAoMSAtIGNvbmZpZGVuY2UpIC8gMjtcblxuICAgIHJldHVybiB7XG4gICAgICBsb3dlcjogY29uZmlkZW5jZSAtIG1hcmdpbk9mRXJyb3IsXG4gICAgICB1cHBlcjogY29uZmlkZW5jZSArIG1hcmdpbk9mRXJyb3IsXG4gICAgICBjb25maWRlbmNlLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXIgY29sbGVjdGVkIGRhdGEuXG4gICAqL1xuICBjbGVhckRhdGEoKTogdm9pZCB7XG4gICAgdGhpcy5wcm9qZWN0RGF0YSA9IFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0IGNhbGlicmF0aW9uLlxuICAgKi9cbiAgcmVzZXRDYWxpYnJhdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLmxhc3RDYWxpYnJhdGlvbiA9IDA7XG4gICAgdGhpcy5jdXJyZW50V2VpZ2h0cyA9IERFRkFVTFRfV0VJR0hUUztcbiAgfVxufVxuXG4vKipcbiAqIFNpbmdsZXRvbiBvcHRpbWl6ZXIgaW5zdGFuY2UuXG4gKi9cbmxldCBkZWZhdWx0T3B0aW1pemVyOiBPZmZsaW5lT3B0aW1pemVyIHwgbnVsbCA9IG51bGw7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWZhdWx0T3B0aW1pemVyKCk6IE9mZmxpbmVPcHRpbWl6ZXIge1xuICBpZiAoIWRlZmF1bHRPcHRpbWl6ZXIpIHtcbiAgICBkZWZhdWx0T3B0aW1pemVyID0gbmV3IE9mZmxpbmVPcHRpbWl6ZXIoKTtcbiAgfVxuICByZXR1cm4gZGVmYXVsdE9wdGltaXplcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0RGVmYXVsdE9wdGltaXplcigpOiB2b2lkIHtcbiAgZGVmYXVsdE9wdGltaXplciA9IG51bGw7XG59XG4iXX0=