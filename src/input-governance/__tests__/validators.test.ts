import { describe, it, expect } from '@jest/globals';
import {
  validatePRDStructure,
  validateAPISpecs,
  validateConstraints,
  validateFeatureDependencies,
} from '../validators';
import type { AINativePRD } from '../../prd/prd-parser';

describe('Structured Validators', () => {
  // ============================================================================
  // validatePRDStructure
  // ============================================================================

  describe('validatePRDStructure', () => {
    it('should validate a well-structured PRD', () => {
      const prd: AINativePRD = {
        features: [{ id: 'f1', name: 'Feature 1', description: 'Desc', priority: 'P0', status: 'draft' }],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [],
        acceptanceCriteria: [{ id: 'ac1', featureId: 'f1', description: 'Test', testable: true }],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = validatePRDStructure(prd);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should flag PRD with no features', () => {
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

      const result = validatePRDStructure(prd);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PRD has no features');
    });

    it('should flag duplicate feature IDs', () => {
      const prd: AINativePRD = {
        features: [
          { id: 'f1', name: 'Feature 1', description: 'Desc 1', priority: 'P0', status: 'draft' },
          { id: 'f1', name: 'Feature 2', description: 'Desc 2', priority: 'P1', status: 'draft' },
        ],
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

      const result = validatePRDStructure(prd);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate feature ID'))).toBe(true);
    });

    it('should flag acceptance criteria referencing non-existent features', () => {
      const prd: AINativePRD = {
        features: [{ id: 'f1', name: 'Feature 1', description: 'Desc', priority: 'P0', status: 'draft' }],
        userFlows: [],
        uiRequirements: [],
        data: [],
        constraints: [],
        acceptanceCriteria: [
          { id: 'ac1', featureId: 'f1', description: 'Valid', testable: true },
          { id: 'ac2', featureId: 'f99', description: 'Invalid ref', testable: true },
        ],
        dependencies: [],
        nonFunctionalSpecs: [],
        workflow: [],
        backendSpecs: [],
        infrastructureSpecs: [],
        qaSpecs: [],
      };

      const result = validatePRDStructure(prd);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('f99'))).toBe(true);
    });
  });

  // ============================================================================
  // validateAPISpecs
  // ============================================================================

  describe('validateAPISpecs', () => {
    it('should validate a correct API spec', () => {
      const specs = [
        { id: 'api-1', path: '/api/v1/users', method: 'GET', request: {}, response: {} },
        { id: 'api-2', path: '/api/v1/users', method: 'POST', request: {}, response: {} },
      ];

      const result = validateAPISpecs(specs);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should flag missing path', () => {
      const specs = [{ id: 'api-1', path: '', method: 'GET', request: {}, response: {} }];
      const result = validateAPISpecs(specs);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('missing path'))).toBe(true);
    });

    it('should flag path not starting with /', () => {
      const specs = [{ id: 'api-1', path: 'api/v1/users', method: 'GET', request: {}, response: {} }];
      const result = validateAPISpecs(specs);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must start with "/"'))).toBe(true);
    });

    it('should flag missing HTTP method', () => {
      const specs = [{ id: 'api-1', path: '/api/v1/users', method: '', request: {}, response: {} }];
      const result = validateAPISpecs(specs);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('missing HTTP method'))).toBe(true);
    });

    it('should flag invalid HTTP method', () => {
      const specs = [{ id: 'api-1', path: '/api/v1/users', method: 'INVALID', request: {}, response: {} }];
      const result = validateAPISpecs(specs);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid HTTP method'))).toBe(true);
    });

    it('should accept all valid HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      const specs = methods.map((m, i) => ({
        id: `api-${i}`,
        path: `/api/v${i}`,
        method: m,
        request: {},
        response: {},
      }));

      const result = validateAPISpecs(specs);
      expect(result.valid).toBe(true);
    });

    it('should not fail on API spec without description field', () => {
      const specs = [{ id: 'api-1', path: '/api/v1/users', method: 'GET', request: {}, response: {} }];
      const result = validateAPISpecs(specs);
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // validateConstraints
  // ============================================================================

  describe('validateConstraints', () => {
    it('should validate correct constraints', () => {
      const constraints = [
        { id: 'c1', type: 'technical' as const, description: 'Use TypeScript' },
        { id: 'c2', type: 'technical' as const, description: 'Response time < 200ms' },
        { id: 'c3', type: 'business' as const, description: 'HTTPS only' },
      ];

      const result = validateConstraints(constraints);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should flag missing constraint id', () => {
      const constraints = [{ id: '', type: 'technical' as const, description: 'Test' }];
      const result = validateConstraints(constraints);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('missing id'))).toBe(true);
    });

    it('should flag invalid constraint type', () => {
      const constraints = [{ id: 'c1', type: 'invalid_type' as any, description: 'Test' }];
      const result = validateConstraints(constraints);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid type'))).toBe(true);
    });

    it('should accept all valid constraint types', () => {
      const constraints: Array<{ id: string; type: 'technical' | 'business' | 'regulatory'; description: string }> = [
        { id: 'c0', type: 'technical', description: 'Constraint 0' },
        { id: 'c1', type: 'business', description: 'Constraint 1' },
        { id: 'c2', type: 'regulatory', description: 'Constraint 2' },
      ];

      const result = validateConstraints(constraints);
      expect(result.valid).toBe(true);
    });

    it('should warn on missing description', () => {
      const constraints = [{ id: 'c1', type: 'technical' as const, description: '' }];
      const result = validateConstraints(constraints);
      expect(result.warnings.some(w => w.includes('missing description'))).toBe(true);
    });
  });

  // ============================================================================
  // validateFeatureDependencies
  // ============================================================================

  describe('validateFeatureDependencies', () => {
    it('should validate features with valid dependencies', () => {
      const features = [
        { id: 'f1', name: 'Base', description: 'Base feature', priority: 'P0' as const, status: 'draft' as const, dependencies: [] },
        { id: 'f2', name: 'Dependent', description: 'Depends on f1', priority: 'P1' as const, status: 'draft' as const, dependencies: ['f1'] },
      ];

      const result = validateFeatureDependencies(features);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should flag dependency on non-existent feature', () => {
      const features = [
        { id: 'f1', name: 'Base', description: 'Base', priority: 'P0' as const, status: 'draft' as const, dependencies: ['f99'] },
      ];

      const result = validateFeatureDependencies(features);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('f99'))).toBe(true);
    });

    it('should warn about circular dependencies', () => {
      const features = [
        { id: 'f1', name: 'A', description: 'A', priority: 'P0' as const, status: 'draft' as const, dependencies: ['f2'] },
        { id: 'f2', name: 'B', description: 'B', priority: 'P1' as const, status: 'draft' as const, dependencies: ['f1'] },
      ];

      const result = validateFeatureDependencies(features);
      expect(result.warnings.some(w => w.includes('circular'))).toBe(true);
    });

    it('should pass for features with no dependencies', () => {
      const features = [
        { id: 'f1', name: 'A', description: 'A', priority: 'P0' as const, status: 'draft' as const },
        { id: 'f2', name: 'B', description: 'B', priority: 'P1' as const, status: 'draft' as const },
      ];

      const result = validateFeatureDependencies(features);
      expect(result.valid).toBe(true);
    });
  });
});
