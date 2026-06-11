/**
 * ANFSF Agent — Verification Runner
 *
 * Dispatches verification checks against generated code.
 * Parses tsc error output to extract file:line:column:message.
 *
 * Task: T-002
 */

import { CompileValidator } from '../core/quality/compile-validator';
import * as path from 'path';

export interface VerificationError {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
  rule: string;
  fixable: boolean;
}

export interface VerificationResult {
  tool: string;
  passed: boolean;
  errors: VerificationError[];
  warnings: VerificationError[];
  durationMs: number;
}

export interface VerificationTool {
  name: string;
  description: string;
  run(codePath: string): Promise<VerificationResult>;
}

const TSC_ERROR_RE = /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+TS\d+:\s*(.+)$/;

function parseTscOutput(rawErrors: string[], projectDir: string): VerificationError[] {
  const errors: VerificationError[] = [];

  for (const raw of rawErrors) {
    const match = raw.match(TSC_ERROR_RE);
    if (match) {
      const absFile = path.resolve(projectDir, match[1]);
      const relFile = path.relative(projectDir, absFile).replace(/\\/g, '/');
      errors.push({
        file: relFile,
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        severity: match[4] === 'warning' ? 'warning' : 'error',
        message: match[5].trim(),
        rule: 'tsc',
        fixable: true,
      });
    } else if (raw.trim().length > 0 && !raw.includes('Found') && !raw.toLowerCase().includes('watching')) {
      errors.push({
        file: '',
        line: 0,
        column: 0,
        severity: 'error',
        message: raw.trim(),
        rule: 'tsc',
        fixable: true,
      });
    }
  }

  return errors;
}

const tscCompileTool: VerificationTool = {
  name: 'tsc-compile',
  description: 'Run tsc --noEmit on the generated project',
  async run(codePath: string): Promise<VerificationResult> {
    const start = Date.now();
    const validator = new CompileValidator(60_000);
    const result = await validator.validate(codePath);

    const errors = parseTscOutput(result.errors, codePath);

    return {
      tool: 'tsc-compile',
      passed: result.success,
      errors,
      warnings: [],
      durationMs: Date.now() - start,
    };
  },
};

const DEFAULT_TOOLS: VerificationTool[] = [tscCompileTool];

export class VerificationRunner {
  private tools: VerificationTool[];

  constructor(tools: VerificationTool[] = DEFAULT_TOOLS) {
    this.tools = tools;
  }

  async runAll(codePath: string): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];
    for (const tool of this.tools) {
      try {
        const result = await tool.run(codePath);
        results.push(result);
      } catch (error) {
        results.push({
          tool: tool.name,
          passed: false,
          errors: [{
            file: '',
            line: 0,
            column: 0,
            severity: 'error',
            message: `Tool "${tool.name}" crashed: ${error instanceof Error ? error.message : String(error)}`,
            rule: 'tool-crash',
            fixable: false,
          }],
          warnings: [],
          durationMs: 0,
        });
      }
    }
    return results;
  }

  async runSingle(toolName: string, codePath: string): Promise<VerificationResult> {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      return {
        tool: toolName,
        passed: false,
        errors: [{
          file: '',
          line: 0,
          column: 0,
          severity: 'error',
          message: `Unknown verification tool: "${toolName}"`,
          rule: 'unknown-tool',
          fixable: false,
        }],
        warnings: [],
        durationMs: 0,
      };
    }
    return tool.run(codePath);
  }

  getToolNames(): string[] {
    return this.tools.map(t => t.name);
  }
}
