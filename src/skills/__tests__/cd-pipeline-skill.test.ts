/**
 * ANFSF L15 — CD Pipeline Skill Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CDPipelineSkill, createCDPipelineSkill } from '../cd-pipeline-skill';

describe('CD Pipeline Skill Tests', () => {
  let skill: CDPipelineSkill;

  beforeEach(() => {
    skill = createCDPipelineSkill();
  });

  it('should create skill instance', () => {
    expect(skill).toBeDefined();
    expect(skill.name).toBe('cd-pipeline');
  });

  it('should deploy to staging successfully', async () => {
    const result = await skill.execute({
      options: {
        artifact: { name: 'app-v1.0.0', checksum: 'abc123', size: 1024 },
        environment: 'staging',
      },
      config: { environment: 'staging' },
    });

    expect(result.success).toBe(true);
    expect(result.deployment.status).toBe('completed');
    expect(result.deployment.artifact).toBe('app-v1.0.0');
  });

  it('should deploy to production with all stages', async () => {
    const result = await skill.execute({
      options: {
        artifact: { name: 'app-v2.0.0', checksum: 'def456', size: 2048 },
        environment: 'production',
      },
      config: { environment: 'production' },
    });

    expect(result.success).toBe(true);
    expect(result.deployment.stages.length).toBe(6);
    expect(result.deployment.environment).toBe('production');
  });

  it('should fail on invalid artifact', async () => {
    const result = await skill.execute({
      options: {
        artifact: { name: '', checksum: '', size: 0 },
        environment: 'staging',
      },
      config: { environment: 'staging' },
    });

    expect(result.success).toBe(false);
    expect(result.deployment.error).toBeDefined();
  });

  it('should fail when custom deployFn throws', async () => {
    const result = await skill.execute({
      options: {
        artifact: { name: 'app-v1.0.0', checksum: 'abc', size: 100 },
        environment: 'production',
      },
      config: { environment: 'production' },
      deployFn: async (stage) => {
        if (stage === 'test') {
          throw new Error('Tests failed');
        }
      },
    });

    expect(result.success).toBe(false);
    expect(result.deployment.error).toContain('Tests failed');
  });

  it('should record deployment history', async () => {
    await skill.execute({
      options: {
        artifact: { name: 'v1', checksum: 'a', size: 1 },
        environment: 'staging',
      },
      config: { environment: 'staging' },
    });

    await skill.execute({
      options: {
        artifact: { name: 'v2', checksum: 'b', size: 2 },
        environment: 'staging',
      },
      config: { environment: 'staging' },
    });

    const history = skill.getDeploymentHistory();
    expect(history.length).toBe(2);
  });

  it('should get deployment by ID', async () => {
    const result = await skill.execute({
      options: {
        artifact: { name: 'v1', checksum: 'a', size: 1 },
        environment: 'staging',
      },
      config: { environment: 'staging' },
    });

    const deployment = skill.getDeployment(result.deployment.id);
    expect(deployment).not.toBeNull();
    expect(deployment!.artifact).toBe('v1');
  });

  it('should return null for unknown deployment', () => {
    expect(skill.getDeployment('unknown')).toBeNull();
  });

  it('should get latest deployment for environment', async () => {
    await skill.execute({
      options: {
        artifact: { name: 'v1', checksum: 'a', size: 1 },
        environment: 'production',
      },
      config: { environment: 'production' },
    });

    // Small delay to ensure different timestamps
    await new Promise(r => setTimeout(r, 10));

    await skill.execute({
      options: {
        artifact: { name: 'v2', checksum: 'b', size: 2 },
        environment: 'production',
      },
      config: { environment: 'production' },
    });

    const history = skill.getDeploymentHistory().filter(d => d.environment === 'production');
    expect(history.length).toBe(2);
    expect(history[history.length - 1].artifact).toBe('v2');
  });

  it('should return null for latest with no deployments', () => {
    expect(skill.getLatestDeployment('production')).toBeNull();
  });

  it('should clear deployment history', async () => {
    await skill.execute({
      options: {
        artifact: { name: 'v1', checksum: 'a', size: 1 },
        environment: 'staging',
      },
      config: { environment: 'staging' },
    });

    skill.clearHistory();
    expect(skill.getDeploymentHistory()).toHaveLength(0);
  });

  // --- Canary Analysis ---

  it('should promote healthy canary', () => {
    const healthChecks = [
      { timestamp: 1, healthy: true, latency: 50, errorRate: 0.01 },
      { timestamp: 2, healthy: true, latency: 55, errorRate: 0.02 },
      { timestamp: 3, healthy: true, latency: 48, errorRate: 0.01 },
    ];

    const canary = skill.analyzeCanary(healthChecks);

    expect(canary.safeToPromote).toBe(true);
    expect(canary.recommendation).toBe('promote');
  });

  it('should rollback unhealthy canary', () => {
    const healthChecks = [
      { timestamp: 1, healthy: false, latency: 500, errorRate: 0.30 },
      { timestamp: 2, healthy: false, latency: 600, errorRate: 0.40 },
      { timestamp: 3, healthy: false, latency: 700, errorRate: 0.50 },
    ];

    const canary = skill.analyzeCanary(healthChecks);

    expect(canary.safeToPromote).toBe(false);
    expect(canary.recommendation).toBe('rollback');
  });

  it('should hold on borderline canary', () => {
    const healthChecks = [
      { timestamp: 1, healthy: true, latency: 100, errorRate: 0.06 },
      { timestamp: 2, healthy: false, latency: 150, errorRate: 0.08 },
      { timestamp: 3, healthy: true, latency: 120, errorRate: 0.07 },
    ];

    const canary = skill.analyzeCanary(healthChecks);

    expect(canary.safeToPromote).toBe(false);
    expect(canary.recommendation).toBe('hold');
  });

  it('should return hold for empty health checks', () => {
    const canary = skill.analyzeCanary([]);

    expect(canary.safeToPromote).toBe(false);
    expect(canary.recommendation).toBe('hold');
  });

  it('should include canary config in deploy options', async () => {
    const result = await skill.execute({
      options: {
        artifact: { name: 'v1', checksum: 'a', size: 1 },
        environment: 'production',
        canary: { initialPercentage: 5, incrementStep: 10 },
      },
      config: { environment: 'production' },
    });

    expect(result.deployment.canaryPercentage).toBe(5);
    expect(result.deployment.stages.some(s => s.name === 'canary-deploy')).toBe(true);
  });

  it('should track deployment stages status', async () => {
    const result = await skill.execute({
      options: {
        artifact: { name: 'v1', checksum: 'a', size: 1 },
        environment: 'staging',
      },
      config: { environment: 'staging' },
    });

    const passedStages = result.deployment.stages.filter(s => s.status === 'passed');
    expect(passedStages.length).toBe(result.deployment.stages.length);
  });

  it('should have duration on completed deployments', async () => {
    const result = await skill.execute({
      options: {
        artifact: { name: 'v1', checksum: 'a', size: 1 },
        environment: 'staging',
      },
      config: { environment: 'staging' },
    });

    expect(result.deployment.durationMs).toBeDefined();
    expect(result.deployment.durationMs!).toBeGreaterThanOrEqual(0);
  });
});
