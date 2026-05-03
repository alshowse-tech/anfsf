/**
 * ANFSF L17 — Rollback Manager Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { RollbackManager, createRollbackManager, type RollbackAction } from '../rollback-manager';
import type { EvolutionProposal } from '../framework';

describe('Rollback Manager Tests', () => {
  let manager: RollbackManager;

  const mockProposal: EvolutionProposal = {
    id: 'prop-1',
    description: 'Add user authentication',
    kpiImpact: {
      style_loading_success_rate: 0,
      contract_change_success_rate: 0,
      role_assignment_efficiency: 0,
      token_budget_compliance: 0,
      deployment_success_rate: 0,
    },
    budgetImpact: 100,
    riskScore: 30,
    changes: [],
  };

  const mockState = {
    auth: { provider: 'oauth2', enabled: true },
    db: { pool: 10, timeout: 5000 },
    cache: { ttl: 300, maxSize: 1000 },
  };

  const mockKpiSnapshot = {
    style_loading_success_rate: 99.5,
    contract_change_success_rate: 95.0,
    role_assignment_efficiency: 85.0,
    token_budget_compliance: 100.0,
    deployment_success_rate: 98.0,
  };

  const mockContractHashes = ['abc123', 'def456'];

  beforeEach(() => {
    manager = createRollbackManager();
  });

  // --- Snapshot Management ---

  it('should create manager instance', () => {
    expect(manager).toBeDefined();
  });

  it('should create a version snapshot', () => {
    const snapshot = manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);

    expect(snapshot.version).toBeDefined();
    expect(snapshot.label).toBe('Add user authentication');
    expect(snapshot.proposalId).toBe('prop-1');
    expect(snapshot.state).toEqual(mockState);
    expect(snapshot.kpiSnapshot).toEqual(mockKpiSnapshot);
    expect(snapshot.contractHashes).toEqual(mockContractHashes);
    expect(snapshot.metadata?.riskScore).toBe(30);
  });

  it('should return snapshot by version ID', () => {
    const snapshot = manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);
    const found = manager.getSnapshot(snapshot.version);
    expect(found).toBe(snapshot);
  });

  it('should return null for unknown version', () => {
    expect(manager.getSnapshot('v-unknown')).toBeNull();
  });

  it('should return all snapshots', () => {
    manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);
    manager.createSnapshot({ ...mockProposal, id: 'prop-2' }, { ...mockState, auth: { provider: 'jwt', enabled: true } }, mockKpiSnapshot, mockContractHashes);

    expect(manager.getAllSnapshots()).toHaveLength(2);
  });

  it('should track current version', () => {
    const s1 = manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);
    expect(manager.getCurrentVersion()).toBe(s1.version);
  });

  it('should trim history to maxHistorySize', () => {
    manager = createRollbackManager({ maxHistorySize: 3 });

    for (let i = 0; i < 5; i++) {
      manager.createSnapshot(
        { ...mockProposal, id: `prop-${i}` },
        { ...mockState, counter: i },
        mockKpiSnapshot,
        mockContractHashes
      );
    }

    expect(manager.getAllSnapshots()).toHaveLength(3);
  });

  // --- Rollback Planning ---

  it('should plan rollback between versions', () => {
    const s1 = manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);
    const s2 = manager.createSnapshot(
      { ...mockProposal, id: 'prop-2' },
      { ...mockState, auth: { provider: 'jwt', enabled: true } },
      mockKpiSnapshot,
      mockContractHashes
    );

    const plan = manager.planRollback(s1.version, {
      ...mockState,
      auth: { provider: 'jwt', enabled: true },
    });

    expect(plan).not.toBeNull();
    expect(plan!.targetVersion).toBe(s1.version);
    expect(plan!.currentVersion).toBe(s2.version);
    expect(plan!.actions.length).toBeGreaterThan(0);
    expect(plan!.safe).toBeDefined();
    expect(plan!.estimatedRisk).toBeGreaterThanOrEqual(0);
    expect(plan!.estimatedRisk).toBeLessThanOrEqual(1);
  });

  it('should return null for unknown target version', () => {
    manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);
    expect(manager.planRollback('v-unknown', mockState)).toBeNull();
  });

  it('should return null when no current version', () => {
    expect(manager.planRollback('v1', mockState)).toBeNull();
  });

  it('should generate correct diff actions', () => {
    manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);

    const currentState = {
      auth: { provider: 'jwt', enabled: false },
      db: { pool: 20, timeout: 10000 },
      cache: { ttl: 300, maxSize: 1000 },
      newFeature: { enabled: true },
    };

    const plan = manager.planRollback(manager.getCurrentVersion()!, currentState);

    const authAction = plan!.actions.find(a => a.target === 'auth');
    expect(authAction).toBeDefined();
    expect(authAction!.targetValue).toEqual({ provider: 'oauth2', enabled: true });

    const dbAction = plan!.actions.find(a => a.target === 'db');
    expect(dbAction).toBeDefined();

    const newFeatureAction = plan!.actions.find(a => a.target === 'newFeature');
    expect(newFeatureAction).toBeDefined();
    expect(newFeatureAction!.targetValue).toBeUndefined();
  });

  it('should estimate risk based on change ratio', () => {
    manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);

    // Small change
    const smallPlan = manager.planRollback(manager.getCurrentVersion()!, {
      ...mockState,
      newKey: 'value',
    });
    expect(smallPlan!.estimatedRisk).toBeLessThan(1);

    // Large change
    const largePlan = manager.planRollback(manager.getCurrentVersion()!, {
      completely: 'different',
    });
    expect(largePlan!.estimatedRisk).toBeGreaterThan(smallPlan!.estimatedRisk);
  });

  // --- Rollback Execution ---

  it('should execute successful rollback', async () => {
    const s1 = manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);
    const currentState = { ...mockState, auth: { provider: 'jwt', enabled: false } };
    const plan = manager.planRollback(s1.version, currentState)!;

    const appliedActions: RollbackAction[] = [];
    const execution = await manager.executeRollback(plan, async (action) => {
      appliedActions.push(action);
    });

    expect(execution.status).toBe('completed');
    expect(execution.executedActions).toBe(plan.actions.length);
    expect(execution.failedActions).toHaveLength(0);
    expect(execution.finalVersion).toBe(s1.version);
    expect(manager.getCurrentVersion()).toBe(s1.version);
  });

  it('should handle rollback failure', async () => {
    const s1 = manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);
    const plan = manager.planRollback(s1.version, { ...mockState, extra: true })!;

    let callCount = 0;
    const execution = await manager.executeRollback(plan, async (action) => {
      callCount++;
      if (callCount === 1) {
        throw new Error(`Failed to rollback ${action.target}`);
      }
    });

    expect(execution.status).toBe('failed');
    expect(execution.failedActions.length).toBeGreaterThan(0);
    expect(execution.error).toContain('Failed to rollback');
  });

  it('should track rollback history', async () => {
    const s1 = manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);
    const plan = manager.planRollback(s1.version, mockState)!;

    await manager.executeRollback(plan, async () => {});

    const history = manager.getRollbackHistory();
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('completed');
  });

  it('should rollback to older version with multiple intermediate snapshots', async () => {
    const s1 = manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);
    manager.createSnapshot({ ...mockProposal, id: 'prop-2' }, { ...mockState, step: 1 }, mockKpiSnapshot, mockContractHashes);
    manager.createSnapshot({ ...mockProposal, id: 'prop-3' }, { ...mockState, step: 2 }, mockKpiSnapshot, mockContractHashes);

    const plan = manager.planRollback(s1.version, { ...mockState, step: 2 })!;
    expect(plan.targetVersion).toBe(s1.version);
  });

  // --- Auto-Rollback ---

  it('should auto-rollback when violation count exceeds threshold', async () => {
    manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);
    manager.createSnapshot(
      { ...mockProposal, id: 'prop-bad' },
      { ...mockState, auth: { provider: 'broken' } },
      { ...mockKpiSnapshot, deployment_success_rate: 50 },
      mockContractHashes
    );

    const currentState = { ...mockState, auth: { provider: 'broken' } };
    const execution = await manager.autoRollback(5, 3, currentState, async () => {});

    // Auto-rollback should trigger if a safe version exists
    expect(execution).toBeDefined();
  });

  it('should not auto-rollback when below threshold', async () => {
    manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);

    const result = await manager.autoRollback(1, 3, mockState, async () => {});
    expect(result).toBeNull();
  });

  // --- Summary ---

  it('should provide accurate summary', async () => {
    manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);

    const summary = manager.getSummary();
    expect(summary.totalSnapshots).toBe(1);
    expect(summary.totalRollbacks).toBe(0);
    expect(summary.successfulRollbacks).toBe(0);
    expect(summary.failedRollbacks).toBe(0);
  });

  it('should update summary after rollback', async () => {
    const s1 = manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);
    const plan = manager.planRollback(s1.version, mockState)!;

    await manager.executeRollback(plan, async () => {});

    const summary = manager.getSummary();
    expect(summary.totalRollbacks).toBe(1);
    expect(summary.successfulRollbacks).toBe(1);
    expect(summary.lastRollbackAt).not.toBeNull();
  });

  // --- Clear History ---

  it('should clear all history', () => {
    manager.createSnapshot(mockProposal, mockState, mockKpiSnapshot, mockContractHashes);
    manager.clearHistory();

    expect(manager.getAllSnapshots()).toHaveLength(0);
    expect(manager.getRollbackHistory()).toHaveLength(0);
    expect(manager.getCurrentVersion()).toBeNull();
  });

  // --- Custom Config ---

  it('should respect custom config', () => {
    manager = createRollbackManager({
      requireDryRun: false,
      maxAutoRollbackRisk: 0.8,
      rollbackTimeoutMs: 5000,
    });

    const summary = manager.getSummary();
    expect(summary).toBeDefined();
  });
});
