/**
 * ANFSF V1.5.0 - Policy Guard Skill Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PolicyGuardSkill, createPolicyGuardSkill } from '../policy-guard-skill';

describe('PolicyGuardSkill Tests', () => {
  let skill: PolicyGuardSkill;

  beforeEach(() => {
    skill = createPolicyGuardSkill();
  });

  describe('execute', () => {
    it('should pass clean code', async () => {
      const cleanCode = `
        function calculateSum(a: number, b: number): number {
          return a + b;
        }
        
        export { calculateSum };
      `;

      const result = await skill.execute({ code: cleanCode });

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.90);
      expect(result.violations.length).toBe(0);
    });

    it('should fail on eval usage', async () => {
      const code = `
        function processInput(input) {
          eval(input);
        }
      `;

      const result = await skill.execute({ code });

      expect(result.passed).toBe(false);
      expect(result.violations).toContainEqual(expect.objectContaining({
        type: 'security',
        severity: 'critical',
        message: expect.stringContaining('eval'),
      }));
    });

    it('should fail on new Function usage', async () => {
      const code = `
        const fn = new Function('a', 'b', 'return a + b');
      `;

      const result = await skill.execute({ code });

      expect(result.passed).toBe(false);
      expect(result.violations).toContainEqual(expect.objectContaining({
        type: 'security',
        severity: 'critical',
      }));
    });

    it('should fail on hardcoded password', async () => {
      const code = `
        const password = "supersecret123";
      `;

      const result = await skill.execute({ code });

      expect(result.passed).toBe(false);
      expect(result.violations).toContainEqual(expect.objectContaining({
        type: 'compliance',
        severity: 'critical',
        message: expect.stringContaining('password'),
      }));
    });

    it('should fail on hardcoded API key', async () => {
      const code = `
        const api_key = "sk-1234567890abcdef";
      `;

      const result = await skill.execute({ code });

      expect(result.passed).toBe(false);
      expect(result.violations).toContainEqual(expect.objectContaining({
        type: 'compliance',
        severity: 'critical',
      }));
    });

    it('should detect multiple owners conflict', async () => {
      const code = `
        // Owner: Alice
        // Owner: Bob
        function test() {}
      `;

      const result = await skill.execute({ code });

      expect(result.violations).toContainEqual(expect.objectContaining({
        type: 'ownership',
        severity: 'minor',
        message: expect.stringContaining('Multiple owners'),
      }));
    });

    it('should handle exec usage', async () => {
      const code = `
        const { exec } = require('child_process');
        exec('ls -la');
      `;

      const result = await skill.execute({ code });

      expect(result.violations).toContainEqual(expect.objectContaining({
        type: 'security',
        severity: 'major',
      }));
    });

    it('should calculate score correctly', async () => {
      const code = 'function test() { return 42; }';
      const result = await skill.execute({ code });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should fail on critical violations', async () => {
      const code = `
        eval(userInput);
        const password = "secret";
      `;

      const result = await skill.execute({ code });

      expect(result.passed).toBe(false);
      expect(result.violations.filter(v => v.severity === 'critical').length).toBeGreaterThan(0);
    });
  });

  describe('checkSecurityPatterns', () => {
    it('should detect all security patterns', async () => {
      const code = `
        eval(code);
        new Function('return this');
        exec('command');
        execSync('command');
        spawn('command');
      `;

      const result = await skill.execute({ code });

      expect(result.violations.filter(v => v.type === 'security').length).toBeGreaterThan(0);
    });
  });

  describe('checkCompliancePatterns', () => {
    it('should detect all compliance patterns', async () => {
      const code = `
        const password = "pass123";
        const api_key = "key123";
        const secret = "secret123";
        const token = "token123";
      `;

      const result = await skill.execute({ code });

      expect(result.violations.filter(v => v.type === 'compliance').length).toBeGreaterThan(0);
    });
  });

  describe('getMetadata', () => {
    it('should return skill metadata', () => {
      const metadata = skill.getMetadata();

      expect(metadata.name).toBe('policy-guard');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.securityPatterns).toBeGreaterThan(0);
      expect(metadata.compliancePatterns).toBeGreaterThan(0);
    });
  });
});
