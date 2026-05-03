/**
 * ANFSF L6 — Backend Architect Unit Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { BackendArchitect, createBackendArchitect } from '../backend-architect';
import type { ServiceIR, DataIR } from '../../../req-graph/graph-engine';

describe('Backend Architect Unit Tests', () => {
  let architect: BackendArchitect;

  const sampleServiceIR: ServiceIR = {
    endpoints: [
      { path: '/users', method: 'GET', request: {}, response: {} },
      { path: '/users/:id', method: 'GET', request: {}, response: {} },
      { path: '/users', method: 'POST', request: {}, response: {} },
      { path: '/users/:id', method: 'PUT', request: {}, response: {} },
      { path: '/users/:id', method: 'DELETE', request: {}, response: {} },
      { path: '/orders', method: 'GET', request: {}, response: {} },
      { path: '/orders', method: 'POST', request: {}, response: {} },
    ],
    services: [
      { name: 'User', responsibility: 'User management', dependencies: ['user'] },
      { name: 'Order', responsibility: 'Order processing', dependencies: ['order'] },
    ],
  };

  const sampleDataIR: DataIR = {
    entities: [
      {
        name: 'user',
        fields: [
          { name: 'id', type: 'uuid', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'age', type: 'int', required: false },
        ],
      },
      {
        name: 'order',
        fields: [
          { name: 'id', type: 'uuid', required: true },
          { name: 'userId', type: 'uuid', required: true },
          { name: 'total', type: 'float', required: true },
          { name: 'status', type: 'string', required: true },
          { name: 'createdAt', type: 'date', required: false },
        ],
      },
    ],
    relationships: [
      { from: 'order', to: 'user', type: 'many-to-one' },
    ],
  };

  beforeEach(() => {
    architect = createBackendArchitect();
  });

  it('should create architect with default config', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    expect(result.files.length).toBeGreaterThan(0);
  });

  it('should generate entry point', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    const entry = result.files.find(f => f.type === 'entry');
    expect(entry).toBeDefined();
    expect(entry?.path).toBe('app.ts');
    expect(entry?.content).toContain('express');
    expect(entry?.content).toContain('errorHandler');
  });

  it('should generate middleware files', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    const middleware = result.files.filter(f => f.type === 'middleware');
    expect(middleware.length).toBe(2);
    expect(middleware.some(f => f.path.includes('error-handler'))).toBe(true);
    expect(middleware.some(f => f.path.includes('request-logger'))).toBe(true);
  });

  it('should generate model files for each entity', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    const models = result.files.filter(f => f.type === 'model');
    expect(models.length).toBe(2);
    expect(models.some(f => f.path.includes('user'))).toBe(true);
    expect(models.some(f => f.path.includes('order'))).toBe(true);
  });

  it('should generate correct TypeScript types for model fields', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    const userModel = result.files.find(f => f.path.includes('user') && f.type === 'model');
    expect(userModel?.content).toContain('id: string');
    expect(userModel?.content).toContain('name: string');
    expect(userModel?.content).toContain('email: string');
    expect(userModel?.content).toContain('age?: number');
  });

  it('should generate service files for each service', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    const services = result.files.filter(f => f.type === 'service');
    expect(services.length).toBe(2);
    expect(services.some(f => f.path.includes('user'))).toBe(true);
    expect(services.some(f => f.path.includes('order'))).toBe(true);
  });

  it('should generate CRUD methods in service', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    const userSvc = result.files.find(f => f.path.includes('user') && f.type === 'service');
    expect(userSvc?.content).toContain('findAll');
    expect(userSvc?.content).toContain('findById');
    expect(userSvc?.content).toContain('create');
    expect(userSvc?.content).toContain('update');
    expect(userSvc?.content).toContain('delete');
  });

  it('should generate controller files', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    const controllers = result.files.filter(f => f.type === 'controller');
    expect(controllers.length).toBe(2);
  });

  it('should generate route file', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    const routes = result.files.filter(f => f.type === 'route');
    expect(routes.length).toBe(1);
    expect(routes[0].content).toContain('Router');
  });

  it('should produce correct summary', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    expect(result.summary.endpoints).toBe(7);
    expect(result.summary.services).toBe(2);
    expect(result.summary.models).toBe(2);
    expect(result.summary.totalFiles).toBe(result.files.length);
  });

  it('should handle empty IR gracefully', () => {
    const emptyIR: ServiceIR = { endpoints: [], services: [] };
    const emptyData: DataIR = { entities: [], relationships: [] };
    const result = architect.generate(emptyIR, emptyData);
    expect(result.summary.endpoints).toBe(0);
    expect(result.summary.services).toBe(0);
    expect(result.summary.models).toBe(0);
  });

  it('should generate controller handlers with real implementations', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    const userCtrl = result.files.find(f => f.path.includes('user') && f.type === 'controller');
    expect(userCtrl?.content).toContain('req.params');
    expect(userCtrl?.content).toContain('req.body');
    expect(userCtrl?.content).toContain('res.json');
    expect(userCtrl?.content).toContain('res.status');
    expect(userCtrl?.content).toContain('findById');
    expect(userCtrl?.content).toContain('findAll');
    expect(userCtrl?.content).toContain('create');
    expect(userCtrl?.content).toContain('update');
    expect(userCtrl?.content).toContain('delete');
  });

  it('should generate GET handler with 404 handling for single resource', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    const userCtrl = result.files.find(f => f.path.includes('user') && f.type === 'controller');
    expect(userCtrl?.content).toContain('404');
    expect(userCtrl?.content).toContain('not found');
  });

  it('should generate POST handler with 201 status', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    const userCtrl = result.files.find(f => f.path.includes('user') && f.type === 'controller');
    expect(userCtrl?.content).toContain('201');
  });

  it('should generate DELETE handler with 204 status', () => {
    const result = architect.generate(sampleServiceIR, sampleDataIR);
    const userCtrl = result.files.find(f => f.path.includes('user') && f.type === 'controller');
    expect(userCtrl?.content).toContain('204');
  });

  it('should map all field types correctly', () => {
    const dataIR: DataIR = {
      entities: [
        {
          name: 'test',
          fields: [
            { name: 'a', type: 'string', required: true },
            { name: 'b', type: 'number', required: true },
            { name: 'c', type: 'boolean', required: true },
            { name: 'd', type: 'int', required: true },
            { name: 'e', type: 'float', required: true },
            { name: 'f', type: 'date', required: true },
            { name: 'g', type: 'datetime', required: true },
            { name: 'h', type: 'uuid', required: true },
            { name: 'i', type: 'json', required: true },
            { name: 'j', type: 'unknown_type', required: true },
          ],
        },
      ],
      relationships: [],
    };
    const emptySvc: ServiceIR = { endpoints: [], services: [] };
    const result = architect.generate(emptySvc, dataIR);
    const model = result.files.find(f => f.type === 'model');
    expect(model?.content).toContain('a: string');
    expect(model?.content).toContain('b: number');
    expect(model?.content).toContain('c: boolean');
    expect(model?.content).toContain('d: number');
    expect(model?.content).toContain('e: number');
    expect(model?.content).toContain('f: Date');
    expect(model?.content).toContain('g: Date');
    expect(model?.content).toContain('h: string');
    expect(model?.content).toContain('i: any');
    expect(model?.content).toContain('j: any');
  });
});
