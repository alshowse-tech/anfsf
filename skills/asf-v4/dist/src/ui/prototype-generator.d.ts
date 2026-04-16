/**
 * Prototype Generator
 *
 * Integrates all UI modules to generate complete interactive prototypes
 * from PRD. Supports export to Figma and code.
 *
 * @version 1.4.0
 */
import type { PrototypeDefinition, GenerationConfig, ExportResult, ExportOptions, CodeExport, Feedback, PRD } from './types';
export declare class PrototypeGenerator {
    private componentSynthesizer;
    private layoutGenerator;
    private designSystemMapper;
    private interactionFlowEngine;
    private prototypeCache;
    constructor(config?: GenerationConfig);
    /**
     * Generate complete prototype from PRD
     */
    generate(prd: PRD, config?: GenerationConfig): Promise<PrototypeDefinition>;
    /**
     * Export prototype to Figma
     */
    exportToFigma(prototype: PrototypeDefinition): Promise<ExportResult>;
    /**
     * Export prototype to code
     */
    exportToCode(prototype: PrototypeDefinition, options: ExportOptions): Promise<CodeExport>;
    /**
     * Collect feedback for prototype
     */
    collectFeedback(prototype: PrototypeDefinition): Promise<Feedback[]>;
    private generatePages;
    private generateComponentsForFlow;
    private generateFlows;
    private generateComponentFile;
    private generateTestFile;
    private generateStoryFile;
    private generateLayoutFile;
    private generateTokensFile;
    private generateIndexFile;
    private getDefaultConfig;
    private convertConfig;
    private generatePagePath;
    private generatePreviewUrl;
    private generateShareUrl;
    private propsToObject;
}
export declare function createPrototypeGenerator(config?: GenerationConfig): PrototypeGenerator;
/**
 * Generate prototype summary
 */
export declare function generatePrototypeSummary(prototype: PrototypeDefinition): string;
/**
 * Calculate prototype complexity score
 */
export declare function calculatePrototypeComplexity(prototype: PrototypeDefinition): number;
/**
 * Validate prototype completeness
 */
export declare function validatePrototype(prototype: PrototypeDefinition): {
    valid: boolean;
    issues: string[];
};
