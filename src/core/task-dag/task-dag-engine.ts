/**
 * ANFSF L8 — Task DAG Engine
 *
 * Dynamic task DAG construction and scheduling based on requirement graphs.
 * Features:
 *   - Topological sort with cycle detection
 *   - Parallelism analysis (independent task groups)
 *   - Critical path computation
 *   - Runtime task insertion and re-planning
 *   - Integration with RequirementGraph for auto-build from IR
 */

import type { RequirementGraph, GraphNode, GraphEdge } from '../../req-graph/graph-engine';
import type { ServiceIR, UIIR, WorkflowIR, DataIR } from '../../req-graph/graph-engine';

// ============================================================================
// Types
// ============================================================================

export type TaskStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'blocked';

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

export interface TaskNode {
  id: string;
  name: string;
  type: string; // 'service' | 'ui' | 'workflow' | 'data' | 'guard' | 'test'
  priority: TaskPriority;
  status: TaskStatus;
  /** Estimated complexity (0-1) */
  complexity: number;
  /** Dependencies that must complete before this task can start */
  dependencies: string[];
  /** Tasks that depend on this task */
  dependents: string[];
  /** Associated IR node ID */
  irNodeId?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
  /** Execution time estimate (ms) */
  estimatedDuration?: number;
}

export interface TaskDAGConfig {
  /** Maximum parallel tasks */
  maxParallelism: number;
  /** Auto-detect cycles and break them */
  autoBreakCycles: boolean;
  /** Default priority for tasks */
  defaultPriority: TaskPriority;
}

const DEFAULT_CONFIG: TaskDAGConfig = {
  maxParallelism: 10,
  autoBreakCycles: true,
  defaultPriority: 'normal',
};

export interface DAGExecutionPlan {
  /** Ordered waves of tasks that can run in parallel */
  waves: string[][];
  /** Critical path (longest dependency chain) */
  criticalPath: string[];
  /** Total estimated duration */
  estimatedDuration: number;
  /** Parallelism efficiency (1 = fully parallel, 0 = fully serial) */
  parallelismRatio: number;
}

export interface DAGStatus {
  totalTasks: number;
  completed: number;
  running: number;
  pending: number;
  blocked: number;
  failed: number;
  ready: number;
}

export interface TaskInsertionResult {
  inserted: boolean;
  /** Tasks that need re-scheduling due to new dependencies */
  affectedTasks: string[];
  /** New execution plan */
  newPlan?: DAGExecutionPlan | null;
}

// ============================================================================
// Task DAG Engine
// ============================================================================

export class TaskDAGEngine {
  private config: TaskDAGConfig;
  private tasks: Map<string, TaskNode> = new Map();
  private adjacency: Map<string, Set<string>> = new Map(); // task -> set of dependents
  private reverseAdjacency: Map<string, Set<string>> = new Map(); // task -> set of dependencies
  private inDegree: Map<string, number> = new Map();

  constructor(config: Partial<TaskDAGConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Task Management
  // ---------------------------------------------------------------------------

  /**
   * Add a task to the DAG.
   */
  addTask(task: Omit<TaskNode, 'status' | 'dependencies' | 'dependents'> & { dependencies?: string[] }): void {
    const node: TaskNode = {
      ...task,
      status: 'pending',
      dependencies: task.dependencies ?? [],
      dependents: [],
    };

    this.tasks.set(node.id, node);

    // Initialize adjacency entries
    if (!this.adjacency.has(node.id)) this.adjacency.set(node.id, new Set());
    if (!this.reverseAdjacency.has(node.id)) this.reverseAdjacency.set(node.id, new Set());
    if (!this.inDegree.has(node.id)) this.inDegree.set(node.id, 0);

    // Register dependencies
    for (const depId of node.dependencies) {
      this.addEdge(depId, node.id);
    }
  }

  /**
   * Remove a task and update all references.
   */
  removeTask(taskId: string): boolean {
    if (!this.tasks.has(taskId)) return false;

    // Remove edges from dependencies
    const task = this.tasks.get(taskId)!;
    for (const depId of task.dependencies) {
      this.adjacency.get(depId)?.delete(taskId);
    }

    // Remove edges from dependents
    for (const dependentId of task.dependents) {
      this.reverseAdjacency.get(dependentId)?.delete(taskId);
      this.inDegree.set(dependentId, this.inDegree.get(dependentId)! - 1);
      // Clean up the dependent's dependency array
      const dependentTask = this.tasks.get(dependentId);
      if (dependentTask) {
        dependentTask.dependencies = dependentTask.dependencies.filter(d => d !== taskId);
      }
    }

    this.tasks.delete(taskId);
    this.adjacency.delete(taskId);
    this.reverseAdjacency.delete(taskId);
    this.inDegree.delete(taskId);

    return true;
  }

  /**
   * Mark a task as completed and update downstream tasks.
   */
  completeTask(taskId: string): { newlyReady: string[] } {
    const task = this.tasks.get(taskId);
    if (!task) return { newlyReady: [] };

    task.status = 'completed';
    const newlyReady: string[] = [];

    // Update all dependents
    for (const dependentId of this.adjacency.get(taskId) ?? []) {
      this.inDegree.set(dependentId, this.inDegree.get(dependentId)! - 1);

      const dependent = this.tasks.get(dependentId);
      if (dependent && this.inDegree.get(dependentId) === 0 && dependent.status === 'pending') {
        // Check if all dependencies are actually completed
        const allDepsCompleted = dependent.dependencies.every(
          depId => this.tasks.get(depId)?.status === 'completed'
        );
        if (allDepsCompleted) {
          dependent.status = 'ready';
          newlyReady.push(dependentId);
        }
      }
    }

    return { newlyReady };
  }

  /**
   * Mark a task as failed.
   */
  failTask(taskId: string): string[] {
    const task = this.tasks.get(taskId);
    if (!task) return [];

    task.status = 'failed';
    const blockedTasks: string[] = [];

    // Block all downstream tasks
    const queue = [...this.adjacency.get(taskId) ?? []];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const downstream = this.tasks.get(current);
      if (downstream && downstream.status !== 'completed' && downstream.status !== 'failed') {
        downstream.status = 'blocked';
        blockedTasks.push(current);
      }

      for (const further of this.adjacency.get(current) ?? []) {
        queue.push(further);
      }
    }

    return blockedTasks;
  }

  // ---------------------------------------------------------------------------
  // Scheduling
  // ---------------------------------------------------------------------------

  /**
   * Get tasks that are ready to execute (all dependencies completed).
   */
  getReadyTasks(): string[] {
    const ready: string[] = [];
    for (const [id, task] of this.tasks) {
      if (task.status !== 'ready' && task.status !== 'pending') continue;
      if (task.status === 'ready') {
        ready.push(id);
        continue;
      }
      const allDepsCompleted = task.dependencies.every(
        depId => this.tasks.get(depId)?.status === 'completed'
      );
      if (allDepsCompleted) {
        task.status = 'ready';
        ready.push(id);
      }
    }
    // Sort by priority
    const priorityOrder: Record<TaskPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
    ready.sort((a, b) => priorityOrder[this.tasks.get(a)!.priority] - priorityOrder[this.tasks.get(b)!.priority]);
    return ready;
  }

  /**
   * Generate a full execution plan with parallel waves.
   */
  generateExecutionPlan(): DAGExecutionPlan | null {
    // Check for cycles
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      if (!this.config.autoBreakCycles) return null;
      // Break cycles by removing the lowest-priority edge in each cycle
      this.breakCycles(cycles);
    }

    // Topological sort using Kahn's algorithm
    const waves: string[][] = [];
    const inDeg = new Map<string, number>();

    for (const [id] of this.tasks) {
      inDeg.set(id, this.tasks.get(id)!.dependencies.filter(d => this.tasks.has(d)).length);
    }

    const remaining = new Set(inDeg.keys());

    while (remaining.size > 0) {
      // Find all zero-in-degree tasks
      const wave = [...remaining].filter(id => inDeg.get(id) === 0);
      if (wave.length === 0) break; // Cycle detected (shouldn't happen after breakCycles)

      // Apply parallelism cap
      if (wave.length > this.config.maxParallelism) {
        wave.sort((a, b) => {
          const pa = { critical: 0, high: 1, normal: 2, low: 3 }[this.tasks.get(a)!.priority];
          const pb = { critical: 0, high: 1, normal: 2, low: 3 }[this.tasks.get(b)!.priority];
          return pa - pb;
        });
      }

      waves.push(wave.slice(0, this.config.maxParallelism));

      for (const id of wave) {
        remaining.delete(id);
        for (const depId of this.adjacency.get(id) ?? []) {
          if (inDeg.has(depId)) {
            inDeg.set(depId, inDeg.get(depId)! - 1);
          }
        }
      }
    }

    // Compute critical path
    const criticalPath = this.computeCriticalPath();

    // Estimate duration
    let estimatedDuration = 0;
    for (const wave of waves) {
      const maxDuration = Math.max(...wave.map(id => this.tasks.get(id)?.estimatedDuration ?? 100));
      estimatedDuration += maxDuration;
    }

    const totalTaskCount = this.tasks.size;
    const parallelismRatio = totalTaskCount > 0 ? waves.reduce((s, w) => s + w.length, 0) / (waves.length * this.config.maxParallelism) : 0;

    return { waves, criticalPath, estimatedDuration, parallelismRatio };
  }

  /**
   * Get current DAG status summary.
   */
  getStatus(): DAGStatus {
    const status: DAGStatus = {
      totalTasks: this.tasks.size,
      completed: 0,
      running: 0,
      pending: 0,
      blocked: 0,
      failed: 0,
      ready: 0,
    };

    for (const task of this.tasks.values()) {
      switch (task.status) {
        case 'completed': status.completed++; break;
        case 'running': status.running++; break;
        case 'pending': status.pending++; break;
        case 'blocked': status.blocked++; break;
        case 'failed': status.failed++; break;
        case 'ready': status.ready++; break;
      }
    }

    return status;
  }

  // ---------------------------------------------------------------------------
  // Graph Analysis
  // ---------------------------------------------------------------------------

  /**
   * Detect cycles using DFS.
   */
  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string) => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      for (const neighbor of this.adjacency.get(node) ?? []) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          cycles.push(path.slice(cycleStart));
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    for (const [id] of this.tasks) {
      if (!visited.has(id)) dfs(id);
    }

    return cycles;
  }

  /**
   * Break cycles by removing edges from lowest-priority tasks.
   */
  private breakCycles(cycles: string[][]): void {
    for (const cycle of cycles) {
      // Find the task with lowest priority in the cycle
      const priorityOrder: Record<TaskPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
      let lowestPriorityTask = cycle[0];
      let lowestPriority = priorityOrder[this.tasks.get(lowestPriorityTask)?.priority ?? 'normal'];

      for (const id of cycle) {
        const p = priorityOrder[this.tasks.get(id)?.priority ?? 'normal'];
        if (p > lowestPriority) {
          lowestPriority = p;
          lowestPriorityTask = id;
        }
      }

      // Remove one incoming edge to this task
      const deps = this.reverseAdjacency.get(lowestPriorityTask);
      if (deps && deps.size > 0) {
        const depToRemove = [...deps][0];
        deps.delete(depToRemove);
        this.adjacency.get(depToRemove)?.delete(lowestPriorityTask);
        const task = this.tasks.get(lowestPriorityTask);
        if (task) {
          task.dependencies = task.dependencies.filter(d => d !== depToRemove);
        }
        this.inDegree.set(lowestPriorityTask, Math.max(0, this.inDegree.get(lowestPriorityTask)! - 1));
      }
    }
  }

  /**
   * Compute critical path (longest path by estimated duration).
   */
  private computeCriticalPath(): string[] {
    // Use dynamic programming on topological order
    const topoOrder = this.topologicalSort();
    if (topoOrder.length === 0) return [];

    const dist = new Map<string, number>();
    const prev = new Map<string, string | undefined>();

    for (const id of topoOrder) {
      dist.set(id, this.tasks.get(id)?.estimatedDuration ?? 0);
      prev.set(id, undefined);
    }

    for (const id of topoOrder) {
      const currentDist = dist.get(id)!;
      for (const dependent of this.adjacency.get(id) ?? []) {
        const depDuration = this.tasks.get(dependent)?.estimatedDuration ?? 0;
        if (currentDist + depDuration > dist.get(dependent)!) {
          dist.set(dependent, currentDist + depDuration);
          prev.set(dependent, id);
        }
      }
    }

    // Find the task with maximum distance
    let maxTask = topoOrder[0];
    let maxDist = dist.get(maxTask)!;
    for (const id of topoOrder) {
      if (dist.get(id)! > maxDist) {
        maxDist = dist.get(id)!;
        maxTask = id;
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | undefined = maxTask;
    while (current) {
      path.unshift(current);
      current = prev.get(current);
    }

    return path;
  }

  /**
   * Topological sort using Kahn's algorithm.
   */
  private topologicalSort(): string[] {
    const result: string[] = [];
    const inDeg = new Map<string, number>();

    for (const [id, task] of this.tasks) {
      inDeg.set(id, task.dependencies.filter(d => this.tasks.has(d)).length);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDeg) {
      if (deg === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      for (const dependent of this.adjacency.get(current) ?? []) {
        if (inDeg.has(dependent)) {
          inDeg.set(dependent, inDeg.get(dependent)! - 1);
          if (inDeg.get(dependent) === 0) {
            queue.push(dependent);
          }
        }
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Dynamic Task Insertion
  // ---------------------------------------------------------------------------

  /**
   * Insert a new task at runtime and re-plan if needed.
   */
  insertTask(task: Omit<TaskNode, 'status' | 'dependencies' | 'dependents'> & { dependencies?: string[] }): TaskInsertionResult {
    // Validate dependencies exist
    const missingDeps = (task.dependencies ?? []).filter(d => !this.tasks.has(d));
    if (missingDeps.length > 0 && !this.config.autoBreakCycles) {
      return { inserted: false, affectedTasks: missingDeps };
    }

    // Filter to only existing dependencies
    const validDeps = (task.dependencies ?? []).filter(d => this.tasks.has(d));

    // Add task with valid dependencies only
    this.addTask({ ...task, dependencies: validDeps });

    // Find affected tasks (all downstream dependents)
    const affectedTasks = this.getDownstreamTasks(task.id);

    // Re-schedule ready tasks
    const newlyReady = this.getReadyTasks().filter(id => !affectedTasks.includes(id) && this.tasks.get(id)?.status === 'ready');

    // Generate new plan
    const newPlan = this.generateExecutionPlan();

    return { inserted: true, affectedTasks, newPlan };
  }

  private getDownstreamTasks(taskId: string): string[] {
    const downstream: string[] = [];
    const queue = [...this.adjacency.get(taskId) ?? []];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      downstream.push(current);

      for (const further of this.adjacency.get(current) ?? []) {
        queue.push(further);
      }
    }

    return downstream;
  }

  // ---------------------------------------------------------------------------
  // Auto-build from Requirement Graph / IR
  // ---------------------------------------------------------------------------

  /**
   * Build task DAG from L4 IR (ServiceIR + UIIR + WorkflowIR + DataIR).
   * Infers dependencies based on service relationships and data dependencies.
   */
  buildFromIR(ir: { service?: ServiceIR; ui?: UIIR; workflow?: WorkflowIR; data?: DataIR }): void {
    // Phase 1: Data model tasks (foundation — no dependencies)
    if (ir.data) {
      for (const entity of ir.data.entities) {
        this.addTask({
          id: `data-${entity.name}`,
          name: `Define ${entity.name} model`,
          type: 'data',
          priority: 'critical',
          complexity: entity.fields.length * 0.1,
          estimatedDuration: Math.max(100, entity.fields.length * 50),
          irNodeId: entity.name,
        });
      }
    }

    // Phase 2: Service tasks (depend on data models)
    if (ir.service) {
      for (const svc of ir.service.services) {
        const relatedEntities = ir.data?.entities.filter(e =>
          e.name.toLowerCase().includes(svc.name.toLowerCase()) ||
          svc.dependencies.some(d => e.name.toLowerCase().includes(d.toLowerCase()))
        ) ?? [];

        this.addTask({
          id: `service-${svc.name}`,
          name: `Implement ${svc.responsibility}`,
          type: 'service',
          priority: 'high',
          complexity: 0.3 + svc.dependencies.length * 0.1,
          dependencies: relatedEntities.map(e => `data-${e.name}`),
          estimatedDuration: 500 + relatedEntities.length * 100,
          irNodeId: svc.name,
        });
      }

      for (const ep of ir.service.endpoints) {
        const svcName = this.inferServiceNameFromEndpoint(ep.path);
        this.addTask({
          id: `endpoint-${this.sanitizeId(ep.method)}-${this.sanitizeId(ep.path)}`,
          name: `Create ${ep.method.toUpperCase()} ${ep.path}`,
          type: 'service',
          priority: 'normal',
          complexity: 0.2,
          dependencies: [`service-${svcName}`],
          estimatedDuration: 200,
        });
      }
    }

    // Phase 3: UI tasks (depend on workflow definitions)
    if (ir.ui) {
      for (const comp of ir.ui.components) {
        this.addTask({
          id: `ui-${comp.name}`,
          name: `Build ${comp.name} component`,
          type: 'ui',
          priority: 'normal',
          complexity: (Object.keys(comp.props).length + Object.keys(comp.state).length) * 0.1,
          estimatedDuration: 300 + Object.keys(comp.props).length * 50,
          irNodeId: comp.name,
        });
      }

      for (const page of ir.ui.pages) {
        this.addTask({
          id: `page-${this.sanitizeId(page.path)}`,
          name: `Assemble ${page.path} page`,
          type: 'ui',
          priority: 'normal',
          complexity: 0.2,
          dependencies: page.components.map(c => `ui-${c}`),
          estimatedDuration: 200,
        });
      }
    }

    // Phase 4: Workflow integration tasks (depend on services + UI)
    if (ir.workflow) {
      for (const wf of ir.workflow.workflows) {
        const wfDeps: string[] = [];
        for (const action of wf.actions) {
          const matchingService = ir.service?.services.find(s =>
            s.name.toLowerCase().includes(action.toLowerCase())
          );
          if (matchingService) wfDeps.push(`service-${matchingService.name}`);
        }

        this.addTask({
          id: `workflow-${this.sanitizeId(wf.id)}`,
          name: `Integrate ${wf.id} workflow`,
          type: 'workflow',
          priority: 'high',
          complexity: 0.4,
          dependencies: wfDeps,
          estimatedDuration: 400,
          irNodeId: wf.id,
        });
      }
    }
  }

  /**
   * Build task DAG directly from RequirementGraph.
   * Creates one task per graph node, with edges mapped to dependencies.
   */
  buildFromRequirementGraph(graph: RequirementGraph): void {
    for (const [id, node] of graph.nodes) {
      this.addTask({
        id: `graph-${id}`,
        name: `${node.type} [${node.level}]`,
        type: this.mapGraphLevelToTaskType(node.level),
        priority: this.mapGraphLevelToPriority(node.level),
        complexity: node.constraints.filter(c => c.severity === 'critical').length * 0.2,
        estimatedDuration: 200 + node.constraints.length * 50,
        irNodeId: id,
        metadata: { level: node.level, data: node.data },
      });
    }

    for (const [, edge] of graph.edges) {
      if (this.tasks.has(`graph-${edge.from}`) && this.tasks.has(`graph-${edge.to}`)) {
        const toTask = this.tasks.get(`graph-${edge.to}`)!;
        if (!toTask.dependencies.includes(`graph-${edge.from}`)) {
          this.addEdge(`graph-${edge.from}`, `graph-${edge.to}`);
          toTask.dependencies.push(`graph-${edge.from}`);
          this.inDegree.set(`graph-${edge.to}`, this.inDegree.get(`graph-${edge.to}`)! + 1);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private addEdge(from: string, to: string): void {
    if (!this.adjacency.has(from)) this.adjacency.set(from, new Set());
    if (!this.reverseAdjacency.has(to)) this.reverseAdjacency.set(to, new Set());

    this.adjacency.get(from)!.add(to);
    this.reverseAdjacency.get(to)!.add(from);
    this.inDegree.set(to, this.inDegree.get(to)! + 1);

    // Update task dependency lists
    const toTask = this.tasks.get(to);
    if (toTask && !toTask.dependencies.includes(from)) {
      toTask.dependencies.push(from);
    }
    const fromTask = this.tasks.get(from);
    if (fromTask && !fromTask.dependents.includes(to)) {
      fromTask.dependents.push(to);
    }
  }

  private sanitizeId(s: string): string {
    return s.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  }

  private inferServiceNameFromEndpoint(path: string): string {
    const parts = path.split('/').filter(Boolean);
    return parts[0] || 'api';
  }

  private mapGraphLevelToTaskType(level: string): string {
    const map: Record<string, string> = {
      L0_Intent: 'data',
      L0_Experience: 'ui',
      L1_Feature: 'service',
      L2_Interaction: 'ui',
      L3_System: 'service',
      L4_Execution: 'workflow',
      L5_Validation: 'guard',
    };
    return map[level] || 'service';
  }

  private mapGraphLevelToPriority(level: string): TaskPriority {
    const map: Record<string, TaskPriority> = {
      L0_Intent: 'critical',
      L0_Experience: 'high',
      L1_Feature: 'high',
      L2_Interaction: 'normal',
      L3_System: 'high',
      L4_Execution: 'normal',
      L5_Validation: 'low',
    };
    return map[level] || 'normal';
  }

  /**
   * Get a task by ID.
   */
  getTask(id: string): TaskNode | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get all tasks.
   */
  getAllTasks(): TaskNode[] {
    return [...this.tasks.values()];
  }

  /**
   * Reset the DAG.
   */
  reset(): void {
    this.tasks.clear();
    this.adjacency.clear();
    this.reverseAdjacency.clear();
    this.inDegree.clear();
  }
}

/**
 * Create a new TaskDAGEngine instance.
 */
export function createTaskDAGEngine(config?: Partial<TaskDAGConfig>): TaskDAGEngine {
  return new TaskDAGEngine(config);
}
