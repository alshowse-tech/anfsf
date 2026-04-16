/**
 * ANFSF V4 Layer 8.5 - Sandbox Executor Implementation
 *
 * Secure sandbox execution environment for skills with memory and time limits.
 * Features: isolated execution, resource limits, console capture, API restrictions.
 */
import { ExecutionResult, SandboxConfig, SandboxContext } from './types';
/**
 * SandboxExecutor - Secure execution environment for skills
 */
export declare class SandboxExecutor {
    private config;
    private consoleBuffer;
    private executionStartTime;
    private memoryUsage;
    private taskType;
    constructor(config?: SandboxConfig, taskType?: string);
    /**
     * Execute code in sandbox
     */
    execute(code: string, context?: SandboxContext): Promise<ExecutionResult>;
    private createSandboxContext;
    private createSandboxConsole;
    private executeWithTimeout;
    private createErrorResult;
    /**
     * Get console output from last execution
     */
    getConsoleOutput(): string[];
    /**
     * Clear console buffer
     */
    clearConsole(): void;
    /**
     * Get memory usage from last execution
     */
    getMemoryUsage(): number;
    /**
     * Update sandbox configuration
     */
    updateConfig(config: Partial<SandboxConfig>): void;
}
/**
 * safeEval - Evaluate code in a safe sandbox
 *
 * @param code - Code to evaluate
 * @param context - Execution context
 * @param config - Sandbox configuration
 */
export declare function safeEval(code: string, context?: SandboxContext, config?: SandboxConfig): Promise<ExecutionResult>;
export default SandboxExecutor;
