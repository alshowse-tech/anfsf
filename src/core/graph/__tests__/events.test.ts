/**
 * Graph Events — Tests
 */

import {
  generateEventId,
  createChangeEvent,
  ChangeEventEmitter,
  getGlobalEmitter,
  resetGlobalEmitter,
  emitChangeEvent,
  createChangeTrackingMiddleware,
} from '../events';

describe('generateEventId', () => {
  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateEventId());
    }
    expect(ids.size).toBe(100);
  });

  it('generates IDs with expected format', () => {
    const id = generateEventId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('createChangeEvent', () => {
  it('creates event with all fields', () => {
    const event = createChangeEvent({
      actorRoleId: 'backend-team',
      action: 'update',
      target: { kind: 'contract', idOrPath: 'api-v1' },
      ownershipRuleId: 'rule-001',
      diff: { modified: { version: { before: '1.0', after: '2.0' } } },
      riskScore: 45,
      metadata: { source: 'test' },
    });

    expect(event.actorRoleId).toBe('backend-team');
    expect(event.action).toBe('update');
    expect(event.target.idOrPath).toBe('api-v1');
    expect(event.ownershipRuleId).toBe('rule-001');
    expect(event.riskScore).toBe(45);
    expect(event.metadata).toEqual({ source: 'test' });
    expect(event.id).toBeDefined();
    expect(event.ts).toBeDefined();
  });

  it('uses default risk score when not provided', () => {
    const event = createChangeEvent({
      actorRoleId: 'test',
      action: 'create',
      target: { kind: 'graph', idOrPath: 'x' },
      ownershipRuleId: 'rule',
      diff: { added: {} },
    });
    expect(event.riskScore).toBe(50);
  });
});

describe('ChangeEventEmitter', () => {
  let emitter: ChangeEventEmitter;

  beforeEach(() => {
    emitter = new ChangeEventEmitter();
  });

  describe('onAll', () => {
    it('notifies listener for all events', async () => {
      const received: any[] = [];
      emitter.onAll((e) => { received.push(e); });

      const evt1 = createChangeEvent({
        actorRoleId: 'a', action: 'create',
        target: { kind: 'graph', idOrPath: 'x' },
        ownershipRuleId: 'r', diff: { added: {} },
      });
      const evt2 = createChangeEvent({
        actorRoleId: 'b', action: 'update',
        target: { kind: 'contract', idOrPath: 'y' },
        ownershipRuleId: 'r', diff: { modified: {} },
      });

      await emitter.emit(evt1);
      await emitter.emit(evt2);

      expect(received).toHaveLength(2);
      expect(received[0].action).toBe('create');
      expect(received[1].action).toBe('update');
    });

    it('unsubscribe stops receiving events', async () => {
      const received: any[] = [];
      const unsub = emitter.onAll((e) => { received.push(e); });

      const evt = createChangeEvent({
        actorRoleId: 'a', action: 'create',
        target: { kind: 'graph', idOrPath: 'x' },
        ownershipRuleId: 'r', diff: { added: {} },
      });

      await emitter.emit(evt);
      unsub();
      await emitter.emit(evt);

      expect(received).toHaveLength(1);
    });
  });

  describe('onTarget', () => {
    it('notifies only for matching target', async () => {
      const received: any[] = [];
      emitter.onTarget('x', (e) => { received.push(e); });

      const evt1 = createChangeEvent({
        actorRoleId: 'a', action: 'create',
        target: { kind: 'graph', idOrPath: 'x' },
        ownershipRuleId: 'r', diff: { added: {} },
      });
      const evt2 = createChangeEvent({
        actorRoleId: 'a', action: 'create',
        target: { kind: 'graph', idOrPath: 'y' },
        ownershipRuleId: 'r', diff: { added: {} },
      });

      await emitter.emit(evt1);
      await emitter.emit(evt2);

      expect(received).toHaveLength(1);
      expect(received[0].target.idOrPath).toBe('x');
    });
  });

  describe('onAction', () => {
    it('notifies only for matching action', async () => {
      const received: any[] = [];
      emitter.onAction('delete', (e) => { received.push(e); });

      const evt1 = createChangeEvent({
        actorRoleId: 'a', action: 'create',
        target: { kind: 'graph', idOrPath: 'x' },
        ownershipRuleId: 'r', diff: { added: {} },
      });
      const evt2 = createChangeEvent({
        actorRoleId: 'a', action: 'delete',
        target: { kind: 'graph', idOrPath: 'x' },
        ownershipRuleId: 'r', diff: { removed: {} },
      });

      await emitter.emit(evt1);
      await emitter.emit(evt2);

      expect(received).toHaveLength(1);
      expect(received[0].action).toBe('delete');
    });
  });

  describe('onRole', () => {
    it('notifies only for matching role', async () => {
      const received: any[] = [];
      emitter.onRole('admin', (e) => { received.push(e); });

      const evt1 = createChangeEvent({
        actorRoleId: 'user', action: 'create',
        target: { kind: 'graph', idOrPath: 'x' },
        ownershipRuleId: 'r', diff: { added: {} },
      });
      const evt2 = createChangeEvent({
        actorRoleId: 'admin', action: 'update',
        target: { kind: 'graph', idOrPath: 'x' },
        ownershipRuleId: 'r', diff: { modified: {} },
      });

      await emitter.emit(evt1);
      await emitter.emit(evt2);

      expect(received).toHaveLength(1);
      expect(received[0].actorRoleId).toBe('admin');
    });
  });

  describe('getRecentEvents', () => {
    it('returns recent events', async () => {
      for (let i = 0; i < 5; i++) {
        await emitter.emit(createChangeEvent({
          actorRoleId: 'a', action: 'create',
          target: { kind: 'graph', idOrPath: `x-${i}` },
          ownershipRuleId: 'r', diff: { added: {} },
        }));
      }

      const recent = emitter.getRecentEvents(3);
      expect(recent).toHaveLength(3);
    });

    it('filters by since timestamp', async () => {
      await emitter.emit(createChangeEvent({
        actorRoleId: 'a', action: 'create',
        target: { kind: 'graph', idOrPath: 'old' },
        ownershipRuleId: 'r', diff: { added: {} },
      }));
      const base = Date.now();
      await emitter.emit(createChangeEvent({
        actorRoleId: 'a', action: 'create',
        target: { kind: 'graph', idOrPath: 'new' },
        ownershipRuleId: 'r', diff: { added: {} },
      }));

      const recent = emitter.getRecentEvents(10, base + 1);
      expect(recent.every(e => e.target.idOrPath === 'new')).toBe(true);
    });
  });

  describe('getEventsForTarget', () => {
    it('returns events for matching target', async () => {
      await emitter.emit(createChangeEvent({
        actorRoleId: 'a', action: 'create',
        target: { kind: 'graph', idOrPath: 'x' },
        ownershipRuleId: 'r', diff: { added: {} },
      }));
      await emitter.emit(createChangeEvent({
        actorRoleId: 'a', action: 'create',
        target: { kind: 'graph', idOrPath: 'y' },
        ownershipRuleId: 'r', diff: { added: {} },
      }));

      const events = emitter.getEventsForTarget('x');
      expect(events).toHaveLength(1);
      expect(events[0].target.idOrPath).toBe('x');
    });
  });

  describe('getEventsForRole', () => {
    it('returns events for matching role', async () => {
      await emitter.emit(createChangeEvent({
        actorRoleId: 'admin', action: 'create',
        target: { kind: 'graph', idOrPath: 'x' },
        ownershipRuleId: 'r', diff: { added: {} },
      }));
      await emitter.emit(createChangeEvent({
        actorRoleId: 'user', action: 'create',
        target: { kind: 'graph', idOrPath: 'x' },
        ownershipRuleId: 'r', diff: { added: {} },
      }));

      const events = emitter.getEventsForRole('admin');
      expect(events).toHaveLength(1);
      expect(events[0].actorRoleId).toBe('admin');
    });
  });

  describe('clearHistory', () => {
    it('removes all events from history', async () => {
      await emitter.emit(createChangeEvent({
        actorRoleId: 'a', action: 'create',
        target: { kind: 'graph', idOrPath: 'x' },
        ownershipRuleId: 'r', diff: { added: {} },
      }));

      expect(emitter.getHistorySize()).toBe(1);
      emitter.clearHistory();
      expect(emitter.getHistorySize()).toBe(0);
    });
  });

  describe('history trimming', () => {
    it('trims history to max size', async () => {
      const smallEmitter = new ChangeEventEmitter(3);

      for (let i = 0; i < 10; i++) {
        await smallEmitter.emit(createChangeEvent({
          actorRoleId: 'a', action: 'create',
          target: { kind: 'graph', idOrPath: `x-${i}` },
          ownershipRuleId: 'r', diff: { added: {} },
        }));
      }

      expect(smallEmitter.getHistorySize()).toBe(3);
    });
  });

  describe('getListenerStats', () => {
    it('returns listener counts by channel', () => {
      emitter.onAll(() => {});
      emitter.onAll(() => {});
      emitter.onTarget('x', () => {});

      const stats = emitter.getListenerStats();
      expect(stats.get('*')).toBe(2);
      expect(stats.get('target:x')).toBe(1);
    });
  });

  describe('error handling', () => {
    it('continues emitting when a listener throws', async () => {
      const received: string[] = [];
      emitter.onAll(() => { throw new Error('listener error'); });
      emitter.onAll((e) => { received.push(e.action); });

      const evt = createChangeEvent({
        actorRoleId: 'a', action: 'create',
        target: { kind: 'graph', idOrPath: 'x' },
        ownershipRuleId: 'r', diff: { added: {} },
      });

      await emitter.emit(evt);
      expect(received).toContain('create');
    });
  });
});

describe('global emitter', () => {
  beforeEach(() => resetGlobalEmitter());

  it('getGlobalEmitter returns singleton', () => {
    const e1 = getGlobalEmitter();
    const e2 = getGlobalEmitter();
    expect(e1).toBe(e2);
  });

  it('resetGlobalEmitter resets singleton', () => {
    const e1 = getGlobalEmitter();
    resetGlobalEmitter();
    const e2 = getGlobalEmitter();
    expect(e1).not.toBe(e2);
  });

  it('emitChangeEvent uses global emitter', async () => {
    const received: any[] = [];
    getGlobalEmitter().onAll((e) => { received.push(e); });

    const evt = createChangeEvent({
      actorRoleId: 'a', action: 'create',
      target: { kind: 'graph', idOrPath: 'x' },
      ownershipRuleId: 'r', diff: { added: {} },
    });

    await emitChangeEvent(evt);
    expect(received).toHaveLength(1);
  });
});

describe('createChangeTrackingMiddleware', () => {
  it('emits event and returns it', async () => {
    const emitter = new ChangeEventEmitter();
    const middleware = createChangeTrackingMiddleware(
      emitter,
      () => 'rule-001'
    );

    const event = await middleware({
      actorRoleId: 'backend',
      action: 'update',
      targetId: 'svc-1',
      targetKind: 'graph',
      diff: { modified: { name: { before: 'old', after: 'new' } } },
      riskScore: 30,
    });

    expect(event.action).toBe('update');
    expect(event.target.idOrPath).toBe('svc-1');
    expect(event.ownershipRuleId).toBe('rule-001');
    expect(event.riskScore).toBe(30);

    const history = emitter.getRecentEvents(1);
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(event.id);
  });
});
