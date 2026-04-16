"use strict";
/**
 * Interaction Flow Engine
 *
 * Generates interaction flows from user flows with animations,
 * error handling, and state management.
 *
 * @version 1.4.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionFlowEngine = void 0;
exports.createInteractionFlowEngine = createInteractionFlowEngine;
exports.generateStateMachine = generateStateMachine;
exports.generateAnimationCSS = generateAnimationCSS;
exports.calculateFlowComplexity = calculateFlowComplexity;
exports.mergeFlows = mergeFlows;
const constants_1 = require("./constants");
// ============================================================================
// Flow Pattern Registry
// ============================================================================
const FLOW_PATTERNS = {
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
// ============================================================================
// Interaction Flow Engine Class
// ============================================================================
class InteractionFlowEngine {
    constructor() {
        this.flowCache = new Map();
    }
    /**
     * Generate interaction flows from user flow
     */
    async generateFromUserFlow(userFlow) {
        // Check cache
        const cached = this.flowCache.get(userFlow.id);
        if (cached)
            return cached;
        const flows = [];
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
    async validateFlow(flow) {
        const errors = [];
        const warnings = [];
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
    generateAnimation(flow) {
        const pattern = FLOW_PATTERNS[this.detectFlowPattern(flow)];
        const defaultAnim = constants_1.ANIMATION_DEFAULTS;
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
    addErrorHandling(flow) {
        const errorHandlers = [];
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
    generateStepFlow(userFlow, step) {
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
    generateEntryFlow(userFlow) {
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
                    duration: constants_1.ANIMATION_DEFAULTS.duration.normal,
                    easing: 'ease-in-out',
                },
            ],
            errorHandling: [],
        };
    }
    generateExitFlow(userFlow) {
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
                    duration: constants_1.ANIMATION_DEFAULTS.duration.fast,
                    easing: 'ease-out',
                },
            ],
            errorHandling: [],
        };
    }
    detectStepPattern(step) {
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
    detectFlowPattern(flow) {
        if (flow.trigger.type === 'submit')
            return 'form';
        if (flow.trigger.type === 'load')
            return 'data';
        if (flow.actions.actions.some(a => a.type === 'validate'))
            return 'validation';
        if (flow.actions.actions.some(a => a.type === 'navigate'))
            return 'navigation';
        return 'navigation'; // Default
    }
    createTrigger(step, pattern) {
        return {
            type: pattern.triggerType,
            target: step.id,
            condition: step.alternative ? `hasAlternative(${step.alternative})` : undefined,
        };
    }
    createActions(step, pattern) {
        const actions = [];
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
            actions: actions,
            parallel: false,
        };
    }
    createStateTransitions(step) {
        const states = [];
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
    createAnimations(step, pattern) {
        const animations = [];
        // Entry animation
        animations.push({
            id: `anim-${step.id}-enter`,
            type: this.mapAnimationType(pattern.defaultAnimation),
            duration: constants_1.ANIMATION_DEFAULTS.duration.normal,
            easing: 'ease-out',
        });
        // Exit animation if there's a next step
        if (step.nextStep) {
            animations.push({
                id: `anim-${step.id}-exit`,
                type: 'fade',
                duration: constants_1.ANIMATION_DEFAULTS.duration.fast,
                easing: 'ease-in',
            });
        }
        return animations;
    }
    createErrorHandlers(step, pattern) {
        const handlers = [];
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
    mapAnimationType(type) {
        const typeMap = {
            fade: 'fade',
            slide: 'slide',
            scale: 'scale',
            shake: 'custom',
        };
        return typeMap[type] || 'fade';
    }
    getReachableStates(flow) {
        const reachable = new Set();
        const initialStates = flow.states.filter(s => s.from === 'idle' || s.from === 'initial');
        for (const state of initialStates) {
            reachable.add(state.to);
        }
        // BFS to find all reachable states
        const queue = [...initialStates.map(s => s.to)];
        while (queue.length > 0) {
            const currentState = queue.shift();
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
exports.InteractionFlowEngine = InteractionFlowEngine;
// ============================================================================
// Factory Function
// ============================================================================
function createInteractionFlowEngine() {
    return new InteractionFlowEngine();
}
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Generate state machine code from flow
 */
function generateStateMachine(flow) {
    const states = flow.states.map(s => `  '${s.from}': {
    on: {
      ${s.guard || 'TRANSITION'}: '${s.to}'${s.effect ? `,\n      action: '${s.effect}'` : ''}
    }
  }`).join(',\n');
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
function generateAnimationCSS(flows) {
    const css = [];
    for (const flow of flows) {
        for (const anim of flow.animations) {
            css.push(`@keyframes ${anim.id} {
  ${generateKeyframes(anim.type)}
}`);
        }
    }
    return css.join('\n\n');
}
function generateKeyframes(type) {
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
function calculateFlowComplexity(flow) {
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
function mergeFlows(flows) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3Rpb24tZmxvdy1lbmdpbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvdWkvaW50ZXJhY3Rpb24tZmxvdy1lbmdpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7O0dBT0c7OztBQTRkSCxrRUFFQztBQVNELG9EQWVDO0FBS0Qsb0RBWUM7QUFrQkQsMERBZ0JDO0FBS0QsZ0NBZ0JDO0FBampCRCwyQ0FBaUQ7QUFFakQsK0VBQStFO0FBQy9FLHdCQUF3QjtBQUN4QiwrRUFBK0U7QUFFL0UsTUFBTSxhQUFhLEdBQWdDO0lBQ2pELFVBQVUsRUFBRTtRQUNWLFdBQVcsRUFBRSxPQUFPO1FBQ3BCLFVBQVUsRUFBRSxVQUFVO1FBQ3RCLGdCQUFnQixFQUFFLE1BQU07S0FDekI7SUFDRCxJQUFJLEVBQUU7UUFDSixXQUFXLEVBQUUsUUFBUTtRQUNyQixVQUFVLEVBQUUsVUFBVTtRQUN0QixnQkFBZ0IsRUFBRSxPQUFPO0tBQzFCO0lBQ0QsS0FBSyxFQUFFO1FBQ0wsV0FBVyxFQUFFLE9BQU87UUFDcEIsVUFBVSxFQUFFLFFBQVE7UUFDcEIsZ0JBQWdCLEVBQUUsT0FBTztLQUMxQjtJQUNELElBQUksRUFBRTtRQUNKLFdBQVcsRUFBRSxNQUFNO1FBQ25CLFVBQVUsRUFBRSxPQUFPO1FBQ25CLGdCQUFnQixFQUFFLE1BQU07S0FDekI7SUFDRCxVQUFVLEVBQUU7UUFDVixXQUFXLEVBQUUsT0FBTztRQUNwQixVQUFVLEVBQUUsVUFBVTtRQUN0QixnQkFBZ0IsRUFBRSxPQUFPO0tBQzFCO0NBQ0YsQ0FBQztBQVFGLCtFQUErRTtBQUMvRSxnQ0FBZ0M7QUFDaEMsK0VBQStFO0FBRS9FLE1BQWEscUJBQXFCO0lBQWxDO1FBQ1UsY0FBUyxHQUFtQyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBNFpoRSxDQUFDO0lBMVpDOztPQUVHO0lBQ0gsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFFBQWtCO1FBQzND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ZixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixVQUFVLENBQUMsS0FBd0I7SUFDakQsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsT0FBTztRQUNMLEVBQUUsRUFBRSxVQUFVLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQzlDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTztRQUN6QixPQUFPLEVBQUU7WUFDUCxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQzlDLFFBQVEsRUFBRSxJQUFJO1NBQ2Y7UUFDRCxNQUFNLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDcEMsVUFBVSxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO1FBQzVDLGFBQWEsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQztLQUNuRCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogSW50ZXJhY3Rpb24gRmxvdyBFbmdpbmVcbiAqIFxuICogR2VuZXJhdGVzIGludGVyYWN0aW9uIGZsb3dzIGZyb20gdXNlciBmbG93cyB3aXRoIGFuaW1hdGlvbnMsXG4gKiBlcnJvciBoYW5kbGluZywgYW5kIHN0YXRlIG1hbmFnZW1lbnQuXG4gKiBcbiAqIEB2ZXJzaW9uIDEuNC4wXG4gKi9cblxuaW1wb3J0IHR5cGUge1xuICBJbnRlcmFjdGlvbkZsb3csXG4gIFRyaWdnZXJEZWZpbml0aW9uLFxuICBBY3Rpb25TZXF1ZW5jZSxcbiAgU3RhdGVUcmFuc2l0aW9uLFxuICBBbmltYXRpb25EZWZpbml0aW9uLFxuICBFcnJvckhhbmRsZXIsXG4gIFVzZXJGbG93LFxuICBGbG93U3RlcCxcbiAgVmFsaWRhdGlvblJlc3VsdCxcbn0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBBTklNQVRJT05fREVGQVVMVFMgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZsb3cgUGF0dGVybiBSZWdpc3RyeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jb25zdCBGTE9XX1BBVFRFUk5TOiBSZWNvcmQ8c3RyaW5nLCBGbG93UGF0dGVybj4gPSB7XG4gIG5hdmlnYXRpb246IHtcbiAgICB0cmlnZ2VyVHlwZTogJ2NsaWNrJyxcbiAgICBhY3Rpb25UeXBlOiAnbmF2aWdhdGUnLFxuICAgIGRlZmF1bHRBbmltYXRpb246ICdmYWRlJyxcbiAgfSxcbiAgZm9ybToge1xuICAgIHRyaWdnZXJUeXBlOiAnc3VibWl0JyxcbiAgICBhY3Rpb25UeXBlOiAnZGlzcGF0Y2gnLFxuICAgIGRlZmF1bHRBbmltYXRpb246ICdzbGlkZScsXG4gIH0sXG4gIG1vZGFsOiB7XG4gICAgdHJpZ2dlclR5cGU6ICdjbGljaycsXG4gICAgYWN0aW9uVHlwZTogJ211dGF0ZScsXG4gICAgZGVmYXVsdEFuaW1hdGlvbjogJ3NjYWxlJyxcbiAgfSxcbiAgZGF0YToge1xuICAgIHRyaWdnZXJUeXBlOiAnbG9hZCcsXG4gICAgYWN0aW9uVHlwZTogJ2ZldGNoJyxcbiAgICBkZWZhdWx0QW5pbWF0aW9uOiAnZmFkZScsXG4gIH0sXG4gIHZhbGlkYXRpb246IHtcbiAgICB0cmlnZ2VyVHlwZTogJ2lucHV0JyxcbiAgICBhY3Rpb25UeXBlOiAndmFsaWRhdGUnLFxuICAgIGRlZmF1bHRBbmltYXRpb246ICdzaGFrZScsXG4gIH0sXG59O1xuXG5pbnRlcmZhY2UgRmxvd1BhdHRlcm4ge1xuICB0cmlnZ2VyVHlwZTogc3RyaW5nO1xuICBhY3Rpb25UeXBlOiBzdHJpbmc7XG4gIGRlZmF1bHRBbmltYXRpb246IHN0cmluZztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW50ZXJhY3Rpb24gRmxvdyBFbmdpbmUgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIEludGVyYWN0aW9uRmxvd0VuZ2luZSB7XG4gIHByaXZhdGUgZmxvd0NhY2hlOiBNYXA8c3RyaW5nLCBJbnRlcmFjdGlvbkZsb3dbXT4gPSBuZXcgTWFwKCk7XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGludGVyYWN0aW9uIGZsb3dzIGZyb20gdXNlciBmbG93XG4gICAqL1xuICBhc3luYyBnZW5lcmF0ZUZyb21Vc2VyRmxvdyh1c2VyRmxvdzogVXNlckZsb3cpOiBQcm9taXNlPEludGVyYWN0aW9uRmxvd1tdPiB7XG4gICAgLy8gQ2hlY2sgY2FjaGVcbiAgICBjb25zdCBjYWNoZWQgPSB0aGlzLmZsb3dDYWNoZS5nZXQodXNlckZsb3cuaWQpO1xuICAgIGlmIChjYWNoZWQpIHJldHVybiBjYWNoZWQ7XG5cbiAgICBjb25zdCBmbG93czogSW50ZXJhY3Rpb25GbG93W10gPSBbXTtcblxuICAgIC8vIEdlbmVyYXRlIGZsb3cgZm9yIGVhY2ggc3RlcFxuICAgIGZvciAoY29uc3Qgc3RlcCBvZiB1c2VyRmxvdy5zdGVwcykge1xuICAgICAgY29uc3QgZmxvdyA9IHRoaXMuZ2VuZXJhdGVTdGVwRmxvdyh1c2VyRmxvdywgc3RlcCk7XG4gICAgICBmbG93cy5wdXNoKGZsb3cpO1xuICAgIH1cblxuICAgIC8vIEFkZCBlbnRyeSBhbmQgZXhpdCBmbG93c1xuICAgIGZsb3dzLnVuc2hpZnQodGhpcy5nZW5lcmF0ZUVudHJ5Rmxvdyh1c2VyRmxvdykpO1xuICAgIFxuICAgIGlmICh1c2VyRmxvdy5leGl0UG9pbnQpIHtcbiAgICAgIGZsb3dzLnB1c2godGhpcy5nZW5lcmF0ZUV4aXRGbG93KHVzZXJGbG93KSk7XG4gICAgfVxuXG4gICAgdGhpcy5mbG93Q2FjaGUuc2V0KHVzZXJGbG93LmlkLCBmbG93cyk7XG4gICAgcmV0dXJuIGZsb3dzO1xuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIGludGVyYWN0aW9uIGZsb3dcbiAgICovXG4gIGFzeW5jIHZhbGlkYXRlRmxvdyhmbG93OiBJbnRlcmFjdGlvbkZsb3cpOiBQcm9taXNlPFZhbGlkYXRpb25SZXN1bHQ+IHtcbiAgICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IHNjb3JlID0gMTAwO1xuXG4gICAgLy8gVmFsaWRhdGUgdHJpZ2dlclxuICAgIGlmICghZmxvdy50cmlnZ2VyIHx8ICFmbG93LnRyaWdnZXIudHlwZSkge1xuICAgICAgZXJyb3JzLnB1c2goJ0Zsb3cgbXVzdCBoYXZlIGEgdmFsaWQgdHJpZ2dlcicpO1xuICAgICAgc2NvcmUgLT0gMjA7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgYWN0aW9uc1xuICAgIGlmICghZmxvdy5hY3Rpb25zIHx8IGZsb3cuYWN0aW9ucy5hY3Rpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZXJyb3JzLnB1c2goJ0Zsb3cgbXVzdCBoYXZlIGF0IGxlYXN0IG9uZSBhY3Rpb24nKTtcbiAgICAgIHNjb3JlIC09IDIwO1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIHN0YXRlc1xuICAgIGlmICghZmxvdy5zdGF0ZXMgfHwgZmxvdy5zdGF0ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB3YXJuaW5ncy5wdXNoKCdGbG93IHNob3VsZCBkZWZpbmUgc3RhdGUgdHJhbnNpdGlvbnMnKTtcbiAgICAgIHNjb3JlIC09IDEwO1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIGVycm9yIGhhbmRsaW5nXG4gICAgaWYgKCFmbG93LmVycm9ySGFuZGxpbmcgfHwgZmxvdy5lcnJvckhhbmRsaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgd2FybmluZ3MucHVzaCgnRmxvdyBzaG91bGQgaW5jbHVkZSBlcnJvciBoYW5kbGluZycpO1xuICAgICAgc2NvcmUgLT0gMTA7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgYW5pbWF0aW9uc1xuICAgIGZvciAoY29uc3QgYW5pbSBvZiBmbG93LmFuaW1hdGlvbnMpIHtcbiAgICAgIGlmIChhbmltLmR1cmF0aW9uID4gMTAwMCkge1xuICAgICAgICB3YXJuaW5ncy5wdXNoKGBBbmltYXRpb24gXCIke2FuaW0uaWR9XCIgaXMgdG9vIGxvbmcgKCR7YW5pbS5kdXJhdGlvbn1tcylgKTtcbiAgICAgICAgc2NvcmUgLT0gNTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgdW5yZWFjaGFibGUgc3RhdGVzXG4gICAgY29uc3QgcmVhY2hhYmxlU3RhdGVzID0gdGhpcy5nZXRSZWFjaGFibGVTdGF0ZXMoZmxvdyk7XG4gICAgY29uc3QgYWxsU3RhdGVzID0gbmV3IFNldChmbG93LnN0YXRlcy5tYXAocyA9PiBzLnRvKSk7XG4gICAgZm9yIChjb25zdCBzdGF0ZSBvZiBhbGxTdGF0ZXMpIHtcbiAgICAgIGlmICghcmVhY2hhYmxlU3RhdGVzLmhhcyhzdGF0ZSkpIHtcbiAgICAgICAgd2FybmluZ3MucHVzaChgU3RhdGUgXCIke3N0YXRlfVwiIG1heSBiZSB1bnJlYWNoYWJsZWApO1xuICAgICAgICBzY29yZSAtPSA1O1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZXJyb3JzLmxlbmd0aCA9PT0gMCxcbiAgICAgIGVycm9ycyxcbiAgICAgIHdhcm5pbmdzLFxuICAgICAgc2NvcmU6IE1hdGgubWF4KDAsIHNjb3JlKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGFuaW1hdGlvbiBmb3IgZmxvd1xuICAgKi9cbiAgZ2VuZXJhdGVBbmltYXRpb24oZmxvdzogSW50ZXJhY3Rpb25GbG93KTogQW5pbWF0aW9uRGVmaW5pdGlvbiB7XG4gICAgY29uc3QgcGF0dGVybiA9IEZMT1dfUEFUVEVSTlNbdGhpcy5kZXRlY3RGbG93UGF0dGVybihmbG93KV07XG4gICAgY29uc3QgZGVmYXVsdEFuaW0gPSBBTklNQVRJT05fREVGQVVMVFM7XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGBhbmltLSR7Zmxvdy5pZH1gLFxuICAgICAgdHlwZTogdGhpcy5tYXBBbmltYXRpb25UeXBlKHBhdHRlcm4uZGVmYXVsdEFuaW1hdGlvbiksXG4gICAgICBkdXJhdGlvbjogZGVmYXVsdEFuaW0uZHVyYXRpb24ubm9ybWFsLFxuICAgICAgZWFzaW5nOiBkZWZhdWx0QW5pbS5lYXNpbmcuZWFzZUluT3V0LFxuICAgICAgZGVsYXk6IDAsXG4gICAgICBpdGVyYXRpb25zOiAxLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQWRkIGVycm9yIGhhbmRsaW5nIHRvIGZsb3dcbiAgICovXG4gIGFkZEVycm9ySGFuZGxpbmcoZmxvdzogSW50ZXJhY3Rpb25GbG93KTogSW50ZXJhY3Rpb25GbG93IHtcbiAgICBjb25zdCBlcnJvckhhbmRsZXJzOiBFcnJvckhhbmRsZXJbXSA9IFtdO1xuXG4gICAgLy8gQWRkIG5ldHdvcmsgZXJyb3IgaGFuZGxlclxuICAgIGlmIChmbG93LmFjdGlvbnMuYWN0aW9ucy5zb21lKGEgPT4gYS50eXBlID09PSAnZmV0Y2gnKSkge1xuICAgICAgZXJyb3JIYW5kbGVycy5wdXNoKHtcbiAgICAgICAgZXJyb3JUeXBlOiAnTmV0d29ya0Vycm9yJyxcbiAgICAgICAgYWN0aW9uOiAncmV0cnknLFxuICAgICAgICBtZXNzYWdlOiAnTmV0d29yayBlcnJvci4gUmV0cnlpbmcuLi4nLFxuICAgICAgICBtYXhSZXRyaWVzOiAzLFxuICAgICAgfSk7XG4gICAgICBlcnJvckhhbmRsZXJzLnB1c2goe1xuICAgICAgICBlcnJvclR5cGU6ICdOZXR3b3JrRXJyb3InLFxuICAgICAgICBhY3Rpb246ICdub3RpZnknLFxuICAgICAgICBtZXNzYWdlOiAnVW5hYmxlIHRvIGNvbm5lY3QuIFBsZWFzZSBjaGVjayB5b3VyIGNvbm5lY3Rpb24uJyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCB2YWxpZGF0aW9uIGVycm9yIGhhbmRsZXJcbiAgICBpZiAoZmxvdy5hY3Rpb25zLmFjdGlvbnMuc29tZShhID0+IGEudHlwZSA9PT0gJ3ZhbGlkYXRlJykpIHtcbiAgICAgIGVycm9ySGFuZGxlcnMucHVzaCh7XG4gICAgICAgIGVycm9yVHlwZTogJ1ZhbGlkYXRpb25FcnJvcicsXG4gICAgICAgIGFjdGlvbjogJ25vdGlmeScsXG4gICAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZml4IHRoZSBlcnJvcnMgYWJvdmUuJyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCBnZW5lcmljIGVycm9yIGhhbmRsZXJcbiAgICBlcnJvckhhbmRsZXJzLnB1c2goe1xuICAgICAgZXJyb3JUeXBlOiAnVW5rbm93bkVycm9yJyxcbiAgICAgIGFjdGlvbjogJ2ZhbGxiYWNrJyxcbiAgICAgIG1lc3NhZ2U6ICdTb21ldGhpbmcgd2VudCB3cm9uZy4gUGxlYXNlIHRyeSBhZ2Fpbi4nLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLmZsb3csXG4gICAgICBlcnJvckhhbmRsaW5nOiBbLi4uKGZsb3cuZXJyb3JIYW5kbGluZyB8fCBbXSksIC4uLmVycm9ySGFuZGxlcnNdLFxuICAgIH07XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZVN0ZXBGbG93KHVzZXJGbG93OiBVc2VyRmxvdywgc3RlcDogRmxvd1N0ZXApOiBJbnRlcmFjdGlvbkZsb3cge1xuICAgIGNvbnN0IHBhdHRlcm4gPSB0aGlzLmRldGVjdFN0ZXBQYXR0ZXJuKHN0ZXApO1xuICAgIGNvbnN0IHRyaWdnZXIgPSB0aGlzLmNyZWF0ZVRyaWdnZXIoc3RlcCwgcGF0dGVybik7XG4gICAgY29uc3QgYWN0aW9ucyA9IHRoaXMuY3JlYXRlQWN0aW9ucyhzdGVwLCBwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGF0ZXMgPSB0aGlzLmNyZWF0ZVN0YXRlVHJhbnNpdGlvbnMoc3RlcCk7XG4gICAgY29uc3QgYW5pbWF0aW9ucyA9IHRoaXMuY3JlYXRlQW5pbWF0aW9ucyhzdGVwLCBwYXR0ZXJuKTtcbiAgICBjb25zdCBlcnJvckhhbmRsaW5nID0gdGhpcy5jcmVhdGVFcnJvckhhbmRsZXJzKHN0ZXAsIHBhdHRlcm4pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBgZmxvdy0ke3N0ZXAuaWR9YCxcbiAgICAgIHRyaWdnZXIsXG4gICAgICBhY3Rpb25zLFxuICAgICAgc3RhdGVzLFxuICAgICAgYW5pbWF0aW9ucyxcbiAgICAgIGVycm9ySGFuZGxpbmcsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVFbnRyeUZsb3codXNlckZsb3c6IFVzZXJGbG93KTogSW50ZXJhY3Rpb25GbG93IHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGBmbG93LWVudHJ5LSR7dXNlckZsb3cuaWR9YCxcbiAgICAgIHRyaWdnZXI6IHtcbiAgICAgICAgdHlwZTogJ2xvYWQnLFxuICAgICAgICB0YXJnZXQ6IHVzZXJGbG93LmVudHJ5UG9pbnQsXG4gICAgICB9LFxuICAgICAgYWN0aW9uczoge1xuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgeyB0eXBlOiAnZGlzcGF0Y2gnLCB0YXJnZXQ6ICdvbkVudGVyJywgcGF5bG9hZDogeyBmbG93OiB1c2VyRmxvdy5pZCB9IH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgc3RhdGVzOiBbXG4gICAgICAgIHsgZnJvbTogJ2luaXRpYWwnLCB0bzogJ2FjdGl2ZScsIGVmZmVjdDogJ29uRW50ZXInIH0sXG4gICAgICBdLFxuICAgICAgYW5pbWF0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdlbnRyeS1mYWRlJyxcbiAgICAgICAgICB0eXBlOiAnZmFkZScsXG4gICAgICAgICAgZHVyYXRpb246IEFOSU1BVElPTl9ERUZBVUxUUy5kdXJhdGlvbi5ub3JtYWwsXG4gICAgICAgICAgZWFzaW5nOiAnZWFzZS1pbi1vdXQnLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGVycm9ySGFuZGxpbmc6IFtdLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlRXhpdEZsb3codXNlckZsb3c6IFVzZXJGbG93KTogSW50ZXJhY3Rpb25GbG93IHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGBmbG93LWV4aXQtJHt1c2VyRmxvdy5pZH1gLFxuICAgICAgdHJpZ2dlcjoge1xuICAgICAgICB0eXBlOiAnY2xpY2snLFxuICAgICAgICB0YXJnZXQ6IHVzZXJGbG93LmV4aXRQb2ludCB8fCAnY2xvc2UnLFxuICAgICAgfSxcbiAgICAgIGFjdGlvbnM6IHtcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgIHsgdHlwZTogJ25hdmlnYXRlJywgdGFyZ2V0OiAncHJldmlvdXMnIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgc3RhdGVzOiBbXG4gICAgICAgIHsgZnJvbTogJ2FjdGl2ZScsIHRvOiAnZXhpdGVkJywgZWZmZWN0OiAnb25FeGl0JyB9LFxuICAgICAgXSxcbiAgICAgIGFuaW1hdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnZXhpdC1mYWRlJyxcbiAgICAgICAgICB0eXBlOiAnZmFkZScsXG4gICAgICAgICAgZHVyYXRpb246IEFOSU1BVElPTl9ERUZBVUxUUy5kdXJhdGlvbi5mYXN0LFxuICAgICAgICAgIGVhc2luZzogJ2Vhc2Utb3V0JyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBlcnJvckhhbmRsaW5nOiBbXSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBkZXRlY3RTdGVwUGF0dGVybihzdGVwOiBGbG93U3RlcCk6IEZsb3dQYXR0ZXJuIHtcbiAgICBjb25zdCBhY3Rpb24gPSBzdGVwLmFjdGlvbi50b0xvd2VyQ2FzZSgpO1xuXG4gICAgaWYgKGFjdGlvbi5pbmNsdWRlcygnbmF2aWdhdGUnKSB8fCBhY3Rpb24uaW5jbHVkZXMoJ2dvIHRvJykgfHwgYWN0aW9uLmluY2x1ZGVzKCdvcGVuJykpIHtcbiAgICAgIHJldHVybiBGTE9XX1BBVFRFUk5TLm5hdmlnYXRpb247XG4gICAgfVxuICAgIGlmIChhY3Rpb24uaW5jbHVkZXMoJ3N1Ym1pdCcpIHx8IGFjdGlvbi5pbmNsdWRlcygnc2F2ZScpIHx8IGFjdGlvbi5pbmNsdWRlcygnY3JlYXRlJykpIHtcbiAgICAgIHJldHVybiBGTE9XX1BBVFRFUk5TLmZvcm07XG4gICAgfVxuICAgIGlmIChhY3Rpb24uaW5jbHVkZXMoJ21vZGFsJykgfHwgYWN0aW9uLmluY2x1ZGVzKCdkaWFsb2cnKSB8fCBhY3Rpb24uaW5jbHVkZXMoJ3BvcHVwJykpIHtcbiAgICAgIHJldHVybiBGTE9XX1BBVFRFUk5TLm1vZGFsO1xuICAgIH1cbiAgICBpZiAoYWN0aW9uLmluY2x1ZGVzKCdsb2FkJykgfHwgYWN0aW9uLmluY2x1ZGVzKCdmZXRjaCcpIHx8IGFjdGlvbi5pbmNsdWRlcygnZ2V0JykpIHtcbiAgICAgIHJldHVybiBGTE9XX1BBVFRFUk5TLmRhdGE7XG4gICAgfVxuICAgIGlmIChhY3Rpb24uaW5jbHVkZXMoJ3ZhbGlkYXRlJykgfHwgYWN0aW9uLmluY2x1ZGVzKCdjaGVjaycpIHx8IGFjdGlvbi5pbmNsdWRlcygndmVyaWZ5JykpIHtcbiAgICAgIHJldHVybiBGTE9XX1BBVFRFUk5TLnZhbGlkYXRpb247XG4gICAgfVxuXG4gICAgcmV0dXJuIEZMT1dfUEFUVEVSTlMubmF2aWdhdGlvbjsgLy8gRGVmYXVsdFxuICB9XG5cbiAgcHJpdmF0ZSBkZXRlY3RGbG93UGF0dGVybihmbG93OiBJbnRlcmFjdGlvbkZsb3cpOiBzdHJpbmcge1xuICAgIGlmIChmbG93LnRyaWdnZXIudHlwZSA9PT0gJ3N1Ym1pdCcpIHJldHVybiAnZm9ybSc7XG4gICAgaWYgKGZsb3cudHJpZ2dlci50eXBlID09PSAnbG9hZCcpIHJldHVybiAnZGF0YSc7XG4gICAgaWYgKGZsb3cuYWN0aW9ucy5hY3Rpb25zLnNvbWUoYSA9PiBhLnR5cGUgPT09ICd2YWxpZGF0ZScpKSByZXR1cm4gJ3ZhbGlkYXRpb24nO1xuICAgIGlmIChmbG93LmFjdGlvbnMuYWN0aW9ucy5zb21lKGEgPT4gYS50eXBlID09PSAnbmF2aWdhdGUnKSkgcmV0dXJuICduYXZpZ2F0aW9uJztcbiAgICByZXR1cm4gJ25hdmlnYXRpb24nOyAvLyBEZWZhdWx0XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVRyaWdnZXIoc3RlcDogRmxvd1N0ZXAsIHBhdHRlcm46IEZsb3dQYXR0ZXJuKTogVHJpZ2dlckRlZmluaXRpb24ge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiBwYXR0ZXJuLnRyaWdnZXJUeXBlIGFzIFRyaWdnZXJEZWZpbml0aW9uWyd0eXBlJ10sXG4gICAgICB0YXJnZXQ6IHN0ZXAuaWQsXG4gICAgICBjb25kaXRpb246IHN0ZXAuYWx0ZXJuYXRpdmUgPyBgaGFzQWx0ZXJuYXRpdmUoJHtzdGVwLmFsdGVybmF0aXZlfSlgIDogdW5kZWZpbmVkLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUFjdGlvbnMoc3RlcDogRmxvd1N0ZXAsIHBhdHRlcm46IEZsb3dQYXR0ZXJuKTogQWN0aW9uU2VxdWVuY2Uge1xuICAgIGNvbnN0IGFjdGlvbnM6IEFycmF5PHsgdHlwZTogc3RyaW5nOyB0YXJnZXQ/OiBzdHJpbmc7IHBheWxvYWQ/OiBhbnkgfT4gPSBbXTtcblxuICAgIC8vIFByaW1hcnkgYWN0aW9uIGJhc2VkIG9uIHBhdHRlcm5cbiAgICBhY3Rpb25zLnB1c2goe1xuICAgICAgdHlwZTogcGF0dGVybi5hY3Rpb25UeXBlLFxuICAgICAgdGFyZ2V0OiBzdGVwLm5leHRTdGVwIHx8IHN0ZXAuc2NyZWVuLFxuICAgICAgcGF5bG9hZDogeyBzdGVwSWQ6IHN0ZXAuaWQgfSxcbiAgICB9KTtcblxuICAgIC8vIEFkZCBhbHRlcm5hdGl2ZSBhY3Rpb24gaWYgZXhpc3RzXG4gICAgaWYgKHN0ZXAuYWx0ZXJuYXRpdmUpIHtcbiAgICAgIGFjdGlvbnMucHVzaCh7XG4gICAgICAgIHR5cGU6IHBhdHRlcm4uYWN0aW9uVHlwZSxcbiAgICAgICAgdGFyZ2V0OiBzdGVwLmFsdGVybmF0aXZlLFxuICAgICAgICBwYXlsb2FkOiB7IHN0ZXBJZDogc3RlcC5pZCwgYWx0ZXJuYXRpdmU6IHRydWUgfSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBhY3Rpb25zOiBhY3Rpb25zIGFzIGFueSxcbiAgICAgIHBhcmFsbGVsOiBmYWxzZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTdGF0ZVRyYW5zaXRpb25zKHN0ZXA6IEZsb3dTdGVwKTogU3RhdGVUcmFuc2l0aW9uW10ge1xuICAgIGNvbnN0IHN0YXRlczogU3RhdGVUcmFuc2l0aW9uW10gPSBbXTtcblxuICAgIC8vIEluaXRpYWwgc3RhdGUgdHJhbnNpdGlvblxuICAgIHN0YXRlcy5wdXNoKHtcbiAgICAgIGZyb206ICdpZGxlJyxcbiAgICAgIHRvOiAncGVuZGluZycsXG4gICAgICBndWFyZDogYHRyaWdnZXIoJHtzdGVwLmlkfSlgLFxuICAgICAgZWZmZWN0OiAnb25TdGFydCcsXG4gICAgfSk7XG5cbiAgICAvLyBTdWNjZXNzIHRyYW5zaXRpb25cbiAgICBpZiAoc3RlcC5uZXh0U3RlcCkge1xuICAgICAgc3RhdGVzLnB1c2goe1xuICAgICAgICBmcm9tOiAncGVuZGluZycsXG4gICAgICAgIHRvOiAnc3VjY2VzcycsXG4gICAgICAgIGd1YXJkOiAnc3VjY2VzcycsXG4gICAgICAgIGVmZmVjdDogJ29uQ29tcGxldGUnLFxuICAgICAgfSk7XG4gICAgICBzdGF0ZXMucHVzaCh7XG4gICAgICAgIGZyb206ICdzdWNjZXNzJyxcbiAgICAgICAgdG86ICdpZGxlJyxcbiAgICAgICAgZWZmZWN0OiAnb25SZXNldCcsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBFcnJvciB0cmFuc2l0aW9uXG4gICAgc3RhdGVzLnB1c2goe1xuICAgICAgZnJvbTogJ3BlbmRpbmcnLFxuICAgICAgdG86ICdlcnJvcicsXG4gICAgICBndWFyZDogJ2Vycm9yJyxcbiAgICAgIGVmZmVjdDogJ29uRXJyb3InLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN0YXRlcztcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQW5pbWF0aW9ucyhzdGVwOiBGbG93U3RlcCwgcGF0dGVybjogRmxvd1BhdHRlcm4pOiBBbmltYXRpb25EZWZpbml0aW9uW10ge1xuICAgIGNvbnN0IGFuaW1hdGlvbnM6IEFuaW1hdGlvbkRlZmluaXRpb25bXSA9IFtdO1xuXG4gICAgLy8gRW50cnkgYW5pbWF0aW9uXG4gICAgYW5pbWF0aW9ucy5wdXNoKHtcbiAgICAgIGlkOiBgYW5pbS0ke3N0ZXAuaWR9LWVudGVyYCxcbiAgICAgIHR5cGU6IHRoaXMubWFwQW5pbWF0aW9uVHlwZShwYXR0ZXJuLmRlZmF1bHRBbmltYXRpb24pLFxuICAgICAgZHVyYXRpb246IEFOSU1BVElPTl9ERUZBVUxUUy5kdXJhdGlvbi5ub3JtYWwsXG4gICAgICBlYXNpbmc6ICdlYXNlLW91dCcsXG4gICAgfSk7XG5cbiAgICAvLyBFeGl0IGFuaW1hdGlvbiBpZiB0aGVyZSdzIGEgbmV4dCBzdGVwXG4gICAgaWYgKHN0ZXAubmV4dFN0ZXApIHtcbiAgICAgIGFuaW1hdGlvbnMucHVzaCh7XG4gICAgICAgIGlkOiBgYW5pbS0ke3N0ZXAuaWR9LWV4aXRgLFxuICAgICAgICB0eXBlOiAnZmFkZScsXG4gICAgICAgIGR1cmF0aW9uOiBBTklNQVRJT05fREVGQVVMVFMuZHVyYXRpb24uZmFzdCxcbiAgICAgICAgZWFzaW5nOiAnZWFzZS1pbicsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gYW5pbWF0aW9ucztcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRXJyb3JIYW5kbGVycyhzdGVwOiBGbG93U3RlcCwgcGF0dGVybjogRmxvd1BhdHRlcm4pOiBFcnJvckhhbmRsZXJbXSB7XG4gICAgY29uc3QgaGFuZGxlcnM6IEVycm9ySGFuZGxlcltdID0gW107XG5cbiAgICAvLyBBZGQgcmV0cnkgaGFuZGxlciBmb3IgZGF0YSBvcGVyYXRpb25zXG4gICAgaWYgKHBhdHRlcm4uYWN0aW9uVHlwZSA9PT0gJ2ZldGNoJyB8fCBwYXR0ZXJuLmFjdGlvblR5cGUgPT09ICdkaXNwYXRjaCcpIHtcbiAgICAgIGhhbmRsZXJzLnB1c2goe1xuICAgICAgICBlcnJvclR5cGU6ICdOZXR3b3JrRXJyb3InLFxuICAgICAgICBhY3Rpb246ICdyZXRyeScsXG4gICAgICAgIG1heFJldHJpZXM6IDMsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdmFsaWRhdGlvbiBoYW5kbGVyXG4gICAgaWYgKHBhdHRlcm4uYWN0aW9uVHlwZSA9PT0gJ3ZhbGlkYXRlJykge1xuICAgICAgaGFuZGxlcnMucHVzaCh7XG4gICAgICAgIGVycm9yVHlwZTogJ1ZhbGlkYXRpb25FcnJvcicsXG4gICAgICAgIGFjdGlvbjogJ25vdGlmeScsXG4gICAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgY29ycmVjdCB0aGUgaGlnaGxpZ2h0ZWQgZmllbGRzLicsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmljIGZhbGxiYWNrXG4gICAgaGFuZGxlcnMucHVzaCh7XG4gICAgICBlcnJvclR5cGU6ICdVbmtub3duRXJyb3InLFxuICAgICAgYWN0aW9uOiAnYWJvcnQnLFxuICAgICAgbWVzc2FnZTogJ0FuIHVuZXhwZWN0ZWQgZXJyb3Igb2NjdXJyZWQuJyxcbiAgICB9KTtcblxuICAgIHJldHVybiBoYW5kbGVycztcbiAgfVxuXG4gIHByaXZhdGUgbWFwQW5pbWF0aW9uVHlwZSh0eXBlOiBzdHJpbmcpOiBBbmltYXRpb25EZWZpbml0aW9uWyd0eXBlJ10ge1xuICAgIGNvbnN0IHR5cGVNYXA6IFJlY29yZDxzdHJpbmcsIEFuaW1hdGlvbkRlZmluaXRpb25bJ3R5cGUnXT4gPSB7XG4gICAgICBmYWRlOiAnZmFkZScsXG4gICAgICBzbGlkZTogJ3NsaWRlJyxcbiAgICAgIHNjYWxlOiAnc2NhbGUnLFxuICAgICAgc2hha2U6ICdjdXN0b20nLFxuICAgIH07XG4gICAgcmV0dXJuIHR5cGVNYXBbdHlwZV0gfHwgJ2ZhZGUnO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZWFjaGFibGVTdGF0ZXMoZmxvdzogSW50ZXJhY3Rpb25GbG93KTogU2V0PHN0cmluZz4ge1xuICAgIGNvbnN0IHJlYWNoYWJsZSA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGluaXRpYWxTdGF0ZXMgPSBmbG93LnN0YXRlcy5maWx0ZXIocyA9PiBzLmZyb20gPT09ICdpZGxlJyB8fCBzLmZyb20gPT09ICdpbml0aWFsJyk7XG4gICAgXG4gICAgZm9yIChjb25zdCBzdGF0ZSBvZiBpbml0aWFsU3RhdGVzKSB7XG4gICAgICByZWFjaGFibGUuYWRkKHN0YXRlLnRvKTtcbiAgICB9XG5cbiAgICAvLyBCRlMgdG8gZmluZCBhbGwgcmVhY2hhYmxlIHN0YXRlc1xuICAgIGNvbnN0IHF1ZXVlID0gWy4uLmluaXRpYWxTdGF0ZXMubWFwKHMgPT4gcy50byldO1xuICAgIHdoaWxlIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBjdXJyZW50U3RhdGUgPSBxdWV1ZS5zaGlmdCgpITtcbiAgICAgIGNvbnN0IHRyYW5zaXRpb25zID0gZmxvdy5zdGF0ZXMuZmlsdGVyKHMgPT4gcy5mcm9tID09PSBjdXJyZW50U3RhdGUpO1xuICAgICAgXG4gICAgICBmb3IgKGNvbnN0IHRyYW5zaXRpb24gb2YgdHJhbnNpdGlvbnMpIHtcbiAgICAgICAgaWYgKCFyZWFjaGFibGUuaGFzKHRyYW5zaXRpb24udG8pKSB7XG4gICAgICAgICAgcmVhY2hhYmxlLmFkZCh0cmFuc2l0aW9uLnRvKTtcbiAgICAgICAgICBxdWV1ZS5wdXNoKHRyYW5zaXRpb24udG8pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlYWNoYWJsZTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBGYWN0b3J5IEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVJbnRlcmFjdGlvbkZsb3dFbmdpbmUoKTogSW50ZXJhY3Rpb25GbG93RW5naW5lIHtcbiAgcmV0dXJuIG5ldyBJbnRlcmFjdGlvbkZsb3dFbmdpbmUoKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVXRpbGl0eSBGdW5jdGlvbnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBHZW5lcmF0ZSBzdGF0ZSBtYWNoaW5lIGNvZGUgZnJvbSBmbG93XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVN0YXRlTWFjaGluZShmbG93OiBJbnRlcmFjdGlvbkZsb3cpOiBzdHJpbmcge1xuICBjb25zdCBzdGF0ZXMgPSBmbG93LnN0YXRlcy5tYXAocyA9PiBcbiAgICBgICAnJHtzLmZyb219Jzoge1xuICAgIG9uOiB7XG4gICAgICAke3MuZ3VhcmQgfHwgJ1RSQU5TSVRJT04nfTogJyR7cy50b30nJHtzLmVmZmVjdCA/IGAsXFxuICAgICAgYWN0aW9uOiAnJHtzLmVmZmVjdH0nYCA6ICcnfVxuICAgIH1cbiAgfWBcbiAgKS5qb2luKCcsXFxuJyk7XG5cbiAgcmV0dXJuIGBjb25zdCBtYWNoaW5lID0gY3JlYXRlTWFjaGluZSh7XG4gIGluaXRpYWw6ICdpZGxlJyxcbiAgc3RhdGVzOiB7XG4ke3N0YXRlc31cbiAgfVxufSk7YDtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBhbmltYXRpb24gQ1NTIGZyb20gZmxvd1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVBbmltYXRpb25DU1MoZmxvd3M6IEludGVyYWN0aW9uRmxvd1tdKTogc3RyaW5nIHtcbiAgY29uc3QgY3NzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgZmxvdyBvZiBmbG93cykge1xuICAgIGZvciAoY29uc3QgYW5pbSBvZiBmbG93LmFuaW1hdGlvbnMpIHtcbiAgICAgIGNzcy5wdXNoKGBAa2V5ZnJhbWVzICR7YW5pbS5pZH0ge1xuICAke2dlbmVyYXRlS2V5ZnJhbWVzKGFuaW0udHlwZSl9XG59YCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNzcy5qb2luKCdcXG5cXG4nKTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVLZXlmcmFtZXModHlwZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAnZmFkZSc6XG4gICAgICByZXR1cm4gJzAlIHsgb3BhY2l0eTogMDsgfVxcbiAgMTAwJSB7IG9wYWNpdHk6IDE7IH0nO1xuICAgIGNhc2UgJ3NsaWRlJzpcbiAgICAgIHJldHVybiAnMCUgeyB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMjBweCk7IG9wYWNpdHk6IDA7IH1cXG4gIDEwMCUgeyB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMCk7IG9wYWNpdHk6IDE7IH0nO1xuICAgIGNhc2UgJ3NjYWxlJzpcbiAgICAgIHJldHVybiAnMCUgeyB0cmFuc2Zvcm06IHNjYWxlKDAuOSk7IG9wYWNpdHk6IDA7IH1cXG4gIDEwMCUgeyB0cmFuc2Zvcm06IHNjYWxlKDEpOyBvcGFjaXR5OiAxOyB9JztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICcwJSB7IG9wYWNpdHk6IDA7IH1cXG4gIDEwMCUgeyBvcGFjaXR5OiAxOyB9JztcbiAgfVxufVxuXG4vKipcbiAqIENhbGN1bGF0ZSBmbG93IGNvbXBsZXhpdHkgc2NvcmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZUZsb3dDb21wbGV4aXR5KGZsb3c6IEludGVyYWN0aW9uRmxvdyk6IG51bWJlciB7XG4gIGxldCBzY29yZSA9IDA7XG5cbiAgLy8gQmFzZSBzY29yZSBmcm9tIGFjdGlvbnNcbiAgc2NvcmUgKz0gZmxvdy5hY3Rpb25zLmFjdGlvbnMubGVuZ3RoICogMTA7XG5cbiAgLy8gQ29tcGxleGl0eSBmcm9tIHN0YXRlc1xuICBzY29yZSArPSBmbG93LnN0YXRlcy5sZW5ndGggKiA1O1xuXG4gIC8vIENvbXBsZXhpdHkgZnJvbSBlcnJvciBoYW5kbGVyc1xuICBzY29yZSArPSBmbG93LmVycm9ySGFuZGxpbmcubGVuZ3RoICogMztcblxuICAvLyBDb21wbGV4aXR5IGZyb20gYW5pbWF0aW9uc1xuICBzY29yZSArPSBmbG93LmFuaW1hdGlvbnMubGVuZ3RoICogMjtcblxuICByZXR1cm4gc2NvcmU7XG59XG5cbi8qKlxuICogTWVyZ2UgbXVsdGlwbGUgZmxvd3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlRmxvd3MoZmxvd3M6IEludGVyYWN0aW9uRmxvd1tdKTogSW50ZXJhY3Rpb25GbG93IHtcbiAgaWYgKGZsb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IG1lcmdlIGVtcHR5IGZsb3dzJyk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGlkOiBgbWVyZ2VkLSR7Zmxvd3MubWFwKGYgPT4gZi5pZCkuam9pbignLScpfWAsXG4gICAgdHJpZ2dlcjogZmxvd3NbMF0udHJpZ2dlcixcbiAgICBhY3Rpb25zOiB7XG4gICAgICBhY3Rpb25zOiBmbG93cy5mbGF0TWFwKGYgPT4gZi5hY3Rpb25zLmFjdGlvbnMpLFxuICAgICAgcGFyYWxsZWw6IHRydWUsXG4gICAgfSxcbiAgICBzdGF0ZXM6IGZsb3dzLmZsYXRNYXAoZiA9PiBmLnN0YXRlcyksXG4gICAgYW5pbWF0aW9uczogZmxvd3MuZmxhdE1hcChmID0+IGYuYW5pbWF0aW9ucyksXG4gICAgZXJyb3JIYW5kbGluZzogZmxvd3MuZmxhdE1hcChmID0+IGYuZXJyb3JIYW5kbGluZyksXG4gIH07XG59XG4iXX0=