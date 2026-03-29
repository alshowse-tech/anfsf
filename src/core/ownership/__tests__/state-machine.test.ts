/**
 * ASF V4.0 Ownership - State Machine Tests
 * 
 * Unit tests for contract state machine.
 * Version: v0.8.5
 */

import { describe, it, expect } from '@jest/globals';
import { ContractStateMachine, StateMachineManager } from '../state-machine';

describe('ContractStateMachine', () => {
  it('should start in draft state', () => {
    const machine = new ContractStateMachine('test-contract');

    expect(machine.getCurrentState()).toBe('draft');
    expect(machine.isDraft()).toBe(true);
    expect(machine.isApproved()).toBe(false);
  });

  it('should transition from draft to approved', () => {
    const machine = new ContractStateMachine('test-contract');

    const result = machine.transition('approved', 'architect-team', 'LGTM');

    expect(result.success).toBe(true);
    expect(machine.getCurrentState()).toBe('approved');
    expect(machine.isApproved()).toBe(true);
  });

  it('should transition from draft to rejected', () => {
    const machine = new ContractStateMachine('test-contract');

    const result = machine.transition('rejected', 'architect-team', 'Needs work');

    expect(result.success).toBe(true);
    expect(machine.getCurrentState()).toBe('rejected');
    expect(machine.isRejected()).toBe(true);
  });

  it('should not allow invalid transitions', () => {
    const machine = new ContractStateMachine('test-contract');

    // Cannot go from draft to draft
    const result = machine.transition('draft', 'architect-team');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot transition');
  });

  it('should bump version on approval', () => {
    const machine = new ContractStateMachine('test-contract', 'draft', '1.0.0');

    machine.transition('approved', 'architect-team');
    expect(machine.getVersion()).toBe('1.0.1');

    machine.transition('draft', 'architect-team');
    machine.transition('approved', 'architect-team');
    expect(machine.getVersion()).toBe('1.0.2');
  });

  it('should track transition history', () => {
    const machine = new ContractStateMachine('test-contract');

    machine.transition('approved', 'architect-team', 'First approval');
    machine.transition('draft', 'architect-team', 'Revert for changes');
    machine.transition('approved', 'architect-team', 'Second approval');

    const history = machine.getHistory();

    expect(history.length).toBe(3);
    expect(history[0].from).toBe('draft');
    expect(history[0].to).toBe('approved');
    expect(history[0].actorRoleId).toBe('architect-team');
  });

  it('should get next valid states', () => {
    const machine = new ContractStateMachine('test-contract');

    expect(machine.getNextStates()).toEqual(['approved', 'rejected']);

    machine.transition('approved', 'architect-team');
    expect(machine.getNextStates()).toEqual(['draft']);
  });

  it('should serialize and deserialize', () => {
    const machine = new ContractStateMachine('test-contract');
    machine.transition('approved', 'architect-team', 'Approved');

    const json = machine.toJSON();
    const restored = ContractStateMachine.fromJSON(json);

    expect(restored.getCurrentState()).toBe('approved');
    expect(restored.getVersion()).toBe(machine.getVersion());
  });
});

describe('StateMachineManager', () => {
  it('should create state machines on demand', () => {
    const manager = new StateMachineManager();

    const machine1 = manager.getOrCreate('contract-1');
    const machine2 = manager.getOrCreate('contract-1');

    expect(machine1).toBe(machine2);
  });

  it('should get machines by state', () => {
    const manager = new StateMachineManager();

    manager.getOrCreate('contract-1');
    manager.getOrCreate('contract-2');
    
    const machine3 = manager.getOrCreate('contract-3');
    machine3.transition('approved', 'architect');

    const drafts = manager.getDraftContracts();
    const approved = manager.getApprovedContracts();

    expect(drafts).toContain('contract-1');
    expect(drafts).toContain('contract-2');
    expect(drafts).not.toContain('contract-3');
    expect(approved).toContain('contract-3');
  });

  it('should export and import state', () => {
    const manager = new StateMachineManager();
    
    const machine = manager.getOrCreate('test');
    machine.transition('approved', 'architect');

    const exported = manager.export();
    
    const newManager = new StateMachineManager();
    newManager.import(exported);

    const restored = newManager.get('test');
    expect(restored?.getCurrentState()).toBe('approved');
  });
});
