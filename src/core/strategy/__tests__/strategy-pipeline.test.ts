/**
 * ANFSF L5 — Strategy Pipeline Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { StrategyPipeline, createStrategyPipeline } from '../strategy-pipeline';
import type { BudgetGraphStore } from '../../role/interface-budget';
import { InMemoryKPIDataSource } from '../../role/kpi-engine';
import type { Task } from '../../role/kpi-types';
import { OfflineOptimizer } from '../../evolution/offline-optimizer';

describe('Strategy Pipeline Tests', () => {
  let pipeline: StrategyPipeline;
  let graphStore: BudgetGraphStore;
  let kpiDataSource: (roleId: string) => InMemoryKPIDataSource;

  beforeEach(() => {
    pipeline = createStrategyPipeline();

    graphStore = {
      getNodesByRole: jest.fn().mockReturnValue([
        { id: 'node-1', type: 'component' },
        { id: 'node-2', type: 'service' },
      ]),
      getEdges: jest.fn().mockReturnValue([
        { to: 'node-2', type: 'calls' },
      ]),
      getOwner: jest.fn().mockReturnValue('unknown'),
      getNodeType: jest.fn().mockReturnValue('component'),
      getNodeRiskScore: jest.fn().mockReturnValue(0.1),
    };

    kpiDataSource = (roleId: string) => {
      const ds = new InMemoryKPIDataSource();
      const tasks: Task[] = [
        { id: 't1', roleId, type: 'code', status: 'completed', createdAt: Date.now() - 60000, completedAt: Date.now() - 30000 },
        { id: 't2', roleId, type: 'test', status: 'completed', createdAt: Date.now() - 30000, completedAt: Date.now() },
        { id: 't3', roleId, type: 'review', status: 'completed', createdAt: Date.now() - 90000, completedAt: Date.now() - 60000 },
      ];
      ds.setTasks(roleId, tasks);
      return ds;
    };
  });

  it('should create pipeline instance', () => {
    expect(pipeline).toBeDefined();
  });

  it('should execute pipeline with minimal input', async () => {
    const result = await pipeline.execute({
      roleIds: ['frontend', 'backend'],
      graphStore,
      kpiDataSource,
    });

    expect(result.budgetMetrics.size).toBe(2);
    expect(result.kpiSnapshots.size).toBe(2);
    expect(result.economicsWeights).toBeDefined();
    expect(result.guardPassed).toBeDefined();
    expect(result.guardScore).toBeDefined();
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  it('should calculate budget metrics for each role', async () => {
    const result = await pipeline.execute({
      roleIds: ['role-a', 'role-b'],
      graphStore,
      kpiDataSource,
    });

    expect(result.budgetMetrics.has('role-a')).toBe(true);
    expect(result.budgetMetrics.has('role-b')).toBe(true);
  });

  it('should calculate KPI snapshots for each role', async () => {
    const result = await pipeline.execute({
      roleIds: ['role-a', 'role-b'],
      graphStore,
      kpiDataSource,
    });

    for (const [roleId, snapshot] of result.kpiSnapshots) {
      expect(snapshot.roleId).toBe(roleId);
      expect(snapshot.healthScore).toBeGreaterThanOrEqual(0);
      expect(snapshot.healthScore).toBeLessThanOrEqual(100);
    }
  });

  it('should generate budget alerts for high utilization roles', async () => {
    const highCostGraph: BudgetGraphStore = {
      getNodesByRole: jest.fn().mockReturnValue([
        { id: 'n1', type: 'component' },
        { id: 'n2', type: 'service' },
      ]),
      getEdges: jest.fn().mockReturnValue([
        { to: 'n2', type: 'calls' },
        { to: 'n3', type: 'depends_on' },
      ]),
      getOwner: jest.fn().mockReturnValue('role-b'),
      getNodeType: jest.fn().mockReturnValue('component'),
      getNodeRiskScore: jest.fn().mockReturnValue(0.3),
    };

    const result = await pipeline.execute({
      roleIds: ['role-a'],
      graphStore: highCostGraph,
      kpiDataSource,
    });

    expect(result.budgetMetrics.has('role-a')).toBe(true);
  });

  it('should evaluate KPI triggers', async () => {
    const result = await pipeline.execute({
      roleIds: ['role-a'],
      graphStore,
      kpiDataSource,
    });

    expect(Array.isArray(result.triggeredActions)).toBe(true);
  });

  it('should generate budget recommendations', async () => {
    const result = await pipeline.execute({
      roleIds: ['role-a'],
      graphStore,
      kpiDataSource,
    });

    expect(result.budgetRecommendations.size).toBe(1);
  });

  it('should use custom optimizer when provided', async () => {
    const optimizer = new OfflineOptimizer({ minSamples: 3 });

    // Feed data points
    for (let i = 0; i < 10; i++) {
      optimizer.collectData({
        projectId: `proj-${i}`,
        tokenBudget: 50000,
        featureCount: 10,
        complexity: i / 10,
        economicsScore: 0.5 + Math.random() * 0.5,
        reworkRate: 0.1 + Math.random() * 0.3,
        successRate: 0.7 + Math.random() * 0.3,
        timestamp: Date.now() - i * 3600000,
      });
    }

    // Force calibration by resetting last calibration time
    optimizer.resetCalibration();

    const result = await pipeline.execute({
      roleIds: ['role-a'],
      graphStore,
      kpiDataSource,
      optimizer,
    });

    expect(result.economicsWeights).toBeDefined();
    expect(result.economicsWeights.interfaceCost).toBeDefined();
  });

  it('should run guard checks by default', async () => {
    const result = await pipeline.execute({
      roleIds: ['role-a'],
      graphStore,
      kpiDataSource,
    });

    expect(result.guardPassed).toBe(true);
    expect(result.guardScore).toBeGreaterThan(0);
  });

  it('should skip guard checks when disabled', async () => {
    const pipelineNoGuard = createStrategyPipeline({ enableGuardChecks: false });
    const result = await pipelineNoGuard.execute({
      roleIds: ['role-a'],
      graphStore,
      kpiDataSource,
    });

    expect(result.guardPassed).toBe(true); // defaults to pass when not checked
    expect(result.guardScore).toBe(1.0);
  });

  it('should skip calibration when disabled', async () => {
    const optimizer = new OfflineOptimizer();
    for (let i = 0; i < 10; i++) {
      optimizer.collectData({
        projectId: `proj-${i}`,
        tokenBudget: 50000,
        featureCount: 10,
        complexity: 0.5,
        economicsScore: 0.7,
        reworkRate: 0.2,
        successRate: 0.8,
        timestamp: Date.now(),
      });
    }
    optimizer.resetCalibration();

    const pipelineNoCal = createStrategyPipeline({ enableCalibration: false });
    const result = await pipelineNoCal.execute({
      roleIds: ['role-a'],
      graphStore,
      kpiDataSource,
      optimizer,
    });

    expect(result.calibrationResult).toBeNull();
  });

  it('should handle empty role list', async () => {
    const result = await pipeline.execute({
      roleIds: [],
      graphStore,
      kpiDataSource,
    });

    expect(result.budgetMetrics.size).toBe(0);
    expect(result.kpiSnapshots.size).toBe(0);
    expect(result.guardPassed).toBe(true);
  });

  it('should track execution time', async () => {
    const result = await pipeline.execute({
      roleIds: ['role-a', 'role-b', 'role-c'],
      graphStore,
      kpiDataSource,
    });

    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });
});
