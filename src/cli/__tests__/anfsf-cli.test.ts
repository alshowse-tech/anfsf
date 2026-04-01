/**
 * ANFSF CLI Tests
 */

import {
  synthesizeCommand,
  previewCommand,
  verifyCommand,
  roleRebalanceCommand,
  uiGenCommand,
  skillLoadCommand,
  harnessTestCommand,
  mcpInspectCommand,
} from '../anfsf-cli';

describe('ANFSF CLI Commands', () => {
  describe('synthesizeCommand', () => {
    it('should synthesize architecture', async () => {
      const result = await synthesizeCommand({
        dryRun: false,
        output: 'json',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.projectId).toBeDefined();
    });

    it('should respect dry-run mode', async () => {
      const result = await synthesizeCommand({
        dryRun: true,
        kAuto: true,
      });

      expect(result.success).toBe(true);
      expect(result.changeEvent).toBeDefined();
    });

    it('should support k-auto optimization', async () => {
      const result = await synthesizeCommand({
        kAuto: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.roles).toBe('auto-optimized');
    });
  });

  describe('previewCommand', () => {
    it('should preview changes', async () => {
      const result = await previewCommand({
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.changes).toBeDefined();
      expect(result.data.impact).toBeDefined();
    });

    it('should include veto check', async () => {
      const result = await previewCommand({});

      expect(result.data.vetoCheck).toBeDefined();
      expect(result.data.vetoCheck.passed).toBe(true);
    });
  });

  describe('verifyCommand', () => {
    it('should verify architecture', async () => {
      const result = await verifyCommand({
        projectId: 'test-project',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.projectId).toBe('test-project');
      expect(result.data.consistency).toBeDefined();
    });

    it('should return consistency score', async () => {
      const result = await verifyCommand({});

      expect(result.data.score).toBeGreaterThan(0);
      expect(result.data.score).toBeLessThanOrEqual(1);
    });
  });

  describe('roleRebalanceCommand', () => {
    it('should rebalance roles', async () => {
      const result = await roleRebalanceCommand({
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.before).toBeDefined();
      expect(result.data.after).toBeDefined();
    });

    it('should show improvements', async () => {
      const result = await roleRebalanceCommand({
        kAuto: true,
      });

      expect(result.data.improvements).toBeDefined();
      expect(result.data.improvements.interfaceCostReduction).toBeDefined();
    });
  });

  describe('uiGenCommand', () => {
    it('should generate UI prototype', async () => {
      const result = await uiGenCommand({
        framework: 'react',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.framework).toBe('react');
      expect(result.data.components).toBeDefined();
    });

    it('should include design tokens', async () => {
      const result = await uiGenCommand({});

      expect(result.data.designTokens).toBeDefined();
      expect(result.data.designTokens.colors).toBeGreaterThan(0);
    });
  });

  describe('skillLoadCommand', () => {
    it('should load skill', async () => {
      const result = await skillLoadCommand({
        skillName: 'test-skill',
        version: '1.0.0',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.skillName).toBe('test-skill');
    });

    it('should respect dry-run mode', async () => {
      const result = await skillLoadCommand({
        skillName: 'test-skill',
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('would-load');
    });
  });

  describe('harnessTestCommand', () => {
    it('should run test', async () => {
      const result = await harnessTestCommand({
        testName: 'integration-test',
      });

      expect(result.success).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should respect dry-run mode', async () => {
      const result = await harnessTestCommand({
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('would-run');
    });
  });

  describe('mcpInspectCommand', () => {
    it('should inspect MCP messages', async () => {
      const result = await mcpInspectCommand({
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.stats).toBeDefined();
      expect(result.data.recentLogs).toBeDefined();
    });

    it('should return bus statistics', async () => {
      const result = await mcpInspectCommand({});

      expect(result.data.stats.totalMessagesSent).toBeDefined();
      expect(result.data.stats.activeSubscriptions).toBeDefined();
    });
  });

  describe('Output Formatting', () => {
    it('should support JSON output', async () => {
      const result = await previewCommand({
        output: 'json',
      });

      expect(result.success).toBe(true);
      // JSON output would be formatted by the CLI runner
    });

    it('should support table output', async () => {
      const result = await previewCommand({
        output: 'table',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Verbose Mode', () => {
    it('should include change events in verbose mode', async () => {
      const result = await roleRebalanceCommand({
        verbose: true,
      });

      expect(result.success).toBe(true);
      expect(result.changeEvent).toBeDefined();
    });
  });
});
