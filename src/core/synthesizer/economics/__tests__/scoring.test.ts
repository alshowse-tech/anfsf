/**
 * Economics Scoring — Tests
 */

import {
  computeRoleCost,
  computeTotalAssignmentCost,
  computeInterfaceCost,
  computeParallelismGain,
  computeEconomicsScore,
  type TaskDAG,
  type Task,
  type TaskEdge,
  type RoleEconomics,
} from '../scoring';
import type { Role, Assignment } from '../../types';

function makeRole(id: string, economics: RoleEconomics): Role & { economics: RoleEconomics } {
  return { id, name: id, skills: [], economics } as unknown as Role & { economics: RoleEconomics };
}

function makeDAG(tasks: Task[], edges: TaskEdge[]): TaskDAG {
  return { tasks, edges };
}

describe('computeRoleCost', () => {
  const economics: RoleEconomics = {
    costPerTask: 10,
    overheadPerDependency: 5,
    parallelismCap: 4,
  };

  it('computes base cost from tasks', () => {
    const role = makeRole('r1', economics);
    const dag = makeDAG(
      [
        { id: 't1', estCost: 3 },
        { id: 't2', estCost: 2 },
      ],
      []
    );
    const assignment: Assignment = { taskToRole: { t1: 'r1', t2: 'r1' } };

    const result = computeRoleCost(role, assignment, dag);
    expect(result.baseCost).toBe(50); // 10 * 3 + 10 * 2
    expect(result.dependencyCost).toBe(0);
    expect(result.totalCost).toBe(50);
  });

  it('adds dependency cost for cross-role edges', () => {
    const role = makeRole('r1', economics);
    const dag = makeDAG(
      [
        { id: 't1' },
        { id: 't2' },
        { id: 't3' },
      ],
      [
        { from: 't1', to: 't2', type: 'depends_on' },
        { from: 't1', to: 't3', type: 'calls' },
      ]
    );
    const assignment: Assignment = { taskToRole: { t1: 'r1', t2: 'r2', t3: 'r1' } };

    const result = computeRoleCost(role, assignment, dag);
    expect(result.dependencyCost).toBe(5); // 1 cross-role edge * 5
  });

  it('handles tasks with no estCost (defaults to 1)', () => {
    const role = makeRole('r1', economics);
    const dag = makeDAG([{ id: 't1' }], []);
    const assignment: Assignment = { taskToRole: { t1: 'r1' } };

    const result = computeRoleCost(role, assignment, dag);
    expect(result.baseCost).toBe(10); // 10 * 1 (default)
  });

  it('respects parallelism cap', () => {
    const role = makeRole('r1', { ...economics, parallelismCap: 2 });
    (role as any).sla = { maxConcurrentTasks: 5 };
    const dag = makeDAG([{ id: 't1' }], []);
    const assignment: Assignment = { taskToRole: { t1: 'r1' } };

    const result = computeRoleCost(role, assignment, dag);
    expect(result.concurrentCap).toBe(2); // min(5, 2)
  });
});

describe('computeTotalAssignmentCost', () => {
  const economics: RoleEconomics = {
    costPerTask: 10,
    overheadPerDependency: 5,
    parallelismCap: 4,
  };

  it('sums costs across all roles', () => {
    const roles = [
      makeRole('r1', economics),
      makeRole('r2', economics),
    ];
    const dag = makeDAG(
      [
        { id: 't1', estCost: 2 },
        { id: 't2', estCost: 3 },
      ],
      []
    );
    const assignment: Assignment = { taskToRole: { t1: 'r1', t2: 'r2' } };

    const result = computeTotalAssignmentCost(roles, assignment, dag);
    expect(result.totalCost).toBe(50); // 20 + 30
  });

  it('identifies bottleneck role', () => {
    const roles = [
      makeRole('r1', { ...economics, costPerTask: 1 }),
      makeRole('r2', { ...economics, costPerTask: 100 }),
    ];
    const dag = makeDAG(
      [
        { id: 't1' },
        { id: 't2' },
      ],
      []
    );
    const assignment: Assignment = { taskToRole: { t1: 'r1', t2: 'r2' } };

    const result = computeTotalAssignmentCost(roles, assignment, dag);
    expect(result.bottleneckRole).toBe('r2');
  });
});

describe('computeInterfaceCost', () => {
  it('costs cross-role edges with weights', () => {
    const dag = makeDAG(
      [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
      [
        { from: 't1', to: 't2', type: 'depends_on' },
        { from: 't1', to: 't3', type: 'calls' },
        { from: 't2', to: 't3', type: 'updates' },
      ]
    );
    const assignment: Assignment = { taskToRole: { t1: 'r1', t2: 'r1', t3: 'r2' } };

    const cost = computeInterfaceCost(assignment, dag);
    expect(cost).toBeCloseTo(2.6, 1); // calls(1.2) + updates(1.4)
  });

  it('ignores same-role edges', () => {
    const dag = makeDAG(
      [{ id: 't1' }, { id: 't2' }],
      [{ from: 't1', to: 't2', type: 'depends_on' }]
    );
    const assignment: Assignment = { taskToRole: { t1: 'r1', t2: 'r1' } };

    const cost = computeInterfaceCost(assignment, dag);
    expect(cost).toBe(0);
  });

  it('uses custom weights', () => {
    const dag = makeDAG(
      [{ id: 't1' }, { id: 't2' }],
      [{ from: 't1', to: 't2', type: 'calls' }]
    );
    const assignment: Assignment = { taskToRole: { t1: 'r1', t2: 'r2' } };

    const cost = computeInterfaceCost(assignment, dag, { depends_on: 1, calls: 5, updates: 10 });
    expect(cost).toBe(5);
  });
});

describe('computeParallelismGain', () => {
  it('returns normalized parallelism score', () => {
    const roles: Role[] = [
      { id: 'r1', name: 'r1' },
      { id: 'r2', name: 'r2' },
    ];
    const dag = makeDAG(
      [
        { id: 't1' },
        { id: 't2' },
        { id: 't3' },
        { id: 't4' },
      ],
      []
    );
    const assignment: Assignment = { taskToRole: { t1: 'r1', t2: 'r1', t3: 'r2', t4: 'r2' } };

    const gain = computeParallelismGain(assignment, dag, roles);
    expect(gain).toBeGreaterThan(0);
    expect(gain).toBeLessThanOrEqual(1);
  });
});

describe('computeEconomicsScore', () => {
  const economics: RoleEconomics = {
    costPerTask: 10,
    overheadPerDependency: 5,
    parallelismCap: 4,
  };

  it('returns score with all components', () => {
    const roles = [
      makeRole('r1', economics),
      makeRole('r2', economics),
    ];
    const dag = makeDAG(
      [
        { id: 't1', estCost: 2 },
        { id: 't2', estCost: 3 },
      ],
      [{ from: 't1', to: 't2', type: 'calls' }]
    );
    const assignment: Assignment = { taskToRole: { t1: 'r1', t2: 'r2' } };

    const score = computeEconomicsScore(assignment, dag, roles);
    expect(score.interfaceCost).toBe(1.2);
    expect(score.bottleneck).toBeDefined();
    expect(score.skillMatch).toBe(0.5); // default
    expect(score.parallelismGain).toBeDefined();
    expect(score.totalScore).toBeDefined();
  });

  it('uses custom skill match function', () => {
    const roles = [
      makeRole('r1', economics),
      makeRole('r2', economics),
    ];
    const dag = makeDAG(
      [
        { id: 't1' },
        { id: 't2' },
      ],
      []
    );
    const assignment: Assignment = { taskToRole: { t1: 'r1', t2: 'r2' } };

    const score = computeEconomicsScore(assignment, dag, roles, {
      skillMatchFn: () => 0.9,
    });
    expect(score.skillMatch).toBe(0.9);
  });
});
