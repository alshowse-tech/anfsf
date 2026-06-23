/**
 * ANFSF Agent — Code Quality Guard Verification Tool
 *
 * Adapts CodeQualityGuardSkill → VerificationTool interface for use
 * in the Agent Loop verification chain.
 *
 * Phase 1: Verification Chain Expansion
 */

import * as fs from 'fs';
import * as path from 'path';
import { CodeQualityGuardSkill } from '../../skills/code-quality-guard-skill';
import type { VerificationTool, VerificationResult, VerificationError } from '../verification-runner';

/**
 * Create a VerificationTool that wraps CodeQualityGuardSkill.
 *
 * Scans all generated .ts/.tsx/.js files for:
 *   - Static analysis (complexity, readability, nesting depth)
 *   - Semantic validation (undefined references, TODO placeholders)
 *   - Performance prediction (sync I/O, large loops, memory allocation)
 *   - Policy compliance (eval, Function(), hardcoded secrets)
 *
 * Each file is checked individually; results are aggregated.
 */
export function createCodeQualityGuardTool(): VerificationTool {
  const skill = new CodeQualityGuardSkill();

  return {
    name: 'code-quality-guard',
    description:
      'Code quality guard — static analysis, semantic validation, ' +
      'performance prediction, and policy compliance checks',

    async run(codePath: string): Promise<VerificationResult> {
      const start = Date.now();
      const errors: VerificationError[] = [];
      const warnings: VerificationError[] = [];
      let passed = true;

      try {
        const files = collectSourceFiles(codePath);

        // Run quality checks on the concatenated source (fast path)
        // The skill is designed for <10ms latency — we run all files at once
        const concatenated = files.map(f => `// === ${f.relPath} ===\n${f.content}`).join('\n\n');

        if (!concatenated.trim()) {
          // No source files to check — pass
          return {
            tool: 'code-quality-guard',
            passed: true,
            errors: [],
            warnings: [],
            durationMs: Date.now() - start,
          };
        }

        const result = await skill.execute({
          code: concatenated,
          generatedCode: concatenated,
          requirementGraph: { nodes: [], edges: [], quality: 1.0, completeness: 1.0, traceId: 'verification-tool' },
        });

        // Map GuardResult issues → VerificationError[]
        if (result.details) {
          // Static analysis issues
          if (result.details.staticResult?.issues) {
            for (const issue of result.details.staticResult.issues) {
              errors.push({
                file: findFileForIssue(issue, files, codePath),
                line: 0,
                column: 0,
                severity: 'error',
                message: `[static] ${issue}`,
                rule: 'code-quality',
                fixable: false,
              });
            }
          }

          // Semantic validation mismatches
          if (result.details.semanticResult?.mismatches) {
            for (const mismatch of result.details.semanticResult.mismatches) {
              errors.push({
                file: findFileForIssue(mismatch, files, codePath),
                line: 0,
                column: 0,
                severity: 'warning',
                message: `[semantic] ${mismatch}`,
                rule: 'code-quality',
                fixable: false,
              });
            }
          }

          // Performance prediction issues
          if (result.details.performanceResult?.issues) {
            for (const issue of result.details.performanceResult.issues) {
              warnings.push({
                file: findFileForIssue(issue, files, codePath),
                line: 0,
                column: 0,
                severity: 'warning',
                message: `[performance] ${issue}`,
                rule: 'code-quality',
                fixable: false,
              });
            }
          }

          // Policy violations
          if (result.details.policyResult?.violations) {
            for (const violation of result.details.policyResult.violations) {
              errors.push({
                file: findFileForIssue(violation, files, codePath),
                line: 0,
                column: 0,
                severity: 'error' as const,
                message: `[policy] ${violation}`,
                rule: 'code-quality',
                fixable: false,
              });
            }
          }
        }

        if (!result.passed) {
          passed = false;
          if (result.reason) {
            errors.push({
              file: '',
              line: 0,
              column: 0,
              severity: 'warning',
              message: `Code quality below threshold (score: ${result.score?.toFixed(3) ?? 'N/A'}): ${result.reason}`,
              rule: 'code-quality',
              fixable: false,
            });
          }
        }
      } catch (error) {
        passed = false;
        errors.push({
          file: '',
          line: 0,
          column: 0,
          severity: 'error',
          message: `Code quality guard crashed: ${error instanceof Error ? error.message : String(error)}`,
          rule: 'tool-crash',
          fixable: false,
        });
      }

      return {
        tool: 'code-quality-guard',
        passed,
        errors,
        warnings,
        durationMs: Date.now() - start,
      };
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

interface SourceFileEntry {
  relPath: string;
  content: string;
}

function collectSourceFiles(codePath: string): SourceFileEntry[] {
  const files: SourceFileEntry[] = [];
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];

  function walk(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        // Skip node_modules, .git, dist, __tests__
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist' ||
          entry.name === '__tests__'
        ) {
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const relPath = path.relative(codePath, fullPath).replace(/\\/g, '/');
            files.push({ relPath, content });
          } catch {
            // skip unreadable files
          }
        }
      }
    } catch {
      // skip inaccessible directories
    }
  }

  walk(codePath);
  return files;
}

function findFileForIssue(
  _issue: string,
  files: SourceFileEntry[],
  codePath: string,
): string {
  // Try to find which file the issue relates to
  // For now, return empty to indicate project-level issue
  // Future enhancement: grep each file for keywords in the issue message
  return '';
}
