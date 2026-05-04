/**
 * ANFSF L6 — Backend Architecture Generator
 *
 * Accepts L4 IR (ServiceIR + DataIR), produces REST API skeleton:
 *   - Express/Koa router definitions
 *   - Controller stubs per resource
 *   - Service layer stubs
 *   - Data model type definitions
 *   - Middleware pipeline
 */

import type { ServiceIR, EndpointIR, ServiceComponentIR, DataIR, EntityIR, RelationshipIR } from '../../req-graph/graph-engine';

// ============================================================================
// Type Definitions
// ============================================================================

export interface BackendArchitectureConfig {
  /** Web framework */
  framework: 'express' | 'koa' | 'fastify';
  /** Language for generated code */
  language: 'typescript' | 'javascript';
  /** Output directory hint (for file path generation) */
  outputDir?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'route' | 'controller' | 'service' | 'model' | 'middleware' | 'entry';
}

export interface BackendArchitecture {
  files: GeneratedFile[];
  summary: {
    totalFiles: number;
    endpoints: number;
    services: number;
    models: number;
  };
}

const DEFAULT_CONFIG: BackendArchitectureConfig = {
  framework: 'express',
  language: 'typescript',
  outputDir: 'src',
};

// ============================================================================
// Backend Architecture Generator
// ============================================================================

export class BackendArchitect {
  private config: BackendArchitectureConfig;

  constructor(config?: Partial<BackendArchitectureConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate backend architecture from L4 IR.
   */
  generate(serviceIR: ServiceIR, dataIR: DataIR): BackendArchitecture {
    const files: GeneratedFile[] = [];

    files.push(this.generateEntry(serviceIR));
    files.push(...this.generateMiddleware());
    files.push(...this.generateModels(dataIR));
    files.push(...this.generateServices(serviceIR, dataIR));
    files.push(...this.generateControllers(serviceIR));
    files.push(this.generateRoutes(serviceIR));
    files.push(this.generatePackageJson());
    files.push(this.generateTsConfig());

    return {
      files,
      summary: {
        totalFiles: files.length,
        endpoints: serviceIR.endpoints.length,
        services: serviceIR.services.length,
        models: dataIR.entities.length,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Entry point (app.ts / server.ts)
  // ---------------------------------------------------------------------------

  private generateEntry(ir: ServiceIR): GeneratedFile {
    const serviceImports = ir.services.map(s => `import { ${this.serviceVarName(s)}Router } from './routes/${this.kebabCase(s.name)}.routes';`).join('\n');
    const serviceRegistrations = ir.services.map(s => `app.use('/api/${this.kebabCase(s.name)}', ${this.serviceVarName(s)}Router);`).join('\n');

    const content = `import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
${serviceImports}

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

${serviceRegistrations}

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));

export default app;
`;

    return { path: 'app.ts', content, type: 'entry' };
  }

  // ---------------------------------------------------------------------------
  // Middleware
  // ---------------------------------------------------------------------------

  private generateMiddleware(): GeneratedFile[] {
    return [
      {
        path: 'middleware/error-handler.ts',
        content: `import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
}
`,
        type: 'middleware',
      },
      {
        path: 'middleware/request-logger.ts',
        content: `import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  console.log(\`\${req.method} \${req.url}\`);
  next();
}
`,
        type: 'middleware',
      },
    ];
  }

  // ---------------------------------------------------------------------------
  // Data models (type definitions per entity)
  // ---------------------------------------------------------------------------

  private generateModels(dataIR: DataIR): GeneratedFile[] {
    return dataIR.entities.map(entity => {
      const fields = entity.fields.map(f => {
        const tsType = this.mapFieldType(f.type);
        const optional = f.required ? '' : '?';
        return `  ${f.name}${optional}: ${tsType};`;
      }).join('\n');

      const content = `export interface ${this.pascalCase(entity.name)} {
${fields}
  createdAt: Date;
  updatedAt: Date;
}
`;
      return { path: `models/${this.kebabCase(entity.name)}.ts`, content, type: 'model' };
    });
  }

  // ---------------------------------------------------------------------------
  // Service layer (one per service component)
  // ---------------------------------------------------------------------------

  private generateServices(serviceIR: ServiceIR, dataIR: DataIR): GeneratedFile[] {
    return serviceIR.services.map(svc => {
      const relatedEntities = this.findRelatedEntities(svc, dataIR);
      const entityImports = relatedEntities.map(e => `import type { ${this.pascalCase(e.name)} } from '../models/${this.kebabCase(e.name)}';`).join('\n');

      const methods = relatedEntities.map(entity => {
        const entityName = this.pascalCase(entity.name);
        const repoVar = this.camelCase(entity.name) + 'Repo';
        const entityFields = entity.fields.filter(f => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt');
        const createFields = entityFields.map(f => f.name).join(', ');

        return `
  // ====== ${entityName} CRUD ======

  async findAll(page = 1, limit = 20): Promise<{ items: ${entityName}[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const items = await ${repoVar}.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
    return {
      items: items.rows,
      total: items.count,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<${entityName} | null> {
    return ${repoVar}.findByPk(id);
  }

  async create(data: Omit<${entityName}, 'id' | 'createdAt' | 'updatedAt'>): Promise<${entityName}> {
    const instance = await ${repoVar}.create({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return instance;
  }

  async update(id: string, data: Partial<${entityName}>): Promise<${entityName} | null> {
    const instance = await this.findById(id);
    if (!instance) return null;
    await instance.update({
      ...data,
      updatedAt: new Date(),
    });
    return instance;
  }

  async delete(id: string): Promise<boolean> {
    const instance = await this.findById(id);
    if (!instance) return false;
    await instance.destroy();
    return true;
  }
`;
      }).join('\n');

      const content = `${entityImports}

export class ${this.pascalCase(svc.name)}Service {
${methods}
}
`;

      return { path: `services/${this.kebabCase(svc.name)}.service.ts`, content, type: 'service' };
    });
  }

  // ---------------------------------------------------------------------------
  // Controllers (one per endpoint group)
  // ---------------------------------------------------------------------------

  private generateControllers(ir: ServiceIR): GeneratedFile[] {
    const grouped = this.groupEndpointsByService(ir);

    return grouped.map(({ svc, endpoints }) => {
      const svcVar = this.serviceVarName(svc);
      const imports = endpoints.map((_, i) => `    // ${endpoints[i].method.toUpperCase()} ${endpoints[i].path}`).join('\n');

      const handlers = endpoints.map(ep => {
        const methodName = this.handlerMethodName(ep.method, ep.path);
        const resource = this.extractResourceName(ep.path);

        switch (ep.method.toLowerCase()) {
          case 'get': {
            const isSingle = ep.path.includes(':');
            if (isSingle) {
              return `
  async ${methodName}(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const ${resource} = await ${svcVar}Service.findById(id);
    if (!${resource}) {
      res.status(404).json({ error: '${this.pascalCase(resource)} not found' });
      return;
    }
    res.json(${resource});
  }`;
            }
            return `
  async ${methodName}(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20 } = req.query;
    const result = await ${svcVar}Service.findAll(Number(page), Number(limit));
    res.json(result);
  }`;
          }
          case 'post':
            return `
  async ${methodName}(req: Request, res: Response): Promise<void> {
    const data = req.body;
    const ${resource} = await ${svcVar}Service.create(data);
    res.status(201).json(${resource});
  }`;
          case 'put':
            return `
  async ${methodName}(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;
    const ${resource} = await ${svcVar}Service.update(id, data);
    if (!${resource}) {
      res.status(404).json({ error: '${this.pascalCase(resource)} not found' });
      return;
    }
    res.json(${resource});
  }`;
          case 'delete':
            return `
  async ${methodName}(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const deleted = await ${svcVar}Service.delete(id);
    if (!deleted) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    res.status(204).send();
  }`;
          default:
            return `
  async ${methodName}(req: Request, res: Response): Promise<void> {
    res.status(501).json({ error: 'Not implemented' });
  }`;
        }
      }).join('\n');

      const content = `import type { Request, Response } from 'express';
import { ${this.pascalCase(svc.name)}Service } from '../services/${this.kebabCase(svc.name)}.service';

const ${svcVar}Service = new ${this.pascalCase(svc.name)}Service();

export class ${this.pascalCase(svc.name)}Controller {
${handlers}
}

export const ${svcVar}Controller = new ${this.pascalCase(svc.name)}Controller();
`;

      return { path: `controllers/${this.kebabCase(svc.name)}.controller.ts`, content, type: 'controller' };
    });
  }

  // ---------------------------------------------------------------------------
  // Routes (one per service)
  // ---------------------------------------------------------------------------

  private generateRoutes(ir: ServiceIR): GeneratedFile {
    const grouped = this.groupEndpointsByService(ir);

    const routeBlocks = grouped.map(({ svc, endpoints }) => {
      const svcVar = this.serviceVarName(svc);
      const lines = endpoints.map(ep => {
        const methodName = this.handlerMethodName(ep.method, ep.path);
        const routeMethod = ep.method.toLowerCase();
        const routePath = this.routePath(ep.path);
        return `router.${routeMethod}('${routePath}', ${svcVar}Controller.${methodName});`;
      }).join('\n  ');

      return `
// ${svc.responsibility}
${lines}`;
    }).join('\n');

    const content = `import { Router } from 'express';
${grouped.map(({ svc }) => `import { ${this.serviceVarName(svc)}Controller } from '../controllers/${this.kebabCase(svc.name)}.controller';`).join('\n')}

const router = Router();
${routeBlocks}

export { router as ${this.serviceVarName(grouped[0]?.svc ?? { name: 'api' })}Router };
`;

    return { path: 'routes/api.routes.ts', content, type: 'route' };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private groupEndpointsByService(ir: ServiceIR): Array<{ svc: ServiceComponentIR; endpoints: EndpointIR[] }> {
    if (ir.services.length === 0) {
      const defaultSvc: ServiceComponentIR = { name: 'api', responsibility: 'Default API', dependencies: [] };
      return [{ svc: defaultSvc, endpoints: ir.endpoints }];
    }

    return ir.services.map(svc => ({
      svc,
      endpoints: ir.endpoints.filter(ep => this.endpointBelongsToService(ep, svc)),
    }));
  }

  private endpointBelongsToService(ep: EndpointIR, svc: ServiceComponentIR): boolean {
    const svcName = svc.name.toLowerCase();
    return ep.path.toLowerCase().includes(svcName) ||
      svc.dependencies.some(d => ep.path.toLowerCase().includes(d.toLowerCase()));
  }

  private findRelatedEntities(svc: ServiceComponentIR, dataIR: DataIR): EntityIR[] {
    if (dataIR.entities.length === 0) return [];

    const svcName = svc.name.toLowerCase();
    return dataIR.entities.filter(e =>
      e.name.toLowerCase().includes(svcName) ||
      svc.dependencies.some(d => e.name.toLowerCase().includes(d.toLowerCase()))
    );
  }

  private handlerMethodName(method: string, path: string): string {
    const parts = path.split('/').filter(Boolean);
    const action = parts[parts.length - 1] || 'root';
    const base = this.camelCase(action);

    switch (method.toLowerCase()) {
      case 'get':
        return path.includes(':') ? `get${this.pascalCase(base)}` : `list${this.pascalCase(base)}`;
      case 'post':
        return `create${this.pascalCase(base)}`;
      case 'put':
        return `update${this.pascalCase(base)}`;
      case 'patch':
        return `patch${this.pascalCase(base)}`;
      case 'delete':
        return `delete${this.pascalCase(base)}`;
      default:
        return base;
    }
  }

  private routePath(path: string): string {
    return path.replace(/:(\w+)/g, ':$1');
  }

  private extractResourceName(path: string): string {
    const parts = path.split('/').filter(Boolean).map(p => p.replace(/^:/, ''));
    const name = parts[parts.length - 1] || 'item';
    return this.camelCase(name);
  }

  private serviceVarName(svc: ServiceComponentIR): string {
    return this.camelCase(svc.name);
  }

  private mapFieldType(type: string): string {
    const map: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      int: 'number',
      integer: 'number',
      float: 'number',
      date: 'Date',
      datetime: 'Date',
      timestamp: 'Date',
      json: 'any',
      text: 'string',
      uuid: 'string',
    };
    return map[type.toLowerCase()] || 'any';
  }

  private pascalCase(s: string): string {
    return s.replace(/[_-](\w)/g, (_, c) => c.toUpperCase()).replace(/^(\w)/, (_, c) => c.toUpperCase());
  }

  private camelCase(s: string): string {
    const pascal = this.pascalCase(s);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private kebabCase(s: string): string {
    return s.replace(/([A-Z])/g, '-$1').replace(/^[-_]/, '').toLowerCase();
  }

  private generatePackageJson(): GeneratedFile {
    const content = `{
  "name": "anfsf-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "ts-node src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.11.0",
    "ts-node": "^10.9.2"
  }
}`;
    return { path: 'package.json', content, type: 'entry' };
  }

  private generateTsConfig(): GeneratedFile {
    const content = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}`;
    return { path: 'tsconfig.json', content, type: 'entry' };
  }
}

export function createBackendArchitect(config?: Partial<BackendArchitectureConfig>): BackendArchitect {
  return new BackendArchitect(config);
}
