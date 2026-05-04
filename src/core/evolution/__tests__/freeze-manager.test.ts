/**
 * Tests for Freeze Manager
 */

import { FreezeManager, createFreezeManager } from '../freeze-manager';

describe('FreezeManager', () => {
  it('should create instance', () => {
    const fm = new FreezeManager();
    expect(fm).toBeDefined();
  });

  it('should create via factory', () => {
    const fm = createFreezeManager();
    expect(fm).toBeDefined();
  });

  it('should not be frozen by default', () => {
    const fm = new FreezeManager();
    const status = fm.check();
    expect(status.isFrozen).toBe(false);
    expect(status.currentFreeze).toBeNull();
  });

  it('should allow changes when not frozen', () => {
    const fm = new FreezeManager();
    expect(fm.isAllowed().allowed).toBe(true);
  });

  it('should create a freeze', () => {
    const fm = new FreezeManager();
    const freeze = fm.createFreeze({
      type: 'scheduled',
      reason: 'Release window',
      durationMs: 1000 * 60 * 60, // 1 hour
      createdBy: 'test',
    });

    expect(freeze.id).toMatch(/^freeze_/);
    expect(freeze.type).toBe('scheduled');
    expect(freeze.reason).toBe('Release window');
  });

  it('should report frozen status during freeze', () => {
    const fm = new FreezeManager();
    fm.createFreeze({
      type: 'emergency',
      reason: 'Critical bug',
      durationMs: 1000 * 60 * 60,
      createdBy: 'test',
    });

    const status = fm.check();
    expect(status.isFrozen).toBe(true);
    expect(status.currentFreeze?.type).toBe('emergency');
  });

  it('should block changes during freeze', () => {
    const fm = new FreezeManager();
    fm.createFreeze({
      type: 'scheduled',
      reason: 'Release',
      durationMs: 1000 * 60 * 60,
      createdBy: 'test',
    });

    const allowed = fm.isAllowed();
    expect(allowed.allowed).toBe(false);
    expect(allowed.reason).toContain('Release');
  });

  it('should allow changes after freeze expires', () => {
    const fm = new FreezeManager();
    fm.createFreeze({
      type: 'scheduled',
      reason: 'Short freeze',
      durationMs: 50, // 50ms
      createdBy: 'test',
    });

    // Wait for freeze to expire
    const start = Date.now();
    while (Date.now() - start < 60) { /* busy wait */ }

    const allowed = fm.isAllowed();
    expect(allowed.allowed).toBe(true);
  });

  it('should cancel a freeze', () => {
    const fm = new FreezeManager();
    const freeze = fm.createFreeze({
      type: 'manual',
      reason: 'Testing',
      durationMs: 1000 * 60 * 60,
      createdBy: 'test',
    });

    const cancelled = fm.cancelFreeze(freeze.id);
    expect(cancelled).toBe(true);
    expect(fm.check().isFrozen).toBe(false);
  });

  it('should return false for canceling nonexistent freeze', () => {
    const fm = new FreezeManager();
    expect(fm.cancelFreeze('nonexistent')).toBe(false);
  });

  it('should have upcoming freezes', () => {
    const fm = new FreezeManager();
    fm.createFreeze({
      type: 'scheduled',
      reason: 'Future freeze',
      startAt: Date.now() + 1000 * 60 * 60, // 1 hour from now
      endAt: Date.now() + 2 * 1000 * 60 * 60,
      createdBy: 'test',
    });

    const status = fm.check();
    expect(status.isFrozen).toBe(false);
    expect(status.upcomingFreezes.length).toBeGreaterThan(0);
  });

  it('should support load/export for persistence', () => {
    const fm1 = new FreezeManager();
    const freeze = fm1.createFreeze({
      type: 'manual',
      reason: 'Test',
      durationMs: 1000 * 60 * 60,
      createdBy: 'test',
    });

    const exported = fm1.exportFreezes();
    expect(exported.length).toBe(1);

    const fm2 = new FreezeManager();
    fm2.loadFreezes(exported);

    expect(fm2.check().isFrozen).toBe(true);
  });

  it('should prune expired non-emergency freezes', () => {
    const fm = new FreezeManager();
    fm.createFreeze({
      type: 'scheduled',
      reason: 'Expired',
      durationMs: 50,
      createdBy: 'test',
    });

    const start = Date.now();
    while (Date.now() - start < 60) { /* busy wait */ }

    fm.pruneExpired();
    expect(fm.check().isFrozen).toBe(false);
  });

  it('should clear all freezes', () => {
    const fm = new FreezeManager();
    fm.createFreeze({
      type: 'manual',
      reason: 'Test',
      durationMs: 1000 * 60 * 60,
      createdBy: 'test',
    });
    fm.clear();

    expect(fm.check().isFrozen).toBe(false);
  });
});
