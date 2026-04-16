/**
 * ANFSF V1.5.0 - Dynamic Router for Layer 8.5 Harness Selection
 *
 * Routes requests to appropriate Harness based on project complexity and token budget.
 * Enables on-demand activation of L13-L17 layers.
 */
export interface ProjectProfile {
    tokenBudget: number;
    featureCount: number;
    userFlowCount: number;
    dataEntityCount: number;
    integrationCount: number;
    complianceRequirements: string[];
}
export interface HarnessActivation {
    orchestration: boolean;
    governance: boolean;
    uiux: boolean;
    evolution: boolean;
    mode: 'light' | 'standard' | 'full';
    reason: string;
}
export interface RouterConfig {
    lightThreshold: number;
    standardThreshold: number;
    requireComplianceCheck: boolean;
}
/**
 * Dynamic Router - decides which Harnesses to activate based on project profile.
 */
export declare class DynamicRouter {
    private config;
    constructor(config?: Partial<RouterConfig>);
    /**
     * Calculate project complexity score (0-1).
     */
    calculateComplexity(profile: ProjectProfile): number;
    /**
     * Determine activation mode based on token budget and complexity.
     */
    determineMode(profile: ProjectProfile): 'light' | 'standard' | 'full';
    /**
     * Decide which Harnesses to activate.
     */
    activate(profile: ProjectProfile): HarnessActivation;
    /**
     * Get human-readable activation reason.
     */
    private getActivationReason;
    /**
     * Get L13-L17 activation status.
     */
    getLayerActivation(profile: ProjectProfile): {
        layers: number[];
        activated: boolean;
    };
}
export declare function getDefaultRouter(): DynamicRouter;
export declare function resetDefaultRouter(): void;
