/**
 * ANFSF L6 — AST Backwrite Engine
 *
 * Reverse-engineer existing code into Intermediate Representation (IR).
 * Parses TypeScript/React files to extract components, services, routes, and data models,
 * then generates IR nodes (ComponentIR, ServiceComponentIR, EndpointIR, EntityIR).
 */

import * as ts from 'typescript';
import type { UIIR, ComponentIR, PageIR, ServiceIR, EndpointIR, ServiceComponentIR, DataIR, EntityIR, WorkflowIR, WorkflowDefinitionIR } from '../../req-graph/graph-engine';

// ============================================================================
// Types
// ============================================================================

export interface ASTBackwriteOptions {
  /** Source files or directories to parse */
  sourceFiles: string[];
  /** TypeScript compiler options */
  compilerOptions?: ts.CompilerOptions;
}

export interface BackwriteResult {
  uiIR: UIIR;
  serviceIR: ServiceIR;
  dataIR: DataIR;
  workflowIR: WorkflowIR;
  /** Files that were parsed successfully */
  parsedFiles: string[];
  /** Files that failed to parse */
  errors: Array<{ file: string; error: string }>;
}

interface ComponentDef {
  name: string;
  props: Record<string, string>;
  state: Record<string, string>;
  isPageComponent: boolean;
  route?: string;
}

interface ServiceDef {
  name: string;
  methods: Array<{ name: string; params: string[]; returnType: string }>;
  dependencies: string[];
}

interface EntityDef {
  name: string;
  fields: Array<{ name: string; type: string; required: boolean }>;
}

// ============================================================================
// AST Backwrite Engine
// ============================================================================

export class ASTBackwriteEngine {
  private options: ASTBackwriteOptions;
  private program: ts.Program | null = null;
  private checker: ts.TypeChecker | null = null;
  private parsedFiles: string[] = [];
  private errors: Array<{ file: string; error: string }> = [];

  constructor(options: ASTBackwriteOptions) {
    this.options = {
      ...options,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.React,
        allowJs: true,
        ...options.compilerOptions,
      },
    };
  }

  /**
   * Parse source files and generate IR.
   */
  backwrite(): BackwriteResult {
    this.program = ts.createProgram(this.options.sourceFiles, this.options.compilerOptions!);
    this.checker = this.program.getTypeChecker();
    this.parsedFiles = [];
    this.errors = [];

    const components: ComponentDef[] = [];
    const services: ServiceDef[] = [];
    const entities: EntityDef[] = [];
    const workflows: WorkflowDefinitionIR[] = [];

    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile || sourceFile.fileName.includes('node_modules')) continue;

      try {
        const fileComponents = this.extractComponents(sourceFile);
        const fileServices = this.extractServices(sourceFile);
        const fileEntities = this.extractEntities(sourceFile);
        const fileWorkflows = this.extractWorkflows(sourceFile);

        components.push(...fileComponents);
        services.push(...fileServices);
        entities.push(...fileEntities);
        workflows.push(...fileWorkflows);

        this.parsedFiles.push(sourceFile.fileName);
      } catch (error) {
        this.errors.push({
          file: sourceFile.fileName,
          error: String(error),
        });
      }
    }

    return {
      uiIR: this.buildUIIR(components),
      serviceIR: this.buildServiceIR(services),
      dataIR: this.buildDataIR(entities),
      workflowIR: { workflows },
      parsedFiles: this.parsedFiles,
      errors: this.errors,
    };
  }

  // ---------------------------------------------------------------------------
  // Component Extraction (React functional components)
  // ---------------------------------------------------------------------------

  private extractComponents(sourceFile: ts.SourceFile): ComponentDef[] {
    const components: ComponentDef[] = [];

    const visit = (node: ts.Node) => {
      // Arrow function components: const X = () => { ... }
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (decl.name && ts.isIdentifier(decl.name) && decl.initializer) {
            const isComponent =
              ts.isArrowFunction(decl.initializer) ||
              ts.isFunctionExpression(decl.initializer);

            if (isComponent && /^[A-Z]/.test(decl.name.text)) {
              const comp = this.parseComponentDeclaration(decl);
              if (comp) components.push(comp);
            }
          }
        }
      }

      // Function declaration components: function X() { ... }
      if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text)) {
        const comp = this.parseFunctionComponent(node);
        if (comp) components.push(comp);
      }

      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);
    return components;
  }

  private parseComponentDeclaration(decl: ts.VariableDeclaration): ComponentDef | null {
    const name = ts.isIdentifier(decl.name) ? decl.name.text : null;
    if (!name) return null;

    const props = this.extractPropType(decl);
    const state = this.extractStateFromComponent(decl);
    const route = this.extractRouteFromComponent(decl);
    const isPage = route !== undefined || /page/i.test(name) || /Page$/.test(name);

    return { name, props, state, isPageComponent: isPage, route };
  }

  private parseFunctionComponent(node: ts.FunctionDeclaration): ComponentDef | null {
    const name = node.name?.text;
    if (!name || !/^[A-Z]/.test(name)) return null;

    const props: Record<string, string> = {};
    for (const param of node.parameters) {
      if (ts.isIdentifier(param.name) && param.type) {
        props[param.name.text] = this.typeNodeToString(param.type);
      }
    }

    const state = this.extractStateFromFunctionBody(node);

    return { name, props, state, isPageComponent: /page/i.test(name) || /Page$/.test(name) };
  }

  // ---------------------------------------------------------------------------
  // Service Extraction (class-based services)
  // ---------------------------------------------------------------------------

  private extractServices(sourceFile: ts.SourceFile): ServiceDef[] {
    const services: ServiceDef[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        if (/Service$|Controller$|Repository$/.test(className)) {
          const svc = this.parseServiceClass(node);
          if (svc) services.push(svc);
        }
      }

      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);
    return services;
  }

  private parseServiceClass(node: ts.ClassDeclaration): ServiceDef | null {
    if (!node.name) return null;

    const methods: ServiceDef['methods'] = [];
    const dependencies: string[] = [];

    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) && member.name) {
        const methodName = ts.isIdentifier(member.name) ? member.name.text : String(member.name);
        const params = member.parameters
          .map(p => ts.isIdentifier(p.name) ? p.name.text : 'unknown')
          .filter(n => n !== 'this');
        const returnType = member.type ? this.typeNodeToString(member.type) : 'void';
        methods.push({ name: methodName, params, returnType });
      }

      if (ts.isConstructorDeclaration(member)) {
        for (const param of member.parameters) {
          const paramType = param.type ? this.typeNodeToString(param.type) : '';
          if (paramType) {
            const depName = paramType.replace(/^(I[A-Z]|[A-Z])/, '').replace(/Service|Repository|Controller$/g, '');
            if (depName) dependencies.push(depName.toLowerCase());
          }
        }
      }
    }

    return { name: node.name.text.replace(/Service|Controller|Repository$/g, ''), methods, dependencies };
  }

  // ---------------------------------------------------------------------------
  // Entity Extraction (interfaces and classes)
  // ---------------------------------------------------------------------------

  private extractEntities(sourceFile: ts.SourceFile): EntityDef[] {
    const entities: EntityDef[] = [];

    const visit = (node: ts.Node) => {
      // Interface definitions
      if (ts.isInterfaceDeclaration(node) && node.name) {
        const entityName = node.name.text;
        // Skip Props and State interfaces
        if (!/Props$|State$|Config$/.test(entityName)) {
          const entity = this.parseEntityInterface(node);
          if (entity) entities.push(entity);
        }
      }

      // Class definitions (potential entities)
      if (ts.isClassDeclaration(node) && node.name && !/Service|Controller|Repository/.test(node.name.text)) {
        const entity = this.parseEntityClass(node);
        if (entity) entities.push(entity);
      }

      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);
    return entities;
  }

  private parseEntityInterface(node: ts.InterfaceDeclaration): EntityDef | null {
    const fields: EntityDef['fields'] = [];

    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name && member.type) {
        const name = ts.isIdentifier(member.name) ? member.name.text : String(member.name);
        const type = this.typeNodeToString(member.type);
        const required = !member.questionToken;
        fields.push({ name, type, required });
      }
    }

    return fields.length > 0 ? { name: node.name.text, fields } : null;
  }

  private parseEntityClass(node: ts.ClassDeclaration): EntityDef | null {
    const fields: EntityDef['fields'] = [];

    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member) && member.name && member.type) {
        const name = ts.isIdentifier(member.name) ? member.name.text : String(member.name);
        const type = this.typeNodeToString(member.type);
        const required = !member.questionToken && !ts.getModifiers(member)?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword);
        fields.push({ name, type, required });
      }
    }

    return fields.length > 0 ? { name: node.name!.text, fields } : null;
  }

  // ---------------------------------------------------------------------------
  // Workflow Extraction (function calls and patterns)
  // ---------------------------------------------------------------------------

  private extractWorkflows(sourceFile: ts.SourceFile): WorkflowDefinitionIR[] {
    const workflows: WorkflowDefinitionIR[] = [];

    const visit = (node: ts.Node) => {
      // Look for function declarations with "workflow" in name or comment
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        if (/workflow|handler|action|pipeline/i.test(name)) {
          const actions = node.parameters
            .filter(p => ts.isIdentifier(p.name))
            .map(p => (p.name as ts.Identifier).text);

          workflows.push({
            id: name,
            triggers: [name],
            actions: actions.length > 0 ? actions : ['execute'],
          });
        }
      }

      // Look for workflow registration patterns
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const funcName = node.expression.text;
        if (/register|define|create.*workflow/i.test(funcName)) {
          const firstArg = node.arguments[0];
          if (firstArg && ts.isStringLiteral(firstArg)) {
            workflows.push({
              id: firstArg.text,
              triggers: [firstArg.text],
              actions: ['execute'],
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);
    return workflows;
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private extractPropType(decl: ts.VariableDeclaration): Record<string, string> {
    const props: Record<string, string> = {};

    if (!decl.initializer) return props;

    const fn = ts.isArrowFunction(decl.initializer) ? decl.initializer : null;
    if (!fn) return props;

    for (const param of fn.parameters) {
      if (!param.type) continue;
      // Check if it's a destructured props param: { prop1, prop2 }
      if (ts.isObjectBindingPattern(param.name)) {
        for (const el of param.name.elements) {
          if (ts.isIdentifier(el.name)) {
            props[el.name.text] = this.typeNodeToString(param.type);
          }
        }
      } else if (ts.isIdentifier(param.name)) {
        props[param.name.text] = this.typeNodeToString(param.type);
      }
    }

    return props;
  }

  private extractStateFromComponent(decl: ts.VariableDeclaration): Record<string, string> {
    const state: Record<string, string> = {};

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useState') {
        if (node.arguments.length > 0) {
          // Try to find the variable name it's assigned to
          const parent = node.parent;
          if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
            const stateName = parent.name.text.replace(/^set[A-Z]/, '').replace(/State$/, '');
            const type = this.getTypeAtLocation(node.arguments[0]);
            state[stateName] = type;
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    if (decl.initializer) {
      ts.forEachChild(decl.initializer, visit);
    }

    return state;
  }

  private extractStateFromFunctionBody(node: ts.FunctionDeclaration): Record<string, string> {
    const state: Record<string, string> = {};

    const visit = (childNode: ts.Node) => {
      if (ts.isCallExpression(childNode) && ts.isIdentifier(childNode.expression) && childNode.expression.text === 'useState') {
        const parent = childNode.parent;
        if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
          const stateName = parent.name.text.replace(/^set[A-Z]/, '').replace(/State$/, '');
          const type = this.getTypeAtLocation(childNode);
          state[stateName] = type;
        }
      }
      ts.forEachChild(childNode, visit);
    };

    ts.forEachChild(node.body || node, visit);
    return state;
  }

  private extractRouteFromComponent(decl: ts.VariableDeclaration): string | undefined {
    const visit = (node: ts.Node): string | undefined => {
      if (ts.isStringLiteral(node) && /^\/[\w:/-]+$/.test(node.text)) {
        return node.text;
      }
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === 'path') {
        if (ts.isStringLiteral(node.initializer)) {
          return node.initializer.text;
        }
      }
      let found: string | undefined;
      ts.forEachChild(node, (child) => {
        if (!found) found = visit(child);
      });
      return found;
    };

    if (decl.initializer) {
      return visit(decl.initializer);
    }
    return undefined;
  }

  private typeNodeToString(typeNode: ts.TypeNode): string {
    if (ts.isTypeReferenceNode(typeNode)) {
      if (ts.isIdentifier(typeNode.typeName)) {
        return typeNode.typeName.text;
      }
    }
    const keywordToken = this.tokenKindToString(typeNode.kind);
    if (keywordToken) return keywordToken;
    if (ts.isUnionTypeNode(typeNode)) {
      return typeNode.types.map(t => this.typeNodeToString(t)).join(' | ');
    }
    if (ts.isArrayTypeNode(typeNode)) {
      return `${this.typeNodeToString(typeNode.elementType)}[]`;
    }
    if (ts.isTypeLiteralNode(typeNode)) {
      return 'object';
    }
    return 'unknown';
  }

  private getTypeAtLocation(node: ts.Node): string {
    if (this.checker) {
      try {
        const type = this.checker.getTypeAtLocation(node);
        const typeStr = this.checker.typeToString(type);
        if (typeStr && typeStr !== '{}') return typeStr;
      } catch {
        // Type resolution failed, fall through
      }
    }
    return 'unknown';
  }

  // ---------------------------------------------------------------------------
  // IR Builders
  // ---------------------------------------------------------------------------

  private buildUIIR(components: ComponentDef[]): UIIR {
    const pageComponents = components.filter(c => c.isPageComponent);
    const regularComponents = components.filter(c => !c.isPageComponent);

    const pages: PageIR[] = pageComponents.map(c => ({
      path: c.route || `/${this.kebabCase(c.name)}`,
      components: regularComponents.map(rc => rc.name),
    }));

    if (pages.length === 0 && regularComponents.length > 0) {
      pages.push({
        path: '/',
        components: regularComponents.slice(0, 5).map(c => c.name),
      });
    }

    return {
      components: regularComponents.map(c => ({
        name: c.name,
        props: c.props,
        state: c.state,
      })),
      pages,
    };
  }

  private buildServiceIR(services: ServiceDef[]): ServiceIR {
    const endpoints: EndpointIR[] = [];

    for (const svc of services) {
      for (const method of svc.methods) {
        const httpMethod = this.inferHttpMethod(method.name);
        const path = `/api/${this.kebabCase(svc.name)}/${this.kebabCase(method.name)}`;
        endpoints.push({
          path,
          method: httpMethod,
          request: { params: method.params },
          response: { type: method.returnType },
        });
      }
    }

    return {
      services: services.map(s => ({
        name: s.name,
        responsibility: `Handles ${s.name} business logic`,
        dependencies: s.dependencies,
      })),
      endpoints,
    };
  }

  private buildDataIR(entities: EntityDef[]): DataIR {
    return {
      entities: entities.map(e => ({
        name: e.name,
        fields: e.fields,
      })),
      relationships: [],
    };
  }

  private inferHttpMethod(methodName: string): string {
    const lower = methodName.toLowerCase();
    if (lower.startsWith('create') || lower.startsWith('add') || lower.startsWith('insert')) return 'post';
    if (lower.startsWith('update') || lower.startsWith('patch') || lower.startsWith('modify')) return 'put';
    if (lower.startsWith('delete') || lower.startsWith('remove')) return 'delete';
    return 'get';
  }

  private kebabCase(s: string): string {
    return s.replace(/([A-Z])/g, '-$1').replace(/^[-_]/, '').toLowerCase();
  }

  private tokenKindToString(kind: ts.SyntaxKind): string | null {
    const keywordMap: Record<number, string> = {
      [ts.SyntaxKind.StringKeyword]: 'string',
      [ts.SyntaxKind.NumberKeyword]: 'number',
      [ts.SyntaxKind.BooleanKeyword]: 'boolean',
      [ts.SyntaxKind.ObjectKeyword]: 'object',
      [ts.SyntaxKind.UnknownKeyword]: 'unknown',
      [ts.SyntaxKind.AnyKeyword]: 'any',
      [ts.SyntaxKind.NullKeyword]: 'null',
      [ts.SyntaxKind.UndefinedKeyword]: 'undefined',
      [ts.SyntaxKind.VoidKeyword]: 'void',
      [ts.SyntaxKind.NeverKeyword]: 'never',
      [ts.SyntaxKind.SymbolKeyword]: 'symbol',
      [ts.SyntaxKind.TrueKeyword]: 'true',
      [ts.SyntaxKind.FalseKeyword]: 'false',
    };
    return keywordMap[kind] ?? null;
  }
}

/**
 * Create a new ASTBackwriteEngine instance.
 */
export function createASTBackwriteEngine(options: ASTBackwriteOptions): ASTBackwriteEngine {
  return new ASTBackwriteEngine(options);
}
