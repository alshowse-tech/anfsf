/**
 * ANFSF Agent — Hallucination Guard Verification Tool
 *
 * Adapts HallucinationGuardSkill → VerificationTool interface for use
 * in the Agent Loop verification chain.
 *
 * Phase 1: Verification Chain Expansion
 */

import * as fs from 'fs';
import * as path from 'path';
import { HallucinationGuardSkill } from '../../skills/hallucination-guard-skill';
import type {
  VerificationSource,
} from '../../skills/hallucination-guard-skill';
import type { VerificationTool, VerificationResult, VerificationError } from '../verification-runner';

/**
 * Create a VerificationTool that wraps HallucinationGuardSkill.
 *
 * Detects hallucinations in generated code:
 *   - Unsupported claims (code references that don't align with PRD features)
 *   - Contradictory statements (self-inconsistency across files)
 *   - Fabricated APIs/imports (non-existent packages or types)
 */
export function createHallucinationGuardTool(): VerificationTool {
  const skill = new HallucinationGuardSkill();

  return {
    name: 'hallucination-guard',
    description:
      'Hallucination detection — self-consistency, source grounding, ' +
      'and fabricated API detection',

    async run(codePath: string): Promise<VerificationResult> {
      const start = Date.now();
      const errors: VerificationError[] = [];

      try {
        const files = collectSourceFiles(codePath);
        if (files.length === 0) {
          return {
            tool: 'hallucination-guard',
            passed: true,
            errors: [],
            warnings: [],
            durationMs: Date.now() - start,
          };
        }

        // Build sources from the generated files themselves
        // (the generated code is its own "source of truth" for self-consistency)
        const sources: VerificationSource[] = files.map((f, i) => ({
          id: `file-${i}`,
          content: f.content,
          type: 'document' as const,
          reliability: 0.8,
        }));

        // Concatenate all files as the "generated text" to verify
        const generatedText = files.map(f => `// ${f.relPath}\n${f.content}`).join('\n');

        const result = await skill.execute({
          generatedText,
          sources,
          mode: 'fast', // fast mode for verification pipeline (<10ms target)
          enableGraphValidation: false,
        });

        // Map hallucinations → VerificationError[]
        for (const h of result.hallucinations) {
          const file = findFileForStatement(h.statement, files, codePath);
          const severity: 'error' | 'warning' =
            h.type === 'fabricated' ? 'error' : 'warning';

          errors.push({
            file,
            line: 0,
            column: 0,
            severity,
            message: `[${h.type}] ${h.statement.slice(0, 200)}` +
              (h.suggestion ? ` — ${h.suggestion}` : ''),
            rule: 'hallucination',
            fixable: false,
          });
        }

        // If overall confidence is low, add a summary error
        if (result.overallConfidence < 0.5 && errors.length === 0) {
          errors.push({
            file: '',
            line: 0,
            column: 0,
            severity: 'warning',
            message: `Low overall confidence: ${(result.overallConfidence * 100).toFixed(0)}% of statements verified`,
            rule: 'hallucination',
            fixable: false,
          });
        }
      } catch (error) {
        errors.push({
          file: '',
          line: 0,
          column: 0,
          severity: 'error',
          message: `Hallucination guard crashed: ${error instanceof Error ? error.message : String(error)}`,
          rule: 'tool-crash',
          fixable: false,
        });
      }

      return {
        tool: 'hallucination-guard',
        passed: errors.every(e => e.severity !== 'error'),
        errors: errors.filter(e => e.severity === 'error'),
        warnings: errors.filter(e => e.severity === 'warning'),
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

function findFileForStatement(
  statement: string,
  files: SourceFileEntry[],
  _codePath: string,
): string {
  // Try to locate which file contains this statement
  const keywords = statement.split(/\s+/).filter(w => w.length > 3).slice(0, 3);
  for (const f of files) {
    if (keywords.some(kw => f.content.includes(kw))) {
      return f.relPath;
    }
  }
  return '';
}
