/**
 * ASF V4.0 Contract Pack - UI Props Diff Tests
 */

import { describe, it, expect } from '@jest/globals';
import { diffUIProps, canAutoApproveUIProps } from '../diff-uiprops';

const basicProps = JSON.stringify({
  componentName: 'Button',
  version: '1.0.0',
  props: {
    label: { type: 'string', required: true, description: 'Button text' },
    onClick: { type: 'function', required: true },
    disabled: { type: 'boolean', required: false, defaultValue: false },
    variant: { type: 'string', required: false, defaultValue: 'primary', union: ['primary', 'secondary', 'ghost'] },
  },
});

describe('diffUIProps', () => {
  it('should detect no changes for identical specs', () => {
    const diff = diffUIProps(basicProps, basicProps, '1.0.0', '1.0.0');

    expect(diff.contractType).toBe('UIProps');
    expect(diff.breaking).toBe(false);
    expect(diff.changes.added).toHaveLength(0);
    expect(diff.changes.removed).toHaveLength(0);
    expect(diff.changes.modified).toHaveLength(0);
  });

  it('should detect added optional prop', () => {
    const after = JSON.parse(basicProps);
    after.props.size = { type: 'string', required: false, defaultValue: 'md' };

    const diff = diffUIProps(basicProps, JSON.stringify(after), '1.0.0', '1.1.0');

    expect(diff.changes.added).toHaveLength(1);
    expect(diff.changes.added[0].prop).toBe('size');
    expect(diff.breaking).toBe(false);
  });

  it('should detect added required prop as breaking', () => {
    const after = JSON.parse(basicProps);
    after.props.icon = { type: 'string', required: true };

    const diff = diffUIProps(basicProps, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.changes.added).toHaveLength(1);
    expect(diff.breaking).toBe(true);
    expect(diff.requiresApproval).toBe(true);
  });

  it('should detect removed prop as breaking', () => {
    const after = JSON.parse(basicProps);
    delete after.props.onClick;

    const diff = diffUIProps(basicProps, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.changes.removed).toHaveLength(1);
    expect(diff.breaking).toBe(true);
  });

  it('should detect prop type change as breaking', () => {
    const after = JSON.parse(basicProps);
    after.props.label.type = 'number';

    const diff = diffUIProps(basicProps, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.changes.modified).toHaveLength(1);
    expect(diff.breaking).toBe(true);
  });

  it('should detect optional to required change as breaking', () => {
    const after = JSON.parse(basicProps);
    after.props.disabled.required = true;

    const diff = diffUIProps(basicProps, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.breaking).toBe(true);
  });

  it('should detect required to optional change as non-breaking', () => {
    const after = JSON.parse(basicProps);
    after.props.label.required = false;

    const diff = diffUIProps(basicProps, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.breaking).toBe(false);
    expect(diff.changes.modified.length).toBeGreaterThan(0);
  });

  it('should detect enum value removal as breaking', () => {
    const after = JSON.parse(basicProps);
    after.props.variant.union = ['primary', 'secondary'];

    const diff = diffUIProps(basicProps, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.breaking).toBe(true);
  });

  it('should generate changelog', () => {
    const after = JSON.parse(basicProps);
    after.props.size = { type: 'string', required: false };

    const diff = diffUIProps(basicProps, JSON.stringify(after), '1.0.0', '1.1.0');

    expect(diff.changelog).toContain('Added');
    expect(diff.changelog).toContain('size');
  });

  it('should calculate risk score', () => {
    const after = JSON.parse(basicProps);
    delete after.props.onClick;

    const diff = diffUIProps(basicProps, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.riskScore).toBeGreaterThan(0);
  });
});

describe('canAutoApproveUIProps', () => {
  it('should auto-approve adding optional prop', () => {
    const after = JSON.parse(basicProps);
    after.props.size = { type: 'string', required: false };

    const diff = diffUIProps(basicProps, JSON.stringify(after), '1.0.0', '1.1.0');

    expect(canAutoApproveUIProps(diff)).toBe(true);
  });

  it('should not auto-approve breaking changes', () => {
    const after = JSON.parse(basicProps);
    delete after.props.onClick;

    const diff = diffUIProps(basicProps, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(canAutoApproveUIProps(diff)).toBe(false);
  });

  it('should not auto-approve adding required prop', () => {
    const after = JSON.parse(basicProps);
    after.props.icon = { type: 'string', required: true };

    const diff = diffUIProps(basicProps, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(canAutoApproveUIProps(diff)).toBe(false);
  });

  it('should not auto-approve type changes', () => {
    const after = JSON.parse(basicProps);
    after.props.label.type = 'number';

    const diff = diffUIProps(basicProps, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(canAutoApproveUIProps(diff)).toBe(false);
  });
});
