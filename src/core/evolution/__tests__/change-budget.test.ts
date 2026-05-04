/**
 * Tests for Change Budget
 */

import { ChangeBudget, createChangeBudget } from '../change-budget';

describe('ChangeBudget', () => {
  it('should create instance with default config', () => {
    const budget = new ChangeBudget();
    expect(budget).toBeDefined();
  });

  it('should create via factory', () => {
    const budget = createChangeBudget({ maxChanges: 5 });
    expect(budget).toBeDefined();
  });

  it('should allow changes within budget', () => {
    const budget = new ChangeBudget({ maxChanges: 3, windowMs: 7 * 24 * 60 * 60 * 1000 });
    expect(budget.recordChange('change 1', 'architecture')).toBe(true);
    expect(budget.recordChange('change 2', 'pipeline')).toBe(true);
    expect(budget.recordChange('change 3', 'quality')).toBe(true);
  });

  it('should reject changes exceeding budget', () => {
    const budget = new ChangeBudget({ maxChanges: 2, windowMs: 7 * 24 * 60 * 60 * 1000 });
    expect(budget.recordChange('change 1', 'test')).toBe(true);
    expect(budget.recordChange('change 2', 'test')).toBe(true);
    expect(budget.recordChange('change 3', 'test')).toBe(false);
  });

  it('should report correct status', () => {
    const budget = new ChangeBudget({ maxChanges: 5, windowMs: 7 * 24 * 60 * 60 * 1000 });
    budget.recordChange('c1', 'test');
    budget.recordChange('c2', 'test');

    const status = budget.check();
    expect(status.canChange).toBe(true);
    expect(status.remaining).toBe(3);
    expect(status.total).toBe(5);
    expect(status.changesThisWindow).toHaveLength(2);
  });

  it('should prune expired changes', () => {
    const budget = new ChangeBudget({ maxChanges: 2, windowMs: 100 }); // 100ms window
    budget.recordChange('c1', 'test');
    budget.recordChange('c2', 'test');

    // Wait for window to expire
    const start = Date.now();
    while (Date.now() - start < 110) { /* busy wait */ }

    const status = budget.check();
    expect(status.remaining).toBe(2);
    expect(status.changesThisWindow).toHaveLength(0);
  });

  it('should support load/export for persistence', () => {
    const budget1 = new ChangeBudget();
    budget1.recordChange('c1', 'test');
    budget1.recordChange('c2', 'test');

    const exported = budget1.exportChanges();

    const budget2 = new ChangeBudget({ maxChanges: 2 });
    budget2.loadChanges(exported);

    const status = budget2.check();
    expect(status.remaining).toBe(0);
  });

  it('should reset all data', () => {
    const budget = new ChangeBudget();
    budget.recordChange('c1', 'test');
    budget.reset();

    expect(budget.check().remaining).toBe(3);
  });
});
