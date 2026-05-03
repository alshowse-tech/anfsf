/**
 * Prototype Generator Tests
 */

import { PrototypeGenerator, createPrototypeGenerator, generatePrototypeSummary, validatePrototype } from '../prototype-generator';
import type { PrototypeDefinition } from '../types';

describe('PrototypeGenerator', () => {
  let generator: PrototypeGenerator;

  beforeEach(() => {
    generator = createPrototypeGenerator();
  });

  describe('generate', () => {
    it('should generate prototype from PRD', async () => {
      const prd = {
        id: 'prd-1',
        title: 'Test Product',
        description: 'A test product',
        features: [],
        userFlows: [
          {
            id: 'flow-1',
            name: 'Login',
            steps: [
              { id: 'step-1', action: 'Navigate to login', nextStep: 'step-2' },
              { id: 'step-2', action: 'Submit credentials' },
            ],
            entryPoint: 'step-1',
          },
        ],
        uiRequirements: [],
        constraints: [],
      };

      const prototype = await generator.generate(prd);

      expect(prototype.id).toContain('prototype-prd-1');
      expect(prototype.pages.length).toBeGreaterThan(0);
      expect(prototype.flows.length).toBeGreaterThan(0);
      expect(prototype.designTokens).toBeDefined();
      expect(prototype.previewUrl).toBeDefined();
      expect(prototype.shareUrl).toBeDefined();
    });

    it('should generate multiple pages for multiple flows', async () => {
      const prd = {
        id: 'prd-2',
        title: 'Multi-Flow Product',
        description: 'Product with multiple flows',
        features: [],
        userFlows: [
          {
            id: 'flow-1',
            name: 'Login',
            steps: [{ id: 'step-1', action: 'Login' }],
            entryPoint: 'step-1',
          },
          {
            id: 'flow-2',
            name: 'Dashboard',
            steps: [{ id: 'step-1', action: 'View dashboard' }],
            entryPoint: 'step-1',
          },
        ],
        uiRequirements: [],
        constraints: [],
      };

      const prototype = await generator.generate(prd);

      expect(prototype.pages.length).toBeGreaterThanOrEqual(2);
    });

    it('should cache generated prototype', async () => {
      const prd = {
        id: 'prd-3',
        title: 'Cached Product',
        description: 'Product for caching test',
        features: [],
        userFlows: [{
          id: 'flow-1',
          name: 'Test',
          steps: [{ id: 'step-1', action: 'Test' }],
          entryPoint: 'step-1',
        }],
        uiRequirements: [],
        constraints: [],
      };

      const prototype1 = await generator.generate(prd);
      const prototype2 = await generator.generate(prd);

      expect(prototype1.id).toBe(prototype2.id);
    });
  });

  describe('exportToFigma', () => {
    it('should export prototype to Figma', async () => {
      const prd = {
        id: 'prd-4',
        title: 'Figma Export Test',
        description: 'Test',
        features: [],
        userFlows: [{
          id: 'flow-1',
          name: 'Test',
          steps: [{ id: 'step-1', action: 'Test' }],
          entryPoint: 'step-1',
        }],
        uiRequirements: [],
        constraints: [],
      };

      const prototype = await generator.generate(prd);
      const result = await generator.exportToFigma(prototype);

      expect(result.success).toBe(true);
      expect(result.figmaFileId).toBeDefined();
      expect(result.figmaUrl).toBeDefined();
      expect(result.components.length).toBeGreaterThan(0);
    });
  });

  describe('exportToCode', () => {
    it('should export prototype to code', async () => {
      const prd = {
        id: 'prd-5',
        title: 'Code Export Test',
        description: 'Test',
        features: [],
        userFlows: [{
          id: 'flow-1',
          name: 'Test',
          steps: [{ id: 'step-1', action: 'Test' }],
          entryPoint: 'step-1',
        }],
        uiRequirements: [],
        constraints: [],
      };

      const prototype = await generator.generate(prd);
      const result = await generator.exportToCode(prototype, {
        outputDir: './output',
        format: 'esm',
        typescript: true,
        includeTests: true,
        includeStories: true,
      });

      expect(result.success).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.summary.totalFiles).toBe(result.files.length);
      expect(result.summary.totalLines).toBeGreaterThan(0);
    });

    it('should generate test files when includeTests is true', async () => {
      const prd = {
        id: 'prd-6',
        title: 'Test Export',
        description: 'Test',
        features: [],
        userFlows: [{
          id: 'flow-1',
          name: 'Test',
          steps: [{ id: 'step-1', action: 'Test' }],
          entryPoint: 'step-1',
        }],
        uiRequirements: [],
        constraints: [],
      };

      const prototype = await generator.generate(prd);
      const resultWithTests = await generator.exportToCode(prototype, {
        outputDir: './output',
        format: 'esm',
        typescript: true,
        includeTests: true,
        includeStories: false,
      });

      const resultWithoutTests = await generator.exportToCode(prototype, {
        outputDir: './output',
        format: 'esm',
        typescript: true,
        includeTests: false,
        includeStories: false,
      });

      expect(resultWithTests.summary.tests).toBeGreaterThan(0);
      expect(resultWithoutTests.summary.tests).toBe(0);
    });

    it('should generate story files when includeStories is true', async () => {
      const prd = {
        id: 'prd-7',
        title: 'Story Export',
        description: 'Test',
        features: [],
        userFlows: [{
          id: 'flow-1',
          name: 'Test',
          steps: [{ id: 'step-1', action: 'Test' }],
          entryPoint: 'step-1',
        }],
        uiRequirements: [],
        constraints: [],
      };

      const prototype = await generator.generate(prd);
      const resultWithStories = await generator.exportToCode(prototype, {
        outputDir: './output',
        format: 'esm',
        typescript: true,
        includeTests: false,
        includeStories: true,
      });

      expect(resultWithStories.summary.stories).toBeGreaterThan(0);
    });
  });

  describe('collectFeedback', () => {
    it('should collect feedback for prototype', async () => {
      const prd = {
        id: 'prd-8',
        title: 'Feedback Test',
        description: 'Test',
        features: [],
        userFlows: [{
          id: 'flow-1',
          name: 'Test',
          steps: [{ id: 'step-1', action: 'Test' }],
          entryPoint: 'step-1',
        }],
        uiRequirements: [],
        constraints: [],
      };

      const prototype = await generator.generate(prd);
      const feedback = await generator.collectFeedback(prototype);

      expect(feedback.length).toBeGreaterThan(0);
      expect(feedback[0].rating).toBeGreaterThanOrEqual(1);
      expect(feedback[0].rating).toBeLessThanOrEqual(5);
    });
  });
});

describe('generatePrototypeSummary', () => {
  it('should generate prototype summary', async () => {
    const generator = createPrototypeGenerator();
    const prd = {
      id: 'prd-9',
      title: 'Summary Test',
      description: 'Test',
      features: [],
      userFlows: [{
        id: 'flow-1',
        name: 'Test Flow',
        steps: [{ id: 'step-1', action: 'Test' }],
        entryPoint: 'step-1',
      }],
      uiRequirements: [],
      constraints: [],
    };

    const prototype = await generator.generate(prd);
    const summary = generatePrototypeSummary(prototype);

    expect(summary).toContain('Prototype Summary');
    expect(summary).toContain(prototype.id);
    expect(summary).toContain(prototype.previewUrl);
  });
});

describe('validatePrototype', () => {
  it('should validate complete prototype', async () => {
    const generator = createPrototypeGenerator();
    const prd = {
      id: 'prd-10',
      title: 'Validation Test',
      description: 'Test',
      features: [],
      userFlows: [{
        id: 'flow-1',
        name: 'Test',
        steps: [{ id: 'step-1', action: 'Test' }],
        entryPoint: 'step-1',
      }],
      uiRequirements: [],
      constraints: [],
    };

    const prototype = await generator.generate(prd);
    const result = validatePrototype(prototype);

    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('should detect incomplete prototype', () => {
    const incompletePrototype = {
      id: 'prototype-incomplete',
      pages: [],
      flows: [],
      designTokens: {
        colors: { primary: {}, secondary: {}, neutral: {}, semantic: {} },
        typography: { fontFamily: '', fontFamilyMono: '', fontSize: {}, fontWeight: {}, lineHeight: {} },
        spacing: {},
        shadows: {},
        radii: {},
      },
      previewUrl: '',
      shareUrl: '',
    };

    const result = validatePrototype(incompletePrototype as unknown as PrototypeDefinition);

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
