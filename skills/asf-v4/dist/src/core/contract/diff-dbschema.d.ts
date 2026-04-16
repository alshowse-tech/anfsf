/**
 * ASF V4.0 Contract Pack - DB Schema Diff Engine
 *
 * Semantic diff for database schema contracts.
 * Version: v0.8.5
 */
import type { DBSchemaDiff } from './types';
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
    where?: string;
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
export declare function parseDBSchema(spec: string): ParsedDBSchema;
/**
 * Generate semantic diff for DB schemas.
 *
 * @param before - Original schema (JSON string)
 * @param after - New schema (JSON string)
 * @param beforeVersion - Current version (semver)
 * @param afterVersion - Proposed version (semver)
 * @returns DBSchemaDiff result
 */
export declare function diffDBSchema(before: string, after: string, beforeVersion: string, afterVersion: string): DBSchemaDiff;
/**
 * Check if DB schema diff can be auto-approved.
 */
export declare function canAutoApproveDBSchema(diff: DBSchemaDiff): boolean;
export {};
