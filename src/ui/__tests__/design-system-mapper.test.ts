/**
 * Design System Mapper Tests
 */

import { DesignSystemMapper, createDesignSystemMapper, tokensToCSS, calculateDesignSystemCoverage } from '../design-system-mapper';

describe('DesignSystemMapper', () => {
  let mapper: DesignSystemMapper;

  beforeEach(() => {
    mapper = createDesignSystemMapper();
  });

  describe('extractFromPRD', () => {
    it('should extract design tokens from PRD', async () => {
      const prd = {
        id: 'prd-1',
        title: 'Test Product',
        description: 'A modern blue-themed application',
        features: [],
        userFlows: [],
        uiRequirements: [],
        constraints: [],
      };

      const tokens = await mapper.extractFromPRD(prd);

      expect(tokens.colors).toBeDefined();
      expect(tokens.typography).toBeDefined();
      expect(tokens.spacing).toBeDefined();
      expect(tokens.shadows).toBeDefined();
      expect(tokens.radii).toBeDefined();
    });

    it('should detect blue theme from PRD', async () => {
      const prd = {
        id: 'prd-2',
        title: 'Blue App',
        description: 'A blue-themed dashboard with primary blue colors',
        features: [],
        userFlows: [],
        uiRequirements: [],
        constraints: [],
      };

      const tokens = await mapper.extractFromPRD(prd);

      expect(tokens.colors.primary[500]).toBe('#3b82f6');
    });

    it('should detect green theme from PRD', async () => {
      const prd = {
        id: 'prd-3',
        title: 'Green App',
        description: 'A green-themed application',
        features: [],
        userFlows: [],
        uiRequirements: [],
        constraints: [],
      };

      const tokens = await mapper.extractFromPRD(prd);

      expect(tokens.colors.primary[500]).toBe('#10b981');
    });
  });

  describe('mapSemanticToToken', () => {
    it('should map primary color term', async () => {
      const mapping = await mapper.mapSemanticToToken('primary');

      expect(mapping.tokenPath).toBe('colors.primary.500');
      expect(mapping.confidence).toBe(100);
    });

    it('should map typography term', async () => {
      const mapping = await mapper.mapSemanticToToken('heading');

      expect(mapping.tokenPath).toBe('typography.fontSize.2xl');
      expect(mapping.confidence).toBe(100);
    });

    it('should map spacing term', async () => {
      const mapping = await mapper.mapSemanticToToken('large');

      expect(mapping.tokenPath).toBe('spacing.8');
      expect(mapping.confidence).toBe(100);
    });

    it('should cache mappings', async () => {
      const mapping1 = await mapper.mapSemanticToToken('primary');
      const mapping2 = await mapper.mapSemanticToToken('primary');

      expect(mapping1.tokenPath).toBe(mapping2.tokenPath);
    });
  });

  describe('checkConsistency', () => {
    it('should check design system consistency', async () => {
      const tokens = {
        colors: {
          primary: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
          secondary: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
          neutral: { 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b' },
          semantic: { success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
        },
        typography: {
          fontFamily: 'Inter',
          fontFamilyMono: 'JetBrains Mono',
          fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem' },
          fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
          lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
        },
        spacing: { 0: '0', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem', 5: '1.25rem', 6: '1.5rem', 8: '2rem', 10: '2.5rem', 12: '3rem', 16: '4rem', 20: '5rem', 24: '6rem', 32: '8rem' },
        shadows: { sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)' },
        radii: { none: '0', sm: '0.125rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', '2xl': '1rem', full: '9999px' },
      };

      const report = await mapper.checkConsistency(tokens);

      expect(report.score).toBeGreaterThan(0);
      expect(report.score).toBeLessThanOrEqual(100);
    });
  });

  describe('generateTheme', () => {
    it('should generate light theme', async () => {
      const prd = {
        id: 'prd-4',
        title: 'Test',
        description: 'Test',
        features: [],
        userFlows: [],
        uiRequirements: [],
        constraints: [],
      };

      const tokens = await mapper.extractFromPRD(prd);
      const theme = mapper.generateTheme(tokens, 'light');

      expect(theme.variant).toBe('light');
      expect(theme.name).toBe('light-theme');
    });

    it('should generate dark theme', async () => {
      const prd = {
        id: 'prd-5',
        title: 'Test',
        description: 'Test',
        features: [],
        userFlows: [],
        uiRequirements: [],
        constraints: [],
      };

      const tokens = await mapper.extractFromPRD(prd);
      const theme = mapper.generateTheme(tokens, 'dark');

      expect(theme.variant).toBe('dark');
      expect(theme.name).toBe('dark-theme');
    });
  });
});

describe('tokensToCSS', () => {
  it('should convert tokens to CSS custom properties', async () => {
    const mapper = createDesignSystemMapper();
    const prd = {
      id: 'prd-6',
      title: 'Test',
      description: 'Test',
      features: [],
      userFlows: [],
      uiRequirements: [],
      constraints: [],
    };

    const tokens = await mapper.extractFromPRD(prd);
    const css = tokensToCSS(tokens);

    expect(css).toContain(':root');
    expect(css).toContain('--ds-color-primary-500');
  });
});

describe('calculateDesignSystemCoverage', () => {
  it('should calculate coverage score', async () => {
    const mapper = createDesignSystemMapper();
    const prd = {
      id: 'prd-7',
      title: 'Test',
      description: 'Test',
      features: [],
      userFlows: [],
      uiRequirements: [],
      constraints: [],
    };

    const tokens = await mapper.extractFromPRD(prd);
    const coverage = calculateDesignSystemCoverage(tokens);

    expect(coverage).toBeGreaterThan(0);
    expect(coverage).toBeLessThanOrEqual(100);
  });
});
