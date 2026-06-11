import { describe, it, expect, beforeEach } from '@jest/globals';
import { RequirementCompilerSkill, createRequirementCompilerSkill } from '../requirement-compiler-skill';
import { RequirementGraphEngine } from '../../req-graph/graph-engine';
import type { Feature } from '../../prd/prd-parser';

function F(id: string, name: string, description: string): Feature {
  return { id, name, description, priority: 'P0', status: 'draft' };
}

function build(intent: string, features: Feature[] = [], interactions: any[] = [], system: any = { api: [], services: [] }, execution: any[] = [], extra: any = { criteria: [], constraints: [] }) {
  return new RequirementGraphEngine().build(
    { intent }, {}, features, interactions, system, execution, extra,
  );
}

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
    const graph = build('Empty project');
    const result = await skill.execute({ graph });
    expect(result.ir).toBeDefined();
    expect(result.report.nodesProcessed).toBeGreaterThan(0);
  });

  it('should compile graph with entities to DataIR', async () => {
    const graph = build('User management system', [
      F('f1', 'User CRUD', 'Create and manage users'),
    ], [], { api: [], services: [] }, [], [{ name: 'User', fields: [{ name: 'id', type: 'uuid', required: true }] } as any]);
    const result = await skill.execute({ graph });
    expect(result.ir).toBeDefined();
    expect(result.ir.data).toBeDefined();
  });

  it('should compile graph with services to ServiceIR', async () => {
    const graph = build('API service', [F('f1', 'REST API', 'RESTful API endpoints')], [], { api: [], services: [{ name: 'REST API', responsibility: 'API', dependencies: [] }] });
    const result = await skill.execute({ graph });
    expect(result.ir.service.services.length).toBeGreaterThan(0);
    expect(result.ir.service.endpoints.length).toBeGreaterThan(0);
  });

  it('should compile graph with UI to UIIR', async () => {
    const graph = build('Dashboard app', [F('f1', 'Dashboard', 'Admin dashboard')], [{ name: 'Dashboard Page', flow: 'view -> interact' }]);
    const result = await skill.execute({ graph });
    expect(result.ir.ui.pages.length).toBeGreaterThan(0);
  });

  it('should compile graph with workflows to WorkflowIR', async () => {
    const graph = build('Task system', [F('f1', 'Task Management', 'Create and complete tasks')], [], { api: [], services: [] }, [], [{ id: 'w1', name: 'Task Flow', type: 'workflow', triggers: ['submit'], actions: ['validate', 'create'] } as any]);
    const result = await skill.execute({ graph });
    expect(result.ir.workflow.workflows.length).toBeGreaterThan(0);
  });

  it('should generate home page if none exists', async () => {
    const graph = build('No pages');
    const result = await skill.execute({ graph });
    expect(result.ir.ui.pages.length).toBeGreaterThan(0);
    expect(result.ir.ui.pages[0].path).toBe('/');
  });

  it('should generate REST endpoints for services', async () => {
    const graph = build('Service API', [F('f1', 'Products API', 'Product management')], [], { api: [], services: [{ name: 'Products API', responsibility: 'Products', dependencies: [] }] });
    const result = await skill.execute({ graph });
    const eps = result.ir.service.endpoints as any[];
    expect(eps.some(e => e.method === 'get')).toBe(true);
    expect(eps.some(e => e.method === 'post')).toBe(true);
    expect(eps.some(e => e.method === 'delete')).toBe(true);
  });

  it('should track compilation warnings for unclassified nodes', async () => {
    const graph = build('Test', [F('f1', 'Feature', 'test')]);
    const result = await skill.execute({ graph });
    expect(result.report.nodesProcessed).toBeGreaterThan(0);
    expect(Array.isArray(result.report.warnings)).toBe(true);
  });

  it('should produce compilation report', async () => {
    const graph = build('Full system', [F('f1', 'Auth', 'Authentication system')], [{ name: 'Login', flow: 'form -> submit' }], { api: [], services: [{ name: 'Auth API', responsibility: 'Auth', dependencies: [] }] }, [{ id: 'e1', name: 'User', type: 'entity' } as any], [{ id: 'w1', name: 'Login Flow', type: 'workflow' } as any]);
    const result = await skill.execute({ graph });
    expect(result.report.nodesProcessed).toBeGreaterThan(0);
    expect(result.report.edgesAnalyzed).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.report.warnings)).toBe(true);
  });
});
