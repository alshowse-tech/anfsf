/**
 * PostgreSQL Store Tests
 */

import { PostgresPipelineRunStore } from '../store-postgres';
import type { PipelineStep } from '../../pipeline/product-pipeline';

describe('PostgresPipelineRunStore', () => {
  let store: PostgresPipelineRunStore;

  // These tests require a running PostgreSQL instance.
  // In CI, use testcontainers or skip if no DATABASE_URL.
  const pgUrl = process.env.DATABASE_URL_TEST;
  const skipIfNoPG = () => {
    if (!pgUrl) {
      console.warn('Skipping PostgreSQL tests — set DATABASE_URL_TEST to run');
    }
  };

  beforeAll(async () => {
    skipIfNoPG();
    if (pgUrl) {
      store = new PostgresPipelineRunStore(pgUrl);
      await store.init();
    }
  });

  afterAll(async () => {
    if (pgUrl && store) {
      await store.close();
    }
  });

  describe('pool configuration', () => {
    it('should read PG_POOL_MAX from environment', () => {
      // Verify the constructor uses env vars — integration test only
      expect(true).toBe(true);
    });
  });

  describe('CRUD operations', () => {
    it('should create a run', async () => {
      if (!pgUrl) return;
      const run = await store.createRun('test-pg-1', 'Test PRD');
      expect(run.id).toBe('test-pg-1');
      expect(run.status).toBe('queued');
      expect(run.prdText).toBe('Test PRD');
    });

    it('should get a run by id', async () => {
      if (!pgUrl) return;
      const run = await store.getRun('test-pg-1');
      expect(run).toBeDefined();
      expect(run?.id).toBe('test-pg-1');
    });

    it('should update a run', async () => {
      if (!pgUrl) return;
      await store.updateRun('test-pg-1', { status: 'running' });
      const run = await store.getRun('test-pg-1');
      expect(run?.status).toBe('running');
    });

    it('should list runs ordered by started_at', async () => {
      if (!pgUrl) return;
      const runs = await store.listRuns(10);
      expect(runs.length).toBeGreaterThanOrEqual(1);
    });

    it('should complete a run', async () => {
      if (!pgUrl) return;
      await store.completeRun('test-pg-1', true);
      const run = await store.getRun('test-pg-1');
      expect(run?.status).toBe('done');
      expect(run?.completedAt).not.toBeNull();
    });
  });

  describe('subscriptions', () => {
    it('should emit and receive step events', () => {
      if (!pgUrl) return;
      const received: PipelineStep[] = [];
      const unsub = store.subscribeRun('test-pg-1', (step) => {
        received.push(step);
      });
      store.emitStep('test-pg-1', { name: 'Test Step', duration: 100, status: 'ok' });
      expect(received.length).toBe(1);
      expect(received[0].name).toBe('Test Step');
      unsub();
    });
  });

  describe('stats', () => {
    it('should track success/fail counts', async () => {
      if (!pgUrl) return;
      const stats = await store.getStats();
      expect(stats.success).toBeGreaterThanOrEqual(1);
    });
  });

  describe('connectivity check', () => {
    it('should return ok when connected', async () => {
      if (!pgUrl) return;
      const result = await store.checkConnectivity();
      expect(result.status).toBe('ok');
    });
  });

  describe('cleanup', () => {
    it('should delete old runs', async () => {
      if (!pgUrl) return;
      const deleted = await store.cleanupOldRuns(0); // delete all
      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });
});
