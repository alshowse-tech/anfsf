/**
 * Interaction Flow Engine
 *
 * Generates interaction flows from user flows with animations,
 * error handling, and state management.
 *
 * @version 1.4.0
 */
import type { InteractionFlow, AnimationDefinition, UserFlow, ValidationResult } from './types';
export declare class InteractionFlowEngine {
    private flowCache;
    /**
     * Generate interaction flows from user flow
     */
    generateFromUserFlow(userFlow: UserFlow): Promise<InteractionFlow[]>;
    /**
     * Validate interaction flow
     */
    validateFlow(flow: InteractionFlow): Promise<ValidationResult>;
    /**
     * Generate animation for flow
     */
    generateAnimation(flow: InteractionFlow): AnimationDefinition;
    /**
     * Add error handling to flow
     */
    addErrorHandling(flow: InteractionFlow): InteractionFlow;
    private generateStepFlow;
    private generateEntryFlow;
    private generateExitFlow;
    private detectStepPattern;
    private detectFlowPattern;
    private createTrigger;
    private createActions;
    private createStateTransitions;
    private createAnimations;
    private createErrorHandlers;
    private mapAnimationType;
    private getReachableStates;
}
export declare function createInteractionFlowEngine(): InteractionFlowEngine;
/**
 * Generate state machine code from flow
 */
export declare function generateStateMachine(flow: InteractionFlow): string;
/**
 * Generate animation CSS from flow
 */
export declare function generateAnimationCSS(flows: InteractionFlow[]): string;
/**
 * Calculate flow complexity score
 */
export declare function calculateFlowComplexity(flow: InteractionFlow): number;
/**
 * Merge multiple flows
 */
export declare function mergeFlows(flows: InteractionFlow[]): InteractionFlow;
