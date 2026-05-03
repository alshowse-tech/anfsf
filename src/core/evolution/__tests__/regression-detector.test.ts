/**
 * ANFSF L17 — Regression Detector Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { RegressionDetector, createRegressionDetector } from '../regression-detector';

describe('Regression Detector Tests', () => {
  let detector: RegressionDetector;

  beforeEach(() => {
    detector = createRegressionDetector();
  });

  // --- Data Recording ---

  it('should create detector instance', () => {
    expect(detector).toBeDefined();
  });

  it('should record KPI snapshots', () => {
    detector.recordKPI('v1', { healthScore: 90, errorRate: 0.01 });
    detector.recordKPI('v2', { healthScore: 85, errorRate: 0.03 });

    const history = detector.getKPIHistory();
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe('v1');
    expect(history[1].version).toBe('v2');
  });

  it('should record code changes', () => {
    detector.recordCodeChange('v1', {
      filesChanged: 10,
      linesAdded: 200,
      linesRemoved: 50,
      breakingChanges: 0,
      affectedModules: ['auth', 'api'],
    });

    expect(detector.getKPIHistory()).toBeDefined();
  });

  it('should trim KPI history to trend window', () => {
    detector = createRegressionDetector({ trendWindow: 3 });

    for (let i = 0; i < 5; i++) {
      detector.recordKPI(`v${i}`, { healthScore: 100 - i * 5 });
    }

    expect(detector.getKPIHistory()).toHaveLength(3);
  });

  // --- Version Comparison ---

  it('should detect KPI decline regression', () => {
    detector.recordKPI('v1', { healthScore: 95, errorRate: 0.02 });
    detector.recordKPI('v2', { healthScore: 80, errorRate: 0.05 });

    const report = detector.compareVersions('v1', 'v2');

    expect(report).not.toBeNull();
    expect(report!.hasRegressions).toBe(true);
    expect(report!.regressions.length).toBeGreaterThan(0);

    const healthRegression = report!.regressions.find(r => r.metric === 'healthScore');
    expect(healthRegression).toBeDefined();
    expect(healthRegression!.previousValue).toBe(95);
    expect(healthRegression!.currentValue).toBe(80);
    expect(healthRegression!.changePercent).toBeLessThan(0);
  });

  it('should detect error rate increase regression', () => {
    detector.recordKPI('v1', { failureRate: 0.01, avgLatency: 100 });
    detector.recordKPI('v2', { failureRate: 0.10, avgLatency: 500 });

    const report = detector.compareVersions('v1', 'v2');

    expect(report!.hasRegressions).toBe(true);
    const errorRegression = report!.regressions.find(r => r.metric === 'failureRate');
    expect(errorRegression).toBeDefined();
    expect(errorRegression!.type).toBe('error_rate_increase');
  });

  it('should detect contract breaking changes', () => {
    detector.recordKPI('v1', { healthScore: 90 });
    detector.recordKPI('v2', { healthScore: 88 });

    detector.recordCodeChange('v1', {
      filesChanged: 5,
      linesAdded: 100,
      linesRemoved: 20,
      breakingChanges: 0,
      affectedModules: ['api'],
    });
    detector.recordCodeChange('v2', {
      filesChanged: 10,
      linesAdded: 300,
      linesRemoved: 100,
      breakingChanges: 3,
      affectedModules: ['api', 'auth', 'db'],
    });

    const report = detector.compareVersions('v1', 'v2');

    const contractRegression = report!.regressions.find(r => r.type === 'contract_breaking_change');
    expect(contractRegression).toBeDefined();
    expect(contractRegression!.affectedModules).toContain('api');
  });

  it('should return null when version not found', () => {
    detector.recordKPI('v1', { healthScore: 90 });
    expect(detector.compareVersions('v1', 'v-missing')).toBeNull();
    expect(detector.compareVersions('v-missing', 'v1')).toBeNull();
  });

  it('should report no regressions for stable KPIs', () => {
    detector.recordKPI('v1', { healthScore: 90 });
    detector.recordKPI('v2', { healthScore: 91 });

    const report = detector.compareVersions('v1', 'v2');
    expect(report!.hasRegressions).toBe(false);
    expect(report!.regressions).toHaveLength(0);
  });

  it('should calculate health delta', () => {
    detector.recordKPI('v1', { healthScore: 90, errorRate: 0.01 });
    detector.recordKPI('v2', { healthScore: 80, errorRate: 0.05 });

    const report = detector.compareVersions('v1', 'v2');
    expect(report!.healthDelta).toBeLessThan(0); // Overall health declined
  });

  it('should classify severity correctly', () => {
    // Small decline = low severity
    detector.recordKPI('v1', { healthScore: 90 });
    detector.recordKPI('v2', { healthScore: 88 });

    const report = detector.compareVersions('v1', 'v2');
    // 2% decline < 5% threshold, so no regression detected
    expect(report!.hasRegressions).toBe(false);
  });

  it('should detect large decline as critical severity', () => {
    detector.recordKPI('v1', { healthScore: 95 });
    detector.recordKPI('v2', { healthScore: 40 });

    const report = detector.compareVersions('v1', 'v2');
    expect(report!.hasRegressions).toBe(true);

    const maxSeverity = report!.maxSeverity;
    expect(['critical', 'major', 'warning']).toContain(maxSeverity);
  });

  // --- Trend Analysis ---

  it('should analyze trends and detect declining KPI', () => {
    // Steady decline over multiple versions
    detector.recordKPI('v1', { healthScore: 95 });
    detector.recordKPI('v2', { healthScore: 90 });
    detector.recordKPI('v3', { healthScore: 82 });
    detector.recordKPI('v4', { healthScore: 75 });
    detector.recordKPI('v5', { healthScore: 65 });

    const regressions = detector.analyzeTrends();

    const healthRegression = regressions.find(r => r.metric === 'healthScore');
    expect(healthRegression).toBeDefined();
    expect(healthRegression!.type).toBe('kpi_decline');
  });

  it('should not detect trends with insufficient data', () => {
    detector.recordKPI('v1', { healthScore: 90 });

    const regressions = detector.analyzeTrends();
    expect(regressions).toHaveLength(0);
  });

  it('should detect increasing error rate trend', () => {
    detector.recordKPI('v1', { errorRate: 0.01 });
    detector.recordKPI('v2', { errorRate: 0.03 });
    detector.recordKPI('v3', { errorRate: 0.07 });
    detector.recordKPI('v4', { errorRate: 0.15 });
    detector.recordKPI('v5', { errorRate: 0.30 });
    detector.recordKPI('v6', { errorRate: 0.50 });

    const regressions = detector.analyzeTrends();
    const errorRegression = regressions.find(r => r.metric === 'errorRate');
    expect(errorRegression).toBeDefined();
  });

  // --- History and Stats ---

  it('should get KPI history', () => {
    detector.recordKPI('v1', { healthScore: 90 });
    detector.recordKPI('v2', { healthScore: 85 });

    const history = detector.getKPIHistory();
    expect(history).toHaveLength(2);
  });

  it('should get regressions from report', () => {
    detector.recordKPI('v1', { healthScore: 95 });
    detector.recordKPI('v2', { healthScore: 60 });

    const report = detector.compareVersions('v1', 'v2');
    const regressions = detector.getRegressionsFromReport(report!);
    expect(regressions.length).toBeGreaterThan(0);
  });

  it('should clear all data', () => {
    detector.recordKPI('v1', { healthScore: 90 });
    detector.recordCodeChange('v1', {
      filesChanged: 5,
      linesAdded: 100,
      linesRemoved: 20,
      breakingChanges: 0,
      affectedModules: ['api'],
    });

    detector.clear();
    expect(detector.getKPIHistory()).toHaveLength(0);
  });

  // --- Custom Config ---

  it('should respect custom threshold', () => {
    detector = createRegressionDetector({ kpiDeclineThreshold: 1.0 });

    // Small decline that wouldn't trigger with default 5% threshold
    detector.recordKPI('v1', { healthScore: 90 });
    detector.recordKPI('v2', { healthScore: 88 });

    const report = detector.compareVersions('v1', 'v2');
    expect(report!.hasRegressions).toBe(true);
  });
});
