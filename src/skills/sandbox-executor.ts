/**
 * ANFSF V4 Layer 8.5 - Sandbox Executor
 *
 * Secure sandbox using child_process.spawn (not vm.createContext) for real
 * process isolation. The code runs in a separate Node.js process with a
 * minimal global scope, blocked API detection via static analysis, and
 * configurable time limits.
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  ExecutionResult,
  SandboxConfig,
  SandboxContext,
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

const TASK_TYPE_LIMITS: Record<string, { maxMemoryMB: number; maxExecutionTimeMs: number }> = {
  'requirement-graph': { maxMemoryMB: 512, maxExecutionTimeMs: 60000 },
  'deep-reasoning': { maxMemoryMB: 512, maxExecutionTimeMs: 60000 },
  'ui-synthesis': { maxMemoryMB: 256, maxExecutionTimeMs: 30000 },
  'layout-generator': { maxMemoryMB: 256, maxExecutionTimeMs: 30000 },
  'default': { maxMemoryMB: 256, maxExecutionTimeMs: 30000 },
};

const MAX_MEMORY_MB = 1024;
const MAX_EXECUTION_TIME_MS = 120000;

// ============================================================================
// Worker subprocess code — written to temp file and run via `node`
// ============================================================================

const WORKER_CODE = `
'use strict';
process.stdin.setEncoding('utf8');
var _data = '';
process.stdin.on('data', function(c) { _data += c; });
process.stdin.on('end', function() {
  try {
    var input = JSON.parse(_data);
    var ctx = input.context;
    var code = input.code;
    var logs = [];
    ['log','warn','error','debug','info'].forEach(function(m) {
      console[m] = function() {
        logs.push({ method: m, message: Array.prototype.slice.call(arguments).map(String).join(' ') });
      };
    });
    var allowed = {
      console: console, Math: Math, Date: Date, JSON: JSON,
      Array: Array, Object: Object, String: String, Number: Number, Boolean: Boolean
    };
    if (ctx && ctx.apis) {
      Object.keys(ctx.apis).forEach(function(k) { allowed[k] = ctx.apis[k]; });
    }
    var keys = Object.keys(allowed);
    var values = keys.map(function(k) { return allowed[k]; });
    keys.push('__ctx');
    values.push(ctx || {});
    var args = keys.concat([code + '\\nreturn typeof main==="function"?main(__ctx):undefined']);
    var Fn = Function.prototype.constructor;
    var fn = new (Fn.bind.apply(Fn, [null].concat(args)));
    var result = fn.apply(null, values);
    if (result && typeof result.then === 'function') {
      result.then(function(r) { send(r); }, function(e) { sendErr(e); });
    } else {
      send(result);
    }
    function send(r) { process.stdout.write(JSON.stringify({ status:'success', returnValue:r, logs:logs })); }
    function sendErr(e) { process.stdout.write(JSON.stringify({ status:'error', error:String(e), logs:logs })); }
  } catch(e) {
    process.stdout.write(JSON.stringify({ status:'error', error:String(e), logs:[] }));
  }
});
process.stdin.resume();
`;

// ============================================================================
// Helpers
// ============================================================================

function now(): number {
  return Date.now();
}

function estimateMemoryUsage(obj: unknown): number {
  const cache = new Set();
  function calculateSize(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'boolean') return 4;
    if (typeof value === 'number') return 8;
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'object') {
      if (cache.has(value)) return 0;
      cache.add(value);
      let size = 0;
      if (Array.isArray(value)) {
        for (const item of value) size += calculateSize(item);
      } else {
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            size += calculateSize((value as Record<string, unknown>)[key]);
          }
        }
      }
      return size;
    }
    return 0;
  }
  return calculateSize(obj) / (1024 * 1024);
}

// ============================================================================
// SandboxExecutor Class
// ============================================================================

export class SandboxExecutor {
  private config: Required<SandboxConfig>;
  private consoleBuffer: string[];
  private executionStartTime: number;
  private memoryUsage: number;
  private taskType: string;

  constructor(config: SandboxConfig = {}, taskType: string = 'default') {
    this.taskType = taskType;
    const limits = TASK_TYPE_LIMITS[taskType] || TASK_TYPE_LIMITS['default'];
    const userTimeout = config.maxExecutionTimeMs ?? limits.maxExecutionTimeMs;
    const userMemory = config.maxMemoryMB ?? limits.maxMemoryMB;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      maxMemoryMB: Math.min(userMemory, MAX_MEMORY_MB),
      maxExecutionTimeMs: Math.min(userTimeout, MAX_EXECUTION_TIME_MS),
    };
    this.consoleBuffer = [];
    this.executionStartTime = 0;
    this.memoryUsage = 0;
  }

  async execute(
    code: string,
    context: SandboxContext = { apis: {}, env: {}, config: {}, logger: console as never },
  ): Promise<ExecutionResult> {
    this.executionStartTime = now();
    this.consoleBuffer = [];
    this.memoryUsage = 0;

    if (!code || typeof code !== 'string') {
      return this.createErrorResult('Invalid code: code must be a non-empty string');
    }

    const blockedAPIsFound = this.config.blockedAPIs.filter(api =>
      new RegExp(`\\b${api}\\s*\\(`).test(code),
    );

    if (blockedAPIsFound.length > 0) {
      return this.createErrorResult(`Blocked APIs detected: ${blockedAPIsFound.join(', ')}`);
    }

    return this.runInSubprocess(code, context);
  }

  private runInSubprocess(
    code: string,
    context: SandboxContext,
  ): Promise<ExecutionResult> {
    const startTime = now();
    const serializedContext = {
      apis: this.serializeApis(context.apis),
      env: context.env,
      config: context.config,
    };

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anfsf-sandbox-'));
    const workerPath = path.join(tmpDir, 'worker.js');
    fs.writeFileSync(workerPath, WORKER_CODE);

    return new Promise<ExecutionResult>((resolve) => {
      const cleanup = () => {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
      };

      const child = spawn('node', [workerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

        const input = JSON.stringify({ context: serializedContext, code });
        child.stdin?.write(input);
        child.stdin?.end();

        let stdoutData = '';
        let stderrData = '';

        child.stdout?.on('data', (chunk: Buffer) => { stdoutData += chunk.toString(); });
        child.stderr?.on('data', (chunk: Buffer) => { stderrData += chunk.toString(); });

        const timer = setTimeout(() => {
          child.kill('SIGKILL');
          cleanup();
          resolve({
            status: 'error',
            error: `Execution timeout: exceeded ${this.config.maxExecutionTimeMs}ms`,
            executionTime: now() - startTime,
            memoryUsed: 0,
            consoleOutput: this.config.enableConsoleCapture ? [...this.consoleBuffer] : undefined,
          });
        }, this.config.maxExecutionTimeMs + 1000);

        child.on('close', (exitCode) => {
          clearTimeout(timer);
          cleanup();
          try {
            const result = JSON.parse(stdoutData.trim()) as {
              status: string; returnValue?: unknown; error?: string;
              logs: Array<{ method: string; message: string }>;
            };
            const executionTime = now() - startTime;

            if (this.config.enableConsoleCapture && result.logs) {
              this.consoleBuffer = result.logs.map(l => `[${l.method.toUpperCase()}] ${l.message}`);
            }

            if (result.status === 'success') {
              this.memoryUsage = estimateMemoryUsage(result.returnValue);
              resolve({
                status: 'success',
                returnValue: result.returnValue,
                executionTime,
                memoryUsed: this.memoryUsage,
                consoleOutput: this.config.enableConsoleCapture ? [...this.consoleBuffer] : undefined,
              });
            } else {
              const errMsg = result.error || `Sandbox subprocess exited with code ${exitCode}`;
              resolve({
                status: 'error',
                error: stderrData ? `${errMsg}\nstderr: ${stderrData.trim()}` : errMsg,
                executionTime,
                memoryUsed: 0,
                consoleOutput: this.config.enableConsoleCapture ? [...this.consoleBuffer] : undefined,
              });
            }
          } catch {
            resolve({
              status: 'error',
              error: `Sandbox subprocess failed: ${stderrData || 'no output'}. exit code: ${exitCode}`,
              executionTime: now() - startTime,
              memoryUsed: 0,
            });
          }
        });

        child.on('error', () => {
          clearTimeout(timer);
          cleanup();
          resolve({
            status: 'error',
            error: 'Failed to spawn sandbox subprocess',
            executionTime: now() - startTime,
            memoryUsed: 0,
          });
        });
      });
  }

  private serializeApis(apis: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!apis) return {};
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(apis)) {
      if (typeof value === 'function') continue;
      try { JSON.stringify(value); result[key] = value; } catch { /* skip */ }
    }
    return result;
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

  getConsoleOutput(): string[] { return [...this.consoleBuffer]; }
  clearConsole(): void { this.consoleBuffer = []; }
  getMemoryUsage(): number { return this.memoryUsage; }
  updateConfig(config: Partial<SandboxConfig>): void { this.config = { ...this.config, ...config }; }
}

export async function safeEval(
  code: string,
  context: SandboxContext = { apis: {}, env: {}, config: {}, logger: console as never },
  config: SandboxConfig = {},
): Promise<ExecutionResult> {
  const executor = new SandboxExecutor(config);
  return executor.execute(code, context);
}

export default SandboxExecutor;
