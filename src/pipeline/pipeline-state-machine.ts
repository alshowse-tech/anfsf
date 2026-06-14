/**
 * ANFSF Pipeline State Machine
 *
 * Five-stage state machine with checkpoint integration.
 * Replaces the 17-layer hardcoded pipeline with a formal state model.
 *
 * 15 states across 5 stages + error recovery:
 *   Stage 0: created → stage0_knowledge
 *   Stage 1: stage1_parsing → stage1_locked → stage1_generating → stage1_done
 *   Stage 2: stage2_dev
 *   Stage 3: stage3_verifying → stage3_passed
 *   Stage 4: stage4_testing ↔ stage4_fixing → stage4_confirmed
 *   Stage 5: stage5_archiving → stage5_done
 *   Error:   failed (recoverable from last checkpoint)
 *
 * Task: T-001
 */

// ============================================================================
// State & Transition Definitions
// ============================================================================

import { DEFAULT_TENANT_ID } from "./tenant";

/** All valid project states in the five-stage pipeline */
export type ProjectState =
  | 'created'
  | 'stage0_knowledge'
  | 'stage1_parsing'
  | 'stage1_locked'
  | 'stage1_generating'
  | 'stage1_done'
  | 'stage2_dev'
  | 'stage3_verifying'
  | 'stage3_passed'
  | 'stage4_testing'
  | 'stage4_fixing'
  | 'stage4_confirmed'
  | 'stage4_released_to_test'
  | 'stage4_uat'
  | 'stage4_uat_fixing'
  | 'stage5_archiving'
  | 'stage5_done'
  | 'stage5_evolving'
  | 'failed';

/** Map each state to the stage number it belongs to (0-5, -1 for special states) */
export const STATE_TO_STAGE: Record<ProjectState, number> = {
  created: -1,
  stage0_knowledge: 0,
  stage1_parsing: 1,
  stage1_locked: 1,
  stage1_generating: 1,
  stage1_done: 1,
  stage2_dev: 2,
  stage3_verifying: 3,
  stage3_passed: 3,
  stage4_testing: 4,
  stage4_fixing: 4,
  stage4_confirmed: 4,
  stage4_released_to_test: 4,
  stage4_uat: 4,
  stage4_uat_fixing: 4,
  stage5_archiving: 5,
  stage5_done: 5,
  stage5_evolving: 5,
  failed: -1,
};

/** Allowed transitions: Map<fromState, Set<toState>> */
const TRANSITION_TABLE: Map<ProjectState, Set<ProjectState>> = new Map([
  // Stage 0
  ['created', new Set<ProjectState>(['stage0_knowledge', 'stage1_parsing'])],

  // Stage 0 → Stage 1 (knowledge injection optional)
  ['stage0_knowledge', new Set<ProjectState>(['stage1_parsing'])],

  // Stage 1: parsing loop, then lock
  ['stage1_parsing', new Set<ProjectState>(['stage1_parsing', 'stage1_locked', 'stage1_done', 'failed'])],
  ['stage1_locked', new Set<ProjectState>(['stage1_generating', 'failed'])],

  // Stage 1: generation → done
  ['stage1_generating', new Set<ProjectState>(['stage1_done', 'failed'])],
  ['stage1_done', new Set<ProjectState>(['stage2_dev', 'failed'])],

  // Stage 2
  ['stage2_dev', new Set<ProjectState>(['stage3_verifying', 'failed'])],

  // Stage 3
  ['stage3_verifying', new Set<ProjectState>(['stage3_verifying', 'stage3_passed', 'stage2_dev', 'failed'])],
  ['stage3_passed', new Set<ProjectState>(['stage4_released_to_test', 'stage4_testing', 'failed'])],

  // Stage 4: testing ↔ fixing loop
  ['stage4_testing', new Set<ProjectState>(['stage4_fixing', 'stage4_confirmed', 'stage2_dev', 'failed'])],
  ['stage4_fixing', new Set<ProjectState>(['stage4_testing', 'stage4_confirmed', 'stage2_dev', 'failed'])],
  ['stage4_confirmed', new Set<ProjectState>(['stage5_archiving', 'failed'])],
  ['stage4_released_to_test', new Set<ProjectState>(['stage4_uat', 'stage4_testing', 'failed'])],
  ['stage4_uat', new Set<ProjectState>(['stage4_uat_fixing', 'stage4_confirmed', 'failed'])],
  ['stage4_uat_fixing', new Set<ProjectState>(['stage4_uat', 'stage4_testing', 'failed'])],

  // Stage 5: archiving → done → evolving
  // NOTE: stage5_evolving has no outgoing transitions — it is a terminal state
  // where the external evolution harness (ComponentMiner, CompileLearningDB,
  // retrospective-engine) runs asynchronously. Re-entry to the pipeline from
  // this state is not supported; evolution results feed back into the knowledge
  // base, not into the state machine.
  ['stage5_archiving', new Set<ProjectState>(['stage5_done', 'failed'])],
  ['stage5_done', new Set<ProjectState>(['stage5_evolving'])],

  // Error recovery
  ['failed', new Set<ProjectState>(['stage0_knowledge', 'stage1_parsing',
    'stage1_done', 'stage2_dev', 'stage3_verifying', 'stage3_passed',
    'stage4_testing', 'stage4_released_to_test', 'stage4_uat', 'stage4_uat_fixing',
    'stage5_archiving'])],
]);

// ============================================================================
// Callback Types
// ============================================================================

export type StateTransitionCallback = (from: ProjectState, to: ProjectState) => Promise<void>;
export type ErrorCallback = (error: Error, state: ProjectState) => Promise<void>;

// ============================================================================
// Pipeline State Machine
// ============================================================================

export class PipelineError extends Error {
  constructor(
    message: string,
    public code: string,
    public state: ProjectState,
    public targetState?: ProjectState,
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

export class PipelineStateMachine {
  private state: ProjectState;
  private readonly enterCallbacks: Map<ProjectState, StateTransitionCallback[]> = new Map();
  private readonly leaveCallbacks: Map<ProjectState, StateTransitionCallback[]> = new Map();
  private errorHandler: ErrorCallback | null = null;

  constructor(
    public readonly projectId: string,
    initialState: ProjectState = 'created',
    public readonly tenantId: string = DEFAULT_TENANT_ID,
  ) {
    this.state = initialState;
  }

  // ==========================================================================
  // State Query
  // ==========================================================================

  /** Get the current project state */
  getState(): ProjectState {
    return this.state;
  }

  /** Get the current stage number (0-5), or -1 for special states */
  getCurrentStage(): number {
    return STATE_TO_STAGE[this.state];
  }

  /** Check whether a transition to `to` is allowed from the current state */
  canTransition(to: ProjectState): boolean {
    const allowed = TRANSITION_TABLE.get(this.state);
    return allowed !== undefined && allowed.has(to);
  }

  /** Return the set of allowed next states from the current state */
  getAllowedTransitions(): ProjectState[] {
    const allowed = TRANSITION_TABLE.get(this.state);
    return allowed ? [...allowed] : [];
  }

  // ==========================================================================
  // State Transition
  // ==========================================================================

  /**
   * Transition to the target state.
   * @throws {PipelineError} if the transition is not allowed
   * @throws {PipelineError} if a leave/enter callback throws
   */
  async transition(to: ProjectState, metadata?: Record<string, unknown>): Promise<void> {
    const from = this.state;

    // Validate transition is allowed
    if (!this.canTransition(to)) {
      throw new PipelineError(
        `Invalid state transition: ${from} → ${to}`,
        'INVALID_STATE',
        from,
        to,
      );
    }

    try {
      // Execute leave callbacks for the current state
      const leaveCBs = this.leaveCallbacks.get(from);
      if (leaveCBs) {
        for (const cb of leaveCBs) {
          await cb(from, to);
        }
      }

      // Execute the transition
      this.state = to;

      // Execute enter callbacks for the new state
      const enterCBs = this.enterCallbacks.get(to);
      if (enterCBs) {
        for (const cb of enterCBs) {
          await cb(from, to);
        }
      }
    } catch (error) {
      // If a callback fails, enter failed state
      this.state = 'failed';

      if (this.errorHandler) {
        await this.errorHandler(
          error instanceof Error ? error : new Error(String(error)),
          from,
        );
      }

      throw new PipelineError(
        `Transition failed: ${from} → ${to}: ${error instanceof Error ? error.message : String(error)}`,
        'TRANSITION_ERROR',
        from,
        to,
      );
    }
  }

  // ==========================================================================
  // Callback Registration
  // ==========================================================================

  /**
   * Register a callback to run when entering a specific state.
   * Multiple callbacks for the same state are executed in registration order.
   */
  onEnter(state: ProjectState, callback: StateTransitionCallback): void {
    const existing = this.enterCallbacks.get(state);
    if (existing) {
      existing.push(callback);
    } else {
      this.enterCallbacks.set(state, [callback]);
    }
  }

  /**
   * Register a callback to run when leaving a specific state.
   * Use this for checkpoint writes, cleanup, etc.
   */
  onLeave(state: ProjectState, callback: StateTransitionCallback): void {
    const existing = this.leaveCallbacks.get(state);
    if (existing) {
      existing.push(callback);
    } else {
      this.leaveCallbacks.set(state, [callback]);
    }
  }

  /**
   * Register a global error handler. Called when a transition fails.
   */
  onError(handler: ErrorCallback): void {
    this.errorHandler = handler;
  }

  // ==========================================================================
  // Recovery
  // ==========================================================================

  /**
   * Restore the state machine to a specific state.
   * Used for checkpoint recovery. Bypasses transition validation.
   */
  restoreTo(state: ProjectState): void {
    this.state = state;
  }
}
