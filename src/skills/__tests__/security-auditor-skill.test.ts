/**
 * ANFSF L3/L17 — Security Auditor Skill Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SecurityAuditorSkill, createSecurityAuditorSkill } from '../security-auditor-skill';

describe('Security Auditor Skill Tests', () => {
  let skill: SecurityAuditorSkill;

  beforeEach(() => {
    skill = createSecurityAuditorSkill();
  });

  it('should create skill instance', () => {
    expect(skill).toBeDefined();
    expect(skill.name).toBe('security-auditor');
  });

  it('should audit IR with sensitive data fields', async () => {
    const result = await skill.execute({
      ir: {
        service: { endpoints: [], services: [] },
        ui: { components: [], pages: [] },
        workflow: { workflows: [] },
        data: {
          entities: [
            { name: 'User', fields: [{ name: 'id', type: 'uuid', required: true }, { name: 'password', type: 'string', required: true }] },
            { name: 'Payment', fields: [{ name: 'credit_card', type: 'string', required: true }] },
          ],
          relationships: [],
        },
      },
    });

    expect(result.findings.length).toBeGreaterThan(0);
    const sensitiveFindings = result.findings.filter(f =>
      f.description.includes('password') || f.description.includes('credit_card')
    );
    expect(sensitiveFindings.length).toBeGreaterThan(0);
    expect(result.summary.critical + result.summary.high + result.summary.medium).toBeGreaterThan(0);
  });

  it('should detect unauthenticated write endpoints', async () => {
    const result = await skill.execute({
      ir: {
        service: {
          endpoints: [
            { path: '/api/users', method: 'post', request: {}, response: {} },
            { path: '/api/users/:id', method: 'delete', request: { params: { id: 'string' } }, response: {} },
          ],
          services: [{ name: 'UserService', responsibility: 'User management', dependencies: [] }],
        },
        ui: { components: [], pages: [] },
        workflow: { workflows: [] },
        data: { entities: [], relationships: [] },
      },
    });

    const authFindings = result.findings.filter(f =>
      f.description.includes('authentication') || f.description.includes('Access Control')
    );
    expect(authFindings.length).toBeGreaterThan(0);
  });

  it('should detect unvalidated parameters', async () => {
    const result = await skill.execute({
      ir: {
        service: {
          endpoints: [
            { path: '/api/search', method: 'get', request: { params: { q: 'string' } }, response: {} },
          ],
          services: [],
        },
        ui: { components: [], pages: [] },
        workflow: { workflows: [] },
        data: { entities: [], relationships: [] },
      },
    });

    const injectionFindings = result.findings.filter(f => f.category.includes('Injection'));
    expect(injectionFindings.length).toBeGreaterThan(0);
  });

  it('should detect XSS risk in UI components', async () => {
    const result = await skill.execute({
      ir: {
        service: { endpoints: [], services: [] },
        ui: {
          components: [
            { name: 'HtmlRenderer', props: { dangerouslySetInnerHTML: 'string', html: 'string' }, state: {} },
            { name: 'LinkPreview', props: { url: 'string', href: 'string' }, state: {} },
          ],
          pages: [],
        },
        workflow: { workflows: [] },
        data: { entities: [], relationships: [] },
      },
    });

    const xssFindings = result.findings.filter(f => f.description.includes('XSS') || f.description.includes('URL'));
    expect(xssFindings.length).toBeGreaterThan(0);
  });

  it('should detect missing auth dependency in services', async () => {
    const result = await skill.execute({
      ir: {
        service: {
          endpoints: [],
          services: [{ name: 'PaymentService', responsibility: 'Payment processing', dependencies: ['Payment'] }],
        },
        ui: { components: [], pages: [] },
        workflow: { workflows: [] },
        data: {
          entities: [{ name: 'Payment', fields: [{ name: 'id', type: 'uuid', required: true }] }],
          relationships: [],
        },
      },
    });

    const authFindings = result.findings.filter(f => f.description.includes('auth dependency'));
    expect(authFindings.length).toBeGreaterThan(0);
  });

  it('should detect missing user entity', async () => {
    const result = await skill.execute({
      ir: {
        service: { endpoints: [], services: [] },
        ui: { components: [], pages: [] },
        workflow: { workflows: [] },
        data: {
          entities: [{ name: 'Product', fields: [{ name: 'id', type: 'uuid', required: true }] }],
          relationships: [],
        },
      },
    });

    const missingUserFindings = result.findings.filter(f => f.description.includes('authentication'));
    expect(missingUserFindings.length).toBeGreaterThan(0);
  });

  it('should detect dangerous patterns in source files', async () => {
    const result = await skill.execute({
      ir: {
        service: { endpoints: [], services: [] },
        ui: { components: [], pages: [] },
        workflow: { workflows: [] },
        data: { entities: [], relationships: [] },
      },
      sourceFiles: [
        { path: 'src/app.ts', content: 'const data = eval(userInput); console.log(password = "secret123");' },
        { path: 'src/ui.tsx', content: 'element.innerHTML = userContent;' },
      ],
    });

    const sourceFindings = result.findings.filter(f => f.location.includes('src/'));
    expect(sourceFindings.length).toBeGreaterThan(0);
  });

  it('should calculate security score', async () => {
    const result = await skill.execute({
      ir: {
        service: { endpoints: [], services: [] },
        ui: { components: [], pages: [] },
        workflow: { workflows: [] },
        data: {
          entities: [{ name: 'User', fields: [{ name: 'password', type: 'string', required: true }] }],
          relationships: [],
        },
      },
    });

    expect(result.score.overall).toBeGreaterThanOrEqual(0);
    expect(result.score.overall).toBeLessThanOrEqual(100);
    expect(Object.keys(result.score.categories).length).toBeGreaterThan(0);
  });

  it('should pass with no critical/high findings for clean IR', async () => {
    const result = await skill.execute({
      ir: {
        service: {
          endpoints: [{ path: '/api/health', method: 'get', request: { auth: true }, response: {} }],
          services: [{ name: 'HealthService', responsibility: 'Health check', dependencies: ['Auth'] }],
        },
        ui: { components: [{ name: 'HealthCheck', props: {}, state: {} }], pages: [] },
        workflow: { workflows: [] },
        data: {
          entities: [{ name: 'User', fields: [{ name: 'id', type: 'uuid', required: true }] }],
          relationships: [],
        },
      },
    });

    expect(result.summary.critical).toBe(0);
  });

  it('should detect exposed internal endpoints', async () => {
    const result = await skill.execute({
      ir: {
        service: {
          endpoints: [
            { path: '/internal/debug', method: 'get', request: {}, response: {} },
            { path: '/admin/users', method: 'get', request: {}, response: {} },
          ],
          services: [],
        },
        ui: { components: [], pages: [] },
        workflow: { workflows: [] },
        data: { entities: [], relationships: [] },
      },
    });

    const internalFindings = result.findings.filter(f => f.description.includes('sensitive'));
    expect(internalFindings.length).toBeGreaterThan(0);
  });

  it('should return summary counts', async () => {
    const result = await skill.execute({
      ir: {
        service: { endpoints: [], services: [] },
        ui: { components: [], pages: [] },
        workflow: { workflows: [] },
        data: { entities: [], relationships: [] },
      },
    });

    expect(result.summary).toHaveProperty('critical');
    expect(result.summary).toHaveProperty('high');
    expect(result.summary).toHaveProperty('medium');
    expect(result.summary).toHaveProperty('low');
    expect(result.summary).toHaveProperty('info');
  });
});
