/**
 * ASF V4.0 Contract Pack - DB Schema Diff Engine
 * 
 * Semantic diff for database schema contracts.
 * Version: v0.8.5
 */

import type { DBSchemaDiff, DiffItem } from './types';
import { determineBumpType } from './semver';

/**
 * Parsed database schema structure.
 */
interface ParsedDBSchema {
  dialect: 'postgresql' | 'mysql' | 'sqlite' | 'mssql';
  version: string;
  tables: Record<string, TableSchema>;
  indexes?: Record<string, IndexSchema>;
  views?: Record<string, ViewSchema>;
}

interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKey?: string[];
  foreignKeys?: ForeignKeySchema[];
  indexes?: IndexDefinition[];
  uniqueConstraints?: string[][];
}

interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  default?: any;
  unique?: boolean;
  comment?: string;
}

interface ForeignKeySchema {
  columns: string[];
  references: {
    table: string;
    columns: string[];
  };
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
  where?: string; // Partial index condition
}

interface IndexSchema {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
}

interface ViewSchema {
  name: string;
  query: string;
  columns: ColumnSchema[];
}

/**
 * Parse DB schema from JSON string.
 */
export function parseDBSchema(spec: string): ParsedDBSchema {
  try {
    return JSON.parse(spec);
  } catch {
    throw new Error('Invalid DB Schema: must be valid JSON');
  }
}

/**
 * Compare two column definitions.
 */
function compareColumns(before: ColumnSchema, after: ColumnSchema, tableName: string): {
  hasChanges: boolean;
  breaking: boolean;
  diff: DiffItem[];
} {
  const diff: DiffItem[] = [];
  let breaking = false;

  const path = `/tables/${tableName}/columns/${before.name}`;

  // Type change (breaking)
  if (before.type !== after.type) {
    diff.push({
      path: `${path}/type`,
      type: 'column_type_change',
      description: `Column type changed: ${before.type} → ${after.type}`,
      severity: 'critical',
      details: { column: before.name, before: before.type, after: after.type },
    });
    breaking = true;
  }

  // Nullable change
  if (before.nullable !== after.nullable) {
    if (!after.nullable && before.nullable) {
      // Making non-nullable is breaking if data exists
      diff.push({
        path: `${path}/nullable`,
        type: 'nullable_change',
        description: `Column changed from NULL to NOT NULL`,
        severity: 'high',
        details: { column: before.name, before: true, after: false },
      });
      breaking = true;
    } else {
      diff.push({
        path: `${path}/nullable`,
        type: 'nullable_change',
        description: `Column changed from NOT NULL to NULL`,
        severity: 'low',
        details: { column: before.name, before: false, after: true },
      });
    }
  }

  // Default value change
  if (before.default !== after.default) {
    diff.push({
      path: `${path}/default`,
      type: 'default_change',
      description: `Default value changed`,
      severity: 'medium',
      details: { column: before.name, before: before.default, after: after.default },
    });
  }

  // Unique constraint change
  if (before.unique !== after.unique) {
    if (after.unique && !before.unique) {
      diff.push({
        path: `${path}/unique`,
        type: 'unique_add',
        description: `Added UNIQUE constraint`,
        severity: 'high',
        details: { column: before.name },
      });
      breaking = true;
    } else {
      diff.push({
        path: `${path}/unique`,
        type: 'unique_remove',
        description: `Removed UNIQUE constraint`,
        severity: 'medium',
        details: { column: before.name },
      });
    }
  }

  return { hasChanges: diff.length > 0, breaking, diff };
}

/**
 * Compare two table definitions.
 */
function compareTables(before: TableSchema, after: TableSchema): {
  hasChanges: boolean;
  breaking: boolean;
  columnsDiff: { added: ColumnSchema[]; removed: ColumnSchema[]; modified: ColumnSchema[] };
  indexesDiff: { added: IndexDefinition[]; removed: IndexDefinition[] };
  diff: DiffItem[];
} {
  const diff: DiffItem[] = [];
  let breaking = false;
  const columnsDiff: { added: ColumnSchema[]; removed: ColumnSchema[]; modified: ColumnSchema[] } = { 
    added: [], 
    removed: [], 
    modified: [] 
  };
  const indexesDiff: { added: IndexDefinition[]; removed: IndexDefinition[] } = { 
    added: [], 
    removed: [] 
  };

  const beforeColumns = new Map(before.columns.map((c) => [c.name, c]));
  const afterColumns = new Map(after.columns.map((c) => [c.name, c]));

  // New columns
  for (const [name, column] of afterColumns) {
    if (!beforeColumns.has(name)) {
      columnsDiff.added.push(column);
      diff.push({
        path: `/tables/${before.name}/columns/${name}`,
        type: 'column_add',
        description: `Added column: ${name} (${column.type})`,
        severity: column.nullable ? 'low' : 'high',
        details: { column: name, type: column.type, nullable: column.nullable },
      });
      // Adding non-nullable column without default is breaking
      if (!column.nullable && column.default === undefined) {
        breaking = true;
      }
    }
  }

  // Removed columns (breaking)
  for (const [name, column] of beforeColumns) {
    if (!afterColumns.has(name)) {
      columnsDiff.removed.push(column);
      diff.push({
        path: `/tables/${before.name}/columns/${name}`,
        type: 'column_remove',
        description: `Removed column: ${name}`,
        severity: 'critical',
        details: { column: name },
      });
      breaking = true;
    }
  }

  // Modified columns
  for (const [name, afterColumn] of afterColumns) {
    const beforeColumn = beforeColumns.get(name);
    if (beforeColumn) {
      const columnDiff = compareColumns(beforeColumn, afterColumn, before.name);
      if (columnDiff.hasChanges) {
        columnsDiff.modified.push(afterColumn);
        diff.push(...columnDiff.diff);
        if (columnDiff.breaking) breaking = true;
      }
    }
  }

  // Compare indexes
  const beforeIndexes = new Map(
    (before.indexes || []).map((i) => [i.name, i])
  );
  const afterIndexes = new Map(
    (after.indexes || []).map((i) => [i.name, i])
  );

  for (const [name, index] of afterIndexes) {
    if (!beforeIndexes.has(name)) {
      indexesDiff.added.push(index);
      diff.push({
        path: `/tables/${before.name}/indexes/${name}`,
        type: 'index_add',
        description: `Added index: ${name} on (${index.columns.join(', ')})`,
        severity: 'low',
        details: { index: name, columns: index.columns },
      });
    }
  }

  for (const [name, index] of beforeIndexes) {
    if (!afterIndexes.has(name)) {
      indexesDiff.removed.push(index);
      diff.push({
        path: `/tables/${before.name}/indexes/${name}`,
        type: 'index_remove',
        description: `Removed index: ${name}`,
        severity: 'medium',
        details: { index: name },
      });
    }
  }

  // Compare primary keys
  const beforePK = before.primaryKey?.sort().join(',');
  const afterPK = after.primaryKey?.sort().join(',');
  if (beforePK !== afterPK) {
    diff.push({
      path: `/tables/${before.name}/primaryKey`,
      type: 'primary_key_change',
      description: `Primary key changed`,
      severity: 'critical',
      details: { before: before.primaryKey, after: after.primaryKey },
    });
    breaking = true;
  }

  // Compare foreign keys
  const beforeFKs = (before.foreignKeys || []).map((fk) =>
    JSON.stringify({ columns: fk.columns, ref: fk.references.table })
  );
  const afterFKs = (after.foreignKeys || []).map((fk) =>
    JSON.stringify({ columns: fk.columns, ref: fk.references.table })
  );

  for (const fk of afterFKs) {
    if (!beforeFKs.includes(fk)) {
      const parsed = JSON.parse(fk);
      diff.push({
        path: `/tables/${before.name}/foreignKeys`,
        type: 'foreign_key_add',
        description: `Added foreign key: ${parsed.columns.join(', ')} → ${parsed.ref}`,
        severity: 'medium',
        details: { columns: parsed.columns, references: parsed.ref },
      });
    }
  }

  for (const fk of beforeFKs) {
    if (!afterFKs.includes(fk)) {
      const parsed = JSON.parse(fk);
      diff.push({
        path: `/tables/${before.name}/foreignKeys`,
        type: 'foreign_key_remove',
        description: `Removed foreign key: ${parsed.columns.join(', ')} → ${parsed.ref}`,
        severity: 'high',
        details: { columns: parsed.columns, references: parsed.ref },
      });
      breaking = true;
    }
  }

  return {
    hasChanges: diff.length > 0,
    breaking,
    columnsDiff,
    indexesDiff,
    diff,
  };
}

/**
 * Generate migration SQL for schema changes.
 */
function generateMigrationSQL(
  tableName: string,
  columnsDiff: any,
  indexesDiff: any,
  dialect: string = 'postgresql'
): { up: string; down: string } {
  const upStatements: string[] = [];
  const downStatements: string[] = [];

  // Column additions
  for (const col of columnsDiff.added) {
    const nullable = col.nullable ? '' : ' NOT NULL';
    const defaultVal = col.default !== undefined ? ` DEFAULT ${JSON.stringify(col.default)}` : '';
    upStatements.push(
      `ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}${nullable}${defaultVal};`
    );
    downStatements.push(`ALTER TABLE ${tableName} DROP COLUMN ${col.name};`);
  }

  // Column removals
  for (const col of columnsDiff.removed) {
    upStatements.push(`ALTER TABLE ${tableName} DROP COLUMN ${col.name};`);
    downStatements.push(
      `ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type};`
    );
  }

  // Index additions
  for (const idx of indexesDiff.added) {
    const unique = idx.unique ? 'UNIQUE ' : '';
    upStatements.push(
      `CREATE ${unique}INDEX ${idx.name} ON ${tableName} (${idx.columns.join(', ')});`
    );
    downStatements.push(`DROP INDEX ${idx.name};`);
  }

  // Index removals
  for (const idx of indexesDiff.removed) {
    upStatements.push(`DROP INDEX ${idx.name};`);
    const unique = idx.unique ? 'UNIQUE ' : '';
    downStatements.push(
      `CREATE ${unique}INDEX ${idx.name} ON ${tableName} (${idx.columns.join(', ')});`
    );
  }

  return {
    up: upStatements.join('\n'),
    down: downStatements.reverse().join('\n'),
  };
}

/**
 * Generate semantic diff for DB schemas.
 * 
 * @param before - Original schema (JSON string)
 * @param after - New schema (JSON string)
 * @param beforeVersion - Current version (semver)
 * @param afterVersion - Proposed version (semver)
 * @returns DBSchemaDiff result
 */
export function diffDBSchema(
  before: string,
  after: string,
  beforeVersion: string,
  afterVersion: string
): DBSchemaDiff {
  const beforeSpec = parseDBSchema(before);
  const afterSpec = parseDBSchema(after);

  const changes: DBSchemaDiff['changes'] = {
    added: [],
    removed: [],
    modified: [],
  };

  let breaking = false;
  const allDiffItems: DiffItem[] = [];

  const beforeTables = new Set(Object.keys(beforeSpec.tables));
  const afterTables = new Set(Object.keys(afterSpec.tables));

  // New tables
  for (const name of afterTables) {
    if (!beforeTables.has(name)) {
      const table = afterSpec.tables[name];
      changes.added.push({
        table: name,
        columns: table.columns,
        indexes: table.indexes || [],
      });
      allDiffItems.push({
        path: `/tables/${name}`,
        type: 'table_add',
        description: `Added table: ${name}`,
        severity: 'low',
        details: { table: name, columns: table.columns.length },
      });
    }
  }

  // Removed tables (breaking)
  for (const name of beforeTables) {
    if (!afterTables.has(name)) {
      changes.removed.push({ table: name });
      allDiffItems.push({
        path: `/tables/${name}`,
        type: 'table_remove',
        description: `Removed table: ${name}`,
        severity: 'critical',
        details: { table: name },
      });
      breaking = true;
    }
  }

  // Modified tables
  for (const name of afterTables) {
    if (beforeTables.has(name)) {
      const tableDiff = compareTables(beforeSpec.tables[name], afterSpec.tables[name]);
      if (tableDiff.hasChanges) {
        changes.modified.push({
          table: name,
          columnsDiff: tableDiff.columnsDiff,
          indexesDiff: tableDiff.indexesDiff,
        });
        allDiffItems.push(...tableDiff.diff);
        if (tableDiff.breaking) breaking = true;
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

  // Generate migration SQL
  let migration: { up: string; down: string } | undefined;
  const modifiedWithChanges = changes.modified.filter((m) =>
    m.columnsDiff.added.length > 0 ||
    m.columnsDiff.removed.length > 0 ||
    m.indexesDiff.added.length > 0 ||
    m.indexesDiff.removed.length > 0
  );

  if (modifiedWithChanges.length > 0 || changes.added.length > 0 || changes.removed.length > 0) {
    const upParts: string[] = [];
    const downParts: string[] = [];

    for (const mod of modifiedWithChanges) {
      const migration = generateMigrationSQL(
        mod.table,
        mod.columnsDiff,
        mod.indexesDiff,
        afterSpec.dialect
      );
      upParts.push(migration.up);
      downParts.push(migration.down);
    }

    migration = {
      up: upParts.join('\n'),
      down: downParts.reverse().join('\n'),
    };
  }

  // Generate changelog
  const changelog = generateDBSchemaChangelog(changes, breaking, bumpType);

  // Calculate risk score
  const riskScore = calculateDBSchemaRiskScore(changes, breaking, allDiffItems);

  return {
    contractType: 'DBSchema',
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
    migration,
  };
}

/**
 * Generate changelog for DB schema changes.
 */
function generateDBSchemaChangelog(
  changes: DBSchemaDiff['changes'],
  breaking: boolean,
  bumpType: string | null
): string {
  const lines: string[] = [];

  if (breaking) {
    lines.push('## ⚠️ BREAKING CHANGES\n');
  }

  if (changes.removed.length > 0) {
    lines.push('### Removed Tables\n');
    for (const item of changes.removed) {
      lines.push(`- \`${item.table}\``);
    }
    lines.push('');
  }

  if (changes.added.length > 0) {
    lines.push('### Added Tables\n');
    for (const item of changes.added) {
      lines.push(`- \`${item.table}\` (${item.columns.length} columns)`);
    }
    lines.push('');
  }

  if (changes.modified.length > 0) {
    lines.push('### Modified Tables\n');
    for (const item of changes.modified) {
      const adds = item.columnsDiff.added.length;
      const removes = item.columnsDiff.removed.length;
      const mods = item.columnsDiff.modified.length;
      lines.push(`- \`${item.table}\` (+${adds} -${removes} ~${mods} columns)`);
    }
    lines.push('');
  }

  if (lines.length === 0) {
    return 'No significant changes detected.';
  }

  return lines.join('\n');
}

/**
 * Calculate risk score for DB schema changes.
 */
function calculateDBSchemaRiskScore(
  changes: DBSchemaDiff['changes'],
  breaking: boolean,
  allDiffItems: DiffItem[]
): number {
  let score = 50;

  if (breaking) score += 30;

  const criticalCount = allDiffItems.filter((d) => d.severity === 'critical').length;
  score += criticalCount * 5;

  score += changes.removed.length * 10;
  score += changes.modified.length * 3;

  return Math.min(100, score);
}

/**
 * Check if DB schema diff can be auto-approved.
 */
export function canAutoApproveDBSchema(diff: DBSchemaDiff): boolean {
  if (diff.breaking) return false;

  // Only allow adding optional columns
  for (const added of diff.changes.added) {
    // New tables are okay
  }

  for (const modified of diff.changes.modified) {
    for (const col of modified.columnsDiff.added) {
      if (!col.nullable && col.default === undefined) {
        return false;
      }
    }
  }

  // No removed tables or columns
  if (diff.changes.removed.length > 0) return false;

  // Risk score must be low
  if ((diff.riskScore || 50) >= 20) return false;

  return true;
}
