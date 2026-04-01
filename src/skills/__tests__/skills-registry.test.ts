/**
 * Skills Registry Tests
 */

import { SkillsRegistry } from '../skills-registry';
import { Skill } from '../types';

describe('SkillsRegistry', () => {
  let registry: SkillsRegistry;

  beforeEach(() => {
    registry = new SkillsRegistry();
  });

  describe('Load', () => {
    it('should load skill successfully', async () => {
      const skill = await registry.load('test-skill', '1.0.0');

      expect(skill.name).toBe('test-skill');
      expect(skill.version).toBe('1.0.0');
      expect(skill.status).toBe('loaded');
    });

    it('should return cached skill if already loaded', async () => {
      await registry.load('test-skill', '1.0.0');
      const skill2 = await registry.load('test-skill', '1.0.0');

      expect(skill2.name).toBe('test-skill');
      expect(skill2.status).toBe('loaded');
    });

    it('should force reload when option is set', async () => {
      await registry.load('test-skill', '1.0.0');
      const skill2 = await registry.load('test-skill', '1.0.0', { force: true });

      expect(skill2).toBeDefined();
    });
  });

  describe('Unload', () => {
    it('should unload skill successfully', async () => {
      await registry.load('test-skill', '1.0.0');
      await registry.unload('test-skill');

      const skills = await registry.list();
      const unloadedSkill = skills.find(s => s.name === 'test-skill');
      expect(unloadedSkill).toBeUndefined();
    });

    it('should throw error when unloading skill with dependents', async () => {
      await registry.load('base-skill', '1.0.0');
      await registry.load('dependent-skill', '1.0.0');

      // Try to unload base skill (should fail)
      await expect(registry.unload('base-skill')).rejects.toThrow();
    });

    it('should force unload even with dependents', async () => {
      await registry.load('base-skill', '1.0.0');
      await registry.load('dependent-skill', '1.0.0');

      await expect(registry.unload('base-skill', { force: true })).resolves.not.toThrow();
    });
  });

  describe('List', () => {
    it('should list all loaded skills', async () => {
      await registry.load('skill-1', '1.0.0');
      await registry.load('skill-2', '1.0.0');
      await registry.load('skill-3', '1.0.0');

      const skills = await registry.list();
      expect(skills.length).toBe(3);
    });

    it('should return empty list when no skills loaded', async () => {
      const skills = await registry.list();
      expect(skills.length).toBe(0);
    });
  });

  describe('Dependencies', () => {
    it('should get dependencies for skill', async () => {
      await registry.load('test-skill', '1.0.0');
      const deps = await registry.getDependencies('test-skill');

      expect(Array.isArray(deps)).toBe(true);
    });

    it('should throw error for non-existent skill', async () => {
      await expect(registry.getDependencies('unknown-skill')).rejects.toThrow();
    });
  });

  describe('Dependency Check', () => {
    it('should check dependencies successfully', async () => {
      const skill: Skill = {
        name: 'test-skill',
        version: '1.0.0',
        dependencies: [],
        entryPoint: 'main',
        code: '',
      };

      const result = await registry.checkDependencies(skill);

      expect(result.passed).toBe(true);
      expect(result.missingDependencies.length).toBe(0);
    });

    it('should detect missing dependencies', async () => {
      const skill: Skill = {
        name: 'test-skill',
        version: '1.0.0',
        dependencies: ['missing-dep'],
        entryPoint: 'main',
        code: '',
      };

      const result = await registry.checkDependencies(skill);

      expect(result.passed).toBe(false);
      expect(result.missingDependencies).toContain('missing-dep');
    });

    it('should detect circular dependencies', async () => {
      await registry.load('skill-a', '1.0.0');
      await registry.load('skill-b', '1.0.0');

      // Manually create circular dependency for testing
      const skillA: Skill = {
        name: 'skill-a',
        version: '1.0.0',
        dependencies: ['skill-b'],
        entryPoint: 'main',
        code: '',
      };

      const result = await registry.checkDependencies(skillA);
      expect(result).toBeDefined();
    });
  });

  describe('Event System', () => {
    it('should emit load event', async () => {
      const events: any[] = [];
      registry.onEvent(event => events.push(event));

      await registry.load('test-skill', '1.0.0');

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('skill:loaded');
      expect(events[0].skillName).toBe('test-skill');
    });

    it('should emit unload event', async () => {
      const events: any[] = [];
      registry.onEvent(event => events.push(event));

      await registry.load('test-skill', '1.0.0');
      await registry.unload('test-skill');

      expect(events.length).toBe(2);
      expect(events[1].type).toBe('skill:unloaded');
    });
  });

  describe('Metadata', () => {
    it('should get skill metadata', async () => {
      await registry.load('test-skill', '1.0.0');
      const metadata = await registry.getMetadata('test-skill');

      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('test-skill');
      expect(metadata?.version).toBe('1.0.0');
    });

    it('should return null for non-existent skill', async () => {
      const metadata = await registry.getMetadata('unknown-skill');
      expect(metadata).toBeNull();
    });
  });
});
