/**
 * Interaction Flow Engine
 * 
 * Generates interaction flows from user flows with animations,
 * error handling, and state management.
 * 
 * @version 1.4.0
 */

import type {
  InteractionFlow,
  TriggerDefinition,
  ActionSequence,
  StateTransition,
  AnimationDefinition,
  ErrorHandler,
  UserFlow,
  FlowStep,
  ValidationResult,
} from './types';
import { ANIMATION_DEFAULTS } from './constants';

// ============================================================================
// Flow Pattern Registry
// ============================================================================

const FLOW_PATTERNS: Record<string, FlowPattern> = {
  navigation: {
    triggerType: 'click',
    actionType: 'navigate',
    defaultAnimation: 'fade',
  },
  form: {
    triggerType: 'submit',
    actionType: 'dispatch',
    defaultAnimation: 'slide',
  },
  modal: {
    triggerType: 'click',
    actionType: 'mutate',
    defaultAnimation: 'scale',
  },
  data: {
    triggerType: 'load',
    actionType: 'fetch',
    defaultAnimation: 'fade',
  },
  validation: {
    triggerType: 'input',
    actionType: 'validate',
    defaultAnimation: 'shake',
  },
};

interface FlowPattern {
  triggerType: string;
  actionType: string;
  defaultAnimation: string;
}

// ============================================================================
// Interaction Flow Engine Class
// ============================================================================

export class InteractionFlowEngine {
  private flowCache: Map<string, InteractionFlow[]> = new Map();

  /**
   * Generate interaction flows from user flow
   */
  async generateFromUserFlow(userFlow: UserFlow): Promise<InteractionFlow[]> {
    // Check cache
    const cached = this.flowCache.get(userFlow.id);
    if (cached) return cached;

    const flows: InteractionFlow[] = [];

    // Generate flow for each step
    for (const step of userFlow.steps) {
      const flow = this.generateStepFlow(userFlow, step);
      flows.push(flow);
    }

    // Add entry and exit flows
    flows.unshift(this.generateEntryFlow(userFlow));
    
    if (userFlow.exitPoint) {
      flows.push(this.generateExitFlow(userFlow));
    }

    this.flowCache.set(userFlow.id, flows);
    return flows;
  }

  /**
   * Validate interaction flow
   */
  async validateFlow(flow: InteractionFlow): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Validate trigger
    if (!flow.trigger || !flow.trigger.type) {
      errors.push('Flow must have a valid trigger');
      score -= 20;
    }

    // Validate actions
    if (!flow.actions || flow.actions.actions.length === 0) {
      errors.push('Flow must have at least one action');
      score -= 20;
    }

    // Validate states
    if (!flow.states || flow.states.length === 0) {
      warnings.push('Flow should define state transitions');
      score -= 10;
    }

    // Validate error handling
    if (!flow.errorHandling || flow.errorHandling.length === 0) {
      warnings.push('Flow should include error handling');
      score -= 10;
    }

    // Validate animations
    for (const anim of flow.animations) {
      if (anim.duration > 1000) {
        warnings.push(`Animation "${anim.id}" is too long (${anim.duration}ms)`);
        score -= 5;
      }
    }

    // Check for unreachable states
    const reachableStates = this.getReachableStates(flow);
    const allStates = new Set(flow.states.map(s => s.to));
    for (const state of allStates) {
      if (!reachableStates.has(state)) {
        warnings.push(`State "${state}" may be unreachable`);
        score -= 5;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Generate animation for flow
   */
  generateAnimation(flow: InteractionFlow): AnimationDefinition {
    const pattern = FLOW_PATTERNS[this.detectFlowPattern(flow)];
    const defaultAnim = ANIMATION_DEFAULTS;

    return {
      id: `anim-${flow.id}`,
      type: this.mapAnimationType(pattern.defaultAnimation),
      duration: defaultAnim.duration.normal,
      easing: defaultAnim.easing.easeInOut,
      delay: 0,
      iterations: 1,
    };
  }

  /**
   * Add error handling to flow
   */
  addErrorHandling(flow: InteractionFlow): InteractionFlow {
    const errorHandlers: ErrorHandler[] = [];

    // Add network error handler
    if (flow.actions.actions.some(a => a.type === 'fetch')) {
      errorHandlers.push({
        errorType: 'NetworkError',
        action: 'retry',
        message: 'Network error. Retrying...',
        maxRetries: 3,
      });
      errorHandlers.push({
        errorType: 'NetworkError',
        action: 'notify',
        message: 'Unable to connect. Please check your connection.',
      });
    }

    // Add validation error handler
    if (flow.actions.actions.some(a => a.type === 'validate')) {
      errorHandlers.push({
        errorType: 'ValidationError',
        action: 'notify',
        message: 'Please fix the errors above.',
      });
    }

    // Add generic error handler
    errorHandlers.push({
      errorType: 'UnknownError',
      action: 'fallback',
      message: 'Something went wrong. Please try again.',
    });

    return {
      ...flow,
      errorHandling: [...(flow.errorHandling || []), ...errorHandlers],
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateStepFlow(userFlow: UserFlow, step: FlowStep): InteractionFlow {
    const pattern = this.detectStepPattern(step);
    const trigger = this.createTrigger(step, pattern);
    const actions = this.createActions(step, pattern);
    const states = this.createStateTransitions(step);
    const animations = this.createAnimations(step, pattern);
    const errorHandling = this.createErrorHandlers(step, pattern);

    return {
      id: `flow-${step.id}`,
      trigger,
      actions,
      states,
      animations,
      errorHandling,
    };
  }

  private generateEntryFlow(userFlow: UserFlow): InteractionFlow {
    return {
      id: `flow-entry-${userFlow.id}`,
      trigger: {
        type: 'load',
        target: userFlow.entryPoint,
      },
      actions: {
        actions: [
          { type: 'dispatch', target: 'onEnter', payload: { flow: userFlow.id } },
        ],
      },
      states: [
        { from: 'initial', to: 'active', effect: 'onEnter' },
      ],
      animations: [
        {
          id: 'entry-fade',
          type: 'fade',
          duration: ANIMATION_DEFAULTS.duration.normal,
          easing: 'ease-in-out',
        },
      ],
      errorHandling: [],
    };
  }

  private generateExitFlow(userFlow: UserFlow): InteractionFlow {
    return {
      id: `flow-exit-${userFlow.id}`,
      trigger: {
        type: 'click',
        target: userFlow.exitPoint || 'close',
      },
      actions: {
        actions: [
          { type: 'navigate', target: 'previous' },
        ],
      },
      states: [
        { from: 'active', to: 'exited', effect: 'onExit' },
      ],
      animations: [
        {
          id: 'exit-fade',
          type: 'fade',
          duration: ANIMATION_DEFAULTS.duration.fast,
          easing: 'ease-out',
        },
      ],
      errorHandling: [],
    };
  }

  private detectStepPattern(step: FlowStep): FlowPattern {
    const action = step.action.toLowerCase();

    if (action.includes('navigate') || action.includes('go to') || action.includes('open')) {
      return FLOW_PATTERNS.navigation;
    }
    if (action.includes('submit') || action.includes('save') || action.includes('create')) {
      return FLOW_PATTERNS.form;
    }
    if (action.includes('modal') || action.includes('dialog') || action.includes('popup')) {
      return FLOW_PATTERNS.modal;
    }
    if (action.includes('load') || action.includes('fetch') || action.includes('get')) {
      return FLOW_PATTERNS.data;
    }
    if (action.includes('validate') || action.includes('check') || action.includes('verify')) {
      return FLOW_PATTERNS.validation;
    }

    return FLOW_PATTERNS.navigation; // Default
  }

  private detectFlowPattern(flow: InteractionFlow): string {
    if (flow.trigger.type === 'submit') return 'form';
    if (flow.trigger.type === 'load') return 'data';
    if (flow.actions.actions.some(a => a.type === 'validate')) return 'validation';
    if (flow.actions.actions.some(a => a.type === 'navigate')) return 'navigation';
    return 'navigation'; // Default
  }

  private createTrigger(step: FlowStep, pattern: FlowPattern): TriggerDefinition {
    return {
      type: pattern.triggerType as TriggerDefinition['type'],
      target: step.id,
      condition: step.alternative ? `hasAlternative(${step.alternative})` : undefined,
    };
  }

  private createActions(step: FlowStep, pattern: FlowPattern): ActionSequence {
    const actions: Array<{ type: string; target?: string; payload?: any }> = [];

    // Primary action based on pattern
    actions.push({
      type: pattern.actionType,
      target: step.nextStep || step.screen,
      payload: { stepId: step.id },
    });

    // Add alternative action if exists
    if (step.alternative) {
      actions.push({
        type: pattern.actionType,
        target: step.alternative,
        payload: { stepId: step.id, alternative: true },
      });
    }

    return {
      actions: actions as any,
      parallel: false,
    };
  }

  private createStateTransitions(step: FlowStep): StateTransition[] {
    const states: StateTransition[] = [];

    // Initial state transition
    states.push({
      from: 'idle',
      to: 'pending',
      guard: `trigger(${step.id})`,
      effect: 'onStart',
    });

    // Success transition
    if (step.nextStep) {
      states.push({
        from: 'pending',
        to: 'success',
        guard: 'success',
        effect: 'onComplete',
      });
      states.push({
        from: 'success',
        to: 'idle',
        effect: 'onReset',
      });
    }

    // Error transition
    states.push({
      from: 'pending',
      to: 'error',
      guard: 'error',
      effect: 'onError',
    });

    return states;
  }

  private createAnimations(step: FlowStep, pattern: FlowPattern): AnimationDefinition[] {
    const animations: AnimationDefinition[] = [];

    // Entry animation
    animations.push({
      id: `anim-${step.id}-enter`,
      type: this.mapAnimationType(pattern.defaultAnimation),
      duration: ANIMATION_DEFAULTS.duration.normal,
      easing: 'ease-out',
    });

    // Exit animation if there's a next step
    if (step.nextStep) {
      animations.push({
        id: `anim-${step.id}-exit`,
        type: 'fade',
        duration: ANIMATION_DEFAULTS.duration.fast,
        easing: 'ease-in',
      });
    }

    return animations;
  }

  private createErrorHandlers(step: FlowStep, pattern: FlowPattern): ErrorHandler[] {
    const handlers: ErrorHandler[] = [];

    // Add retry handler for data operations
    if (pattern.actionType === 'fetch' || pattern.actionType === 'dispatch') {
      handlers.push({
        errorType: 'NetworkError',
        action: 'retry',
        maxRetries: 3,
      });
    }

    // Add validation handler
    if (pattern.actionType === 'validate') {
      handlers.push({
        errorType: 'ValidationError',
        action: 'notify',
        message: 'Please correct the highlighted fields.',
      });
    }

    // Generic fallback
    handlers.push({
      errorType: 'UnknownError',
      action: 'abort',
      message: 'An unexpected error occurred.',
    });

    return handlers;
  }

  private mapAnimationType(type: string): AnimationDefinition['type'] {
    const typeMap: Record<string, AnimationDefinition['type']> = {
      fade: 'fade',
      slide: 'slide',
      scale: 'scale',
      shake: 'custom',
    };
    return typeMap[type] || 'fade';
  }

  private getReachableStates(flow: InteractionFlow): Set<string> {
    const reachable = new Set<string>();
    const initialStates = flow.states.filter(s => s.from === 'idle' || s.from === 'initial');
    
    for (const state of initialStates) {
      reachable.add(state.to);
    }

    // BFS to find all reachable states
    const queue = [...initialStates.map(s => s.to)];
    while (queue.length > 0) {
      const currentState = queue.shift()!;
      const transitions = flow.states.filter(s => s.from === currentState);
      
      for (const transition of transitions) {
        if (!reachable.has(transition.to)) {
          reachable.add(transition.to);
          queue.push(transition.to);
        }
      }
    }

    return reachable;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createInteractionFlowEngine(): InteractionFlowEngine {
  return new InteractionFlowEngine();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate state machine code from flow
 */
export function generateStateMachine(flow: InteractionFlow): string {
  const states = flow.states.map(s => 
    `  '${s.from}': {
    on: {
      ${s.guard || 'TRANSITION'}: '${s.to}'${s.effect ? `,\n      action: '${s.effect}'` : ''}
    }
  }`
  ).join(',\n');

  return `const machine = createMachine({
  initial: 'idle',
  states: {
${states}
  }
});`;
}

/**
 * Generate animation CSS from flow
 */
export function generateAnimationCSS(flows: InteractionFlow[]): string {
  const css: string[] = [];

  for (const flow of flows) {
    for (const anim of flow.animations) {
      css.push(`@keyframes ${anim.id} {
  ${generateKeyframes(anim.type)}
}`);
    }
  }

  return css.join('\n\n');
}

function generateKeyframes(type: string): string {
  switch (type) {
    case 'fade':
      return '0% { opacity: 0; }\n  100% { opacity: 1; }';
    case 'slide':
      return '0% { transform: translateY(20px); opacity: 0; }\n  100% { transform: translateY(0); opacity: 1; }';
    case 'scale':
      return '0% { transform: scale(0.9); opacity: 0; }\n  100% { transform: scale(1); opacity: 1; }';
    default:
      return '0% { opacity: 0; }\n  100% { opacity: 1; }';
  }
}

/**
 * Calculate flow complexity score
 */
export function calculateFlowComplexity(flow: InteractionFlow): number {
  let score = 0;

  // Base score from actions
  score += flow.actions.actions.length * 10;

  // Complexity from states
  score += flow.states.length * 5;

  // Complexity from error handlers
  score += flow.errorHandling.length * 3;

  // Complexity from animations
  score += flow.animations.length * 2;

  return score;
}

/**
 * Merge multiple flows
 */
export function mergeFlows(flows: InteractionFlow[]): InteractionFlow {
  if (flows.length === 0) {
    throw new Error('Cannot merge empty flows');
  }

  return {
    id: `merged-${flows.map(f => f.id).join('-')}`,
    trigger: flows[0].trigger,
    actions: {
      actions: flows.flatMap(f => f.actions.actions),
      parallel: true,
    },
    states: flows.flatMap(f => f.states),
    animations: flows.flatMap(f => f.animations),
    errorHandling: flows.flatMap(f => f.errorHandling),
  };
}
