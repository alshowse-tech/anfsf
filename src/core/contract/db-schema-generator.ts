/**
 * ASF V4.0 Contract Engine - DB Schema Generator
 *
 * Generates SQL DDL and Prisma schemas from DataIR.
 * Version: v0.9.0
 */

import type { DataIR, EntityIR, FieldIR, RelationshipIR } from '../../req-graph/graph-engine';
import type { DBSchemaDiff } from './types';
import { diffDBSchema } from './diff-dbschema';

// ============================================================================
// Type Mapping
// ============================================================================

/**
 * Map IR field type to PostgreSQL type.
 */
function toPostgresType(field: FieldIR): string {
  const typeMap: Record<string, string> = {
    string: 'VARCHAR(255)',
    number: 'INTEGER',
    integer: 'INTEGER',
    float: 'DECIMAL(10,2)',
    boolean: 'BOOLEAN',
    date: 'DATE',
    datetime: 'TIMESTAMP',
    uuid: 'UUID',
    email: 'VARCHAR(255)',
    url: 'VARCHAR(500)',
    text: 'TEXT',
    json: 'JSONB',
    bigint: 'BIGINT',
  };

  return typeMap[field.type.toLowerCase()] || 'VARCHAR(255)';
}

/**
 * Map IR field type to Prisma type.
 */
function toPrismaType(field: FieldIR): string {
  const typeMap: Record<string, string> = {
    string: 'String',
    number: 'Int',
    integer: 'Int',
    float: 'Float',
    boolean: 'Boolean',
    date: 'DateTime',
    datetime: 'DateTime',
    uuid: 'String',
    email: 'String',
    url: 'String',
    text: 'String',
    json: 'Json',
    bigint: 'BigInt',
  };

  return typeMap[field.type.toLowerCase()] || 'String';
}

// ============================================================================
// SQL DDL Generator
// ============================================================================

/**
 * Generate column definition for SQL.
 */
function generateColumnSQL(field: FieldIR): string {
  const type = toPostgresType(field);
  const nullable = field.required ? ' NOT NULL' : '';
  return `${field.name} ${type}${nullable}`;
}

/**
 * Generate foreign key constraint SQL from relationships.
 */
function generateForeignKeySQL(entity: EntityIR, relationships: RelationshipIR[]): string[] {
  const fkStatements: string[] = [];

  for (const rel of relationships) {
    if (rel.from === entity.name) {
      fkStatements.push(
        `  CONSTRAINT fk_${entity.name.toLowerCase()}_${rel.to} FOREIGN KEY (${rel.from}_id) REFERENCES ${rel.to.toLowerCase()}(id)`
      );
    }
  }

  return fkStatements;
}

/**
 * Generate complete SQL DDL from DataIR.
 *
 * @param data - Data intermediate representation
 * @param dialect - SQL dialect (default: postgresql)
 * @returns SQL DDL statements as string
 *
 * @example
 * ```typescript
 * const sql = generateSQLDDL(dataIR);
 * // CREATE TABLE users (
 * //   id UUID NOT NULL PRIMARY KEY,
 * //   name VARCHAR(255) NOT NULL,
 * //   email VARCHAR(255) NOT NULL
 * // );
 * ```
 */
export function generateSQLDDL(data: DataIR, dialect: string = 'postgresql'): string {
  const statements: string[] = [];

  // Determine table creation order based on relationships
  const order = topologicalSort(data);

  for (const entity of order) {
    const columns = entity.fields.map(f => generateColumnSQL(f));

    // Add primary key if id field exists
    const hasId = entity.fields.some(f => f.name === 'id');
    if (hasId) {
      columns.push('  PRIMARY KEY (id)');
    }

    // Add foreign keys
    const fks = generateForeignKeySQL(entity, data.relationships);
    columns.push(...fks);

    const createTable = `CREATE TABLE ${entity.name.toLowerCase()} (\n${columns.join(',\n')}\n);`;
    statements.push(createTable);
  }

  // Add indexes for foreign keys
  for (const rel of data.relationships) {
    const indexName = `idx_${rel.from.toLowerCase()}_${rel.to.toLowerCase()}`;
    statements.push(
      `CREATE INDEX ${indexName} ON ${rel.from.toLowerCase()}(${rel.from.toLowerCase()}_id);`
    );
  }

  return statements.join('\n\n');
}

/**
 * Topological sort of entities based on relationships.
 * Ensures referenced tables are created before dependent tables.
 */
function topologicalSort(data: DataIR): EntityIR[] {
  const entityMap = new Map(data.entities.map(e => [e.name, e]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const entity of data.entities) {
    inDegree.set(entity.name, 0);
    adjacency.set(entity.name, []);
  }

  for (const rel of data.relationships) {
    if (entityMap.has(rel.from) && entityMap.has(rel.to)) {
      adjacency.get(rel.to)!.push(rel.from);
      inDegree.set(rel.from, (inDegree.get(rel.from) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) {
      queue.push(name);
    }
  }

  const result: EntityIR[] = [];
  while (queue.length > 0) {
    const name = queue.shift()!;
    result.push(entityMap.get(name)!);

    for (const dependent of adjacency.get(name) || []) {
      inDegree.set(dependent, inDegree.get(dependent)! - 1);
      if (inDegree.get(dependent) === 0) {
        queue.push(dependent);
      }
    }
  }

  // Add any entities not in the graph (cycles or disconnected)
  for (const entity of data.entities) {
    if (!result.includes(entity)) {
      result.push(entity);
    }
  }

  return result;
}

// ============================================================================
// Prisma Schema Generator
// ============================================================================

/**
 * Generate Prisma schema from DataIR.
 *
 * @param data - Data intermediate representation
 * @returns Prisma schema as string
 *
 * @example
 * ```typescript
 * const prisma = generatePrismaSchema(dataIR);
 * // generator client {
 * //   provider = "prisma-client-js"
 * // }
 * //
 * // model User {
 * //   id    String @id @default(uuid())
 * //   name  String
 * //   posts Post[]
 * // }
 * // ```
 */
export function generatePrismaSchema(data: DataIR): string {
  const lines: string[] = [];

  // Prisma generator block
  lines.push('generator client {');
  lines.push('  provider = "prisma-client-js"');
  lines.push('}');
  lines.push('');
  lines.push('datasource db {');
  lines.push('  provider = "postgresql"');
  lines.push('  url      = env("DATABASE_URL")');
  lines.push('}');
  lines.push('');

  // Generate models
  for (const entity of data.entities) {
    lines.push(`model ${entity.name} {`);

    for (const field of entity.fields) {
      const prismaType = toPrismaType(field);
      const modifiers = buildPrismaModifiers(field, entity, data);
      lines.push(`  ${field.name}  ${prismaType}${modifiers.join('')}`);
    }

    // Add relationship fields
    for (const rel of data.relationships) {
      if (rel.from === entity.name) {
        const targetEntity = data.entities.find(e => e.name === rel.to);
        if (rel.type === '1:N' || rel.type === '1:n') {
          lines.push(`  ${rel.to}  ${rel.to}[] @relation("${entity.name}To${rel.to}")`);
        } else if (rel.type === '1:1') {
          lines.push(`  ${rel.to}  ${rel.to}? @relation(fields: [${rel.to}Id], references: [id])`);
          lines.push(`  ${rel.to}Id  String? @unique`);
        }
      }
      if (rel.to === entity.name && (rel.type === '1:N' || rel.type === '1:n')) {
        lines.push(`  ${rel.from}  ${rel.from}? @relation("${rel.from}To${entity.name}")`);
      }
    }

    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Build Prisma field modifiers.
 */
function buildPrismaModifiers(field: FieldIR, entity: EntityIR, data: DataIR): string[] {
  const modifiers: string[] = [];

  if (field.name === 'id') {
    modifiers.push(' @id @default(uuid())');
  } else if (field.required) {
    // Required fields don't need ? modifier
  } else {
    modifiers.push('?');
  }

  return modifiers;
}

// ============================================================================
// DB Schema JSON Generator (for diff engine compatibility)
// ============================================================================

/**
 * Generate DB schema in JSON format compatible with diff engine.
 *
 * @param data - Data intermediate representation
 * @param version - Schema version
 * @returns JSON schema string
 */
export function generateDBSchemaJSON(data: DataIR, version: string = '1.0.0'): string {
  const tables: Record<string, any> = {};

  for (const entity of data.entities) {
    const columns = entity.fields.map(f => ({
      name: f.name,
      type: toPostgresType(f),
      nullable: !f.required,
    }));

    const hasId = entity.fields.some(f => f.name === 'id');

    const foreignKeys: any[] = [];
    for (const rel of data.relationships) {
      if (rel.from === entity.name) {
        foreignKeys.push({
          columns: [`${rel.from.toLowerCase()}_id`],
          references: {
            table: rel.to.toLowerCase(),
            columns: ['id'],
          },
        });
      }
    }

    tables[entity.name.toLowerCase()] = {
      name: entity.name.toLowerCase(),
      columns,
      primaryKey: hasId ? ['id'] : undefined,
      foreignKeys: foreignKeys.length > 0 ? foreignKeys : undefined,
      indexes: [],
    };
  }

  // Add indexes for relationships
  for (const rel of data.relationships) {
    const tableName = rel.from.toLowerCase();
    if (tables[tableName]) {
      tables[tableName].indexes.push({
        name: `idx_${tableName}_${rel.to.toLowerCase()}`,
        columns: [`${rel.from.toLowerCase()}_id`],
        unique: false,
      });
    }
  }

  const schema = {
    dialect: 'postgresql',
    version,
    tables,
  };

  return JSON.stringify(schema, null, 2);
}

// ============================================================================
// Diff Integration
// ============================================================================

/**
 * Generate DB schema and compare with previous version if provided.
 *
 * @param data - Data intermediate representation
 * @param version - New schema version
 * @param previousJSON - Optional previous schema JSON for diff
 * @returns Generated schema and optional diff
 */
export function generateDBSchemaWithDiff(
  data: DataIR,
  version: string,
  previousJSON?: string
): { schemaJSON: string; ddl: string; prisma: string; diff?: DBSchemaDiff } {
  const schemaJSON = generateDBSchemaJSON(data, version);
  const ddl = generateSQLDDL(data);
  const prisma = generatePrismaSchema(data);

  if (!previousJSON) {
    return { schemaJSON, ddl, prisma };
  }

  const diff = diffDBSchema(previousJSON, schemaJSON, '0.0.0', version);

  return { schemaJSON, ddl, prisma, diff };
}
