/**
 * ANFSF V1.5.0 - Skills Registration Tests
 * 
 * Verifies that fusion skills are registered to their corresponding Harnesses.
 */

import { describe, it, expect } from '@jest/globals';
import {
  getHarnessSkills,
  verifySkillsRegistration,
} from '../skills-registration';

describe('Skills Registration Tests', () => {
  describe('getHarnessSkills', () => {
    it('should return skills for each Harness', () => {
      const skills = getHarnessSkills();

      expect(skills.orchestration).toBeDefined();
      expect(skills.evolution).toBeDefined();
      expect(skills.governance).toBeDefined();
    });

    it('should return correct skills for Orchestration Harness', () => {
      const skills = getHarnessSkills();

      expect(skills.orchestration).toContain('context-compressor');
      expect(skills.orchestration.length).toBe(1);
    });

    it('should return correct skills for Evolution Harness', () => {
      const skills = getHarnessSkills();

      expect(skills.evolution).toContain('memory-consolidation');
      expect(skills.evolution.length).toBe(1);
    });

    it('should return correct skills for Governance Harness', () => {
      const skills = getHarnessSkills();

      expect(skills.governance).toContain('hybrid-retriever');
      expect(skills.governance).toContain('citation-tracer');
      expect(skills.governance).toContain('hallucination-guard');
      expect(skills.governance.length).toBe(3);
    });
  });

  describe('verifySkillsRegistration', () => {
    it('should verify total skills count', () => {
      const result = verifySkillsRegistration();

      expect(result.totalSkills).toBe(5);
      expect(result.verified).toBe(true);
    });

    it('should return byHarness breakdown', () => {
      const result = verifySkillsRegistration();

      expect(result.byHarness.orchestration).toEqual(['context-compressor']);
      expect(result.byHarness.evolution).toEqual(['memory-consolidation']);
      expect(result.byHarness.governance).toEqual([
        'hybrid-retriever',
        'citation-tracer',
        'hallucination-guard',
      ]);
    });

    it('should verify all skills are registered', () => {
      const result = verifySkillsRegistration();

      expect(result.verified).toBe(true);
    });
  });

  describe('Skills to Harness Mapping', () => {
    it('should map ContextCompressorSkill to Orchestration Harness', () => {
      const skills = getHarnessSkills();
      expect(skills.orchestration).toContain('context-compressor');
    });

    it('should map MemoryConsolidationSkill to Evolution Harness', () => {
      const skills = getHarnessSkills();
      expect(skills.evolution).toContain('memory-consolidation');
    });

    it('should map RAG skills to Governance Harness', () => {
      const skills = getHarnessSkills();
      expect(skills.governance).toContain('hybrid-retriever');
      expect(skills.governance).toContain('citation-tracer');
      expect(skills.governance).toContain('hallucination-guard');
    });
  });

  describe('Registration Summary', () => {
    it('should have correct total count', () => {
      const skills = getHarnessSkills();
      const total = Object.values(skills).reduce((sum, arr) => sum + arr.length, 0);
      expect(total).toBe(5);
    });

    it('should have balanced distribution', () => {
      const skills = getHarnessSkills();

      // Orchestration: 1 skill (context compression)
      expect(skills.orchestration.length).toBe(1);

      // Evolution: 1 skill (memory consolidation)
      expect(skills.evolution.length).toBe(1);

      // Governance: 3 skills (RAG pipeline)
      expect(skills.governance.length).toBe(3);
    });
  });
});
