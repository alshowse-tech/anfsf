/**
 * ANFSF V1.5.0 — CI/CD Integration
 *
 * GitHub Actions and GitLab CI API integration for triggering remote pipelines,
 * monitoring run status, and fetching logs.
 */

// ============================================================================
// GitHub Actions
// ============================================================================

export interface GitHubCIConfig {
  /** GitHub personal access token */
  token: string;
  /** Repository in format "owner/repo" */
  repo: string;
  /** Branch to trigger (default: main) */
  branch?: string;
  /** GitHub API base URL (default: https://api.github.com) */
  baseUrl?: string;
  /** Request timeout in ms */
  timeoutMs?: number;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'neutral' | 'timeout' | 'action_required' | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  head_branch: string;
  head_sha: string;
}

export interface GitHubWorkflowRunResponse {
  workflow_runs: GitHubWorkflowRun[];
  total_count: number;
}

export interface GitHubJob {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface CIPipelineResult {
  /** Unique run ID */
  runId: string;
  /** Provider: github or gitlab */
  provider: 'github' | 'gitlab';
  /** Current status */
  status: 'queued' | 'running' | 'success' | 'failure' | 'cancelled';
  /** URL to view the pipeline in browser */
  url: string;
  /** Duration in ms (only set when completed) */
  duration: number | null;
  /** Error message if failed */
  error: string | null;
}

export class GitHubCIClient {
  private token: string;
  private repo: string;
  private branch: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(config: GitHubCIConfig) {
    this.token = config.token;
    this.repo = config.repo;
    this.branch = config.branch || 'main';
    this.baseUrl = config.baseUrl || 'https://api.github.com';
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  /**
   * Trigger a GitHub Actions workflow by file name.
   * @param workflowFile Path to the workflow file (e.g., ".github/workflows/ci.yml")
   * @param inputs Optional workflow inputs
   */
  async triggerWorkflow(
    workflowFile: string,
    inputs: Record<string, string> = {}
  ): Promise<CIPipelineResult> {
    const url = `${this.baseUrl}/repos/${this.repo}/actions/workflows/${encodeURIComponent(workflowFile)}/dispatches`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: this.branch,
          inputs,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const body = await response.text();
        return {
          runId: '',
          provider: 'github',
          status: 'failure',
          url: `https://github.com/${this.repo}/actions`,
          duration: null,
          error: `Failed to trigger workflow: ${response.status} ${body}`,
        };
      }

      // GitHub returns 204 No Content for successful dispatch
      // Fetch the most recent run to get the run ID
      const run = await this.getLatestRun(workflowFile);

      return {
        runId: String(run?.id ?? Date.now()),
        provider: 'github',
        status: 'queued',
        url: run?.html_url || `https://github.com/${this.repo}/actions`,
        duration: null,
        error: null,
      };
    } catch (error) {
      return {
        runId: '',
        provider: 'github',
        status: 'failure',
        url: `https://github.com/${this.repo}/actions`,
        duration: null,
        error: `Failed to trigger workflow: ${String(error)}`,
      };
    }
  }

  /**
   * Get the status of a workflow run.
   */
  async getRunStatus(runId: string): Promise<CIPipelineResult | null> {
    const url = `${this.baseUrl}/repos/${this.repo}/actions/runs/${runId}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) return null;

      const run = await response.json() as GitHubWorkflowRun;

      let status: CIPipelineResult['status'];
      switch (run.status) {
        case 'queued':
        case 'waiting':
        case 'requested':
          status = 'queued';
          break;
        case 'in_progress':
          status = 'running';
          break;
        case 'completed':
          status = run.conclusion === 'success' ? 'success' : 'failure';
          break;
        default:
          status = 'running';
      }

      const duration = run.created_at && run.updated_at
        ? new Date(run.updated_at).getTime() - new Date(run.created_at).getTime()
        : null;

      return {
        runId,
        provider: 'github',
        status,
        url: run.html_url,
        duration,
        error: run.conclusion === 'failure' ? `Workflow failed: ${run.conclusion}` : null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Poll for workflow run completion.
   * @param runId The run ID to poll
   * @param intervalMs Poll interval (default: 5000ms)
   * @param maxWaitMs Maximum wait time (default: 10 minutes)
   */
  async waitForCompletion(
    runId: string,
    intervalMs: number = 5000,
    maxWaitMs: number = 10 * 60 * 1000
  ): Promise<CIPipelineResult | null> {
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      const result = await this.getRunStatus(runId);
      if (result && (result.status === 'success' || result.status === 'failure' || result.status === 'cancelled')) {
        return result;
      }
      await this.sleep(intervalMs);
    }

    // Timeout
    return {
      runId,
      provider: 'github',
      status: 'cancelled',
      url: `https://github.com/${this.repo}/actions/runs/${runId}`,
      duration: maxWaitMs,
      error: 'Pipeline wait timed out',
    };
  }

  /**
   * List recent workflow runs for a workflow.
   */
  async listRuns(workflowFile: string, limit: number = 10): Promise<GitHubWorkflowRun[]> {
    const url = `${this.baseUrl}/repos/${this.repo}/actions/workflows/${encodeURIComponent(workflowFile)}/runs?per_page=${limit}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) return [];

      const data = await response.json() as GitHubWorkflowRunResponse;
      return data.workflow_runs;
    } catch {
      return [];
    }
  }

  /**
   * Get jobs for a workflow run.
   */
  async getJobs(runId: string): Promise<GitHubJob[]> {
    const url = `${this.baseUrl}/repos/${this.repo}/actions/runs/${runId}/jobs`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) return [];

      const data = await response.json() as { jobs: GitHubJob[] };
      return data.jobs;
    } catch {
      return [];
    }
  }

  private async getLatestRun(workflowFile: string): Promise<GitHubWorkflowRun | null> {
    const runs = await this.listRuns(workflowFile, 1);
    return runs[0] || null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// GitLab CI
// ============================================================================

export interface GitLabCIConfig {
  /** GitLab personal access token */
  token: string;
  /** Project ID (numeric) */
  projectId: number;
  /** GitLab API base URL (default: https://gitlab.com/api/v4) */
  baseUrl?: string;
  /** Request timeout in ms */
  timeoutMs?: number;
}

export interface GitLabPipeline {
  id: number;
  iid: number;
  status: 'created' | 'waiting_for_resource' | 'preparing' | 'pending' | 'running' | 'success' | 'failed' | 'canceled' | 'skipped' | 'manual' | 'scheduled';
  source: string;
  ref: string;
  sha: string;
  web_url: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
}

export class GitLabCIClient {
  private token: string;
  private projectId: number;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(config: GitLabCIConfig) {
    this.token = config.token;
    this.projectId = config.projectId;
    this.baseUrl = config.baseUrl || 'https://gitlab.com/api/v4';
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  /**
   * Trigger a GitLab CI pipeline.
   * @param branch Branch to run the pipeline on
   * @param variables Optional CI variables
   */
  async triggerPipeline(
    branch: string,
    variables: Record<string, string> = {}
  ): Promise<CIPipelineResult> {
    const url = `${this.baseUrl}/projects/${this.projectId}/pipeline`;
    const body: Record<string, unknown> = { ref: branch, variables };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PRIVATE-TOKEN': this.token,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          runId: '',
          provider: 'gitlab',
          status: 'failure',
          url: `https://gitlab.com/-/pipelines`,
          duration: null,
          error: `Failed to trigger pipeline: ${response.status} ${errorBody}`,
        };
      }

      const pipeline = await response.json() as GitLabPipeline;

      return {
        runId: String(pipeline.id),
        provider: 'gitlab',
        status: 'queued',
        url: pipeline.web_url,
        duration: null,
        error: null,
      };
    } catch (error) {
      return {
        runId: '',
        provider: 'gitlab',
        status: 'failure',
        url: `https://gitlab.com/-/pipelines`,
        duration: null,
        error: `Failed to trigger pipeline: ${String(error)}`,
      };
    }
  }

  /**
   * Get pipeline status.
   */
  async getPipelineStatus(pipelineId: string): Promise<CIPipelineResult | null> {
    const url = `${this.baseUrl}/projects/${this.projectId}/pipelines/${pipelineId}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        headers: {
          'PRIVATE-TOKEN': this.token,
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) return null;

      const pipeline = await response.json() as GitLabPipeline;

      let status: CIPipelineResult['status'];
      switch (pipeline.status) {
        case 'created':
        case 'waiting_for_resource':
        case 'preparing':
        case 'pending':
          status = 'queued';
          break;
        case 'running':
          status = 'running';
          break;
        case 'success':
          status = 'success';
          break;
        case 'failed':
        case 'canceled':
          status = 'failure';
          break;
        default:
          status = 'running';
      }

      return {
        runId: pipelineId,
        provider: 'gitlab',
        status,
        url: pipeline.web_url,
        duration: pipeline.duration ? pipeline.duration * 1000 : null,
        error: pipeline.status === 'failed' ? 'Pipeline failed' : null,
      };
    } catch {
      return null;
    }
  }
}

// ============================================================================
// Unified CI Interface
// ============================================================================

export interface UnifiedCIConfig {
  provider: 'github' | 'gitlab';
  github?: GitHubCIConfig;
  gitlab?: GitLabCIConfig;
}

export class UnifiedCIClient {
  private provider: 'github' | 'gitlab';
  private githubClient?: GitHubCIClient;
  private gitlabClient?: GitLabCIClient;

  constructor(config: UnifiedCIConfig) {
    this.provider = config.provider;
    if (config.github) {
      this.githubClient = new GitHubCIClient(config.github);
    }
    if (config.gitlab) {
      this.gitlabClient = new GitLabCIClient(config.gitlab);
    }
  }

  /**
   * Trigger a CI pipeline.
   */
  async trigger(options: {
    workflowFile?: string;
    branch?: string;
    inputs?: Record<string, string>;
  }): Promise<CIPipelineResult> {
    if (this.provider === 'github' && this.githubClient) {
      return this.githubClient.triggerWorkflow(
        options.workflowFile || '.github/workflows/ci.yml',
        options.inputs || {}
      );
    }
    if (this.provider === 'gitlab' && this.gitlabClient) {
      return this.gitlabClient.triggerPipeline(options.branch || 'main', options.inputs || {});
    }
    return {
      runId: '',
      provider: this.provider,
      status: 'failure',
      url: '',
      duration: null,
      error: `CI client not configured for ${this.provider}`,
    };
  }

  /**
   * Get pipeline status.
   */
  async getStatus(runId: string): Promise<CIPipelineResult | null> {
    if (this.provider === 'github' && this.githubClient) {
      return this.githubClient.getRunStatus(runId);
    }
    if (this.provider === 'gitlab' && this.gitlabClient) {
      return this.gitlabClient.getPipelineStatus(runId);
    }
    return null;
  }
}

export function createGitHubCI(config: GitHubCIConfig): GitHubCIClient {
  return new GitHubCIClient(config);
}

export function createGitLabCI(config: GitLabCIConfig): GitLabCIClient {
  return new GitLabCIClient(config);
}

export function createUnifiedCI(config: UnifiedCIConfig): UnifiedCIClient {
  return new UnifiedCIClient(config);
}
