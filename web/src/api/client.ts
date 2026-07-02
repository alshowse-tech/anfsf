/**
 * ANFSF API Client
 *
 * All /api/v1/* requests include Authorization header when a token is configured.
 * Public endpoints (health, ready, metrics) omit auth.
 * Returns typed ApiError on failures.
 */

import type { OrchestrateStatus, SkillInfo, ToolInfo, ProjectInfo, ProjectDetail, StepDetail, StageSummary, BottleneckInfo, FixRecordInfo, CompilePatternInfo, ComponentPatternInfo, LLMConfigData, PipelineConfigData } from './types';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

// Token source priority: sessionStorage > env > none
// Using sessionStorage instead of localStorage — token is cleared on tab close (XSS mitigation)
export function getApiToken(): string | undefined {
  const jwt = sessionStorage.getItem("anfsf_jwt");
  if (jwt) return jwt;
  return sessionStorage.getItem('anfsf_api_token') || import.meta.env.VITE_ANFSF_API_TOKEN || undefined;
}

function authHeaders(includeToken = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeToken) {
    const token = getApiToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
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
  status: 'ok' | 'error' | 'skipped';
  duration: number;
  timestamp: number;
}

export interface SynthesizeRequest {
  prdText: string;
  projectName?: string;
}

export interface SynthesizeResponse {
  jobId: string;
  status: 'queued' | 'running';
}

export interface RunDetail {
  id: string;
  status: string;
  steps: PipelineStep[];
  error: string | null;
  startedAt: number;
  completedAt: number | null;
  projectName: string | null;
}

export interface ApiError {
  status: number;
  message: string;
  details?: string[];
}

export class ApiClientError extends Error {
  status: number;
  details?: string[];

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = error.status;
    this.details = error.details;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    body = { error: `HTTP ${res.status}` };
  }
  return {
    status: res.status,
    message: String(body.error || `HTTP ${res.status}`),
    details: Array.isArray(body.details) ? (body.details as string[]) : undefined,
  };
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;
    if (typeof window !== 'undefined') {
      (window as any).__lastRateLimit = { url, retryAfter: waitMs, timestamp: Date.now() };
    }
    throw new ApiClientError({
      status: 429,
      message: `Rate limited. Retry after ${retryAfter || 5}s`,
      details: [`Wait ${(waitMs / 1000).toFixed(0)}s before next request`],
    });
  }

  if (!res.ok) {
    throw new ApiClientError(await parseError(res));
  }
  return res;
}

export async function synthesize(req: SynthesizeRequest): Promise<SynthesizeResponse> {
  const res = await safeFetch(`${API_BASE}/api/v1/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(req),
  });
  return res.json();
}

export async function synthesizeWithAttachments(formData: FormData, projectName?: string): Promise<SynthesizeResponse> {
  if (projectName) {
    formData.append('projectName', projectName);
  }
  const res = await safeFetch(`${API_BASE}/api/v1/synthesize/multipart`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return res.json();
}

export interface FetchRunsOptions {
  limit?: number;
  offset?: number;
}

export async function fetchRuns(options?: FetchRunsOptions): Promise<{ runs: PipelineRun[]; total?: number }> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  const query = params.toString();
  const res = await safeFetch(`${API_BASE}/api/v1/pipeline${query ? '?' + query : ''}`, { headers: authHeaders() });
  const data = await res.json();
  // Support both array and paginated response
  if (Array.isArray(data)) return { runs: data };
  return { runs: data.runs || [], total: data.total };
}

export async function fetchRunDetail(id: string): Promise<RunDetail> {
  const res = await safeFetch(`${API_BASE}/api/v1/pipeline/${id}/status`, { headers: authHeaders() });
  return res.json();
}


// === Phase 1: Orchestrate ===
export async function fetchOrchestrateStatus(): Promise<OrchestrateStatus> {
  const res = await safeFetch(API_BASE + "/api/v1/orchestrate/status", { headers: authHeaders() });
  return res.json();
}
// === Phase 1: Skills & Tools ===
export async function fetchSkills(): Promise<SkillInfo[]> {
  const res = await safeFetch(API_BASE + "/api/v1/skills", { headers: authHeaders() });
  return (await res.json()).skills ?? [];
}
export async function fetchTools(): Promise<ToolInfo[]> {
  const res = await safeFetch(API_BASE + "/api/v1/tools", { headers: authHeaders() });
  return (await res.json()).tools ?? [];
}
// === Phase 1: Projects ===
export async function fetchProjects(): Promise<ProjectInfo[]> {
  const res = await safeFetch(API_BASE + "/api/v1/projects", { headers: authHeaders() });
  const data = await res.json(); return data.projects ?? [];
}
export async function fetchProjectDetail(id: string): Promise<ProjectDetail> {
  const res = await safeFetch(API_BASE + "/api/v1/projects/" + encodeURIComponent(id), { headers: authHeaders() });
  const data = await res.json(); return data.project;
}
export async function fetchStepDetails(runId: string): Promise<StepDetail[]> {
  const run = await fetchRunDetail(runId);
  return (run.steps || []).filter(s => s.name && s.name.startsWith('verify:'));
}
// === Phase 1: Metrics / Analysis ===
export async function fetchStageMetrics(): Promise<StageSummary[]> {
  const res = await safeFetch(API_BASE + "/api/v1/knowledge/metrics/stages", { headers: authHeaders() });
  return (await res.json()).stages ?? [];
}
export async function fetchBottlenecks(thresholdMs?: number): Promise<BottleneckInfo[]> {
  const params = thresholdMs ? '?thresholdMs=' + thresholdMs : '';
  const res = await safeFetch(API_BASE + "/api/v1/knowledge/metrics/bottlenecks" + params, { headers: authHeaders() });
  return (await res.json()).bottlenecks ?? [];
}
export async function fetchCompilePatterns(): Promise<CompilePatternInfo[]> {
  const res = await safeFetch(API_BASE + "/api/v1/knowledge/compile-patterns", { headers: authHeaders() });
  return (await res.json()).patterns ?? [];
}
export async function fetchComponentPatterns(): Promise<ComponentPatternInfo[]> {
  const res = await safeFetch(API_BASE + "/api/v1/knowledge/component-patterns", { headers: authHeaders() });
  return (await res.json()).components ?? [];
}
export async function fetchFixes(projectId?: string): Promise<FixRecordInfo[]> {
  const params = projectId ? '?projectId=' + encodeURIComponent(projectId) : '';
  const res = await safeFetch(API_BASE + "/api/v1/feedback/fixes" + params, { headers: authHeaders() });
  return (await res.json()).fixes ?? [];
}
// === Phase 1: Config ===
export async function fetchLLMConfig(): Promise<LLMConfigData> {
  const res = await safeFetch(API_BASE + "/api/v1/config/llm", { headers: authHeaders() });
  return res.json();
}
export async function updateLLMConfig(data: Partial<LLMConfigData>): Promise<void> {
  await safeFetch(API_BASE + "/api/v1/config/llm", {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
}
export async function fetchPipelineConfig(): Promise<PipelineConfigData> {
  const res = await safeFetch(API_BASE + "/api/v1/config/pipeline", { headers: authHeaders() });
  return res.json();
}
export async function updatePipelineConfig(data: Partial<PipelineConfigData>): Promise<void> {
  await safeFetch(API_BASE + "/api/v1/config/pipeline", {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
}


export async function fetchHealth() {
  const res = await safeFetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchMetrics(): Promise<string> {
  const res = await safeFetch(`${API_BASE}/metrics`, { headers: authHeaders() });
  return res.text();
}

export function setApiToken(token: string): void {
  sessionStorage.setItem('anfsf_api_token', token);
}

export function clearApiToken(): void {
  sessionStorage.removeItem('anfsf_api_token');
}

export function hasApiToken(): boolean {
  return !!getApiToken();
}

// === Webhook Management ===
export async function fetchWebhooks(): Promise<{ webhooks: import("./types").WebhookRegistration[]; total: number }> {
  const res = await safeFetch(API_BASE + "/api/v1/webhooks", { headers: authHeaders() });
  return res.json();
}
export async function createWebhook(url: string, events: string[]): Promise<{ status: string; webhook?: import("./types").WebhookRegistration }> {
  const res = await safeFetch(API_BASE + "/api/v1/webhooks", {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ url, events }),
  });
  return res.json();
}
export async function deleteWebhook(id: string): Promise<void> {
  await safeFetch(API_BASE + "/api/v1/webhooks/" + encodeURIComponent(id), {
    method: 'DELETE', headers: authHeaders(),
  });
}

// === Audit Log ===
export async function fetchAuditLog(limit = 50, offset = 0): Promise<{ entries: any[]; total: number }> {
  const res = await safeFetch(API_BASE + "/api/v1/audit-log?limit=" + limit + "&offset=" + offset, { headers: authHeaders() });
  return res.json();
}
export async function createAuditLogEntry(operation: string, details: string, user?: string): Promise<void> {
  await safeFetch(API_BASE + "/api/v1/audit-log", {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ operation, details, user: user || 'system' }),
  });
}

// === Auth ===
export async function login(username: string, password: string): Promise<{ status: string; token?: string; user?: { username: string; role: string }; error?: string }> {
  const res = await safeFetch(API_BASE + "/api/v1/auth/login", {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.token) sessionStorage.setItem('anfsf_jwt', data.token);
  return data;
}

export function logout(): void {
  sessionStorage.removeItem('anfsf_jwt');
}

export function isAuthenticated(): boolean {
  return !!getApiToken();
}
