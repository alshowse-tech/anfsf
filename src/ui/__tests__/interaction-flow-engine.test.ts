/**
 * Interaction Flow Engine Tests
 */

import { InteractionFlowEngine, createInteractionFlowEngine, generateStateMachine, calculateFlowComplexity } from '../interaction-flow-engine';

describe('InteractionFlowEngine', () => {
  let engine: InteractionFlowEngine;

  beforeEach(() => {
    engine = createInteractionFlowEngine();
  });

  describe('generateFromUserFlow', () => {
    it('should generate interaction flows from user flow', async () => {
      const userFlow = {
        id: 'flow-1',
        name: 'Login Flow',
        steps: [
          { id: 'step-1', action: 'Navigate to login page', nextStep: 'step-2' },
          { id: 'step-2', action: 'Submit login form', nextStep: 'step-3' },
          { id: 'step-3', action: 'Navigate to dashboard' },
        ],
        entryPoint: 'step-1',
        exitPoint: 'step-3',
      };

      const flows = await engine.generateFromUserFlow(userFlow);

      expect(flows.length).toBeGreaterThan(0);
      expect(flows[0].id).toContain('flow-entry');
    });

    it('should generate entry flow', async () => {
      const userFlow = {
        id: 'flow-2',
        name: 'Test Flow',
        steps: [{ id: 'step-1', action: 'Test' }],
        entryPoint: 'step-1',
      };

      const flows = await engine.generateFromUserFlow(userFlow);

      const entryFlow = flows.find(f => f.id.includes('entry'));
      expect(entryFlow).toBeDefined();
      expect(entryFlow?.trigger.type).toBe('load');
    });

    it('should generate exit flow when exitPoint is defined', async () => {
      const userFlow = {
        id: 'flow-3',
        name: 'Test Flow',
        steps: [{ id: 'step-1', action: 'Test' }],
        entryPoint: 'step-1',
        exitPoint: 'close',
      };

      const flows = await engine.generateFromUserFlow(userFlow);

      const exitFlow = flows.find(f => f.id.includes('exit'));
      expect(exitFlow).toBeDefined();
      expect(exitFlow?.trigger.type).toBe('click');
    });

    it('should detect form pattern', async () => {
      const userFlow = {
        id: 'flow-4',
        name: 'Form Flow',
        steps: [{ id: 'step-1', action: 'Submit form' }],
        entryPoint: 'step-1',
      };

      const flows = await engine.generateFromUserFlow(userFlow);

      const formFlow = flows.find(f => !f.id.includes('entry') && !f.id.includes('exit'));
      expect(formFlow?.trigger.type).toBe('submit');
    });
  });

  describe('validateFlow', () => {
    it('should validate valid flow', async () => {
      const flow = {
        id: 'flow-5',
        trigger: { type: 'click' as const, target: 'button' },
        actions: { actions: [{ type: 'navigate' as const, target: 'page' }] },
        states: [{ from: 'idle', to: 'active' }],
        animations: [],
        errorHandling: [],
      };

      const result = await engine.validateFlow(flow);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.score).toBeGreaterThan(50);
    });

    it('should detect missing trigger', async () => {
      const flow = {
        id: 'flow-6',
        trigger: { type: '', target: '' },
        actions: { actions: [] },
        states: [],
        animations: [],
        errorHandling: [],
      };

      const result = await engine.validateFlow(flow as any);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('trigger'))).toBe(true);
    });

    it('should detect missing actions', async () => {
      const flow = {
        id: 'flow-7',
        trigger: { type: 'click' as const, target: 'button' },
        actions: { actions: [] },
        states: [],
        animations: [],
        errorHandling: [],
      };

      const result = await engine.validateFlow(flow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('action'))).toBe(true);
    });

    it('should warn about missing error handling', async () => {
      const flow = {
        id: 'flow-8',
        trigger: { type: 'click' as const, target: 'button' },
        actions: { actions: [{ type: 'navigate' as const, target: 'page' }] },
        states: [{ from: 'idle', to: 'active' }],
        animations: [],
        errorHandling: [],
      };

      const result = await engine.validateFlow(flow);

      expect(result.warnings.some(w => w.includes('error handling'))).toBe(true);
    });
  });

  describe('generateAnimation', () => {
    it('should generate animation for flow', async () => {
      const flow = {
        id: 'flow-9',
        trigger: { type: 'click' as const, target: 'button' },
        actions: { actions: [{ type: 'navigate' as const, target: 'page' }] },
        states: [],
        animations: [],
        errorHandling: [],
      };

      const animation = engine.generateAnimation(flow);

      expect(animation.id).toContain('anim');
      expect(animation.duration).toBeGreaterThan(0);
      expect(['fade', 'slide', 'scale', 'rotate', 'custom']).toContain(animation.type);
    });
  });

  describe('addErrorHandling', () => {
    it('should add error handlers to flow', async () => {
      const flow = {
        id: 'flow-10',
        trigger: { type: 'load' as const, target: 'page' },
        actions: { actions: [{ type: 'fetch' as const, target: 'api' }] },
        states: [],
        animations: [],
        errorHandling: [],
      };

      const enhancedFlow = engine.addErrorHandling(flow);

      expect(enhancedFlow.errorHandling.length).toBeGreaterThan(0);
      expect(enhancedFlow.errorHandling.some(h => h.errorType === 'NetworkError')).toBe(true);
    });

    it('should add validation error handler', async () => {
      const flow = {
        id: 'flow-11',
        trigger: { type: 'input' as const, target: 'field' },
        actions: { actions: [{ type: 'validate' as const, target: 'form' }] },
        states: [],
        animations: [],
        errorHandling: [],
      };

      const enhancedFlow = engine.addErrorHandling(flow);

      expect(enhancedFlow.errorHandling.some(h => h.errorType === 'ValidationError')).toBe(true);
    });
  });
});

describe('generateStateMachine', () => {
  it('should generate state machine code', () => {
    const flow = {
      id: 'flow-12',
      trigger: { type: 'click' as const, target: 'button' },
      actions: { actions: [] },
      states: [
        { from: 'idle', to: 'active', guard: 'CLICK', effect: 'onActivate' },
        { from: 'active', to: 'idle', effect: 'onReset' },
      ],
      animations: [],
      errorHandling: [],
    };

    const code = generateStateMachine(flow);

    expect(code).toContain('createMachine');
    expect(code).toContain('idle');
    expect(code).toContain('active');
  });
});

describe('calculateFlowComplexity', () => {
  it('should calculate flow complexity score', () => {
    const flow = {
      id: 'flow-13',
      trigger: { type: 'click' as const, target: 'button' },
      actions: { actions: [{ type: 'navigate' as const }, { type: 'dispatch' as const }] },
      states: [{ from: 'idle', to: 'active' }, { from: 'active', to: 'done' }],
      animations: [{ id: 'anim-1', type: 'fade' as const, duration: 300, easing: 'ease' as const }],
      errorHandling: [{ errorType: 'Error', action: 'retry' as const }],
    };

    const complexity = calculateFlowComplexity(flow);

    expect(complexity).toBeGreaterThan(0);
  });
});
