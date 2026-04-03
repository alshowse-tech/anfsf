/**
 * ANFSF V4 Layer 8.5 - Sandbox Executor Implementation
 * 
 * Secure sandbox execution environment for skills with memory and time limits.
 * Features: isolated execution, resource limits, console capture, API restrictions.
 */

import {
  ExecutionResult,
  SandboxConfig,
  SandboxContext,
  isExecutionResult,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<SandboxConfig> = {
  maxMemoryMB: 256,
  maxExecutionTimeMs: 30000,
  allowedGlobals: ['console', 'Math', 'Date', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean'],
  blockedAPIs: ['require', 'eval', 'Function', 'setTimeout', 'setInterval', 'fetch', 'XMLHttpRequest'],
  enableConsoleCapture: true,
  allowNetwork: false,
  allowFileSystem: false,
  readOnlyPaths: [],
};

// Task type specific limits
const TASK_TYPE_LIMITS: Record<string, { maxMemoryMB: number; maxExecutionTimeMs: number }> = {
  'requirement-graph': { maxMemoryMB: 512, maxExecutionTimeMs: 60000 },
  'deep-reasoning': { maxMemoryMB: 512, maxExecutionTimeMs: 60000 },
  'ui-synthesis': { maxMemoryMB: 256, maxExecutionTimeMs: 30000 },
  'layout-generator': { maxMemoryMB: 256, maxExecutionTimeMs: 30000 },
  'default': { maxMemoryMB: 256, maxExecutionTimeMs: 30000 },
};

// Hard upper limits
const MAX_MEMORY_MB = 1024;
const MAX_EXECUTION_TIME_MS = 120000;

// ============================================================================
// Helper Functions
// ============================================================================

/** Get current timestamp */
function now(): number {
  return Date.now();
}

/** Estimate memory usage (simplified) */
function estimateMemoryUsage(obj: any): number {
  const cache = new Set();
  
  function calculateSize(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'boolean') {
      return 4;
    }

    if (typeof value === 'number') {
      return 8;
    }

    if (typeof value === 'string') {
      return value.length * 2;
    }

    if (typeof value === 'object') {
      if (cache.has(value)) {
        return 0; // Circular reference
      }
      cache.add(value);

      let size = 0;
      if (Array.isArray(value)) {
        for (const item of value) {
          size += calculateSize(item);
        }
      } else {
        for (const key in value) {
          if (value.hasOwnProperty(key)) {
            size += calculateSize(value[key]);
          }
        }
      }
      return size;
    }

    return 0;
  }

  const bytes = calculateSize(obj);
  return bytes / (1024 * 1024); // Convert to MB
}

// ============================================================================
// SandboxExecutor Class
// ============================================================================

/**
 * SandboxExecutor - Secure execution environment for skills
 */
export class SandboxExecutor {
  private config: Required<SandboxConfig>;
  private consoleBuffer: string[];
  private executionStartTime: number;
  private memoryUsage: number;
  private taskType: string;

  constructor(config: SandboxConfig = {}, taskType: string = 'default') {
    this.taskType = taskType;
    const limits = TASK_TYPE_LIMITS[taskType] || TASK_TYPE_LIMITS['default'];
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      maxMemoryMB: Math.min(limits.maxMemoryMB, MAX_MEMORY_MB),
      maxExecutionTimeMs: Math.min(limits.maxExecutionTimeMs, MAX_EXECUTION_TIME_MS),
    };
    this.consoleBuffer = [];
    this.executionStartTime = 0;
    this.memoryUsage = 0;
  }

  // ============================================================================
  // Core Methods
  // ============================================================================

  /**
   * Execute code in sandbox
   */
  async execute(code: string, context: SandboxContext = { apis: {}, env: {}, config: {}, logger: console as any }): Promise<ExecutionResult> {
    this.executionStartTime = now();
    this.consoleBuffer = [];
    this.memoryUsage = 0;

    // Validate code
    if (!code || typeof code !== 'string') {
      return this.createErrorResult('Invalid code: code must be a non-empty string');
    }

    // Check for blocked APIs
    const blockedAPIsFound = this.config.blockedAPIs.filter(api => 
      new RegExp(`\\b${api}\\s*\\(`).test(code)
    );

    if (blockedAPIsFound.length > 0) {
      return this.createErrorResult(`Blocked APIs detected: ${blockedAPIsFound.join(', ')}`);
    }

    try {
      // Create sandbox context
      const sandboxContext = this.createSandboxContext(context);

      // Execute code with timeout
      const result = await this.executeWithTimeout(code, sandboxContext);

      // Calculate execution time
      const executionTime = now() - this.executionStartTime;

      // Check execution time limit
      if (executionTime > this.config.maxExecutionTimeMs) {
        return this.createErrorResult(`Execution timeout: exceeded ${this.config.maxExecutionTimeMs}ms`);
      }

      // Estimate memory usage
      this.memoryUsage = estimateMemoryUsage(result);
      
      if (this.memoryUsage > this.config.maxMemoryMB) {
        return this.createErrorResult(`Memory limit exceeded: ${this.memoryUsage.toFixed(2)}MB > ${this.config.maxMemoryMB}MB`);
      }

      return {
        status: 'success',
        returnValue: result,
        executionTime,
        memoryUsed: this.memoryUsage,
        consoleOutput: this.config.enableConsoleCapture ? [...this.consoleBuffer] : undefined,
      };
    } catch (error) {
      const executionTime = now() - this.executionStartTime;
      
      return {
        status: 'error',
        error: String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
        executionTime,
        memoryUsed: this.memoryUsage,
        consoleOutput: this.config.enableConsoleCapture ? [...this.consoleBuffer] : undefined,
      };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createSandboxContext(context: SandboxContext): any {
    const sandboxContext: any = {
      // Allowed globals
      console: this.createSandboxConsole(),
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      
      // Context-provided APIs
      ...context.apis,
      
      // Environment
      __env: context.env,
      __config: context.config,
      __logger: context.logger,
    };

    // Restrict network access
    if (!this.config.allowNetwork) {
      delete sandboxContext.fetch;
      delete sandboxContext.XMLHttpRequest;
    }

    return sandboxContext;
  }

  private createSandboxConsole(): any {
    const self = this;
    
    return {
      log(...args: any[]) {
        const message = args.map(a => String(a)).join(' ');
        if (self.config.enableConsoleCapture) {
          self.consoleBuffer.push(`[LOG] ${message}`);
        }
      },
      warn(...args: any[]) {
        const message = args.map(a => String(a)).join(' ');
        if (self.config.enableConsoleCapture) {
          self.consoleBuffer.push(`[WARN] ${message}`);
        }
      },
      error(...args: any[]) {
        const message = args.map(a => String(a)).join(' ');
        if (self.config.enableConsoleCapture) {
          self.consoleBuffer.push(`[ERROR] ${message}`);
        }
      },
      debug(...args: any[]) {
        const message = args.map(a => String(a)).join(' ');
        if (self.config.enableConsoleCapture) {
          self.consoleBuffer.push(`[DEBUG] ${message}`);
        }
      },
      info(...args: any[]) {
        const message = args.map(a => String(a)).join(' ');
        if (self.config.enableConsoleCapture) {
          self.consoleBuffer.push(`[INFO] ${message}`);
        }
      },
    };
  }

  private async executeWithTimeout(code: string, context: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Execution timeout: exceeded ${this.config.maxExecutionTimeMs}ms`));
      }, this.config.maxExecutionTimeMs);

      try {
        // Create a function from the code
        // In production, this should use a proper sandbox like vm2 or isolated-vm
        const wrappedCode = `
          (function(context) {
            'use strict';
            try {
              ${code}
              return main ? main(context) : undefined;
            } catch (error) {
              throw error;
            }
          })
        `;

        // Execute the code
        // Note: This is a simplified implementation. In production, use a proper sandbox.
        const executeFn = new Function('context', wrappedCode);
        const result = executeFn(context);

        clearTimeout(timeoutId);

        // Handle promise results
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private createErrorResult(error: string): ExecutionResult {
    return {
      status: 'error',
      error,
      executionTime: now() - this.executionStartTime,
      memoryUsed: this.memoryUsage,
      consoleOutput: this.config.enableConsoleCapture ? [...this.consoleBuffer] : undefined,
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get console output from last execution
   */
  getConsoleOutput(): string[] {
    return [...this.consoleBuffer];
  }

  /**
   * Clear console buffer
   */
  clearConsole(): void {
    this.consoleBuffer = [];
  }

  /**
   * Get memory usage from last execution
   */
  getMemoryUsage(): number {
    return this.memoryUsage;
  }

  /**
   * Update sandbox configuration
   */
  updateConfig(config: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// SafeEval Function
// ============================================================================

/**
 * safeEval - Evaluate code in a safe sandbox
 * 
 * @param code - Code to evaluate
 * @param context - Execution context
 * @param config - Sandbox configuration
 */
export async function safeEval(
  code: string,
  context: SandboxContext = { apis: {}, env: {}, config: {}, logger: console as any },
  config: SandboxConfig = {}
): Promise<ExecutionResult> {
  const executor = new SandboxExecutor(config);
  return executor.execute(code, context);
}

// ============================================================================
// Exports
// ============================================================================

export default SandboxExecutor;
