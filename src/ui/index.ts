/**
 * UI/UX Module Index
 * 
 * Exports all UI intelligent synthesis modules.
 * Version: 1.4.0
 */

// ============================================================================
// Types
// ============================================================================
export type {
  // Core Types
  UIRequirement,
  UIConstraint,
  UserFlow,
  FlowStep,
  
  // Component Synthesis
  ComponentSynthesisResult,
  PropDefinition,
  UISynthesizerConfig,
  ValidationResult,
  OptimizedResult,
  
  // Layout
  LayoutDefinition,
  LayoutSection,
  Breakpoint,
  HierarchyNode,
  
  // Design System
  DesignTokens,
  ColorPalette,
  ColorRamp,
  SemanticColors,
  TypographyScale,
  SpacingScale,
  ShadowDefinitions,
  BorderRadiusScale,
  SemanticMapping,
  ConsistencyReport,
  ConsistencyIssue,
  ThemeDefinition,
  
  // Interaction Flow
  InteractionFlow,
  TriggerDefinition,
  ActionSequence,
  Action,
  StateTransition,
  AnimationDefinition,
  ErrorHandler,
  
  // Prototype
  PrototypeDefinition,
  PageDefinition,
  ComponentDefinition,
  GenerationConfig,
  ExportResult,
  ExportOptions,
  CodeExport,
  ExportedFile,
  ExportSummary,
  Feedback,
  
  // PRD Reference
  PRD,
  Feature,
  PRDConstraint,
} from './types';

// ============================================================================
// Constants
// ============================================================================
export {
  BREAKPOINTS,
  SPACING_SCALE,
  FONT_SIZE_SCALE,
  FONT_WEIGHT_SCALE,
  LINE_HEIGHT_SCALE,
  BORDER_RADIUS_SCALE,
  SHADOW_DEFINITIONS,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  DEFAULT_NEUTRAL_COLOR,
  DEFAULT_SEMANTIC_COLORS,
  ANIMATION_DEFAULTS,
  A11Y_STANDARDS,
  FRAMEWORK_TEMPLATES,
  UI_LIBRARY_COMPONENTS,
  LAYOUT_PATTERNS,
} from './constants';

// ============================================================================
// UI Component Synthesizer
// ============================================================================
export {
  UIComponentSynthesizer,
  createComponentSynthesizer,
  DEFAULT_UI_CONFIG,
} from './ui-component-synthesizer';

// ============================================================================
// Layout Generator
// ============================================================================
export {
  LayoutGenerator,
  createLayoutGenerator,
  generateGridTemplate,
  generateMediaQueries,
  calculateLayoutComplexity,
} from './layout-generator';

// ============================================================================
// Design System Mapper
// ============================================================================
export {
  DesignSystemMapper,
  createDesignSystemMapper,
  tokensToCSS,
  tokensToTailwind,
  calculateDesignSystemCoverage,
} from './design-system-mapper';

// ============================================================================
// Interaction Flow Engine
// ============================================================================
export {
  InteractionFlowEngine,
  createInteractionFlowEngine,
  generateStateMachine,
  generateAnimationCSS,
  calculateFlowComplexity,
  mergeFlows,
} from './interaction-flow-engine';

// ============================================================================
// Prototype Generator
// ============================================================================
export {
  PrototypeGenerator,
  createPrototypeGenerator,
  generatePrototypeSummary,
  calculatePrototypeComplexity,
  validatePrototype,
} from './prototype-generator';

// ============================================================================
// Version
// ============================================================================
export const UI_MODULE_VERSION = '1.4.0';
