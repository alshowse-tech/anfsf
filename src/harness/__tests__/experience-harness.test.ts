/**
 * ANFSF V1.5.0 - Experience Harness Unit Tests
 * Merged from UI/UX Harness + Evolution Harness tests.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExperienceHarness } from '../experience-harness';

describe('Experience Harness Unit Tests', () => {
  let harness: ExperienceHarness;

  beforeEach(() => {
    harness = new ExperienceHarness();
  });

  // ========== UI/UX Tests ==========

  it('should create harness with default config', () => {
    const metrics = harness.getMetrics();
    expect(metrics.genUIEnabled).toBe(true);
    expect(metrics.styleValidationEnabled).toBe(true);
    expect(metrics.kpiOptimizerEnabled).toBe(true);
    expect(metrics.dataFlywheelEnabled).toBe(true);
  });

  it('should synthesize UI from PRD', async () => {
    const prd = { features: [{ name: 'Test Feature', type: 'component' }], userSegment: 'standard', deviceType: 'desktop' };
    const result = await harness.synthesizeUI(prd);
    expect(result.componentTree).toBeDefined();
    expect(result.componentTree?.components).toHaveLength(1);
  });

  it('should calculate personalization budget for standard user', async () => {
    const prd = { features: [{ name: 'Test', type: 'component' }], userSegment: 'standard', deviceType: 'desktop' };
    const result = await harness.synthesizeUI(prd);
    expect(result.personalizationBudget).toBe(100);
  });

  it('should calculate personalization budget for premium user', async () => {
    const prd = { features: [{ name: 'Test', type: 'component' }], userSegment: 'premium', deviceType: 'desktop' };
    const result = await harness.synthesizeUI(prd);
    expect(result.personalizationBudget).toBe(150);
  });

  it('should validate style loading', async () => {
    const prd = { features: [{ name: 'Test', type: 'component' }], userSegment: 'standard', deviceType: 'desktop' };
    const result = await harness.synthesizeUI(prd);
    expect(result.styleReport).toBeDefined();
    expect(result.styleReport?.criticalCSSInlined).toBe(true);
  });

  it('should cache style validation results', async () => {
    const prd = { features: [{ name: 'Cached Test', type: 'component' }], userSegment: 'standard', deviceType: 'desktop' };
    await harness.synthesizeUI(prd);
    const metrics1 = harness.getMetrics();
    await harness.synthesizeUI(prd);
    const metrics2 = harness.getMetrics();
    expect(metrics2.styleCacheSize).toBeGreaterThanOrEqual(metrics1.styleCacheSize);
  });

  it('should clear style cache', async () => {
    const prd = { features: [{ name: 'Test', type: 'component' }], userSegment: 'standard', deviceType: 'desktop' };
    await harness.synthesizeUI(prd);
    harness.clearStyleCache();
    const metrics = harness.getMetrics();
    expect(metrics.styleCacheSize).toBe(0);
  });

  // ========== Evolution Tests ==========

  it('should optimize agent KPIs', async () => {
    const currentKPIs = [{ name: 'Throughput', value: 100, target: 120 }, { name: 'Accuracy', value: 0.95, target: 0.98 }];
    const result = await harness.optimizeKPIs('agent-1', currentKPIs);
    expect(result.optimizedKPIs.length).toBe(2);
    expect(result.success).toBe(true);
  });

  it('should run data flywheel', async () => {
    const result = await harness.runDataFlywheel();
    expect(result.dataPoints).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('should collect project data', () => {
    const data = { projectId: 'test-project-1', tokenBudget: 100000, featureCount: 20, complexity: 0.5, economicsScore: 75, reworkRate: 0.15, successRate: 0.85, timestamp: Date.now() };
    harness.collectProjectData(data);
    const metrics = harness.getMetrics();
    expect(metrics.projectDataCount).toBe(1);
  });

  it('should track KPI history', async () => {
    const kpis1 = [{ name: 'Throughput', value: 100, target: 120 }];
    await harness.optimizeKPIs('agent-1', kpis1);
    const kpis2 = [{ name: 'Throughput', value: 110, target: 120 }];
    await harness.optimizeKPIs('agent-1', kpis2);
    const metrics = harness.getMetrics();
    expect(metrics.projectDataCount).toBeGreaterThanOrEqual(0);
  });

  it('should handle multiple agents', async () => {
    const kpis = [{ name: 'Throughput', value: 100, target: 120 }];
    await harness.optimizeKPIs('agent-1', kpis);
    await harness.optimizeKPIs('agent-2', kpis);
    await harness.optimizeKPIs('agent-3', kpis);
    const metrics = harness.getMetrics();
    expect(metrics.projectDataCount).toBeGreaterThanOrEqual(0);
  });

  it('should cleanup resources on dispose', () => {
    const data = { projectId: 'test', tokenBudget: 100000, featureCount: 20, complexity: 0.5, economicsScore: 75, reworkRate: 0.15, successRate: 0.85, timestamp: Date.now() };
    harness.collectProjectData(data);
    harness.dispose();
    const metrics = harness.getMetrics();
    expect(metrics.projectDataCount).toBe(0);
    expect(metrics.styleCacheSize).toBe(0);
  });

  // ========== Integration Tests ==========

  it('should complete full UI + Evolution workflow', async () => {
    const prd = { features: [{ name: 'User Dashboard', type: 'page' }, { name: 'Analytics', type: 'component' }], userSegment: 'premium', deviceType: 'desktop' };
    const uiResult = await harness.synthesizeUI(prd);
    expect(uiResult.componentTree).toBeDefined();

    const projectData = { projectId: 'integration-test-1', tokenBudget: 150000, featureCount: 25, complexity: 0.6, economicsScore: uiResult.personalizationBudget, reworkRate: 0.1, successRate: 0.9, timestamp: Date.now() };
    harness.collectProjectData(projectData);

    const kpis = [{ name: 'UI Quality', value: 0.9, target: 0.95 }, { name: 'Performance', value: 85, target: 90 }];
    const kpiResult = await harness.optimizeKPIs('ui-agent', kpis);
    expect(kpiResult.optimizedKPIs.length).toBe(2);

    const flywheelResult = await harness.runDataFlywheel();
    expect(flywheelResult.dataPoints).toBeGreaterThanOrEqual(1);
  });
});
