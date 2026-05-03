/**
 * ASF V4.0 Contract Pack - Config Schema Diff Engine
 *
 * Semantic diff for configuration schema contracts.
 * Version: v0.8.5
 */

import type { ContractDiff, DiffItem } from './types';
import { determineBumpType } from './semver';

/**
 * Parsed config schema structure.
 */
interface ParsedConfigSchema {
  name: string;
  version: string;
  description?: string;
  properties: Record<string, ConfigProperty>;
  required?: string[];
}

interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum';
  description?: string;
  default?: any;
  required?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
  items?: ConfigProperty;
  properties?: Record<string, ConfigProperty>;
}

/**
 * Parse config schema from JSON string.
 */
export function parseConfigSchema(spec: string): ParsedConfigSchema {
  try {
    return JSON.parse(spec);
  } catch {
    throw new Error('Invalid Config Schema: must be valid JSON');
  }
}

/**
 * Generate semantic diff for Config Schemas.
 *
 * @param before - Original schema (JSON string)
 * @param after - New schema (JSON string)
 * @param beforeVersion - Current version (semver)
 * @param afterVersion - Proposed version (semver)
 * @returns ContractDiff result with contractType 'ConfigSchema'
 */
export function diffConfigSchema(
  before: string,
  after: string,
  beforeVersion: string,
  afterVersion: string
): ContractDiff {
  const beforeSpec = parseConfigSchema(before);
  const afterSpec = parseConfigSchema(after);

  const changes: ContractDiff['changes'] = {
    added: [],
    removed: [],
    modified: [],
  };

  let breaking = false;
  const allDiffItems: DiffItem[] = [];

  const beforeProps = new Set(Object.keys(beforeSpec.properties || {}));
  const afterProps = new Set(Object.keys(afterSpec.properties || {}));

  const beforeRequired = new Set(beforeSpec.required || []);
  const afterRequired = new Set(afterSpec.required || []);

  // New properties
  for (const name of afterProps) {
    if (!beforeProps.has(name)) {
      const prop = afterSpec.properties[name];
      const isRequired = afterRequired.has(name);
      changes.added.push({
        path: `/properties/${name}`,
        type: 'property_add',
        description: `Added ${isRequired ? 'required' : 'optional'} property: ${name} (${prop.type})`,
        severity: isRequired ? 'high' : 'low',
        details: { property: name, type: prop.type, required: isRequired },
      });

      if (isRequired) breaking = true;
    }
  }

  // Removed properties (breaking)
  for (const name of beforeProps) {
    if (!afterProps.has(name)) {
      const prop = beforeSpec.properties[name];
      changes.removed.push({
        path: `/properties/${name}`,
        type: 'property_remove',
        description: `Removed property: ${name} (${prop.type})`,
        severity: 'critical',
        details: { property: name, type: prop.type },
      });
      breaking = true;
    }
  }

  // Modified properties
  for (const name of afterProps) {
    if (beforeProps.has(name)) {
      const beforeProp = beforeSpec.properties[name];
      const afterProp = afterSpec.properties[name];

      const propDiff = compareConfigProps(beforeProp, afterProp, name, `/properties/${name}`);
      if (propDiff.length > 0) {
        changes.modified.push({
          path: `/properties/${name}`,
          type: 'property_modify',
          description: `Modified property: ${name}`,
          severity: propDiff.some((d) => d.severity === 'critical') ? 'critical' : 'medium',
          details: { property: name, changes: propDiff.map((d) => d.type) },
        });
        allDiffItems.push(...propDiff);
        if (propDiff.some((d) => d.severity === 'critical')) breaking = true;
      }
    }
  }

  // Required set changes for existing properties
  for (const name of beforeProps) {
    if (afterProps.has(name)) {
      const wasRequired = beforeRequired.has(name);
      const nowRequired = afterRequired.has(name);

      if (!wasRequired && nowRequired) {
        allDiffItems.push({
          path: `/required/${name}`,
          type: 'required_add',
          description: `Property '${name}' changed from optional to required`,
          severity: 'critical',
          details: { property: name, before: false, after: true },
        });
        breaking = true;
      }

      if (wasRequired && !nowRequired) {
        allDiffItems.push({
          path: `/required/${name}`,
          type: 'required_remove',
          description: `Property '${name}' changed from required to optional`,
          severity: 'low',
          details: { property: name, before: true, after: false },
        });
      }
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

  const changelog = generateConfigSchemaChangelog(beforeSpec.name, changes, breaking, bumpType);
  const riskScore = calculateConfigSchemaRiskScore(changes, breaking, allDiffItems);

  return {
    contractType: 'ConfigSchema',
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
 * Compare two config properties (supports nested objects).
 */
function compareConfigProps(before: ConfigProperty, after: ConfigProperty, name: string, path: string): DiffItem[] {
  const diff: DiffItem[] = [];

  // Type change (breaking)
  if (before.type !== after.type) {
    diff.push({
      path: `${path}/type`,
      type: 'property_type_change',
      description: `Property '${name}' type changed: ${before.type} → ${after.type}`,
      severity: 'critical',
      details: { property: name, before: before.type, after: after.type },
    });
  }

  // Default value change
  if (before.default !== after.default) {
    diff.push({
      path: `${path}/default`,
      type: 'default_change',
      description: `Property '${name}' default changed`,
      severity: 'medium',
      details: { property: name, before: before.default, after: after.default },
    });
  }

  // Constraint changes
  if (before.minimum !== undefined && after.minimum !== before.minimum) {
    diff.push({
      path: `${path}/minimum`,
      type: 'constraint_change',
      description: `Property '${name}' minimum changed: ${before.minimum} → ${after.minimum}`,
      severity: 'medium',
      details: { property: name, constraint: 'minimum', before: before.minimum, after: after.minimum },
    });
  }

  if (before.maximum !== undefined && after.maximum !== before.maximum) {
    diff.push({
      path: `${path}/maximum`,
      type: 'constraint_change',
      description: `Property '${name}' maximum changed: ${before.maximum} → ${after.maximum}`,
      severity: 'medium',
      details: { property: name, constraint: 'maximum', before: before.maximum, after: after.maximum },
    });
  }

  // Pattern change
  if (before.pattern !== after.pattern) {
    diff.push({
      path: `${path}/pattern`,
      type: 'pattern_change',
      description: `Property '${name}' pattern changed`,
      severity: 'high',
      details: { property: name },
    });
  }

  // Enum changes
  if (before.enum && after.enum) {
    const beforeEnum = new Set(before.enum);
    const afterEnum = new Set(after.enum);

    for (const val of afterEnum) {
      if (!beforeEnum.has(val)) {
        diff.push({
          path: `${path}/enum`,
          type: 'enum_add',
          description: `Added enum value '${val}' to property '${name}'`,
          severity: 'low',
          details: { property: name, value: val },
        });
      }
    }

    for (const val of beforeEnum) {
      if (!afterEnum.has(val)) {
        diff.push({
          path: `${path}/enum`,
          type: 'enum_remove',
          description: `Removed enum value '${val}' from property '${name}'`,
          severity: 'high',
          details: { property: name, value: val },
        });
      }
    }
  }

  // Length constraint changes
  if (before.minLength !== after.minLength || before.maxLength !== after.maxLength) {
    diff.push({
      path: `${path}/length`,
      type: 'length_constraint_change',
      description: `Property '${name}' length constraints changed`,
      severity: 'medium',
      details: {
        property: name,
        minLengthBefore: before.minLength,
        minLengthAfter: after.minLength,
        maxLengthBefore: before.maxLength,
        maxLengthAfter: after.maxLength,
      },
    });
  }

  return diff;
}

/**
 * Generate changelog for config schema changes.
 */
function generateConfigSchemaChangelog(
  configName: string,
  changes: ContractDiff['changes'],
  breaking: boolean,
  _bumpType: string | null
): string {
  const lines: string[] = [];

  if (breaking) {
    lines.push('## ⚠️ BREAKING CHANGES\n');
  }

  lines.push(`### Config: \`${configName}\`\n`);

  if (changes.removed.length > 0) {
    lines.push('#### Removed Properties\n');
    for (const item of changes.removed) {
      lines.push(`- \`${item.path.replace('/properties/', '')}\` (${item.details.type})`);
    }
    lines.push('');
  }

  if (changes.added.length > 0) {
    lines.push('#### Added Properties\n');
    for (const item of changes.added) {
      lines.push(`- \`${item.path.replace('/properties/', '')}\`: ${item.details.type} (${item.details.required ? 'required' : 'optional'})`);
    }
    lines.push('');
  }

  if (changes.modified.length > 0) {
    lines.push('#### Modified Properties\n');
    for (const item of changes.modified) {
      lines.push(`- \`${item.path.replace('/properties/', '')}\`: ${item.details.changes.join(', ')}`);
    }
    lines.push('');
  }

  if (lines.length <= 2) {
    return 'No significant changes detected.';
  }

  return lines.join('\n');
}

/**
 * Calculate risk score for config schema changes.
 */
function calculateConfigSchemaRiskScore(
  changes: ContractDiff['changes'],
  breaking: boolean,
  allDiffItems: DiffItem[]
): number {
  let score = 0;

  if (breaking) score += 30;

  const criticalCount = allDiffItems.filter((d) => d.severity === 'critical').length;
  score += criticalCount * 5;

  score += changes.removed.length * 10;
  score += changes.modified.length * 3;

  // Constraint changes add moderate risk
  const constraintChanges = allDiffItems.filter((d) => d.type.includes('constraint')).length;
  score += constraintChanges * 2;

  return Math.min(100, score);
}

/**
 * Check if config schema diff can be auto-approved.
 */
export function canAutoApproveConfigSchema(diff: ContractDiff): boolean {
  if (diff.contractType !== 'ConfigSchema') return false;
  if (diff.breaking) return false;

  // Only allow adding optional properties
  for (const item of diff.changes.added) {
    if (item.details?.required === true) return false;
  }

  // No removed properties
  if (diff.changes.removed.length > 0) return false;

  // Risk score must be low
  if ((diff.riskScore ?? 50) >= 20) return false;

  return true;
}
