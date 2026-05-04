/**
 * ANFSF Quality — Compile Validator
 *
 * Validates generated projects by running `tsc --noEmit`.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CompileValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  duration: number;
}

export class CompileValidator {
  private timeoutMs: number;

  constructor(timeoutMs: number = 60_000) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Run `npx tsc --noEmit` in the given project directory.
   */
  async validate(projectDir: string): Promise<CompileValidationResult> {
    const start = Date.now();

    try {
      const { stderr } = await execAsync('npx tsc --noEmit', {
        cwd: projectDir,
        timeout: this.timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });

      const duration = Date.now() - start;
      const warnings = stderr
        .split('\n')
        .filter(line => line.trim() && line.toLowerCase().includes('warn'))
        .map(line => line.trim());

      return { success: true, errors: [], warnings, duration };
    } catch (error: unknown) {
      const duration = Date.now() - start;

      if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'ETIMEDOUT') {
        return {
          success: false,
          errors: [`Compile validation timed out after ${this.timeoutMs}ms`],
          warnings: [],
          duration,
        };
      }

      const output = error instanceof Error && 'stderr' in error
        ? String((error as { stderr: string }).stderr)
        : String(error);

      const errors = output
        .split('\n')
        .filter(line => line.trim() && !line.toLowerCase().includes('warn'))
        .map(line => line.trim());

      return { success: false, errors, warnings: [], duration };
    }
  }
}
