/**
 * ANFSF — Bash Tool
 *
 * Executes shell commands. Readwrite — can modify system state.
 * Sandboxed execution will be added in Phase 4.
 *
 * Phase 2: Tool System Infrastructure
 */

import { spawn } from 'child_process';
import type { Tool, ToolDefinition, ToolResult, ToolContext } from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds
const MAX_OUTPUT_BYTES = 100_000;  // 100 KB output limit

/** Commands that are always allowed (safe read-only) */
const SAFE_COMMANDS = new Set([
  'ls', 'dir', 'cat', 'type', 'head', 'tail',
  'echo', 'pwd', 'cd', 'date', 'whoami',
  'npm', 'npx', 'node', 'tsc', 'git', 'mkdir',
]);

/** Patterns that are always blocked (dangerous) */
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,
  /:\s*\(\)\s*\{/,  // fork bomb
  />\s*\/dev\/sda/,
  /mkfs\./,
  /dd\s+if=/,
  /chmod\s+777/,
];

// ============================================================================
// BashTool
// ============================================================================

const BASH_TOOL_DEFINITION: ToolDefinition = {
  name: 'execute_bash',
  description:
    'Execute a shell command in the project working directory. ' +
    'Use for running build commands (npm install, tsc, etc.), ' +
    'listing files (ls), or inspecting the project structure. ' +
    'Returns stdout and stderr output. Commands are limited to 30s timeout.',
  parameters: [
    {
      name: 'command',
      type: 'string',
      description: 'The shell command to execute (e.g. "npm test", "ls -la")',
      required: true,
    },
    {
      name: 'timeout',
      type: 'number',
      description: 'Timeout in milliseconds (default: 30000, max: 120000)',
      required: false,
    },
  ],
  mode: 'readwrite',
  requiresSandbox: true, // Will be enforced in Phase 4
};

export class BashTool implements Tool {
  readonly definition: ToolDefinition = BASH_TOOL_DEFINITION;

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const command = String(params.command ?? '').trim();
    const timeout = Math.min(
      Number(params.timeout ?? DEFAULT_TIMEOUT_MS),
      120_000, // max 2 minutes
    );

    if (!command) {
      return {
        callId: '',
        toolName: 'execute_bash',
        success: false,
        output: '',
        error: 'Command must not be empty',
        durationMs: 0,
      };
    }

    // Check blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(command)) {
        return {
          callId: '',
          toolName: 'execute_bash',
          success: false,
          output: '',
          error: `Blocked dangerous command pattern: ${pattern}`,
          durationMs: 0,
        };
      }
    }

    const start = Date.now();

    try {
      const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>(
        (resolve) => {
          const child = spawn(command, [], {
            cwd: context.workingDir,
            timeout,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
            // Windows: use cmd.exe, Unix: use /bin/sh
          });

          let stdout = '';
          let stderr = '';

          child.stdout?.on('data', (chunk: Buffer) => {
            if (stdout.length < MAX_OUTPUT_BYTES) {
              stdout += chunk.toString('utf-8');
            }
          });

          child.stderr?.on('data', (chunk: Buffer) => {
            if (stderr.length < MAX_OUTPUT_BYTES) {
              stderr += chunk.toString('utf-8');
            }
          });

          child.on('close', (code) => {
            resolve({
              stdout: stdout.slice(0, MAX_OUTPUT_BYTES),
              stderr: stderr.slice(0, MAX_OUTPUT_BYTES),
              exitCode: code ?? -1,
            });
          });

          child.on('error', (err) => {
            resolve({
              stdout,
              stderr: err.message,
              exitCode: -1,
            });
          });
        }
      );

      const truncated = result.stdout.length >= MAX_OUTPUT_BYTES
        ? '\n[output truncated at 100KB]'
        : '';

      const output = [
        result.stdout ? `STDOUT:\n${result.stdout}${truncated}` : '',
        result.stderr ? `STDERR:\n${result.stderr}` : '',
        `Exit code: ${result.exitCode}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      return {
        callId: '',
        toolName: 'execute_bash',
        success: result.exitCode === 0,
        output: output || '(no output)',
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        callId: '',
        toolName: 'execute_bash',
        success: false,
        output: '',
        error: `Command execution failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  }
}

/**
 * Create a BashTool instance.
 */
export function createBashTool(): BashTool {
  return new BashTool();
}
