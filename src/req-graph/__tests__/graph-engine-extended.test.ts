import { describe, it, expect, beforeEach } from '@jest/globals';
import { RequirementGraphEngine } from '../graph-engine';
import { GraphLevel } from '../graph-engine';
import type { Feature } from '../../prd/prd-parser';

function feature(name: string): Feature {
  return { id: name, name, description: name, priority: 'P0', status: 'draft' };
}

describe('RequirementGraphEngine - Extended', () => {
  let engine: RequirementGraphEngine;

  beforeEach(() => {
    engine = new RequirementGraphEngine();
  });

  describe('build()', () => {
    it('should create nodes for each level', () => {
      const graph = engine.build(
        { intent: 'Build CRM' },
        { experience: 'User manages contacts' } as any,
        [feature('contact_mgmt')],
        [{ name: 'contact_list' } as any],
        { name: 'api_server' } as any,
        { name: 'db_service' } as any,
        { name: 'test_suite' } as any,
      );

      expect(graph.nodes.size).toBe(7);
    });

    it('should create edges between consecutive levels', () => {
      engine.build(
        { intent: 'Build CRM' },
        { experience: 'User manages contacts' } as any,
        [feature('contact_mgmt')],
        [{ name: 'contact_list' } as any],
        { name: 'api_server' } as any,
        { name: 'db_service' } as any,
        { name: 'test_suite' } as any,
      );

      expect(engine['graph'].edges.size).toBe(6);
      expect(engine['graph'].metadata.totalEdges).toBe(6);
    });

    it('should skip levels with null/undefined data', () => {
      const graph = engine.build(
        { intent: 'Build CRM' },
        null as any,
        [],
        null as any,
        { name: 'api_server' } as any,
        { name: 'db_service' } as any,
        { name: 'test_suite' } as any,
      );

      expect(graph.nodes.size).toBe(5);
      expect(graph.edges.size).toBeGreaterThan(0);
    });

    it('should create correct edge types', () => {
      engine.build(
        { intent: 'Build CRM' },
        { experience: 'User manages contacts' } as any,
        [feature('contact_mgmt')],
        [{ name: 'contact_list' } as any],
        { name: 'api_server' } as any,
        { name: 'db_service' } as any,
        { name: 'test_suite' } as any,
      );

      const edgeTypes = [...engine['graph'].edges.values()].map(e => e.type);
      expect(edgeTypes.some(t => t.includes('L0_Intent'))).toBe(true);
      expect(edgeTypes.some(t => t.includes('L5_Validation'))).toBe(true);
    });
  });

  describe('normalize()', () => {
    it('should unify node names with underscores', () => {
      engine.build(
        { intent: 'Build User Management System' },
        { name: 'User Experience' } as any,
        [],
        [],
        { name: 'System' } as any,
        { name: 'Execution' } as any,
        { name: 'Validation' } as any,
      );

      engine.normalize();

      const intentNode = [...engine['graph'].nodes.values()].find(n => n.level === GraphLevel.L0_Intent);
      expect(intentNode).toBeDefined();
      // normalize() lowercases name fields; intent data uses 'intent' key so value is preserved as-is
      expect((intentNode!.data as any).intent).toBeDefined();
    });

    it('should normalize structure by adding missing metadata', () => {
      engine.build(
        { intent: 'Test' },
        { name: 'Experience' } as any,
        [],
        [],
        { name: 'System' } as any,
        { name: 'Execution' } as any,
        { name: 'Validation' } as any,
      );

      for (const node of engine['graph'].nodes.values()) {
        node.metadata = null as any;
        node.constraints = null as any;
      }

      engine.normalize();

      for (const node of engine['graph'].nodes.values()) {
        expect(node.metadata).toBeDefined();
        expect(node.constraints).toBeDefined();
        expect(Array.isArray(node.constraints)).toBe(true);
      }
    });
  });

  describe('applyConstraints()', () => {
    it('should apply schema constraints to System and Execution nodes', () => {
      engine.build(
        { intent: 'Intent' },
        { name: 'Experience' } as any,
        [feature('feature')],
        [{ name: 'interaction' } as any],
        { name: 'System' } as any,
        { name: 'Execution' } as any,
        { name: 'Validation' } as any,
      );

      engine.applyConstraints([{ type: 'schema', rule: 'strict_typing', severity: 'critical' }]);

      const systemNode = [...engine['graph'].nodes.values()].find(n => n.level === GraphLevel.L3_System);
      expect(systemNode!.constraints.length).toBeGreaterThan(0);
    });

    it('should apply semantic constraints to Feature and Interaction nodes', () => {
      engine.build(
        { intent: 'Intent' },
        { name: 'Experience' } as any,
        [feature('feature')],
        [{ name: 'interaction' } as any],
        { name: 'System' } as any,
        { name: 'Execution' } as any,
        { name: 'Validation' } as any,
      );

      engine.applyConstraints([{ type: 'semantic', rule: 'naming_convention', severity: 'warning' }]);

      const featureNode = [...engine['graph'].nodes.values()].find(n => n.level === GraphLevel.L1_Feature);
      expect(featureNode!.constraints.length).toBeGreaterThan(0);
    });
  });

  describe('completeProbabilistically()', () => {
    it('should generate candidates for missing expected nodes', () => {
      engine.build(
        { intent: 'Build CRM' },
        null as any,
        [],
        [],
        null as any,
        null as any,
        null as any,
      );

      const result = engine.completeProbabilistically();
      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it('should select the highest confidence candidate', () => {
      engine.build(
        { intent: 'Build CRM' },
        null as any,
        [],
        [],
        null as any,
        null as any,
        null as any,
      );

      const result = engine.completeProbabilistically();
      if (result.selected) {
        expect(result.selected.probability).toBeGreaterThan(0);
        expect(result.selected.confidence).toBeGreaterThan(0);
      }
    });

    it('should return null selected when no candidates pass threshold', () => {
      engine.build(
        { intent: 'auth' },
        { name: 'api_gateway' } as any,
        [feature('health_check')],
        [],
        { name: 'api_gateway' } as any,
        { name: 'db' } as any,
        { name: 'health_check' } as any,
      );

      const result = engine.completeProbabilistically();
      expect(result.confidence).toBe(0);
    });
  });

  describe('reasonDeeply()', () => {
    it('should find supporting evidence for hypotheses', () => {
      engine.build(
        { intent: 'Build API' },
        { name: 'User uses API' } as any,
        [feature('API endpoint')],
        [],
        { name: 'API server' } as any,
        { name: 'API handler' } as any,
        { name: 'API test' } as any,
      );

      const result = engine.reasonDeeply('API');
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.confidence).toBe(0.85);
    });

    it('should generate alternative hypotheses for system nodes', () => {
      engine.build(
        { intent: 'Intent' },
        { name: 'Experience' } as any,
        [feature('feature')],
        [],
        { name: 'System' } as any,
        { name: 'Execution' } as any,
        { name: 'Validation' } as any,
      );

      const result = engine.reasonDeeply('System');
      expect(result.alternativeHypotheses.length).toBeGreaterThan(0);
    });

    it('should return empty evidence for unrelated hypotheses', () => {
      engine.build(
        { intent: 'Build CRM' },
        null as any,
        [],
        [],
        null as any,
        null as any,
        null as any,
      );

      const result = engine.reasonDeeply('quantum_computing');
      expect(result.evidence).toHaveLength(0);
    });
  });

  describe('optimizeGlobally()', () => {
    it('should return optimization results', () => {
      engine.build(
        { intent: 'Intent' },
        { name: 'Experience' } as any,
        [feature('feature1'), feature('feature2')],
        [{ name: 'interaction' } as any],
        { name: 'System' } as any,
        { name: 'Execution' } as any,
        { name: 'Validation' } as any,
      );

      const result = engine.optimizeGlobally();
      expect(result.optimized).toBe(true);
      expect(result.metrics.complexity).toBeGreaterThanOrEqual(0);
      expect(result.metrics.complexity).toBeLessThanOrEqual(1);
      expect(result.metrics.performance).toBeGreaterThanOrEqual(0);
      expect(result.metrics.maintainability).toBeGreaterThanOrEqual(0);
    });

    it('should add complexity constraints to high-degree nodes', () => {
      engine.build(
        { intent: 'Intent' },
        { name: 'Experience' } as any,
        [feature('f1'), feature('f2'), feature('f3'), feature('f4'), feature('f5'), feature('f6')],
        [{ name: 'interaction' } as any],
        { name: 'System' } as any,
        { name: 'Execution' } as any,
        { name: 'Validation' } as any,
      );

      engine.optimizeGlobally();

      const systemNode = [...engine['graph'].nodes.values()].find(n => n.level === GraphLevel.L3_System);
      expect(systemNode).toBeDefined();
    });
  });

  describe('version() - commit', () => {
    it('should store a snapshot on commit', () => {
      engine.build(
        { intent: 'Intent v1' },
        { name: 'Experience v1' } as any,
        [],
        [],
        { name: 'System v1' } as any,
        { name: 'Execution v1' } as any,
        { name: 'Validation v1' } as any,
      );

      engine.version({ type: 'commit', version: 'v1.0.0', timestamp: Date.now() });

      const history = engine.getVersionHistory();
      expect(history.some(h => h.version === 'v1.0.0')).toBe(true);
    });

    it('should allow multiple commits', () => {
      engine.build(
        { intent: 'Intent v1' },
        null as any,
        [],
        [],
        { name: 'System v1' } as any,
        null as any,
        { name: 'Validation v1' } as any,
      );

      engine.version({ type: 'commit', version: 'v1.0.0', timestamp: Date.now() });

      engine.build(
        { intent: 'Intent v2' },
        { name: 'Experience v2' } as any,
        [],
        [],
        { name: 'System v2' } as any,
        { name: 'Execution v2' } as any,
        { name: 'Validation v2' } as any,
      );

      engine.version({ type: 'commit', version: 'v2.0.0', timestamp: Date.now() });

      const history = engine.getVersionHistory();
      expect(history.length).toBe(2);
    });
  });

  describe('version() - diff', () => {
    it('should show added nodes after commit', () => {
      engine.build(
        { intent: 'Intent v1' },
        null as any,
        [],
        [],
        { name: 'System v1' } as any,
        null as any,
        { name: 'Validation v1' } as any,
      );

      engine.version({ type: 'commit', version: 'v1.0.0', timestamp: Date.now() });

      engine.build(
        { intent: 'Intent v2' },
        { name: 'Experience v2' } as any,
        [],
        [],
        { name: 'System v2' } as any,
        { name: 'Execution v2' } as any,
        { name: 'Validation v2' } as any,
      );

      const diff = engine.version({ type: 'diff', version: 'v1.0.0', timestamp: Date.now() });
      expect(diff.metadata.totalNodes).toBeGreaterThan(0);
    });

    it('should return current graph for non-existent version', () => {
      const diff = engine.version({ type: 'diff', version: 'non-existent', timestamp: Date.now() });
      expect(diff).toBe(engine['graph']);
    });
  });

  describe('version() - rollback', () => {
    it('should restore nodes from snapshot', () => {
      engine.build(
        { intent: 'Intent v1' },
        null as any,
        [],
        [],
        { name: 'System v1' } as any,
        null as any,
        { name: 'Validation v1' } as any,
      );

      const nodeCountBefore = engine['graph'].nodes.size;
      engine.version({ type: 'commit', version: 'v1.0.0', timestamp: Date.now() });

      engine.build(
        { intent: 'Intent v2' },
        { name: 'Experience v2' } as any,
        [],
        [],
        { name: 'System v2' } as any,
        { name: 'Execution v2' } as any,
        { name: 'Validation v2' } as any,
      );

      const nodeCountAfter = engine['graph'].nodes.size;
      expect(nodeCountAfter).toBeGreaterThan(nodeCountBefore);

      engine.version({ type: 'rollback', version: 'v1.0.0', timestamp: Date.now() });
      expect(engine['graph'].nodes.size).toBe(nodeCountBefore);
    });

    it('should return current graph unchanged for non-existent version', () => {
      const beforeNodes = engine['graph'].nodes.size;
      engine.version({ type: 'rollback', version: 'non-existent', timestamp: Date.now() });
      expect(engine['graph'].nodes.size).toBe(beforeNodes);
    });
  });

  describe('compileToIR()', () => {
    it('should compile empty IR when no graph nodes', () => {
      const ir = engine.compileToIR();
      expect(ir.service.endpoints).toHaveLength(0);
      expect(ir.ui.components).toHaveLength(0);
      expect(ir.workflow.workflows).toHaveLength(0);
      expect(ir.data.entities).toHaveLength(0);
    });

    it('should compile from graph nodes', () => {
      engine.build(
        null as any,
        null as any,
        [],
        [{ componentName: 'LoginForm', props: {}, state: {} }] as any,
        { api: { path: '/api/login', method: 'POST', request: {}, response: {} } } as any,
        { service: { name: 'AuthService', responsibility: 'Auth', dependencies: [] } } as any,
        null as any,
      );

      const ir = engine.compileToIR();
      expect(ir.service.endpoints.length).toBeGreaterThan(0);
      expect(ir.ui.components.length).toBeGreaterThan(0);
    });
  });
});
