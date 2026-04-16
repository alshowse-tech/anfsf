/**
 * ASF V4.0 Role Engine - KPI Calculation Engine
 *
 * Core KPI calculation and drift index computation.
 * Version: v0.8.5
 */
import type { RoleKPISnapshot, KPIWindow, Task, KPIChangeEvent, QueueState, CapabilityDistribution, KPIActionPolicy, TriggeredAction } from './kpi-types';
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
export declare function calculateJSD(p: number[], q: number[]): number;
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
export declare function calculateDriftIndex(taskDistribution: CapabilityDistribution, capabilityDistribution: CapabilityDistribution): number;
/**
 * Build task type distribution from task history.
 */
export declare function buildTaskTypeDistribution(tasks: Task[], windowMs: number): CapabilityDistribution;
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
export declare function calculateRoleKPI(roleId: string, dataSource: KPIDataSource, window?: KPIWindow): Promise<RoleKPISnapshot>;
/**
 * Calculate KPIs for multiple roles.
 */
export declare function calculateKPIsForRoles(roleIds: string[], dataSource: KPIDataSource, window?: KPIWindow): Promise<Map<string, RoleKPISnapshot>>;
/**
 * Default KPI action policies.
 */
export declare const DEFAULT_KPI_POLICIES: KPIActionPolicy[];
/**
 * Evaluate KPI triggers for a snapshot.
 *
 * @param kpi - KPI snapshot
 * @param policies - Policies to evaluate (default: DEFAULT_KPI_POLICIES)
 * @returns Triggered actions
 */
export declare function evaluateKPITriggers(kpi: RoleKPISnapshot, policies?: KPIActionPolicy[]): TriggeredAction[];
/**
 * Evaluate triggers for multiple roles.
 */
export declare function evaluateTriggersForRoles(kpis: RoleKPISnapshot[], policies?: KPIActionPolicy[]): TriggeredAction[];
export declare class InMemoryKPIDataSource implements KPIDataSource {
    private tasks;
    private changes;
    private queueStates;
    private capabilityDists;
    private previousKPIs;
    setTasks(roleId: string, tasks: Task[]): void;
    setChanges(roleId: string, changes: KPIChangeEvent[]): void;
    setQueueState(roleId: string, state: QueueState): void;
    setCapabilityDistribution(roleId: string, dist: CapabilityDistribution): void;
    setPreviousKPI(roleId: string, kpi: RoleKPISnapshot): void;
    getTasks(roleId: string, since: number): Promise<Task[]>;
    getChanges(roleId: string, since: number): Promise<KPIChangeEvent[]>;
    getQueueState(roleId: string): Promise<QueueState>;
    getCapabilityDistribution(roleId: string): Promise<CapabilityDistribution>;
    getPreviousKPI(roleId: string, window: KPIWindow): Promise<RoleKPISnapshot | null>;
}
