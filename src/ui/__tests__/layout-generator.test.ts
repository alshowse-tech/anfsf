/**
 * Layout Generator Tests
 */

import { LayoutGenerator, createLayoutGenerator, generateGridTemplate, calculateLayoutComplexity } from '../layout-generator';

describe('LayoutGenerator', () => {
  let generator: LayoutGenerator;

  beforeEach(() => {
    generator = createLayoutGenerator();
  });

  describe('generateFromFlow', () => {
    it('should generate layout from user flow', async () => {
      const userFlow = {
        id: 'flow-1',
        name: 'Dashboard',
        steps: [
          { id: 'step-1', action: 'Navigate to dashboard', nextStep: 'step-2' },
          { id: 'step-2', action: 'View metrics', nextStep: 'step-3' },
          { id: 'step-3', action: 'Click on chart' },
        ],
        entryPoint: 'step-1',
      };

      const requirements = [{
        id: 'req-1',
        description: 'Dashboard with sidebar',
        priority: 'high' as const,
        acceptanceCriteria: [],
      }];

      const layout = await generator.generateFromFlow([userFlow], requirements);

      expect(layout.id).toContain('layout');
      expect(layout.type).toBe('grid');
      expect(layout.sections.length).toBeGreaterThan(0);
      expect(layout.breakpoints.length).toBeGreaterThan(0);
    });

    it('should detect dashboard pattern', async () => {
      const userFlow = {
        id: 'flow-dashboard',
        name: 'Dashboard',
        steps: [{ id: 'step-1', action: 'View dashboard' }],
        entryPoint: 'step-1',
      };

      const layout = await generator.generateFromFlow([userFlow], []);

      expect(layout.type).toBe('grid');
    });

    it('should generate visual hierarchy', async () => {
      const userFlow = {
        id: 'flow-2',
        name: 'Landing Page',
        steps: [{ id: 'step-1', action: 'View landing' }],
        entryPoint: 'step-1',
      };

      const layout = await generator.generateFromFlow([userFlow], []);

      expect(layout.visualHierarchy.length).toBeGreaterThan(0);
      expect(layout.visualHierarchy[0].level).toBe(0);
    });
  });

  describe('adaptToBreakpoint', () => {
    it('should adapt layout for mobile', async () => {
      const userFlow = {
        id: 'flow-3',
        name: 'Test',
        steps: [{ id: 'step-1', action: 'Test' }],
        entryPoint: 'step-1',
      };

      const layout = await generator.generateFromFlow([userFlow], []);
      const mobileLayout = generator.adaptToBreakpoint(layout, 'mobile');

      expect(mobileLayout.breakpoints[0].name).toBe('mobile');
    });

    it('should hide sidebar on mobile', async () => {
      const userFlow = {
        id: 'flow-4',
        name: 'Test',
        steps: [{ id: 'step-1', action: 'Test' }],
        entryPoint: 'step-1',
      };

      const layout = await generator.generateFromFlow([userFlow], []);
      const mobileLayout = generator.adaptToBreakpoint(layout, 'mobile');

      const sidebarSection = mobileLayout.sections.find(s => s.type === 'sidebar');
      if (sidebarSection) {
        expect(sidebarSection.styles?.display).toBe('none');
      }
    });
  });

  describe('optimizeVisualHierarchy', () => {
    it('should optimize hierarchy by weight', async () => {
      const userFlow = {
        id: 'flow-5',
        name: 'Test',
        steps: [{ id: 'step-1', action: 'Test' }],
        entryPoint: 'step-1',
      };

      const layout = await generator.generateFromFlow([userFlow], []);
      const optimized = generator.optimizeVisualHierarchy(layout);

      // Check that hierarchy is sorted by weight (descending)
      for (let i = 1; i < optimized.visualHierarchy.length; i++) {
        expect(optimized.visualHierarchy[i - 1].weight)
          .toBeGreaterThanOrEqual(optimized.visualHierarchy[i].weight);
      }
    });
  });
});

describe('generateGridTemplate', () => {
  it('should generate CSS grid template', async () => {
    const generator = createLayoutGenerator();
    const userFlow = {
      id: 'flow-6',
      name: 'Test',
      steps: [{ id: 'step-1', action: 'Test' }],
      entryPoint: 'step-1',
    };

    const layout = await generator.generateFromFlow([userFlow], []);
    const template = generateGridTemplate(layout, 'desktop');

    expect(template).toContain('grid-template-columns');
    expect(template).toContain('12');
  });
});

describe('calculateLayoutComplexity', () => {
  it('should calculate complexity score', async () => {
    const generator = createLayoutGenerator();
    const userFlow = {
      id: 'flow-7',
      name: 'Test',
      steps: [{ id: 'step-1', action: 'Test' }],
      entryPoint: 'step-1',
    };

    const layout = await generator.generateFromFlow([userFlow], []);
    const complexity = calculateLayoutComplexity(layout);

    expect(complexity).toBeGreaterThan(0);
  });
});
