/**
 * Tests for PipelineStateMachine (T-001)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  PipelineStateMachine,
  PipelineError,
  ProjectState,
  STATE_TO_STAGE,
} from '../pipeline-state-machine';

// ============================================================================
// Helper: collect all 15 states for validation
// ============================================================================

const ALL_STATES: ProjectState[] = [
  'created',
  'stage0_knowledge',
  'stage1_parsing',
  'stage1_locked',
  'stage1_generating',
  'stage1_done',
  'stage2_dev',
  'stage3_verifying',
  'stage3_passed',
  'stage4_testing',
  'stage4_fixing',
  'stage4_confirmed',
  'stage5_archiving',
  'stage5_done',
  'failed',
];

// ============================================================================
// Tests
// ============================================================================

describe('PipelineStateMachine', () => {
  let sm: PipelineStateMachine;
  const projectId = 'test-project-001';

  beforeEach(() => {
    sm = new PipelineStateMachine(projectId);
  });

  // --------------------------------------------------------------------------
  // Initial State
  // --------------------------------------------------------------------------

  describe('initialization', () => {
    it('should start with created state by default', () => {
      expect(sm.getState()).toBe('created');
    });

    it('should accept a custom initial state', () => {
      const custom = new PipelineStateMachine('p2', 'stage1_done');
      expect(custom.getState()).toBe('stage1_done');
    });

    it('should store the project ID', () => {
      expect(sm.projectId).toBe(projectId);
    });

    it('should return stage -1 for created state', () => {
      expect(sm.getCurrentStage()).toBe(-1);
    });
  });

  // --------------------------------------------------------------------------
  // State Count
  // --------------------------------------------------------------------------

  describe('state enumeration', () => {
    it('should define exactly 15 states', () => {
      expect(ALL_STATES).toHaveLength(15);
    });

    it('should map each state to a stage number (-1 to 5)', () => {
      for (const s of ALL_STATES) {
        const stage = STATE_TO_STAGE[s];
        expect(stage).toBeGreaterThanOrEqual(-1);
        expect(stage).toBeLessThanOrEqual(5);
      }
    });

    it('should have stage 5 for stage5_archiving and stage5_done', () => {
      expect(STATE_TO_STAGE['stage5_archiving']).toBe(5);
      expect(STATE_TO_STAGE['stage5_done']).toBe(5);
    });

    it('should have stage -1 for created and failed', () => {
      expect(STATE_TO_STAGE['created']).toBe(-1);
      expect(STATE_TO_STAGE['failed']).toBe(-1);
    });
  });

  // --------------------------------------------------------------------------
  // Valid Transitions — Stage 0 → Stage 1 → Stage 5
  // --------------------------------------------------------------------------

  describe('valid transitions', () => {
    it('should transition created → stage0_knowledge', async () => {
      await sm.transition('stage0_knowledge');
      expect(sm.getState()).toBe('stage0_knowledge');
    });

    it('should transition created → stage1_parsing (skip knowledge)', async () => {
      await sm.transition('stage1_parsing');
      expect(sm.getState()).toBe('stage1_parsing');
    });

    it('should complete the full happy path (including direct parse→done for Agent Loop)', async () => {
      const path: ProjectState[] = [
        'stage0_knowledge',
        'stage1_parsing',
        'stage1_done',  // Agent Loop skips lock+generate sub-steps
        'stage2_dev',
        'stage3_verifying',
        'stage3_passed',
        'stage4_testing',
        'stage4_confirmed',
        'stage5_archiving',
        'stage5_done',
      ];
      for (const to of path) {
        await sm.transition(to);
      }
      expect(sm.getState()).toBe('stage5_done');
    });

    it('should allow parsing loop (re-parse after modification)', async () => {
      await sm.transition('stage1_parsing');
      // PM modifies and triggers re-parse
      expect(sm.canTransition('stage1_parsing')).toBe(true);
      await sm.transition('stage1_parsing');
      expect(sm.getState()).toBe('stage1_parsing');
    });

    it('should allow testing ↔ fixing loop', async () => {
      await sm.transition('stage1_parsing');
      await sm.transition('stage1_locked');
      await sm.transition('stage1_generating');
      await sm.transition('stage1_done');
      await sm.transition('stage2_dev');
      await sm.transition('stage3_verifying');
      await sm.transition('stage3_passed');
      await sm.transition('stage4_testing');

      // Discover a bug, enter fixing
      await sm.transition('stage4_fixing');
      expect(sm.getState()).toBe('stage4_fixing');

      // Fix done, back to testing
      await sm.transition('stage4_testing');
      expect(sm.getState()).toBe('stage4_testing');

      // PM confirms all tests pass
      await sm.transition('stage4_confirmed');
      expect(sm.getState()).toBe('stage4_confirmed');
    });
  });

  // --------------------------------------------------------------------------
  // Invalid Transitions
  // --------------------------------------------------------------------------

  describe('invalid transitions', () => {
    it('should reject transitions not in the transition table', async () => {
      // Cannot go from created directly to stage5_done
      await expect(sm.transition('stage5_done')).rejects.toThrow(PipelineError);
      await expect(sm.transition('stage5_done')).rejects.toMatchObject({
        code: 'INVALID_STATE',
      });
    });

    it('should reject backward transitions not explicitly allowed', async () => {
      await sm.transition('stage1_parsing');
      await sm.transition('stage1_locked');
      // Cannot go back from locked to parsing
      await expect(sm.transition('stage1_parsing')).rejects.toThrow(PipelineError);
    });

    it('should reject transitions from terminal state', async () => {
      // Navigate to terminal state
      const path: ProjectState[] = [
        'stage1_parsing', 'stage1_locked', 'stage1_generating',
        'stage1_done', 'stage2_dev', 'stage3_verifying',
        'stage3_passed', 'stage4_testing', 'stage4_confirmed',
        'stage5_archiving', 'stage5_done',
      ];
      for (const to of path) await sm.transition(to);

      expect(sm.getAllowedTransitions()).toHaveLength(0);
    });

    it('should not transition from stage5_done to any other state', async () => {
      const path: ProjectState[] = [
        'stage1_parsing', 'stage1_locked', 'stage1_generating',
        'stage1_done', 'stage2_dev', 'stage3_verifying',
        'stage3_passed', 'stage4_testing', 'stage4_confirmed',
        'stage5_archiving', 'stage5_done',
      ];
      for (const to of path) await sm.transition(to);

      // Cannot go anywhere from done
      expect(sm.getAllowedTransitions()).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('error handling', () => {
    it('should enter failed state when onEnter callback throws', async () => {
      sm.onEnter('stage1_locked', async () => {
        throw new Error('Checkpoint write failed');
      });

      await sm.transition('stage1_parsing');
      await expect(sm.transition('stage1_locked')).rejects.toThrow(PipelineError);
      expect(sm.getState()).toBe('failed');
    });

    it('should call onError handler when transition fails', async () => {
      let capturedError: Error | null = null;
      let capturedState: ProjectState | null = null;

      sm.onError(async (error, state) => {
        capturedError = error;
        capturedState = state;
      });

      sm.onEnter('stage1_locked', async () => {
        throw new Error('Something broke');
      });

      await sm.transition('stage1_parsing');
      try {
        await sm.transition('stage1_locked');
      } catch {
        // Expected
      }

      expect(capturedError).not.toBeNull();
      expect(capturedError!.message).toContain('Something broke');
      expect(capturedState).toBe('stage1_parsing');
    });

    it('should preserve error code in PipelineError', async () => {
      sm.onEnter('stage1_locked', async () => {
        throw new Error('Boom');
      });

      await sm.transition('stage1_parsing');
      try {
        await sm.transition('stage1_locked');
      } catch (error) {
        expect(error).toBeInstanceOf(PipelineError);
        expect((error as PipelineError).code).toBe('TRANSITION_ERROR');
        expect((error as PipelineError).state).toBe('stage1_parsing');
        expect((error as PipelineError).targetState).toBe('stage1_locked');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Callbacks
  // --------------------------------------------------------------------------

  describe('callbacks', () => {
    it('should execute onEnter callbacks in registration order', async () => {
      const order: string[] = [];

      sm.onEnter('stage1_parsing', async () => { order.push('first'); });
      sm.onEnter('stage1_parsing', async () => { order.push('second'); });

      await sm.transition('stage1_parsing');

      expect(order).toEqual(['first', 'second']);
    });

    it('should execute onLeave callbacks when leaving a state', async () => {
      let leaveCalled = false;
      let leaveFrom: ProjectState | null = null;
      let leaveTo: ProjectState | null = null;

      sm.onLeave('created', async (from, to) => {
        leaveCalled = true;
        leaveFrom = from;
        leaveTo = to;
      });

      await sm.transition('stage1_parsing');

      expect(leaveCalled).toBe(true);
      expect(leaveFrom).toBe('created');
      expect(leaveTo).toBe('stage1_parsing');
    });

    it('should support multiple onEnter callbacks for different states', async () => {
      let enterParsing = false;
      let enterLocked = false;

      sm.onEnter('stage1_parsing', async () => { enterParsing = true; });
      sm.onEnter('stage1_locked', async () => { enterLocked = true; });

      await sm.transition('stage1_parsing');
      expect(enterParsing).toBe(true);
      expect(enterLocked).toBe(false);

      await sm.transition('stage1_locked');
      expect(enterLocked).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Recovery
  // --------------------------------------------------------------------------

  describe('recovery', () => {
    it('should restore to a specific state bypassing validation', () => {
      sm.restoreTo('stage3_passed');
      expect(sm.getState()).toBe('stage3_passed');
    });

    it('should allow restoring from failed state', async () => {
      // Simulate crash: force state to failed
      sm.restoreTo('failed');
      expect(sm.getState()).toBe('failed');

      // Recovery: restore to last checkpoint
      sm.restoreTo('stage1_done');
      expect(sm.getState()).toBe('stage1_done');

      // Continue normal flow from checkpoint
      await sm.transition('stage2_dev');
      expect(sm.getState()).toBe('stage2_dev');
    });

    it('should support restoring to any state without callbacks firing', async () => {
      let callbackFired = false;
      sm.onEnter('stage3_passed', async () => { callbackFired = true; });

      // restoreTo bypasses callbacks — it's a recovery mechanism
      sm.restoreTo('stage3_passed');

      expect(sm.getState()).toBe('stage3_passed');
      expect(callbackFired).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // getAllowedTransitions
  // --------------------------------------------------------------------------

  describe('getAllowedTransitions', () => {
    it('should return correct next states from created', () => {
      const allowed = sm.getAllowedTransitions();
      expect(allowed).toContain('stage0_knowledge');
      expect(allowed).toContain('stage1_parsing');
      expect(allowed).not.toContain('stage5_done');
    });

    it('should return empty array from stage5_done', async () => {
      const path: ProjectState[] = [
        'stage1_parsing', 'stage1_locked', 'stage1_generating',
        'stage1_done', 'stage2_dev', 'stage3_verifying',
        'stage3_passed', 'stage4_testing', 'stage4_confirmed',
        'stage5_archiving', 'stage5_done',
      ];
      for (const to of path) await sm.transition(to);
      expect(sm.getAllowedTransitions()).toEqual([]);
    });

    it('should allow both stage4_fixing and stage4_confirmed from stage4_testing', async () => {
      const path: ProjectState[] = [
        'stage1_parsing', 'stage1_locked', 'stage1_generating',
        'stage1_done', 'stage2_dev', 'stage3_verifying',
        'stage3_passed', 'stage4_testing',
      ];
      for (const to of path) await sm.transition(to);

      const allowed = sm.getAllowedTransitions();
      expect(allowed).toContain('stage4_fixing');
      expect(allowed).toContain('stage4_confirmed');
      expect(allowed).toContain('failed');
    });
  });

  // --------------------------------------------------------------------------
  // Failed state recovery paths
  // --------------------------------------------------------------------------

  describe('failed state recovery', () => {
    it('should allow recovery from failed to each stage entry point', async () => {
      sm.restoreTo('failed');

      const recoveryStates = sm.getAllowedTransitions();
      // Each stage has an entry point that can be recovered to
      expect(recoveryStates).toContain('stage1_parsing');
      expect(recoveryStates).toContain('stage1_done');
      expect(recoveryStates).toContain('stage2_dev');
      expect(recoveryStates).toContain('stage3_verifying');
      expect(recoveryStates).toContain('stage3_passed');
      expect(recoveryStates).toContain('stage4_testing');
      expect(recoveryStates).toContain('stage5_archiving');
    });
  });
});
