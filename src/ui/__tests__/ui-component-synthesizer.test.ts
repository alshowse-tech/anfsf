/**
 * UI Component Synthesizer Tests
 */

import { UIComponentSynthesizer, createComponentSynthesizer, DEFAULT_UI_CONFIG } from '../ui-component-synthesizer';

describe('UIComponentSynthesizer', () => {
  let synthesizer: UIComponentSynthesizer;

  beforeEach(() => {
    synthesizer = createComponentSynthesizer(DEFAULT_UI_CONFIG);
  });

  describe('synthesize', () => {
    it('should generate button component from requirement', async () => {
      const requirement = {
        id: 'req-1',
        description: 'A primary button for form submission',
        priority: 'high' as const,
        acceptanceCriteria: [],
      };

      const result = await synthesizer.synthesize(requirement);

      expect(result.componentName).toBe('Button');
      expect(result.code).toContain('export');
      expect(result.a11yScore).toBeGreaterThanOrEqual(0);
      expect(result.a11yScore).toBeLessThanOrEqual(100);
    });

    it('should generate component with correct framework', async () => {
      const requirement = {
        id: 'req-2',
        description: 'Input field for user email',
        priority: 'medium' as const,
        acceptanceCriteria: [],
      };

      const reactConfig = { framework: 'react' as const, uiLibrary: 'antd' as const, styling: 'tailwind' as const };
      const vueConfig = { framework: 'vue' as const, uiLibrary: 'raw' as const, styling: 'css-modules' as const };

      const reactSynth = createComponentSynthesizer(reactConfig);
      const vueSynth = createComponentSynthesizer(vueConfig);

      const reactResult = await reactSynth.synthesize(requirement);
      const vueResult = await vueSynth.synthesize(requirement);

      expect(reactResult.code).toContain('import React');
      expect(vueResult.code).toContain('<template>');
    });

    it('should include dependencies in result', async () => {
      const requirement = {
        id: 'req-3',
        description: 'Card component for displaying content',
        priority: 'low' as const,
        acceptanceCriteria: [],
      };

      const result = await synthesizer.synthesize(requirement);

      expect(result.dependencies).toContain('react');
      expect(result.dependencies).toContain('antd');
    });
  });

  describe('validateComponent', () => {
    it('should validate valid component', async () => {
      const validCode = `export default function Component() { return <div />; }`;
      
      const result = await synthesizer.validateComponent(validCode);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.score).toBeGreaterThan(50);
    });

    it('should detect missing export', async () => {
      const invalidCode = `function Component() { return <div />; }`;
      
      const result = await synthesizer.validateComponent(invalidCode);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Component must be exported');
    });

    it('should warn about missing accessibility', async () => {
      const code = `export default function Component() { return <div />; }`;
      
      const result = await synthesizer.validateComponent(code);

      expect(result.warnings.some(w => w.includes('ARIA'))).toBe(true);
    });
  });

  describe('optimizeComponent', () => {
    it('should add React.memo optimization', async () => {
      const code = `export default function Component() { return <div />; }`;
      
      const result = await synthesizer.optimizeComponent(code);

      expect(result.optimizedCode).toContain('React.memo');
      expect(result.improvements.length).toBeGreaterThan(0);
      expect(result.performanceGain).toBeGreaterThan(0);
    });

    it('should add useMemo for effects', async () => {
      const code = `import React from 'react';
export default function Component() {
  useEffect(() => {}, []);
  return <div />;
}`;
      
      const result = await synthesizer.optimizeComponent(code);

      expect(result.optimizedCode).toContain('useMemo');
    });
  });
});
