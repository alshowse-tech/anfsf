/**
 * ASF V4.0 Graph Kernel - Heatmap Tests
 * 
 * Unit tests for heat score calculation.
 * Version: v0.8.5
 */

import { describe, it, expect } from '@jest/globals';
import { calculateHeatScore } from '../heatmap';
import { NODE_TYPE_WEIGHTS } from '../constants';

describe('calculateHeatScore', () => {
  it('should calculate heat score correctly', () => {
    const score = calculateHeatScore({
      changeFrequency: 5,
      blastRadius: 10,
      riskWeight: 1.5,
      nodeType: 'APIContract',
    });

    // heat = 5 * 10 * 1.5 * 1.5 (APIContract weight) = 112.5
    expect(score).toBe(112.5);
  });

  it('should use default weight for unknown node types', () => {
    const score = calculateHeatScore({
      changeFrequency: 5,
      blastRadius: 10,
      riskWeight: 1.0,
      nodeType: 'UnknownType',
    });

    // heat = 5 * 10 * 1.0 * 1.0 (default weight) = 50
    expect(score).toBe(50);
  });

  it('should handle zero values', () => {
    const score = calculateHeatScore({
      changeFrequency: 0,
      blastRadius: 10,
      riskWeight: 1.0,
      nodeType: 'Service',
    });

    expect(score).toBe(0);
  });

  it('should round to 2 decimal places', () => {
    const score = calculateHeatScore({
      changeFrequency: 1/3,
      blastRadius: 7,
      riskWeight: 1.2,
      nodeType: 'Service',
    });

    expect(score).toBeLessThan(10);
    expect(score).toBe(Number(score.toFixed(2)));
  });
});

describe('NODE_TYPE_WEIGHTS', () => {
  it('should have higher weights for critical types', () => {
    expect(NODE_TYPE_WEIGHTS.DBSchema).toBeGreaterThan(1.5);
    expect(NODE_TYPE_WEIGHTS.APIContract).toBeGreaterThan(1.0);
    expect(NODE_TYPE_WEIGHTS.AuthModule).toBeGreaterThan(1.5);
  });

  it('should have lower weights for utility types', () => {
    expect(NODE_TYPE_WEIGHTS.Utility).toBeLessThan(1.0);
  });
});
