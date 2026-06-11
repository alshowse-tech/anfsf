/**
 * Tests for Checkpoint & Recovery (T-003)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  CheckpointManager,
  InMemoryCheckpointStore,
  type Checkpoint,
  type CheckpointData,
} from '../checkpoint';
import type { ProjectState } from '../pipeline-state-machine';

describe('InMemoryCheckpointStore', () => {
  let store: InMemoryCheckpointStore;

  beforeEach(() => {
    store = new InMemoryCheckpointStore();
  });

  it('should save and load a checkpoint', () => {
    const cp: Checkpoint = {
      id: 'cp_001',
      projectId: 'proj-1',
      stage: 'stage1_done',
      timestamp: Date.now(),
      data: { requirements: { version: 'v1', spec: {}, confidenceAnnotations: [], lockedBy: 'pm', lockedAt: Date.now() } },
    };
    store.saveCheckpoint(cp);
    const loaded = store.loadCheckpoint('proj-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.stage).toBe('stage1_done');
  });

  it('should return null for unknown project', () => {
    expect(store.loadCheckpoint('unknown')).toBeNull();
  });

  it('should return the most recent checkpoint (latest timestamp)', () => {
    store.saveCheckpoint({ id: 'cp_1', projectId: 'p1', stage: 'stage1_done', timestamp: 1000, data: {} });
    store.saveCheckpoint({ id: 'cp_2', projectId: 'p1', stage: 'stage2_dev', timestamp: 2000, data: {} });
    store.saveCheckpoint({ id: 'cp_3', projectId: 'p1', stage: 'stage3_passed', timestamp: 1500, data: {} });

    const latest = store.loadCheckpoint('p1');
    expect(latest!.stage).toBe('stage2_dev'); // timestamp 2000
  });

  it('should overwrite checkpoint for same project+stage (idempotent)', () => {
    store.saveCheckpoint({ id: 'cp_1', projectId: 'p1', stage: 'stage1_done', timestamp: 1000, data: { version: 'v1' } } as any);
    store.saveCheckpoint({ id: 'cp_2', projectId: 'p1', stage: 'stage1_done', timestamp: 2000, data: { version: 'v2' } } as any);

    const cps = store.listCheckpoints('p1');
    expect(cps).toHaveLength(1); // Only one per stage
    expect((cps[0].data as any).version).toBe('v2');
  });

  it('should list checkpoints sorted by timestamp', () => {
    store.saveCheckpoint({ id: 'cp_1', projectId: 'p1', stage: 'stage0_knowledge', timestamp: 1000, data: {} });
    store.saveCheckpoint({ id: 'cp_2', projectId: 'p1', stage: 'stage1_done', timestamp: 2000, data: {} });
    store.saveCheckpoint({ id: 'cp_3', projectId: 'p1', stage: 'stage3_passed', timestamp: 3000, data: {} });

    const list = store.listCheckpoints('p1');
    expect(list).toHaveLength(3);
    // Sorted ascending by timestamp
    expect(list[0].stage).toBe('stage0_knowledge');
    expect(list[2].stage).toBe('stage3_passed');
  });

  it('should load checkpoint by stage', () => {
    store.saveCheckpoint({ id: 'cp_1', projectId: 'p1', stage: 'stage1_done', timestamp: 1000, data: {} });
    store.saveCheckpoint({ id: 'cp_2', projectId: 'p1', stage: 'stage3_passed', timestamp: 2000, data: {} });

    expect(store.loadCheckpointByStage('p1', 'stage1_done')!.stage).toBe('stage1_done');
    expect(store.loadCheckpointByStage('p1', 'stage3_passed')!.stage).toBe('stage3_passed');
    expect(store.loadCheckpointByStage('p1', 'stage5_done')).toBeNull();
  });

  it('should isolate projects from each other', () => {
    store.saveCheckpoint({ id: 'cp_1', projectId: 'proj-a', stage: 'stage1_done', timestamp: 1000, data: {} });
    store.saveCheckpoint({ id: 'cp_2', projectId: 'proj-b', stage: 'stage2_dev', timestamp: 2000, data: {} });

    expect(store.listCheckpoints('proj-a')).toHaveLength(1);
    expect(store.listCheckpoints('proj-b')).toHaveLength(1);
  });
});

describe('CheckpointManager', () => {
  let store: InMemoryCheckpointStore;
  let manager: CheckpointManager;

  beforeEach(() => {
    store = new InMemoryCheckpointStore();
    manager = new CheckpointManager(store);
  });

  it('should save and load a checkpoint', async () => {
    await manager.save('proj-1', 'stage1_done', { version: 'v1' } as any);
    const cp = await manager.load('proj-1');
    expect(cp).not.toBeNull();
    expect(cp!.stage).toBe('stage1_done');
  });

  it('should find the latest checkpoint as recovery target', async () => {
    await manager.save('proj-1', 'stage0_knowledge', {});
    await new Promise(r => setTimeout(r, 5)); // ensure different timestamps
    await manager.save('proj-1', 'stage1_done', {});
    await new Promise(r => setTimeout(r, 5));
    await manager.save('proj-1', 'stage3_passed', {});

    const recoveryTarget = await manager.findRecoveryTarget('proj-1');
    expect(recoveryTarget).toBe('stage3_passed');
  });

  it('should return null recovery target for unknown project', async () => {
    const target = await manager.findRecoveryTarget('unknown');
    expect(target).toBeNull();
  });

  it('should list all checkpoints for a project', async () => {
    await manager.save('proj-1', 'stage0_knowledge', {});
    await manager.save('proj-1', 'stage1_done', {});
    await manager.save('proj-1', 'stage3_passed', {});

    const list = await manager.list('proj-1');
    expect(list).toHaveLength(3);
  });

  it('should load checkpoint by stage', async () => {
    await manager.save('proj-1', 'stage1_done', { snapshot: 'a' } as any);
    await manager.save('proj-1', 'stage3_passed', { snapshot: 'b' } as any);

    const cp = await manager.loadByStage('proj-1', 'stage1_done');
    expect(cp).not.toBeNull();
    expect((cp!.data as any).snapshot).toBe('a');
  });
});

describe('CheckpointManager.generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = CheckpointManager.generateId();
    const id2 = CheckpointManager.generateId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^cp_/);
  });
});
