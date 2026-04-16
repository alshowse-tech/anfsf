"use strict";
/**
 * Design System Mapper
 *
 * Maps PRD semantics to design tokens and generates consistent design systems.
 * Supports theme generation and consistency checking.
 *
 * @version 1.4.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignSystemMapper = void 0;
exports.createDesignSystemMapper = createDesignSystemMapper;
exports.tokensToCSS = tokensToCSS;
exports.tokensToTailwind = tokensToTailwind;
exports.calculateDesignSystemCoverage = calculateDesignSystemCoverage;
const constants_1 = require("./constants");
// ============================================================================
// Semantic Token Mappings
// ============================================================================
const SEMANTIC_TOKEN_MAP = {
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
class DesignSystemMapper {
    constructor() {
        this.tokenCache = new Map();
    }
    /**
     * Extract design tokens from PRD
     */
    async extractFromPRD(prd) {
        const tokens = {
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
    async mapSemanticToToken(semantic) {
        // Check cache
        const cached = this.tokenCache.get(semantic);
        if (cached)
            return cached;
        const normalizedSemantic = semantic.toLowerCase().trim();
        // Direct mapping
        if (SEMANTIC_TOKEN_MAP[normalizedSemantic]) {
            const mapping = {
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
            const mapping = {
                prdTerm: semantic,
                tokenPath: fuzzyMatch,
                confidence: 75,
            };
            this.tokenCache.set(semantic, mapping);
            return mapping;
        }
        // Default mapping
        const mapping = {
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
    async checkConsistency(tokens) {
        const issues = [];
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
    generateTheme(tokens, variant) {
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
    extractColors(prd) {
        // Check if PRD specifies custom colors
        const prdText = JSON.stringify(prd).toLowerCase();
        let primary = { ...constants_1.DEFAULT_PRIMARY_COLOR };
        let secondary = { ...constants_1.DEFAULT_SECONDARY_COLOR };
        let neutral = { ...constants_1.DEFAULT_NEUTRAL_COLOR };
        const semantic = { ...constants_1.DEFAULT_SEMANTIC_COLORS };
        // Detect brand colors from PRD
        if (prdText.includes('blue')) {
            primary = constants_1.DEFAULT_PRIMARY_COLOR;
        }
        else if (prdText.includes('green')) {
            primary = this.generateColorRamp('#10b981');
        }
        else if (prdText.includes('purple')) {
            primary = this.generateColorRamp('#8b5cf6');
        }
        else if (prdText.includes('red')) {
            primary = this.generateColorRamp('#ef4444');
        }
        return {
            primary,
            secondary,
            neutral,
            semantic,
        };
    }
    extractTypography(prd) {
        const prdText = JSON.stringify(prd).toLowerCase();
        // Detect font preferences
        let fontFamily = 'Inter, system-ui, sans-serif';
        if (prdText.includes('serif')) {
            fontFamily = 'Georgia, serif';
        }
        else if (prdText.includes('mono') || prdText.includes('code')) {
            fontFamily = 'JetBrains Mono, monospace';
        }
        return {
            fontFamily,
            fontFamilyMono: 'JetBrains Mono, monospace',
            fontSize: constants_1.FONT_SIZE_SCALE,
            fontWeight: constants_1.FONT_WEIGHT_SCALE,
            lineHeight: constants_1.LINE_HEIGHT_SCALE,
        };
    }
    extractSpacing(prd) {
        // Use default spacing scale
        return constants_1.SPACING_SCALE;
    }
    extractShadows(prd) {
        // Use default shadow definitions
        return constants_1.SHADOW_DEFINITIONS;
    }
    extractRadii(prd) {
        const prdText = JSON.stringify(prd).toLowerCase();
        // Detect border radius preference
        if (prdText.includes('rounded') || prdText.includes('modern')) {
            return constants_1.BORDER_RADIUS_SCALE;
        }
        else if (prdText.includes('square') || prdText.includes('sharp')) {
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
        return constants_1.BORDER_RADIUS_SCALE;
    }
    // ============================================================================
    // Private Methods - Consistency Checks
    // ============================================================================
    checkColorConsistency(colors) {
        const issues = [];
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
    checkTypographyConsistency(typography) {
        const issues = [];
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
    checkSpacingConsistency(spacing) {
        const issues = [];
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
    checkShadowConsistency(shadows) {
        const issues = [];
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
    calculateShadowIntensity(shadow) {
        // Simple heuristic: count blur radius
        const match = shadow.match(/(\d+)px/);
        return match ? parseInt(match[1]) : 0;
    }
    // ============================================================================
    // Private Methods - Utilities
    // ============================================================================
    fuzzyMatch(semantic) {
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
    generateColorRamp(baseColor) {
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
    lightenColor(color, amount) {
        // Simplified - in production would use proper color manipulation
        return color;
    }
    darkenColor(color, amount) {
        // Simplified - in production would use proper color manipulation
        return color;
    }
    adaptTokensForDark(tokens) {
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
exports.DesignSystemMapper = DesignSystemMapper;
// ============================================================================
// Factory Function
// ============================================================================
function createDesignSystemMapper() {
    return new DesignSystemMapper();
}
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Convert design tokens to CSS custom properties
 */
function tokensToCSS(tokens, prefix = '--ds') {
    const css = [];
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
function tokensToTailwind(tokens) {
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
function calculateDesignSystemCoverage(tokens) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVzaWduLXN5c3RlbS1tYXBwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvdWkvZGVzaWduLXN5c3RlbS1tYXBwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7O0dBT0c7OztBQWtjSCw0REFFQztBQVNELGtDQThCQztBQUtELDRDQWtCQztBQUtELHNFQTRCQztBQXBoQkQsMkNBV3FCO0FBRXJCLCtFQUErRTtBQUMvRSwwQkFBMEI7QUFDMUIsK0VBQStFO0FBRS9FLE1BQU0sa0JBQWtCLEdBQTJCO0lBQ2pELFNBQVM7SUFDVCxTQUFTLEVBQUUsb0JBQW9CO0lBQy9CLFdBQVcsRUFBRSxzQkFBc0I7SUFDbkMsUUFBUSxFQUFFLG9CQUFvQjtJQUM5QixZQUFZLEVBQUUsbUJBQW1CO0lBQ2pDLFNBQVMsRUFBRSxrQkFBa0I7SUFDN0IsTUFBTSxFQUFFLG9CQUFvQjtJQUM1QixZQUFZLEVBQUUsb0JBQW9CO0lBQ2xDLFFBQVEsRUFBRSxvQkFBb0I7SUFDOUIsU0FBUyxFQUFFLHlCQUF5QjtJQUNwQyxTQUFTLEVBQUUseUJBQXlCO0lBQ3BDLE9BQU8sRUFBRSx1QkFBdUI7SUFDaEMsTUFBTSxFQUFFLHNCQUFzQjtJQUU5QixhQUFhO0lBQ2IsU0FBUyxFQUFFLHlCQUF5QjtJQUNwQyxZQUFZLEVBQUUsd0JBQXdCO0lBQ3RDLE1BQU0sRUFBRSwwQkFBMEI7SUFDbEMsU0FBUyxFQUFFLHdCQUF3QjtJQUNuQyxPQUFPLEVBQUUsd0JBQXdCO0lBQ2pDLE1BQU0sRUFBRSw0QkFBNEI7SUFDcEMsZUFBZSxFQUFFLDhCQUE4QjtJQUUvQyxVQUFVO0lBQ1YsZUFBZSxFQUFFLFdBQVc7SUFDNUIsZ0JBQWdCLEVBQUUsV0FBVztJQUM3QixPQUFPLEVBQUUsV0FBVztJQUNwQixJQUFJLEVBQUUsWUFBWTtJQUNsQixLQUFLLEVBQUUsWUFBWTtJQUVuQixVQUFVO0lBQ1YsV0FBVyxFQUFFLFlBQVk7SUFDekIs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O0lBQ3pELEtBQUssSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUV4RCx5QkFBeUI7SUFDekIsUUFBUSxJQUFJLEVBQUUsQ0FBQztJQUNmLEtBQUssSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUMsS0FBSyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBRTVELHNCQUFzQjtJQUN0QixRQUFRLElBQUksRUFBRSxDQUFDO0lBQ2YsS0FBSyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFFaEQsc0JBQXNCO0lBQ3RCLFFBQVEsSUFBSSxFQUFFLENBQUM7SUFDZixLQUFLLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUVoRCw0QkFBNEI7SUFDNUIsUUFBUSxJQUFJLEVBQUUsQ0FBQztJQUNmLEtBQUssSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO0lBRWhELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzdELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIERlc2lnbiBTeXN0ZW0gTWFwcGVyXG4gKiBcbiAqIE1hcHMgUFJEIHNlbWFudGljcyB0byBkZXNpZ24gdG9rZW5zIGFuZCBnZW5lcmF0ZXMgY29uc2lzdGVudCBkZXNpZ24gc3lzdGVtcy5cbiAqIFN1cHBvcnRzIHRoZW1lIGdlbmVyYXRpb24gYW5kIGNvbnNpc3RlbmN5IGNoZWNraW5nLlxuICogXG4gKiBAdmVyc2lvbiAxLjQuMFxuICovXG5cbmltcG9ydCB0eXBlIHtcbiAgRGVzaWduVG9rZW5zLFxuICBTZW1hbnRpY01hcHBpbmcsXG4gIENvbnNpc3RlbmN5UmVwb3J0LFxuICBUaGVtZURlZmluaXRpb24sXG4gIFBSRCxcbiAgQ29sb3JQYWxldHRlLFxuICBUeXBvZ3JhcGh5U2NhbGUsXG4gIFNwYWNpbmdTY2FsZSxcbiAgU2hhZG93RGVmaW5pdGlvbnMsXG4gIEJvcmRlclJhZGl1c1NjYWxlLFxuICBDb25zaXN0ZW5jeUlzc3VlLFxufSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7XG4gIERFRkFVTFRfUFJJTUFSWV9DT0xPUixcbiAgREVGQVVMVF9TRUNPTkRBUllfQ09MT1IsXG4gIERFRkFVTFRfTkVVVFJBTF9DT0xPUixcbiAgREVGQVVMVF9TRU1BTlRJQ19DT0xPUlMsXG4gIEZPTlRfU0laRV9TQ0FMRSxcbiAgRk9OVF9XRUlHSFRfU0NBTEUsXG4gIExJTkVfSEVJR0hUX1NDQUxFLFxuICBTUEFDSU5HX1NDQUxFLFxuICBTSEFET1dfREVGSU5JVElPTlMsXG4gIEJPUkRFUl9SQURJVVNfU0NBTEUsXG59IGZyb20gJy4vY29uc3RhbnRzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2VtYW50aWMgVG9rZW4gTWFwcGluZ3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuY29uc3QgU0VNQU5USUNfVE9LRU5fTUFQOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAvLyBDb2xvcnNcbiAgJ3ByaW1hcnknOiAnY29sb3JzLnByaW1hcnkuNTAwJyxcbiAgJ3NlY29uZGFyeSc6ICdjb2xvcnMuc2Vjb25kYXJ5LjUwMCcsXG4gICdhY2NlbnQnOiAnY29sb3JzLnByaW1hcnkuNjAwJyxcbiAgJ2JhY2tncm91bmQnOiAnY29sb3JzLm5ldXRyYWwuNTAnLFxuICAnc3VyZmFjZSc6ICdjb2xvcnMubmV1dHJhbC4wJyxcbiAgJ3RleHQnOiAnY29sb3JzLm5ldXRyYWwuOTAwJyxcbiAgJ3RleHQtbXV0ZWQnOiAnY29sb3JzLm5ldXRyYWwuNjAwJyxcbiAgJ2JvcmRlcic6ICdjb2xvcnMubmV1dHJhbC4yMDAnLFxuICAnc3VjY2Vzcyc6ICdjb2xvcnMuc2VtYW50aWMuc3VjY2VzcycsXG4gICd3YXJuaW5nJzogJ2NvbG9ycy5zZW1hbnRpYy53YXJuaW5nJyxcbiAgJ2Vycm9yJzogJ2NvbG9ycy5zZW1hbnRpYy5lcnJvcicsXG4gICdpbmZvJzogJ2NvbG9ycy5zZW1hbnRpYy5pbmZvJyxcbiAgXG4gIC8vIFR5cG9ncmFwaHlcbiAgJ2hlYWRpbmcnOiAndHlwb2dyYXBoeS5mb250U2l6ZS4yeGwnLFxuICAnc3ViaGVhZGluZyc6ICd0eXBvZ3JhcGh5LmZvbnRTaXplLnhsJyxcbiAgJ2JvZHknOiAndHlwb2dyYXBoeS5mb250U2l6ZS5iYXNlJyxcbiAgJ2NhcHRpb24nOiAndHlwb2dyYXBoeS5mb250U2l6ZS5zbScsXG4gICdsYWJlbCc6ICd0eXBvZ3JhcGh5LmZvbnRTaXplLnhzJyxcbiAgJ2JvbGQnOiAndHlwb2dyYXBoeS5mb250V2VpZ2h0LmJvbGQnLFxuICAnbWVkaXVtLXdlaWdodCc6ICd0eXBvZ3JhcGh5LmZvbnRXZWlnaHQubWVkaXVtJyxcbiAgXG4gIC8vIFNwYWNpbmdcbiAgJ3NtYWxsLXNwYWNpbmcnOiAnc3BhY2luZy4yJyxcbiAgJ21lZGl1bS1zcGFjaW5nJzogJ3NwYWNpbmcuNCcsXG4gICdsYXJnZSc6ICdzcGFjaW5nLjgnLFxuICAneGwnOiAnc3BhY2luZy4xMicsXG4gICd4eGwnOiAnc3BhY2luZy4xNicsXG4gIFxuICAvLyBTaGFkb3dzXG4gICdzaGFkb3ctc20nOiAnc2hhZG93cy5zbScsXG4gICdzaGFkb3cnOiAnc2hhZG93cy5tZCcsXG4gICdzaGFkb3ctbGcnOiAnc2hhZG93cy5sZycsXG4gICdzaGFkb3cteGwnOiAnc2hhZG93cy54bCcsXG4gIFxuICAvLyBSYWRpdXNcbiAgJ3JvdW5kZWQtc20nOiAncmFkaWkuc20nLFxuICAncm91bmRlZCc6ICdyYWRpaS5tZCcsXG4gICdyb3VuZGVkLWxnJzogJ3JhZGlpLmxnJyxcbiAgJ3JvdW5kZWQteGwnOiAncmFkaWkueGwnLFxuICAncm91bmRlZC1mdWxsJzogJ3JhZGlpLmZ1bGwnLFxufTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRGVzaWduIFN5c3RlbSBNYXBwZXIgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIERlc2lnblN5c3RlbU1hcHBlciB7XG4gIHByaXZhdGUgdG9rZW5DYWNoZTogTWFwPHN0cmluZywgU2VtYW50aWNNYXBwaW5nPiA9IG5ldyBNYXAoKTtcblxuICAvKipcbiAgICogRXh0cmFjdCBkZXNpZ24gdG9rZW5zIGZyb20gUFJEXG4gICAqL1xuICBhc3luYyBleHRyYWN0RnJvbVBSRChwcmQ6IFBSRCk6IFByb21pc2U8RGVzaWduVG9rZW5zPiB7XG4gICAgY29uc3QgdG9rZW5zOiBEZXNpZ25Ub2tlbnMgPSB7XG4gICAgICBjb2xvcnM6IHRoaXMuZXh0cmFjdENvbG9ycyhwcmQpLFxuICAgICAgdHlwb2dyYXBoeTogdGhpcy5leHRyYWN0VHlwb2dyYXBoeShwcmQpLFxuICAgICAgc3BhY2luZzogdGhpcy5leHRyYWN0U3BhY2luZyhwcmQpLFxuICAgICAgc2hhZG93czogdGhpcy5leHRyYWN0U2hhZG93cyhwcmQpLFxuICAgICAgcmFkaWk6IHRoaXMuZXh0cmFjdFJhZGlpKHByZCksXG4gICAgfTtcblxuICAgIHJldHVybiB0b2tlbnM7XG4gIH1cblxuICAvKipcbiAgICogTWFwIHNlbWFudGljIHRlcm0gdG8gZGVzaWduIHRva2VuXG4gICAqL1xuICBhc3luYyBtYXBTZW1hbnRpY1RvVG9rZW4oc2VtYW50aWM6IHN0cmluZyk6IFByb21pc2U8U2VtYW50aWNNYXBwaW5nPiB7XG4gICAgLy8gQ2hlY2sgY2FjaGVcbiAgICBjb25zdCBjYWNoZWQgPSB0aGlzLnRva2VuQ2FjaGUuZ2V0KHNlbWFudGljKTtcbiAgICBpZiAoY2FjaGVkKSByZXR1cm4gY2FjaGVkO1xuXG4gICAgY29uc3Qgbm9ybWFsaXplZFNlbWFudGljID0gc2VtYW50aWMudG9Mb3dlckNhc2UoKS50cmltKCk7XG4gICAgXG4gICAgLy8gRGlyZWN0IG1hcHBpbmdcbiAgICBpZiAoU0VNQU5USUNfVE9LRU5fTUFQW25vcm1hbGl6ZWRTZW1hbnRpY10pIHtcbiAgICAgIGNvbnN0IG1hcHBpbmc6IFNlbWFudGljTWFwcGluZyA9IHtcbiAgICAgICAgcHJkVGVybTogc2VtYW50aWMsXG4gICAgICAgIHRva2VuUGF0aDogU0VNQU5USUNfVE9LRU5fTUFQW25vcm1hbGl6ZWRTZW1hbnRpY10sXG4gICAgICAgIGNvbmZpZGVuY2U6IDEwMCxcbiAgICAgIH07XG4gICAgICB0aGlzLnRva2VuQ2FjaGUuc2V0KHNlbWFudGljLCBtYXBwaW5nKTtcbiAgICAgIHJldHVybiBtYXBwaW5nO1xuICAgIH1cblxuICAgIC8vIEZ1enp5IG1hdGNoaW5nXG4gICAgY29uc3QgZnV6enlNYXRjaCA9IHRoaXMuZnV6enlNYXRjaChzZW1hbnRpYyk7XG4gICAgaWYgKGZ1enp5TWF0Y2gpIHtcbiAgICAgIGNvbnN0IG1hcHBpbmc6IFNlbWFudGljTWFwcGluZyA9IHtcbiAgICAgICAgcHJkVGVybTogc2VtYW50aWMsXG4gICAgICAgIHRva2VuUGF0aDogZnV6enlNYXRjaCxcbiAgICAgICAgY29uZmlkZW5jZTogNzUsXG4gICAgICB9O1xuICAgICAgdGhpcy50b2tlbkNhY2hlLnNldChzZW1hbnRpYywgbWFwcGluZyk7XG4gICAgICByZXR1cm4gbWFwcGluZztcbiAgICB9XG5cbiAgICAvLyBEZWZhdWx0IG1hcHBpbmdcbiAgICBjb25zdCBtYXBwaW5nOiBTZW1hbnRpY01hcHBpbmcgPSB7XG4gICAgICBwcmRUZXJtOiBzZW1hbnRpYyxcbiAgICAgIHRva2VuUGF0aDogYGN1c3RvbS4ke3NlbWFudGljLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXFxzKy9nLCAnLScpfWAsXG4gICAgICBjb25maWRlbmNlOiA1MCxcbiAgICB9O1xuICAgIHRoaXMudG9rZW5DYWNoZS5zZXQoc2VtYW50aWMsIG1hcHBpbmcpO1xuICAgIHJldHVybiBtYXBwaW5nO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGRlc2lnbiBzeXN0ZW0gY29uc2lzdGVuY3lcbiAgICovXG4gIGFzeW5jIGNoZWNrQ29uc2lzdGVuY3kodG9rZW5zOiBEZXNpZ25Ub2tlbnMpOiBQcm9taXNlPENvbnNpc3RlbmN5UmVwb3J0PiB7XG4gICAgY29uc3QgaXNzdWVzOiBDb25zaXN0ZW5jeUlzc3VlW10gPSBbXTtcbiAgICBsZXQgc2NvcmUgPSAxMDA7XG5cbiAgICAvLyBDaGVjayBjb2xvciBjb250cmFzdFxuICAgIGNvbnN0IGNvbG9ySXNzdWVzID0gdGhpcy5jaGVja0NvbG9yQ29uc2lzdGVuY3kodG9rZW5zLmNvbG9ycyk7XG4gICAgaXNzdWVzLnB1c2goLi4uY29sb3JJc3N1ZXMpO1xuICAgIHNjb3JlIC09IGNvbG9ySXNzdWVzLmxlbmd0aCAqIDU7XG5cbiAgICAvLyBDaGVjayB0eXBvZ3JhcGh5IHNjYWxlXG4gICAgY29uc3QgdHlwb2dyYXBoeUlzc3VlcyA9IHRoaXMuY2hlY2tUeXBvZ3JhcGh5Q29uc2lzdGVuY3kodG9rZW5zLnR5cG9ncmFwaHkpO1xuICAgIGlzc3Vlcy5wdXNoKC4uLnR5cG9ncmFwaHlJc3N1ZXMpO1xuICAgIHNjb3JlIC09IHR5cG9ncmFwaHlJc3N1ZXMubGVuZ3RoICogNTtcblxuICAgIC8vIENoZWNrIHNwYWNpbmcgc2NhbGVcbiAgICBjb25zdCBzcGFjaW5nSXNzdWVzID0gdGhpcy5jaGVja1NwYWNpbmdDb25zaXN0ZW5jeSh0b2tlbnMuc3BhY2luZyk7XG4gICAgaXNzdWVzLnB1c2goLi4uc3BhY2luZ0lzc3Vlcyk7XG4gICAgc2NvcmUgLT0gc3BhY2luZ0lzc3Vlcy5sZW5ndGggKiAzO1xuXG4gICAgLy8gQ2hlY2sgc2hhZG93IHByb2dyZXNzaW9uXG4gICAgY29uc3Qgc2hhZG93SXNzdWVzID0gdGhpcy5jaGVja1NoYWRvd0NvbnNpc3RlbmN5KHRva2Vucy5zaGFkb3dzKTtcbiAgICBpc3N1ZXMucHVzaCguLi5zaGFkb3dJc3N1ZXMpO1xuICAgIHNjb3JlIC09IHNoYWRvd0lzc3Vlcy5sZW5ndGggKiAyO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbnNpc3RlbnQ6IGlzc3Vlcy5sZW5ndGggPT09IDAsXG4gICAgICBpc3N1ZXMsXG4gICAgICBzY29yZTogTWF0aC5tYXgoMCwgc2NvcmUpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgdGhlbWUgZnJvbSB0b2tlbnNcbiAgICovXG4gIGdlbmVyYXRlVGhlbWUodG9rZW5zOiBEZXNpZ25Ub2tlbnMsIHZhcmlhbnQ6ICdsaWdodCcgfCAnZGFyaycpOiBUaGVtZURlZmluaXRpb24ge1xuICAgIGNvbnN0IHRoZW1lVG9rZW5zID0gdmFyaWFudCA9PT0gJ2RhcmsnIFxuICAgICAgPyB0aGlzLmFkYXB0VG9rZW5zRm9yRGFyayh0b2tlbnMpXG4gICAgICA6IHRva2VucztcblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBgJHt2YXJpYW50fS10aGVtZWAsXG4gICAgICB2YXJpYW50LFxuICAgICAgdG9rZW5zOiB0aGVtZVRva2VucyxcbiAgICB9O1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQcml2YXRlIE1ldGhvZHMgLSBFeHRyYWN0aW9uXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICBwcml2YXRlIGV4dHJhY3RDb2xvcnMocHJkOiBQUkQpOiBDb2xvclBhbGV0dGUge1xuICAgIC8vIENoZWNrIGlmIFBSRCBzcGVjaWZpZXMgY3VzdG9tIGNvbG9yc1xuICAgIGNvbnN0IHByZFRleHQgPSBKU09OLnN0cmluZ2lmeShwcmQpLnRvTG93ZXJDYXNlKCk7XG4gICAgXG4gICAgbGV0IHByaW1hcnkgPSB7IC4uLkRFRkFVTFRfUFJJTUFSWV9DT0xPUiB9O1xuICAgIGxldCBzZWNvbmRhcnkgPSB7IC4uLkRFRkFVTFRfU0VDT05EQVJZX0NPTE9SIH07XG4gICAgbGV0IG5ldXRyYWwgPSB7IC4uLkRFRkFVTFRfTkVVVFJBTF9DT0xPUiB9O1xuICAgIGNvbnN0IHNlbWFudGljID0geyAuLi5ERUZBVUxUX1NFTUFOVElDX0NPTE9SUyB9O1xuXG4gICAgLy8gRGV0ZWN0IGJyYW5kIGNvbG9ycyBmcm9tIFBSRFxuICAgIGlmIChwcmRUZXh0LmluY2x1ZGVzKCdibHVlJykpIHtcbiAgICAgIHByaW1hcnkgPSBERUZBVUxUX1BSSU1BUllfQ09MT1I7XG4gICAgfSBlbHNlIGlmIChwcmRUZXh0LmluY2x1ZGVzKCdncmVlbicpKSB7XG4gICAgICBwcmltYXJ5ID0gdGhpcy5nZW5lcmF0ZUNvbG9yUmFtcCgnIzEwYjk4MScpO1xuICAgIH0gZWxzZSBpZiAocHJkVGV4dC5pbmNsdWRlcygncHVycGxlJykpIHtcbiAgICAgIHByaW1hcnkgPSB0aGlzLmdlbmVyYXRlQ29sb3JSYW1wKCcjOGI1Y2Y2Jyk7XG4gICAgfSBlbHNlIGlmIChwcmRUZXh0LmluY2x1ZGVzKCdyZWQnKSkge1xuICAgICAgcHJpbWFyeSA9IHRoaXMuZ2VuZXJhdGVDb2xvclJhbXAoJyNlZjQ0NDQnKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcHJpbWFyeSxcbiAgICAgIHNlY29uZGFyeSxcbiAgICAgIG5ldXRyYWwsXG4gICAgICBzZW1hbnRpYyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0VHlwb2dyYXBoeShwcmQ6IFBSRCk6IFR5cG9ncmFwaHlTY2FsZSB7XG4gICAgY29uc3QgcHJkVGV4dCA9IEpTT04uc3RyaW5naWZ5KHByZCkudG9Mb3dlckNhc2UoKTtcbiAgICBcbiAgICAvLyBEZXRlY3QgZm9udCBwcmVmZXJlbmNlc1xuICAgIGxldCBmb250RmFtaWx5ID0gJ0ludGVyLCBzeXN0ZW0tdWksIHNhbnMtc2VyaWYnO1xuICAgIGlmIChwcmRUZXh0LmluY2x1ZGVzKCdzZXJpZicpKSB7XG4gICAgICBmb250RmFtaWx5ID0gJ0dlb3JnaWEsIHNlcmlmJztcbiAgICB9IGVsc2UgaWYgKHByZFRleHQuaW5jbHVkZXMoJ21vbm8nKSB8fCBwcmRUZXh0LmluY2x1ZGVzKCdjb2RlJykpIHtcbiAgICAgIGZvbnRGYW1pbHkgPSAnSmV0QnJhaW5zIE1vbm8sIG1vbm9zcGFjZSc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGZvbnRGYW1pbHksXG4gICAgICBmb250RmFtaWx5TW9ubzogJ0pldEJyYWlucyBNb25vLCBtb25vc3BhY2UnLFxuICAgICAgZm9udFNpemU6IEZPTlRfU0laRV9TQ0FMRSxcbiAgICAgIGZvbnRXZWlnaHQ6IEZPTlRfV0VJR0hUX1NDQUxFLFxuICAgICAgbGluZUhlaWdodDogTElORV9IRUlHSFRfU0NBTEUsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdFNwYWNpbmcocHJkOiBQUkQpOiBTcGFjaW5nU2NhbGUge1xuICAgIC8vIFVzZSBkZWZhdWx0IHNwYWNpbmcgc2NhbGVcbiAgICByZXR1cm4gU1BBQ0lOR19TQ0FMRTtcbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdFNoYWRvd3MocHJkOiBQUkQpOiBTaGFkb3dEZWZpbml0aW9ucyB7XG4gICAgLy8gVXNlIGRlZmF1bHQgc2hhZG93IGRlZmluaXRpb25zXG4gICAgcmV0dXJuIFNIQURPV19ERUZJTklUSU9OUztcbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdFJhZGlpKHByZDogUFJEKTogQm9yZGVyUmFkaXVzU2NhbGUge1xuICAgIGNvbnN0IHByZFRleHQgPSBKU09OLnN0cmluZ2lmeShwcmQpLnRvTG93ZXJDYXNlKCk7XG4gICAgXG4gICAgLy8gRGV0ZWN0IGJvcmRlciByYWRpdXMgcHJlZmVyZW5jZVxuICAgIGlmIChwcmRUZXh0LmluY2x1ZGVzKCdyb3VuZGVkJykgfHwgcHJkVGV4dC5pbmNsdWRlcygnbW9kZXJuJykpIHtcbiAgICAgIHJldHVybiBCT1JERVJfUkFESVVTX1NDQUxFO1xuICAgIH0gZWxzZSBpZiAocHJkVGV4dC5pbmNsdWRlcygnc3F1YXJlJykgfHwgcHJkVGV4dC5pbmNsdWRlcygnc2hhcnAnKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbm9uZTogJzAnLFxuICAgICAgICBzbTogJzAnLFxuICAgICAgICBtZDogJzAnLFxuICAgICAgICBsZzogJzAnLFxuICAgICAgICB4bDogJzAnLFxuICAgICAgICAnMnhsJzogJzAnLFxuICAgICAgICBmdWxsOiAnOTk5OXB4JyxcbiAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBCT1JERVJfUkFESVVTX1NDQUxFO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQcml2YXRlIE1ldGhvZHMgLSBDb25zaXN0ZW5jeSBDaGVja3NcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIHByaXZhdGUgY2hlY2tDb2xvckNvbnNpc3RlbmN5KGNvbG9yczogQ29sb3JQYWxldHRlKTogQ29uc2lzdGVuY3lJc3N1ZVtdIHtcbiAgICBjb25zdCBpc3N1ZXM6IENvbnNpc3RlbmN5SXNzdWVbXSA9IFtdO1xuXG4gICAgLy8gQ2hlY2sgaWYgcHJpbWFyeSBoYXMgYWxsIHNoYWRlc1xuICAgIGNvbnN0IHByaW1hcnlTaGFkZXMgPSBPYmplY3Qua2V5cyhjb2xvcnMucHJpbWFyeSk7XG4gICAgaWYgKHByaW1hcnlTaGFkZXMubGVuZ3RoIDwgMTApIHtcbiAgICAgIGlzc3Vlcy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2NvbG9yJyxcbiAgICAgICAgc2V2ZXJpdHk6ICd3YXJuaW5nJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdQcmltYXJ5IGNvbG9yIHBhbGV0dGUgaXMgaW5jb21wbGV0ZScsXG4gICAgICAgIHN1Z2dlc3Rpb246ICdBZGQgYWxsIHNoYWRlcyBmcm9tIDUwIHRvIDkwMCcsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBzZW1hbnRpYyBjb2xvcnMgZXhpc3RcbiAgICBpZiAoIWNvbG9ycy5zZW1hbnRpYy5zdWNjZXNzKSB7XG4gICAgICBpc3N1ZXMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdjb2xvcicsXG4gICAgICAgIHNldmVyaXR5OiAnZXJyb3InLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ01pc3Npbmcgc3VjY2VzcyBjb2xvcicsXG4gICAgICAgIHN1Z2dlc3Rpb246ICdBZGQgc2VtYW50aWMuc3VjY2VzcyB0b2tlbicsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gaXNzdWVzO1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVja1R5cG9ncmFwaHlDb25zaXN0ZW5jeSh0eXBvZ3JhcGh5OiBUeXBvZ3JhcGh5U2NhbGUpOiBDb25zaXN0ZW5jeUlzc3VlW10ge1xuICAgIGNvbnN0IGlzc3VlczogQ29uc2lzdGVuY3lJc3N1ZVtdID0gW107XG5cbiAgICAvLyBDaGVjayBmb250IHNpemUgc2NhbGUgcHJvZ3Jlc3Npb25cbiAgICBjb25zdCBzaXplcyA9IE9iamVjdC52YWx1ZXModHlwb2dyYXBoeS5mb250U2l6ZSk7XG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBzaXplcy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gU2ltcGxlIGNoZWNrIC0gaW4gcmVhbCBpbXBsZW1lbnRhdGlvbiB3b3VsZCBwYXJzZSByZW0gdmFsdWVzXG4gICAgICBpZiAoc2l6ZXNbaV0gPT09IHNpemVzW2kgLSAxXSkge1xuICAgICAgICBpc3N1ZXMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3R5cG9ncmFwaHknLFxuICAgICAgICAgIHNldmVyaXR5OiAnd2FybmluZycsXG4gICAgICAgICAgZGVzY3JpcHRpb246IGBGb250IHNpemUgc2NhbGUgaGFzIGR1cGxpY2F0ZSB2YWx1ZXMgYXQgaW5kZXggJHtpfWAsXG4gICAgICAgICAgc3VnZ2VzdGlvbjogJ0Vuc3VyZSBwcm9ncmVzc2l2ZSBmb250IHNpemUgc2NhbGUnLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaXNzdWVzO1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVja1NwYWNpbmdDb25zaXN0ZW5jeShzcGFjaW5nOiBTcGFjaW5nU2NhbGUpOiBDb25zaXN0ZW5jeUlzc3VlW10ge1xuICAgIGNvbnN0IGlzc3VlczogQ29uc2lzdGVuY3lJc3N1ZVtdID0gW107XG5cbiAgICAvLyBDaGVjayBpZiBzcGFjaW5nIHNjYWxlIGZvbGxvd3MgYSBwYXR0ZXJuXG4gICAgY29uc3QgdmFsdWVzID0gT2JqZWN0LnZhbHVlcyhzcGFjaW5nKTtcbiAgICBpZiAodmFsdWVzLmxlbmd0aCA8IDEwKSB7XG4gICAgICBpc3N1ZXMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdzcGFjaW5nJyxcbiAgICAgICAgc2V2ZXJpdHk6ICd3YXJuaW5nJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdTcGFjaW5nIHNjYWxlIGhhcyB0b28gZmV3IHZhbHVlcycsXG4gICAgICAgIHN1Z2dlc3Rpb246ICdBZGQgbW9yZSBzcGFjaW5nIHZhbHVlcyBmb3IgZmxleGliaWxpdHknLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlzc3VlcztcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tTaGFkb3dDb25zaXN0ZW5jeShzaGFkb3dzOiBTaGFkb3dEZWZpbml0aW9ucyk6IENvbnNpc3RlbmN5SXNzdWVbXSB7XG4gICAgY29uc3QgaXNzdWVzOiBDb25zaXN0ZW5jeUlzc3VlW10gPSBbXTtcblxuICAgIC8vIENoZWNrIHNoYWRvdyBwcm9ncmVzc2lvblxuICAgIGNvbnN0IHNoYWRvd1ZhbHVlcyA9IE9iamVjdC52YWx1ZXMoc2hhZG93cyk7XG4gICAgbGV0IHByZXZJbnRlbnNpdHkgPSAwO1xuICAgIFxuICAgIGZvciAoY29uc3Qgc2hhZG93IG9mIHNoYWRvd1ZhbHVlcykge1xuICAgICAgY29uc3QgaW50ZW5zaXR5ID0gdGhpcy5jYWxjdWxhdGVTaGFkb3dJbnRlbnNpdHkoc2hhZG93KTtcbiAgICAgIGlmIChpbnRlbnNpdHkgPD0gcHJldkludGVuc2l0eSkge1xuICAgICAgICBpc3N1ZXMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3NoYWRvdycsXG4gICAgICAgICAgc2V2ZXJpdHk6ICd3YXJuaW5nJyxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NoYWRvdyBzY2FsZSBpcyBub3QgcHJvZ3Jlc3NpdmUnLFxuICAgICAgICAgIHN1Z2dlc3Rpb246ICdFbnN1cmUgc2hhZG93cyBpbmNyZWFzZSBpbiBpbnRlbnNpdHknLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHByZXZJbnRlbnNpdHkgPSBpbnRlbnNpdHk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlzc3VlcztcbiAgfVxuXG4gIHByaXZhdGUgY2FsY3VsYXRlU2hhZG93SW50ZW5zaXR5KHNoYWRvdzogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAvLyBTaW1wbGUgaGV1cmlzdGljOiBjb3VudCBibHVyIHJhZGl1c1xuICAgIGNvbnN0IG1hdGNoID0gc2hhZG93Lm1hdGNoKC8oXFxkKylweC8pO1xuICAgIHJldHVybiBtYXRjaCA/IHBhcnNlSW50KG1hdGNoWzFdKSA6IDA7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgTWV0aG9kcyAtIFV0aWxpdGllc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgcHJpdmF0ZSBmdXp6eU1hdGNoKHNlbWFudGljOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBjb25zdCBub3JtYWxpemVkID0gc2VtYW50aWMudG9Mb3dlckNhc2UoKTtcbiAgICBcbiAgICAvLyBDb2xvciBtYXRjaGVzXG4gICAgaWYgKG5vcm1hbGl6ZWQuaW5jbHVkZXMoJ2NvbG9yJykgfHwgbm9ybWFsaXplZC5pbmNsdWRlcygnaHVlJykpIHtcbiAgICAgIHJldHVybiAnY29sb3JzLnByaW1hcnkuNTAwJztcbiAgICB9XG4gICAgXG4gICAgLy8gRm9udCBtYXRjaGVzXG4gICAgaWYgKG5vcm1hbGl6ZWQuaW5jbHVkZXMoJ2ZvbnQnKSB8fCBub3JtYWxpemVkLmluY2x1ZGVzKCd0ZXh0JykpIHtcbiAgICAgIHJldHVybiAndHlwb2dyYXBoeS5mb250U2l6ZS5iYXNlJztcbiAgICB9XG4gICAgXG4gICAgLy8gU3BhY2luZyBtYXRjaGVzXG4gICAgaWYgKG5vcm1hbGl6ZWQuaW5jbHVkZXMoJ3NwYWNlJykgfHwgbm9ybWFsaXplZC5pbmNsdWRlcygnZ2FwJykgfHwgbm9ybWFsaXplZC5pbmNsdWRlcygnbWFyZ2luJykgfHwgbm9ybWFsaXplZC5pbmNsdWRlcygncGFkZGluZycpKSB7XG4gICAgICByZXR1cm4gJ3NwYWNpbmcuNCc7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlQ29sb3JSYW1wKGJhc2VDb2xvcjogc3RyaW5nKTogYW55IHtcbiAgICAvLyBTaW1wbGlmaWVkIGNvbG9yIHJhbXAgZ2VuZXJhdGlvblxuICAgIC8vIEluIHByb2R1Y3Rpb24sIHdvdWxkIHVzZSBwcm9wZXIgY29sb3IgbWFuaXB1bGF0aW9uIGxpYnJhcnlcbiAgICByZXR1cm4ge1xuICAgICAgNTA6IHRoaXMubGlnaHRlbkNvbG9yKGJhc2VDb2xvciwgMC45KSxcbiAgICAgIDEwMDogdGhpcy5saWdodGVuQ29sb3IoYmFzZUNvbG9yLCAwLjgpLFxuICAgICAgMjAwOiB0aGlzLmxpZ2h0ZW5Db2xvcihiYXNlQ29sb3IsIDAuNiksXG4gICAgICAzMDA6IHRoaXMubGlnaHRlbkNvbG9yKGJhc2VDb2xvciwgMC40KSxcbiAgICAgIDQwMDogdGhpcy5saWdodGVuQ29sb3IoYmFzZUNvbG9yLCAwLjIpLFxuICAgICAgNTAwOiBiYXNlQ29sb3IsXG4gICAgICA2MDA6IHRoaXMuZGFya2VuQ29sb3IoYmFzZUNvbG9yLCAwLjEpLFxuICAgICAgNzAwOiB0aGlzLmRhcmtlbkNvbG9yKGJhc2VDb2xvciwgMC4yKSxcbiAgICAgIDgwMDogdGhpcy5kYXJrZW5Db2xvcihiYXNlQ29sb3IsIDAuMyksXG4gICAgICA5MDA6IHRoaXMuZGFya2VuQ29sb3IoYmFzZUNvbG9yLCAwLjQpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGxpZ2h0ZW5Db2xvcihjb2xvcjogc3RyaW5nLCBhbW91bnQ6IG51bWJlcik6IHN0cmluZyB7XG4gICAgLy8gU2ltcGxpZmllZCAtIGluIHByb2R1Y3Rpb24gd291bGQgdXNlIHByb3BlciBjb2xvciBtYW5pcHVsYXRpb25cbiAgICByZXR1cm4gY29sb3I7XG4gIH1cblxuICBwcml2YXRlIGRhcmtlbkNvbG9yKGNvbG9yOiBzdHJpbmcsIGFtb3VudDogbnVtYmVyKTogc3RyaW5nIHtcbiAgICAvLyBTaW1wbGlmaWVkIC0gaW4gcHJvZHVjdGlvbiB3b3VsZCB1c2UgcHJvcGVyIGNvbG9yIG1hbmlwdWxhdGlvblxuICAgIHJldHVybiBjb2xvcjtcbiAgfVxuXG4gIHByaXZhdGUgYWRhcHRUb2tlbnNGb3JEYXJrKHRva2VuczogRGVzaWduVG9rZW5zKTogRGVzaWduVG9rZW5zIHtcbiAgICAvLyBBZGFwdCBjb2xvcnMgZm9yIGRhcmsgdGhlbWVcbiAgICByZXR1cm4ge1xuICAgICAgLi4udG9rZW5zLFxuICAgICAgY29sb3JzOiB7XG4gICAgICAgIC4uLnRva2Vucy5jb2xvcnMsXG4gICAgICAgIG5ldXRyYWw6IHtcbiAgICAgICAgICA1MDogJyMxODE4MWInLFxuICAgICAgICAgIDEwMDogJyMyNzI3MmEnLFxuICAgICAgICAgIDIwMDogJyMzZjNmNDYnLFxuICAgICAgICAgIDMwMDogJyM1MjUyNWInLFxuICAgICAgICAgIDQwMDogJyM3MTcxN2EnLFxuICAgICAgICAgIDUwMDogJyNhMWExYWEnLFxuICAgICAgICAgIDYwMDogJyNkNGQ0ZDgnLFxuICAgICAgICAgIDcwMDogJyNlNGU0ZTcnLFxuICAgICAgICAgIDgwMDogJyNmNGY0ZjUnLFxuICAgICAgICAgIDkwMDogJyNmYWZhZmEnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZhY3RvcnkgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURlc2lnblN5c3RlbU1hcHBlcigpOiBEZXNpZ25TeXN0ZW1NYXBwZXIge1xuICByZXR1cm4gbmV3IERlc2lnblN5c3RlbU1hcHBlcigpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBVdGlsaXR5IEZ1bmN0aW9uc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENvbnZlcnQgZGVzaWduIHRva2VucyB0byBDU1MgY3VzdG9tIHByb3BlcnRpZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRva2Vuc1RvQ1NTKHRva2VuczogRGVzaWduVG9rZW5zLCBwcmVmaXg6IHN0cmluZyA9ICctLWRzJyk6IHN0cmluZyB7XG4gIGNvbnN0IGNzczogc3RyaW5nW10gPSBbXTtcblxuICAvLyBDb2xvcnNcbiAgT2JqZWN0LmVudHJpZXModG9rZW5zLmNvbG9ycy5wcmltYXJ5KS5mb3JFYWNoKChbc2hhZGUsIHZhbHVlXSkgPT4ge1xuICAgIGNzcy5wdXNoKGAgICR7cHJlZml4fS1jb2xvci1wcmltYXJ5LSR7c2hhZGV9OiAke3ZhbHVlfTtgKTtcbiAgfSk7XG5cbiAgLy8gVHlwb2dyYXBoeVxuICBjc3MucHVzaChgICAke3ByZWZpeH0tZm9udC1mYW1pbHk6ICR7dG9rZW5zLnR5cG9ncmFwaHkuZm9udEZhbWlseX07YCk7XG4gIE9iamVjdC5lbnRyaWVzKHRva2Vucy50eXBvZ3JhcGh5LmZvbnRTaXplKS5mb3JFYWNoKChbc2l6ZSwgdmFsdWVdKSA9PiB7XG4gICAgY3NzLnB1c2goYCAgJHtwcmVmaXh9LWZvbnQtc2l6ZS0ke3NpemV9OiAke3ZhbHVlfTtgKTtcbiAgfSk7XG5cbiAgLy8gU3BhY2luZ1xuICBPYmplY3QuZW50cmllcyh0b2tlbnMuc3BhY2luZykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgY3NzLnB1c2goYCAgJHtwcmVmaXh9LXNwYWNpbmctJHtrZXl9OiAke3ZhbHVlfTtgKTtcbiAgfSk7XG5cbiAgLy8gU2hhZG93c1xuICBPYmplY3QuZW50cmllcyh0b2tlbnMuc2hhZG93cykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgY3NzLnB1c2goYCAgJHtwcmVmaXh9LXNoYWRvdy0ke2tleX06ICR7dmFsdWV9O2ApO1xuICB9KTtcblxuICAvLyBCb3JkZXIgcmFkaXVzXG4gIE9iamVjdC5lbnRyaWVzKHRva2Vucy5yYWRpaSkuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgY3NzLnB1c2goYCAgJHtwcmVmaXh9LXJhZGl1cy0ke2tleX06ICR7dmFsdWV9O2ApO1xuICB9KTtcblxuICByZXR1cm4gYDpyb290IHtcXG4ke2Nzcy5qb2luKCdcXG4nKX1cXG59YDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGRlc2lnbiB0b2tlbnMgdG8gVGFpbHdpbmQgY29uZmlnXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b2tlbnNUb1RhaWx3aW5kKHRva2VuczogRGVzaWduVG9rZW5zKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAvKiogQHR5cGUge2ltcG9ydCgndGFpbHdpbmRjc3MnKS5Db25maWd9ICovXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgdGhlbWU6IHtcbiAgICBleHRlbmQ6IHtcbiAgICAgIGNvbG9yczoge1xuICAgICAgICBwcmltYXJ5OiAke0pTT04uc3RyaW5naWZ5KHRva2Vucy5jb2xvcnMucHJpbWFyeSl9LFxuICAgICAgICBzZWNvbmRhcnk6ICR7SlNPTi5zdHJpbmdpZnkodG9rZW5zLmNvbG9ycy5zZWNvbmRhcnkpfSxcbiAgICAgIH0sXG4gICAgICBmb250RmFtaWx5OiB7XG4gICAgICAgIHNhbnM6IFsnJHt0b2tlbnMudHlwb2dyYXBoeS5mb250RmFtaWx5fSddLFxuICAgICAgfSxcbiAgICAgIHNwYWNpbmc6ICR7SlNPTi5zdHJpbmdpZnkodG9rZW5zLnNwYWNpbmcpfSxcbiAgICAgIGJveFNoYWRvdzogJHtKU09OLnN0cmluZ2lmeSh0b2tlbnMuc2hhZG93cyl9LFxuICAgICAgYm9yZGVyUmFkaXVzOiAke0pTT04uc3RyaW5naWZ5KHRva2Vucy5yYWRpaSl9LFxuICAgIH0sXG4gIH0sXG59O2A7XG59XG5cbi8qKlxuICogQ2FsY3VsYXRlIGRlc2lnbiBzeXN0ZW0gY292ZXJhZ2Ugc2NvcmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZURlc2lnblN5c3RlbUNvdmVyYWdlKHRva2VuczogRGVzaWduVG9rZW5zKTogbnVtYmVyIHtcbiAgbGV0IHNjb3JlID0gMDtcbiAgbGV0IG1heFNjb3JlID0gMDtcblxuICAvLyBDb2xvcnMgKDQwIHBvaW50cylcbiAgbWF4U2NvcmUgKz0gNDA7XG4gIHNjb3JlICs9IE9iamVjdC5rZXlzKHRva2Vucy5jb2xvcnMucHJpbWFyeSkubGVuZ3RoICogNDtcbiAgc2NvcmUgKz0gT2JqZWN0LmtleXModG9rZW5zLmNvbG9ycy5zZWNvbmRhcnkpLmxlbmd0aCAqIDI7XG4gIHNjb3JlICs9IE9iamVjdC5rZXlzKHRva2Vucy5jb2xvcnMuc2VtYW50aWMpLmxlbmd0aCAqIDU7XG5cbiAgLy8gVHlwb2dyYXBoeSAoMjAgcG9pbnRzKVxuICBtYXhTY29yZSArPSAyMDtcbiAgc2NvcmUgKz0gdG9rZW5zLnR5cG9ncmFwaHkuZm9udEZhbWlseSA/IDUgOiAwO1xuICBzY29yZSArPSBPYmplY3Qua2V5cyh0b2tlbnMudHlwb2dyYXBoeS5mb250U2l6ZSkubGVuZ3RoICogMjtcblxuICAvLyBTcGFjaW5nICgxNSBwb2ludHMpXG4gIG1heFNjb3JlICs9IDE1O1xuICBzY29yZSArPSBPYmplY3Qua2V5cyh0b2tlbnMuc3BhY2luZykubGVuZ3RoICogMTtcblxuICAvLyBTaGFkb3dzICgxNSBwb2ludHMpXG4gIG1heFNjb3JlICs9IDE1O1xuICBzY29yZSArPSBPYmplY3Qua2V5cyh0b2tlbnMuc2hhZG93cykubGVuZ3RoICogMztcblxuICAvLyBCb3JkZXIgcmFkaXVzICgxMCBwb2ludHMpXG4gIG1heFNjb3JlICs9IDEwO1xuICBzY29yZSArPSBPYmplY3Qua2V5cyh0b2tlbnMucmFkaWkpLmxlbmd0aCAqIDEuNTtcblxuICByZXR1cm4gTWF0aC5taW4oMTAwLCBNYXRoLnJvdW5kKChzY29yZSAvIG1heFNjb3JlKSAqIDEwMCkpO1xufVxuIl19