/**
 * Design System Mapper
 * 
 * Maps PRD semantics to design tokens and generates consistent design systems.
 * Supports theme generation and consistency checking.
 * 
 * @version 1.4.0
 */

import type {
  DesignTokens,
  SemanticMapping,
  ConsistencyReport,
  ThemeDefinition,
  PRD,
  ColorPalette,
  TypographyScale,
  SpacingScale,
  ShadowDefinitions,
  BorderRadiusScale,
  ConsistencyIssue,
} from './types';
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  DEFAULT_NEUTRAL_COLOR,
  DEFAULT_SEMANTIC_COLORS,
  FONT_SIZE_SCALE,
  FONT_WEIGHT_SCALE,
  LINE_HEIGHT_SCALE,
  SPACING_SCALE,
  SHADOW_DEFINITIONS,
  BORDER_RADIUS_SCALE,
} from './constants';

// ============================================================================
// Semantic Token Mappings
// ============================================================================

const SEMANTIC_TOKEN_MAP: Record<string, string> = {
  // Colors
  'primary': 'colors.primary.500',
  'secondary': 'colors.secondary.500',
  'accent': 'colors.primary.600',
  'background': 'colors.neutral.50',
  'surface': 'colors.neutral.0',
  'text': 'colors.neutral.900',
  'text-muted': 'colors.neutral.600',
  'border': 'colors.neutral.200',
  'success': 'colors.semantic.success',
  'warning': 'colors.semantic.warning',
  'error': 'colors.semantic.error',
  'info': 'colors.semantic.info',
  
  // Typography
  'heading': 'typography.fontSize.2xl',
  'subheading': 'typography.fontSize.xl',
  'body': 'typography.fontSize.base',
  'caption': 'typography.fontSize.sm',
  'label': 'typography.fontSize.xs',
  'bold': 'typography.fontWeight.bold',
  'medium-weight': 'typography.fontWeight.medium',
  
  // Spacing
  'small-spacing': 'spacing.2',
  'medium-spacing': 'spacing.4',
  'large': 'spacing.8',
  'xl': 'spacing.12',
  'xxl': 'spacing.16',
  
  // Shadows
  'shadow-sm': 'shadows.sm',
  'shadow': 'shadows.md',
  'shadow-lg': 'shadows.lg',
  'shadow-xl': 'shadows.xl',
  
  // Radius
  'rounded-sm': 'radii.sm',
  'rounded': 'radii.md',
  'rounded-lg': 'radii.lg',
  'rounded-xl': 'radii.xl',
  'rounded-full': 'radii.full',
};

// ============================================================================
// Design System Mapper Class
// ============================================================================

export class DesignSystemMapper {
  private tokenCache: Map<string, SemanticMapping> = new Map();

  /**
   * Extract design tokens from PRD
   */
  async extractFromPRD(prd: PRD): Promise<DesignTokens> {
    const tokens: DesignTokens = {
      colors: this.extractColors(prd),
      typography: this.extractTypography(prd),
      spacing: this.extractSpacing(prd),
      shadows: this.extractShadows(prd),
      radii: this.extractRadii(prd),
    };

    return tokens;
  }

  /**
   * Map semantic term to design token
   */
  async mapSemanticToToken(semantic: string): Promise<SemanticMapping> {
    // Check cache
    const cached = this.tokenCache.get(semantic);
    if (cached) return cached;

    const normalizedSemantic = semantic.toLowerCase().trim();
    
    // Direct mapping
    if (SEMANTIC_TOKEN_MAP[normalizedSemantic]) {
      const mapping: SemanticMapping = {
        prdTerm: semantic,
        tokenPath: SEMANTIC_TOKEN_MAP[normalizedSemantic],
        confidence: 100,
      };
      this.tokenCache.set(semantic, mapping);
      return mapping;
    }

    // Fuzzy matching
    const fuzzyMatch = this.fuzzyMatch(semantic);
    if (fuzzyMatch) {
      const mapping: SemanticMapping = {
        prdTerm: semantic,
        tokenPath: fuzzyMatch,
        confidence: 75,
      };
      this.tokenCache.set(semantic, mapping);
      return mapping;
    }

    // Default mapping
    const mapping: SemanticMapping = {
      prdTerm: semantic,
      tokenPath: `custom.${semantic.toLowerCase().replace(/\s+/g, '-')}`,
      confidence: 50,
    };
    this.tokenCache.set(semantic, mapping);
    return mapping;
  }

  /**
   * Check design system consistency
   */
  async checkConsistency(tokens: DesignTokens): Promise<ConsistencyReport> {
    const issues: ConsistencyIssue[] = [];
    let score = 100;

    // Check color contrast
    const colorIssues = this.checkColorConsistency(tokens.colors);
    issues.push(...colorIssues);
    score -= colorIssues.length * 5;

    // Check typography scale
    const typographyIssues = this.checkTypographyConsistency(tokens.typography);
    issues.push(...typographyIssues);
    score -= typographyIssues.length * 5;

    // Check spacing scale
    const spacingIssues = this.checkSpacingConsistency(tokens.spacing);
    issues.push(...spacingIssues);
    score -= spacingIssues.length * 3;

    // Check shadow progression
    const shadowIssues = this.checkShadowConsistency(tokens.shadows);
    issues.push(...shadowIssues);
    score -= shadowIssues.length * 2;

    return {
      consistent: issues.length === 0,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * Generate theme from tokens
   */
  generateTheme(tokens: DesignTokens, variant: 'light' | 'dark'): ThemeDefinition {
    const themeTokens = variant === 'dark' 
      ? this.adaptTokensForDark(tokens)
      : tokens;

    return {
      name: `${variant}-theme`,
      variant,
      tokens: themeTokens,
    };
  }

  // ============================================================================
  // Private Methods - Extraction
  // ============================================================================

  private extractColors(prd: PRD): ColorPalette {
    // Check if PRD specifies custom colors
    const prdText = JSON.stringify(prd).toLowerCase();
    
    let primary = { ...DEFAULT_PRIMARY_COLOR };
    let secondary = { ...DEFAULT_SECONDARY_COLOR };
    let neutral = { ...DEFAULT_NEUTRAL_COLOR };
    const semantic = { ...DEFAULT_SEMANTIC_COLORS };

    // Detect brand colors from PRD
    if (prdText.includes('blue')) {
      primary = DEFAULT_PRIMARY_COLOR;
    } else if (prdText.includes('green')) {
      primary = this.generateColorRamp('#10b981');
    } else if (prdText.includes('purple')) {
      primary = this.generateColorRamp('#8b5cf6');
    } else if (prdText.includes('red')) {
      primary = this.generateColorRamp('#ef4444');
    }

    return {
      primary,
      secondary,
      neutral,
      semantic,
    };
  }

  private extractTypography(prd: PRD): TypographyScale {
    const prdText = JSON.stringify(prd).toLowerCase();
    
    // Detect font preferences
    let fontFamily = 'Inter, system-ui, sans-serif';
    if (prdText.includes('serif')) {
      fontFamily = 'Georgia, serif';
    } else if (prdText.includes('mono') || prdText.includes('code')) {
      fontFamily = 'JetBrains Mono, monospace';
    }

    return {
      fontFamily,
      fontFamilyMono: 'JetBrains Mono, monospace',
      fontSize: FONT_SIZE_SCALE,
      fontWeight: FONT_WEIGHT_SCALE,
      lineHeight: LINE_HEIGHT_SCALE,
    };
  }

  private extractSpacing(prd: PRD): SpacingScale {
    // Use default spacing scale
    return SPACING_SCALE;
  }

  private extractShadows(prd: PRD): ShadowDefinitions {
    // Use default shadow definitions
    return SHADOW_DEFINITIONS;
  }

  private extractRadii(prd: PRD): BorderRadiusScale {
    const prdText = JSON.stringify(prd).toLowerCase();
    
    // Detect border radius preference
    if (prdText.includes('rounded') || prdText.includes('modern')) {
      return BORDER_RADIUS_SCALE;
    } else if (prdText.includes('square') || prdText.includes('sharp')) {
      return {
        none: '0',
        sm: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        full: '9999px',
      };
    }
    
    return BORDER_RADIUS_SCALE;
  }

  // ============================================================================
  // Private Methods - Consistency Checks
  // ============================================================================

  private checkColorConsistency(colors: ColorPalette): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Check if primary has all shades
    const primaryShades = Object.keys(colors.primary);
    if (primaryShades.length < 10) {
      issues.push({
        type: 'color',
        severity: 'warning',
        description: 'Primary color palette is incomplete',
        suggestion: 'Add all shades from 50 to 900',
      });
    }

    // Check semantic colors exist
    if (!colors.semantic.success) {
      issues.push({
        type: 'color',
        severity: 'error',
        description: 'Missing success color',
        suggestion: 'Add semantic.success token',
      });
    }

    return issues;
  }

  private checkTypographyConsistency(typography: TypographyScale): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Check font size scale progression
    const sizes = Object.values(typography.fontSize);
    for (let i = 1; i < sizes.length; i++) {
      // Simple check - in real implementation would parse rem values
      if (sizes[i] === sizes[i - 1]) {
        issues.push({
          type: 'typography',
          severity: 'warning',
          description: `Font size scale has duplicate values at index ${i}`,
          suggestion: 'Ensure progressive font size scale',
        });
      }
    }

    return issues;
  }

  private checkSpacingConsistency(spacing: SpacingScale): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Check if spacing scale follows a pattern
    const values = Object.values(spacing);
    if (values.length < 10) {
      issues.push({
        type: 'spacing',
        severity: 'warning',
        description: 'Spacing scale has too few values',
        suggestion: 'Add more spacing values for flexibility',
      });
    }

    return issues;
  }

  private checkShadowConsistency(shadows: ShadowDefinitions): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Check shadow progression
    const shadowValues = Object.values(shadows);
    let prevIntensity = 0;
    
    for (const shadow of shadowValues) {
      const intensity = this.calculateShadowIntensity(shadow);
      if (intensity <= prevIntensity) {
        issues.push({
          type: 'shadow',
          severity: 'warning',
          description: 'Shadow scale is not progressive',
          suggestion: 'Ensure shadows increase in intensity',
        });
      }
      prevIntensity = intensity;
    }

    return issues;
  }

  private calculateShadowIntensity(shadow: string): number {
    // Simple heuristic: count blur radius
    const match = shadow.match(/(\d+)px/);
    return match ? parseInt(match[1]) : 0;
  }

  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================

  private fuzzyMatch(semantic: string): string | null {
    const normalized = semantic.toLowerCase();
    
    // Color matches
    if (normalized.includes('color') || normalized.includes('hue')) {
      return 'colors.primary.500';
    }
    
    // Font matches
    if (normalized.includes('font') || normalized.includes('text')) {
      return 'typography.fontSize.base';
    }
    
    // Spacing matches
    if (normalized.includes('space') || normalized.includes('gap') || normalized.includes('margin') || normalized.includes('padding')) {
      return 'spacing.4';
    }

    return null;
  }

  private generateColorRamp(baseColor: string): any {
    // Simplified color ramp generation
    // In production, would use proper color manipulation library
    return {
      50: this.lightenColor(baseColor, 0.9),
      100: this.lightenColor(baseColor, 0.8),
      200: this.lightenColor(baseColor, 0.6),
      300: this.lightenColor(baseColor, 0.4),
      400: this.lightenColor(baseColor, 0.2),
      500: baseColor,
      600: this.darkenColor(baseColor, 0.1),
      700: this.darkenColor(baseColor, 0.2),
      800: this.darkenColor(baseColor, 0.3),
      900: this.darkenColor(baseColor, 0.4),
    };
  }

  private lightenColor(color: string, amount: number): string {
    // Simplified - in production would use proper color manipulation
    return color;
  }

  private darkenColor(color: string, amount: number): string {
    // Simplified - in production would use proper color manipulation
    return color;
  }

  private adaptTokensForDark(tokens: DesignTokens): DesignTokens {
    // Adapt colors for dark theme
    return {
      ...tokens,
      colors: {
        ...tokens.colors,
        neutral: {
          50: '#18181b',
          100: '#27272a',
          200: '#3f3f46',
          300: '#52525b',
          400: '#71717a',
          500: '#a1a1aa',
          600: '#d4d4d8',
          700: '#e4e4e7',
          800: '#f4f4f5',
          900: '#fafafa',
        },
      },
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDesignSystemMapper(): DesignSystemMapper {
  return new DesignSystemMapper();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert design tokens to CSS custom properties
 */
export function tokensToCSS(tokens: DesignTokens, prefix: string = '--ds'): string {
  const css: string[] = [];

  // Colors
  Object.entries(tokens.colors.primary).forEach(([shade, value]) => {
    css.push(`  ${prefix}-color-primary-${shade}: ${value};`);
  });

  // Typography
  css.push(`  ${prefix}-font-family: ${tokens.typography.fontFamily};`);
  Object.entries(tokens.typography.fontSize).forEach(([size, value]) => {
    css.push(`  ${prefix}-font-size-${size}: ${value};`);
  });

  // Spacing
  Object.entries(tokens.spacing).forEach(([key, value]) => {
    css.push(`  ${prefix}-spacing-${key}: ${value};`);
  });

  // Shadows
  Object.entries(tokens.shadows).forEach(([key, value]) => {
    css.push(`  ${prefix}-shadow-${key}: ${value};`);
  });

  // Border radius
  Object.entries(tokens.radii).forEach(([key, value]) => {
    css.push(`  ${prefix}-radius-${key}: ${value};`);
  });

  return `:root {\n${css.join('\n')}\n}`;
}

/**
 * Convert design tokens to Tailwind config
 */
export function tokensToTailwind(tokens: DesignTokens): string {
  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: ${JSON.stringify(tokens.colors.primary)},
        secondary: ${JSON.stringify(tokens.colors.secondary)},
      },
      fontFamily: {
        sans: ['${tokens.typography.fontFamily}'],
      },
      spacing: ${JSON.stringify(tokens.spacing)},
      boxShadow: ${JSON.stringify(tokens.shadows)},
      borderRadius: ${JSON.stringify(tokens.radii)},
    },
  },
};`;
}

/**
 * Calculate design system coverage score
 */
export function calculateDesignSystemCoverage(tokens: DesignTokens): number {
  let score = 0;
  let maxScore = 0;

  // Colors (40 points)
  maxScore += 40;
  score += Object.keys(tokens.colors.primary).length * 4;
  score += Object.keys(tokens.colors.secondary).length * 2;
  score += Object.keys(tokens.colors.semantic).length * 5;

  // Typography (20 points)
  maxScore += 20;
  score += tokens.typography.fontFamily ? 5 : 0;
  score += Object.keys(tokens.typography.fontSize).length * 2;

  // Spacing (15 points)
  maxScore += 15;
  score += Object.keys(tokens.spacing).length * 1;

  // Shadows (15 points)
  maxScore += 15;
  score += Object.keys(tokens.shadows).length * 3;

  // Border radius (10 points)
  maxScore += 10;
  score += Object.keys(tokens.radii).length * 1.5;

  return Math.min(100, Math.round((score / maxScore) * 100));
}
