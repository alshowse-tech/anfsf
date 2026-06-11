/**
 * ASF V4.0 Contract Engine - API Contract Generator
 *
 * Generates OpenAPI 3.0 specs from ServiceIR and DataIR.
 * Version: v0.9.0
 */

import type { IR, ServiceIR, DataIR, EntityIR, EndpointIR, FieldIR } from '../../req-graph/graph-engine';
import type { OpenAPIDiff } from './types';
import { diffOpenAPI } from './diff-openapi';

// ============================================================================
// OpenAPI 3.0 Generator
// ============================================================================

/**
 * Convert an IR field type to OpenAPI schema type.
 */
function mapFieldType(field: FieldIR): Record<string, unknown> {
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    integer: 'integer',
    boolean: 'boolean',
    date: 'string',
    datetime: 'string',
    uuid: 'string',
    email: 'string',
    url: 'string',
    object: 'object',
    array: 'array',
  };

  const baseType = typeMap[field.type.toLowerCase()] || 'string';

  const schema: Record<string, unknown> = { type: baseType };

  if (baseType === 'string' && ['date', 'datetime', 'uuid', 'email', 'url'].includes(field.type.toLowerCase())) {
    const formatMap: Record<string, string> = {
      date: 'date',
      datetime: 'date-time',
      uuid: 'uuid',
      email: 'email',
      url: 'uri',
    };
    schema.format = formatMap[field.type.toLowerCase()];
  }

  return schema;
}

/**
 * Generate OpenAPI schema from an EntityIR.
 */
function entityToSchema(entity: EntityIR): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of entity.fields) {
    properties[field.name] = mapFieldType(field);
    if (field.required) {
      required.push(field.name);
    }
  }

  const schema: Record<string, unknown> = {
    type: 'object',
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

/**
 * Generate OpenAPI parameters from endpoint request.
 */
function generateParameters(endpoint: EndpointIR): Array<Record<string, unknown>> {
  const params: Array<Record<string, unknown>> = [];

  // Extract path parameters from endpoint path
  const pathParamRegex = /:([\w]+)/g;
  let match;
  while ((match = pathParamRegex.exec(endpoint.path)) !== null) {
    params.push({
      name: match[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
  }

  return params;
}

/**
 * Generate request body schema from endpoint.
 */
function generateRequestBody(endpoint: EndpointIR): Record<string, unknown> | null {
  const method = endpoint.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH'].includes(method)) {
    return null;
  }

  return {
    content: {
      'application/json': {
        schema: endpoint.request || { type: 'object' },
      },
    },
  };
}

/**
 * Generate response schema from endpoint.
 */
function generateResponse(endpoint: EndpointIR): Record<string, unknown> {
  const successCode = endpoint.method.toUpperCase() === 'POST' ? 201 : 200;

  return {
    [successCode]: {
      description: 'Successful operation',
      content: {
        'application/json': {
          schema: endpoint.response || { type: 'object' },
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
  };
}

/**
 * Generate complete OpenAPI 3.0 spec from IR.
 *
 * @param ir - Intermediate representation with services and data
 * @param info - API metadata
 * @returns Valid OpenAPI 3.0 JSON string
 *
 * @example
 * ```typescript
 * const spec = generateOpenAPISpec(ir, {
 *   title: 'Todo API',
 *   version: '1.0.0',
 *   description: 'API for managing todos'
 * });
 * ```
 */
export function generateOpenAPISpec(
  ir: IR,
  info: { title: string; version: string; description?: string }
): string {
  const paths: Record<string, Record<string, unknown>> = {};
  const schemas: Record<string, unknown> = {};

  // Generate paths from endpoints
  for (const endpoint of ir.service.endpoints) {
    const pathKey = endpoint.path;
    const method = endpoint.method.toLowerCase();

    if (!paths[pathKey]) {
      paths[pathKey] = {};
    }

    const operation: Record<string, unknown> = {
      summary: `${method.toUpperCase()} ${pathKey}`,
      tags: [detectServiceTag(endpoint, ir.service)],
    };

    const parameters = generateParameters(endpoint);
    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    const requestBody = generateRequestBody(endpoint);
    if (requestBody) {
      operation.requestBody = requestBody;
    }

    operation.responses = generateResponse(endpoint);

    paths[pathKey][method] = operation;
  }

  // Generate schemas from entities
  for (const entity of ir.data.entities) {
    schemas[entity.name] = entityToSchema(entity);
  }

  const spec = {
    openapi: '3.0.0',
    info: {
      title: info.title,
      version: info.version,
      description: info.description || 'Auto-generated API contract from IR',
    },
    paths,
    components: {
      schemas,
    },
  };

  return JSON.stringify(spec, null, 2);
}

/**
 * Detect which service an endpoint belongs to based on path prefix.
 */
function detectServiceTag(endpoint: EndpointIR, service: ServiceIR): string {
  for (const svc of service.services) {
    if (endpoint.path.includes(svc.name.toLowerCase())) {
      return svc.name;
    }
  }
  return 'default';
}

// ============================================================================
// Contract Pipeline
// ============================================================================

/**
 * Generate OpenAPI spec and compare with previous version if provided.
 *
 * @param ir - Intermediate representation
 * @param info - API metadata
 * @param previousSpec - Optional previous OpenAPI spec for diff
 * @returns Generated spec and optional diff
 */
export function generateOpenAPIWithDiff(
  ir: IR,
  info: { title: string; version: string; description?: string },
  previousSpec?: string
): { spec: string; diff?: OpenAPIDiff } {
  const spec = generateOpenAPISpec(ir, info);

  if (!previousSpec) {
    return { spec };
  }

  const diff = diffOpenAPI(previousSpec, spec, '0.0.0', info.version);

  return { spec, diff };
}
