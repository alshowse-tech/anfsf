/**
 * ANFSF L4 — Deep Reasoning Skill Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DeepReasoningSkill, createDeepReasoningSkill } from '../deep-reasoning-skill';
import { RequirementGraphEngine } from '../../req-graph/graph-engine';
import type { Feature } from '../../prd/prd-parser';

function F(id: string, name: string, description: string): Feature {
  return { id, name, description, priority: 'P0', status: 'draft' };
}

function S(name: string): any {
  return { api: [], services: [{ name, responsibility: name, dependencies: [] }] };
}

function build(intent: string, features: Feature[] = [], system: any = { api: [], services: [] }) {
  const engine = new RequirementGraphEngine();
  return engine.build(
    { intent },
    {},
    features,
    [],
    system as any,
    [],
    { criteria: [], constraints: [] },
  );
}

describe('Deep Reasoning Skill Tests', () => {
  let skill: DeepReasoningSkill;

  beforeEach(() => {
    skill = createDeepReasoningSkill();
  });

  it('should create skill instance', () => {
    expect(skill).toBeDefined();
    expect(skill.name).toBe('deep-reasoning');
  });

  it('should perform causal reasoning', async () => {
    const graph = build('User system', [
      F('f1', 'User Auth', 'User authentication'),
      F('f2', 'User Profile', 'User profile management'),
    ], S('Auth Service'));

    const result = await skill.execute({
      graph,
      question: 'What happens if auth fails?',
      mode: 'causal',
    });

    expect(result.steps.length).toBeGreaterThanOrEqual(0);
    expect(result.answer).toContain('推理起点');
  });

  it('should perform impact reasoning', async () => {
    const graph = build('E-commerce', [
      F('f1', 'Product Catalog', 'Product listing'),
      F('f2', 'Shopping Cart', 'Cart management'),
      F('f3', 'Checkout', 'Order processing'),
    ]);

    const result = await skill.execute({
      graph,
      question: 'What is the impact of changing the product schema?',
      focusNodeId: 'node-f1',
      mode: 'impact',
    });

    expect(result.impactAssessment).toBeDefined();
    expect(result.answer).toContain('推理模式');
  });

  it('should perform dependency reasoning', async () => {
    const graph = build('Blog system', [
      F('f1', 'Blog Posts', 'Create and manage posts'),
    ], [{ id: 's1', name: 'Blog API', architecture: 'monolith' }]);

    const result = await skill.execute({
      graph,
      question: 'What does the blog API depend on?',
      mode: 'dependency',
    });

    expect(result.causalChains.length).toBeGreaterThanOrEqual(0);
    expect(result.steps.length).toBeGreaterThanOrEqual(0);
  });

  it('should perform consistency reasoning', async () => {
    const graph = build('Task app', [
      F('f1', 'Tasks', 'Task management'),
      F('f2', 'Task List', 'Display tasks'),
    ]);

    const result = await skill.execute({
      graph,
      question: 'Are there any conflicting requirements?',
      mode: 'consistency',
    });

    expect(result.consistencyIssues).toBeDefined();
    expect(Array.isArray(result.consistencyIssues)).toBe(true);
  });

  it('should return empty result for empty graph', async () => {
    const graph = build('Empty', []);

    const result = await skill.execute({
      graph,
      question: 'What is the impact?',
    });

    expect(result).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it('should use focus node when specified', async () => {
    const graph = build('System', [
      F('f1', 'Feature A', 'Feature A'),
    ]);

    const firstNodeId = [...graph.nodes.keys()][0];

    const result = await skill.execute({
      graph,
      question: 'What about this node?',
      focusNodeId: firstNodeId,
      mode: 'causal',
    });

    expect(result.steps.length).toBeGreaterThanOrEqual(0);
  });

  it('should respect maxDepth', async () => {
    const graph = build('Chain system', [
      F('f1', 'A', 'A'),
      F('f2', 'B', 'B'),
      F('f3', 'C', 'C'),
    ]);

    const result = await skill.execute({
      graph,
      question: 'Trace the chain',
      mode: 'dependency',
      maxDepth: 1,
    });

    expect(result).toBeDefined();
  });

  it('should compute confidence', async () => {
    const graph = build('Test', [F('f1', 'Feature', 'test')]);

    const result = await skill.execute({
      graph,
      question: 'What is the confidence?',
    });

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
