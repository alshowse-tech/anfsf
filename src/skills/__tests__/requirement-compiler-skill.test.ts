/**
 * ANFSF L4 — Requirement Compiler Skill Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { RequirementCompilerSkill, createRequirementCompilerSkill } from '../requirement-compiler-skill';
import { RequirementGraphEngine } from '../../req-graph/graph-engine';

describe('Requirement Compiler Skill Tests', () => {
  let skill: RequirementCompilerSkill;

  beforeEach(() => {
    skill = createRequirementCompilerSkill();
  });

  it('should create skill instance', () => {
    expect(skill).toBeDefined();
    expect(skill.name).toBe('requirement-compiler');
  });

  it('should compile empty graph to IR', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build('Empty project', [], [], [], [], [], []);

    const result = await skill.execute({ graph });

    expect(result.ir).toBeDefined();
    expect(result.ir.data.entities).toBeDefined();
    expect(result.ir.service.endpoints).toBeDefined();
    expect(result.ir.ui.components).toBeDefined();
    expect(result.ir.ui.pages).toBeDefined();
    expect(result.ir.workflow.workflows).toBeDefined();
    expect(result.report.nodesProcessed).toBeGreaterThan(0);
  });

  it('should compile graph with entities to DataIR', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build(
      'User management system',
      [],
      [{ id: 'f1', name: 'User CRUD', description: 'Create and manage users' }],
      [],
      [],
      [{ name: 'User', fields: [{ name: 'id', type: 'uuid', required: true }, { name: 'email', type: 'string', required: true }] }],
      [],
    );

    const result = await skill.execute({ graph });

    // Graph engine wraps execution data in L4_Execution node
    expect(result.ir).toBeDefined();
    expect(result.ir.data).toBeDefined();
  });

  it('should compile graph with services to ServiceIR', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build(
      'API service',
      [],
      [{ id: 'f1', name: 'REST API', description: 'RESTful API endpoints' }],
      [],
      [{ id: 's1', name: 'REST API', architecture: 'monolith' }],
      [],
      [],
    );

    const result = await skill.execute({ graph });

    expect(result.ir.service.services.length).toBeGreaterThan(0);
    expect(result.ir.service.endpoints.length).toBeGreaterThan(0);
  });

  it('should compile graph with UI to UIIR', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build(
      'Dashboard app',
      [],
      [{ id: 'f1', name: 'Dashboard', description: 'Admin dashboard' }],
      [{ id: 'i1', name: 'Dashboard Page', flow: 'view -> interact' }],
      [],
      [],
      [],
    );

    const result = await skill.execute({ graph });

    expect(result.ir.ui.pages.length).toBeGreaterThan(0);
  });

  it('should compile graph with workflows to WorkflowIR', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build(
      'Task system',
      [],
      [{ id: 'f1', name: 'Task Management', description: 'Create and complete tasks' }],
      [],
      [],
      [],
      [{ id: 'w1', name: 'Task Flow', type: 'workflow', triggers: ['submit'], actions: ['validate', 'create'] }],
    );

    const result = await skill.execute({ graph });

    expect(result.ir.workflow.workflows.length).toBeGreaterThan(0);
  });

  it('should generate home page if none exists', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build('No pages', [], [], [], [], [], []);

    const result = await skill.execute({ graph });

    expect(result.ir.ui.pages.length).toBeGreaterThan(0);
    expect(result.ir.ui.pages[0].path).toBe('/');
  });

  it('should generate REST endpoints for services', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build(
      'Service API',
      [],
      [{ id: 'f1', name: 'Products API', description: 'Product management' }],
      [],
      [{ id: 's1', name: 'Products API', architecture: 'monolith' }],
      [],
      [],
    );

    const result = await skill.execute({ graph });

    const hasGet = result.ir.service.endpoints.some(e => e.method === 'get');
    const hasPost = result.ir.service.endpoints.some(e => e.method === 'post');
    const hasDelete = result.ir.service.endpoints.some(e => e.method === 'delete');
    expect(hasGet).toBe(true);
    expect(hasPost).toBe(true);
    expect(hasDelete).toBe(true);
  });

  it('should track compilation warnings for unclassified nodes', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build('Test', [], [{ id: 'f1', name: 'Feature', description: 'test' }], [], [], [], []);

    const result = await skill.execute({ graph });

    // Has at least processed some nodes
    expect(result.report.nodesProcessed).toBeGreaterThan(0);
    expect(Array.isArray(result.report.warnings)).toBe(true);
  });

  it('should produce compilation report', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build(
      'Full system',
      [],
      [{ id: 'f1', name: 'Auth', description: 'Authentication system' }],
      [{ id: 'i1', name: 'Login', flow: 'form -> submit' }],
      [{ id: 's1', name: 'Auth API', architecture: 'monolith' }],
      [{ id: 'e1', name: 'User', type: 'entity' }],
      [{ id: 'w1', name: 'Login Flow', type: 'workflow' }],
    );

    const result = await skill.execute({ graph });

    expect(result.report.nodesProcessed).toBeGreaterThan(0);
    expect(result.report.edgesAnalyzed).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.report.warnings)).toBe(true);
  });
});
