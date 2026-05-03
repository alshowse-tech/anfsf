/**
 * ASF V4.0 Contract Pack - OpenAPI Diff Engine
 * 
 * Semantic diff for OpenAPI/Swagger contracts.
 * Version: v0.8.5
 */

import type { OpenAPIDiff, DiffItem } from './types';
import { determineBumpType } from './semver';

/**
 * Parsed OpenAPI spec structure.
 */
interface ParsedOpenAPI {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
  };
}

/**
 * Parse OpenAPI spec from JSON/YAML string.
 */
export function parseOpenAPI(spec: string): ParsedOpenAPI {
  try {
    // Try JSON first
    return JSON.parse(spec);
  } catch {
    // Could try YAML parsing here if yaml library available
    throw new Error('Invalid OpenAPI spec: must be valid JSON');
  }
}

/**
 * Compare two OpenAPI schemas.
 */
function compareSchemas(before: any, after: any, path: string): {
  hasChanges: boolean;
  breaking: boolean;
  diff: DiffItem[];
} {
  const diff: DiffItem[] = [];
  let breaking = false;

  if (!before || !after) {
    return { hasChanges: true, breaking: false, diff };
  }

  // Check for required field changes
  const beforeRequired = new Set(before.required || []);
  const afterRequired = new Set(after.required || []);

  // New required fields = breaking
  for (const field of afterRequired) {
    if (!beforeRequired.has(field)) {
      diff.push({
        path: `${path}.required.${field}`,
        type: 'required_add',
        description: `Added required field: ${field}`,
        severity: 'critical',
        details: { field, before: false, after: true },
      });
      breaking = true;
    }
  }

  // Removed required fields = non-breaking
  for (const field of beforeRequired) {
    if (!afterRequired.has(field)) {
      diff.push({
        path: `${path}.required.${field}`,
        type: 'required_remove',
        description: `Removed required constraint: ${field}`,
        severity: 'low',
        details: { field, before: true, after: false },
      });
    }
  }

  // Check for type changes
  if (before.type && after.type && before.type !== after.type) {
    diff.push({
      path: `${path}.type`,
      type: 'type_change',
      description: `Type changed: ${before.type} → ${after.type}`,
      severity: 'critical',
      details: { before: before.type, after: after.type },
    });
    breaking = true;
  }

  // Check for new properties (non-breaking if optional)
  const beforeProps = new Set(Object.keys(before.properties || {}));
  const afterProps = new Set(Object.keys(after.properties || {}));

  for (const prop of afterProps) {
    if (!beforeProps.has(prop)) {
      const isRequired = afterRequired.has(prop);
      diff.push({
        path: `${path}.properties.${prop}`,
        type: 'property_add',
        description: `Added ${isRequired ? 'required' : 'optional'} property: ${prop}`,
        severity: isRequired ? 'high' : 'low',
        details: { property: prop, required: isRequired },
      });
      if (isRequired) breaking = true;
    }
  }

  // Check for removed properties
  for (const prop of beforeProps) {
    if (!afterProps.has(prop)) {
      diff.push({
        path: `${path}.properties.${prop}`,
        type: 'property_remove',
        description: `Removed property: ${prop}`,
        severity: 'high',
        details: { property: prop },
      });
      breaking = true;
    }
  }

  // Check for enum changes
  if (before.enum && after.enum) {
    const beforeEnum = new Set(before.enum);
    const afterEnum = new Set(after.enum);

    for (const value of afterEnum) {
      if (!beforeEnum.has(value)) {
        diff.push({
          path: `${path}.enum`,
          type: 'enum_add',
          description: `Added enum value: ${value}`,
          severity: 'low',
          details: { value },
        });
      }
    }

    for (const value of beforeEnum) {
      if (!afterEnum.has(value)) {
        diff.push({
          path: `${path}.enum`,
          type: 'enum_remove',
          description: `Removed enum value: ${value}`,
          severity: 'critical',
          details: { value },
        });
        breaking = true;
      }
    }
  }

  return {
    hasChanges: diff.length > 0,
    breaking,
    diff,
  };
}

/**
 * Generate semantic diff for OpenAPI specs.
 * 
 * @param before - Original OpenAPI spec (JSON string)
 * @param after - New OpenAPI spec (JSON string)
 * @param beforeVersion - Current version (semver)
 * @param afterVersion - Proposed version (semver)
 * @returns OpenAPIDiff result
 * 
 * @example
 * ```typescript
 * const diff = diffOpenAPI(
 *   oldSpec,
 *   newSpec,
 *   '1.0.0',
 *   '1.1.0'
 * );
 * 
 * if (diff.breaking) {
 *   console.log('Breaking changes detected!');
 * }
 * ```
 */
export function diffOpenAPI(
  before: string,
  after: string,
  beforeVersion: string,
  afterVersion: string
): OpenAPIDiff {
  const beforeSpec = parseOpenAPI(before);
  const afterSpec = parseOpenAPI(after);

  const changes: OpenAPIDiff['changes'] = {
    added: [],
    removed: [],
    modified: [],
  };

  let breaking = false;
  const allDiffItems: DiffItem[] = [];

  // Compare paths
  const beforePaths = new Set(Object.keys(beforeSpec.paths || {}));
  const afterPaths = new Set(Object.keys(afterSpec.paths || {}));

  // New paths/endpoints
  for (const path of afterPaths) {
    if (!beforePaths.has(path)) {
      const methods = Object.keys(afterSpec.paths[path]);
      for (const method of methods) {
        changes.added.push({
          path,
          method,
          schema: afterSpec.paths[path][method],
        });
        allDiffItems.push({
          path: `/paths/${path}/${method}`,
          type: 'endpoint_add',
          description: `Added ${method.toUpperCase()} ${path}`,
          severity: 'low',
          details: { method, path },
        });
      }
    }
  }

  // Removed paths/endpoints (breaking)
  for (const path of beforePaths) {
    if (!afterPaths.has(path)) {
      const methods = Object.keys(beforeSpec.paths[path]);
      for (const method of methods) {
        changes.removed.push({ path, method });
        allDiffItems.push({
          path: `/paths/${path}/${method}`,
          type: 'endpoint_remove',
          description: `Removed ${method.toUpperCase()} ${path}`,
          severity: 'critical',
          details: { method, path },
        });
      }
      breaking = true;
    }
  }

  // Modified paths
  for (const path of afterPaths) {
    if (beforePaths.has(path)) {
      const beforeMethods = beforeSpec.paths[path];
      const afterMethods = afterSpec.paths[path];

      for (const method of Object.keys(afterMethods)) {
        if (beforeMethods[method]) {
          // Compare request/response schemas
          const beforeSchema = beforeMethods[method];
          const afterSchema = afterMethods[method];

          const schemaDiff = compareSchemas(
            beforeSchema,
            afterSchema,
            `/paths/${path}/${method}`
          );

          if (schemaDiff.hasChanges) {
            changes.modified.push({
              path,
              method,
              schemaDiff: {
                request: beforeSchema.requestBody,
                response: beforeSchema.responses,
              },
            });
            allDiffItems.push(...schemaDiff.diff);

            if (schemaDiff.breaking) {
              breaking = true;
            }
          }
        }
      }
    }
  }

  // Compare component schemas
  const beforeSchemas = beforeSpec.components?.schemas || {};
  const afterSchemas = afterSpec.components?.schemas || {};
  const beforeSchemaNames = new Set(Object.keys(beforeSchemas));
  const afterSchemaNames = new Set(Object.keys(afterSchemas));

  // New schemas
  for (const name of afterSchemaNames) {
    if (!beforeSchemaNames.has(name)) {
      allDiffItems.push({
        path: `/components/schemas/${name}`,
        type: 'schema_add',
        description: `Added schema: ${name}`,
        severity: 'low',
        details: { schema: name },
      });
    }
  }

  // Removed schemas (breaking)
  for (const name of beforeSchemaNames) {
    if (!afterSchemaNames.has(name)) {
      allDiffItems.push({
        path: `/components/schemas/${name}`,
        type: 'schema_remove',
        description: `Removed schema: ${name}`,
        severity: 'critical',
        details: { schema: name },
      });
      breaking = true;
    }
  }

  // Modified schemas
  for (const name of afterSchemaNames) {
    if (beforeSchemaNames.has(name)) {
      const schemaDiff = compareSchemas(
        beforeSchemas[name],
        afterSchemas[name],
        `/components/schemas/${name}`
      );
      allDiffItems.push(...schemaDiff.diff);
      if (schemaDiff.breaking) breaking = true;
    }
  }

  // Determine version bump
  const hasNewFeatures = changes.added.length > 0;
  const hasBugFixes = changes.modified.length > 0 && !breaking;
  const bumpType = determineBumpType({
    currentVersion: beforeVersion,
    isBreaking: breaking,
    hasNewFeatures,
    hasBugFixes,
  });

  // Generate changelog
  const changelog = generateOpenAPIChangelog(changes, breaking, bumpType);

  // Calculate risk score
  const riskScore = calculateOpenAPIRiskScore(changes, breaking, allDiffItems);

  return {
    contractType: 'OpenAPI',
    version: {
      before: beforeVersion,
      after: afterVersion,
      bump: bumpType,
    },
    changes,
    breaking,
    requiresApproval: breaking || bumpType === 'major',
    changelog,
    riskScore,
  };
}

/**
 * Generate changelog for OpenAPI changes.
 */
function generateOpenAPIChangelog(
  changes: OpenAPIDiff['changes'],
  breaking: boolean,
  bumpType: string | null
): string {
  const lines: string[] = [];

  if (breaking) {
    lines.push('## ⚠️ BREAKING CHANGES\n');
  }

  if (changes.removed.length > 0) {
    lines.push('### Removed\n');
    for (const item of changes.removed) {
      lines.push(`- **${item.method.toUpperCase()}** \`${item.path}\``);
    }
    lines.push('');
  }

  if (changes.added.length > 0) {
    lines.push('### Added\n');
    for (const item of changes.added) {
      lines.push(`- **${item.method.toUpperCase()}** \`${item.path}\``);
    }
    lines.push('');
  }

  if (changes.modified.length > 0) {
    lines.push('### Modified\n');
    for (const item of changes.modified) {
      lines.push(`- **${item.method.toUpperCase()}** \`${item.path}\``);
    }
    lines.push('');
  }

  if (lines.length === 0) {
    return 'No significant changes detected.';
  }

  return lines.join('\n');
}

/**
 * Calculate risk score for OpenAPI changes.
 */
function calculateOpenAPIRiskScore(
  changes: OpenAPIDiff['changes'],
  breaking: boolean,
  allDiffItems: DiffItem[]
): number {
  let score = 0; // Base score

  // Breaking changes add significant risk
  if (breaking) {
    score += 30;
  }

  // Count critical severity items
  const criticalCount = allDiffItems.filter((d) => d.severity === 'critical').length;
  score += criticalCount * 5;

  // Removed endpoints add risk
  score += changes.removed.length * 10;

  // Cap at 100
  return Math.min(100, score);
}

/**
 * Check if OpenAPI diff can be auto-approved.
 */
export function canAutoApproveOpenAPI(diff: OpenAPIDiff): boolean {
  // Must not be breaking
  if (diff.breaking) return false;

  // Must only add optional fields
  for (const item of diff.changes.added) {
    // Check if adding required fields (via details or schema)
    if (item.details?.required === true || item.schema?.required?.length > 0) {
      return false;
    }
  }

  // No removed items
  if (diff.changes.removed.length > 0) return false;

  // Risk score must be low
  if ((diff.riskScore ?? 50) >= 20) return false;

  return true;
}
