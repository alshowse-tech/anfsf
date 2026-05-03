/**
 * ASF V4.0 Contract Pack - Contract Diff Router Tests
 */

import { describe, it, expect } from '@jest/globals';
import { diffContract, canAutoApprove } from '../contract-diff-router';
import type { ContractType } from '../types';

describe('diffContract', () => {
  it('should dispatch to OpenAPI diff', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: { '/users': { get: { summary: 'List users' } } },
    });

    const after = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': { get: { summary: 'List users' } },
        '/posts': { get: { summary: 'List posts' } },
      },
    });

    const diff = diffContract('OpenAPI', spec, after, { beforeVersion: '1.0.0', afterVersion: '1.1.0' });

    expect(diff.contractType).toBe('OpenAPI');
    expect(diff.changes.added.length).toBeGreaterThan(0);
  });

  it('should dispatch to DBSchema diff', () => {
    const schema = JSON.stringify({
      dialect: 'postgresql',
      version: '1.0.0',
      tables: {
        users: {
          name: 'users',
          columns: [{ name: 'id', type: 'uuid', nullable: false }],
        },
      },
    });

    const after = JSON.stringify({
      dialect: 'postgresql',
      version: '1.0.0',
      tables: {
        users: {
          name: 'users',
          columns: [{ name: 'id', type: 'uuid', nullable: false }],
        },
        posts: {
          name: 'posts',
          columns: [{ name: 'id', type: 'uuid', nullable: false }],
        },
      },
    });

    const diff = diffContract('DBSchema', schema, after, { beforeVersion: '1.0.0', afterVersion: '1.1.0' });

    expect(diff.contractType).toBe('DBSchema');
    expect(diff.changes.added.length).toBeGreaterThan(0);
  });

  it('should dispatch to UIProps diff', () => {
    const props = JSON.stringify({
      componentName: 'Button',
      version: '1.0.0',
      props: { label: { type: 'string', required: true } },
    });

    const after = JSON.stringify({
      componentName: 'Button',
      version: '1.0.0',
      props: {
        label: { type: 'string', required: true },
        icon: { type: 'string', required: false },
      },
    });

    const diff = diffContract('UIProps', props, after, { beforeVersion: '1.0.0', afterVersion: '1.1.0' });

    expect(diff.contractType).toBe('UIProps');
    expect(diff.changes.added.length).toBeGreaterThan(0);
  });

  it('should dispatch to EventSchema diff', () => {
    const event = JSON.stringify({
      name: 'UserCreated',
      version: '1.0.0',
      eventType: 'user.created',
      source: 'user-service',
      fields: { userId: { type: 'string', required: true } },
    });

    const after = JSON.stringify({
      name: 'UserCreated',
      version: '1.0.0',
      eventType: 'user.created',
      source: 'user-service',
      fields: {
        userId: { type: 'string', required: true },
        email: { type: 'string', required: false },
      },
    });

    const diff = diffContract('EventSchema', event, after, { beforeVersion: '1.0.0', afterVersion: '1.1.0' });

    expect(diff.contractType).toBe('EventSchema');
    expect(diff.changes.added.length).toBeGreaterThan(0);
  });

  it('should dispatch to ConfigSchema diff', () => {
    const config = JSON.stringify({
      name: 'AppConfig',
      version: '1.0.0',
      properties: { port: { type: 'number', default: 3000 } },
    });

    const after = JSON.stringify({
      name: 'AppConfig',
      version: '1.0.0',
      properties: {
        port: { type: 'number', default: 3000 },
        timeout: { type: 'number', default: 5000 },
      },
    });

    const diff = diffContract('ConfigSchema', config, after, { beforeVersion: '1.0.0', afterVersion: '1.1.0' });

    expect(diff.contractType).toBe('ConfigSchema');
    expect(diff.changes.added.length).toBeGreaterThan(0);
  });

  it('should throw on unknown contract type', () => {
    expect(() =>
      diffContract('UnknownType' as unknown as ContractType, '{}', '{}', { beforeVersion: '1.0.0', afterVersion: '1.1.0' })
    ).toThrow('Unknown contract type');
  });
});

describe('canAutoApprove', () => {
  it('should auto-approve non-breaking OpenAPI changes', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: { '/users': { get: { summary: 'List users' } } },
    });

    const after = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': { get: { summary: 'List users' } },
        '/health': { get: { summary: 'Health check' } },
      },
    });

    const diff = diffContract('OpenAPI', spec, after, { beforeVersion: '1.0.0', afterVersion: '1.1.0' });

    expect(canAutoApprove(diff)).toBe(true);
  });

  it('should not auto-approve breaking DBSchema changes', () => {
    const schema = JSON.stringify({
      dialect: 'postgresql',
      version: '1.0.0',
      tables: {
        users: {
          name: 'users',
          columns: [{ name: 'id', type: 'uuid', nullable: false }],
        },
      },
    });

    const after = JSON.stringify({
      dialect: 'postgresql',
      version: '1.0.0',
      tables: {},
    });

    const diff = diffContract('DBSchema', schema, after, { beforeVersion: '1.0.0', afterVersion: '2.0.0' });

    expect(canAutoApprove(diff)).toBe(false);
  });
});
