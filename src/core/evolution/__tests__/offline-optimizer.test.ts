/**
 * ANFSF V1.5.0 - Offline Optimizer Unit Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { OfflineOptimizer, ProjectData } from '../offline-optimizer';

describe('Offline Optimizer Unit Tests', () => {
  let optimizer: OfflineOptimizer;

  beforeEach(() => {
    optimizer = new OfflineOptimizer();
  });

  it('should create optimizer with default config', () => {
    const status = optimizer.getCalibrationStatus();
    expect(status.minSamples).toBe(10);
    expect(status.ready).toBe(false);
  });

  it('should collect project data', () => {
    const data: ProjectData = {
      projectId: 'test-1',
      tokenBudget: 50000,
      featureCount: 10,
      complexity: 0.3,
      economicsScore: 70,
      reworkRate: 0.2,
      successRate: 0.8,
      timestamp: Date.now(),
    };

    optimizer.collectData(data);

    const status = optimizer.getCalibrationStatus();
    expect(status.sampleSize).toBe(1);
  });

  it('should check calibration readiness', () => {
    for (let i = 0; i < 10; i++) {
      optimizer.collectData({
        projectId: `test-${i}`,
        tokenBudget: 50000 + i * 10000,
        featureCount: 10 + i,
        complexity: 0.3 + i * 0.05,
        economicsScore: 70 + i * 2,
        reworkRate: 0.2 - i * 0.01,
        successRate: 0.8 + i * 0.01,
        timestamp: Date.now(),
      });
    }

    const status = optimizer.getCalibrationStatus();
    expect(status.ready).toBe(true);
    expect(status.progress).toBe(1);
  });

  it('should perform calibration with sufficient data', () => {
    for (let i = 0; i < 12; i++) {
      optimizer.collectData({
        projectId: `test-${i}`,
        tokenBudget: 50000 + i * 10000,
        featureCount: 10 + i,
        complexity: 0.3 + i * 0.05,
        economicsScore: 70 + i * 2,
        reworkRate: 0.2 - i * 0.01,
        successRate: 0.8 + i * 0.01,
        timestamp: Date.now(),
      });
    }

    const result = optimizer.calibrate();

    expect(result.success).toBe(true);
    expect(result.weights.interfaceCost).toBeDefined();
    expect(result.confidenceInterval.confidence).toBeGreaterThan(0);
  });

  it('should return current weights', () => {
    const weights = optimizer.getCurrentWeights();

    expect(weights.interfaceCost).toBeDefined();
    expect(weights.bottleneck).toBeDefined();
    expect(weights.skillMatch).toBeDefined();
    expect(weights.parallelismGain).toBeDefined();
    expect(weights.reworkRisk).toBeDefined();
  });

  it('should handle insufficient data', () => {
    for (let i = 0; i < 5; i++) {
      optimizer.collectData({
        projectId: `test-${i}`,
        tokenBudget: 50000,
        featureCount: 10,
        complexity: 0.3,
        economicsScore: 70,
        reworkRate: 0.2,
        successRate: 0.8,
        timestamp: Date.now(),
      });
    }

    const result = optimizer.calibrate();

    expect(result.success).toBe(false);
    expect(result.sampleSize).toBe(5);
  });

  it('should clear collected data', () => {
    for (let i = 0; i < 5; i++) {
      optimizer.collectData({
        projectId: `test-${i}`,
        tokenBudget: 50000,
        featureCount: 10,
        complexity: 0.3,
        economicsScore: 70,
        reworkRate: 0.2,
        successRate: 0.8,
        timestamp: Date.now(),
      });
    }

    optimizer.clearData();

    const status = optimizer.getCalibrationStatus();
    expect(status.sampleSize).toBe(0);
  });

  it('should reset calibration', () => {
    for (let i = 0; i < 10; i++) {
      optimizer.collectData({
        projectId: `test-${i}`,
        tokenBudget: 50000,
        featureCount: 10,
        complexity: 0.3,
        economicsScore: 70,
        reworkRate: 0.2,
        successRate: 0.8,
        timestamp: Date.now(),
      });
    }

    optimizer.calibrate();
    optimizer.resetCalibration();

    const status = optimizer.getCalibrationStatus();
    expect(status.lastCalibration).toBe(0);
  });

  it('should keep only recent data (maxSamples)', () => {
    optimizer = new OfflineOptimizer({ maxSamples: 5 });

    for (let i = 0; i < 10; i++) {
      optimizer.collectData({
        projectId: `test-${i}`,
        tokenBudget: 50000,
        featureCount: 10,
        complexity: 0.3,
        economicsScore: 70,
        reworkRate: 0.2,
        successRate: 0.8,
        timestamp: Date.now(),
      });
    }

    const status = optimizer.getCalibrationStatus();
    expect(status.sampleSize).toBeLessThanOrEqual(5);
  });

  it('should calculate confidence based on sample size', () => {
    // 10 samples
    for (let i = 0; i < 10; i++) {
      optimizer.collectData({
        projectId: `test-${i}`,
        tokenBudget: 50000,
        featureCount: 10,
        complexity: 0.3,
        economicsScore: 70,
        reworkRate: 0.2,
        successRate: 0.8,
        timestamp: Date.now(),
      });
    }

    const result10 = optimizer.calibrate();

    // 20 samples
    for (let i = 10; i < 20; i++) {
      optimizer.collectData({
        projectId: `test-${i}`,
        tokenBudget: 50000,
        featureCount: 10,
        complexity: 0.3,
        economicsScore: 70,
        reworkRate: 0.2,
        successRate: 0.8,
        timestamp: Date.now(),
      });
    }

    const result20 = optimizer.calibrate();

    expect(result20.confidenceInterval.confidence).toBeGreaterThanOrEqual(result10.confidenceInterval.confidence);
  });

  it('should calibrate weights using regression with high rework data', () => {
    // High rework rate projects
    for (let i = 0; i < 10; i++) {
      optimizer.collectData({
        projectId: `test-${i}`,
        tokenBudget: 50000,
        featureCount: 10,
        complexity: 0.3,
        economicsScore: 70,
        reworkRate: 0.4, // High
        successRate: 0.6,
        timestamp: Date.now(),
      });
    }

    const result = optimizer.calibrate();

    expect(result.success).toBe(true);
    expect(result.weights.reworkRisk).toBeLessThanOrEqual(0);
    expect(result.rSquared).toBeGreaterThanOrEqual(0);
  });

  it('should calibrate weights using regression with low success rate', () => {
    // Low success rate projects
    for (let i = 0; i < 10; i++) {
      optimizer.collectData({
        projectId: `test-${i}`,
        tokenBudget: 50000,
        featureCount: 10,
        complexity: 0.3,
        economicsScore: 70,
        reworkRate: 0.2,
        successRate: 0.5, // Low
        timestamp: Date.now(),
      });
    }

    const result = optimizer.calibrate();

    expect(result.success).toBe(true);
    expect(result.weights.skillMatch).toBeDefined();
    expect(result.rSquared).toBeGreaterThanOrEqual(0);
  });

  it('should produce bounded weights in [-1, 1]', () => {
    for (let i = 0; i < 15; i++) {
      optimizer.collectData({
        projectId: `test-${i}`,
        tokenBudget: 10000 + i * 5000,
        featureCount: 5 + i,
        complexity: i / 15,
        economicsScore: 30 + i * 5,
        reworkRate: 0.1 + (i % 5) * 0.1,
        successRate: 0.5 + (i % 4) * 0.1,
        timestamp: Date.now(),
      });
    }

    const result = optimizer.calibrate();
    expect(result.success).toBe(true);

    for (const [, value] of Object.entries(result.weights)) {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('should compute R-squared from actual residuals', () => {
    for (let i = 0; i < 20; i++) {
      optimizer.collectData({
        projectId: `test-${i}`,
        tokenBudget: 50000 + i * 1000,
        featureCount: 10 + (i % 5),
        complexity: 0.2 + i * 0.03,
        economicsScore: 50 + i * 2 + (i % 3),
        reworkRate: 0.1 + i * 0.02,
        successRate: 0.7 + (i % 3) * 0.05,
        timestamp: Date.now(),
      });
    }

    const result = optimizer.calibrate();
    expect(result.success).toBe(true);
    expect(result.rSquared).toBeGreaterThanOrEqual(0);
    expect(result.rSquared).toBeLessThanOrEqual(1);
  });
});
