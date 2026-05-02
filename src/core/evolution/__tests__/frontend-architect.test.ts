/**
 * ANFSF L6 — Frontend Architect Unit Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { FrontendArchitect, createFrontendArchitect } from '../frontend-architect';
import type { UIIR, WorkflowIR } from '../../../req-graph/graph-engine';

describe('Frontend Architect Unit Tests', () => {
  let architect: FrontendArchitect;

  const sampleUIIR: UIIR = {
    components: [
      {
        name: 'UserList',
        props: { filter: 'string', page: 1 },
        state: { items: [] as unknown as string[], loading: false },
      },
      {
        name: 'OrderForm',
        props: { onSubmit: 'function' as unknown as string },
        state: { form: {} as Record<string, unknown> },
      },
      {
        name: 'Dashboard',
        props: {},
        state: {},
      },
    ],
    pages: [
      { path: '/', components: ['Dashboard'] },
      { path: '/users', components: ['UserList'] },
      { path: '/orders', components: ['OrderForm'] },
    ],
  };

  const sampleWorkflowIR: WorkflowIR = {
    workflows: [
      { id: 'user-login', triggers: ['click'], actions: ['authenticate'] },
      { id: 'order-submit', triggers: ['submit'], actions: ['validate', 'create'] },
    ],
  };

  beforeEach(() => {
    architect = createFrontendArchitect();
  });

  it('should create architect with default config', () => {
    const result = architect.generate(sampleUIIR, sampleWorkflowIR);
    expect(result.files.length).toBeGreaterThan(0);
  });

  it('should generate component files', () => {
    const result = architect.generate(sampleUIIR, sampleWorkflowIR);
    const components = result.files.filter(f => f.type === 'component');
    expect(components.length).toBe(3);
    expect(components.some(f => f.path.includes('user-list'))).toBe(true);
    expect(components.some(f => f.path.includes('order-form'))).toBe(true);
    expect(components.some(f => f.path.includes('dashboard'))).toBe(true);
  });

  it('should generate component with props interface', () => {
    const result = architect.generate(sampleUIIR, sampleWorkflowIR);
    const userList = result.files.find(f => f.path.includes('user-list') && f.type === 'component');
    expect(userList?.content).toContain('UserListProps');
    expect(userList?.content).toContain('filter: string');
    expect(userList?.content).toContain('page: number');
  });

  it('should generate page files', () => {
    const result = architect.generate(sampleUIIR, sampleWorkflowIR);
    const pages = result.files.filter(f => f.type === 'page');
    expect(pages.length).toBe(3);
    expect(pages.some(f => f.path.includes('home'))).toBe(true);
    expect(pages.some(f => f.path.includes('users'))).toBe(true);
    expect(pages.some(f => f.path.includes('orders'))).toBe(true);
  });

  it('should generate page with component imports', () => {
    const result = architect.generate(sampleUIIR, sampleWorkflowIR);
    const usersPage = result.files.find(f => f.path.includes('users') && f.type === 'page');
    expect(usersPage?.content).toContain("import { UserList }");
    expect(usersPage?.content).toContain('<UserList />');
  });

  it('should generate React Router by default', () => {
    const result = architect.generate(sampleUIIR, sampleWorkflowIR);
    const router = result.files.find(f => f.type === 'route');
    expect(router).toBeDefined();
    expect(router?.content).toContain('react-router-dom');
    expect(router?.content).toContain('BrowserRouter');
    expect(router?.content).toContain('Routes');
    expect(router?.content).toContain('Route');
  });

  it('should generate wouter router when configured', () => {
    const wouterArchitect = createFrontendArchitect({ router: 'wouter' });
    const result = wouterArchitect.generate(sampleUIIR, sampleWorkflowIR);
    const router = result.files.find(f => f.type === 'route');
    expect(router?.content).toContain('wouter');
    expect(router?.content).toContain('useLocation');
  });

  it('should generate Zustand store by default', () => {
    const result = architect.generate(sampleUIIR, sampleWorkflowIR);
    const store = result.files.find(f => f.type === 'store');
    expect(store).toBeDefined();
    expect(store?.content).toContain('zustand');
    expect(store?.content).toContain('create<AppState>');
  });

  it('should generate Redux store when configured', () => {
    const reduxArchitect = createFrontendArchitect({ stateLib: 'redux' });
    const result = reduxArchitect.generate(sampleUIIR, sampleWorkflowIR);
    const store = result.files.find(f => f.type === 'store');
    expect(store?.content).toContain('@reduxjs/toolkit');
    expect(store?.content).toContain('configureStore');
  });

  it('should generate Jotai store when configured', () => {
    const jotaiArchitect = createFrontendArchitect({ stateLib: 'jotai' });
    const result = jotaiArchitect.generate(sampleUIIR, sampleWorkflowIR);
    const store = result.files.find(f => f.type === 'store');
    expect(store?.content).toContain('jotai');
    expect(store?.content).toContain('atom');
  });

  it('should generate app entry point', () => {
    const result = architect.generate(sampleUIIR, sampleWorkflowIR);
    const entry = result.files.find(f => f.type === 'entry');
    expect(entry).toBeDefined();
    expect(entry?.path).toBe('index.tsx');
    expect(entry?.content).toContain('react-dom/client');
    expect(entry?.content).toContain('AppRouter');
  });

  it('should generate hooks for components with state', () => {
    const result = architect.generate(sampleUIIR, sampleWorkflowIR);
    const hooks = result.files.filter(f => f.type === 'hook');
    expect(hooks.length).toBe(2);
    expect(hooks.some(f => f.path.includes('use-user-list'))).toBe(true);
    expect(hooks.some(f => f.path.includes('use-order-form'))).toBe(true);
  });

  it('should not generate hooks for components without state', () => {
    const result = architect.generate(sampleUIIR, sampleWorkflowIR);
    const hooks = result.files.filter(f => f.type === 'hook');
    expect(hooks.some(f => f.path.includes('dashboard'))).toBe(false);
  });

  it('should include workflow actions in store', () => {
    const result = architect.generate(sampleUIIR, sampleWorkflowIR);
    const store = result.files.find(f => f.type === 'store');
    expect(store?.content).toContain('userLogin');
    expect(store?.content).toContain('orderSubmit');
  });

  it('should produce correct summary', () => {
    const result = architect.generate(sampleUIIR, sampleWorkflowIR);
    expect(result.summary.components).toBe(3);
    expect(result.summary.pages).toBe(3);
    expect(result.summary.stores).toBe(1);
    expect(result.summary.totalFiles).toBe(result.files.length);
  });

  it('should handle empty IR gracefully', () => {
    const emptyUIIR: UIIR = { components: [], pages: [] };
    const emptyWorkflowIR: WorkflowIR = { workflows: [] };
    const result = architect.generate(emptyUIIR, emptyWorkflowIR);
    expect(result.summary.components).toBe(0);
    expect(result.summary.pages).toBe(0);
    expect(result.summary.totalFiles).toBe(result.files.length);
  });

  it('should handle home page path correctly', () => {
    const uiIR: UIIR = {
      components: [{ name: 'Home', props: {}, state: {} }],
      pages: [{ path: '/', components: ['Home'] }],
    };
    const result = architect.generate(uiIR, { workflows: [] });
    const homePage = result.files.find(f => f.path.includes('home') && f.type === 'page');
    expect(homePage).toBeDefined();
  });
});
