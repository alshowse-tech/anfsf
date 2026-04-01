/**
 * UI/UX Module Type Definitions
 * 
 * Core types for UI intelligent synthesis modules.
 * Version: 1.4.0
 */

// ============================================================================
// PRD & Requirement Types
// ============================================================================

/**
 * UI Requirement from PRD
 */
export interface UIRequirement {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  userStory?: string;
  acceptanceCriteria: string[];
  constraints?: UIConstraint[];
}

/**
 * UI Constraints
 */
export interface UIConstraint {
  type: 'accessibility' | 'performance' | 'responsive' | 'browser';
  value: string;
  severity: 'must' | 'should' | 'could';
}

/**
 * User Flow Definition
 */
export interface UserFlow {
  id: string;
  name: string;
  steps: FlowStep[];
  entryPoint: string;
  exitPoint?: string;
}

/**
 * Flow Step
 */
export interface FlowStep {
  id: string;
  action: string;
  screen?: string;
  nextStep?: string;
  alternative?: string;
}

// ============================================================================
// Component Synthesis Types
// ============================================================================

/**
 * Component Synthesis Result
 */
export interface ComponentSynthesisResult {
  componentName: string;
  code: string;
  props: PropDefinition[];
  dependencies: string[];
  a11yScore: number;
}

/**
 * Prop Definition
 */
export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
}

/**
 * UI Synthesizer Config
 */
export interface UISynthesizerConfig {
  framework: 'react' | 'vue' | 'angular';
  uiLibrary: 'antd' | 'mui' | 'chakra' | 'raw';
  styling: 'css-modules' | 'tailwind' | 'styled-components';
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

/**
 * Optimized Result
 */
export interface OptimizedResult {
  originalCode: string;
  optimizedCode: string;
  improvements: string[];
  performanceGain: number;
}

// ============================================================================
// Layout Types
// ============================================================================

/**
 * Layout Definition
 */
export interface LayoutDefinition {
  id: string;
  type: 'grid' | 'flex' | 'masonry';
  sections: LayoutSection[];
  breakpoints: Breakpoint[];
  visualHierarchy: HierarchyNode[];
}

/**
 * Layout Section
 */
export interface LayoutSection {
  id: string;
  name: string;
  type: 'header' | 'footer' | 'sidebar' | 'main' | 'nav' | 'content';
  gridArea?: string;
  children?: LayoutSection[];
  styles?: Record<string, string>;
}

/**
 * Breakpoint Definition
 */
export interface Breakpoint {
  name: 'mobile' | 'tablet' | 'desktop';
  minWidth: number;
  maxWidth?: number;
  columns: number;
  gutter: number;
}

/**
 * Visual Hierarchy Node
 */
export interface HierarchyNode {
  id: string;
  level: number;
  weight: number;
  children?: HierarchyNode[];
}

// ============================================================================
// Design System Types
// ============================================================================

/**
 * Design Tokens
 */
export interface DesignTokens {
  colors: ColorPalette;
  typography: TypographyScale;
  spacing: SpacingScale;
  shadows: ShadowDefinitions;
  radii: BorderRadiusScale;
}

/**
 * Color Palette
 */
export interface ColorPalette {
  primary: ColorRamp;
  secondary: ColorRamp;
  neutral: ColorRamp;
  semantic: SemanticColors;
}

/**
 * Color Ramp (50-900)
 */
export interface ColorRamp {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

/**
 * Semantic Colors
 */
export interface SemanticColors {
  success: string;
  warning: string;
  error: string;
  info: string;
}

/**
 * Typography Scale
 */
export interface TypographyScale {
  fontFamily: string;
  fontFamilyMono: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

/**
 * Spacing Scale
 */
export interface SpacingScale {
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  8: string;
  10: string;
  12: string;
  16: string;
  20: string;
  24: string;
  32: string;
}

/**
 * Shadow Definitions
 */
export interface ShadowDefinitions {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

/**
 * Border Radius Scale
 */
export interface BorderRadiusScale {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  full: string;
}

/**
 * Semantic Mapping
 */
export interface SemanticMapping {
  prdTerm: string;
  tokenPath: string;
  confidence: number;
}

/**
 * Consistency Report
 */
export interface ConsistencyReport {
  consistent: boolean;
  issues: ConsistencyIssue[];
  score: number;
}

/**
 * Consistency Issue
 */
export interface ConsistencyIssue {
  type: 'color' | 'typography' | 'spacing' | 'shadow';
  severity: 'error' | 'warning';
  description: string;
  suggestion: string;
}

/**
 * Theme Definition
 */
export interface ThemeDefinition {
  name: string;
  variant: 'light' | 'dark';
  tokens: DesignTokens;
}

// ============================================================================
// Interaction Flow Types
// ============================================================================

/**
 * Interaction Flow
 */
export interface InteractionFlow {
  id: string;
  trigger: TriggerDefinition;
  actions: ActionSequence;
  states: StateTransition[];
  animations: AnimationDefinition[];
  errorHandling: ErrorHandler[];
}

/**
 * Trigger Definition
 */
export interface TriggerDefinition {
  type: 'click' | 'hover' | 'focus' | 'submit' | 'load' | 'scroll' | 'input';
  target: string;
  condition?: string;
}

/**
 * Action Sequence
 */
export interface ActionSequence {
  actions: Action[];
  parallel?: boolean;
}

/**
 * Action
 */
export interface Action {
  type: 'navigate' | 'dispatch' | 'mutate' | 'validate' | 'animate' | 'fetch';
  target?: string;
  payload?: any;
  duration?: number;
}

/**
 * State Transition
 */
export interface StateTransition {
  from: string;
  to: string;
  guard?: string;
  effect?: string;
}

/**
 * Animation Definition
 */
export interface AnimationDefinition {
  id: string;
  type: 'fade' | 'slide' | 'scale' | 'rotate' | 'custom';
  duration: number;
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: number;
  iterations?: number;
}

/**
 * Error Handler
 */
export interface ErrorHandler {
  errorType: string;
  action: 'retry' | 'fallback' | 'notify' | 'abort';
  message?: string;
  maxRetries?: number;
}

// ============================================================================
// Prototype Types
// ============================================================================

/**
 * Prototype Definition
 */
export interface PrototypeDefinition {
  id: string;
  pages: PageDefinition[];
  flows: InteractionFlow[];
  designTokens: DesignTokens;
  previewUrl: string;
  shareUrl: string;
}

/**
 * Page Definition
 */
export interface PageDefinition {
  id: string;
  name: string;
  path: string;
  layout: LayoutDefinition;
  components: ComponentDefinition[];
  flows: string[];
}

/**
 * Component Definition
 */
export interface ComponentDefinition {
  id: string;
  name: string;
  type: string;
  props: Record<string, any>;
  children?: string[];
  styles?: Record<string, string>;
}

/**
 * Generation Config
 */
export interface GenerationConfig {
  framework: 'react' | 'vue' | 'angular';
  uiLibrary: 'antd' | 'mui' | 'chakra' | 'raw';
  styling: 'css-modules' | 'tailwind' | 'styled-components';
  responsive: boolean;
  accessible: boolean;
  theme: 'light' | 'dark' | 'auto';
}

/**
 * Export Result (Figma)
 */
export interface ExportResult {
  success: boolean;
  figmaFileId?: string;
  figmaUrl?: string;
  components: string[];
  errors?: string[];
}

/**
 * Code Export Options
 */
export interface ExportOptions {
  outputDir: string;
  format: 'esm' | 'cjs';
  typescript: boolean;
  includeTests: boolean;
  includeStories: boolean;
}

/**
 * Code Export Result
 */
export interface CodeExport {
  success: boolean;
  files: ExportedFile[];
  summary: ExportSummary;
}

/**
 * Exported File
 */
export interface ExportedFile {
  path: string;
  content: string;
  type: 'component' | 'style' | 'test' | 'story' | 'type';
}

/**
 * Export Summary
 */
export interface ExportSummary {
  totalFiles: number;
  totalLines: number;
  components: number;
  tests: number;
  stories: number;
}

/**
 * Feedback
 */
export interface Feedback {
  id: string;
  userId: string;
  pageId: string;
  rating: number;
  comment?: string;
  timestamp: Date;
}

// ============================================================================
// PRD Type (Reference)
// ============================================================================

/**
 * PRD Reference (simplified)
 */
export interface PRD {
  id: string;
  title: string;
  description: string;
  features: Feature[];
  userFlows: UserFlow[];
  uiRequirements: UIRequirement[];
  constraints: PRDConstraint[];
}

/**
 * Feature
 */
export interface Feature {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * PRD Constraint
 */
export interface PRDConstraint {
  type: string;
  description: string;
}
