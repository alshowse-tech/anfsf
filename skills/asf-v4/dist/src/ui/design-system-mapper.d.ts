/**
 * Design System Mapper
 *
 * Maps PRD semantics to design tokens and generates consistent design systems.
 * Supports theme generation and consistency checking.
 *
 * @version 1.4.0
 */
import type { DesignTokens, SemanticMapping, ConsistencyReport, ThemeDefinition, PRD } from './types';
export declare class DesignSystemMapper {
    private tokenCache;
    /**
     * Extract design tokens from PRD
     */
    extractFromPRD(prd: PRD): Promise<DesignTokens>;
    /**
     * Map semantic term to design token
     */
    mapSemanticToToken(semantic: string): Promise<SemanticMapping>;
    /**
     * Check design system consistency
     */
    checkConsistency(tokens: DesignTokens): Promise<ConsistencyReport>;
    /**
     * Generate theme from tokens
     */
    generateTheme(tokens: DesignTokens, variant: 'light' | 'dark'): ThemeDefinition;
    private extractColors;
    private extractTypography;
    private extractSpacing;
    private extractShadows;
    private extractRadii;
    private checkColorConsistency;
    private checkTypographyConsistency;
    private checkSpacingConsistency;
    private checkShadowConsistency;
    private calculateShadowIntensity;
    private fuzzyMatch;
    private generateColorRamp;
    private lightenColor;
    private darkenColor;
    private adaptTokensForDark;
}
export declare function createDesignSystemMapper(): DesignSystemMapper;
/**
 * Convert design tokens to CSS custom properties
 */
export declare function tokensToCSS(tokens: DesignTokens, prefix?: string): string;
/**
 * Convert design tokens to Tailwind config
 */
export declare function tokensToTailwind(tokens: DesignTokens): string;
/**
 * Calculate design system coverage score
 */
export declare function calculateDesignSystemCoverage(tokens: DesignTokens): number;
