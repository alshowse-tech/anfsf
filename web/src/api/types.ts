// API types for ANFSF dashboard

export interface WebhookRegistration {
  id: string; url: string;
  events: string[]; createdAt: number;
}

export interface PipelineRun {
  id: string;
  status: string;
  startedAt: number;
  completedAt: number | null;
  stepCount: number;
}

export interface PipelineStep {
  name: string;
  duration: number;
  status: 'ok' | 'error' | 'skipped';
}

export interface HealthCheck {
  status: string;
  uptime: number;
  version: string;
  timestamp: number;
}

// Phase 1: Orchestrate / Multi-Agent
export interface OrchestrateStatus {
  activeAgents: number;
  queuedMessages: number;
  busStats: { messagesProcessed: number; avgLatencyMs: number };
  registeredAgents: number;
  dagStatus: { tasks: number; completed: number; waves: string[][] };
}

// Phase 1: Skills & Tools
export interface SkillInfo {
  name: string; version: string;
  status: 'loaded' | 'error' | 'disabled';
  description?: string;
}
export interface ToolInfo {
  name: string; description: string;
  mode: 'readonly' | 'readwrite'; requiresSandbox: boolean;
}
export interface ToolCallHistoryEntry {
  toolName: string; args: string; result: string;
  durationMs: number; timestamp: number;
}

// Phase 1: Webhook / DevFixLoop
export interface WebhookDelivery {
  deliveryId: string; commitSha: string; branch: string;
  repository: string; success: boolean;
  errors: number; warnings: number; autoFixed: number;
  message: string; timestamp: number;
}

// Phase 1: Verification
export interface VerificationError {
  file: string; line: number; column: number;
  severity: 'error' | 'warning'; message: string;
  rule: string; fixable: boolean;
}
export interface VerificationGuardResult {
  tool: string; passed: boolean;
  errors: VerificationError[]; warnings: VerificationError[];
  durationMs: number;
}
export interface StepDetail {
  name: string; duration: number;
  status: 'ok' | 'error' | 'running' | 'pending' | 'skipped'; timestamp?: number;
}

// Phase 1: Projects
export interface ProjectInfo {
  id: string; name: string; tenantId: string;
  projectState: string; createdAt: number;
}
export interface ProjectDetail extends ProjectInfo {
  description?: string; prdText: string; updatedAt: number;
}

// Phase 1: Metrics / Analysis
export interface StageSummary {
  stage: string; avgDurationMs: number; p95DurationMs: number;
  failureRate: number; totalRuns: number;
  avgPromptTokens: number; avgCompletionTokens: number;
  avgErrors: number; avgFixL1: number; avgFixL2: number; avgFixL3: number;
}
export interface BottleneckInfo {
  stage: string; avgDurationMs: number; p95DurationMs: number;
  failureRate: number; totalRuns: number;
}
export interface FixRecordInfo {
  id: string; projectId: string;
  level: 'L1' | 'L2' | 'L3'; file: string; line: number;
  problemType: string; issueDescription: string; fixStatus: string;
}
export interface CompilePatternInfo {
  pattern: string; frequency: number;
  firstSeen: number; lastSeen: number;
  avgFixRound: number; commonFixHint?: string;
  projectTypes: string[];
}
export interface ComponentPatternInfo {
  name: string; propsSignature: string;
  occurrenceCount: number; projectType: string;
  firstSeen: number; lastSeen: number;
}

// Phase 1: Config
export interface LLMConfigData {
  apiKey: string; baseUrl: string; defaultModel: string;
}
export interface PipelineConfigData {
  maxRetries: number; llmTimeout: number; bottleneckThreshold: number;
}
export interface RolePermissionMap {
  role: string; permissions: string[];
}

