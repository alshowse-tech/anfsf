/**
 * Karpathy Integration Layer Tests
 */

import { createKarpathyIntegration } from '../karpathy-integration';
import { createKarpathyInlineGuard } from '../karpathy-inline-guard';

describe('Karpathy Inline Guard', () => {
  let guard: ReturnType<typeof createKarpathyInlineGuard>;

  beforeEach(() => {
    guard = createKarpathyInlineGuard();
  });

  describe('checkSimplicity()', () => {
    it('应该通过简单代码（<3x）', () => {
      const result = guard.checkSimplicity(150, 100);
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.4);
    });

    it('应该拒绝复杂代码（>3x）', () => {
      const result = guard.checkSimplicity(500, 100);  // 5x
      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(0.5);
    });

    it('应该符合 Karpathy 原则：200 行可写 50 行就重写', () => {
      const result = guard.checkSimplicity(200, 50);  // 4x
      expect(result.passed).toBe(false);
    });
  });

  describe('checkSurgicalChanges()', () => {
    it('应该通过精准修改（<30%）', () => {
      const result = guard.checkSurgicalChanges(3, 20);  // 15%
      expect(result.passed).toBe(true);
    });

    it('应该拒绝大范围修改（>30%）', () => {
      const result = guard.checkSurgicalChanges(10, 20);  // 50%
      expect(result.passed).toBe(false);
    });
  });

  describe('checkGoalDriven()', () => {
    it('应该通过高测试覆盖（>80%）', () => {
      const result = guard.checkGoalDriven(9, 10);  // 90%
      expect(result.passed).toBe(true);
    });

    it('应该拒绝低测试覆盖（<80%）', () => {
      const result = guard.checkGoalDriven(5, 10);  // 50%
      expect(result.passed).toBe(false);
    });
  });

  describe('checkAll()', () => {
    it('应该通过所有检查', () => {
      const result = guard.checkAll(
        150, 100,    // simplicity: 1.5x ✓
        3, 20,       // surgical: 15% ✓
        9, 10        // goalDriven: 90% ✓
      );

      expect(result.passed).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('应该拒绝 Simplicity 违规', () => {
      const result = guard.checkAll(
        500, 100,    // simplicity: 5x ✗
        3, 20,       // surgical: 15% ✓
        9, 10        // goalDriven: 90% ✓
      );

      expect(result.passed).toBe(false);
      expect(result.issues.some(i => i.includes('复杂'))).toBe(true);
    });

    it('应该拒绝 Surgical 违规', () => {
      const result = guard.checkAll(
        150, 100,    // simplicity: 1.5x ✓
        15, 20,      // surgical: 75% ✗
        9, 10        // goalDriven: 90% ✓
      );

      expect(result.passed).toBe(false);
      expect(result.issues.some(i => i.includes('修改范围'))).toBe(true);
    });

    it('应该拒绝 Goal-Driven 违规', () => {
      const result = guard.checkAll(
        150, 100,    // simplicity: 1.5x ✓
        3, 20,       // surgical: 15% ✓
        5, 10        // goalDriven: 50% ✗
      );

      expect(result.passed).toBe(false);
      expect(result.issues.some(i => i.includes('测试覆盖'))).toBe(true);
    });
  });

  describe('shouldTriggerExternal()', () => {
    it('大项目应该触发 External', () => {
      const shouldTrigger = guard.shouldTriggerExternal(6000, 5, true);
      expect(shouldTrigger).toBe(true);
    });

    it('复杂项目应该触发 External', () => {
      const shouldTrigger = guard.shouldTriggerExternal(3000, 10, true);
      expect(shouldTrigger).toBe(true);
    });

    it('生产环境应该触发 External', () => {
      const shouldTrigger = guard.shouldTriggerExternal(3000, 5, true);
      expect(shouldTrigger).toBe(true);
    });

    it('小项目非生产环境不触发 External', () => {
      const shouldTrigger = guard.shouldTriggerExternal(2000, 3, false);
      expect(shouldTrigger).toBe(false);
    });
  });
});

describe('Karpathy Integration', () => {
  let integration: ReturnType<typeof createKarpathyIntegration>;

  beforeEach(() => {
    integration = createKarpathyIntegration();
  });

  describe('performFullAudit()', () => {
    it('小项目应该仅执行 Inline Guard', async () => {
      const report = await integration.performFullAudit(
        'small-project',
        150, 100,    // simplicity: 1.5x ✓
        3, 20,       // surgical: 15% ✓
        9, 10,       // goalDriven: 90% ✓
        2000, 3,     // 小项目
        false,
        [],          // sessionLog
        10, 10,      // features
        []           // e2e results
      );

      expect(report.overallPassed).toBe(true);
      expect(report.auditId).toContain('inline');
    });

    it('大项目应该触发 External Review', async () => {
      const report = await integration.performFullAudit(
        'large-project',
        150, 100,    // simplicity: 1.5x ✓
        3, 20,       // surgical: 15% ✓
        9, 10,       // goalDriven: 90% ✓
        6000, 3,     // 大项目
        true,
        [],
        10, 10,
        []
      );

      expect(report.auditId).not.toContain('inline');
    });

    it('SparkPath 类型项目应该被拒绝', async () => {
      const report = await integration.performFullAudit(
        'sparkpath-like',
        500, 100,    // simplicity: 5x ✗
        15, 20,      // surgical: 75% ✗
        3, 10,       // goalDriven: 30% ✗
        4000, 8,     // 中等项目
        true,
        [],
        6, 10,       // 60% 完成度
        []
      );

      expect(report.overallPassed).toBe(false);
      expect(report.kpiData.simplicityScore).toBeLessThan(0.5);
      expect(report.kpiData.surgicalScore).toBeLessThan(0.5);
      expect(report.kpiData.goalDrivenScore).toBeLessThan(0.5);
    });
  });
});

describe('Karpathy Principles - SparkPath Scenarios', () => {
  let guard: ReturnType<typeof createKarpathyInlineGuard>;

  beforeEach(() => {
    guard = createKarpathyInlineGuard();
  });

  it('应该检测 UI 风格不统一问题（SparkPath 问题 1）', () => {
    // UI 不统一通常意味着修改了不该改的文件
    const result = guard.checkSurgicalChanges(12, 20);  // 60% 文件被修改
    expect(result.passed).toBe(false);
  });

  it('应该检测功能不完整问题（SparkPath 问题 4）', () => {
    // 功能不完整意味着测试覆盖低
    const result = guard.checkGoalDriven(3, 10);  // 30% 覆盖
    expect(result.passed).toBe(false);
  });

  it('应该检测自检虚高问题（SparkPath 问题 5）', () => {
    // 自评 100% 但实际 60% = 代码质量高但功能不完整
    const simplicity = guard.checkSimplicity(50, 100);   // 0.5x ✓ (代码质量高)
    const goalDriven = guard.checkGoalDriven(3, 10);     // 30% ✗ (功能不完整)

    // 两者差异大 = 自检虚高
    expect(simplicity.score - goalDriven.score).toBeGreaterThan(0.2);
  });
});
