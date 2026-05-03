/**
 * ASF V4.0 Contract Pack - Event Schema Diff Engine
 *
 * Semantic diff for event stream contracts.
 * Version: v0.8.5
 */

import type { ContractDiff, DiffItem } from './types';
import { determineBumpType } from './semver';

/**
 * Parsed event schema structure.
 */
interface ParsedEventSchema {
  name: string;
  version: string;
  eventType: string;
  source: string;
  fields: Record<string, EventField>;
  metadata?: Record<string, any>;
}

interface EventField {
  type: string;
  required: boolean;
  description?: string;
  format?: string;
  enum?: string[];
}

/**
 * Parse event schema from JSON string.
 */
export function parseEventSchema(spec: string): ParsedEventSchema {
  try {
    return JSON.parse(spec);
  } catch {
    throw new Error('Invalid Event Schema: must be valid JSON');
  }
}

/**
 * Generate semantic diff for Event Schemas.
 *
 * @param before - Original schema (JSON string)
 * @param after - New schema (JSON string)
 * @param beforeVersion - Current version (semver)
 * @param afterVersion - Proposed version (semver)
 * @returns ContractDiff result with contractType 'EventSchema'
 */
export function diffEventSchema(
  before: string,
  after: string,
  beforeVersion: string,
  afterVersion: string
): ContractDiff {
  const beforeSpec = parseEventSchema(before);
  const afterSpec = parseEventSchema(after);

  const changes: ContractDiff['changes'] = {
    added: [],
    removed: [],
    modified: [],
  };

  let breaking = false;
  const allDiffItems: DiffItem[] = [];

  const beforeFields = new Set(Object.keys(beforeSpec.fields || {}));
  const afterFields = new Set(Object.keys(afterSpec.fields || {}));

  // New fields
  for (const name of afterFields) {
    if (!beforeFields.has(name)) {
      const field = afterSpec.fields[name];
      changes.added.push({
        path: `/fields/${name}`,
        type: 'field_add',
        description: `Added ${field.required ? 'required' : 'optional'} field: ${name} (${field.type})`,
        severity: field.required ? 'high' : 'low',
        details: { field: name, type: field.type, required: field.required },
      });

      if (field.required) breaking = true;
    }
  }

  // Removed fields (breaking)
  for (const name of beforeFields) {
    if (!afterFields.has(name)) {
      const field = beforeSpec.fields[name];
      changes.removed.push({
        path: `/fields/${name}`,
        type: 'field_remove',
        description: `Removed field: ${name} (${field.type})`,
        severity: 'critical',
        details: { field: name, type: field.type },
      });
      breaking = true;
    }
  }

  // Modified fields
  for (const name of afterFields) {
    if (beforeFields.has(name)) {
      const beforeField = beforeSpec.fields[name];
      const afterField = afterSpec.fields[name];

      const fieldDiff = compareEventFields(beforeField, afterField, name);
      if (fieldDiff.length > 0) {
        changes.modified.push({
          path: `/fields/${name}`,
          type: 'field_modify',
          description: `Modified field: ${name}`,
          severity: fieldDiff.some((d) => d.severity === 'critical') ? 'critical' : 'medium',
          details: { field: name, changes: fieldDiff.map((d) => d.description) },
        });
        allDiffItems.push(...fieldDiff);
        if (fieldDiff.some((d) => d.severity === 'critical')) breaking = true;
      }
    }
  }

  // Event type change (breaking)
  if (beforeSpec.eventType !== afterSpec.eventType) {
    allDiffItems.push({
      path: '/eventType',
      type: 'event_type_change',
      description: `Event type changed: ${beforeSpec.eventType} → ${afterSpec.eventType}`,
      severity: 'critical',
      details: { before: beforeSpec.eventType, after: afterSpec.eventType },
    });
    breaking = true;
  }

  // Source change (breaking)
  if (beforeSpec.source !== afterSpec.source) {
    allDiffItems.push({
      path: '/source',
      type: 'source_change',
      description: `Event source changed: ${beforeSpec.source} → ${afterSpec.source}`,
      severity: 'critical',
      details: { before: beforeSpec.source, after: afterSpec.source },
    });
    breaking = true;
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

  const changelog = generateEventSchemaChangelog(beforeSpec.name, changes, breaking, bumpType);
  const riskScore = calculateEventSchemaRiskScore(changes, breaking, allDiffItems);

  return {
    contractType: 'EventSchema',
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
 * Compare two event fields.
 */
function compareEventFields(before: EventField, after: EventField, fieldName: string): DiffItem[] {
  const diff: DiffItem[] = [];
  const path = `/fields/${fieldName}`;

  // Type change (breaking)
  if (before.type !== after.type) {
    diff.push({
      path: `${path}/type`,
      type: 'field_type_change',
      description: `Field '${fieldName}' type changed: ${before.type} → ${after.type}`,
      severity: 'critical',
      details: { field: fieldName, before: before.type, after: after.type },
    });
  }

  // Required constraint added (breaking for consumers)
  if (!before.required && after.required) {
    diff.push({
      path: `${path}/required`,
      type: 'field_required_add',
      description: `Field '${fieldName}' changed from optional to required`,
      severity: 'critical',
      details: { field: fieldName, before: false, after: true },
    });
  }

  // Required constraint removed (non-breaking)
  if (before.required && !after.required) {
    diff.push({
      path: `${path}/required`,
      type: 'field_required_remove',
      description: `Field '${fieldName}' changed from required to optional`,
      severity: 'low',
      details: { field: fieldName, before: true, after: false },
    });
  }

  // Format change
  if (before.format !== after.format) {
    diff.push({
      path: `${path}/format`,
      type: 'field_format_change',
      description: `Field '${fieldName}' format changed: ${before.format || 'none'} → ${after.format || 'none'}`,
      severity: 'medium',
      details: { field: fieldName, before: before.format, after: after.format },
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
          description: `Added enum value '${val}' to field '${fieldName}'`,
          severity: 'low',
          details: { field: fieldName, value: val },
        });
      }
    }

    for (const val of beforeEnum) {
      if (!afterEnum.has(val)) {
        diff.push({
          path: `${path}/enum`,
          type: 'enum_remove',
          description: `Removed enum value '${val}' from field '${fieldName}'`,
          severity: 'high',
          details: { field: fieldName, value: val },
        });
      }
    }
  }

  return diff;
}

/**
 * Generate changelog for event schema changes.
 */
function generateEventSchemaChangelog(
  eventName: string,
  changes: ContractDiff['changes'],
  breaking: boolean,
  _bumpType: string | null
): string {
  const lines: string[] = [];

  if (breaking) {
    lines.push('## ⚠️ BREAKING CHANGES\n');
  }

  lines.push(`### Event: \`${eventName}\`\n`);

  if (changes.removed.length > 0) {
    lines.push('#### Removed Fields\n');
    for (const item of changes.removed) {
      lines.push(`- \`${item.path.replace('/fields/', '')}\` (${item.details.type})`);
    }
    lines.push('');
  }

  if (changes.added.length > 0) {
    lines.push('#### Added Fields\n');
    for (const item of changes.added) {
      lines.push(`- \`${item.path.replace('/fields/', '')}\` (${item.details.type}, ${item.details.required ? 'required' : 'optional'})`);
    }
    lines.push('');
  }

  if (changes.modified.length > 0) {
    lines.push('#### Modified Fields\n');
    for (const item of changes.modified) {
      lines.push(`- \`${item.path.replace('/fields/', '')}\`: ${item.description}`);
    }
    lines.push('');
  }

  if (lines.length <= 2) {
    return 'No significant changes detected.';
  }

  return lines.join('\n');
}

/**
 * Calculate risk score for event schema changes.
 */
function calculateEventSchemaRiskScore(
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

  return Math.min(100, score);
}

/**
 * Check if event schema diff can be auto-approved.
 */
export function canAutoApproveEventSchema(diff: ContractDiff): boolean {
  if (diff.contractType !== 'EventSchema') return false;
  if (diff.breaking) return false;

  // Only allow adding optional fields
  for (const item of diff.changes.added) {
    if (item.details?.required === true) return false;
  }

  // No removed fields
  if (diff.changes.removed.length > 0) return false;

  // Risk score must be low
  if ((diff.riskScore ?? 50) >= 20) return false;

  return true;
}
