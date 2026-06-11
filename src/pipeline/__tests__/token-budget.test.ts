/**
 * Tests for Token Budget (T-004)
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
  });

  describe('consumption', () => {
    it('should track token consumption', () => {
      budget.consume(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      expect(budget.usageRate()).toBeGreaterThan(0);
    });

    it('should accumulate total usage', () => {
      budget.consume(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      budget.consume(SAMPLE_USAGE, 'deepseek-chat', 'stage1_generating', 'generation');
      expect(budget.usageRate()).toBe((300) / DEFAULT_BUDGET_CONFIG.totalBudget);
    });

    it('should decrease remaining tokens', () => {
      const before = budget.remaining();
      budget.consume(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      expect(budget.remaining()).toBeLessThan(before);
    });

    it('should return false when blocked (over 90%)', () => {
      // Use nearly all budget
      budget.consume(
        { promptTokens: 4_600_000, completionTokens: 0, totalTokens: 4_600_000 },
        'deepseek-chat', 'stage1_parsing', 'analysis',
      );
      expect(budget.isBlockThreshold()).toBe(true);

      // Non-essential context should be blocked
      const allowed = budget.consume(SAMPLE_USAGE, 'deepseek-chat', 'stage1_generating', 'generation');
      expect(allowed).toBe(false);
    });

    it('should allow essential contexts even when blocked', () => {
      // Exhaust budget
      budget.consume(
        { promptTokens: 4_600_000, completionTokens: 0, totalTokens: 4_600_000 },
        'deepseek-chat', 'stage1_parsing', 'analysis',
      );

      // Essential contexts should still be allowed
      const allowed = budget.consume(SAMPLE_USAGE, 'deepseek-chat', 'stage4_fixing', 'fix-l1');
      expect(allowed).toBe(true);
    });

    it('should always allow via forceConsume', () => {
      budget.consume(
        { promptTokens: 5_000_000, completionTokens: 0, totalTokens: 5_000_000 },
        'deepseek-chat', 'stage1_parsing', 'analysis',
      );
      expect(budget.isExhausted()).toBe(true);

      // forceConsume should never block
      budget.forceConsume(SAMPLE_USAGE, 'deepseek-chat', 'stage4_testing', 'fix');
      expect(budget.usageRate()).toBeGreaterThan(1);
    });
  });

  describe('thresholds', () => {
    it('should not warn when under 70%', () => {
      budget.consume(
        { promptTokens: 3_000_000, completionTokens: 0, totalTokens: 3_000_000 },
        'deepseek-chat', 'stage1_parsing', 'analysis',
      );
      expect(budget.usageRate()).toBe(0.6);
      expect(budget.isWarnThreshold()).toBe(false);
    });

    it('should warn when over 70%', () => {
      budget.consume(
        { promptTokens: 3_600_000, completionTokens: 0, totalTokens: 3_600_000 },
        'deepseek-chat', 'stage1_parsing', 'analysis',
      );
      expect(budget.usageRate()).toBe(0.72);
      expect(budget.isWarnThreshold()).toBe(true);
    });

    it('should block non-essential when over 90%', () => {
      budget.consume(
        { promptTokens: 4_600_000, completionTokens: 0, totalTokens: 4_600_000 },
        'deepseek-chat', 'stage1_parsing', 'analysis',
      );
      expect(budget.isBlockThreshold()).toBe(true);
    });

    it('should not be exhausted at exactly budget limit', () => {
      budget.consume(
        { promptTokens: 5_000_000, completionTokens: 0, totalTokens: 5_000_000 },
        'deepseek-chat', 'stage1_parsing', 'analysis',
      );
      expect(budget.remaining()).toBe(0);
      expect(budget.isExhausted()).toBe(true);
    });
  });

  describe('reporting', () => {
    it('should generate a budget report', () => {
      budget.consume(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      const report = budget.getReport();
      expect(report.projectId).toBe('proj-1');
      expect(report.used).toBeGreaterThan(0);
      expect(report.usageRate).toBeGreaterThan(0);
      expect(report.records).toHaveLength(1);
    });

    it('should include estimated cost in report', () => {
      budget.consume(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      const report = budget.getReport('deepseek-chat');
      expect(report.estimatedCost).toBeDefined();
      expect(report.estimatedCost!.currency).toBe('USD');
    });

    it('should break down usage by stage', () => {
      budget.consume(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      budget.consume(SAMPLE_USAGE, 'deepseek-chat', 'stage1_generating', 'generation');
      budget.consume(SAMPLE_USAGE, 'deepseek-chat', 'stage3_verifying', 'verification');

      const breakdown = budget.getStageBreakdown();
      expect(Object.keys(breakdown)).toHaveLength(3);
    });

    it('should break down usage by context', () => {
      budget.consume(SAMPLE_USAGE, 'deepseek-chat', 'stage1_parsing', 'analysis');
      budget.consume(SAMPLE_USAGE, 'deepseek-chat', 'stage1_generating', 'generation');

      const breakdown = budget.getContextBreakdown();
      expect(breakdown['analysis']).toBe(150);
      expect(breakdown['generation']).toBe(150);
    });
  });

  describe('budget update', () => {
    it('should allow updating the budget', () => {
      budget.updateBudget(10_000_000);
      expect(budget.getConfig().totalBudget).toBe(10_000_000);
    });

    it('should recalculate thresholds after update', () => {
      budget.consume(
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
