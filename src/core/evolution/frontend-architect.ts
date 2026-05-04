/**
 * ANFSF L6 — Frontend Architecture Generator
 *
 * Accepts L4 IR (UIIR + WorkflowIR), produces frontend skeleton:
 *   - React component stubs
 *   - React Router route definitions
 *   - Zustand/Redux state management store
 *   - App entry point with routing
 */

import type { UIIR, ComponentIR, PageIR, WorkflowIR, WorkflowDefinitionIR } from '../../req-graph/graph-engine';

// ============================================================================
// Type Definitions
// ============================================================================

export interface FrontendArchitectureConfig {
  /** UI framework */
  framework: 'react' | 'vue' | 'svelte';
  /** State management library */
  stateLib: 'zustand' | 'redux' | 'jotai';
  /** Router library */
  router: 'react-router' | 'wouter';
  /** Output directory hint */
  outputDir?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'component' | 'page' | 'route' | 'store' | 'entry' | 'hook';
}

export interface FrontendArchitecture {
  files: GeneratedFile[];
  summary: {
    totalFiles: number;
    components: number;
    pages: number;
    stores: number;
  };
}

const DEFAULT_CONFIG: FrontendArchitectureConfig = {
  framework: 'react',
  stateLib: 'zustand',
  router: 'react-router',
  outputDir: 'src',
};

// ============================================================================
// Frontend Architecture Generator
// ============================================================================

export class FrontendArchitect {
  private config: FrontendArchitectureConfig;

  constructor(config?: Partial<FrontendArchitectureConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate frontend architecture from L4 IR.
   */
  generate(uiIR: UIIR, workflowIR: WorkflowIR): FrontendArchitecture {
    const files: GeneratedFile[] = [];

    files.push(...this.generateComponents(uiIR));
    files.push(...this.generatePages(uiIR));
    files.push(this.generateRouter(uiIR));
    files.push(this.generateStore(uiIR, workflowIR));
    files.push(this.generateAppEntry(uiIR));
    files.push(...this.generateHooks(uiIR));
    files.push(this.generatePackageJson());
    files.push(this.generateTsConfig());

    return {
      files,
      summary: {
        totalFiles: files.length,
        components: uiIR.components.length,
        pages: uiIR.pages.length,
        stores: 1,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Component stubs
  // ---------------------------------------------------------------------------

  private generateComponents(uiIR: UIIR): GeneratedFile[] {
    return uiIR.components.map(comp => {
      const props = this.generatePropTypes(comp.props);
      const propsParam = props ? `({ ${this.extractPropNames(comp.props)} }: ${comp.name}Props)` : '()';

      const content = `import React from 'react';
${props ? `\nexport interface ${comp.name}Props {\n${props}\n}\n` : ''}
export function ${comp.name}${propsParam} {
  return (
    <div className="${this.kebabCase(comp.name)}-component">
      ${comp.name}
    </div>
  );
}

export default ${comp.name};
`;

      return { path: `components/${this.kebabCase(comp.name)}.tsx`, content, type: 'component' };
    });
  }

  // ---------------------------------------------------------------------------
  // Page components (one per page in IR)
  // ---------------------------------------------------------------------------

  private generatePages(uiIR: UIIR): GeneratedFile[] {
    return uiIR.pages.map(page => {
      const imports = page.components.map(c => `import { ${c} } from '../components/${this.kebabCase(c)}';`).join('\n');
      const componentTags = page.components.map(c => `      <${c} />`).join('\n');

      const pageName = this.pageName(page);

      const content = `import React from 'react';
${imports}

export function ${pageName}() {
  return (
    <div className="${this.kebabCase(pageName)}-page">
      <h1>${pageName}</h1>
${componentTags}
    </div>
  );
}

export default ${pageName};
`;

      return { path: `pages/${this.kebabCase(pageName)}.tsx`, content, type: 'page' };
    });
  }

  // ---------------------------------------------------------------------------
  // Router (React Router or wouter)
  // ---------------------------------------------------------------------------

  private generateRouter(uiIR: UIIR): GeneratedFile {
    if (this.config.router === 'wouter') {
      return this.generateWouterRouter(uiIR);
    }
    return this.generateReactRouter(uiIR);
  }

  private generateReactRouter(uiIR: UIIR): GeneratedFile {
    const imports = uiIR.pages.map(page => `import ${this.pageName(page)} from '../pages/${this.kebabCase(this.pageName(page))}';`).join('\n');
    const routes = uiIR.pages.map(page => `      <Route path="${page.path}" element={<${this.pageName(page)} />} />`).join('\n');

    const content = `import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
${imports}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
${routes}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
`;

    return { path: 'router/index.tsx', content, type: 'route' };
  }

  private generateWouterRouter(uiIR: UIIR): GeneratedFile {
    const imports = uiIR.pages.map(page => `import ${this.pageName(page)} from '../pages/${this.kebabCase(this.pageName(page))}';`).join('\n');

    const pageNames = uiIR.pages.map(page => this.pageName(page));
    const routes = uiIR.pages.map((page, i) => {
      const PageComponent = pageNames[i];
      return `    if (path === '${page.path}') return <${PageComponent} />;`;
    }).join('\n');

    const content = `import React from 'react';
import { useLocation } from 'wouter';
${imports}

export function AppRouter() {
  const [path] = useLocation();

${routes}

  return null;
}

export default AppRouter;
`;

    return { path: 'router/index.tsx', content, type: 'route' };
  }

  // ---------------------------------------------------------------------------
  // State management store (Zustand by default)
  // ---------------------------------------------------------------------------

  private generateStore(uiIR: UIIR, workflowIR: WorkflowIR): GeneratedFile {
    const stateFields = uiIR.components
      .filter(c => c.state && Object.keys(c.state).length > 0)
      .map(c => {
        const entries = Object.entries(c.state).map(([k, v]) => `  ${k}: ${typeof v === 'string' ? `'${v}'` : JSON.stringify(v)};`).join('\n');
        return `  // ${c.name} state\n${entries}`;
      }).join('\n');

    const actions = workflowIR.workflows.map(wf => {
      const actionName = this.camelCase(wf.id || wf.triggers.join('_'));
      const params = wf.actions.length > 0 ? `payload: { ${wf.actions.map(a => `${this.camelCase(a)}?: any`).join(', ')} }` : '';
      const body = wf.actions.length > 0
        ? `
    // Workflow: ${wf.id}
    // Triggers: ${wf.triggers.join(', ')}
    set((state) => ({
      ${wf.actions.map(a => `${this.camelCase(a)}: payload.${this.camelCase(a)} ?? state.${this.camelCase(a)}`).join(',\n      ')}
    }));
    console.log('[store] ${actionName} executed with', ${params.includes('payload') ? 'payload' : '{}'});`
        : `
    console.log('[store] ${actionName} triggered');`;

      return `
  ${actionName}: (${params}) => {${body}
  },`;
    }).join('\n');

    const zustandContent = `import { create } from 'zustand';

interface AppState {
${stateFields || '  // Add state fields here'}

${actions || '  // Add actions here'}
}

export const useAppStore = create<AppState>((set) => ({
${stateFields || '  // Add state initial values here'}
${actions || '  // Add action implementations here'}
}));
`;

    const reduxContent = `import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

${workflowIR.workflows.map(wf => {
  const sliceName = this.camelCase(wf.id || wf.triggers.join('_'));
  return `// ${wf.id} slice
interface ${this.pascalCase(sliceName)}State {
  status: 'idle' | 'loading' | 'success' | 'error';
  lastTriggered: number | null;
  ${wf.actions.map(a => `${this.camelCase(a)}: any;`).join('\n  ')}
}

const initial${this.pascalCase(sliceName)}State: ${this.pascalCase(sliceName)}State = {
  status: 'idle',
  lastTriggered: null,
  ${wf.actions.map(a => `${this.camelCase(a)}: null,`).join('\n  ')}
};

const ${sliceName}Slice = createSlice({
  name: '${sliceName}',
  initialState: initial${this.pascalCase(sliceName)}State,
  reducers: {
    ${sliceName}: (state, action: PayloadAction<Partial<${this.pascalCase(sliceName)}State>>) => {
      Object.assign(state, action.payload);
      state.status = 'success';
      state.lastTriggered = Date.now();
    },
  },
});

export const { ${sliceName} } = ${sliceName}Slice.actions;`;
}).join('\n\n')}

export const store = configureStore({
  reducer: {
${workflowIR.workflows.map(wf => `    ${this.camelCase(wf.id || wf.triggers.join('_'))}: ${this.camelCase(wf.id || wf.triggers.join('_'))}Slice.reducer,`).join('\n')}
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`;

    const jotaiContent = `import { atom } from 'jotai';

// Per-component state atoms
${uiIR.components.filter(c => c.state && Object.keys(c.state).length > 0).map(comp => {
  const atoms = Object.entries(comp.state).map(([k, v]) => `export const ${this.camelCase(comp.name)}${this.pascalCase(k)}Atom = atom<${typeof v === 'string' ? 'string' : typeof v}>(typeof v === 'string' ? '${v}' : ${JSON.stringify(v)});`).join('\n');
  return `// ${comp.name} atoms\n${atoms}`;
}).join('\n\n') || '// Define component atoms as needed'}

// Workflow-derived atoms
${workflowIR.workflows.map(wf => {
  const deps = wf.actions.map(a => `atomWith${this.pascalCase(a)}`).join(', ');
  return `// ${wf.id}
export const ${this.camelCase(wf.id || wf.triggers.join('_'))}Atom = atom((get) => ({
  status: 'idle' as const,
  lastTriggered: null as number | null,
}));`;
}).join('\n\n') || '// Define workflow atoms as needed'}
`;

    let content: string;
    switch (this.config.stateLib) {
      case 'redux':
        content = reduxContent;
        break;
      case 'jotai':
        content = jotaiContent;
        break;
      default:
        content = zustandContent;
    }

    return { path: 'store/index.ts', content, type: 'store' };
  }

  // ---------------------------------------------------------------------------
  // App entry point
  // ---------------------------------------------------------------------------

  private generateAppEntry(uiIR: UIIR): GeneratedFile {
    let storeImport = '';
    let storeProvider = '';

    switch (this.config.stateLib) {
      case 'redux':
        storeImport = "import { Provider } from 'react-redux';\nimport { store } from './store';";
        storeProvider = `<Provider store={store}>`;
        break;
      case 'jotai':
        storeImport = "import { Provider } from 'jotai';";
        storeProvider = '<Provider>';
        break;
    }

    const storeClose = storeProvider ? `</${storeProvider.slice(1, storeProvider.indexOf('>'))}>` : '';

    const content = `import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './router';
${storeImport}

function App() {
  return (
    ${storeProvider || ''}
      <AppRouter />
    ${storeClose || ''}
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
`;

    return { path: 'index.tsx', content, type: 'entry' };
  }

  // ---------------------------------------------------------------------------
  // Custom hooks (one per workflow trigger)
  // ---------------------------------------------------------------------------

  private generateHooks(uiIR: UIIR): GeneratedFile[] {
    const compMap = new Map(uiIR.components.map(c => [c.name, c]));
    return uiIR.pages.flatMap(page =>
      page.components
        .map(name => compMap.get(name))
        .filter((c): c is ComponentIR => c !== undefined && c.state && Object.keys(c.state).length > 0)
        .map(comp => {
          const hookName = `use${comp.name}`;
          const stateEntries = Object.entries(comp.state).map(([k, v]) => `  const [${k}, set${this.pascalCase(k)}] = useState<${typeof v === 'string' ? 'string' : typeof v}>(typeof v === 'string' ? '${v}' : ${JSON.stringify(v)});`).join('\n');
          const setters = Object.keys(comp.state).map(k => `set${this.pascalCase(k)}`).join(', ');
          const content = `import { useState } from 'react';

export function ${hookName}() {
${stateEntries}

  return { ${Object.keys(comp.state).join(', ')}, ${setters} };
}
`;

        return { path: `hooks/${this.kebabCase(hookName)}.ts`, content, type: 'hook' };
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private pageName(page: PageIR): string {
    const base = page.path.replace(/^\//, '').replace(/[-/]/g, ' ').trim();
    return this.pascalCase(base || 'home');
  }

  private generatePropTypes(props: Record<string, unknown>): string {
    if (!props || Object.keys(props).length === 0) return '';
    return Object.entries(props).map(([k, v]) => `  ${k}: ${this.inferPropType(v)};`).join('\n');
  }

  private extractPropNames(props: Record<string, unknown>): string {
    return Object.keys(props).join(', ');
  }

  private inferPropType(value: unknown): string {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'any[]';
    if (value === null) return 'null';
    return 'any';
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
  "name": "anfsf-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.0"
  }
}`;
    return { path: 'package.json', content, type: 'entry' };
  }

  private generateTsConfig(): GeneratedFile {
    const content = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}`;
    return { path: 'tsconfig.json', content, type: 'entry' };
  }
}

export function createFrontendArchitect(config?: Partial<FrontendArchitectureConfig>): FrontendArchitect {
  return new FrontendArchitect(config);
}
