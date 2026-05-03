/**
 * ASF V4.0 Contract Pack - UI Props Diff Engine
 *
 * Semantic diff for UI component prop contracts.
 * Version: v0.8.5
 */

import type { UIPropsDiff, DiffItem } from './types';
import { determineBumpType } from './semver';

/**
 * Parsed UI props structure.
 */
interface ParsedUIProps {
  componentName: string;
  version: string;
  props: Record<string, PropDefinition>;
}

interface PropDefinition {
  type: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
  deprecated?: boolean;
  union?: string[];
  shape?: Record<string, PropDefinition>;
}

/**
 * Parse UI props from JSON string.
 */
export function parseUIProps(spec: string): ParsedUIProps {
  try {
    return JSON.parse(spec);
  } catch {
    throw new Error('Invalid UI Props: must be valid JSON');
  }
}

/**
 * Compare two prop definitions.
 */
function compareProps(
  before: PropDefinition,
  after: PropDefinition,
  propName: string,
  path: string
): { diff: DiffItem[]; breaking: boolean } {
  const diff: DiffItem[] = [];
  let breaking = false;

  // Type change (always breaking)
  if (before.type !== after.type) {
    diff.push({
      path: `${path}/type`,
      type: 'prop_type_change',
      description: `Prop '${propName}' type changed: ${before.type} → ${after.type}`,
      severity: 'critical',
      details: { prop: propName, before: before.type, after: after.type },
    });
    breaking = true;
  }

  // Required constraint added (breaking)
  if (!before.required && after.required) {
    diff.push({
      path: `${path}/required`,
      type: 'prop_required_add',
      description: `Prop '${propName}' changed from optional to required`,
      severity: 'critical',
      details: { prop: propName, before: false, after: true },
    });
    breaking = true;
  }

  // Required constraint removed (non-breaking, good)
  if (before.required && !after.required) {
    diff.push({
      path: `${path}/required`,
      type: 'prop_required_remove',
      description: `Prop '${propName}' changed from required to optional`,
      severity: 'low',
      details: { prop: propName, before: true, after: false },
    });
  }

  // Default value removed while prop is required (breaking)
  if (before.defaultValue !== undefined && after.defaultValue === undefined && after.required) {
    diff.push({
      path: `${path}/defaultValue`,
      type: 'prop_default_remove',
      description: `Default value removed for required prop '${propName}'`,
      severity: 'high',
      details: { prop: propName, before: before.defaultValue },
    });
  }

  // Deprecated status changed
  if (!before.deprecated && after.deprecated) {
    diff.push({
      path: `${path}/deprecated`,
      type: 'prop_deprecated',
      description: `Prop '${propName}' marked as deprecated`,
      severity: 'medium',
      details: { prop: propName },
    });
  }

  // Union type changes
  if (before.union && after.union) {
    const beforeUnion = new Set(before.union);
    const afterUnion = new Set(after.union);

    for (const val of afterUnion) {
      if (!beforeUnion.has(val)) {
        diff.push({
          path: `${path}/union`,
          type: 'union_add',
          description: `Added union value '${val}' to prop '${propName}'`,
          severity: 'low',
          details: { prop: propName, value: val },
        });
      }
    }

    for (const val of beforeUnion) {
      if (!afterUnion.has(val)) {
        diff.push({
          path: `${path}/union`,
          type: 'union_remove',
          description: `Removed union value '${val}' from prop '${propName}'`,
          severity: 'high',
          details: { prop: propName, value: val },
        });
        breaking = true;
      }
    }
  }

  return { diff, breaking };
}

/**
 * Generate semantic diff for UI Props.
 *
 * @param before - Original props spec (JSON string)
 * @param after - New props spec (JSON string)
 * @param beforeVersion - Current version (semver)
 * @param afterVersion - Proposed version (semver)
 * @returns UIPropsDiff result
 */
export function diffUIProps(
  before: string,
  after: string,
  beforeVersion: string,
  afterVersion: string
): UIPropsDiff {
  const beforeSpec = parseUIProps(before);
  const afterSpec = parseUIProps(after);

  const changes: UIPropsDiff['changes'] = {
    added: [],
    removed: [],
    modified: [],
  };

  let breaking = false;
  const allDiffItems: DiffItem[] = [];

  const beforeProps = new Set(Object.keys(beforeSpec.props || {}));
  const afterProps = new Set(Object.keys(afterSpec.props || {}));

  // New props
  for (const name of afterProps) {
    if (!beforeProps.has(name)) {
      const prop = afterSpec.props[name];
      changes.added.push({
        prop: name,
        type: prop.type,
        required: prop.required,
      });

      const severity = prop.required ? 'high' : 'low';
      allDiffItems.push({
        path: `/props/${name}`,
        type: 'prop_add',
        description: `Added ${prop.required ? 'required' : 'optional'} prop: ${name} (${prop.type})`,
        severity,
        details: { prop: name, type: prop.type, required: prop.required },
      });

      if (prop.required) breaking = true;
    }
  }

  // Removed props (breaking)
  for (const name of beforeProps) {
    if (!afterProps.has(name)) {
      const prop = beforeSpec.props[name];
      changes.removed.push({ prop: name, type: prop.type });

      allDiffItems.push({
        path: `/props/${name}`,
        type: 'prop_remove',
        description: `Removed prop: ${name} (${prop.type})`,
        severity: 'critical',
        details: { prop: name, type: prop.type },
      });
      breaking = true;
    }
  }

  // Modified props
  for (const name of afterProps) {
    if (beforeProps.has(name)) {
      const beforeProp = beforeSpec.props[name];
      const afterProp = afterSpec.props[name];

      const propDiff = compareProps(beforeProp, afterProp, name, `/props/${name}`);
      if (propDiff.diff.length > 0) {
        changes.modified.push({
          prop: name,
          typeBefore: beforeProp.type,
          typeAfter: afterProp.type,
        });
        allDiffItems.push(...propDiff.diff);
        if (propDiff.breaking) breaking = true;
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

  // Generate changelog
  const changelog = generateUIPropsChangelog(changes, breaking, bumpType);

  // Calculate risk score
  const riskScore = calculateUIPropsRiskScore(changes, breaking, allDiffItems);

  return {
    contractType: 'UIProps',
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
 * Generate changelog for UI Props changes.
 */
function generateUIPropsChangelog(
  changes: UIPropsDiff['changes'],
  breaking: boolean,
  _bumpType: string | null
): string {
  const lines: string[] = [];

  if (breaking) {
    lines.push('## ⚠️ BREAKING CHANGES\n');
  }

  if (changes.removed.length > 0) {
    lines.push('### Removed Props\n');
    for (const item of changes.removed) {
      lines.push(`- \`${item.prop}\` (${item.type})`);
    }
    lines.push('');
  }

  if (changes.added.length > 0) {
    lines.push('### Added Props\n');
    for (const item of changes.added) {
      const req = item.required ? 'required' : 'optional';
      lines.push(`- \`${item.prop}\`: ${item.type} (${req})`);
    }
    lines.push('');
  }

  if (changes.modified.length > 0) {
    lines.push('### Modified Props\n');
    for (const item of changes.modified) {
      if (item.typeBefore !== item.typeAfter) {
        lines.push(`- \`${item.prop}\`: ${item.typeBefore} → ${item.typeAfter}`);
      } else {
        lines.push(`- \`${item.prop}\` (metadata changed)`);
      }
    }
    lines.push('');
  }

  if (lines.length === 0) {
    return 'No significant changes detected.';
  }

  return lines.join('\n');
}

/**
 * Calculate risk score for UI Props changes.
 */
function calculateUIPropsRiskScore(
  changes: UIPropsDiff['changes'],
  breaking: boolean,
  allDiffItems: DiffItem[]
): number {
  let score = 0;

  if (breaking) score += 30;

  const criticalCount = allDiffItems.filter((d) => d.severity === 'critical').length;
  score += criticalCount * 5;

  score += changes.removed.length * 10;
  score += changes.modified.length * 2;

  return Math.min(100, score);
}

/**
 * Check if UI Props diff can be auto-approved.
 */
export function canAutoApproveUIProps(diff: UIPropsDiff): boolean {
  if (diff.breaking) return false;

  // Only allow adding optional props
  for (const item of diff.changes.added) {
    if (item.required) return false;
  }

  // No removed props
  if (diff.changes.removed.length > 0) return false;

  // Modified props must not have type changes
  for (const item of diff.changes.modified) {
    if (item.typeBefore !== item.typeAfter) return false;
  }

  // Risk score must be low
  if ((diff.riskScore ?? 50) >= 20) return false;

  return true;
}
