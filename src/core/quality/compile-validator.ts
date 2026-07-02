/**
 * ANFSF Quality — Compile Validator
 *
 * Validates generated projects by running `tsc --noEmit` via spawn
 * (not shell exec) to prevent command injection. Output directory is
 * validated to reject paths with shell metacharacters.
 */

import { spawn } from 'child_process';
import type { SandboxExecutor } from '../../skills/sandbox-executor';
import * as path from 'path';
import * as fs from 'fs';

export interface CompileValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  duration: number;
}

const SAFE_PATH_RE = /^[a-zA-Z0-9_\-./\\:]+$/;

/** Resolve the tsc binary — prefer local project's typescript, fallback to node_modules resolution */
function getTscPath(): string {
  const localTsc = path.resolve(__dirname, '../../../node_modules/typescript/bin/tsc');
  if (fs.existsSync(localTsc)) return localTsc;
  return 'tsc'; // fall back to PATH resolution
}

export class CompileValidator {
  private timeoutMs: number;
  private tscPath: string;
  private sandbox?: SandboxExecutor;

  constructor(timeoutMs: number = 60_000, sandbox?: SandboxExecutor) {
    this.timeoutMs = timeoutMs;
    this.tscPath = getTscPath();
    this.sandbox = sandbox;
  }

  /**
   * Validate a project directory. Only safe absolute paths are accepted.
   */
  async validate(projectDir: string): Promise<CompileValidationResult> {
    const start = Date.now();

    const safeDir = this.sanitizeProjectDir(projectDir);
    if (!safeDir) {
      return {
        success: false,
        errors: ['Invalid project directory path: contains unsafe characters'],
        warnings: [],
        duration: Date.now() - start,
      };
    }

    if (this.sandbox) {
      return this.runTscInSandbox(safeDir, start);
    }
    return this.runTsc(safeDir, start);
  }

  /**
   * Ensure the project directory is a safe absolute path.
   * Rejects paths with shell metacharacters, spaces, or relative segments.
   */
  private sanitizeProjectDir(dir: string): string | null {
    if (!dir || typeof dir !== 'string') return null;

    // Reject shell metacharacters
    if (!SAFE_PATH_RE.test(dir)) return null;

    // Resolve to absolute path
    const resolved = path.resolve(dir);

    // Must exist and be a directory
    if (!fs.existsSync(resolved)) return null;
    if (!fs.statSync(resolved).isDirectory()) return null;

    return resolved;
  }

  /**
   * Spawn tsc as a child process with arguments (not via shell).
   */
  private runTsc(projectDir: string, startTime: number): Promise<CompileValidationResult> {
    return new Promise((resolve) => {
      const child = spawn('node', [this.tscPath, '--noEmit'], {
        cwd: projectDir,
        timeout: this.timeoutMs,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', (err: Error) => {
        resolve({
          success: false,
          errors: [`Failed to spawn tsc: ${err.message}`],
          warnings: [],
          duration: Date.now() - startTime,
        });
      });

      child.on('close', (code: number | null, signal: string | null) => {
        const duration = Date.now() - startTime;
        const output = stderr || stdout;

        if (code === 0) {
          const warnings = output
            .split('\n')
            .filter(line => line.trim() && line.toLowerCase().includes('warn'))
            .map(line => line.trim());
          resolve({ success: true, errors: [], warnings, duration });
        } else if (signal === 'SIGTERM') {
          resolve({
            success: false,
            errors: [`Compile validation timed out after ${this.timeoutMs}ms`],
            warnings: [],
            duration,
          });
        } else {
          const errors = output
            .split('\n')
            .filter(line => line.trim() && !line.toLowerCase().includes('warn'))
            .map(line => line.trim())
            .filter(line => line.length > 0);
          resolve({ success: false, errors, warnings: [], duration });
        }
      });
    });
  }

  /**
   * Run tsc --noEmit through the sandbox executor for process isolation.
   */
  private async runTscInSandbox(
    projectDir: string,
    startTime: number,
  ): Promise<CompileValidationResult> {
    const result = await this.sandbox!.executeBash(
      'node "' + this.tscPath + '" --noEmit',
      { cwd: projectDir, timeout: this.timeoutMs },
    );

    const duration = Date.now() - startTime;
    const allOutput = [result.output, result.error].filter(Boolean).join('\n');

    if (result.success) {
      const warnings = allOutput
        .split('\n')
        .filter(line => line.trim() && line.toLowerCase().includes('warn'))
        .map(line => line.trim());
      return { success: true, errors: [], warnings, duration }
    }

    const errors = allOutput
      .split('\n')
      .filter(line => line.trim() && !line.toLowerCase().includes('warn'))
      .map(line => line.trim())
      .filter(line => line.length > 0)

    return { success: false, errors, warnings: [], duration }
  }

}
