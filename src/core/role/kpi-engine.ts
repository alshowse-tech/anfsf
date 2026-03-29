/**
 * ASF V4.0 Role Engine - KPI Calculation Engine
 * 
 * Core KPI calculation and drift index computation.
 * Version: v0.8.5
 */

import type {
  RoleKPISnapshot,
  KPIWindow,
  Task,
  KPIChangeEvent,
  QueueState,
  CapabilityDistribution,
  KPIActionPolicy,
  TriggeredAction,
} from './kpi-types';
import {
  WINDOW_DURATION,
  calculateHealthScore,
  determineTrend,
  KPI_THRESHOLDS,
} from './kpi-types';

// ============================================================================
// Drift Index Calculation
// ============================================================================

/**
 * Calculate Jensen-Shannon Divergence between two distributions.
 * 
 * JSD is a symmetric, smoothed version of KL divergence.
 * Range: 0 (identical) to 1 (completely different)
 * 
 * @param p - First distribution
 * @param q - Second distribution
 * @returns JSD value (0-1)
 */
export function calculateJSD(p: number[], q: number[]): number {
  if (p.length !== q.length) {
    throw new Error('Distributions must have same length');
  }

  const n = p.length;
  if (n === 0) return 0;

  // Calculate mixture distribution M = (P + Q) / 2
  const m: number[] = [];
  for (let i = 0; i < n; i++) {
    m.push((p[i] + q[i]) / 2);
  }

  // Calculate KL(P || M) and KL(Q || M)
  let klPM = 0;
  let klQM = 0;

  for (let i = 0; i < n; i++) {
    const pi = p[i] || 0.0001; // Avoid log(0)
    const qi = q[i] || 0.0001;
    const mi = m[i] || 0.0001;

    klPM += pi * Math.log2(pi / mi);
    klQM += qi * Math.log2(qi / mi);
  }

  // JSD = (KL(P || M) + KL(Q || M)) / 2
  const jsd = (klPM + klQM) / 2;

  // Normalize to 0-1 range (max JSD is 1 for log2)
  return Math.min(1, Math.max(0, jsd));
}

/**
 * Calculate drift index between task distribution and capability distribution.
 * 
 * @param taskDistribution - Actual task type distribution
 * @param capabilityDistribution - Expected capability distribution
 * @returns Drift index (0-1, higher = more drift)
 * 
 * @example
 * ```typescript
 * const taskDist = { api: 0.6, db: 0.3, ui: 0.1 };
 * const capDist = { api: 0.4, db: 0.4, ui: 0.2 };
 * const drift = calculateDriftIndex(taskDist, capDist);
 * // drift ≈ 0.15 (moderate drift)
 * ```
 */
export function calculateDriftIndex(
  taskDistribution: CapabilityDistribution,
  capabilityDistribution: CapabilityDistribution
): number {
  // Get all unique keys
  const allKeys = new Set([
    ...Object.keys(taskDistribution),
    ...Object.keys(capabilityDistribution),
  ]);

  const sortedKeys = Array.from(allKeys).sort();

  // Build aligned distributions
  const p: number[] = [];
  const q: number[] = [];

  for (const key of sortedKeys) {
    p.push(taskDistribution[key] || 0.0001);
    q.push(capabilityDistribution[key] || 0.0001);
  }

  // Normalize distributions
  const pSum = p.reduce((a, b) => a + b, 0);
  const qSum = q.reduce((a, b) => a + b, 0);

  const pNorm = p.map((x) => x / pSum);
  const qNorm = q.map((x) => x / qSum);

  // Calculate JSD
  const drift = calculateJSD(pNorm, qNorm);

  return Math.round(drift * 1000) / 1000;
}

/**
 * Build task type distribution from task history.
 */
export function buildTaskTypeDistribution(
  tasks: Task[],
  windowMs: number
): CapabilityDistribution {
  const cutoff = Date.now() - windowMs;
  const typeCounts: Record<string, number> = {};
  let total = 0;

  for (const task of tasks) {
    // Only count completed tasks within window
    if (task.status === 'completed' && task.completedAt && task.completedAt >= cutoff) {
      typeCounts[task.type] = (typeCounts[task.type] || 0) + 1;
      total++;
    }
  }

  // Convert to distribution
  const distribution: CapabilityDistribution = {};
  for (const [type, count] of Object.entries(typeCounts)) {
    distribution[type] = total > 0 ? count / total : 0;
  }

  return distribution;
}

// ============================================================================
// KPI Calculation
// ============================================================================

/**
 * KPI data source interface.
 */
export interface KPIDataSource {
  /** Get tasks for a role */
  getTasks(roleId: string, since: number): Promise<Task[]>;
  
  /** Get change events for a role */
  getChanges(roleId: string, since: number): Promise<KPIChangeEvent[]>;
  
  /** Get queue state for a role */
  getQueueState(roleId: string): Promise<QueueState>;
  
  /** Get capability distribution for a role */
  getCapabilityDistribution(roleId: string): Promise<CapabilityDistribution>;
  
  /** Get previous KPI snapshot */
  getPreviousKPI(roleId: string, window: KPIWindow): Promise<RoleKPISnapshot | null>;
}

/**
 * Calculate KPI for a role.
 * 
 * @param roleId - Role ID
 * @param dataSource - KPI data source
 * @param window - Time window (default: '1d')
 * @returns KPI snapshot
 */
export async function calculateRoleKPI(
  roleId: string,
  dataSource: KPIDataSource,
  window: KPIWindow = '1d'
): Promise<RoleKPISnapshot> {
  const windowMs = WINDOW_DURATION[window];
  const cutoff = Date.now() - windowMs;

  // Fetch data
  const [tasks, changes, queueState, capabilityDist] = await Promise.all([
    dataSource.getTasks(roleId, cutoff),
    dataSource.getChanges(roleId, cutoff),
    dataSource.getQueueState(roleId),
    dataSource.getCapabilityDistribution(roleId),
  ]);

  // Calculate throughput (tasks per hour)
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const hours = windowMs / (60 * 60 * 1000);
  const throughput = completedTasks.length / hours;

  // Calculate failure rate
  const failedTasks = tasks.filter((t) => t.status === 'failed');
  const failureRate = tasks.length > 0 ? failedTasks.length / tasks.length : 0;

  // Calculate rework rate
  const reworkedTasks = tasks.filter((t) => (t.reworkCount || 0) > 0);
  const reworkRate = tasks.length > 0 ? reworkedTasks.length / tasks.length : 0;

  // Calculate queue pressure
  const queuePressure = queueState.maxLength > 0
    ? queueState.currentLength / queueState.maxLength
    : 0;

  // Calculate conflict rate
  const conflictChanges = changes.filter((c) => c.conflict);
  const conflictRate = changes.length > 0 ? conflictChanges.length / changes.length : 0;

  // Calculate drift index
  const taskDist = buildTaskTypeDistribution(tasks, windowMs);
  const driftIndex = calculateDriftIndex(taskDist, capabilityDist);

  // Calculate health score
  const healthScore = calculateHealthScore({
    throughput,
    failureRate,
    reworkRate,
    queuePressure,
    conflictRate,
    driftIndex,
  });

  // Get previous KPI for trend
  const previousKPI = await dataSource.getPreviousKPI(roleId, window);
  const trend = previousKPI
    ? determineTrend(healthScore, previousKPI.healthScore)
    : 'stable';

  return {
    roleId,
    timestamp: Date.now(),
    window,
    throughput: Math.round(throughput * 100) / 100,
    failureRate: Math.round(failureRate * 1000) / 1000,
    reworkRate: Math.round(reworkRate * 1000) / 1000,
    queuePressure: Math.round(queuePressure * 100) / 100,
    conflictRate: Math.round(conflictRate * 1000) / 1000,
    driftIndex: Math.round(driftIndex * 1000) / 1000,
    healthScore,
    trend,
    taskCount: tasks.length,
    changeCount: changes.length,
  };
}

/**
 * Calculate KPIs for multiple roles.
 */
export async function calculateKPIsForRoles(
  roleIds: string[],
  dataSource: KPIDataSource,
  window: KPIWindow = '1d'
): Promise<Map<string, RoleKPISnapshot>> {
  const results = new Map<string, RoleKPISnapshot>();

  for (const roleId of roleIds) {
    const kpi = await calculateRoleKPI(roleId, dataSource, window);
    results.set(roleId, kpi);
  }

  return results;
}

// ============================================================================
// KPI Action Policies
// ============================================================================

/**
 * Default KPI action policies.
 */
export const DEFAULT_KPI_POLICIES: KPIActionPolicy[] = [
  {
    name: 'queue_pressure_split',
    condition: (kpi) => kpi.queuePressure > KPI_THRESHOLDS.QUEUE_PRESSURE_CRITICAL,
    action: 'suggest_split',
    message: (kpi: RoleKPISnapshot) =>
      `Role ${kpi.roleId} has critical queue pressure (${kpi.queuePressure.toFixed(2)}). Consider splitting responsibilities.`,
    priority: 'high',
  } as any,
  {
    name: 'drift_reassign',
    condition: (kpi) =>
      kpi.driftIndex > KPI_THRESHOLDS.DRIFT_INDEX_CRITICAL &&
      kpi.failureRate > KPI_THRESHOLDS.FAILURE_RATE_WARNING,
    action: 'suggest_reassign',
    message: (kpi: RoleKPISnapshot) =>
      `Role ${kpi.roleId} has high drift (${kpi.driftIndex.toFixed(2)}) and elevated failure rate. Tasks may not match capabilities.`,
    priority: 'high',
  } as any,
  {
    name: 'conflict_tighten',
    condition: (kpi) => kpi.conflictRate > KPI_THRESHOLDS.CONFLICT_RATE_CRITICAL,
    action: 'alert',
    message: (kpi: RoleKPISnapshot) =>
      `Role ${kpi.roleId} has high conflict rate (${(kpi.conflictRate * 100).toFixed(1)}%). Consider tightening ownership rules.`,
    priority: 'medium',
  } as any,
  {
    name: 'rework_review',
    condition: (kpi) => kpi.reworkRate > KPI_THRESHOLDS.REWORK_RATE_CRITICAL,
    action: 'alert',
    message: (kpi: RoleKPISnapshot) =>
      `Role ${kpi.roleId} has high rework rate (${(kpi.reworkRate * 100).toFixed(1)}%). Review DoD gates and quality processes.`,
    priority: 'medium',
  } as any,
  {
    name: 'failure_investigate',
    condition: (kpi) => kpi.failureRate > KPI_THRESHOLDS.FAILURE_RATE_CRITICAL,
    action: 'alert',
    message: (kpi: RoleKPISnapshot) =>
      `Role ${kpi.roleId} has high failure rate (${(kpi.failureRate * 100).toFixed(1)}%). Investigate root causes.`,
    priority: 'high',
  } as any,
];

/**
 * Evaluate KPI triggers for a snapshot.
 * 
 * @param kpi - KPI snapshot
 * @param policies - Policies to evaluate (default: DEFAULT_KPI_POLICIES)
 * @returns Triggered actions
 */
export function evaluateKPITriggers(
  kpi: RoleKPISnapshot,
  policies: KPIActionPolicy[] = DEFAULT_KPI_POLICIES
): TriggeredAction[] {
  const triggered: TriggeredAction[] = [];

  for (const policy of policies) {
    try {
      if (policy.condition(kpi)) {
        const message = typeof policy.message === 'function'
          ? policy.message(kpi)
          : policy.message;

        triggered.push({
          policy,
          roleId: kpi.roleId,
          kpi,
          message,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error(`Error evaluating policy ${policy.name || 'unnamed'}:`, error);
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  triggered.sort(
    (a, b) => priorityOrder[a.policy.priority] - priorityOrder[b.policy.priority]
  );

  return triggered;
}

/**
 * Evaluate triggers for multiple roles.
 */
export function evaluateTriggersForRoles(
  kpis: RoleKPISnapshot[],
  policies: KPIActionPolicy[] = DEFAULT_KPI_POLICIES
): TriggeredAction[] {
  const allTriggered: TriggeredAction[] = [];

  for (const kpi of kpis) {
    const triggered = evaluateKPITriggers(kpi, policies);
    allTriggered.push(...triggered);
  }

  return allTriggered;
}

// ============================================================================
// In-Memory Data Source (for testing)
// ============================================================================

export class InMemoryKPIDataSource implements KPIDataSource {
  private tasks: Map<string, Task[]> = new Map();
  private changes: Map<string, KPIChangeEvent[]> = new Map();
  private queueStates: Map<string, QueueState> = new Map();
  private capabilityDists: Map<string, CapabilityDistribution> = new Map();
  private previousKPIs: Map<string, RoleKPISnapshot> = new Map();

  setTasks(roleId: string, tasks: Task[]): void {
    this.tasks.set(roleId, tasks);
  }

  setChanges(roleId: string, changes: KPIChangeEvent[]): void {
    this.changes.set(roleId, changes);
  }

  setQueueState(roleId: string, state: QueueState): void {
    this.queueStates.set(roleId, state);
  }

  setCapabilityDistribution(roleId: string, dist: CapabilityDistribution): void {
    this.capabilityDists.set(roleId, dist);
  }

  setPreviousKPI(roleId: string, kpi: RoleKPISnapshot): void {
    this.previousKPIs.set(roleId, kpi);
  }

  async getTasks(roleId: string, since: number): Promise<Task[]> {
    return this.tasks.get(roleId) || [];
  }

  async getChanges(roleId: string, since: number): Promise<KPIChangeEvent[]> {
    return this.changes.get(roleId) || [];
  }

  async getQueueState(roleId: string): Promise<QueueState> {
    return (
      this.queueStates.get(roleId) || {
        roleId,
        currentLength: 0,
        maxLength: 10,
        processingCount: 0,
      }
    );
  }

  async getCapabilityDistribution(roleId: string): Promise<CapabilityDistribution> {
    return this.capabilityDists.get(roleId) || {};
  }

  async getPreviousKPI(roleId: string, window: KPIWindow): Promise<RoleKPISnapshot | null> {
    return this.previousKPIs.get(roleId) || null;
  }
}
