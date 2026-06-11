/**
 * DB Schema Generator — Tests
 */

import {
  generateSQLDDL,
  generatePrismaSchema,
  generateDBSchemaJSON,
  generateDBSchemaWithDiff,
} from '../db-schema-generator';
import type { DataIR } from '../../../req-graph/graph-engine';

function makeDataIR(overrides: Partial<DataIR> = {}): DataIR {
  return {
    entities: [
      {
        name: 'User',
        fields: [
          { name: 'id', type: 'uuid', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'email', required: true },
          { name: 'age', type: 'integer', required: false },
        ],
      },
      {
        name: 'Post',
        fields: [
          { name: 'id', type: 'uuid', required: true },
          { name: 'title', type: 'string', required: true },
          { name: 'content', type: 'text', required: false },
          { name: 'authorId', type: 'uuid', required: true },
        ],
      },
    ],
    relationships: [
      { from: 'Post', to: 'User', type: 'N:1' },
    ],
    ...overrides,
  };
}

describe('generateSQLDDL', () => {
  it('generates CREATE TABLE statements', () => {
    const ddl = generateSQLDDL(makeDataIR());

    expect(ddl).toContain('CREATE TABLE user');
    expect(ddl).toContain('CREATE TABLE post');
  });

  it('generates column definitions with types', () => {
    const ddl = generateSQLDDL(makeDataIR());

    expect(ddl).toContain('id UUID NOT NULL');
    expect(ddl).toContain('name VARCHAR(255) NOT NULL');
    expect(ddl).toContain('age INTEGER');
  });

  it('marks required fields as NOT NULL', () => {
    const ddl = generateSQLDDL(makeDataIR());

    expect(ddl).toContain('name VARCHAR(255) NOT NULL');
    expect(ddl).not.toMatch(/age.*NOT NULL/);
  });

  it('adds PRIMARY KEY for id fields', () => {
    const ddl = generateSQLDDL(makeDataIR());

    expect(ddl).toContain('PRIMARY KEY (id)');
  });

  it('generates foreign key constraints from relationships', () => {
    const ddl = generateSQLDDL(makeDataIR());

    expect(ddl).toContain('FOREIGN KEY');
    expect(ddl).toContain('REFERENCES');
  });

  it('generates indexes for relationships', () => {
    const ddl = generateSQLDDL(makeDataIR());

    expect(ddl).toContain('CREATE INDEX');
    expect(ddl).toContain('idx_post_user');
  });

  it('respects topological order (referenced tables first)', () => {
    const ddl = generateSQLDDL(makeDataIR());

    const userPos = ddl.indexOf('CREATE TABLE user');
    const postPos = ddl.indexOf('CREATE TABLE post');
    expect(userPos).toBeLessThan(postPos);
  });

  it('handles empty data IR', () => {
    const emptyData: DataIR = { entities: [], relationships: [] };
    const ddl = generateSQLDDL(emptyData);

    expect(ddl.trim()).toBe('');
  });

  it('handles entity with no relationships', () => {
    const data: DataIR = {
      entities: [
        { name: 'Config', fields: [{ name: 'id', type: 'uuid', required: true }, { name: 'key', type: 'string', required: true }] },
      ],
      relationships: [],
    };

    const ddl = generateSQLDDL(data);
    expect(ddl).toContain('CREATE TABLE config');
    expect(ddl).not.toContain('FOREIGN KEY');
  });
});

describe('generatePrismaSchema', () => {
  it('generates Prisma generator block', () => {
    const prisma = generatePrismaSchema(makeDataIR());

    expect(prisma).toContain('generator client');
    expect(prisma).toContain('provider = "prisma-client-js"');
  });

  it('generates datasource block', () => {
    const prisma = generatePrismaSchema(makeDataIR());

    expect(prisma).toContain('datasource db');
    expect(prisma).toContain('provider = "postgresql"');
    expect(prisma).toContain('env("DATABASE_URL")');
  });

  it('generates model blocks', () => {
    const prisma = generatePrismaSchema(makeDataIR());

    expect(prisma).toContain('model User');
    expect(prisma).toContain('model Post');
  });

  it('maps IR types to Prisma types', () => {
    const prisma = generatePrismaSchema(makeDataIR());

    expect(prisma).toContain('String');
    expect(prisma).toContain('Int');
  });

  it('marks id fields with @id @default(uuid())', () => {
    const prisma = generatePrismaSchema(makeDataIR());

    expect(prisma).toContain('@id @default(uuid())');
  });

  it('handles optional fields', () => {
    const prisma = generatePrismaSchema(makeDataIR());

    // age is not required, should be optional or not marked as required
    expect(prisma).toContain('age');
  });

  it('handles empty data IR', () => {
    const emptyData: DataIR = { entities: [], relationships: [] };
    const prisma = generatePrismaSchema(emptyData);

    expect(prisma).toContain('generator client');
    expect(prisma).not.toContain('model');
  });
});

describe('generateDBSchemaJSON', () => {
  it('generates valid JSON structure', () => {
    const json = JSON.parse(generateDBSchemaJSON(makeDataIR()));

    expect(json.dialect).toBe('postgresql');
    expect(json.version).toBe('1.0.0');
    expect(json.tables).toBeDefined();
  });

  it('generates table entries for each entity', () => {
    const json = JSON.parse(generateDBSchemaJSON(makeDataIR()));

    expect(json.tables.user).toBeDefined();
    expect(json.tables.post).toBeDefined();
  });

  it('generates column definitions', () => {
    const json = JSON.parse(generateDBSchemaJSON(makeDataIR()));

    expect(json.tables.user.columns).toHaveLength(4);
    expect(json.tables.user.columns[0].name).toBe('id');
    expect(json.tables.user.columns[0].type).toBe('UUID');
    expect(json.tables.user.columns[0].nullable).toBe(false);
  });

  it('generates foreign keys from relationships', () => {
    const json = JSON.parse(generateDBSchemaJSON(makeDataIR()));

    expect(json.tables.post.foreignKeys).toBeDefined();
    expect(json.tables.post.foreignKeys).toHaveLength(1);
  });

  it('supports custom version', () => {
    const json = JSON.parse(generateDBSchemaJSON(makeDataIR(), '2.0.0'));

    expect(json.version).toBe('2.0.0');
  });
});

describe('generateDBSchemaWithDiff', () => {
  it('returns schema without diff when no previous', () => {
    const result = generateDBSchemaWithDiff(makeDataIR(), '1.0.0');

    expect(result.schemaJSON).toBeDefined();
    expect(result.ddl).toBeDefined();
    expect(result.prisma).toBeDefined();
    expect(result.diff).toBeUndefined();
  });

  it('returns diff when previous schema provided', () => {
    const previous = generateDBSchemaJSON(makeDataIR(), '0.9.0');
    const result = generateDBSchemaWithDiff(makeDataIR(), '1.0.0', previous);

    expect(result.diff).toBeDefined();
    expect(result.diff!.contractType).toBe('DBSchema');
  });

  it('includes migration SQL in diff for schema changes', () => {
    const previousData: DataIR = {
      entities: [
        { name: 'User', fields: [{ name: 'id', type: 'uuid', required: true }, { name: 'name', type: 'string', required: true }] },
      ],
      relationships: [],
    };

    const currentData = makeDataIR();
    const previous = generateDBSchemaJSON(previousData, '0.9.0');
    const result = generateDBSchemaWithDiff(currentData, '1.0.0', previous);

    expect(result.diff!.migration).toBeDefined();
    expect(result.diff!.migration!.up).toBeDefined();
    expect(result.diff!.migration!.down).toBeDefined();
  });
});
