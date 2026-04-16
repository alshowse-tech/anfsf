/**
 * Layout Generator
 *
 * Intelligent page layout generation from user flows and requirements.
 * Supports responsive design and visual hierarchy optimization.
 *
 * @version 1.4.0
 */
import type { LayoutDefinition, UserFlow, UIRequirement } from './types';
export declare class LayoutGenerator {
    private defaultBreakpoints;
    /**
     * Generate layout from user flow and requirements
     */
    generateFromFlow(userFlow: UserFlow[], requirements: UIRequirement[]): Promise<LayoutDefinition>;
    /**
     * Adapt layout to specific breakpoint
     */
    adaptToBreakpoint(layout: LayoutDefinition, breakpoint: 'mobile' | 'tablet' | 'desktop'): LayoutDefinition;
    /**
     * Optimize visual hierarchy
     */
    optimizeVisualHierarchy(layout: LayoutDefinition): LayoutDefinition;
    private detectLayoutType;
    private generateLayoutId;
    private generateSections;
    private detectLayoutPattern;
    private createSection;
    private getSectionType;
    private getGridArea;
    private generateSectionStyles;
    private deduplicateSections;
    private generateBreakpoints;
    private buildVisualHierarchy;
    private calculateSectionWeight;
    private adaptSections;
    private adaptHierarchy;
    private optimizeHierarchy;
    private optimizeSectionOrder;
}
export declare function createLayoutGenerator(): LayoutGenerator;
/**
 * Generate CSS Grid template from layout
 */
export declare function generateGridTemplate(layout: LayoutDefinition, breakpoint: string): string;
/**
 * Generate media queries for breakpoints
 */
export declare function generateMediaQueries(layout: LayoutDefinition): string;
/**
 * Calculate layout complexity score
 */
export declare function calculateLayoutComplexity(layout: LayoutDefinition): number;
