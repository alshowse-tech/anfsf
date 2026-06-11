/**
 * ASF V4.0 Contract Engine - Event Schema Generator
 *
 * Generates event/contract schemas from WorkflowIR.
 * Version: v0.9.0
 */

import type { WorkflowIR, WorkflowDefinitionIR } from '../../req-graph/graph-engine';
import type { ContractDiff } from './types';
import { diffEventSchema } from './diff-event-schema';

// ============================================================================
// Event Schema Types
// ============================================================================

/**
 * Generated event contract.
 */
export interface EventContract {
  /** Event name (e.g., "user.created") */
  name: string;
  /** Event version */
  version: string;
  /** Event description */
  description: string;
  /** Event payload schema */
  payload: EventPayloadSchema;
  /** Metadata about the event */
  metadata: EventMetadata;
}

interface EventPayloadSchema {
  type: 'object';
  properties: Record<string, PayloadProperty>;
  required: string[];
}

interface PayloadProperty {
  type: string;
  description?: string;
  format?: string;
}

interface EventMetadata {
  source: string;
  category: string;
  triggerType: 'command' | 'event' | 'schedule';
  idempotencyKey: string;
}

// ============================================================================
// Event Schema Generator
// ============================================================================

/**
 * Infer event category from workflow definition.
 */
function inferCategory(workflow: WorkflowDefinitionIR): string {
  const id = workflow.id.toLowerCase();
  if (id.includes('user') || id.includes('account') || id.includes('auth')) return 'identity';
  if (id.includes('order') || id.includes('payment') || id.includes('billing')) return 'commerce';
  if (id.includes('notification') || id.includes('email') || id.includes('alert')) return 'notification';
  if (id.includes('data') || id.includes('sync') || id.includes('import')) return 'data';
  return 'system';
}

/**
 * Infer event name from workflow definition.
 */
function inferEventName(workflow: WorkflowDefinitionIR): string {
  const id = workflow.id.toLowerCase();
  // Convert snake_case or kebab-case to dot.notation
  return id.replace(/[-_]/g, '.');
}

/**
 * Generate event payload schema from workflow actions.
 */
function generatePayloadSchema(workflow: WorkflowDefinitionIR): EventPayloadSchema {
  const properties: Record<string, PayloadProperty> = {};
  const required: string[] = [];

  // Generate base event fields
  properties.eventId = { type: 'string', description: 'Unique event identifier', format: 'uuid' };
  properties.timestamp = { type: 'string', description: 'Event timestamp', format: 'date-time' };
  properties.source = { type: 'string', description: 'Event source system' };

  required.push('eventId', 'timestamp', 'source');

  // Generate fields from triggers
  for (let i = 0; i < workflow.triggers.length; i++) {
    const trigger = workflow.triggers[i];
    const propName = i === 0 ? 'trigger' : `trigger_${i}`;
    properties[propName] = {
      type: 'string',
      description: `Trigger: ${trigger}`,
    };
    if (i === 0) required.push('trigger');
  }

  // Generate fields from actions
  for (let i = 0; i < workflow.actions.length; i++) {
    const action = workflow.actions[i];
    const propName = i === 0 ? 'action' : `action_${i}`;
    properties[propName] = {
      type: 'string',
      description: `Action: ${action}`,
    };
  }

  return {
    type: 'object',
    properties,
    required,
  };
}

/**
 * Generate event contracts from WorkflowIR.
 *
 * @param workflow - Workflow intermediate representation
 * @returns Array of generated event contracts
 *
 * @example
 * ```typescript
 * const events = generateEventSchemas(workflowIR);
 * // [
 * //   {
 * //     name: "user.created",
 * //     version: "1.0.0",
 * //     payload: { type: "object", properties: {...}, required: [...] }
 * //   }
 * // ]
 * // ```
 */
export function generateEventSchemas(workflow: WorkflowIR): EventContract[] {
  const contracts: EventContract[] = [];

  for (const wf of workflow.workflows) {
    const contract: EventContract = {
      name: inferEventName(wf),
      version: '1.0.0',
      description: `Auto-generated event contract for workflow: ${wf.id}`,
      payload: generatePayloadSchema(wf),
      metadata: {
        source: 'anfsf-pipeline',
        category: inferCategory(wf),
        triggerType: wf.triggers.length > 0 ? 'event' : 'command',
        idempotencyKey: 'eventId',
      },
    };

    contracts.push(contract);
  }

  return contracts;
}

/**
 * Generate event schema in JSON format compatible with diff engine.
 *
 * @param workflow - Workflow intermediate representation
 * @param version - Schema version
 * @returns JSON event schema string
 */
export function generateEventSchemaJSON(workflow: WorkflowIR, version: string = '1.0.0'): string {
  const events = generateEventSchemas(workflow);

  const schema = {
    schemaType: 'EventSchema',
    version,
    events: events.map(e => ({
      name: e.name,
      version: e.version,
      payload: e.payload,
      metadata: e.metadata,
    })),
  };

  return JSON.stringify(schema, null, 2);
}

// ============================================================================
// Diff Integration
// ============================================================================

/**
 * Generate event schema and compare with previous version if provided.
 *
 * @param workflow - Workflow intermediate representation
 * @param version - New schema version
 * @param previousJSON - Optional previous schema JSON for diff
 * @returns Generated schema and optional diff
 */
export function generateEventSchemaWithDiff(
  workflow: WorkflowIR,
  version: string,
  previousJSON?: string
): { schemaJSON: string; contracts: EventContract[]; diff?: ContractDiff } {
  const schemaJSON = generateEventSchemaJSON(workflow, version);
  const contracts = generateEventSchemas(workflow);

  if (!previousJSON) {
    return { schemaJSON, contracts };
  }

  const diff = diffEventSchema(previousJSON, schemaJSON, '0.0.0', version);

  return { schemaJSON, contracts, diff };
}
