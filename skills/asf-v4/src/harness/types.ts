/**
 * ANFSF V2.0 - Harness Type Definitions
 * 
 * Type definitions for Planner, Progress Tracker, and E2E Test Harness.
 */

// ============================================================================
// Feature List Types
// ============================================================================

export type FeaturePriority = 'P0' | 'P1' | 'P2';
export type FeatureCategory = 'functional' | 'ui' | 'integration' | 'security' | 'performance';
export type FeatureStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';

export interface FeatureListItem {
  id: string;
  category: FeatureCategory;
  description: string;
  steps: string[];
  status: FeatureStatus;
  passes: boolean;
  priority: FeaturePriority;
  dependencies?: string[];  // Feature IDs this feature depends on
  estimatedTokens?: number;
  actualTokens?: number;
  completedAt?: number;
}

export interface FeatureList {
  projectId: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  features: FeatureListItem[];
  metadata: {
    originalPrompt: string;
    expandedSpec: ProductSpec;
    totalFeatures: number;
    completedFeatures: number;
  };
}

// ============================================================================
// Product Spec Types
// ============================================================================

export interface ProductSpec {
  title: string;
  description: string;
  targetUsers: string[];
  coreValue: string;
  successCriteria: string[];
  constraints: string[];
  aiFeatureOpportunities: string[];
}

export interface TechnicalDesign {
  frontend: {
    framework: string;
    keyComponents: string[];
  };
  backend: {
    framework: string;
    keyServices: string[];
  };
  database: {
    type: string;
    keyTables: string[];
  };
  architecture: string;
}

// ============================================================================
// Planner Agent Types
// ============================================================================

export interface PlannerConfig {
  maxInputSentences: number;
  targetFeatureCount: number;
  includeAIFeatures: boolean;
  enableModuleDecomposition: boolean;
}

export interface PlannerOutput {
  productSpec: ProductSpec;
  featureList: FeatureListItem[];
  technicalDesign: TechnicalDesign;
  aiFeatureOpportunities: string[];
  modularGraph?: {
    modules: Array<{ name: string; scope: string; features: string[] }>;
    crossModuleDeps: Array<{ from: string; to: string; type: string }>;
  };
}

// ============================================================================
// Progress Tracker Types
// ============================================================================

export interface SessionProgress {
  sessionId: string;
  startTime: number;
  endTime: number;
  featuresCompleted: string[];
  featuresAttempted: string[];
  gitCommit?: string;
  nextSteps: string[];
  issues: string[];
  metrics: {
    accuracy: number;
    reworkRate: number;
    tokenUsage: number;
    durationMinutes: number;
  };
}

export interface ProgressLog {
  projectId: string;
  sessions: SessionProgress[];
  currentFeature?: string;
  blockedFeatures: string[];
  lastUpdatedAt: number;
}

export interface ProgressTrackerConfig {
  featureListPath: string;
  progressLogPath: string;
  gitRepoPath?: string;
  enableGitIntegration: boolean;
}

// ============================================================================
// E2E Test Types
// ============================================================================

export type TestCriteriaName = 'productDepth' | 'functionality' | 'visualDesign' | 'codeQuality';

export interface TestCriteria {
  productDepth: { threshold: number; weight: number };
  functionality: { threshold: number; weight: number };
  visualDesign: { threshold: number; weight: number };
  codeQuality: { threshold: number; weight: number };
}

export interface ScoringConfig {
  dimensions: {
    productDepth: { threshold: number; weight: number };
    functionality: { threshold: number; weight: number };
    visualDesign: { threshold: number; weight: number };
    codeQuality: { threshold: number; weight: number };
    userJourney?: { threshold: number; weight: number };  // V2.1 新增
    uiConsistency?: { threshold: number; weight: number }; // V2.1 新增
    realData?: { threshold: number; weight: number };       // V2.1 新增
  };
}

export interface ScoringResult {
  productDepth: number;
  functionality: number;
  visualDesign: number;
  codeQuality: number;
  overallScore: number;
  issues: string[];
  recommendations: string[];
  passed: boolean;
  timestamp: number;
}

export interface E2ETestConfig {
  baseUrl: string;
  devServerUrl?: string;
  browser: 'chromium' | 'firefox' | 'webkit';
  viewport: {
    width: number;
    height: number;
  };
  screenshotDir?: string;
  timeout: number;
  headless?: boolean;
  screenshot: boolean;
  video: boolean;
  trace: boolean;
}

export interface TestStep {
  name: string;
  action: 'navigate' | 'fill' | 'click' | 'assert' | 'screenshot' | 'wait';
  selector: string;
  value?: string;
  expected: string;
  status?: 'pending' | 'passed' | 'failed';
  actual?: string;
  error?: string;
  timestamp?: number;
  screenshotPath?: string;
}

export interface E2ETestResult {
  name: string;
  featureId?: string;
  status: 'pending' | 'passed' | 'failed';
  passed: boolean;
  steps: TestStep[];
  startTime: number;
  endTime: number;
  duration: number;
  scores?: {
    productDepth: number;
    functionality: number;
    visualDesign: number;
    codeQuality: number;
  };
  overallScore?: number;
  issues?: string[];
  screenshots: string[];
  recommendations?: string[];
  error?: string;
}

// ============================================================================
// Feedback Loop Types
// ============================================================================

export interface FeedbackItem {
  id: string;
  type: 'e2e-test' | 'user-feedback' | 'code-review' | 'kpi-degradation';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  featureId?: string;
  suggestions: string[];
  createdAt: number;
  resolvedAt?: number;
}

export interface FeedbackLoopConfig {
  maxIterations: number;
  minImprovementThreshold: number;
  pivotThreshold: number;  // Score below this triggers pivot
}

export interface IterationResult {
  iteration: number;
  scores: number[];
  feedback: FeedbackItem[];
  action: 'refine' | 'pivot' | 'complete';
  rationale: string;
}

// ============================================================================
// Export Convenience Types
// ============================================================================

export type HarnessStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export interface HarnessMetrics {
  totalFeatures: number;
  completedFeatures: number;
  failedFeatures: number;
  reworkRate: number;
  avgIterationCount: number;
  totalTokenUsage: number;
  successRate: number;
}

// ============================================================================
// E2E Test Report Type
// ============================================================================

export interface E2ETestReport {
  generatedAt: number;
  config: E2ETestConfig;
  summary: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    passRate: number;
    avgDuration: number;
  };
  results: E2ETestResult[];
  screenshots: string[];
}

// ============================================================================
// V2.1 - Enhanced Scoring Types
// ============================================================================

export interface V21ScoringMetrics {
  productDepth: number;
  functionality: number;
  visualDesign: number;
  codeQuality: number;
  userJourney: number;      // V2.1 新增：完整用户旅程
  uiConsistency: number;    // V2.1 新增：UI 一致性
  realData: number;         // V2.1 新增：真实数据验证
}

export interface V21ScoringResult extends ScoringResult {
  userJourney: number;
  uiConsistency: number;
  realData: number;
  demoReady: boolean;       // 是否达到演示级标准
  selfCheckAccuracy: number; // 自检准确率
}

// ============================================================================
// Karpathy Principles - Layer A (Inline Guard) Types
// ============================================================================

export interface KarpathyInlineMetrics {
  simplicityScore: number;      // 实际行数/最小行数 (目标<3x)
  surgicalScore: number;        // 修改文件数/总文件数 (目标<30%)
  goalDrivenScore: number;      // E2E 测试覆盖率 (目标>80%)
}

export interface KarpathyInlineResult {
  passed: boolean;
  metrics: KarpathyInlineMetrics;
  issues: string[];
  recommendations: string[];
  timestamp: number;
}

// ============================================================================
// Karpathy Principles - Layer B (External Review) Types
// ============================================================================

export interface KarpathyExternalAudit {
  thinkBeforePassed: boolean;   // 是否有假设确认记录
  goalDrivenPassed: boolean;    // 用户旅程完整性
  overallScore: number;         // 4 原则加权分
  vetoTriggered: boolean;       // 是否阻断部署
}

export interface KarpathyAuditReport {
  projectId: string;
  auditId: string;
  inlineResult: KarpathyInlineResult;
  externalAudit: KarpathyExternalAudit;
  overallPassed: boolean;
  kpiData: {
    thinkBeforeScore: number;
    simplicityScore: number;
    surgicalScore: number;
    goalDrivenScore: number;
  };
  timestamp: number;
}

export interface KarpathyConfig {
  inlineThresholds: {
    simplicityMaxRatio: number;     // 默认 3.0
    surgicalMaxRatio: number;       // 默认 0.3
    goalDrivenMinCoverage: number;  // 默认 0.8
  };
  externalTriggers: {
    projectSizeMinLines: number;    // 默认 5000
    complexityMinFeatures: number;  // 默认 7
    productionOnly: boolean;        // 默认 true
  };
  vetoThresholds: {
    overallScoreMin: number;        // 默认 0.4
    thinkBeforeRequired: boolean;   // 默认 true
  };
}
