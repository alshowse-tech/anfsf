/**
 * Tests for CI/CD Integration
 */

import { GitHubCIClient, GitLabCIClient, UnifiedCIClient, createGitHubCI, createGitLabCI, createUnifiedCI } from '../github-ci';

describe('GitHubCIClient', () => {
  it('should create instance', () => {
    const client = new GitHubCIClient({
      token: 'test-token',
      repo: 'owner/repo',
    });
    expect(client).toBeDefined();
  });

  it('should create via factory', () => {
    const client = createGitHubCI({
      token: 'test',
      repo: 'test/repo',
    });
    expect(client).toBeDefined();
  });

  it('should use custom branch', () => {
    const client = new GitHubCIClient({
      token: 'test',
      repo: 'test/repo',
      branch: 'develop',
    });
    expect(client).toBeDefined();
  });

  it('should fail gracefully without valid token', async () => {
    const client = new GitHubCIClient({
      token: 'invalid',
      repo: 'owner/repo',
      timeoutMs: 3000,
    });

    const result = await client.triggerWorkflow('.github/workflows/ci.yml');
    expect(result.provider).toBe('github');
    expect(result.status).toBe('failure');
    expect(result.error).toBeDefined();
  });
});

describe('GitLabCIClient', () => {
  it('should create instance', () => {
    const client = new GitLabCIClient({
      token: 'test-token',
      projectId: 12345,
    });
    expect(client).toBeDefined();
  });

  it('should create via factory', () => {
    const client = createGitLabCI({
      token: 'test',
      projectId: 123,
    });
    expect(client).toBeDefined();
  });

  it('should fail gracefully without valid token', async () => {
    const client = new GitLabCIClient({
      token: 'invalid',
      projectId: 12345,
      timeoutMs: 3000,
    });

    const result = await client.triggerPipeline('main');
    expect(result.provider).toBe('gitlab');
    expect(result.status).toBe('failure');
    expect(result.error).toBeDefined();
  });
});

describe('UnifiedCIClient', () => {
  it('should create with GitHub config', () => {
    const client = createUnifiedCI({
      provider: 'github',
      github: { token: 'test', repo: 'owner/repo' },
    });
    expect(client).toBeDefined();
  });

  it('should create with GitLab config', () => {
    const client = createUnifiedCI({
      provider: 'gitlab',
      gitlab: { token: 'test', projectId: 12345 },
    });
    expect(client).toBeDefined();
  });

  it('should fail gracefully when provider not configured', async () => {
    const client = createUnifiedCI({
      provider: 'github',
    });

    const result = await client.trigger({});
    expect(result.status).toBe('failure');
    expect(result.error).toContain('not configured');
  });

  it('should return null status when not configured', async () => {
    const client = createUnifiedCI({
      provider: 'github',
    });

    const result = await client.getStatus('123');
    expect(result).toBeNull();
  });
});
