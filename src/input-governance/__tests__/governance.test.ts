import { describe, it, expect, beforeEach } from '@jest/globals';
import { InputGovernanceEngine } from '../governance';
import type { AINativePRD } from '../../prd/prd-parser';

describe('InputGovernanceEngine', () => {
  let engine: InputGovernanceEngine;

  beforeEach(() => {
    engine = new InputGovernanceEngine();
  });

  // ============================================================================
  // Completeness Checks
  // ============================================================================

  describe('checkCompleteness', () => {
    it('should report complete for a full PRD', () => {
      const prd: AINativePRD = {
        features: [{ id: 'f1', name: 'Feature 1', description: 'A feature', priority: 'P0', status: 'approved' }],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [{ id: 'c1', type: 'technical', description: 'Use TypeScript' }],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [{ api: [{ path: '/api/v1/items', method: 'GET', request: {}, response: {} }], services: [] }],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.checkCompleteness(prd);
      expect(result.complete).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should report missing features', () => {
      const prd: AINativePRD = {
        features: [],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.checkCompleteness(prd);
      expect(result.complete).toBe(false);
      const categories = result.missing.map(m => m.category);
      expect(categories).toContain('state');
    });

    it('should report missing API specs', () => {
      const prd: AINativePRD = {
        features: [{ id: 'f1', name: 'Test', description: 'Test', priority: 'P0', status: 'approved' }],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.checkCompleteness(prd);
      expect(result.complete).toBe(false);
      const categories = result.missing.map(m => m.category);
      expect(categories).toContain('api');
    });

    it('should report missing constraints', () => {
      const prd: AINativePRD = {
        features: [{ id: 'f1', name: 'Test', description: 'Test', priority: 'P0', status: 'approved' }],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [{ api: [], services: [] }],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.checkCompleteness(prd);
      expect(result.complete).toBe(false);
      const categories = result.missing.map(m => m.category);
      expect(categories).toContain('constraint');
    });
  });

  // ============================================================================
  // Ambiguity Detection
  // ============================================================================

  describe('detectAmbiguities', () => {
    it('should detect ambiguous words in feature descriptions', () => {
      const prd: AINativePRD = {
        features: [{ id: 'f1', name: 'Fast API', description: 'The API should be fast and efficient', priority: 'P0', status: 'draft' }],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.detectAmbiguities(prd);
      expect(result.ambiguous).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should detect ambiguous words in user flows', () => {
      const prd: AINativePRD = {
        features: [],
        userFlows: [{
          id: 'flow-1',
          name: 'Login',
          steps: [{ step: 1, action: 'User enters credentials', expected: 'System responds quickly' }],
        }],
        uiRequirements: [],
        data: [],
        constraints: [],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.detectAmbiguities(prd);
      expect(result.ambiguous).toBe(true);
      const locations = result.items.map(i => i.location);
      expect(locations.some(l => l.includes('userFlows'))).toBe(true);
    });

    it('should detect ambiguous words in UI requirements', () => {
      const prd: AINativePRD = {
        features: [],
        userFlows: [],
        uiRequirements: [{
          id: 'ui-1',
          component: 'Dashboard',
          description: 'A modern, user-friendly dashboard',
          interactions: [],
        }],
        data: [],
        constraints: [],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.detectAmbiguities(prd);
      expect(result.ambiguous).toBe(true);
      const locations = result.items.map(i => i.location);
      expect(locations.some(l => l.includes('uiRequirements'))).toBe(true);
    });

    it('should detect ambiguous words in constraints', () => {
      const prd: AINativePRD = {
        features: [],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [{ id: 'c1', type: 'technical', description: 'The system should be scalable' }],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.detectAmbiguities(prd);
      expect(result.ambiguous).toBe(true);
    });

    it('should detect ambiguous words in non-functional specs', () => {
      const prd: AINativePRD = {
        features: [],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [{
          category: 'performance',
          requirement: 'Response time',
          metric: 'ms',
          target: 'Should be roughly fast',
        }],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.detectAmbiguities(prd);
      expect(result.ambiguous).toBe(true);
    });

    it('should return non-ambiguous for clean PRD', () => {
      const prd: AINativePRD = {
        features: [{ id: 'f1', name: 'API', description: 'REST API with 200ms response time', priority: 'P0', status: 'draft' }],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.detectAmbiguities(prd);
      expect(result.ambiguous).toBe(false);
      expect(result.items).toHaveLength(0);
    });
  });

  // ============================================================================
  // Conflict Detection
  // ============================================================================

  describe('resolveConflicts', () => {
    it('should detect conflicting performance constraints', () => {
      const prd: AINativePRD = {
        features: [],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [
          { id: 'c1', type: 'performance', description: 'Max response time 100ms' },
          { id: 'c2', type: 'performance', description: 'Min response time 500ms' },
        ],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.resolveConflicts(prd);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].severity).toBe('critical');
    });

    it('should detect conflicting tech stack constraints', () => {
      const prd: AINativePRD = {
        features: [],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [
          { id: 'c1', type: 'technical', description: 'Must use React for frontend' },
          { id: 'c2', type: 'technical', description: 'Must use Vue for frontend' },
        ],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.resolveConflicts(prd);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('should detect conflicting security constraints', () => {
      const prd: AINativePRD = {
        features: [],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [
          { id: 'c1', type: 'security', description: 'Public API endpoint' },
          { id: 'c2', type: 'security', description: 'Private restricted access' },
        ],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.resolveConflicts(prd);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('should generate resolution for performance conflicts', () => {
      const prd: AINativePRD = {
        features: [],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [
          { id: 'c1', type: 'performance', description: 'Max response time 100ms' },
          { id: 'c2', type: 'performance', description: 'Min response time 500ms' },
        ],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.resolveConflicts(prd);
      expect(result.resolutions.length).toBeGreaterThan(0);
      expect(result.resolutions[0].resolution.toLowerCase()).toContain('negotiate');
    });

    it('should generate resolution for tech stack conflicts', () => {
      const prd: AINativePRD = {
        features: [],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [
          { id: 'c1', type: 'technical', description: 'Use React' },
          { id: 'c2', type: 'technical', description: 'Use Vue' },
        ],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.resolveConflicts(prd);
      expect(result.resolutions.length).toBeGreaterThan(0);
      expect(result.resolutions[0].resolution.toLowerCase()).toContain('technology');
    });

    it('should return no conflicts for compatible constraints', () => {
      const prd: AINativePRD = {
        features: [],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [
          { id: 'c1', type: 'technical', description: 'Use TypeScript' },
          { id: 'c2', type: 'performance', description: 'Response time 200ms' },
        ],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.resolveConflicts(prd);
      expect(result.conflicts).toHaveLength(0);
      expect(result.resolved).toBe(true);
    });
  });

  // ============================================================================
  // Consistency Checks
  // ============================================================================

  describe('checkConsistency', () => {
    it('should return consistent for empty design and api', () => {
      const prd: AINativePRD = {
        features: [],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = engine.checkConsistency(prd, null, null);
      expect(result.consistent).toBe(true);
    });

    it('should flag PRD-design inconsistency when features exist but no UI components', () => {
      const prd: AINativePRD = {
        features: [{ id: 'f1', name: 'Dashboard', description: 'A dashboard feature', priority: 'P0', status: 'draft' }],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const design = { components: [], pages: [], dataSources: [] };
      const result = engine.checkConsistency(prd, design, null);
      expect(result.consistent).toBe(false);
      expect(result.issues.some(i => i.type === 'prd-design')).toBe(true);
    });
  });

  // ============================================================================
  // LLM Assessment (fallback path)
  // ============================================================================

  describe('assessWithLLM (fallback)', () => {
    it('should use fallback when LLM is not configured', async () => {
      const prd: AINativePRD = {
        features: [],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [],
        acceptanceCriteria: [],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      // Engine without API key will use fallback
      const noLlmEngine = new InputGovernanceEngine({ apiKey: '' });
      const result = await noLlmEngine.assessWithLLM(prd, 'Test PRD');
      expect(result.score).toBeLessThanOrEqual(85);
      expect(result.missingSections.length).toBeGreaterThan(0);
    });

    it('should score higher for complete PRD in fallback', async () => {
      const prd: AINativePRD = {
        features: [{ id: 'f1', name: 'Test', description: 'Test', priority: 'P0', status: 'approved' }],
        userFlows: [{ id: 'flow-1', name: 'Login', steps: [] }],
        uiRequirements: [],
        data: [],
        constraints: [{ id: 'c1', type: 'technical', description: 'TypeScript' }],
        acceptanceCriteria: [{ id: 'ac1', featureId: 'f1', description: 'Works', testable: true }],
        dependencies: [],
        nonFunctionalSpecs: [{ category: 'performance', requirement: 'Fast', metric: 'ms', target: '200' }],
        workflow: [],
        backendSpecs: [{ api: [], services: [] }],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const noLlmEngine = new InputGovernanceEngine({ apiKey: '' });
      const result = await noLlmEngine.assessWithLLM(prd, 'Complete PRD');
      expect(result.score).toBeGreaterThan(50);
    });
  });
});
