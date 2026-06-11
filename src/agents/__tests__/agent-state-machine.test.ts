import { describe, it, expect, beforeEach } from '@jest/globals';
import { AgentStateMachine, AgentStateMachineManager } from '../agent-state-machine';

describe('Agent State Machine', () => {
  describe('valid transitions', () => {
    it('should transition from initializing to idle', () => {
      const sm = new AgentStateMachine('agent-1', 'initializing');
      const result = sm.transition('idle', 'ready');
      expect(result.success).toBe(true);
      expect(sm.getState()).toBe('idle');
    });

    it('should transition from initializing to error', () => {
      const sm = new AgentStateMachine('agent-1', 'initializing');
      const result = sm.transition('error', 'init failed');
      expect(result.success).toBe(true);
      expect(sm.getState()).toBe('error');
    });

    it('should transition from idle to working', () => {
      const sm = new AgentStateMachine('agent-1', 'idle');
      const result = sm.transition('working', 'task assigned');
      expect(result.success).toBe(true);
      expect(sm.getState()).toBe('working');
    });

    it('should transition from idle to stopped', () => {
      const sm = new AgentStateMachine('agent-1', 'idle');
      const result = sm.transition('stopped', 'shutdown');
      expect(result.success).toBe(true);
      expect(sm.getState()).toBe('stopped');
    });

    it('should transition from working to idle', () => {
      const sm = new AgentStateMachine('agent-1', 'working');
      const result = sm.transition('idle', 'task done');
      expect(result.success).toBe(true);
      expect(sm.getState()).toBe('idle');
    });

    it('should transition from working to blocked', () => {
      const sm = new AgentStateMachine('agent-1', 'working');
      const result = sm.transition('blocked', 'waiting on dep');
      expect(result.success).toBe(true);
      expect(sm.getState()).toBe('blocked');
    });

    it('should transition from blocked to idle', () => {
      const sm = new AgentStateMachine('agent-1', 'blocked');
      const result = sm.transition('idle', 'dep resolved');
      expect(result.success).toBe(true);
      expect(sm.getState()).toBe('idle');
    });

    it('should transition from error to idle (recovery)', () => {
      const sm = new AgentStateMachine('agent-1', 'error');
      const result = sm.transition('idle', 'recovered');
      expect(result.success).toBe(true);
      expect(sm.getState()).toBe('idle');
    });

    it('should transition from error to stopped', () => {
      const sm = new AgentStateMachine('agent-1', 'error');
      const result = sm.transition('stopped', 'giving up');
      expect(result.success).toBe(true);
      expect(sm.getState()).toBe('stopped');
    });
  });

  describe('invalid transitions', () => {
    it('should reject initializing -> working', () => {
      const sm = new AgentStateMachine('agent-1', 'initializing');
      const result = sm.transition('working', 'skip init');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should reject idle -> blocked', () => {
      const sm = new AgentStateMachine('agent-1', 'idle');
      const result = sm.transition('blocked', 'no work');
      expect(result.success).toBe(false);
    });

    it('should reject working -> stopped', () => {
      const sm = new AgentStateMachine('agent-1', 'working');
      const result = sm.transition('stopped', 'abrupt');
      expect(result.success).toBe(false);
    });

    it('should reject stopped -> idle (terminal)', () => {
      const sm = new AgentStateMachine('agent-1', 'stopped');
      const result = sm.transition('idle', 'restart');
      expect(result.success).toBe(false);
    });

    it('should reject blocked -> working', () => {
      const sm = new AgentStateMachine('agent-1', 'blocked');
      const result = sm.transition('working', 'blocked but working');
      expect(result.success).toBe(false);
    });
  });

  describe('state history', () => {
    it('should record full audit trail', () => {
      const sm = new AgentStateMachine('agent-1', 'initializing');
      sm.transition('idle', 'ready');
      sm.transition('working', 'task');
      sm.transition('idle', 'done');

      const history = sm.getHistory();
      expect(history.length).toBe(3);
      expect(history[0].from).toBe('initializing');
      expect(history[0].to).toBe('idle');
      expect(history[1].from).toBe('idle');
      expect(history[1].to).toBe('working');
      expect(history[2].from).toBe('working');
      expect(history[2].to).toBe('idle');
    });

    it('should include agentId and reason in events', () => {
      const sm = new AgentStateMachine('test-agent', 'initializing');
      sm.transition('idle', 'bootstrap complete');

      const last = sm.getLastTransition();
      expect(last).not.toBeNull();
      expect(last!.agentId).toBe('test-agent');
      expect(last!.reason).toBe('bootstrap complete');
    });

    it('should return null for getLastTransition with no history', () => {
      const sm = new AgentStateMachine('agent-1', 'initializing');
      expect(sm.getLastTransition()).toBeNull();
    });
  });

  describe('getNextStates', () => {
    it('should return valid next states for idle', () => {
      const sm = new AgentStateMachine('agent-1', 'idle');
      const next = sm.getNextStates();
      expect(next).toContain('working');
      expect(next).toContain('stopped');
      expect(next).toContain('error');
      expect(next.length).toBe(3);
    });

    it('should return empty array for stopped', () => {
      const sm = new AgentStateMachine('agent-1', 'stopped');
      const next = sm.getNextStates();
      expect(next.length).toBe(0);
    });
  });

  describe('toJSON/fromJSON', () => {
    it('should round-trip through JSON', () => {
      const sm = new AgentStateMachine('agent-1', 'initializing');
      sm.transition('idle', 'ready');
      sm.transition('working', 'task');

      const json = sm.toJSON();
      const restored = AgentStateMachine.fromJSON(json);

      expect(restored.getState()).toBe('working');
      expect(restored.getHistory().length).toBe(2);
    });
  });

  describe('AgentStateMachineManager', () => {
    let manager: AgentStateMachineManager;

    beforeEach(() => {
      manager = new AgentStateMachineManager();
    });

    it('should create state machine on first access', () => {
      const sm = manager.getOrCreate('agent-1');
      expect(sm).not.toBeNull();
      expect(sm.getState()).toBe('initializing');
    });

    it('should return same instance on subsequent calls', () => {
      const sm1 = manager.getOrCreate('agent-1');
      const sm2 = manager.getOrCreate('agent-1');
      expect(sm1).toBe(sm2);
    });

    it('should return null for unknown agent', () => {
      expect(manager.get('unknown')).toBeNull();
    });

    it('should remove state machine', () => {
      manager.getOrCreate('agent-1');
      expect(manager.remove('agent-1')).toBe(true);
      expect(manager.get('agent-1')).toBeNull();
    });

    it('should filter by state', () => {
      manager.getOrCreate('a1', 'idle');
      manager.getOrCreate('a2', 'idle');
      manager.getOrCreate('a3', 'working');

      const idle = manager.getByState('idle');
      expect(idle.length).toBe(2);
    });

    it('should return all state machines', () => {
      manager.getOrCreate('a1');
      manager.getOrCreate('a2');
      expect(manager.getAll().length).toBe(2);
    });

    it('should return all states map', () => {
      manager.getOrCreate('a1', 'idle');
      manager.getOrCreate('a2', 'working');
      const states = manager.getAllStates();
      expect(states.get('a1')).toBe('idle');
      expect(states.get('a2')).toBe('working');
    });

    it('should track size', () => {
      expect(manager.size()).toBe(0);
      manager.getOrCreate('a1');
      expect(manager.size()).toBe(1);
    });
  });
});
