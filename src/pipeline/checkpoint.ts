/**
 * ANFSF Pipeline — Checkpoint & Recovery
 *
 * Each pipeline stage completion writes a checkpoint to persistent storage.
 * If the platform crashes, the project recovers from the latest checkpoint.
 *
 * Task: T-003
 */

import type { ProjectState } from './pipeline-state-machine';

// ============================================================================
// Types
// ============================================================================

export interface CheckpointData {
  /** Requirements specification (stage 1 output) */
  requirements?: {
    version: string;
    spec: Record<string, unknown>;
    confidenceAnnotations: Array<{
      itemId: string;
      source: 'explicit' | 'inferred' | 'supplemented';
      confidence: 'high' | 'medium' | 'low';
    }>;
    lockedBy: string;
    lockedAt: number;
  };
  /** Skeleton code metadata (stage 1 output) */
  skeleton?: {
    commitHash: string;
    fileTree: string[];
    contracts: {
      openapi?: Record<string, unknown>;
      dbSchema?: Record<string, unknown>;
    };
  };
  /** Verification results (stage 3 output) */
  verification?: {
    passed: boolean;
    results: Array<{
      tool: string;
      passed: boolean;
      errors: unknown[];
    }>;
    deployedAt: number;
    environmentUrl: string;
  };
  /** Testing & fix records (stage 4 output) */
  testing?: {
    testResults: Array<{
      testCaseId: string;
      result: string;
      category?: string;
    }>;
    fixRecords: Array<{
      id: string;
      level: string;
      status: string;
    }>;
    confirmedBy: string;
  };
  /** Arbitrary additional data */
  [key: string]: unknown;
}

export interface Checkpoint {
  id: string;
  projectId: string;
  stage: ProjectState;
  timestamp: number;
  data: CheckpointData;
}

/** Minimal store interface — works with both PipelineRunStore and PostgresPipelineRunStore */
export interface CheckpointStore {
  saveCheckpoint(cp: Checkpoint): void | Promise<void>;
  loadCheckpoint(projectId: string): Checkpoint | null | Promise<Checkpoint | null>;
  loadCheckpointByStage(projectId: string, stage: ProjectState): Checkpoint | null | Promise<Checkpoint | null>;
  listCheckpoints(projectId: string): Checkpoint[] | Promise<Checkpoint[]>;
}

// ============================================================================
// In-Memory Store (for testing / lightweight usage)
// ============================================================================

export class InMemoryCheckpointStore implements CheckpointStore {
  private checkpoints: Checkpoint[] = [];

  saveCheckpoint(cp: Checkpoint): void {
    const idx = this.checkpoints.findIndex(
      c => c.projectId === cp.projectId && c.stage === cp.stage
    );
    if (idx >= 0) {
      this.checkpoints[idx] = cp;
    } else {
      this.checkpoints.push(cp);
    }
  }

  loadCheckpoint(projectId: string): Checkpoint | null {
    const matches = this.checkpoints
      .filter(c => c.projectId === projectId)
      .sort((a, b) => {
        const d = b.timestamp - a.timestamp;
        if (d !== 0) return d;
        // Same timestamp: prefer later insertion (higher index)
        const ia = this.checkpoints.indexOf(a);
        const ib = this.checkpoints.indexOf(b);
        return ib - ia;
      });
    return matches[0] ?? null;
  }

  loadCheckpointByStage(projectId: string, stage: ProjectState): Checkpoint | null {
    return this.checkpoints.find(
      c => c.projectId === projectId && c.stage === stage
    ) ?? null;
  }

  listCheckpoints(projectId: string): Checkpoint[] {
    return this.checkpoints
      .filter(c => c.projectId === projectId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }
}

// ============================================================================
// Checkpoint Manager
// ============================================================================

export class CheckpointManager {
  constructor(private store: CheckpointStore) {}

  /** Generate a unique checkpoint ID */
  static generateId(): string {
    return `cp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Save a checkpoint at a specific stage.
   * Idempotent: calling twice for the same project+stage overwrites.
   */
  async save(
    projectId: string,
    stage: ProjectState,
    data: CheckpointData,
  ): Promise<Checkpoint> {
    const checkpoint: Checkpoint = {
      id: CheckpointManager.generateId(),
      projectId,
      stage,
      timestamp: Date.now(),
      data,
    };
    await this.store.saveCheckpoint(checkpoint);
    return checkpoint;
  }

  /**
   * Load the most recent checkpoint for a project.
   */
  async load(projectId: string): Promise<Checkpoint | null> {
    return this.store.loadCheckpoint(projectId);
  }

  /**
   * Load a checkpoint for a specific stage.
   */
  async loadByStage(projectId: string, stage: ProjectState): Promise<Checkpoint | null> {
    return this.store.loadCheckpointByStage(projectId, stage);
  }

  /**
   * List all checkpoints for a project, oldest first.
   */
  async list(projectId: string): Promise<Checkpoint[]> {
    return this.store.listCheckpoints(projectId);
  }

  /**
   * Find the best recovery target after a failure.
   *
   * Strategy: find the latest checkpoint and return its stage as the recovery point.
   * The caller (PipelineStateMachine.restoreTo) then restores to that stage.
   */
  async findRecoveryTarget(projectId: string): Promise<ProjectState | null> {
    const latest = await this.load(projectId);
    return latest?.stage ?? null;
  }
}






