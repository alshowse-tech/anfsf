"use strict";
/**
 * ASF V4.0 Contract Pack - DB Schema Diff Engine
 *
 * Semantic diff for database schema contracts.
 * Version: v0.8.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDBSchema = parseDBSchema;
exports.diffDBSchema = diffDBSchema;
exports.canAutoApproveDBSchema = canAutoApproveDBSchema;
const semver_1 = require("./semver");
/**
 * Parse DB schema from JSON string.
 */
function parseDBSchema(spec) {
    try {
        return JSON.parse(spec);
    }
    catch {
        throw new Error('Invalid DB Schema: must be valid JSON');
    }
}
/**
 * Compare two column definitions.
 */
function compareColumns(before, after, tableName) {
    const diff = [];
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
        }
        else {
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
        }
        else {
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
function compareTables(before, after) {
    const diff = [];
    let breaking = false;
    const columnsDiff = {
        added: [],
        removed: [],
        modified: []
    };
    const indexesDiff = {
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
                if (columnDiff.breaking)
                    breaking = true;
            }
        }
    }
    // Compare indexes
    const beforeIndexes = new Map((before.indexes || []).map((i) => [i.name, i]));
    const afterIndexes = new Map((after.indexes || []).map((i) => [i.name, i]));
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
    const beforeFKs = (before.foreignKeys || []).map((fk) => JSON.stringify({ columns: fk.columns, ref: fk.references.table }));
    const afterFKs = (after.foreignKeys || []).map((fk) => JSON.stringify({ columns: fk.columns, ref: fk.references.table }));
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
function generateMigrationSQL(tableName, columnsDiff, indexesDiff, dialect = 'postgresql') {
    const upStatements = [];
    const downStatements = [];
    // Column additions
    for (const col of columnsDiff.added) {
        const nullable = col.nullable ? '' : ' NOT NULL';
        const defaultVal = col.default !== undefined ? ` DEFAULT ${JSON.stringify(col.default)}` : '';
        upStatements.push(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}${nullable}${defaultVal};`);
        downStatements.push(`ALTER TABLE ${tableName} DROP COLUMN ${col.name};`);
    }
    // Column removals
    for (const col of columnsDiff.removed) {
        upStatements.push(`ALTER TABLE ${tableName} DROP COLUMN ${col.name};`);
        downStatements.push(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type};`);
    }
    // Index additions
    for (const idx of indexesDiff.added) {
        const unique = idx.unique ? 'UNIQUE ' : '';
        upStatements.push(`CREATE ${unique}INDEX ${idx.name} ON ${tableName} (${idx.columns.join(', ')});`);
        downStatements.push(`DROP INDEX ${idx.name};`);
    }
    // Index removals
    for (const idx of indexesDiff.removed) {
        upStatements.push(`DROP INDEX ${idx.name};`);
        const unique = idx.unique ? 'UNIQUE ' : '';
        downStatements.push(`CREATE ${unique}INDEX ${idx.name} ON ${tableName} (${idx.columns.join(', ')});`);
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
function diffDBSchema(before, after, beforeVersion, afterVersion) {
    const beforeSpec = parseDBSchema(before);
    const afterSpec = parseDBSchema(after);
    const changes = {
        added: [],
        removed: [],
        modified: [],
    };
    let breaking = false;
    const allDiffItems = [];
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
                if (tableDiff.breaking)
                    breaking = true;
            }
        }
    }
    // Determine version bump
    const hasNewFeatures = changes.added.length > 0;
    const hasBugFixes = changes.modified.length > 0 && !breaking;
    const bumpType = (0, semver_1.determineBumpType)({
        currentVersion: beforeVersion,
        isBreaking: breaking,
        hasNewFeatures,
        hasBugFixes,
    });
    // Generate migration SQL
    let migration;
    const modifiedWithChanges = changes.modified.filter((m) => m.columnsDiff.added.length > 0 ||
        m.columnsDiff.removed.length > 0 ||
        m.indexesDiff.added.length > 0 ||
        m.indexesDiff.removed.length > 0);
    if (modifiedWithChanges.length > 0 || changes.added.length > 0 || changes.removed.length > 0) {
        const upParts = [];
        const downParts = [];
        for (const mod of modifiedWithChanges) {
            const migration = generateMigrationSQL(mod.table, mod.columnsDiff, mod.indexesDiff, afterSpec.dialect);
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
function generateDBSchemaChangelog(changes, breaking, bumpType) {
    const lines = [];
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
function calculateDBSchemaRiskScore(changes, breaking, allDiffItems) {
    let score = 50;
    if (breaking)
        score += 30;
    const criticalCount = allDiffItems.filter((d) => d.severity === 'critical').length;
    score += criticalCount * 5;
    score += changes.removed.length * 10;
    score += changes.modified.length * 3;
    return Math.min(100, score);
}
/**
 * Check if DB schema diff can be auto-approved.
 */
function canAutoApproveDBSchema(diff) {
    if (diff.breaking)
        return false;
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
    if (diff.changes.removed.length > 0)
        return false;
    // Risk score must be low
    if ((diff.riskScore || 50) >= 20)
        return false;
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi1kYnNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9jb3JlL2NvbnRyYWN0L2RpZmYtZGJzY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOztBQW1FSCxzQ0FNQztBQXdURCxvQ0FtSUM7QUEwRUQsd0RBdUJDO0FBbG1CRCxxQ0FBNkM7QUE2RDdDOztHQUVHO0FBQ0gsU0FBZ0IsYUFBYSxDQUFDLElBQVk7SUFDeEMsSUFBSSxDQUFDO1FBQ0gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDUCxNQUFNLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7SUFDM0QsQ0FBQztBQUNILENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsY0FBYyxDQUFDLE1BQW9CLEVBQUUsS0FBbUIsRUFBRSxTQUFpQjtJQUtsRixNQUFNLElBQUksR0FBZSxFQUFFLENBQUM7SUFDNUIsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO0lBRXJCLE1BQU0sSUFBSSxHQUFHLFdBQVcsU0FBUyxZQUFZLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUUzRCx5QkFBeUI7SUFDekIsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ1IsSUFBSSxFQUFFLEdBQUcsSUFBSSxPQUFPO1lBQ3BCLElBQUksRUFBRSxvQkFBb0I7WUFDMUIsV0FBVyxFQUFFLHdCQUF3QixNQUFNLENBQUMsSUFBSSxNQUFNLEtBQUssQ0FBQyxJQUFJLEVBQUU7WUFDbEUsUUFBUSxFQUFFLFVBQVU7WUFDcEIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FB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QztRQUM3QyxLQUFLLE1BQU0sR0FBRyxJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksR0FBRyxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDL0MsT0FBTyxLQUFLLENBQUM7WUFDZixDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRCwrQkFBK0I7SUFDL0IsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQztRQUFFLE9BQU8sS0FBSyxDQUFDO0lBRWxELHlCQUF5QjtJQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFO1FBQUUsT0FBTyxLQUFLLENBQUM7SUFFL0MsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBU0YgVjQuMCBDb250cmFjdCBQYWNrIC0gREIgU2NoZW1hIERpZmYgRW5naW5lXG4gKiBcbiAqIFNlbWFudGljIGRpZmYgZm9yIGRhdGFiYXNlIHNjaGVtYSBjb250cmFjdHMuXG4gKiBWZXJzaW9uOiB2MC44LjVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IERCU2NoZW1hRGlmZiwgRGlmZkl0ZW0gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGRldGVybWluZUJ1bXBUeXBlIH0gZnJvbSAnLi9zZW12ZXInO1xuXG4vKipcbiAqIFBhcnNlZCBkYXRhYmFzZSBzY2hlbWEgc3RydWN0dXJlLlxuICovXG5pbnRlcmZhY2UgUGFyc2VkREJTY2hlbWEge1xuICBkaWFsZWN0OiAncG9zdGdyZXNxbCcgfCAnbXlzcWwnIHwgJ3NxbGl0ZScgfCAnbXNzcWwnO1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIHRhYmxlczogUmVjb3JkPHN0cmluZywgVGFibGVTY2hlbWE+O1xuICBpbmRleGVzPzogUmVjb3JkPHN0cmluZywgSW5kZXhTY2hlbWE+O1xuICB2aWV3cz86IFJlY29yZDxzdHJpbmcsIFZpZXdTY2hlbWE+O1xufVxuXG5pbnRlcmZhY2UgVGFibGVTY2hlbWEge1xuICBuYW1lOiBzdHJpbmc7XG4gIGNvbHVtbnM6IENvbHVtblNjaGVtYVtdO1xuICBwcmltYXJ5S2V5Pzogc3RyaW5nW107XG4gIGZvcmVpZ25LZXlzPzogRm9yZWlnbktleVNjaGVtYVtdO1xuICBpbmRleGVzPzogSW5kZXhEZWZpbml0aW9uW107XG4gIHVuaXF1ZUNvbnN0cmFpbnRzPzogc3RyaW5nW11bXTtcbn1cblxuaW50ZXJmYWNlIENvbHVtblNjaGVtYSB7XG4gIG5hbWU6IHN0cmluZztcbiAgdHlwZTogc3RyaW5nO1xuICBudWxsYWJsZTogYm9vbGVhbjtcbiAgZGVmYXVsdD86IGFueTtcbiAgdW5pcXVlPzogYm9vbGVhbjtcbiAgY29tbWVudD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEZvcmVpZ25LZXlTY2hlbWEge1xuICBjb2x1bW5zOiBzdHJpbmdbXTtcbiAgcmVmZXJlbmNlczoge1xuICAgIHRhYmxlOiBzdHJpbmc7XG4gICAgY29sdW1uczogc3RyaW5nW107XG4gIH07XG4gIG9uRGVsZXRlPzogJ0NBU0NBREUnIHwgJ1NFVCBOVUxMJyB8ICdSRVNUUklDVCcgfCAnTk8gQUNUSU9OJztcbiAgb25VcGRhdGU/OiAnQ0FTQ0FERScgfCAnU0VUIE5VTEwnIHwgJ1JFU1RSSUNUJyB8ICdOTyBBQ1RJT04nO1xufVxuXG5pbnRlcmZhY2UgSW5kZXhEZWZpbml0aW9uIHtcbiAgbmFtZTogc3RyaW5nO1xuICBjb2x1bW5zOiBzdHJpbmdbXTtcbiAgdW5pcXVlPzogYm9vbGVhbjtcbiAgd2hlcmU/OiBzdHJpbmc7IC8vIFBhcnRpYWwgaW5kZXggY29uZGl0aW9uXG59XG5cbmludGVyZmFjZSBJbmRleFNjaGVtYSB7XG4gIG5hbWU6IHN0cmluZztcbiAgdGFibGU6IHN0cmluZztcbiAgY29sdW1uczogc3RyaW5nW107XG4gIHVuaXF1ZTogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIFZpZXdTY2hlbWEge1xuICBuYW1lOiBzdHJpbmc7XG4gIHF1ZXJ5OiBzdHJpbmc7XG4gIGNvbHVtbnM6IENvbHVtblNjaGVtYVtdO1xufVxuXG4vKipcbiAqIFBhcnNlIERCIHNjaGVtYSBmcm9tIEpTT04gc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VEQlNjaGVtYShzcGVjOiBzdHJpbmcpOiBQYXJzZWREQlNjaGVtYSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2Uoc3BlYyk7XG4gIH0gY2F0Y2gge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBEQiBTY2hlbWE6IG11c3QgYmUgdmFsaWQgSlNPTicpO1xuICB9XG59XG5cbi8qKlxuICogQ29tcGFyZSB0d28gY29sdW1uIGRlZmluaXRpb25zLlxuICovXG5mdW5jdGlvbiBjb21wYXJlQ29sdW1ucyhiZWZvcmU6IENvbHVtblNjaGVtYSwgYWZ0ZXI6IENvbHVtblNjaGVtYSwgdGFibGVOYW1lOiBzdHJpbmcpOiB7XG4gIGhhc0NoYW5nZXM6IGJvb2xlYW47XG4gIGJyZWFraW5nOiBib29sZWFuO1xuICBkaWZmOiBEaWZmSXRlbVtdO1xufSB7XG4gIGNvbnN0IGRpZmY6IERpZmZJdGVtW10gPSBbXTtcbiAgbGV0IGJyZWFraW5nID0gZmFsc2U7XG5cbiAgY29uc3QgcGF0aCA9IGAvdGFibGVzLyR7dGFibGVOYW1lfS9jb2x1bW5zLyR7YmVmb3JlLm5hbWV9YDtcblxuICAvLyBUeXBlIGNoYW5nZSAoYnJlYWtpbmcpXG4gIGlmIChiZWZvcmUudHlwZSAhPT0gYWZ0ZXIudHlwZSkge1xuICAgIGRpZmYucHVzaCh7XG4gICAgICBwYXRoOiBgJHtwYXRofS90eXBlYCxcbiAgICAgIHR5cGU6ICdjb2x1bW5fdHlwZV9jaGFuZ2UnLFxuICAgICAgZGVzY3JpcHRpb246IGBDb2x1bW4gdHlwZSBjaGFuZ2VkOiAke2JlZm9yZS50eXBlfSDihpIgJHthZnRlci50eXBlfWAsXG4gICAgICBzZXZlcml0eTogJ2NyaXRpY2FsJyxcbiAgICAgIGRldGFpbHM6IHsgY29sdW1uOiBiZWZvcmUubmFtZSwgYmVmb3JlOiBiZWZvcmUudHlwZSwgYWZ0ZXI6IGFmdGVyLnR5cGUgfSxcbiAgICB9KTtcbiAgICBicmVha2luZyA9IHRydWU7XG4gIH1cblxuICAvLyBOdWxsYWJsZSBjaGFuZ2VcbiAgaWYgKGJlZm9yZS5udWxsYWJsZSAhPT0gYWZ0ZXIubnVsbGFibGUpIHtcbiAgICBpZiAoIWFmdGVyLm51bGxhYmxlICYmIGJlZm9yZS5udWxsYWJsZSkge1xuICAgICAgLy8gTWFraW5nIG5vbi1udWxsYWJsZSBpcyBicmVha2luZyBpZiBkYXRhIGV4aXN0c1xuICAgICAgZGlmZi5wdXNoKHtcbiAgICAgICAgcGF0aDogYCR7cGF0aH0vbnVsbGFibGVgLFxuICAgICAgICB0eXBlOiAnbnVsbGFibGVfY2hhbmdlJyxcbiAgICAgICAgZGVzY3JpcHRpb246IGBDb2x1bW4gY2hhbmdlZCBmcm9tIE5VTEwgdG8gTk9UIE5VTExgLFxuICAgICAgICBzZXZlcml0eTogJ2hpZ2gnLFxuICAgICAgICBkZXRhaWxzOiB7IGNvbHVtbjogYmVmb3JlLm5hbWUsIGJlZm9yZTogdHJ1ZSwgYWZ0ZXI6IGZhbHNlIH0sXG4gICAgICB9KTtcbiAgICAgIGJyZWFraW5nID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGlmZi5wdXNoKHtcbiAgICAgICAgcGF0aDogYCR7cGF0aH0vbnVsbGFibGVgLFxuICAgICAgICB0eXBlOiAnbnVsbGFibGVfY2hhbmdlJyxcbiAgICAgICAgZGVzY3JpcHRpb246IGBDb2x1bW4gY2hhbmdlZCBmcm9tIE5PVCBOVUxMIHRvIE5VTExgLFxuICAgICAgICBzZXZlcml0eTogJ2xvdycsXG4gICAgICAgIGRldGFpbHM6IHsgY29sdW1uOiBiZWZvcmUubmFtZSwgYmVmb3JlOiBmYWxzZSwgYWZ0ZXI6IHRydWUgfSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIERlZmF1bHQgdmFsdWUgY2hhbmdlXG4gIGlmIChiZWZvcmUuZGVmYXVsdCAhPT0gYWZ0ZXIuZGVmYXVsdCkge1xuICAgIGRpZmYucHVzaCh7XG4gICAgICBwYXRoOiBgJHtwYXRofS9kZWZhdWx0YCxcbiAgICAgIHR5cGU6ICdkZWZhdWx0X2NoYW5nZScsXG4gICAgICBkZXNjcmlwdGlvbjogYERlZmF1bHQgdmFsdWUgY2hhbmdlZGAsXG4gICAgICBzZXZlcml0eTogJ21lZGl1bScsXG4gICAgICBkZXRhaWxzOiB7IGNvbHVtbjogYmVmb3JlLm5hbWUsIGJlZm9yZTogYmVmb3JlLmRlZmF1bHQsIGFmdGVyOiBhZnRlci5kZWZhdWx0IH0sXG4gICAgfSk7XG4gIH1cblxuICAvLyBVbmlxdWUgY29uc3RyYWludCBjaGFuZ2VcbiAgaWYgKGJlZm9yZS51bmlxdWUgIT09IGFmdGVyLnVuaXF1ZSkge1xuICAgIGlmIChhZnRlci51bmlxdWUgJiYgIWJlZm9yZS51bmlxdWUpIHtcbiAgICAgIGRpZmYucHVzaCh7XG4gICAgICAgIHBhdGg6IGAke3BhdGh9L3VuaXF1ZWAsXG4gICAgICAgIHR5cGU6ICd1bmlxdWVfYWRkJyxcbiAgICAgICAgZGVzY3JpcHRpb246IGBBZGRlZCBVTklRVUUgY29uc3RyYWludGAsXG4gICAgICAgIHNldmVyaXR5OiAnaGlnaCcsXG4gICAgICAgIGRldGFpbHM6IHsgY29sdW1uOiBiZWZvcmUubmFtZSB9LFxuICAgICAgfSk7XG4gICAgICBicmVha2luZyA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpZmYucHVzaCh7XG4gICAgICAgIHBhdGg6IGAke3BhdGh9L3VuaXF1ZWAsXG4gICAgICAgIHR5cGU6ICd1bmlxdWVfcmVtb3ZlJyxcbiAgICAgICAgZGVzY3JpcHRpb246IGBSZW1vdmVkIFVOSVFVRSBjb25zdHJhaW50YCxcbiAgICAgICAgc2V2ZXJpdHk6ICdtZWRpdW0nLFxuICAgICAgICBkZXRhaWxzOiB7IGNvbHVtbjogYmVmb3JlLm5hbWUgfSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7IGhhc0NoYW5nZXM6IGRpZmYubGVuZ3RoID4gMCwgYnJlYWtpbmcsIGRpZmYgfTtcbn1cblxuLyoqXG4gKiBDb21wYXJlIHR3byB0YWJsZSBkZWZpbml0aW9ucy5cbiAqL1xuZnVuY3Rpb24gY29tcGFyZVRhYmxlcyhiZWZvcmU6IFRhYmxlU2NoZW1hLCBhZnRlcjogVGFibGVTY2hlbWEpOiB7XG4gIGhhc0NoYW5nZXM6IGJvb2xlYW47XG4gIGJyZWFraW5nOiBib29sZWFuO1xuICBjb2x1bW5zRGlmZjogeyBhZGRlZDogQ29sdW1uU2NoZW1hW107IHJlbW92ZWQ6IENvbHVtblNjaGVtYVtdOyBtb2RpZmllZDogQ29sdW1uU2NoZW1hW10gfTtcbiAgaW5kZXhlc0RpZmY6IHsgYWRkZWQ6IEluZGV4RGVmaW5pdGlvbltdOyByZW1vdmVkOiBJbmRleERlZmluaXRpb25bXSB9O1xuICBkaWZmOiBEaWZmSXRlbVtdO1xufSB7XG4gIGNvbnN0IGRpZmY6IERpZmZJdGVtW10gPSBbXTtcbiAgbGV0IGJyZWFraW5nID0gZmFsc2U7XG4gIGNvbnN0IGNvbHVtbnNEaWZmOiB7IGFkZGVkOiBDb2x1bW5TY2hlbWFbXTsgcmVtb3ZlZDogQ29sdW1uU2NoZW1hW107IG1vZGlmaWVkOiBDb2x1bW5TY2hlbWFbXSB9ID0geyBcbiAgICBhZGRlZDogW10sIFxuICAgIHJlbW92ZWQ6IFtdLCBcbiAgICBtb2RpZmllZDogW10gXG4gIH07XG4gIGNvbnN0IGluZGV4ZXNEaWZmOiB7IGFkZGVkOiBJbmRleERlZmluaXRpb25bXTsgcmVtb3ZlZDogSW5kZXhEZWZpbml0aW9uW10gfSA9IHsgXG4gICAgYWRkZWQ6IFtdLCBcbiAgICByZW1vdmVkOiBbXSBcbiAgfTtcblxuICBjb25zdCBiZWZvcmVDb2x1bW5zID0gbmV3IE1hcChiZWZvcmUuY29sdW1ucy5tYXAoKGMpID0+IFtjLm5hbWUsIGNdKSk7XG4gIGNvbnN0IGFmdGVyQ29sdW1ucyA9IG5ldyBNYXAoYWZ0ZXIuY29sdW1ucy5tYXAoKGMpID0+IFtjLm5hbWUsIGNdKSk7XG5cbiAgLy8gTmV3IGNvbHVtbnNcbiAgZm9yIChjb25zdCBbbmFtZSwgY29sdW1uXSBvZiBhZnRlckNvbHVtbnMpIHtcbiAgICBpZiAoIWJlZm9yZUNvbHVtbnMuaGFzKG5hbWUpKSB7XG4gICAgICBjb2x1bW5zRGlmZi5hZGRlZC5wdXNoKGNvbHVtbik7XG4gICAgICBkaWZmLnB1c2goe1xuICAgICAgICBwYXRoOiBgL3RhYmxlcy8ke2JlZm9yZS5uYW1lfS9jb2x1bW5zLyR7bmFtZX1gLFxuICAgICAgICB0eXBlOiAnY29sdW1uX2FkZCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgQWRkZWQgY29sdW1uOiAke25hbWV9ICgke2NvbHVtbi50eXBlfSlgLFxuICAgICAgICBzZXZlcml0eTogY29sdW1uLm51bGxhYmxlID8gJ2xvdycgOiAnaGlnaCcsXG4gICAgICAgIGRldGFpbHM6IHsgY29sdW1uOiBuYW1lLCB0eXBlOiBjb2x1bW4udHlwZSwgbnVsbGFibGU6IGNvbHVtbi5udWxsYWJsZSB9LFxuICAgICAgfSk7XG4gICAgICAvLyBBZGRpbmcgbm9uLW51bGxhYmxlIGNvbHVtbiB3aXRob3V0IGRlZmF1bHQgaXMgYnJlYWtpbmdcbiAgICAgIGlmICghY29sdW1uLm51bGxhYmxlICYmIGNvbHVtbi5kZWZhdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYnJlYWtpbmcgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFJlbW92ZWQgY29sdW1ucyAoYnJlYWtpbmcpXG4gIGZvciAoY29uc3QgW25hbWUsIGNvbHVtbl0gb2YgYmVmb3JlQ29sdW1ucykge1xuICAgIGlmICghYWZ0ZXJDb2x1bW5zLmhhcyhuYW1lKSkge1xuICAgICAgY29sdW1uc0RpZmYucmVtb3ZlZC5wdXNoKGNvbHVtbik7XG4gICAgICBkaWZmLnB1c2goe1xuICAgICAgICBwYXRoOiBgL3RhYmxlcy8ke2JlZm9yZS5uYW1lfS9jb2x1bW5zLyR7bmFtZX1gLFxuICAgICAgICB0eXBlOiAnY29sdW1uX3JlbW92ZScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgUmVtb3ZlZCBjb2x1bW46ICR7bmFtZX1gLFxuICAgICAgICBzZXZlcml0eTogJ2NyaXRpY2FsJyxcbiAgICAgICAgZGV0YWlsczogeyBjb2x1bW46IG5hbWUgfSxcbiAgICAgIH0pO1xuICAgICAgYnJlYWtpbmcgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8vIE1vZGlmaWVkIGNvbHVtbnNcbiAgZm9yIChjb25zdCBbbmFtZSwgYWZ0ZXJDb2x1bW5dIG9mIGFmdGVyQ29sdW1ucykge1xuICAgIGNvbnN0IGJlZm9yZUNvbHVtbiA9IGJlZm9yZUNvbHVtbnMuZ2V0KG5hbWUpO1xuICAgIGlmIChiZWZvcmVDb2x1bW4pIHtcbiAgICAgIGNvbnN0IGNvbHVtbkRpZmYgPSBjb21wYXJlQ29sdW1ucyhiZWZvcmVDb2x1bW4sIGFmdGVyQ29sdW1uLCBiZWZvcmUubmFtZSk7XG4gICAgICBpZiAoY29sdW1uRGlmZi5oYXNDaGFuZ2VzKSB7XG4gICAgICAgIGNvbHVtbnNEaWZmLm1vZGlmaWVkLnB1c2goYWZ0ZXJDb2x1bW4pO1xuICAgICAgICBkaWZmLnB1c2goLi4uY29sdW1uRGlmZi5kaWZmKTtcbiAgICAgICAgaWYgKGNvbHVtbkRpZmYuYnJlYWtpbmcpIGJyZWFraW5nID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDb21wYXJlIGluZGV4ZXNcbiAgY29uc3QgYmVmb3JlSW5kZXhlcyA9IG5ldyBNYXAoXG4gICAgKGJlZm9yZS5pbmRleGVzIHx8IFtdKS5tYXAoKGkpID0+IFtpLm5hbWUsIGldKVxuICApO1xuICBjb25zdCBhZnRlckluZGV4ZXMgPSBuZXcgTWFwKFxuICAgIChhZnRlci5pbmRleGVzIHx8IFtdKS5tYXAoKGkpID0+IFtpLm5hbWUsIGldKVxuICApO1xuXG4gIGZvciAoY29uc3QgW25hbWUsIGluZGV4XSBvZiBhZnRlckluZGV4ZXMpIHtcbiAgICBpZiAoIWJlZm9yZUluZGV4ZXMuaGFzKG5hbWUpKSB7XG4gICAgICBpbmRleGVzRGlmZi5hZGRlZC5wdXNoKGluZGV4KTtcbiAgICAgIGRpZmYucHVzaCh7XG4gICAgICAgIHBhdGg6IGAvdGFibGVzLyR7YmVmb3JlLm5hbWV9L2luZGV4ZXMvJHtuYW1lfWAsXG4gICAgICAgIHR5cGU6ICdpbmRleF9hZGQnLFxuICAgICAgICBkZXNjcmlwdGlvbjogYEFkZGVkIGluZGV4OiAke25hbWV9IG9uICgke2luZGV4LmNvbHVtbnMuam9pbignLCAnKX0pYCxcbiAgICAgICAgc2V2ZXJpdHk6ICdsb3cnLFxuICAgICAgICBkZXRhaWxzOiB7IGluZGV4OiBuYW1lLCBjb2x1bW5zOiBpbmRleC5jb2x1bW5zIH0sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IFtuYW1lLCBpbmRleF0gb2YgYmVmb3JlSW5kZXhlcykge1xuICAgIGlmICghYWZ0ZXJJbmRleGVzLmhhcyhuYW1lKSkge1xuICAgICAgaW5kZXhlc0RpZmYucmVtb3ZlZC5wdXNoKGluZGV4KTtcbiAgICAgIGRpZmYucHVzaCh7XG4gICAgICAgIHBhdGg6IGAvdGFibGVzLyR7YmVmb3JlLm5hbWV9L2luZGV4ZXMvJHtuYW1lfWAsXG4gICAgICAgIHR5cGU6ICdpbmRleF9yZW1vdmUnLFxuICAgICAgICBkZXNjcmlwdGlvbjogYFJlbW92ZWQgaW5kZXg6ICR7bmFtZX1gLFxuICAgICAgICBzZXZlcml0eTogJ21lZGl1bScsXG4gICAgICAgIGRldGFpbHM6IHsgaW5kZXg6IG5hbWUgfSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIENvbXBhcmUgcHJpbWFyeSBrZXlzXG4gIGNvbnN0IGJlZm9yZVBLID0gYmVmb3JlLnByaW1hcnlLZXk/LnNvcnQoKS5qb2luKCcsJyk7XG4gIGNvbnN0IGFmdGVyUEsgPSBhZnRlci5wcmltYXJ5S2V5Py5zb3J0KCkuam9pbignLCcpO1xuICBpZiAoYmVmb3JlUEsgIT09IGFmdGVyUEspIHtcbiAgICBkaWZmLnB1c2goe1xuICAgICAgcGF0aDogYC90YWJsZXMvJHtiZWZvcmUubmFtZX0vcHJpbWFyeUtleWAsXG4gICAgICB0eXBlOiAncHJpbWFyeV9rZXlfY2hhbmdlJyxcbiAgICAgIGRlc2NyaXB0aW9uOiBgUHJpbWFyeSBrZXkgY2hhbmdlZGAsXG4gICAgICBzZXZlcml0eTogJ2NyaXRpY2FsJyxcbiAgICAgIGRldGFpbHM6IHsgYmVmb3JlOiBiZWZvcmUucHJpbWFyeUtleSwgYWZ0ZXI6IGFmdGVyLnByaW1hcnlLZXkgfSxcbiAgICB9KTtcbiAgICBicmVha2luZyA9IHRydWU7XG4gIH1cblxuICAvLyBDb21wYXJlIGZvcmVpZ24ga2V5c1xuICBjb25zdCBiZWZvcmVGS3MgPSAoYmVmb3JlLmZvcmVpZ25LZXlzIHx8IFtdKS5tYXAoKGZrKSA9PlxuICAgIEpTT04uc3RyaW5naWZ5KHsgY29sdW1uczogZmsuY29sdW1ucywgcmVmOiBmay5yZWZlcmVuY2VzLnRhYmxlIH0pXG4gICk7XG4gIGNvbnN0IGFmdGVyRktzID0gKGFmdGVyLmZvcmVpZ25LZXlzIHx8IFtdKS5tYXAoKGZrKSA9PlxuICAgIEpTT04uc3RyaW5naWZ5KHsgY29sdW1uczogZmsuY29sdW1ucywgcmVmOiBmay5yZWZlcmVuY2VzLnRhYmxlIH0pXG4gICk7XG5cbiAgZm9yIChjb25zdCBmayBvZiBhZnRlckZLcykge1xuICAgIGlmICghYmVmb3JlRktzLmluY2x1ZGVzKGZrKSkge1xuICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShmayk7XG4gICAgICBkaWZmLnB1c2goe1xuICAgICAgICBwYXRoOiBgL3RhYmxlcy8ke2JlZm9yZS5uYW1lfS9mb3JlaWduS2V5c2AsXG4gICAgICAgIHR5cGU6ICdmb3JlaWduX2tleV9hZGQnLFxuICAgICAgICBkZXNjcmlwdGlvbjogYEFkZGVkIGZvcmVpZ24ga2V5OiAke3BhcnNlZC5jb2x1bW5zLmpvaW4oJywgJyl9IOKGkiAke3BhcnNlZC5yZWZ9YCxcbiAgICAgICAgc2V2ZXJpdHk6ICdtZWRpdW0nLFxuICAgICAgICBkZXRhaWxzOiB7IGNvbHVtbnM6IHBhcnNlZC5jb2x1bW5zLCByZWZlcmVuY2VzOiBwYXJzZWQucmVmIH0sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IGZrIG9mIGJlZm9yZUZLcykge1xuICAgIGlmICghYWZ0ZXJGS3MuaW5jbHVkZXMoZmspKSB7XG4gICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGZrKTtcbiAgICAgIGRpZmYucHVzaCh7XG4gICAgICAgIHBhdGg6IGAvdGFibGVzLyR7YmVmb3JlLm5hbWV9L2ZvcmVpZ25LZXlzYCxcbiAgICAgICAgdHlwZTogJ2ZvcmVpZ25fa2V5X3JlbW92ZScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgUmVtb3ZlZCBmb3JlaWduIGtleTogJHtwYXJzZWQuY29sdW1ucy5qb2luKCcsICcpfSDihpIgJHtwYXJzZWQucmVmfWAsXG4gICAgICAgIHNldmVyaXR5OiAnaGlnaCcsXG4gICAgICAgIGRldGFpbHM6IHsgY29sdW1uczogcGFyc2VkLmNvbHVtbnMsIHJlZmVyZW5jZXM6IHBhcnNlZC5yZWYgfSxcbiAgICAgIH0pO1xuICAgICAgYnJlYWtpbmcgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaGFzQ2hhbmdlczogZGlmZi5sZW5ndGggPiAwLFxuICAgIGJyZWFraW5nLFxuICAgIGNvbHVtbnNEaWZmLFxuICAgIGluZGV4ZXNEaWZmLFxuICAgIGRpZmYsXG4gIH07XG59XG5cbi8qKlxuICogR2VuZXJhdGUgbWlncmF0aW9uIFNRTCBmb3Igc2NoZW1hIGNoYW5nZXMuXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlTWlncmF0aW9uU1FMKFxuICB0YWJsZU5hbWU6IHN0cmluZyxcbiAgY29sdW1uc0RpZmY6IGFueSxcbiAgaW5kZXhlc0RpZmY6IGFueSxcbiAgZGlhbGVjdDogc3RyaW5nID0gJ3Bvc3RncmVzcWwnXG4pOiB7IHVwOiBzdHJpbmc7IGRvd246IHN0cmluZyB9IHtcbiAgY29uc3QgdXBTdGF0ZW1lbnRzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBkb3duU3RhdGVtZW50czogc3RyaW5nW10gPSBbXTtcblxuICAvLyBDb2x1bW4gYWRkaXRpb25zXG4gIGZvciAoY29uc3QgY29sIG9mIGNvbHVtbnNEaWZmLmFkZGVkKSB7XG4gICAgY29uc3QgbnVsbGFibGUgPSBjb2wubnVsbGFibGUgPyAnJyA6ICcgTk9UIE5VTEwnO1xuICAgIGNvbnN0IGRlZmF1bHRWYWwgPSBjb2wuZGVmYXVsdCAhPT0gdW5kZWZpbmVkID8gYCBERUZBVUxUICR7SlNPTi5zdHJpbmdpZnkoY29sLmRlZmF1bHQpfWAgOiAnJztcbiAgICB1cFN0YXRlbWVudHMucHVzaChcbiAgICAgIGBBTFRFUiBUQUJMRSAke3RhYmxlTmFtZX0gQUREIENPTFVNTiAke2NvbC5uYW1lfSAke2NvbC50eXBlfSR7bnVsbGFibGV9JHtkZWZhdWx0VmFsfTtgXG4gICAgKTtcbiAgICBkb3duU3RhdGVtZW50cy5wdXNoKGBBTFRFUiBUQUJMRSAke3RhYmxlTmFtZX0gRFJPUCBDT0xVTU4gJHtjb2wubmFtZX07YCk7XG4gIH1cblxuICAvLyBDb2x1bW4gcmVtb3ZhbHNcbiAgZm9yIChjb25zdCBjb2wgb2YgY29sdW1uc0RpZmYucmVtb3ZlZCkge1xuICAgIHVwU3RhdGVtZW50cy5wdXNoKGBBTFRFUiBUQUJMRSAke3RhYmxlTmFtZX0gRFJPUCBDT0xVTU4gJHtjb2wubmFtZX07YCk7XG4gICAgZG93blN0YXRlbWVudHMucHVzaChcbiAgICAgIGBBTFRFUiBUQUJMRSAke3RhYmxlTmFtZX0gQUREIENPTFVNTiAke2NvbC5uYW1lfSAke2NvbC50eXBlfTtgXG4gICAgKTtcbiAgfVxuXG4gIC8vIEluZGV4IGFkZGl0aW9uc1xuICBmb3IgKGNvbnN0IGlkeCBvZiBpbmRleGVzRGlmZi5hZGRlZCkge1xuICAgIGNvbnN0IHVuaXF1ZSA9IGlkeC51bmlxdWUgPyAnVU5JUVVFICcgOiAnJztcbiAgICB1cFN0YXRlbWVudHMucHVzaChcbiAgICAgIGBDUkVBVEUgJHt1bmlxdWV9SU5ERVggJHtpZHgubmFtZX0gT04gJHt0YWJsZU5hbWV9ICgke2lkeC5jb2x1bW5zLmpvaW4oJywgJyl9KTtgXG4gICAgKTtcbiAgICBkb3duU3RhdGVtZW50cy5wdXNoKGBEUk9QIElOREVYICR7aWR4Lm5hbWV9O2ApO1xuICB9XG5cbiAgLy8gSW5kZXggcmVtb3ZhbHNcbiAgZm9yIChjb25zdCBpZHggb2YgaW5kZXhlc0RpZmYucmVtb3ZlZCkge1xuICAgIHVwU3RhdGVtZW50cy5wdXNoKGBEUk9QIElOREVYICR7aWR4Lm5hbWV9O2ApO1xuICAgIGNvbnN0IHVuaXF1ZSA9IGlkeC51bmlxdWUgPyAnVU5JUVVFICcgOiAnJztcbiAgICBkb3duU3RhdGVtZW50cy5wdXNoKFxuICAgICAgYENSRUFURSAke3VuaXF1ZX1JTkRFWCAke2lkeC5uYW1lfSBPTiAke3RhYmxlTmFtZX0gKCR7aWR4LmNvbHVtbnMuam9pbignLCAnKX0pO2BcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB1cDogdXBTdGF0ZW1lbnRzLmpvaW4oJ1xcbicpLFxuICAgIGRvd246IGRvd25TdGF0ZW1lbnRzLnJldmVyc2UoKS5qb2luKCdcXG4nKSxcbiAgfTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBzZW1hbnRpYyBkaWZmIGZvciBEQiBzY2hlbWFzLlxuICogXG4gKiBAcGFyYW0gYmVmb3JlIC0gT3JpZ2luYWwgc2NoZW1hIChKU09OIHN0cmluZylcbiAqIEBwYXJhbSBhZnRlciAtIE5ldyBzY2hlbWEgKEpTT04gc3RyaW5nKVxuICogQHBhcmFtIGJlZm9yZVZlcnNpb24gLSBDdXJyZW50IHZlcnNpb24gKHNlbXZlcilcbiAqIEBwYXJhbSBhZnRlclZlcnNpb24gLSBQcm9wb3NlZCB2ZXJzaW9uIChzZW12ZXIpXG4gKiBAcmV0dXJucyBEQlNjaGVtYURpZmYgcmVzdWx0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaWZmREJTY2hlbWEoXG4gIGJlZm9yZTogc3RyaW5nLFxuICBhZnRlcjogc3RyaW5nLFxuICBiZWZvcmVWZXJzaW9uOiBzdHJpbmcsXG4gIGFmdGVyVmVyc2lvbjogc3RyaW5nXG4pOiBEQlNjaGVtYURpZmYge1xuICBjb25zdCBiZWZvcmVTcGVjID0gcGFyc2VEQlNjaGVtYShiZWZvcmUpO1xuICBjb25zdCBhZnRlclNwZWMgPSBwYXJzZURCU2NoZW1hKGFmdGVyKTtcblxuICBjb25zdCBjaGFuZ2VzOiBEQlNjaGVtYURpZmZbJ2NoYW5nZXMnXSA9IHtcbiAgICBhZGRlZDogW10sXG4gICAgcmVtb3ZlZDogW10sXG4gICAgbW9kaWZpZWQ6IFtdLFxuICB9O1xuXG4gIGxldCBicmVha2luZyA9IGZhbHNlO1xuICBjb25zdCBhbGxEaWZmSXRlbXM6IERpZmZJdGVtW10gPSBbXTtcblxuICBjb25zdCBiZWZvcmVUYWJsZXMgPSBuZXcgU2V0KE9iamVjdC5rZXlzKGJlZm9yZVNwZWMudGFibGVzKSk7XG4gIGNvbnN0IGFmdGVyVGFibGVzID0gbmV3IFNldChPYmplY3Qua2V5cyhhZnRlclNwZWMudGFibGVzKSk7XG5cbiAgLy8gTmV3IHRhYmxlc1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgYWZ0ZXJUYWJsZXMpIHtcbiAgICBpZiAoIWJlZm9yZVRhYmxlcy5oYXMobmFtZSkpIHtcbiAgICAgIGNvbnN0IHRhYmxlID0gYWZ0ZXJTcGVjLnRhYmxlc1tuYW1lXTtcbiAgICAgIGNoYW5nZXMuYWRkZWQucHVzaCh7XG4gICAgICAgIHRhYmxlOiBuYW1lLFxuICAgICAgICBjb2x1bW5zOiB0YWJsZS5jb2x1bW5zLFxuICAgICAgICBpbmRleGVzOiB0YWJsZS5pbmRleGVzIHx8IFtdLFxuICAgICAgfSk7XG4gICAgICBhbGxEaWZmSXRlbXMucHVzaCh7XG4gICAgICAgIHBhdGg6IGAvdGFibGVzLyR7bmFtZX1gLFxuICAgICAgICB0eXBlOiAndGFibGVfYWRkJyxcbiAgICAgICAgZGVzY3JpcHRpb246IGBBZGRlZCB0YWJsZTogJHtuYW1lfWAsXG4gICAgICAgIHNldmVyaXR5OiAnbG93JyxcbiAgICAgICAgZGV0YWlsczogeyB0YWJsZTogbmFtZSwgY29sdW1uczogdGFibGUuY29sdW1ucy5sZW5ndGggfSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJlbW92ZWQgdGFibGVzIChicmVha2luZylcbiAgZm9yIChjb25zdCBuYW1lIG9mIGJlZm9yZVRhYmxlcykge1xuICAgIGlmICghYWZ0ZXJUYWJsZXMuaGFzKG5hbWUpKSB7XG4gICAgICBjaGFuZ2VzLnJlbW92ZWQucHVzaCh7IHRhYmxlOiBuYW1lIH0pO1xuICAgICAgYWxsRGlmZkl0ZW1zLnB1c2goe1xuICAgICAgICBwYXRoOiBgL3RhYmxlcy8ke25hbWV9YCxcbiAgICAgICAgdHlwZTogJ3RhYmxlX3JlbW92ZScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgUmVtb3ZlZCB0YWJsZTogJHtuYW1lfWAsXG4gICAgICAgIHNldmVyaXR5OiAnY3JpdGljYWwnLFxuICAgICAgICBkZXRhaWxzOiB7IHRhYmxlOiBuYW1lIH0sXG4gICAgICB9KTtcbiAgICAgIGJyZWFraW5nID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvLyBNb2RpZmllZCB0YWJsZXNcbiAgZm9yIChjb25zdCBuYW1lIG9mIGFmdGVyVGFibGVzKSB7XG4gICAgaWYgKGJlZm9yZVRhYmxlcy5oYXMobmFtZSkpIHtcbiAgICAgIGNvbnN0IHRhYmxlRGlmZiA9IGNvbXBhcmVUYWJsZXMoYmVmb3JlU3BlYy50YWJsZXNbbmFtZV0sIGFmdGVyU3BlYy50YWJsZXNbbmFtZV0pO1xuICAgICAgaWYgKHRhYmxlRGlmZi5oYXNDaGFuZ2VzKSB7XG4gICAgICAgIGNoYW5nZXMubW9kaWZpZWQucHVzaCh7XG4gICAgICAgICAgdGFibGU6IG5hbWUsXG4gICAgICAgICAgY29sdW1uc0RpZmY6IHRhYmxlRGlmZi5jb2x1bW5zRGlmZixcbiAgICAgICAgICBpbmRleGVzRGlmZjogdGFibGVEaWZmLmluZGV4ZXNEaWZmLFxuICAgICAgICB9KTtcbiAgICAgICAgYWxsRGlmZkl0ZW1zLnB1c2goLi4udGFibGVEaWZmLmRpZmYpO1xuICAgICAgICBpZiAodGFibGVEaWZmLmJyZWFraW5nKSBicmVha2luZyA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gRGV0ZXJtaW5lIHZlcnNpb24gYnVtcFxuICBjb25zdCBoYXNOZXdGZWF0dXJlcyA9IGNoYW5nZXMuYWRkZWQubGVuZ3RoID4gMDtcbiAgY29uc3QgaGFzQnVnRml4ZXMgPSBjaGFuZ2VzLm1vZGlmaWVkLmxlbmd0aCA+IDAgJiYgIWJyZWFraW5nO1xuICBjb25zdCBidW1wVHlwZSA9IGRldGVybWluZUJ1bXBUeXBlKHtcbiAgICBjdXJyZW50VmVyc2lvbjogYmVmb3JlVmVyc2lvbixcbiAgICBpc0JyZWFraW5nOiBicmVha2luZyxcbiAgICBoYXNOZXdGZWF0dXJlcyxcbiAgICBoYXNCdWdGaXhlcyxcbiAgfSk7XG5cbiAgLy8gR2VuZXJhdGUgbWlncmF0aW9uIFNRTFxuICBsZXQgbWlncmF0aW9uOiB7IHVwOiBzdHJpbmc7IGRvd246IHN0cmluZyB9IHwgdW5kZWZpbmVkO1xuICBjb25zdCBtb2RpZmllZFdpdGhDaGFuZ2VzID0gY2hhbmdlcy5tb2RpZmllZC5maWx0ZXIoKG0pID0+XG4gICAgbS5jb2x1bW5zRGlmZi5hZGRlZC5sZW5ndGggPiAwIHx8XG4gICAgbS5jb2x1bW5zRGlmZi5yZW1vdmVkLmxlbmd0aCA+IDAgfHxcbiAgICBtLmluZGV4ZXNEaWZmLmFkZGVkLmxlbmd0aCA+IDAgfHxcbiAgICBtLmluZGV4ZXNEaWZmLnJlbW92ZWQubGVuZ3RoID4gMFxuICApO1xuXG4gIGlmIChtb2RpZmllZFdpdGhDaGFuZ2VzLmxlbmd0aCA+IDAgfHwgY2hhbmdlcy5hZGRlZC5sZW5ndGggPiAwIHx8IGNoYW5nZXMucmVtb3ZlZC5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgdXBQYXJ0czogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCBkb3duUGFydHM6IHN0cmluZ1tdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IG1vZCBvZiBtb2RpZmllZFdpdGhDaGFuZ2VzKSB7XG4gICAgICBjb25zdCBtaWdyYXRpb24gPSBnZW5lcmF0ZU1pZ3JhdGlvblNRTChcbiAgICAgICAgbW9kLnRhYmxlLFxuICAgICAgICBtb2QuY29sdW1uc0RpZmYsXG4gICAgICAgIG1vZC5pbmRleGVzRGlmZixcbiAgICAgICAgYWZ0ZXJTcGVjLmRpYWxlY3RcbiAgICAgICk7XG4gICAgICB1cFBhcnRzLnB1c2gobWlncmF0aW9uLnVwKTtcbiAgICAgIGRvd25QYXJ0cy5wdXNoKG1pZ3JhdGlvbi5kb3duKTtcbiAgICB9XG5cbiAgICBtaWdyYXRpb24gPSB7XG4gICAgICB1cDogdXBQYXJ0cy5qb2luKCdcXG4nKSxcbiAgICAgIGRvd246IGRvd25QYXJ0cy5yZXZlcnNlKCkuam9pbignXFxuJyksXG4gICAgfTtcbiAgfVxuXG4gIC8vIEdlbmVyYXRlIGNoYW5nZWxvZ1xuICBjb25zdCBjaGFuZ2Vsb2cgPSBnZW5lcmF0ZURCU2NoZW1hQ2hhbmdlbG9nKGNoYW5nZXMsIGJyZWFraW5nLCBidW1wVHlwZSk7XG5cbiAgLy8gQ2FsY3VsYXRlIHJpc2sgc2NvcmVcbiAgY29uc3Qgcmlza1Njb3JlID0gY2FsY3VsYXRlREJTY2hlbWFSaXNrU2NvcmUoY2hhbmdlcywgYnJlYWtpbmcsIGFsbERpZmZJdGVtcyk7XG5cbiAgcmV0dXJuIHtcbiAgICBjb250cmFjdFR5cGU6ICdEQlNjaGVtYScsXG4gICAgdmVyc2lvbjoge1xuICAgICAgYmVmb3JlOiBiZWZvcmVWZXJzaW9uLFxuICAgICAgYWZ0ZXI6IGFmdGVyVmVyc2lvbixcbiAgICAgIGJ1bXA6IGJ1bXBUeXBlLFxuICAgIH0sXG4gICAgY2hhbmdlcyxcbiAgICBicmVha2luZyxcbiAgICByZXF1aXJlc0FwcHJvdmFsOiBicmVha2luZyB8fCBidW1wVHlwZSA9PT0gJ21ham9yJyxcbiAgICBjaGFuZ2Vsb2csXG4gICAgcmlza1Njb3JlLFxuICAgIG1pZ3JhdGlvbixcbiAgfTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBjaGFuZ2Vsb2cgZm9yIERCIHNjaGVtYSBjaGFuZ2VzLlxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZURCU2NoZW1hQ2hhbmdlbG9nKFxuICBjaGFuZ2VzOiBEQlNjaGVtYURpZmZbJ2NoYW5nZXMnXSxcbiAgYnJlYWtpbmc6IGJvb2xlYW4sXG4gIGJ1bXBUeXBlOiBzdHJpbmcgfCBudWxsXG4pOiBzdHJpbmcge1xuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcblxuICBpZiAoYnJlYWtpbmcpIHtcbiAgICBsaW5lcy5wdXNoKCcjIyDimqDvuI8gQlJFQUtJTkcgQ0hBTkdFU1xcbicpO1xuICB9XG5cbiAgaWYgKGNoYW5nZXMucmVtb3ZlZC5sZW5ndGggPiAwKSB7XG4gICAgbGluZXMucHVzaCgnIyMjIFJlbW92ZWQgVGFibGVzXFxuJyk7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGNoYW5nZXMucmVtb3ZlZCkge1xuICAgICAgbGluZXMucHVzaChgLSBcXGAke2l0ZW0udGFibGV9XFxgYCk7XG4gICAgfVxuICAgIGxpbmVzLnB1c2goJycpO1xuICB9XG5cbiAgaWYgKGNoYW5nZXMuYWRkZWQubGVuZ3RoID4gMCkge1xuICAgIGxpbmVzLnB1c2goJyMjIyBBZGRlZCBUYWJsZXNcXG4nKTtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgY2hhbmdlcy5hZGRlZCkge1xuICAgICAgbGluZXMucHVzaChgLSBcXGAke2l0ZW0udGFibGV9XFxgICgke2l0ZW0uY29sdW1ucy5sZW5ndGh9IGNvbHVtbnMpYCk7XG4gICAgfVxuICAgIGxpbmVzLnB1c2goJycpO1xuICB9XG5cbiAgaWYgKGNoYW5nZXMubW9kaWZpZWQubGVuZ3RoID4gMCkge1xuICAgIGxpbmVzLnB1c2goJyMjIyBNb2RpZmllZCBUYWJsZXNcXG4nKTtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgY2hhbmdlcy5tb2RpZmllZCkge1xuICAgICAgY29uc3QgYWRkcyA9IGl0ZW0uY29sdW1uc0RpZmYuYWRkZWQubGVuZ3RoO1xuICAgICAgY29uc3QgcmVtb3ZlcyA9IGl0ZW0uY29sdW1uc0RpZmYucmVtb3ZlZC5sZW5ndGg7XG4gICAgICBjb25zdCBtb2RzID0gaXRlbS5jb2x1bW5zRGlmZi5tb2RpZmllZC5sZW5ndGg7XG4gICAgICBsaW5lcy5wdXNoKGAtIFxcYCR7aXRlbS50YWJsZX1cXGAgKCske2FkZHN9IC0ke3JlbW92ZXN9IH4ke21vZHN9IGNvbHVtbnMpYCk7XG4gICAgfVxuICAgIGxpbmVzLnB1c2goJycpO1xuICB9XG5cbiAgaWYgKGxpbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiAnTm8gc2lnbmlmaWNhbnQgY2hhbmdlcyBkZXRlY3RlZC4nO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZSByaXNrIHNjb3JlIGZvciBEQiBzY2hlbWEgY2hhbmdlcy5cbiAqL1xuZnVuY3Rpb24gY2FsY3VsYXRlREJTY2hlbWFSaXNrU2NvcmUoXG4gIGNoYW5nZXM6IERCU2NoZW1hRGlmZlsnY2hhbmdlcyddLFxuICBicmVha2luZzogYm9vbGVhbixcbiAgYWxsRGlmZkl0ZW1zOiBEaWZmSXRlbVtdXG4pOiBudW1iZXIge1xuICBsZXQgc2NvcmUgPSA1MDtcblxuICBpZiAoYnJlYWtpbmcpIHNjb3JlICs9IDMwO1xuXG4gIGNvbnN0IGNyaXRpY2FsQ291bnQgPSBhbGxEaWZmSXRlbXMuZmlsdGVyKChkKSA9PiBkLnNldmVyaXR5ID09PSAnY3JpdGljYWwnKS5sZW5ndGg7XG4gIHNjb3JlICs9IGNyaXRpY2FsQ291bnQgKiA1O1xuXG4gIHNjb3JlICs9IGNoYW5nZXMucmVtb3ZlZC5sZW5ndGggKiAxMDtcbiAgc2NvcmUgKz0gY2hhbmdlcy5tb2RpZmllZC5sZW5ndGggKiAzO1xuXG4gIHJldHVybiBNYXRoLm1pbigxMDAsIHNjb3JlKTtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBEQiBzY2hlbWEgZGlmZiBjYW4gYmUgYXV0by1hcHByb3ZlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbkF1dG9BcHByb3ZlREJTY2hlbWEoZGlmZjogREJTY2hlbWFEaWZmKTogYm9vbGVhbiB7XG4gIGlmIChkaWZmLmJyZWFraW5nKSByZXR1cm4gZmFsc2U7XG5cbiAgLy8gT25seSBhbGxvdyBhZGRpbmcgb3B0aW9uYWwgY29sdW1uc1xuICBmb3IgKGNvbnN0IGFkZGVkIG9mIGRpZmYuY2hhbmdlcy5hZGRlZCkge1xuICAgIC8vIE5ldyB0YWJsZXMgYXJlIG9rYXlcbiAgfVxuXG4gIGZvciAoY29uc3QgbW9kaWZpZWQgb2YgZGlmZi5jaGFuZ2VzLm1vZGlmaWVkKSB7XG4gICAgZm9yIChjb25zdCBjb2wgb2YgbW9kaWZpZWQuY29sdW1uc0RpZmYuYWRkZWQpIHtcbiAgICAgIGlmICghY29sLm51bGxhYmxlICYmIGNvbC5kZWZhdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIE5vIHJlbW92ZWQgdGFibGVzIG9yIGNvbHVtbnNcbiAgaWYgKGRpZmYuY2hhbmdlcy5yZW1vdmVkLmxlbmd0aCA+IDApIHJldHVybiBmYWxzZTtcblxuICAvLyBSaXNrIHNjb3JlIG11c3QgYmUgbG93XG4gIGlmICgoZGlmZi5yaXNrU2NvcmUgfHwgNTApID49IDIwKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIHRydWU7XG59XG4iXX0=