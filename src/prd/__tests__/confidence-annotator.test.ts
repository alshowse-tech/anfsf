/**
 * Tests for Confidence Annotator (T-102)
 */

import { describe, it, expect } from '@jest/globals';
import {
  determineSource,
  calculateConfidenceScore,
  confidenceScoreToLevel,
  annotateRequirements,
  sourceToColor,
} from '../confidence-annotator';

const PRD = `
用户管理系统：管理员可以创建用户、编辑用户信息、删除用户。
支持按用户名搜索，按部门筛选。用户列表支持分页，每页20条。
`;

describe('determineSource', () => {
  it('should return explicit for text found verbatim in PRD', () => {
    const result = determineSource('管理员可以创建用户', PRD);
    expect(result).toBe('explicit');
  });

  it('should return inferred for partially matching text', () => {
    // "用户管理" shares "用户" and "管理" tokens with PRD
    const result = determineSource('用户管理权限分配', PRD);
    expect(result).toBe('inferred');
  });

  it('should return supplemented for text with no PRD match', () => {
    const result = determineSource('第三方支付集成', PRD);
    expect(result).toBe('supplemented');
  });
});

describe('calculateConfidenceScore', () => {
  it('should return high score for explicit source', () => {
    const score = calculateConfidenceScore('explicit', PRD, '管理员可以创建用户');
    expect(score).toBeGreaterThanOrEqual(85);
    expect(score).toBeLessThanOrEqual(99);
  });

  it('should return medium score for inferred source', () => {
    const score = calculateConfidenceScore('inferred', PRD, '用户注册');
    expect(score).toBeGreaterThanOrEqual(55);
    expect(score).toBeLessThanOrEqual(84);
  });

  it('should return low score for supplemented source', () => {
    const score = calculateConfidenceScore('supplemented', PRD, '支付集成');
    expect(score).toBeGreaterThanOrEqual(20);
    expect(score).toBeLessThanOrEqual(59);
  });
});

describe('confidenceScoreToLevel', () => {
  it('should map ≥ 85 to high', () => {
    expect(confidenceScoreToLevel(85)).toBe('high');
    expect(confidenceScoreToLevel(95)).toBe('high');
  });

  it('should map 55-84 to medium', () => {
    expect(confidenceScoreToLevel(55)).toBe('medium');
    expect(confidenceScoreToLevel(70)).toBe('medium');
  });

  it('should map < 55 to low', () => {
    expect(confidenceScoreToLevel(20)).toBe('low');
    expect(confidenceScoreToLevel(54)).toBe('low');
  });
});

describe('sourceToColor', () => {
  it('should map sources to correct colors', () => {
    expect(sourceToColor('explicit')).toBe('green');
    expect(sourceToColor('inferred')).toBe('yellow');
    expect(sourceToColor('supplemented')).toBe('red');
  });
});

describe('annotateRequirements', () => {
  const items = [
    { id: 'f1', text: '管理员可以创建用户', category: 'feature' },
    { id: 'f2', text: '用户注册功能', category: 'feature' },
    { id: 'f3', text: '第三方支付集成', category: 'feature' },
    { id: 'f4', text: '支持按用户名搜索', category: 'feature' },
  ];

  it('should annotate all items', () => {
    const report = annotateRequirements(items, PRD);
    expect(report.items).toHaveLength(4);
  });

  it('should produce correct summary counts', () => {
    const report = annotateRequirements(items, PRD);
    expect(report.summary.total).toBe(4);
    expect(report.summary.explicit + report.summary.inferred + report.summary.supplemented).toBe(4);
  });

  it('should identify attention items (low confidence or supplemented)', () => {
    const report = annotateRequirements(items, PRD);
    // f3 (支付集成) should be supplemented → in attentionItems
    expect(report.attentionItems).toContain('f3');
  });

  it('should set pmConfirmed to false initially', () => {
    const report = annotateRequirements(items, PRD);
    for (const item of report.items) {
      expect(item.annotation.pmConfirmed).toBe(false);
    }
  });

  it('should include rationale in each annotation', () => {
    const report = annotateRequirements(items, PRD);
    for (const item of report.items) {
      expect(item.annotation.rationale.length).toBeGreaterThan(0);
    }
  });
});
