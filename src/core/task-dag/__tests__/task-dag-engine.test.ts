/**
 * ANFSF L8 — Task DAG Engine Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TaskDAGEngine, createTaskDAGEngine } from '../task-dag-engine';
import { RequirementGraphEngine } from '../../../req-graph/graph-engine';

describe('Task DAG Engine Tests', () => {
  let engine: TaskDAGEngine;

  beforeEach(() => {
    engine = createTaskDAGEngine();
  });

  // --- Task Management ---

  it('should create engine instance', () => {
    expect(engine).toBeDefined();
  });

  it('should add tasks to the DAG', () => {
    engine.addTask({ id: 'task-1', name: 'Task 1', type: 'service', priority: 'normal', complexity: 0.3 });
    engine.addTask({ id: 'task-2', name: 'Task 2', type: 'ui', priority: 'high', complexity: 0.2 });

    expect(engine.getTask('task-1')).toBeDefined();
    expect(engine.getTask('task-2')).toBeDefined();
  });

  it('should remove tasks and update references', () => {
    engine.addTask({ id: 'task-1', name: 'Task 1', type: 'service', priority: 'normal', complexity: 0.3 });
    engine.addTask({ id: 'task-2', name: 'Task 2', type: 'ui', priority: 'high', complexity: 0.2, dependencies: ['task-1'] });

    const removed = engine.removeTask('task-1');
    expect(removed).toBe(true);
    expect(engine.getTask('task-1')).toBeUndefined();
    expect(engine.getTask('task-2')?.dependencies).not.toContain('task-1');
  });

  it('should track task status transitions', () => {
    engine.addTask({ id: 'task-1', name: 'Task 1', type: 'service', priority: 'normal', complexity: 0.3 });
    expect(engine.getTask('task-1')?.status).toBe('pending');
  });

  // --- Dependency Resolution ---

  it('should register dependencies correctly', () => {
    engine.addTask({ id: 'a', name: 'A', type: 'data', priority: 'critical', complexity: 0.1 });
    engine.addTask({ id: 'b', name: 'B', type: 'service', priority: 'high', complexity: 0.3, dependencies: ['a'] });

    const taskB = engine.getTask('b');
    expect(taskB?.dependencies).toContain('a');
    expect(engine.getTask('a')?.dependents).toContain('b');
  });

  it('should mark downstream tasks as blocked when a task fails', () => {
    engine.addTask({ id: 'a', name: 'A', type: 'data', priority: 'critical', complexity: 0.1 });
    engine.addTask({ id: 'b', name: 'B', type: 'service', priority: 'high', complexity: 0.3, dependencies: ['a'] });
    engine.addTask({ id: 'c', name: 'C', type: 'ui', priority: 'normal', complexity: 0.2, dependencies: ['b'] });

    const blocked = engine.failTask('a');
    expect(blocked).toContain('b');
    expect(blocked).toContain('c');
    expect(engine.getTask('b')?.status).toBe('blocked');
    expect(engine.getTask('c')?.status).toBe('blocked');
  });

  // --- Ready Task Selection ---

  it('should identify tasks with no dependencies as ready', () => {
    engine.addTask({ id: 'a', name: 'A', type: 'data', priority: 'normal', complexity: 0.1 });
    engine.addTask({ id: 'b', name: 'B', type: 'service', priority: 'normal', complexity: 0.3, dependencies: ['a'] });

    const ready = engine.getReadyTasks();
    expect(ready).toContain('a');
    expect(ready).not.toContain('b');
  });

  it('should mark dependent tasks as ready after completing prerequisites', () => {
    engine.addTask({ id: 'a', name: 'A', type: 'data', priority: 'normal', complexity: 0.1 });
    engine.addTask({ id: 'b', name: 'B', type: 'service', priority: 'normal', complexity: 0.3, dependencies: ['a'] });

    const { newlyReady } = engine.completeTask('a');
    expect(newlyReady).toContain('b');
  });

  it('should prioritize ready tasks by priority level', () => {
    engine.addTask({ id: 'low', name: 'Low', type: 'test', priority: 'low', complexity: 0.1 });
    engine.addTask({ id: 'crit', name: 'Crit', type: 'data', priority: 'critical', complexity: 0.1 });
    engine.addTask({ id: 'high', name: 'High', type: 'service', priority: 'high', complexity: 0.1 });

    const ready = engine.getReadyTasks();
    expect(ready[0]).toBe('crit');
    expect(ready[1]).toBe('high');
    expect(ready[2]).toBe('low');
  });

  // --- Execution Planning ---

  it('should generate execution plan with parallel waves', () => {
    engine.addTask({ id: 'a', name: 'A', type: 'data', priority: 'critical', complexity: 0.1, estimatedDuration: 100 });
    engine.addTask({ id: 'b', name: 'B', type: 'data', priority: 'critical', complexity: 0.1, estimatedDuration: 150 });
    engine.addTask({ id: 'c', name: 'C', type: 'service', priority: 'high', complexity: 0.3, dependencies: ['a'], estimatedDuration: 200 });
    engine.addTask({ id: 'd', name: 'D', type: 'service', priority: 'high', complexity: 0.3, dependencies: ['b'], estimatedDuration: 250 });
    engine.addTask({ id: 'e', name: 'E', type: 'workflow', priority: 'normal', complexity: 0.4, dependencies: ['c', 'd'], estimatedDuration: 300 });

    const plan = engine.generateExecutionPlan();
    expect(plan).not.toBeNull();
    expect(plan!.waves.length).toBe(3);
    expect(plan!.waves[0]).toEqual(expect.arrayContaining(['a', 'b']));
    expect(plan!.waves[1]).toEqual(expect.arrayContaining(['c', 'd']));
    expect(plan!.waves[2]).toEqual(['e']);
  });

  it('should compute critical path', () => {
    engine.addTask({ id: 'a', name: 'A', type: 'data', priority: 'critical', complexity: 0.1, estimatedDuration: 100 });
    engine.addTask({ id: 'b', name: 'B', type: 'data', priority: 'critical', complexity: 0.1, estimatedDuration: 500 });
    engine.addTask({ id: 'c', name: 'C', type: 'service', priority: 'high', complexity: 0.3, dependencies: ['a'], estimatedDuration: 100 });
    engine.addTask({ id: 'd', name: 'D', type: 'service', priority: 'high', complexity: 0.3, dependencies: ['b'], estimatedDuration: 200 });

    const plan = engine.generateExecutionPlan();
    // Critical path should be b -> d (longest: 500 + 200 = 700)
    expect(plan!.criticalPath).toContain('b');
    expect(plan!.criticalPath).toContain('d');
    expect(plan!.estimatedDuration).toBeGreaterThanOrEqual(700);
  });

  it('should respect max parallelism cap', () => {
    engine = createTaskDAGEngine({ maxParallelism: 2 });

    for (let i = 0; i < 5; i++) {
      engine.addTask({
        id: `task-${i}`,
        name: `Task ${i}`,
        type: 'service',
        priority: 'normal',
        complexity: 0.1,
        estimatedDuration: 100,
      });
    }

    const plan = engine.generateExecutionPlan();
    expect(plan).not.toBeNull();
    expect(plan!.waves[0].length).toBeLessThanOrEqual(2);
  });

  // --- Cycle Detection ---

  it('should detect cycles in the DAG', () => {
    engine = createTaskDAGEngine({ autoBreakCycles: false });
    engine.addTask({ id: 'a', name: 'A', type: 'service', priority: 'normal', complexity: 0.1, dependencies: ['c'] });
    engine.addTask({ id: 'b', name: 'B', type: 'service', priority: 'normal', complexity: 0.1, dependencies: ['a'] });
    engine.addTask({ id: 'c', name: 'C', type: 'service', priority: 'normal', complexity: 0.1, dependencies: ['b'] });

    const cycles = engine.detectCycles();
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('should auto-break cycles when enabled', () => {
    engine = createTaskDAGEngine({ autoBreakCycles: true });
    engine.addTask({ id: 'a', name: 'A', type: 'service', priority: 'high', complexity: 0.1, dependencies: ['c'] });
    engine.addTask({ id: 'b', name: 'B', type: 'service', priority: 'normal', complexity: 0.1, dependencies: ['a'] });
    engine.addTask({ id: 'c', name: 'C', type: 'service', priority: 'low', complexity: 0.1, dependencies: ['b'] });

    const plan = engine.generateExecutionPlan();
    expect(plan).not.toBeNull();
  });

  // --- Dynamic Task Insertion ---

  it('should insert tasks at runtime and re-plan', () => {
    engine.addTask({ id: 'a', name: 'A', type: 'data', priority: 'critical', complexity: 0.1, estimatedDuration: 100 });
    engine.addTask({ id: 'b', name: 'B', type: 'service', priority: 'high', complexity: 0.3, dependencies: ['a'], estimatedDuration: 200 });

    const result = engine.insertTask({
      id: 'c',
      name: 'C',
      type: 'ui',
      priority: 'normal',
      complexity: 0.2,
      dependencies: ['a'],
      estimatedDuration: 150,
    });

    expect(result.inserted).toBe(true);
    expect(result.newPlan).toBeDefined();
  });

  // --- DAG Status ---

  it('should provide accurate DAG status', () => {
    engine.addTask({ id: 'a', name: 'A', type: 'data', priority: 'critical', complexity: 0.1 });
    engine.addTask({ id: 'b', name: 'B', type: 'service', priority: 'high', complexity: 0.3, dependencies: ['a'] });
    engine.addTask({ id: 'c', name: 'C', type: 'ui', priority: 'normal', complexity: 0.2, dependencies: ['a'] });

    const status = engine.getStatus();
    expect(status.totalTasks).toBe(3);
    expect(status.pending).toBe(3);
  });

  it('should update status after task completion', () => {
    engine.addTask({ id: 'a', name: 'A', type: 'data', priority: 'critical', complexity: 0.1 });
    engine.addTask({ id: 'b', name: 'B', type: 'service', priority: 'high', complexity: 0.3, dependencies: ['a'] });

    engine.completeTask('a');
    const status = engine.getStatus();
    expect(status.completed).toBe(1);
    expect(status.ready).toBe(1);
    expect(status.pending).toBe(0);
  });

  // --- Build from IR ---

  it('should build task DAG from L4 IR', () => {
    const ir = {
      data: {
        entities: [
          { name: 'user', fields: [{ name: 'id', type: 'uuid', required: true }, { name: 'name', type: 'string', required: true }], relationships: [] },
        ],
        relationships: [],
      },
      service: {
        endpoints: [
          { path: '/users', method: 'get', request: {}, response: {} },
        ],
        services: [
          { name: 'User', responsibility: 'User management', dependencies: ['user'] },
        ],
      },
      ui: {
        components: [
          { name: 'UserList', props: { filter: 'string' }, state: {} },
        ],
        pages: [
          { path: '/users', components: ['UserList'] },
        ],
      },
      workflow: {
        workflows: [
          { id: 'user-create', triggers: ['submit'], actions: ['validate', 'create'] },
        ],
      },
    };

    engine.buildFromIR(ir);

    const status = engine.getStatus();
    expect(status.totalTasks).toBeGreaterThan(0);

    // Data task should have no dependencies
    const dataTask = engine.getTask('data-user');
    expect(dataTask).toBeDefined();
    expect(dataTask?.dependencies.length).toBe(0);

    // Service task should depend on data
    const svcTask = engine.getTask('service-User');
    expect(svcTask).toBeDefined();
    expect(svcTask?.dependencies).toContain('data-user');
  });

  it('should build task DAG from RequirementGraph', () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build(
      'Build a task management app',
      [],
      [{ id: 'f1', name: 'Task CRUD', description: 'Create, read, update, delete tasks' }],
      [{ id: 'i1', name: 'Task Form', flow: 'fill -> submit' }],
      [{ id: 's1', name: 'REST API', architecture: 'monolith' }],
      [{ id: 'e1', name: 'Task Worker', type: 'background' }],
      [{ id: 'v1', name: 'Task Validation', rules: ['required title'] }],
    );

    engine.buildFromRequirementGraph(graph);

    const status = engine.getStatus();
    expect(status.totalTasks).toBeGreaterThan(0);
  });

  // --- Reset ---

  it('should reset the DAG', () => {
    engine.addTask({ id: 'a', name: 'A', type: 'data', priority: 'normal', complexity: 0.1 });
    engine.reset();
    expect(engine.getStatus().totalTasks).toBe(0);
  });

  it('should return all tasks', () => {
    engine.addTask({ id: 'a', name: 'A', type: 'data', priority: 'normal', complexity: 0.1 });
    engine.addTask({ id: 'b', name: 'B', type: 'service', priority: 'high', complexity: 0.3 });
    expect(engine.getAllTasks().length).toBe(2);
  });
});
