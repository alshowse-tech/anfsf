/**
 * ASF V4.0 Contract Pack - Config Schema Diff Tests
 */

import { describe, it, expect } from '@jest/globals';
import { diffConfigSchema, canAutoApproveConfigSchema } from '../diff-config-schema';
import type { ContractType } from '../types';

const basicConfig = JSON.stringify({
  name: 'AppConfig',
  version: '1.0.0',
  description: 'Main application configuration',
  required: ['appName', 'port'],
  properties: {
    appName: { type: 'string', required: true, default: 'my-app' },
    port: { type: 'number', required: true, default: 3000, minimum: 1, maximum: 65535 },
    debug: { type: 'boolean', required: false, default: false },
    logLevel: { type: 'string', required: false, default: 'info', enum: ['debug', 'info', 'warn', 'error'] },
    maxConnections: { type: 'number', required: false, default: 100, minimum: 1 },
  },
});

describe('diffConfigSchema', () => {
  it('should detect no changes for identical specs', () => {
    const diff = diffConfigSchema(basicConfig, basicConfig, '1.0.0', '1.0.0');

    expect(diff.contractType).toBe('ConfigSchema');
    expect(diff.breaking).toBe(false);
    expect(diff.changes.added).toHaveLength(0);
    expect(diff.changes.removed).toHaveLength(0);
  });

  it('should detect added optional property', () => {
    const after = JSON.parse(basicConfig);
    after.properties.timeout = { type: 'number', required: false, default: 5000 };

    const diff = diffConfigSchema(basicConfig, JSON.stringify(after), '1.0.0', '1.1.0');

    expect(diff.changes.added).toHaveLength(1);
    expect(diff.breaking).toBe(false);
  });

  it('should detect added required property as breaking', () => {
    const after = JSON.parse(basicConfig);
    after.properties.apiKey = { type: 'string', required: true };
    after.required = ['appName', 'port', 'apiKey'];

    const diff = diffConfigSchema(basicConfig, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.breaking).toBe(true);
    expect(diff.requiresApproval).toBe(true);
  });

  it('should detect removed property as breaking', () => {
    const after = JSON.parse(basicConfig);
    delete after.properties.debug;

    const diff = diffConfigSchema(basicConfig, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.changes.removed).toHaveLength(1);
    expect(diff.breaking).toBe(true);
  });

  it('should detect property type change as breaking', () => {
    const after = JSON.parse(basicConfig);
    after.properties.port.type = 'string';

    const diff = diffConfigSchema(basicConfig, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.breaking).toBe(true);
  });

  it('should detect default value change', () => {
    const after = JSON.parse(basicConfig);
    after.properties.debug.default = true;

    const diff = diffConfigSchema(basicConfig, JSON.stringify(after), '1.0.0', '1.0.1');

    expect(diff.changes.modified.length).toBeGreaterThan(0);
  });

  it('should detect pattern change', () => {
    const after = JSON.parse(basicConfig);
    after.properties.appName.pattern = '^[a-z]+$';

    const diff = diffConfigSchema(basicConfig, JSON.stringify(after), '1.0.0', '1.1.0');

    expect(diff.changes.modified.length).toBeGreaterThan(0);
  });

  it('should detect enum value removal', () => {
    const after = JSON.parse(basicConfig);
    after.properties.logLevel.enum = ['info', 'warn', 'error'];

    const diff = diffConfigSchema(basicConfig, JSON.stringify(after), '1.0.0', '1.1.0');

    expect(diff.changes.modified.length).toBeGreaterThan(0);
  });

  it('should detect constraint changes', () => {
    const after = JSON.parse(basicConfig);
    after.properties.maxConnections.minimum = 10;

    const diff = diffConfigSchema(basicConfig, JSON.stringify(after), '1.0.0', '1.0.1');

    expect(diff.changes.modified.length).toBeGreaterThan(0);
  });

  it('should generate changelog', () => {
    const after = JSON.parse(basicConfig);
    after.properties.timeout = { type: 'number', required: false };

    const diff = diffConfigSchema(basicConfig, JSON.stringify(after), '1.0.0', '1.1.0');

    expect(diff.changelog).toContain('Added');
    expect(diff.changelog).toContain('AppConfig');
  });

  it('should calculate risk score', () => {
    const after = JSON.parse(basicConfig);
    delete after.properties.port;

    const diff = diffConfigSchema(basicConfig, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(diff.riskScore).toBeGreaterThan(0);
  });
});

describe('canAutoApproveConfigSchema', () => {
  it('should auto-approve adding optional property', () => {
    const after = JSON.parse(basicConfig);
    after.properties.timeout = { type: 'number', required: false };

    const diff = diffConfigSchema(basicConfig, JSON.stringify(after), '1.0.0', '1.1.0');

    expect(canAutoApproveConfigSchema(diff)).toBe(true);
  });

  it('should not auto-approve breaking changes', () => {
    const after = JSON.parse(basicConfig);
    delete after.properties.debug;

    const diff = diffConfigSchema(basicConfig, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(canAutoApproveConfigSchema(diff)).toBe(false);
  });

  it('should not auto-approve required property additions', () => {
    const after = JSON.parse(basicConfig);
    after.properties.apiKey = { type: 'string', required: true };
    after.required = ['appName', 'port', 'apiKey'];

    const diff = diffConfigSchema(basicConfig, JSON.stringify(after), '1.0.0', '2.0.0');

    expect(canAutoApproveConfigSchema(diff)).toBe(false);
  });

  it('should reject non-config-schema diff', () => {
    expect(canAutoApproveConfigSchema({
      contractType: 'OpenAPI' as unknown as ContractType,
      version: { before: '1.0.0', after: '1.0.0', bump: null },
      changes: { added: [], removed: [], modified: [] },
      breaking: false,
      requiresApproval: false,
      changelog: '',
    })).toBe(false);
  });
});
