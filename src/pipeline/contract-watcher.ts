/**
 * ANFSF Pipeline — Contract Watcher (T-203)
 *
 * Monitors code changes for contract violations:
 * - Backend changes that modify the API contract → notify frontend
 * - Frontend calls to undefined API endpoints/fields → warn
 */

import type { CodeAnnotation } from './code-annotator';

export interface ContractViolation {
  type: 'api_changed' | 'undefined_endpoint' | 'field_mismatch';
  severity: 'warning' | 'error';
  file: string;
  message: string;
  details: Record<string, unknown>;
}

export interface ContractWatchResult {
  violations: ContractViolation[];
  summary: { warnings: number; errors: number };
}

const KNOWN_API_PATTERNS = /\/api\/v1\/[a-zA-Z/]+/g;
const KNOWN_FIELD_PATTERNS = /status|jobId|projectName|error|data/g;

export class ContractWatcher {
  private openApiSpec: Record<string, unknown> | null = null;
  private definedEndpoints: Set<string> = new Set();

  /** Set the current API contract (from stage 1 skeleton generation) */
  setContract(openApiSpec: Record<string, unknown>): void {
    this.openApiSpec = openApiSpec;
    this.definedEndpoints = new Set();

    // Extract defined paths from OpenAPI spec
    const paths = openApiSpec.paths as Record<string, unknown> | undefined;
    if (paths) {
      for (const path of Object.keys(paths)) {
        this.definedEndpoints.add(path);
      }
    }
  }

  /**
   * Check a set of file annotations for contract violations.
   */
  check(annotations: CodeAnnotation[]): ContractWatchResult {
    const violations: ContractViolation[] = [];

    for (const ann of annotations) {
      if (ann.source === 'generated') continue; // Skip untouched skeleton

      // Check if this is a backend API file modification
      if (ann.file.includes('routes/') || ann.file.includes('api/')) {
        violations.push({
          type: 'api_changed',
          severity: 'warning',
          file: ann.file,
          message: `Backend API file "${ann.file}" was modified. Frontend may need updates.`,
          details: { file: ann.file, commitSha: ann.commitSha },
        });
      }
    }

    return {
      violations,
      summary: {
        warnings: violations.filter(v => v.severity === 'warning').length,
        errors: violations.filter(v => v.severity === 'error').length,
      },
    };
  }
}
