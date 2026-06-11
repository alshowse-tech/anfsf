/**
 * API Contract Engine — Tests
 */

import { generateOpenAPISpec, generateOpenAPIWithDiff } from '../api-contract-engine';
import type { IR } from '../../../req-graph/graph-engine';

function makeIR(overrides: Partial<IR> = {}): IR {
  return {
    service: {
      endpoints: [
        { path: '/users', method: 'GET', request: undefined, response: { type: 'array', items: { $ref: '#/components/schemas/User' } } },
        { path: '/users', method: 'POST', request: { $ref: '#/components/schemas/CreateUserInput' }, response: { $ref: '#/components/schemas/User' } },
        { path: '/users/:id', method: 'GET', request: undefined, response: { $ref: '#/components/schemas/User' } },
        { path: '/users/:id', method: 'DELETE', request: undefined, response: { type: 'object', properties: { success: { type: 'boolean' } } } },
      ],
      services: [
        { name: 'users', responsibility: 'User management', dependencies: [] },
      ],
    },
    ui: { components: [], pages: [] },
    workflow: { workflows: [] },
    data: {
      entities: [
        {
          name: 'User',
          fields: [
            { name: 'id', type: 'uuid', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'email', type: 'email', required: true },
            { name: 'age', type: 'integer', required: false },
            { name: 'createdAt', type: 'datetime', required: true },
          ],
        },
      ],
      relationships: [],
    },
    ...overrides,
  };
}

describe('generateOpenAPISpec', () => {
  it('generates valid OpenAPI 3.0 structure', () => {
    const spec = JSON.parse(generateOpenAPISpec(makeIR(), { title: 'Test API', version: '1.0.0' }));

    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info.title).toBe('Test API');
    expect(spec.info.version).toBe('1.0.0');
    expect(spec.paths).toBeDefined();
    expect(spec.components).toBeDefined();
    expect(spec.components.schemas).toBeDefined();
  });

  it('generates paths from endpoints', () => {
    const spec = JSON.parse(generateOpenAPISpec(makeIR(), { title: 'Test', version: '1.0.0' }));

    expect(spec.paths['/users']).toBeDefined();
    expect(spec.paths['/users'].get).toBeDefined();
    expect(spec.paths['/users'].post).toBeDefined();
    expect(spec.paths['/users/:id'].get).toBeDefined();
    expect(spec.paths['/users/:id'].delete).toBeDefined();
  });

  it('generates path parameters for :param syntax', () => {
    const spec = JSON.parse(generateOpenAPISpec(makeIR(), { title: 'Test', version: '1.0.0' }));

    const getUser = spec.paths['/users/:id'].get;
    expect(getUser.parameters).toBeDefined();
    expect(getUser.parameters).toHaveLength(1);
    expect(getUser.parameters[0].name).toBe('id');
    expect(getUser.parameters[0].in).toBe('path');
    expect(getUser.parameters[0].required).toBe(true);
  });

  it('generates request body for POST/PUT/PATCH', () => {
    const spec = JSON.parse(generateOpenAPISpec(makeIR(), { title: 'Test', version: '1.0.0' }));

    expect(spec.paths['/users'].post.requestBody).toBeDefined();
    expect(spec.paths['/users'].get.requestBody).toBeUndefined();
    expect(spec.paths['/users/:id'].delete.requestBody).toBeUndefined();
  });

  it('generates schemas from entities', () => {
    const spec = JSON.parse(generateOpenAPISpec(makeIR(), { title: 'Test', version: '1.0.0' }));

    expect(spec.components.schemas.User).toBeDefined();
    expect(spec.components.schemas.User.type).toBe('object');
    expect(spec.components.schemas.User.properties.name.type).toBe('string');
    expect(spec.components.schemas.User.properties.email.format).toBe('email');
    expect(spec.components.schemas.User.properties.createdAt.format).toBe('date-time');
    expect(spec.components.schemas.User.required).toContain('id');
    expect(spec.components.schemas.User.required).toContain('name');
    expect(spec.components.schemas.User.required).not.toContain('age');
  });

  it('generates tags from services', () => {
    const spec = JSON.parse(generateOpenAPISpec(makeIR(), { title: 'Test', version: '1.0.0' }));

    expect(spec.paths['/users'].get.tags).toContain('users');
    expect(spec.paths['/users'].post.tags).toContain('users');
  });

  it('includes error response schemas', () => {
    const spec = JSON.parse(generateOpenAPISpec(makeIR(), { title: 'Test', version: '1.0.0' }));

    const postResponses = spec.paths['/users'].post.responses;
    expect(postResponses['201']).toBeDefined();
    expect(postResponses['400']).toBeDefined();
    expect(postResponses['500']).toBeDefined();
  });

  it('uses description from metadata', () => {
    const spec = JSON.parse(generateOpenAPISpec(makeIR(), { title: 'Test', version: '1.0.0', description: 'My API' }));

    expect(spec.info.description).toBe('My API');
  });

  it('defaults description when not provided', () => {
    const spec = JSON.parse(generateOpenAPISpec(makeIR(), { title: 'Test', version: '1.0.0' }));

    expect(spec.info.description).toBe('Auto-generated API contract from IR');
  });

  it('handles empty IR gracefully', () => {
    const emptyIR: IR = {
      service: { endpoints: [], services: [] },
      ui: { components: [], pages: [] },
      workflow: { workflows: [] },
      data: { entities: [], relationships: [] },
    };

    const spec = JSON.parse(generateOpenAPISpec(emptyIR, { title: 'Empty', version: '0.1.0' }));
    expect(spec.openapi).toBe('3.0.0');
    expect(Object.keys(spec.paths)).toHaveLength(0);
    expect(Object.keys(spec.components.schemas)).toHaveLength(0);
  });
});

describe('generateOpenAPIWithDiff', () => {
  it('returns spec without diff when no previous spec', () => {
    const result = generateOpenAPIWithDiff(makeIR(), { title: 'Test', version: '1.0.0' });

    expect(result.spec).toBeDefined();
    expect(result.diff).toBeUndefined();
  });

  it('returns diff when previous spec provided', () => {
    const previousSpec = generateOpenAPISpec(makeIR(), { title: 'Test', version: '0.9.0' });
    const result = generateOpenAPIWithDiff(makeIR(), { title: 'Test', version: '1.0.0' }, previousSpec);

    expect(result.spec).toBeDefined();
    expect(result.diff).toBeDefined();
    expect(result.diff!.contractType).toBe('OpenAPI');
  });

  it('detects breaking changes when endpoints removed', () => {
    const previousIR = makeIR();
    const currentIR = makeIR({
      service: {
        endpoints: [
          { path: '/users', method: 'GET', request: undefined, response: {} },
        ],
        services: [{ name: 'users', responsibility: 'User management', dependencies: [] }],
      },
    });

    const previousSpec = generateOpenAPISpec(previousIR, { title: 'Test', version: '1.0.0' });
    const result = generateOpenAPIWithDiff(currentIR, { title: 'Test', version: '1.1.0' }, previousSpec);

    expect(result.diff!.breaking).toBe(true);
  });

  it('detects new endpoints as non-breaking additions', () => {
    const previousIR = makeIR({
      service: {
        endpoints: [
          { path: '/users', method: 'GET', request: undefined, response: {} },
        ],
        services: [],
      },
      ui: { components: [], pages: [] },
      workflow: { workflows: [] },
      data: { entities: [], relationships: [] },
    });

    const currentIR = makeIR();
    const previousSpec = generateOpenAPISpec(previousIR, { title: 'Test', version: '1.0.0' });
    const result = generateOpenAPIWithDiff(currentIR, { title: 'Test', version: '1.1.0' }, previousSpec);

    expect(result.diff!.breaking).toBe(false);
    expect(result.diff!.changes.added.length).toBeGreaterThan(0);
  });
});
