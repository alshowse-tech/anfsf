/**
 * ANFSF API Client
 *
 * All /api/v1/* requests include Authorization header when a token is configured.
 * Public endpoints (health, ready, metrics) omit auth.
 * Returns typed ApiError on failures.
 */

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

// Token source priority: sessionStorage > env > none
// Using sessionStorage instead of localStorage — token is cleared on tab close (XSS mitigation)
function getApiToken(): string | undefined {
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
