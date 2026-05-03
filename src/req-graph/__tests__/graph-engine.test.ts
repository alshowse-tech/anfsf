import { describe, it, expect } from '@jest/globals';
import { RequirementGraphEngine } from '../graph-engine';
import type { AINativePRD, Field, Relationship } from '../../prd/prd-parser';

// ============================================================================
// Helpers
// ============================================================================

function makeMinimalPRD(): AINativePRD {
  return {
    features: [],
    userFlows: [],
    uiRequirements: [],
    data: [],
    constraints: [],
    acceptanceCriteria: [],
    dependencies: [],
    nonFunctionalSpecs: [],
    workflow: [],
    backendSpecs: [],
    infrastructureSpecs: [],
    qaSpecs: [],
  };
}

// ============================================================================
// compileFromPRD — Service IR
// ============================================================================

describe('compileFromPRD — Service IR', () => {
  it('should extract endpoints and services from a single BackendSpec', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.backendSpecs = [{
      api: [
        { path: '/users', method: 'GET', request: {}, response: {} },
        { path: '/users', method: 'POST', request: { body: {} }, response: {} },
      ],
      services: [{ name: 'UserService', responsibility: 'Manage users', dependencies: [] }],
    }];

    const ir = engine.compileFromPRD(prd);

    expect(ir.service.endpoints).toHaveLength(2);
    expect(ir.service.endpoints[0].path).toBe('/users');
    expect(ir.service.endpoints[0].method).toBe('GET');
    expect(ir.service.endpoints[1].method).toBe('POST');
    expect(ir.service.services).toHaveLength(1);
    expect(ir.service.services[0].name).toBe('UserService');
    expect(ir.service.services[0].responsibility).toBe('Manage users');
  });

  it('should handle multiple BackendSpecs', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.backendSpecs = [
      { api: [{ path: '/users', method: 'GET', request: {}, response: {} }], services: [] },
      { api: [{ path: '/orders', method: 'POST', request: {}, response: {} }], services: [{ name: 'OrderService', responsibility: 'Orders', dependencies: [] }] },
    ];

    const ir = engine.compileFromPRD(prd);

    expect(ir.service.endpoints).toHaveLength(2);
    expect(ir.service.services).toHaveLength(1);
    expect(ir.service.services[0].name).toBe('OrderService');
  });

  it('should default missing fields', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.backendSpecs = [{ api: [{ path: '/unknown', method: 'GET' as const, request: {}, response: {} }], services: [{ name: 'unknown', responsibility: '', dependencies: [] }] }];

    const ir = engine.compileFromPRD(prd);

    expect(ir.service.endpoints[0].path).toBe('/unknown');
    expect(ir.service.endpoints[0].method).toBe('GET');
    expect(ir.service.services[0].name).toBe('unknown');
    expect(ir.service.services[0].responsibility).toBe('');
  });

  it('should return empty arrays when backendSpecs is empty', () => {
    const engine = new RequirementGraphEngine();
    const ir = engine.compileFromPRD(makeMinimalPRD());
    expect(ir.service.endpoints).toHaveLength(0);
    expect(ir.service.services).toHaveLength(0);
  });
});

// ============================================================================
// compileFromPRD — UI IR
// ============================================================================

describe('compileFromPRD — UI IR', () => {
  it('should generate components and pages from uiRequirements', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.uiRequirements = [
      { id: 'ui1', component: 'UserTable', description: 'List users', interactions: ['click'] },
      { id: 'ui2', component: 'SettingsForm', description: 'Edit settings', interactions: ['submit'] },
    ];

    const ir = engine.compileFromPRD(prd);

    expect(ir.ui.components).toHaveLength(2);
    expect(ir.ui.components[0].name).toBe('UserTable');
    expect(ir.ui.pages).toHaveLength(2);
    expect(ir.ui.pages[0].path).toBe('/usertable');
    expect(ir.ui.pages[0].components).toEqual(['UserTable']);
  });

  it('should slugify component names with spaces', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.uiRequirements = [
      { id: 'ui1', component: 'User Profile', description: '', interactions: [] },
    ];

    const ir = engine.compileFromPRD(prd);

    expect(ir.ui.pages[0].path).toBe('/user-profile');
  });

  it('should infer additional pages from userFlows', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.userFlows = [
      { id: 'flow1', name: 'Checkout Flow', steps: [] },
    ];

    const ir = engine.compileFromPRD(prd);

    expect(ir.ui.pages).toHaveLength(1);
    expect(ir.ui.pages[0].path).toBe('/checkout-flow');
  });

  it('should not duplicate pages if userFlow matches existing UI page path', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.uiRequirements = [
      { id: 'ui1', component: 'checkout-flow', description: '', interactions: [] },
    ];
    prd.userFlows = [
      { id: 'flow1', name: 'checkout-flow', steps: [] },
    ];

    const ir = engine.compileFromPRD(prd);

    expect(ir.ui.pages).toHaveLength(1);
  });

  it('should default UnknownComponent for missing name', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.uiRequirements = [{ id: 'ui1', component: '', description: '', interactions: [] }];

    const ir = engine.compileFromPRD(prd);

    expect(ir.ui.components[0].name).toBe('UnknownComponent');
  });
});

// ============================================================================
// compileFromPRD — Workflow IR
// ============================================================================

describe('compileFromPRD — Workflow IR', () => {
  it('should extract workflows from PRD', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.workflow = [
      { id: 'wf1', name: 'Onboarding', triggers: ['signup'], actions: ['sendEmail'] },
      { id: 'wf2', name: 'Password Reset', triggers: ['forgotPassword'], actions: ['verify', 'reset'] },
    ];

    const ir = engine.compileFromPRD(prd);

    expect(ir.workflow.workflows).toHaveLength(2);
    expect(ir.workflow.workflows[0].id).toBe('wf1');
    expect(ir.workflow.workflows[0].triggers).toEqual(['signup']);
    expect(ir.workflow.workflows[0].actions).toEqual(['sendEmail']);
    expect(ir.workflow.workflows[1].actions).toEqual(['verify', 'reset']);
  });

  it('should default workflow id when missing', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.workflow = [{ id: '', name: '', triggers: [], actions: [] }];

    const ir = engine.compileFromPRD(prd);

    expect(ir.workflow.workflows[0].id).toBe('workflow-0');
  });

  it('should return empty workflows array when none defined', () => {
    const engine = new RequirementGraphEngine();
    const ir = engine.compileFromPRD(makeMinimalPRD());
    expect(ir.workflow.workflows).toHaveLength(0);
  });
});

// ============================================================================
// compileFromPRD — Data IR
// ============================================================================

describe('compileFromPRD — Data IR', () => {
  it('should extract entities and relationships from DataSpec', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.data = [
      {
        entity: 'User',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'age', type: 'number', required: false },
        ],
        relationships: [
          { type: 'one-to-many', target: 'Post' },
        ],
      },
    ];

    const ir = engine.compileFromPRD(prd);

    expect(ir.data.entities).toHaveLength(1);
    expect(ir.data.entities[0].name).toBe('User');
    expect(ir.data.entities[0].fields).toHaveLength(3);
    expect(ir.data.entities[0].fields[0]).toEqual({ name: 'id', type: 'string', required: true });
    expect(ir.data.entities[0].fields[2]).toEqual({ name: 'age', type: 'number', required: false });
    expect(ir.data.relationships).toHaveLength(1);
    expect(ir.data.relationships[0]).toEqual({ from: 'User', to: 'Post', type: 'one-to-many' });
  });

  it('should default field values', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.data = [{ entity: 'Item', fields: [{ name: 'unknown', type: 'string', required: false } satisfies Field], relationships: [{ type: 'one-to-many', target: 'unknown' } satisfies Relationship] }];

    const ir = engine.compileFromPRD(prd);

    expect(ir.data.entities[0].fields[0]).toEqual({ name: 'unknown', type: 'string', required: false });
    expect(ir.data.relationships[0]).toEqual({ from: 'Item', to: 'unknown', type: 'one-to-many' });
  });

  it('should handle missing entity name', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.data = [{ entity: '', fields: [], relationships: [] }];

    const ir = engine.compileFromPRD(prd);

    expect(ir.data.entities).toHaveLength(0);
  });

  it('should return empty arrays when data is empty', () => {
    const engine = new RequirementGraphEngine();
    const ir = engine.compileFromPRD(makeMinimalPRD());
    expect(ir.data.entities).toHaveLength(0);
    expect(ir.data.relationships).toHaveLength(0);
  });
});

// ============================================================================
// compileToIR — backward compatibility
// ============================================================================

describe('compileToIR backward compatibility', () => {
  it('should return empty IR when called without arguments', () => {
    const engine = new RequirementGraphEngine();
    const ir = engine.compileToIR();

    expect(ir.service.endpoints).toHaveLength(0);
    expect(ir.service.services).toHaveLength(0);
    expect(ir.ui.components).toHaveLength(0);
    expect(ir.ui.pages).toHaveLength(0);
    expect(ir.workflow.workflows).toHaveLength(0);
    expect(ir.data.entities).toHaveLength(0);
    expect(ir.data.relationships).toHaveLength(0);
  });

  it('should return populated IR when called with PRD', () => {
    const engine = new RequirementGraphEngine();
    const prd = makeMinimalPRD();
    prd.backendSpecs = [{
      api: [{ path: '/api', method: 'GET', request: {}, response: {} }],
      services: [{ name: 'Svc', responsibility: '', dependencies: [] }],
    }];

    const ir = engine.compileToIR(prd);

    expect(ir.service.endpoints).toHaveLength(1);
    expect(ir.service.services).toHaveLength(1);
  });
});

// ============================================================================
// compileFromPRD — full PRD integration
// ============================================================================

describe('compileFromPRD — full PRD integration', () => {
  it('should compile all four IR sections from a realistic PRD', () => {
    const engine = new RequirementGraphEngine();
    const prd: AINativePRD = {
      features: [{ id: 'f1', name: 'E-commerce', description: '', priority: 'P0', status: 'draft' }],
      userFlows: [
        { id: 'uf1', name: 'Browse and Buy', steps: [{ step: 1, action: 'browse', expected: 'products shown' }] },
      ],
      uiRequirements: [
        { id: 'ui1', component: 'ProductList', description: '', interactions: ['click'] },
        { id: 'ui2', component: 'Cart', description: '', interactions: ['add', 'remove'] },
      ],
      data: [
        {
          entity: 'Product',
          fields: [{ name: 'id', type: 'string', required: true }],
          relationships: [{ type: 'one-to-many', target: 'Order' }],
        },
      ],
      constraints: [],
      acceptanceCriteria: [],
      dependencies: [],
      nonFunctionalSpecs: [],
      workflow: [
        { id: 'wf1', name: 'Order Processing', triggers: ['checkout'], actions: ['validate', 'charge', 'ship'] },
      ],
      backendSpecs: [
        {
          api: [
            { path: '/products', method: 'GET', request: {}, response: {} },
            { path: '/orders', method: 'POST', request: { body: {} }, response: {} },
          ],
          services: [
            { name: 'ProductService', responsibility: 'Product CRUD', dependencies: [] },
            { name: 'OrderService', responsibility: 'Order management', dependencies: ['ProductService'] },
          ],
        },
      ],
      infrastructureSpecs: [],
      qaSpecs: [],
    };

    const ir = engine.compileFromPRD(prd);

    // Service
    expect(ir.service.endpoints).toHaveLength(2);
    expect(ir.service.services).toHaveLength(2);
    expect(ir.service.services[1].dependencies).toContain('ProductService');

    // UI
    expect(ir.ui.components).toHaveLength(2);
    expect(ir.ui.components.map(c => c.name)).toContain('ProductList');

    // Workflow
    expect(ir.workflow.workflows).toHaveLength(1);
    expect(ir.workflow.workflows[0].actions).toHaveLength(3);

    // Data
    expect(ir.data.entities).toHaveLength(1);
    expect(ir.data.entities[0].name).toBe('Product');
    expect(ir.data.relationships).toHaveLength(1);
  });
});
