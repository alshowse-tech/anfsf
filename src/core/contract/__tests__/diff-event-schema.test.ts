/**
 * ASF V4.0 Contract Pack - Event Schema Diff Tests
 */

import { describe, it, expect } from '@jest/globals';
import { diffEventSchema, canAutoApproveEventSchema } from '../diff-event-schema';
import type { ContractType } from '../types';

const basicEvent = JSON.stringify({
  name: 'UserCreated',
  version: '1.0.0',
  eventType: 'user.created',
  source: 'user-service',
  fields: {
    userId: { type: 'string', required: true, format: 'uuid' },
    email: { type: 'string', required: true },
    name: { type: 'string', required: true },
    tier: { type: 'string', required: false, enum: ['free', 'pro', 'enterprise'] },
  },
});

describe('diffEventSchema', () => {
  it('should detect no changes for identical specs', () => {
    const diff = diffEventSchema(basicEvent, basicEvent, '1.0.0', '1.0.0');

    expect(diff.contractType).toBe('EventSchema');
    expect(diff.breaking).toBe(false);
    expect(diff.changes.added).toHaveLength(0);
    expect(diff.changes.removed).toHaveLength(0);
  });

  it('should detect added optional field', () => {
    const after = JSON.parse(basicEvent);
    after.fields.avatarUrl = { type: 'string', required: false };

    const diff = diffEventSchema(basicEvent, JSON.stringify(after), '1.0.0', '1.1.0');

    expect(diff.changes.added).toHaveLength(1);
    expect(diff.breaking).toBe(false);
  });

  it('should detect added required field as breaking', () => {
    const after = JSON.parse(basicEvent);
    after.fields.phoneNumber = { type: 'string', required: true };

    const diff = diffEventSchema(basicEvent, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.breaking).toBe(true);
    expect(diff.requiresApproval).toBe(true);
  });

  it('should detect removed field as breaking', () => {
    const after = JSON.parse(basicEvent);
    delete after.fields.email;

    const diff = diffEventSchema(basicEvent, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.changes.removed).toHaveLength(1);
    expect(diff.breaking).toBe(true);
  });

  it('should detect field type change as breaking', () => {
    const after = JSON.parse(basicEvent);
    after.fields.userId.type = 'number';

    const diff = diffEventSchema(basicEvent, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.breaking).toBe(true);
  });

  it('should detect event type change as breaking', () => {
    const after = JSON.parse(basicEvent);
    after.eventType = 'user.updated';

    const diff = diffEventSchema(basicEvent, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.breaking).toBe(true);
  });

  it('should detect source change as breaking', () => {
    const after = JSON.parse(basicEvent);
    after.source = 'auth-service';

    const diff = diffEventSchema(basicEvent, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.breaking).toBe(true);
  });

  it('should detect required to optional change as non-breaking', () => {
    const after = JSON.parse(basicEvent);
    after.fields.name.required = false;

    const diff = diffEventSchema(basicEvent, JSON.stringify(after), '1.0.0', '1.0.1');

    expect(diff.breaking).toBe(false);
  });

  it('should detect format change', () => {
    const after = JSON.parse(basicEvent);
    after.fields.userId.format = 'ulid';

    const diff = diffEventSchema(basicEvent, JSON.stringify(after), '1.0.0', '1.1.0');

    expect(diff.changes.modified.length).toBeGreaterThan(0);
  });

  it('should generate changelog', () => {
    const after = JSON.parse(basicEvent);
    after.fields.avatarUrl = { type: 'string', required: false };

    const diff = diffEventSchema(basicEvent, JSON.stringify(after), '1.0.0', '1.1.0');

    expect(diff.changelog).toContain('Added');
    expect(diff.changelog).toContain('UserCreated');
  });

  it('should calculate risk score', () => {
    const after = JSON.parse(basicEvent);
    delete after.fields.email;

    const diff = diffEventSchema(basicEvent, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.riskScore).toBeGreaterThan(0);
  });
});

describe('canAutoApproveEventSchema', () => {
  it('should auto-approve adding optional field', () => {
    const after = JSON.parse(basicEvent);
    after.fields.avatarUrl = { type: 'string', required: false };

    const diff = diffEventSchema(basicEvent, JSON.stringify(after), '1.0.0', '1.1.0');

    expect(canAutoApproveEventSchema(diff)).toBe(true);
  });

  it('should not auto-approve breaking changes', () => {
    const after = JSON.parse(basicEvent);
    delete after.fields.email;

    const diff = diffEventSchema(basicEvent, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(canAutoApproveEventSchema(diff)).toBe(false);
  });

  it('should not auto-approve required field additions', () => {
    const after = JSON.parse(basicEvent);
    after.fields.phoneNumber = { type: 'string', required: true };

    const diff = diffEventSchema(basicEvent, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(canAutoApproveEventSchema(diff)).toBe(false);
  });

  it('should reject non-event-schema diff', () => {
    expect(canAutoApproveEventSchema({
      contractType: 'OpenAPI' as unknown as ContractType,
      version: { before: '1.0.0', after: '1.0.0', bump: null },
      changes: { added: [], removed: [], modified: [] },
      breaking: false,
      requiresApproval: false,
      changelog: '',
    })).toBe(false);
  });
});
