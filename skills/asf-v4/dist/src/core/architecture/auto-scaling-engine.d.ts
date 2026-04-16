/**
 * Architecture Auto Scaling Engine
 *
 * Automatically decides architecture mode (light/full) based on project complexity.
 */
export interface ArchitectureMode {
    mode: 'light' | 'full';
    enabledLayers: number[];
    description: string;
}
export declare class ArchitectureAutoScaler {
    /**
     * Compute project complexity from PRD
     */
    computeComplexity(prd: any): number;
    /**
     * Decide architecture mode based on complexity and budget
     */
    decideMode(prd: any, budget?: number): ArchitectureMode;
}
