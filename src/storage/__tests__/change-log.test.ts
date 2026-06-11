/**
 * Change Log — Tests
 */

import { InMemoryChangeLogStore } from '../change-log';
import type { ChangeEvent } from '../../core/graph/types';

function makeEvent(overrides: Partial<ChangeEvent> = {}): ChangeEvent {
  return {
    id: `evt-${Date.now()}-${Math.random()}`,
    ts: Date.now(),
    actorRoleId: 'test-role',
    action: 'create',
    target: { kind: 'graph', idOrPath: 'test-target' },
    ownershipRuleId: 'rule-001',
    diff: { added: { key: 'value' } },
    riskScore: 10,
    ...overrides,
  };
}

describe('InMemoryChangeLogStore', () => {
  let store: InMemoryChangeLogStore;

  beforeEach(() => {
    store = new InMemoryChangeLogStore();
  });

  describe('append', () => {
    it('stores a single event', async () => {
      const event = makeEvent({ id: 'evt-1' });
      await store.append(event);

      const result = await store.getById('evt-1');
      expect(result).toEqual(event);
    });

    it('makes event queryable by target', async () => {
      const event = makeEvent({ target: { kind: 'graph', idOrPath: 'target-a' } });
      await store.append(event);

      const results = await store.getByTarget('target-a');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(event.id);
    });

    it('makes event queryable by role', async () => {
      const event = makeEvent({ actorRoleId: 'role-x' });
      await store.append(event);

      const results = await store.getByRole('role-x');
      expect(results).toHaveLength(1);
      expect(results[0].actorRoleId).toBe('role-x');
    });
  });

  describe('appendBatch', () => {
    it('stores multiple events', async () => {
      const events = [
        makeEvent({ id: 'evt-1', ts: 1000 }),
        makeEvent({ id: 'evt-2', ts: 2000 }),
        makeEvent({ id: 'evt-3', ts: 3000 }),
      ];
      await store.appendBatch(events);

      expect(await store.getById('evt-1')).toBeDefined();
      expect(await store.getById('evt-2')).toBeDefined();
      expect(await store.getById('evt-3')).toBeDefined();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await store.appendBatch([
        makeEvent({ id: 'evt-1', ts: 1000, action: 'create', actorRoleId: 'role-a', target: { kind: 'graph', idOrPath: 'target-x' } }),
        makeEvent({ id: 'evt-2', ts: 2000, action: 'update', actorRoleId: 'role-b', target: { kind: 'graph', idOrPath: 'target-y' } }),
        makeEvent({ id: 'evt-3', ts: 3000, action: 'delete', actorRoleId: 'role-a', target: { kind: 'graph', idOrPath: 'target-x' } }),
        makeEvent({ id: 'evt-4', ts: 4000, action: 'create', actorRoleId: 'role-c', target: { kind: 'contract', idOrPath: 'target-z' } }),
      ]);
    });

    it('returns all events with no filters', async () => {
      const results = await store.query({});
      expect(results).toHaveLength(4);
    });

    it('filters by since timestamp', async () => {
      const results = await store.query({ since: 2500 });
      expect(results).toHaveLength(2);
      expect(results.map(r => r.id)).toContain('evt-3');
      expect(results.map(r => r.id)).toContain('evt-4');
    });

    it('filters by until timestamp', async () => {
      const results = await store.query({ until: 2000 });
      expect(results).toHaveLength(2);
    });

    it('filters by time range', async () => {
      const results = await store.query({ since: 1500, until: 3500 });
      expect(results).toHaveLength(2);
    });

    it('filters by targetId', async () => {
      const results = await store.query({ targetId: 'target-x' });
      expect(results).toHaveLength(2);
    });

    it('filters by actorRoleId', async () => {
      const results = await store.query({ actorRoleId: 'role-a' });
      expect(results).toHaveLength(2);
    });

    it('filters by action', async () => {
      const results = await store.query({ action: 'create' });
      expect(results).toHaveLength(2);
    });

    it('returns events in descending order by default', async () => {
      const results = await store.query({});
      expect(results[0].ts).toBeGreaterThan(results[1].ts);
    });

    it('returns events in ascending order when specified', async () => {
      const results = await store.query({ order: 'asc' });
      expect(results[0].ts).toBeLessThan(results[1].ts);
    });

    it('applies limit', async () => {
      const results = await store.query({ limit: 2 });
      expect(results).toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('returns null for non-existent event', async () => {
      const result = await store.getById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getByTarget', () => {
    it('returns empty array for unknown target', async () => {
      const results = await store.getByTarget('unknown-target');
      expect(results).toHaveLength(0);
    });
  });

  describe('getByRole', () => {
    it('returns empty array for unknown role', async () => {
      const results = await store.getByRole('unknown-role');
      expect(results).toHaveLength(0);
    });
  });

  describe('getCount', () => {
    it('returns total count', async () => {
      await store.append(makeEvent({ id: 'evt-1' }));
      await store.append(makeEvent({ id: 'evt-2' }));

      const count = await store.getCount();
      expect(count).toBe(2);
    });

    it('returns count since timestamp', async () => {
      await store.append(makeEvent({ id: 'evt-1', ts: 1000 }));
      await store.append(makeEvent({ id: 'evt-2', ts: 2000 }));
      await store.append(makeEvent({ id: 'evt-3', ts: 3000 }));

      const count = await store.getCount(2000);
      expect(count).toBe(2);
    });
  });

  describe('pruneBefore', () => {
    it('removes events older than timestamp', async () => {
      await store.appendBatch([
        makeEvent({ id: 'evt-1', ts: 1000 }),
        makeEvent({ id: 'evt-2', ts: 2000 }),
        makeEvent({ id: 'evt-3', ts: 3000 }),
      ]);

      const pruned = await store.pruneBefore(2500);
      expect(pruned).toBe(2);

      const remaining = await store.query({});
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('evt-3');
    });

    it('returns 0 when no events to prune', async () => {
      await store.append(makeEvent({ id: 'evt-1', ts: 5000 }));

      const pruned = await store.pruneBefore(1000);
      expect(pruned).toBe(0);
    });
  });
});
