/**
 * UI Component Synthesizer
 *
 * Intelligent UI component code generation from PRD requirements.
 * Supports multiple frameworks (React/Vue/Angular) and UI libraries.
 *
 * @version 1.4.0
 */
import type { UIRequirement, UISynthesizerConfig, ComponentSynthesisResult, ValidationResult, OptimizedResult } from './types';
export declare class UIComponentSynthesizer {
    private config;
    constructor(config: UISynthesizerConfig);
    /**
     * Synthesize component from UI requirement
     */
    synthesize(requirement: UIRequirement, config?: UISynthesizerConfig): Promise<ComponentSynthesisResult>;
    /**
     * Validate component code
     */
    validateComponent(code: string): Promise<ValidationResult>;
    /**
     * Optimize component code
     */
    optimizeComponent(code: string): Promise<OptimizedResult>;
    private detectComponentType;
    private createCustomPattern;
    private generateComponentName;
    private generateComponentCode;
    private generateReactCode;
    private generateReactImports;
    private generatePropsInterface;
    private generateReactComponent;
    private generateStyleClasses;
    private generateVueCode;
    private generateAngularCode;
    private getDependencies;
    private calculateA11yScore;
    private addUseMemoHooks;
    private wrapWithMemo;
}
export declare function createComponentSynthesizer(config: UISynthesizerConfig): UIComponentSynthesizer;
export declare const DEFAULT_UI_CONFIG: UISynthesizerConfig;
