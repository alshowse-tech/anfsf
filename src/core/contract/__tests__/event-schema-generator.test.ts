/**
 * Event Schema Generator — Tests
 */

import {
  generateEventSchemas,
  generateEventSchemaJSON,
  generateEventSchemaWithDiff,
} from '../event-schema-generator';
import type { WorkflowIR } from '../../../req-graph/graph-engine';

function makeWorkflowIR(overrides: Partial<WorkflowIR> = {}): WorkflowIR {
  return {
    workflows: [
      {
        id: 'user_created',
        triggers: ['user.signup'],
        actions: ['send_welcome_email', 'create_profile'],
      },
      {
        id: 'order_placed',
        triggers: ['order.submit'],
        actions: ['process_payment', 'send_confirmation', 'update_inventory'],
      },
    ],
    ...overrides,
  };
}

describe('generateEventSchemas', () => {
  it('generates event contracts from workflows', () => {
    const contracts = generateEventSchemas(makeWorkflowIR());

    expect(contracts).toHaveLength(2);
  });

  it('converts workflow ID to event name with dots', () => {
    const contracts = generateEventSchemas(makeWorkflowIR());

    expect(contracts[0].name).toBe('user.created');
    expect(contracts[1].name).toBe('order.placed');
  });

  it('generates payload schema with required fields', () => {
    const contracts = generateEventSchemas(makeWorkflowIR());

    expect(contracts[0].payload.type).toBe('object');
    expect(contracts[0].payload.required).toContain('eventId');
    expect(contracts[0].payload.required).toContain('timestamp');
    expect(contracts[0].payload.required).toContain('source');
  });

  it('generates trigger properties from workflow triggers', () => {
    const contracts = generateEventSchemas(makeWorkflowIR());

    expect(contracts[0].payload.properties.trigger).toBeDefined();
    expect(contracts[0].payload.properties.trigger.description).toContain('user.signup');
  });

  it('generates action properties from workflow actions', () => {
    const contracts = generateEventSchemas(makeWorkflowIR());

    expect(contracts[0].payload.properties.action).toBeDefined();
    expect(contracts[0].payload.properties.action.description).toContain('send_welcome_email');
  });

  it('infers category from workflow ID', () => {
    const contracts = generateEventSchemas(makeWorkflowIR());

    expect(contracts[0].metadata.category).toBe('identity');
    expect(contracts[1].metadata.category).toBe('commerce');
  });

  it('handles empty workflows', () => {
    const emptyIR: WorkflowIR = { workflows: [] };
    const contracts = generateEventSchemas(emptyIR);

    expect(contracts).toHaveLength(0);
  });

  it('handles multiple triggers and actions', () => {
    const ir: WorkflowIR = {
      workflows: [
        {
          id: 'complex_event',
          triggers: ['trigger_a', 'trigger_b', 'trigger_c'],
          actions: ['action_1', 'action_2'],
        },
      ],
    };

    const contracts = generateEventSchemas(ir);
    expect(contracts).toHaveLength(1);

    const payload = contracts[0].payload;
    expect(payload.properties.trigger).toBeDefined();
    expect(payload.properties.trigger_2).toBeDefined();
    expect(payload.properties.action).toBeDefined();
    expect(payload.properties.action_1).toBeDefined();
  });
});

describe('generateEventSchemaJSON', () => {
  it('generates valid JSON structure', () => {
    const json = JSON.parse(generateEventSchemaJSON(makeWorkflowIR()));

    expect(json.schemaType).toBe('EventSchema');
    expect(json.version).toBe('1.0.0');
    expect(json.events).toHaveLength(2);
  });

  it('includes event metadata in JSON', () => {
    const json = JSON.parse(generateEventSchemaJSON(makeWorkflowIR()));

    expect(json.events[0].metadata.source).toBe('anfsf-pipeline');
    expect(json.events[0].metadata.idempotencyKey).toBe('eventId');
  });

  it('supports custom version', () => {
    const json = JSON.parse(generateEventSchemaJSON(makeWorkflowIR(), '2.0.0'));

    expect(json.version).toBe('2.0.0');
  });
});

describe('generateEventSchemaWithDiff', () => {
  it('returns schema without diff when no previous', () => {
    const result = generateEventSchemaWithDiff(makeWorkflowIR(), '1.0.0');

    expect(result.schemaJSON).toBeDefined();
    expect(result.contracts).toHaveLength(2);
    expect(result.diff).toBeUndefined();
  });

  it('returns diff when previous schema provided', () => {
    const previous = generateEventSchemaJSON(makeWorkflowIR(), '0.9.0');
    const result = generateEventSchemaWithDiff(makeWorkflowIR(), '1.0.0', previous);

    expect(result.diff).toBeDefined();
    expect(result.diff!.contractType).toBe('EventSchema');
  });
});
