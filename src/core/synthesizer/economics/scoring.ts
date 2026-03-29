/**
 * ASF V4.0 Role Synthesizer - Economics Scoring
 * 
 * Role cost calculation with economics decision variables.
 * Version: v0.9.0
 */

import type { Role, Assignment } from '../types';

/**
 * Task DAG for economics calculation.
 */
export interface TaskDAG {
  tasks: Task[];
  edges: TaskEdge[];
}

export interface Task {
  id: string;
  estCost?: number;
  featureId?: string;
  contractIds?: string[];
  risk?: 'low' | 'medium' | 'high';
}

export interface TaskEdge {
  from: string;
  to: string;
  type: 'depends_on' | 'calls' | 'updates';
}

/**
 * Role economics configuration.
 */
export interface RoleEconomics {
  /** Cost per task unit */
  costPerTask: number;
  
  /** Overhead per cross-role dependency */
  overheadPerDependency: number;
  
  /** Maximum parallel tasks */
  parallelismCap: number;
}

/**
 * Role cost calculation result.
 */
export interface RoleCostResult {
  /** Base task cost */
  baseCost: number;
  
  /** Cross-role dependency cost */
  dependencyCost: number;
  
  /** Concurrent capacity */
  concurrentCap: number;
  
  /** Total cost */
  totalCost: number;
}

/**
 * Compute role cost for an assignment.
 * 
 * Formula:
 * totalCost = baseCost + dependencyCost
 * baseCost = Σ task.estCost × role.costPerTask
 * dependencyCost = crossRoleEdges × role.overheadPerDependency
 */
export function computeRoleCost(
  role: Role & { economics: RoleEconomics },
  assignment: Assignment,
  dag: TaskDAG
): RoleCostResult {
  const tasks = dag.tasks.filter(
    (t) => assignment.taskToRole[t.id] === role.id
  );

  // Base task cost
  const baseCost = tasks.reduce(
    (sum, t) => sum + (role.economics.costPerTask * (t.estCost ?? 1)),
    0
  );

  // Cross-role dependency cost
  const crossRoleEdges = dag.edges.filter((e) => {
    const fromRole = assignment.taskToRole[e.from];
    const toRole = assignment.taskToRole[e.to];
    return fromRole === role.id && toRole !== role.id;
  });

  const dependencyCost =
    crossRoleEdges.length * role.economics.overheadPerDependency;

  // Parallelism constraint
  const sla = (role as any).sla || { maxConcurrentTasks: Infinity };
  const concurrentCap = Math.min(
    sla.maxConcurrentTasks,
    role.economics.parallelismCap
  );

  return {
    baseCost,
    dependencyCost,
    concurrentCap,
    totalCost: baseCost + dependencyCost,
  };
}

/**
 * Compute total assignment cost across all roles.
 */
export function computeTotalAssignmentCost(
  roles: Array<Role & { economics: RoleEconomics }>,
  assignment: Assignment,
  dag: TaskDAG
): {
  totalCost: number;
  roleCosts: Map<string, RoleCostResult>;
  bottleneckRole?: string;
} {
  const roleCosts = new Map<string, RoleCostResult>();
  let totalCost = 0;
  let maxCost = 0;
  let bottleneckRole: string | undefined;

  for (const role of roles) {
    const cost = computeRoleCost(role, assignment, dag);
    roleCosts.set(role.id, cost);
    totalCost += cost.totalCost;

    if (cost.totalCost > maxCost) {
      maxCost = cost.totalCost;
      bottleneckRole = role.id;
    }
  }

  return {
    totalCost,
    roleCosts,
    bottleneckRole,
  };
}

/**
 * Compute interface cost for economics scoring.
 */
export function computeInterfaceCost(
  assignment: Assignment,
  dag: TaskDAG,
  interfaceWeights: {
    depends_on: number;
    calls: number;
    updates: number;
  } = { depends_on: 1.0, calls: 1.2, updates: 1.4 }
): number {
  let cost = 0;

  for (const edge of dag.edges) {
    const fromRole = assignment.taskToRole[edge.from];
    const toRole = assignment.taskToRole[edge.to];

    if (fromRole !== toRole) {
      cost += interfaceWeights[edge.type] || 1.0;
    }
  }

  return cost;
}

/**
 * Compute parallelism gain score.
 */
export function computeParallelismGain(
  assignment: Assignment,
  dag: TaskDAG,
  roles: Role[]
): number {
  // Group tasks by role
  const tasksByRole = new Map<string, Task[]>();
  for (const task of dag.tasks) {
    const roleId = assignment.taskToRole[task.id];
    if (!tasksByRole.has(roleId)) {
      tasksByRole.set(roleId, []);
    }
    tasksByRole.get(roleId)!.push(task);
  }

  // Calculate parallelism (tasks that can run concurrently)
  let totalParallelism = 0;
  for (const [roleId, tasks] of tasksByRole) {
    const role = roles.find((r) => r.id === roleId);
    const maxConcurrent = (role as any)?.sla?.maxConcurrentTasks ?? tasks.length;
    totalParallelism += Math.min(tasks.length, maxConcurrent);
  }

  // Normalize to 0-1
  return totalParallelism / dag.tasks.length;
}

/**
 * Economics-based role assignment scorer.
 */
export interface EconomicsScore {
  interfaceCost: number;
  bottleneck: number;
  skillMatch: number;
  parallelismGain: number;
  totalScore: number;
}

/**
 * Compute economics score for an assignment.
 * 
 * Score = -0.30 × interfaceCost + -0.20 × bottleneck + 0.20 × skillMatch + 0.15 × parallelismGain
 */
export function computeEconomicsScore(
  assignment: Assignment,
  dag: TaskDAG,
  roles: Role[],
  options?: {
    interfaceWeights?: Parameters<typeof computeInterfaceCost>[2];
    skillMatchFn?: (task: Task, role: Role) => number;
  }
): EconomicsScore {
  const interfaceCost = computeInterfaceCost(
    assignment,
    dag,
    options?.interfaceWeights
  );

  const { roleCosts, bottleneckRole } = computeTotalAssignmentCost(
    roles as Array<Role & { economics: RoleEconomics }>,
    assignment,
    dag
  );

  // Bottleneck score (0-1, higher = more bottlenecked)
  const totalCost = Array.from(roleCosts.values()).reduce(
    (sum, c) => sum + c.totalCost,
    0
  );
  const maxRoleCost = bottleneckRole
    ? roleCosts.get(bottleneckRole)?.totalCost ?? 0
    : 0;
  const bottleneck = totalCost > 0 ? maxRoleCost / totalCost : 0;

  // Skill match (placeholder - would need role capabilities)
  let skillMatch = 0.5; // Default
  if (options?.skillMatchFn) {
    const matches = dag.tasks.map((t) => {
      const roleId = assignment.taskToRole[t.id];
      const role = roles.find((r) => r.id === roleId);
      return role ? options.skillMatchFn!(t, role) : 0;
    });
    skillMatch = matches.reduce((a, b) => a + b, 0) / matches.length;
  }

  const parallelismGain = computeParallelismGain(assignment, dag, roles);

  // Total score
  const totalScore =
    -0.3 * normalize(interfaceCost, 0, dag.edges.length) +
    -0.2 * bottleneck +
    0.2 * skillMatch +
    0.15 * parallelismGain;

  return {
    interfaceCost,
    bottleneck,
    skillMatch,
    parallelismGain,
    totalScore,
  };
}

/**
 * Normalize value to 0-1 range.
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}
