/**
 * ASF V4.0 DoD Guard - Auto-Approve Tests
 * 
 * Unit tests for auto-approve rules.
 * Version: v0.8.5
 */

import { describe, it, expect } from '@jest/globals';
import { canAutoApprove, getAutoApproveReport, AutoApproveManager, DEFAULT_AUTO_APPROVE_RULES } from '../auto-approve';
import type { ContractDiff } from '../../ownership/types';

function createMockDiff(overrides: Partial<ContractDiff>): ContractDiff {
  return {
    contractType: 'OpenAPI',
    version: { before: '1.0.0', after: '1.0.1', bump: 'patch' },
    changes: { added: [], removed: [], modified: [] },
    breaking: false,
    requiresApproval: false,
    changelog: 'Test changelog',
    ...overrides,
  };
}

describe('canAutoApprove', () => {
  it('should approve non-breaking changes with low risk', () => {
    const diff = createMockDiff({
      breaking: false,
      riskScore: 10,
      changes: {
        added: [{ path: '/users', type: 'endpoint_add', description: 'Added endpoint', severity: 'low', details: {} }],
        removed: [],
        modified: [],
      },
    });

    const result = canAutoApprove(diff);

    expect(result).toBe(true);
  });

  it('should reject breaking changes', () => {
    const diff = createMockDiff({
      breaking: true,
      riskScore: 10,
    });

    const result = canAutoApprove(diff);

    expect(result).toBe(false);
  });

  it('should reject high risk changes', () => {
    const diff = createMockDiff({
      breaking: false,
      riskScore: 50, // Above threshold of 20
    });

    const result = canAutoApprove(diff);

    expect(result).toBe(false);
  });

  it('should reject changes with removed items', () => {
    const diff = createMockDiff({
      breaking: false,
      riskScore: 10,
      changes: {
        added: [],
        removed: [{ path: '/old', type: 'endpoint_remove', description: 'Removed', severity: 'critical', details: {} }],
        modified: [],
      },
    });

    const result = canAutoApprove(diff);

    expect(result).toBe(false);
  });

  it('should reject changes adding required fields', () => {
    const diff = createMockDiff({
      breaking: false,
      riskScore: 10,
      changes: {
        added: [{ path: '/users.name', type: 'field_add', description: 'Added field', severity: 'low', details: { required: true } }],
        removed: [],
        modified: [],
      },
    });

    const result = canAutoApprove(diff);

    expect(result).toBe(false);
  });
});

describe('getAutoApproveReport', () => {
  it('should return eligible for valid diff', () => {
    const diff = createMockDiff({
      breaking: false,
      riskScore: 10,
    });

    const report = getAutoApproveReport(diff);

    expect(report.eligible).toBe(true);
    expect(report.failedConditions).toHaveLength(0);
  });

  it('should list failed conditions', () => {
    const diff = createMockDiff({
      breaking: true,
      riskScore: 50,
    });

    const report = getAutoApproveReport(diff);

    expect(report.eligible).toBe(false);
    expect(report.failedConditions.length).toBeGreaterThan(0);
  });

  it('should include matching rule', () => {
    const diff = createMockDiff({ contractType: 'OpenAPI' });

    const report = getAutoApproveReport(diff);

    expect(report.rule).toBeDefined();
    expect(report.rule?.contractType).toBe('OpenAPI');
  });
});

describe('AutoApproveManager', () => {
  it('should check auto-approve eligibility', () => {
    const manager = new AutoApproveManager();

    const diff = createMockDiff({ breaking: false, riskScore: 10 });
    expect(manager.check(diff)).toBe(true);
  });

  it('should add custom rules', () => {
    const manager = new AutoApproveManager();

    manager.addRule({
      contractType: 'CustomType',
      conditions: { riskScoreBelow: 30 },
      autoApprove: true,
    });

    const rules = manager.getRules();
    expect(rules.some(r => r.contractType === 'CustomType')).toBe(true);
  });

  it('should enable/disable rules', () => {
    const manager = new AutoApproveManager();

    manager.setEnabled('OpenAPI', false);
    const rules = manager.getRules();
    const openapiRule = rules.find(r => r.contractType === 'OpenAPI');

    expect(openapiRule?.autoApprove).toBe(false);
  });

  it('should get stats', () => {
    const manager = new AutoApproveManager();

    const stats = manager.getStats();

    expect(stats.totalRules).toBeGreaterThan(0);
    expect(stats.enabledRules).toBeGreaterThan(0);
    expect(stats.contractTypes).toContain('OpenAPI');
  });
});

describe('DEFAULT_AUTO_APPROVE_RULES', () => {
  it('should have rules for common contract types', () => {
    const contractTypes = DEFAULT_AUTO_APPROVE_RULES.map(r => r.contractType);

    expect(contractTypes).toContain('OpenAPI');
    expect(contractTypes).toContain('DBSchema');
    expect(contractTypes).toContain('UIProps');
    expect(contractTypes).toContain('EventSchema');
  });

  it('should have reasonable risk thresholds', () => {
    for (const rule of DEFAULT_AUTO_APPROVE_RULES) {
      expect(rule.conditions.riskScoreBelow).toBeLessThan(30);
      expect(rule.conditions.riskScoreBelow).toBeGreaterThan(5);
    }
  });
});
