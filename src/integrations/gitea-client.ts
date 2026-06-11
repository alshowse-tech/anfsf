/**
 * ANFSF Integration — Gitea API Client
 *
 * HTTP client for Gitea REST API v1.
 * Handles repository creation, code push, branch management, and webhook setup.
 *
 * Task: T-201
 */

// ============================================================================
// Types
// ============================================================================

export interface GiteaConfig {
  baseUrl: string;       // e.g., http://localhost:3001
  username: string;
  password: string;      // or personal access token
  org?: string;          // default organization for repos
}

export interface GiteaRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
}

export interface GiteaCommit {
  sha: string;
  message: string;
  author: { name: string; email: string; };
  timestamp: string;
}

export interface GiteaPushEvent {
  ref: string;              // refs/heads/main
  before: string;           // previous commit SHA
  after: string;            // new commit SHA
  commits: GiteaCommit[];
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: { username: string; };
  };
  pusher: { username: string; };
}

export interface GiteaDiff {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
}

// ============================================================================
// Client
// ============================================================================

export class GiteaClient {
  private baseUrl: string;
  private auth: string;

  constructor(private config: GiteaConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.auth = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const headers: Record<string, string> = {
      'Authorization': this.auth,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Gitea API ${method} ${path} failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // ==========================================================================
  // Repository Operations
  // ==========================================================================

  /** Create a new repository */
  async createRepo(name: string, description?: string, isPrivate = false): Promise<GiteaRepo> {
    const orgPath = this.config.org ? `/orgs/${this.config.org}` : '';
    return this.request<GiteaRepo>('POST', `${orgPath}/repos`, {
      name,
      description: description || `ANFSF generated: ${name}`,
      private: isPrivate,
      auto_init: true,
      default_branch: 'main',
    });
  }

  /** Create a branch */
  async createBranch(repo: string, branchName: string, baseBranch = 'main'): Promise<void> {
    const owner = this.config.org || this.config.username;
    // Get the base branch SHA
    const base = await this.request<{ commit: { sha: string } }>(
      'GET', `/repos/${owner}/${repo}/branches/${baseBranch}`,
    );
    await this.request('POST', `/repos/${owner}/${repo}/branches`, {
      new_branch_name: branchName,
      old_branch_name: baseBranch,
    });
  }

  /** Push a file to a repository */
  async pushFile(repo: string, path: string, content: string, branch = 'main', message?: string): Promise<void> {
    const owner = this.config.org || this.config.username;
    await this.request('POST', `/repos/${owner}/${repo}/contents/${path}`, {
      content: Buffer.from(content).toString('base64'),
      message: message || `[ANFSF] Add ${path}`,
      branch,
    });
  }

  /** Create a tag */
  async createTag(repo: string, tagName: string, sha: string): Promise<void> {
    const owner = this.config.org || this.config.username;
    await this.request('POST', `/repos/${owner}/${repo}/tags`, {
      tag_name: tagName,
      target: sha,
    });
  }

  // ==========================================================================
  // Commit Operations
  // ==========================================================================

  /** Get commits since a specific SHA or date */
  async getCommits(repo: string, branch = 'main', since?: string): Promise<GiteaCommit[]> {
    const owner = this.config.org || this.config.username;
    const params = new URLSearchParams({ sha: branch });
    if (since) params.set('since', since);
    return this.request<GiteaCommit[]>(
      'GET', `/repos/${owner}/${repo}/commits?${params.toString()}`,
    );
  }

  /** Get diff for a specific commit */
  async getDiff(repo: string, sha: string): Promise<GiteaDiff[]> {
    const owner = this.config.org || this.config.username;
    // Gitea returns diff as raw text or as structured data depending on endpoint
    const commit = await this.request<{ files?: GiteaDiff[] }>(
      'GET', `/repos/${owner}/${repo}/commits/${sha}`,
    );
    return commit.files || [];
  }

  // ==========================================================================
  // Webhook
  // ==========================================================================

  /** Parse and validate a Gitea webhook payload */
  static parseWebhookPayload(body: string, signature?: string): GiteaPushEvent {
    const payload = JSON.parse(body) as GiteaPushEvent;

    if (!payload.ref || !payload.commits) {
      throw new Error('Invalid webhook payload: missing ref or commits');
    }

    return payload;
  }

  /** Verify webhook delivery ID hasn't been processed (idempotency) */
  static isDuplicate(deliveryId: string, processedIds: Set<string>): boolean {
    return processedIds.has(deliveryId);
  }
}
