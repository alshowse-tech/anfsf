/**
 * UI/UX Skill Interfaces
 *
 * @module asf-v4/ui/skill
 */
export interface UIComponentConfig {
    name: string;
    type: string;
    properties?: Record<string, any>;
    children?: UIComponent[];
}
export interface UIComponent {
    name: string;
    config: UIComponentConfig;
}
export declare class UIComponentSynthesizer {
    synthesize(components: UIComponent[]): Promise<string>;
}
export declare function createComponentSynthesizer(): UIComponentSynthesizer;
export declare const DEFAULT_UI_CONFIG: UIComponentConfig;
export interface LayoutConfig {
    grid: {
        columns: number;
        rows: number;
    };
    spacing: {
        horizontal: number;
        vertical: number;
    };
}
export declare class LayoutGenerator {
    generate(components: UIComponent[], config: LayoutConfig): Promise<string>;
}
export declare function createLayoutGenerator(): LayoutGenerator;
export interface DesignSystem {
    name: string;
    tokens: Record<string, any>;
    components: Record<string, any>;
}
export declare class DesignSystemMapper {
    private systems;
    registerSystem(system: DesignSystem): void;
    getSystem(name: string): DesignSystem | undefined;
    map(component: UIComponent, systemName: string): UIComponent;
}
export declare function createDesignSystemMapper(): DesignSystemMapper;
export interface InteractionStep {
    id: string;
    action: string;
    target: string;
    conditions?: Record<string, any>;
}
export declare class InteractionFlowEngine {
    generate(steps: InteractionStep[]): Promise<string>;
}
export declare function createInteractionFlowEngine(): InteractionFlowEngine;
export interface PrototypeConfig {
    name: string;
    components: UIComponent[];
    interactions: InteractionStep[];
    designSystem: string;
}
export declare class PrototypeGenerator {
    generate(config: PrototypeConfig): Promise<string>;
}
export declare function createPrototypeGenerator(): PrototypeGenerator;
