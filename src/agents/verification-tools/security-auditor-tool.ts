/**
 * ANFSF Agent — Security Auditor Verification Tool
 *
 * Adapts SecurityAuditorSkill → VerificationTool interface for use
 * in the Agent Loop verification chain.
 *
 * Phase 1: Verification Chain Expansion
 */

import * as fs from 'fs';
import * as path from 'path';
import { SecurityAuditorSkill } from '../../skills/security-auditor-skill';
import type { VerificationTool, VerificationResult, VerificationError } from '../verification-runner';

/**
 * Create a VerificationTool that wraps SecurityAuditorSkill.
 *
 * Performs OWASP Top 10 security checks on generated code:
 *   - Source file scanning (eval, innerHTML, hardcoded passwords, etc.)
 *   - Injects a minimal IR constructed from file analysis
 *   - Reports findings as VerificationError items
 *
 * Note: SecurityAuditorSkill is designed to work with IR (Intermediate Representation)
 * from the graph-engine. For the verification tool, we construct a minimal IR from the
 * generated source files on disk.
 */
export function createSecurityAuditorTool(): VerificationTool {
  const skill = new SecurityAuditorSkill();

  return {
    name: 'security-auditor',
    description:
      'Security audit — OWASP Top 10 checks: injection, XSS, auth, ' +
      'data exposure, and misconfiguration detection',

    async run(codePath: string): Promise<VerificationResult> {
      const start = Date.now();
      const errors: VerificationError[] = [];
      const warnings: VerificationError[] = [];
      let passed = true;

      try {
        const files = collectSourceFiles(codePath);

        if (files.length === 0) {
          return {
            tool: 'security-auditor',
            passed: true,
            errors: [],
            warnings: [],
            durationMs: Date.now() - start,
          };
        }

        // Build a minimal IR from the generated source files
        const ir = buildMinimalIR(files);

        const result = await skill.execute({
          ir,
          sourceFiles: files.map(f => ({ path: f.relPath, content: f.content })),
        });

        // Map SecurityFinding[] → VerificationError[]
        for (const finding of result.findings) {
          const severity: 'error' | 'warning' =
            finding.severity === 'critical' || finding.severity === 'high'
              ? 'error'
              : 'warning';

          const err: VerificationError = {
            file: extractFilePath(finding.location, codePath),
            line: extractLineNumber(finding.location),
            column: 0,
            severity,
            message: `[${finding.severity}] [${finding.category}] ${finding.description}` +
              (finding.cweId ? ` (${finding.cweId})` : '') +
              (finding.recommendation ? ` — ${finding.recommendation}` : ''),
            rule: 'security',
            fixable: finding.severity !== 'critical',
          };

          if (severity === 'error') {
            errors.push(err);
          } else {
            warnings.push(err);
          }
        }

        if (!result.passed) {
          passed = false;
        }

        // Add summary
        if (result.summary) {
          const { critical, high, medium, low } = result.summary;
          if (critical + high + medium + low > 0) {
            warnings.push({
              file: '',
              line: 0,
              column: 0,
              severity: 'warning',
              message: `Security score: ${result.score.overall}/100 — ` +
                `${critical} critical, ${high} high, ${medium} medium, ${low} low`,
              rule: 'security',
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
          message: `Security auditor crashed: ${error instanceof Error ? error.message : String(error)}`,
          rule: 'tool-crash',
          fixable: false,
        });
      }

      return {
        tool: 'security-auditor',
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

/**
 * Build a minimal IR from source files on disk.
 * SecurityAuditorSkill expects an IR with service/data/ui sections.
 * We parse the generated files to infer a basic structure.
 */
function buildMinimalIR(files: SourceFileEntry[]): any {
  const endpoints: any[] = [];
  const services: any[] = [];
  const entities: any[] = [];
  const components: any[] = [];

  for (const f of files) {
    const content = f.content;

    // Detect Express/Fastify route definitions
    const routePatterns = [
      /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
      /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
      /\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
    ];

    for (const pattern of routePatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        endpoints.push({
          method: match[1],
          path: match[2],
          request: {
            auth: content.includes('auth') || content.includes('authenticate') || content.includes('middleware'),
            validation: content.includes('validate') || content.includes('zod') || content.includes('joi'),
            params: {},
          },
        });
      }
    }

    // Detect class/interface definitions as potential entities
    const classMatches = content.match(/(?:export\s+)?(?:class|interface)\s+(\w+)/g);
    if (classMatches) {
      for (const cm of classMatches) {
        const name = cm.replace(/export\s+/, '').replace(/(?:class|interface)\s+/, '');
        // Extract field names from the class body
        const fieldPattern = /\s+(\w+)\s*[?:]\s*\w+/g;
        const fields: Array<{ name: string; type: string }> = [];
        // Find the class body by looking for the class start
        const classStart = content.indexOf(`class ${name}`);
        const classEnd = classStart >= 0 ? content.indexOf('}', classStart) : -1;
        if (classStart >= 0 && classEnd >= 0) {
          const classBody = content.slice(classStart, classEnd);
          let fm: RegExpExecArray | null;
          while ((fm = fieldPattern.exec(classBody)) !== null) {
            fields.push({ name: fm[1], type: 'string' });
          }
        }
        entities.push({ name, fields });
      }
    }

    // Detect React/Vue components
    if (
      f.relPath.includes('component') ||
      f.relPath.includes('page') ||
      content.includes('React') ||
      content.includes('export default function') ||
      content.includes('export const')
    ) {
      const componentMatches = content.match(/(?:function|const)\s+(\w+)/g);
      if (componentMatches) {
        for (const cm of componentMatches) {
          const name = cm.replace(/(?:function|const)\s+/, '');
          if (name[0] === name[0].toUpperCase()) {
            components.push({
              name,
              props: {
                dangerouslySetInnerHTML: content.includes('dangerouslySetInnerHTML') || undefined,
                html: content.includes('innerHTML') || undefined,
                url: content.includes('href=') || content.includes('src=') ? 'url-present' : undefined,
              },
            });
          }
        }
      }
    }

    // Detect service-like files
    if (f.relPath.includes('service') || f.relPath.includes('controller') || f.relPath.includes('routes')) {
      services.push({
        name: f.relPath.replace(/\.[^.]+$/, '').replace(/\//g, '-'),
        dependencies: content.includes('auth') ? ['auth'] : [],
      });
    }
  }

  // Ensure at least one empty entity so SecurityAuditorSkill doesn't crash
  if (entities.length === 0) {
    entities.push({ name: 'UnknownEntity', fields: [] });
  }

  return {
    service: { endpoints, services },
    data: { entities, relationships: [] },
    ui: { components, pages: [] },
    workflow: { workflows: [] },
  };
}

function extractFilePath(location: string, _codePath: string): string {
  // location format examples:
  //   "GET /api/users" → extract nothing (no file)
  //   "entity:User" → extract nothing
  //   "component:MyComponent" → extract nothing
  //   "file:src/index.ts:42" → extract "src/index.ts"
  const fileMatch = location.match(/^file:(.+?)(?::\d+)?$/);
  if (fileMatch) return fileMatch[1];

  //   "src/index.ts:42" → extract "src/index.ts"
  const pathMatch = location.match(/^(.+?):\d+$/);
  if (pathMatch) return pathMatch[1];

  return '';
}

function extractLineNumber(location: string): number {
  const match = location.match(/:(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}
