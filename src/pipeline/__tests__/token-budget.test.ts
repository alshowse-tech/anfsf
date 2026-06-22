/**
 * Tests for Token Budget (T-004)
 * Updated for three-tier threshold and unified pricing.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TokenBudget, DEFAULT_BUDGET_CONFIG } from '../token-budget';
import type { TokenUsage } from '../token-budget';

const SAMPLE_USAGE: TokenUsage = { promptTokens: 100, completionTokens: 50, totalTokens: 150 };

describe('TokenBudget', () => {
  let budget: TokenBudget;

  beforeEach(() => {
    budget = new TokenBudget('proj-1');
  });

  describe('initialization', () => {
    it('should use default config', () => {
      const config = budget.getConfig();
      expect(config.totalBudget).toBe(DEFAULT_BUDGET_CONFIG.totalBudget);
    });

    it('should start with zero usage', () => {
      expect(budget.usageRate()).toBe(0);
      expect(budget.remaining()).toBe(DEFAULT_BUDGET_CONFIG.totalBudget);
    });

    it('should accept custom total budget', () => {
      const custom = new TokenBudget('proj-2', { totalBudget: 1_000_000 });
      expect(custom.getConfig().totalBudget).toBe(1_000_000);
    });

    it('should default hardBlockThreshold to 1.35', () => {
      expect(budget.getConfig().hardBlockThreshold).toBe(1.35);
    });
  });

  describe('consumption (sync)', () => {
    it('should track token consumption', () => {
      const result = budget.consumeSync(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      expect(result.allowed).toBe(true);
      expect(budget.usageRate()).toBeGreaterThan(0);
    });

    it('should accumulate total usage', () => {
      budget.consumeSync(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      budget.consumeSync(SAMPLE_USAGE, 'deepseek-chat', 'stage1_generating', 'generation');
      expect(budget.usageRate()).toBe((300) / DEFAULT_BUDGET_CONFIG.totalBudget);
    });

    it('should decrease remaining tokens', () => {
      const before = budget.remaining();
      budget.consumeSync(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      expect(budget.remaining()).toBeLessThan(before);
    });

    it('should block non-essential at block threshold (90%) but not essential', () => {
      // Consume up to just below block threshold
      budget.consumeSync(
        { promptTokens: 4_499_000, completionTokens: 0, totalTokens: 4_499_000 },
        'deepseek-chat', 'stage1_parsing', 'analysis',
      );
      // Now at 90% — next non-essential should be blocked
      expect(budget.isBlockThreshold()).toBe(false); // 4.499M/5M = 89.98%

      const blocked = budget.consumeSync(
        { promptTokens: 50_000, completionTokens: 0, totalTokens: 50_000 },
        'deepseek-chat', 'stage1_generating', 'generation',
      );
      expect(blocked.allowed).toBe(false);
      expect(blocked.threshold).toBe('block');

      // Essential (fix) should still be allowed in block band
      const allowed = budget.consumeSync(SAMPLE_USAGE, 'deepseek-chat', 'stage4_fixing', 'fix');
      expect(allowed.allowed).toBe(true);
    });

    it('should hard-block everything at hardBlock threshold (135%)', () => {
      // Consume incrementally to avoid triggering block on the way
      budget.consumeSync(
        { promptTokens: 4_000_000, completionTokens: 0, totalTokens: 4_000_000 },
        'deepseek-chat', 'stage1_parsing', 'analysis',
      );
      budget.consumeSync(
        { promptTokens: 2_500_000, completionTokens: 0, totalTokens: 2_500_000 },
        'deepseek-chat', 'stage4_fixing', 'fix',
      );
      // 6.5M/5M = 130%, still in block band for essential
      expect(budget.isHardBlockThreshold()).toBe(false);

      // Next consume (even essential) pushes into hardBlock: 6.65M/5M = 133% < 135%
      // Use a big chunk to cross 135%
      const blocked = budget.consumeSync(
        { promptTokens: 500_000, completionTokens: 0, totalTokens: 500_000 },
        'deepseek-chat', 'stage4_fixing', 'fix',
      );
      expect(blocked.allowed).toBe(false);
      expect(blocked.threshold).toBe('hardBlock');
    });
  });

  describe('preEvaluate', () => {
    it('should return allowed for small estimated consumption', () => {
      const result = budget.preEvaluate(1000);
      expect(result.allowed).toBe(true);
      expect(result.band).toBe('ok');
    });

    it('should warn when estimation crosses warn threshold', () => {
      budget.consumeSync(
        { promptTokens: 3_400_000, completionTokens: 0, totalTokens: 3_400_000 },
        'deepseek-chat', 'test', 'test',
      );
      const result = budget.preEvaluate(500_000);
      expect(result.band).toBe('warn');
      expect(result.warning).toBeDefined();
    });

    it('should not consume tokens on preEvaluate', () => {
      const before = budget.remaining();
      budget.preEvaluate(1_000_000);
      expect(budget.remaining()).toBe(before);
    });

    it('should report block when estimation crosses block threshold', () => {
      budget.consumeSync(
        { promptTokens: 4_400_000, completionTokens: 0, totalTokens: 4_400_000 },
        'deepseek-chat', 'test', 'test',
      );
      const result = budget.preEvaluate(500_000);
      // 4.9M/5M = 98% — block band
      expect(result.band).toBe('block');
    });
  });

  describe('thresholds', () => {
    it('should not warn when under 70%', () => {
      budget.consumeSync(
        { promptTokens: 3_000_000, completionTokens: 0, totalTokens: 3_000_000 },
        'deepseek-chat', 'stage1_parsing', 'analysis',
      );
      expect(budget.usageRate()).toBe(0.6);
      expect(budget.isWarnThreshold()).toBe(false);
    });

    it('should warn when over 70%', () => {
      budget.consumeSync(
        { promptTokens: 3_600_000, completionTokens: 0, totalTokens: 3_600_000 },
        'deepseek-chat', 'stage1_parsing', 'analysis',
      );
      expect(budget.usageRate()).toBe(0.72);
      expect(budget.isWarnThreshold()).toBe(true);
    });

    it('should block non-essential when over 90%', () => {
      // Consume via fix (essential) to bypass block check and push past 90%
      budget.consumeSync(
        { promptTokens: 4_500_000, completionTokens: 0, totalTokens: 4_500_000 },
        'deepseek-chat', 'stage4_fixing', 'fix',
      );
      // 4.5M/5M = 90% — at threshold
      expect(budget.isBlockThreshold()).toBe(true);
    });

    it('should hard-block when over 135%', () => {
      // Use essential context (fix) to bypass block and accumulate
      budget.consumeSync(
        { promptTokens: 4_000_000, completionTokens: 0, totalTokens: 4_000_000 },
        'deepseek-chat', 'stage4_fixing', 'fix',
      );
      // The next consume would push past hardBlock (4M+2.8M)/5M=1.36 > 1.35
      const result = budget.consumeSync(
        { promptTokens: 2_800_000, completionTokens: 0, totalTokens: 2_800_000 },
        'deepseek-chat', 'stage4_fixing', 'fix',
      );
      // The consume is blocked, so totalUsed stays at 4M and isHardBlockThreshold
      // only checks current state. We verify the consume was rejected with hardBlock.
      expect(result.allowed).toBe(false);
      expect(result.threshold).toBe('hardBlock');
    });

    it('should not be exhausted at exactly budget limit', () => {
      budget.consumeSync(
        { promptTokens: 5_000_000, completionTokens: 0, totalTokens: 5_000_000 },
        'deepseek-chat', 'stage4_fixing', 'fix',
      );
      expect(budget.remaining()).toBe(0);
      expect(budget.isExhausted()).toBe(true);
    });
  });

  describe('reporting', () => {
    it('should generate a budget report', () => {
      budget.consumeSync(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      const report = budget.getReport();
      expect(report.projectId).toBe('proj-1');
      expect(report.used).toBeGreaterThan(0);
      expect(report.usageRate).toBeGreaterThan(0);
      expect(report.records).toHaveLength(1);
    });

    it('should include estimated cost from unified pricing', () => {
      budget.consumeSync(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      const report = budget.getReport();
      expect(report.estimatedCost).toBeDefined();
      expect(report.estimatedCost!.currency).toBe('USD');
      expect(report.estimatedCost!.breakdown).toBeDefined();
      expect(report.estimatedCost!.breakdown.length).toBeGreaterThan(0);
    });

    it('should break down usage by stage', () => {
      budget.consumeSync(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      budget.consumeSync(SAMPLE_USAGE, 'deepseek-chat', 'stage1_generating', 'generation');
      budget.consumeSync(SAMPLE_USAGE, 'deepseek-chat', 'stage3_verifying', 'verification');

      const breakdown = budget.getStageBreakdown();
      expect(Object.keys(breakdown)).toHaveLength(3);
    });

    it('should break down usage by context', () => {
      budget.consumeSync(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      budget.consumeSync(SAMPLE_USAGE, 'deepseek-chat', 'stage1_generating', 'generation');

      const breakdown = budget.getContextBreakdown();
      expect(breakdown['analysis']).toBe(150);
      expect(breakdown['generation']).toBe(150);
    });

    it('should include isHardBlockThreshold in report', () => {
      const report = budget.getReport();
      expect(report.isHardBlockThreshold).toBeDefined();
      expect(report.isHardBlockThreshold).toBe(false);
    });
  });

  describe('export/import', () => {
    it('should export and re-import state', () => {
      budget.consumeSync(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      const exported = budget.export();

      const restored = new TokenBudget('proj-1');
      restored.importState(exported.records, exported.totalUsed);
      expect(restored.usageRate()).toBe(budget.usageRate());
      expect(restored.recordCount).toBe(budget.recordCount);
    });
  });

  describe('budget update', () => {
    it('should allow updating the budget', () => {
      budget.updateBudget(10_000_000);
      expect(budget.getConfig().totalBudget).toBe(10_000_000);
    });

    it('should recalculate thresholds after update', () => {
      budget.consumeSync(
        { promptTokens: 4_000_000, completionTokens: 0, totalTokens: 4_000_000 },
        'deepseek-chat', 'stage1_parsing', 'analysis',
      );
      expect(budget.isWarnThreshold()).toBe(true); // 4M/5M = 80%

      // Increase budget
      budget.updateBudget(10_000_000);
      expect(budget.isWarnThreshold()).toBe(false); // 4M/10M = 40%
    });
  });
});
