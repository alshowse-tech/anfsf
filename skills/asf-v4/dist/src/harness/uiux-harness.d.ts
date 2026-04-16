/**
 * ANFSF V1.5.0 - UI/UX Harness (独立版)
 *
 * Responsible for GenUI, Style Validation, and Personalization Budget.
 * Separated from Experience Harness.
 */
export interface UIUXConfig {
    enableGenUI: boolean;
    enableStyleValidation: boolean;
    enablePersonalizationBudget: boolean;
    styleLoadingTimeout: number;
    criticalCSSInline: boolean;
    styleCacheSize: number;
}
interface ComponentTree {
    components?: any[];
    layout?: any;
    designTokens?: any;
    styles?: {
        external?: string[];
    };
}
interface StyleReport {
    passed: boolean;
    criticalCSSInlined: boolean;
    externalStylesLoaded: number;
    externalStylesTotal: number;
    foucDetected: boolean;
    recommendations: string[];
    timestamp: number;
}
export interface UIComponentResult {
    componentTree: ComponentTree | null;
    styleReport: StyleReport | null;
    personalizationBudget: number;
    errors: string[];
}
/**
 * UI/UX Harness - manages UI synthesis, style validation, and personalization.
 */
export declare class UIUXHarness {
    private config;
    private budgetConfig;
    private styleCache;
    constructor(config?: Partial<UIUXConfig>);
    /**
     * Synthesize UI components from PRD.
     */
    synthesizeUI(prd: any): Promise<UIComponentResult>;
    /**
     * Validate style loading.
     */
    private validateStyleLoading;
    /**
     * Calculate personalization budget.
     */
    private calculatePersonalizationBudget;
    /**
     * Extract style URLs from component tree.
     */
    private extractStyleUrls;
    /**
     * Load style from URL (simulated).
     */
    private loadStyle;
    /**
     * Clear style cache.
     */
    clearStyleCache(): void;
    /**
     * Get harness metrics.
     */
    getMetrics(): {
        styleCacheSize: number;
        genUIEnabled: boolean;
        styleValidationEnabled: boolean;
        personalizationBudgetEnabled: boolean;
    };
    /**
     * Cleanup resources.
     */
    dispose(): void;
}
export declare function createUIUXHarness(config?: Partial<UIUXConfig>): UIUXHarness;
export {};
