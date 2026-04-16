/**
 * UI/UX Module Index
 *
 * Exports all UI intelligent synthesis modules.
 * Version: 1.4.0
 */
export type { UIRequirement, UIConstraint, UserFlow, FlowStep, ComponentSynthesisResult, PropDefinition, UISynthesizerConfig, ValidationResult, OptimizedResult, LayoutDefinition, LayoutSection, Breakpoint, HierarchyNode, DesignTokens, ColorPalette, ColorRamp, SemanticColors, TypographyScale, SpacingScale, ShadowDefinitions, BorderRadiusScale, SemanticMapping, ConsistencyReport, ConsistencyIssue, ThemeDefinition, InteractionFlow, TriggerDefinition, ActionSequence, Action, StateTransition, AnimationDefinition, ErrorHandler, PrototypeDefinition, PageDefinition, ComponentDefinition, GenerationConfig, ExportResult, ExportOptions, CodeExport, ExportedFile, ExportSummary, Feedback, PRD, Feature, PRDConstraint, } from './types';
export { BREAKPOINTS, SPACING_SCALE, FONT_SIZE_SCALE, FONT_WEIGHT_SCALE, LINE_HEIGHT_SCALE, BORDER_RADIUS_SCALE, SHADOW_DEFINITIONS, DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR, DEFAULT_NEUTRAL_COLOR, DEFAULT_SEMANTIC_COLORS, ANIMATION_DEFAULTS, A11Y_STANDARDS, FRAMEWORK_TEMPLATES, UI_LIBRARY_COMPONENTS, LAYOUT_PATTERNS, } from './constants';
export { UIComponentSynthesizer, createComponentSynthesizer, DEFAULT_UI_CONFIG, } from './ui-component-synthesizer';
export { LayoutGenerator, createLayoutGenerator, generateGridTemplate, generateMediaQueries, calculateLayoutComplexity, } from './layout-generator';
export { DesignSystemMapper, createDesignSystemMapper, tokensToCSS, tokensToTailwind, calculateDesignSystemCoverage, } from './design-system-mapper';
export { InteractionFlowEngine, createInteractionFlowEngine, generateStateMachine, generateAnimationCSS, calculateFlowComplexity, mergeFlows, } from './interaction-flow-engine';
export { PrototypeGenerator, createPrototypeGenerator, generatePrototypeSummary, calculatePrototypeComplexity, validatePrototype, } from './prototype-generator';
export declare const UI_MODULE_VERSION = "1.4.0";
