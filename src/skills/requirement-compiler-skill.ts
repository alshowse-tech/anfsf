/**
 * ANFSF L4 — Requirement Compiler Skill
 *
 * Compiles RequirementGraph into Intermediate Representation (IR).
 * Graph → IR conversion: ServiceIR + UIIR + WorkflowIR + DataIR
 * Extracts entities, services, UI components, pages, and workflows
 * from the requirement graph nodes and edges.
 */

import { Skill, SkillResult } from './base';
import {
  RequirementGraph,
  GraphNode,
  GraphLevel,
  GraphEdge,
} from '../req-graph/graph-engine';
import {
  IR,
  ServiceIR,
  UIIR,
  WorkflowIR,
  DataIR,
  EntityIR,
  FieldIR,
  RelationshipIR,
  ServiceComponentIR,
  EndpointIR,
  ComponentIR,
  PageIR,
  WorkflowDefinitionIR,
} from '../req-graph/graph-engine';

export interface RequirementCompilerContext {
  graph: RequirementGraph;
  /** Output framework preference */
  framework?: 'react' | 'vue' | 'angular';
  /** Backend style */
  backendStyle?: 'rest' | 'graphql';
  /** Include generated entities in DataIR */
  includeDataIR?: boolean;
}

export interface CompilationReport {
  /** Number of nodes processed */
  nodesProcessed: number;
  /** Number of edges analyzed */
  edgesAnalyzed: number;
  /** Inferred items count */
  inferredCount: number;
  /** Warnings during compilation */
  warnings: string[];
}

export interface RequirementCompilerResult extends SkillResult {
  ir: IR;
  report: CompilationReport;
}

// Node type to IR layer mapping
const NODE_TYPE_MAP: Record<string, string> = {
  entity: 'data',
  model: 'data',
  database: 'data',
  table: 'data',
  service: 'service',
  api: 'service',
  endpoint: 'service',
  rest: 'service',
  controller: 'service',
  component: 'ui',
  page: 'ui',
  screen: 'ui',
  view: 'ui',
  form: 'ui',
  workflow: 'workflow',
  flow: 'workflow',
  process: 'workflow',
  action: 'workflow',
  trigger: 'workflow',
};

/**
 * Requirement Compiler Skill — compiles RequirementGraph to IR.
 */
export class RequirementCompilerSkill extends Skill {
  name = 'requirement-compiler';
  version = '1.0.0';
  description = '需求编译器 Skill — 将需求图谱编译为中间表示 (IR)';

  execute(ctx: RequirementCompilerContext): Promise<RequirementCompilerResult> {
    const startTime = Date.now();
    const { graph } = ctx;

    const warnings: string[] = [];
    const stats = { inferredCount: 0 };

    // Categorize nodes by type
    const categorized = this.categorizeNodes(graph, warnings, stats);

    // Build each IR layer
    const dataIR = this.buildDataIR(categorized.dataNodes, graph.edges, warnings, stats);
    const serviceIR = this.buildServiceIR(categorized.serviceNodes, graph.edges, dataIR.entities, ctx.backendStyle ?? 'rest');
    const uiIR = this.buildUIIR(categorized.uiNodes, graph.edges, ctx.framework ?? 'react', stats);
    const workflowIR = this.buildWorkflowIR(categorized.workflowNodes, graph.edges, stats);

    const ir: IR = {
      service: serviceIR,
      ui: uiIR,
      workflow: workflowIR,
      data: dataIR,
    };

    const report: CompilationReport = {
      nodesProcessed: graph.nodes.size,
      edgesAnalyzed: graph.edges.size,
      inferredCount: stats.inferredCount,
      warnings,
    };

    return Promise.resolve({
      ir,
      report,
      executionTime: Date.now() - startTime,
      metadata: { name: this.name, version: this.version },
    });
  }

  // ---------------------------------------------------------------------------
  // Node Categorization
  // ---------------------------------------------------------------------------

  private categorizeNodes(graph: RequirementGraph, warnings: string[], stats: { inferredCount: number }) {
    const dataNodes: GraphNode[] = [];
    const serviceNodes: GraphNode[] = [];
    const uiNodes: GraphNode[] = [];
    const workflowNodes: GraphNode[] = [];

    for (const node of graph.nodes.values()) {
      const category = this.classifyNode(node);
      switch (category) {
        case 'data': { dataNodes.push(node); break; }
        case 'service': { serviceNodes.push(node); break; }
        case 'ui': { uiNodes.push(node); break; }
        case 'workflow': { workflowNodes.push(node); break; }
        default: {
          // Infer from edges
          const inferred = this.inferCategory(node, graph.edges);
          if (inferred) {
            switch (inferred) {
              case 'data': dataNodes.push(node); break;
              case 'service': serviceNodes.push(node); break;
              case 'ui': uiNodes.push(node); break;
              case 'workflow': workflowNodes.push(node); break;
            }
            stats.inferredCount++;
          } else {
            warnings.push(`Unclassified node: ${node.id} (${node.type})`);
          }
          break;
        }
      }
    }

    return { dataNodes, serviceNodes, uiNodes, workflowNodes };
  }

  private classifyNode(node: GraphNode): string | null {
    const typeLower = node.type.toLowerCase();
    if (NODE_TYPE_MAP[typeLower]) return NODE_TYPE_MAP[typeLower];

    // Check level hints
    switch (node.level) {
      case GraphLevel.L3_System: return 'service';
      case GraphLevel.L2_Interaction: return 'ui';
      case GraphLevel.L4_Execution: return 'workflow';
    }

    // Check data fields
    if (node.data?.fields || node.data?.entity || node.data?.table) return 'data';
    if (node.data?.endpoints || node.data?.api || node.data?.route) return 'service';
    if (node.data?.components || node.data?.page || node.data?.screen) return 'ui';
    if (node.data?.triggers || node.data?.actions || node.data?.workflow) return 'workflow';

    return null;
  }

  private inferCategory(node: GraphNode, edges: Map<string, GraphEdge>): string | null {
    // Check connected nodes
    const connectedTypes: string[] = [];
    for (const [, edge] of edges) {
      if (edge.from === node.id || edge.to === node.id) {
        const otherId = edge.from === node.id ? edge.to : edge.from;
        connectedTypes.push(otherId);
      }
    }

    if (connectedTypes.length === 0) return null;

    // Vote based on connected node types
    const votes: Record<string, number> = {};
    for (const connectedId of connectedTypes) {
      // Simplified: use ID naming patterns
      if (connectedId.includes('entity') || connectedId.includes('model') || connectedId.includes('data')) votes['data'] = (votes['data'] || 0) + 1;
      if (connectedId.includes('service') || connectedId.includes('api') || connectedId.includes('endpoint')) votes['service'] = (votes['service'] || 0) + 1;
      if (connectedId.includes('component') || connectedId.includes('page') || connectedId.includes('ui')) votes['ui'] = (votes['ui'] || 0) + 1;
      if (connectedId.includes('workflow') || connectedId.includes('flow') || connectedId.includes('trigger')) votes['workflow'] = (votes['workflow'] || 0) + 1;
    }

    const maxCategory = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    return maxCategory ? maxCategory[0] : null;
  }

  // ---------------------------------------------------------------------------
  // IR Builders
  // ---------------------------------------------------------------------------

  private buildDataIR(nodes: GraphNode[], edges: Map<string, GraphEdge>, _warnings: string[], stats: { inferredCount: number }): DataIR {
    const entities: EntityIR[] = [];

    for (const node of nodes) {
      const fields: FieldIR[] = [];

      // Extract fields from node data
      if (node.data?.fields && Array.isArray(node.data.fields)) {
        for (const field of node.data.fields) {
          fields.push({
            name: field.name || this.generateFieldName(node.id, fields.length),
            type: field.type || 'string',
            required: field.required ?? false,
          });
        }
      } else if (node.data?.columns) {
        for (const col of node.data.columns) {
          fields.push({
            name: col.name || `field_${fields.length}`,
            type: col.type || 'string',
            required: col.required ?? false,
          });
        }
      }

      // Infer at least an ID field if none found
      if (fields.length === 0) {
        fields.push({ name: 'id', type: 'string', required: true });
        stats.inferredCount++;
      }

      entities.push({
        name: node.data?.name || node.id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/ /g, ''),
        fields,
      });
    }

    const relationships: RelationshipIR[] = [];
    for (const [, edge] of edges) {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (fromNode && toNode) {
        relationships.push({
          from: this.entityName(fromNode),
          to: this.entityName(toNode),
          type: edge.type || 'references',
        });
      }
    }

    return { entities, relationships };
  }

  private buildServiceIR(nodes: GraphNode[], edges: Map<string, GraphEdge>, entities: EntityIR[], backendStyle: string): ServiceIR {
    const services: ServiceComponentIR[] = [];
    const endpoints: EndpointIR[] = [];

    for (const node of nodes) {
      const serviceName = node.data?.name || node.id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/ /g, '');
      const deps: string[] = [];

      // Find dependencies from edges
      for (const [, edge] of edges) {
        if (edge.from === node.id) {
          const targetNode = nodes.find(n => n.id === edge.to);
          if (targetNode) {
            deps.push(this.entityName(targetNode));
          }
        }
      }

      services.push({
        name: serviceName,
        responsibility: node.data?.responsibility || `${serviceName} management`,
        dependencies: deps.length > 0 ? deps : entities.map(e => e.name),
      });

      // Generate REST endpoints based on service
      if (backendStyle === 'rest') {
        const basePath = `/${this.toKebabCase(serviceName)}`;
        endpoints.push(
          { path: basePath, method: 'get', request: {}, response: {} },
          { path: `${basePath}/:id`, method: 'get', request: { params: { id: 'string' } }, response: {} },
          { path: basePath, method: 'post', request: { body: {} }, response: {} },
          { path: `${basePath}/:id`, method: 'put', request: { params: { id: 'string' }, body: {} }, response: {} },
          { path: `${basePath}/:id`, method: 'delete', request: { params: { id: 'string' } }, response: {} }
        );
      }
    }

    return { endpoints, services };
  }

  private buildUIIR(nodes: GraphNode[], edges: Map<string, GraphEdge>, framework: string, stats: { inferredCount: number }): UIIR {
    const components: ComponentIR[] = [];
    const pages: PageIR[] = [];

    for (const node of nodes) {
      const name = node.data?.name || node.id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/ /g, '');

      // Extract props
      const props: Record<string, string> = {};
      if (node.data?.props) {
        for (const [key, val] of Object.entries(node.data.props)) {
          props[key] = typeof val === 'string' ? val : 'any';
        }
      }

      // Extract state
      const state: Record<string, string> = {};
      if (node.data?.state) {
        for (const [key, val] of Object.entries(node.data.state)) {
          state[key] = typeof val === 'string' ? val : 'any';
        }
      }

      if (node.data?.isPage || node.type.toLowerCase() === 'page') {
        // It's a page
        const componentNames: string[] = [];
        if (node.data?.components && Array.isArray(node.data.components)) {
          componentNames.push(...node.data.components);
        }
        pages.push({
          path: node.data?.path || `/${this.toKebabCase(name)}`,
          components: componentNames,
        });
      } else {
        components.push({ name, props, state });
      }
    }

    // Infer home page if none exists
    if (pages.length === 0) {
      pages.push({ path: '/', components: components.slice(0, 1).map(c => c.name) });
      stats.inferredCount++;
    }

    return { components, pages };
  }

  private buildWorkflowIR(nodes: GraphNode[], edges: Map<string, GraphEdge>, stats: { inferredCount: number }): WorkflowIR {
    const workflows: WorkflowDefinitionIR[] = [];

    for (const node of nodes) {
      const id = node.data?.id || node.id;
      const triggers: string[] = [];
      const actions: string[] = [];

      if (node.data?.triggers && Array.isArray(node.data.triggers)) {
        triggers.push(...node.data.triggers);
      }
      if (node.data?.actions && Array.isArray(node.data.actions)) {
        actions.push(...node.data.actions);
      }

      // Infer from node description
      if (triggers.length === 0 && node.data?.description) {
        const desc = node.data.description.toLowerCase();
        if (desc.includes('submit') || desc.includes('create')) triggers.push('submit');
        if (desc.includes('delete') || desc.includes('remove')) triggers.push('delete');
        if (desc.includes('update') || desc.includes('edit')) triggers.push('update');
        if (triggers.length > 0) stats.inferredCount++;
      }

      if (actions.length === 0) {
        // Default actions based on triggers
        for (const trigger of triggers) {
          if (trigger === 'submit') actions.push('validate', 'create');
          if (trigger === 'delete') actions.push('validate', 'delete');
          if (trigger === 'update') actions.push('validate', 'update');
        }
        if (actions.length > 0) stats.inferredCount++;
      }

      workflows.push({ id, triggers, actions });
    }

    return { workflows };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private entityName(node: GraphNode): string {
    return node.data?.name || node.id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/ /g, '');
  }

  private generateFieldName(entityName: string, index: number): string {
    return `field${index}`;
  }

  private toKebabCase(name: string): string {
    return name
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}

/**
 * Create a RequirementCompilerSkill instance.
 */
export function createRequirementCompilerSkill(): RequirementCompilerSkill {
  return new RequirementCompilerSkill();
}
