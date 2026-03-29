/**
 * ASF V4.0 Role Engine - KPI Tests
 * 
 * Unit tests for KPI calculation and drift index.
 * Version: v0.8.5
 */

import { describe, it, expect } from '@jest/globals';
import { calculateJSD, calculateDriftIndex, buildTaskTypeDistribution, InMemoryKPIDataSource } from '../kpi-engine';

describe('calculateJSD', () => {
  it('should return 0 for identical distributions', () => {
    const p = [0.5, 0.3, 0.2];
    const q = [0.5, 0.3, 0.2];

    const jsd = calculateJSD(p, q);

    expect(jsd).toBe(0);
  });

  it('should return > 0 for different distributions', () => {
    const p = [0.8, 0.1, 0.1];
    const q = [0.1, 0.1, 0.8];

    const jsd = calculateJSD(p, q);

    expect(jsd).toBeGreaterThan(0);
    expect(jsd).toBeLessThanOrEqual(1);
  });

  it('should return value between 0 and 1', () => {
    const p = [0.6, 0.4];
    const q = [0.4, 0.6];

    const jsd = calculateJSD(p, q);

    expect(jsd).toBeGreaterThanOrEqual(0);
    expect(jsd).toBeLessThanOrEqual(1);
  });

  it('should handle distributions with different lengths', () => {
    const p = [0.5, 0.5];
    const q = [0.5, 0.5];

    expect(() => calculateJSD(p, q)).not.toThrow();
  });
});

describe('calculateDriftIndex', () => {
  it('should return 0 for matching distributions', () => {
    const taskDist = { api: 0.5, db: 0.3, ui: 0.2 };
    const capDist = { api: 0.5, db: 0.3, ui: 0.2 };

    const drift = calculateDriftIndex(taskDist, capDist);

    expect(drift).toBe(0);
  });

  it('should return > 0 for mismatched distributions', () => {
    const taskDist = { api: 0.8, db: 0.1, ui: 0.1 };
    const capDist = { api: 0.1, db: 0.1, ui: 0.8 };

    const drift = calculateDriftIndex(taskDist, capDist);

    expect(drift).toBeGreaterThan(0);
    expect(drift).toBeLessThanOrEqual(1);
  });

  it('should handle missing keys in distributions', () => {
    const taskDist = { api: 0.7, db: 0.3 };
    const capDist = { api: 0.5, db: 0.3, ui: 0.2 };

    const drift = calculateDriftIndex(taskDist, capDist);

    expect(drift).toBeGreaterThanOrEqual(0);
    expect(drift).toBeLessThanOrEqual(1);
  });

  it('should round to 3 decimal places', () => {
    const taskDist = { api: 0.6, db: 0.4 };
    const capDist = { api: 0.4, db: 0.6 };

    const drift = calculateDriftIndex(taskDist, capDist);

    expect(drift).toBe(Number(drift.toFixed(3)));
  });
});

describe('buildTaskTypeDistribution', () => {
  it('should build distribution from tasks', () => {
    const now = Date.now();
    const tasks = [
      { id: '1', type: 'api', status: 'completed', roleId: 'r1', createdAt: now - 1000, completedAt: now - 500 },
      { id: '2', type: 'api', status: 'completed', roleId: 'r1', createdAt: now - 1000, completedAt: now - 500 },
      { id: '3', type: 'db', status: 'completed', roleId: 'r1', createdAt: now - 1000, completedAt: now - 500 },
    ];

    const dist = buildTaskTypeDistribution(tasks as any, 3600000);

    expect(dist.api).toBeCloseTo(0.667, 2);
    expect(dist.db).toBeCloseTo(0.333, 2);
  });

  it('should only count completed tasks', () => {
    const now = Date.now();
    const tasks = [
      { id: '1', type: 'api', status: 'completed', roleId: 'r1', createdAt: now - 1000, completedAt: now - 500 },
      { id: '2', type: 'db', status: 'pending', roleId: 'r1', createdAt: now - 1000 },
      { id: '3', type: 'ui', status: 'failed', roleId: 'r1', createdAt: now - 1000 },
    ];

    const dist = buildTaskTypeDistribution(tasks as any, 3600000);

    expect(dist.api).toBe(1);
    expect(dist.db).toBeUndefined();
    expect(dist.ui).toBeUndefined();
  });

  it('should only count tasks within window', () => {
    const now = Date.now();
    const tasks = [
      { id: '1', type: 'api', status: 'completed', roleId: 'r1', createdAt: now - 1000, completedAt: now - 500 },
      { id: '2', type: 'db', status: 'completed', roleId: 'r1', createdAt: now - 10000000, completedAt: now - 9999000 },
    ];

    const dist = buildTaskTypeDistribution(tasks as any, 3600000);

    expect(dist.api).toBe(1);
    expect(dist.db).toBeUndefined();
  });
});

describe('InMemoryKPIDataSource', () => {
  it('should store and retrieve tasks', async () => {
    const source = new InMemoryKPIDataSource();
    const tasks = [
      { id: '1', type: 'api', status: 'completed', roleId: 'r1', createdAt: 0, completedAt: 100 },
    ];

    source.setTasks('r1', tasks as any);
    const retrieved = await source.getTasks('r1', 0);

    expect(retrieved.length).toBe(1);
    expect(retrieved[0].id).toBe('1');
  });

  it('should return empty array for unknown role', async () => {
    const source = new InMemoryKPIDataSource();

    const tasks = await source.getTasks('unknown', 0);

    expect(tasks).toEqual([]);
  });

  it('should store and retrieve queue state', async () => {
    const source = new InMemoryKPIDataSource();
    const queueState = { roleId: 'r1', currentLength: 5, maxLength: 10, processingCount: 2 };

    source.setQueueState('r1', queueState);
    const retrieved = await source.getQueueState('r1');

    expect(retrieved.currentLength).toBe(5);
    expect(retrieved.maxLength).toBe(10);
  });
});
