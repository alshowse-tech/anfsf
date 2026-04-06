/**
 * ANFSF V1.5.0 - Code Quality Guard Skill Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CodeQualityGuardSkill, createCodeQualityGuardSkill } from '../code-quality-guard-skill';

describe('CodeQualityGuardSkill Tests', () => {
  let skill: CodeQualityGuardSkill;

  beforeEach(() => {
    skill = createCodeQualityGuardSkill();
  });

  describe('execute', () => {
    it('should pass clean code', async () => {
      const cleanCode = `
        function calculateSum(a: number, b: number): number {
          return a + b;
        }
        
        export { calculateSum };
      `;

      const graph = { nodes: [], edges: [], quality: 1.0, completeness: 1.0, traceId: 'test' };
      const result = await skill.execute({ code: cleanCode, requirementGraph: graph });

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.92);
    });

    it('should fail on long code files', async () => {
      const longCode = Array(600).fill('// line').join('\n');
      const graph = { nodes: [], edges: [], quality: 1.0, completeness: 1.0, traceId: 'test' };
      const result = await skill.execute({ code: longCode, requirementGraph: graph });

      expect(result.passed).toBe(false);
      expect(result.details?.staticResult?.issues).toContainEqual(expect.stringContaining('File too long'));
    });

    it('should fail on complex functions', async () => {
      const complexCode = `
        function veryLongFunction() {
          ${Array(150).fill('console.log("test");').join('\n')}
        }
      `;

      const graph = { nodes: [], edges: [], quality: 1.0, completeness: 1.0, traceId: 'test' };
      const result = await skill.execute({ code: complexCode, requirementGraph: graph });

      expect(result.details?.staticResult?.issues).toContainEqual(expect.stringContaining('Functions too complex'));
    });

    it('should fail on many TODOs', async () => {
      const todoCode = Array(10).fill('// TODO: fix this').join('\n');
      const graph = { nodes: [], edges: [], quality: 1.0, completeness: 1.0, traceId: 'test' };
      const result = await skill.execute({ code: todoCode, requirementGraph: graph });

      expect(result.details?.staticResult?.issues).toContainEqual(expect.stringContaining('Too many TODO/FIXME'));
    });

    it('should fail on semantic mismatch', async () => {
      const code = 'function test() { return 42; }';
      const graph = {
        nodes: [
          { id: 'n1', type: 'requirement', content: 'implement complex algorithm with sorting and filtering' },
        ],
        edges: [],
        quality: 1.0,
        completeness: 1.0,
        traceId: 'test',
      };

      const result = await skill.execute({ code, requirementGraph: graph });

      expect(result.details?.semanticResult?.mismatches.length).toBeGreaterThan(0);
    });

    it('should handle performance checks', async () => {
      const perfCode = `
        function processData() {
          const arr = new Array(10000);
          for (let i = 0; i < 50000; i++) {
            console.log(i);
          }
        }
      `;

      const graph = { nodes: [], edges: [], quality: 1.0, completeness: 1.0, traceId: 'test' };
      const result = await skill.execute({ code: perfCode, requirementGraph: graph });

      expect(result.details?.performanceResult).toBeDefined();
      expect(result.details?.performanceResult?.estimatedMemory).toBeGreaterThan(10);
    });

    it('should fail on security issues', async () => {
      const insecureCode = `
        function processUserInput(input) {
          eval(input);
        }
      `;

      const graph = { nodes: [], edges: [], quality: 1.0, completeness: 1.0, traceId: 'test' };
      const result = await skill.execute({ code: insecureCode, requirementGraph: graph });

      expect(result.passed).toBe(false);
      expect(result.details?.policyResult?.violations).toContainEqual(expect.stringContaining('eval'));
    });

    it('should calculate weighted score correctly', async () => {
      const code = 'function test() { return 42; }';
      const graph = { nodes: [], edges: [], quality: 1.0, completeness: 1.0, traceId: 'test' };

      const result = await skill.execute({ code, requirementGraph: graph });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe('runStaticAnalysis', () => {
    it('should detect console.log usage', async () => {
      const code = Array(5).fill('console.log("test");').join('\n');
      const graph = { nodes: [], edges: [], quality: 1.0, completeness: 1.0, traceId: 'test' };

      const result = await skill.execute({ code, requirementGraph: graph });

      expect(result.details?.staticResult?.issues).toContainEqual(expect.stringContaining('console.log'));
    });
  });

  describe('getMetadata', () => {
    it('should return skill metadata', () => {
      const metadata = skill.getMetadata();

      expect(metadata.name).toBe('code-quality-guard');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.qualityThreshold).toBe(0.92);
      expect(metadata.weights).toBeDefined();
    });
  });
});
