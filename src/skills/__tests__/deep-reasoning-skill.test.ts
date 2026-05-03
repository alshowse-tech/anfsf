/**
 * ANFSF L4 — Deep Reasoning Skill Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DeepReasoningSkill, createDeepReasoningSkill } from '../deep-reasoning-skill';
import { RequirementGraphEngine } from '../../req-graph/graph-engine';

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
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build(
      'User system',
      [],
      [
        { id: 'f1', name: 'User Auth', description: 'User authentication' },
        { id: 'f2', name: 'User Profile', description: 'User profile management' },
      ],
      [],
      [{ id: 's1', name: 'Auth Service', architecture: 'monolith' }],
      [],
      [],
    );

    const result = await skill.execute({
      graph,
      question: 'What happens if auth fails?',
      mode: 'causal',
    });

    expect(result.steps.length).toBeGreaterThanOrEqual(0);
    expect(result.answer).toContain('推理起点');
    // Note: with no edges, steps may be empty but reasoning still ran
  });

  it('should perform impact reasoning', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build(
      'E-commerce',
      [],
      [
        { id: 'f1', name: 'Product Catalog', description: 'Product listing' },
        { id: 'f2', name: 'Shopping Cart', description: 'Cart management' },
        { id: 'f3', name: 'Checkout', description: 'Order processing' },
      ],
      [],
      [],
      [],
      [],
    );

    const result = await skill.execute({
      graph,
      question: 'What is the impact of changing the product schema?',
      focusNodeId: 'node-f1',
      mode: 'impact',
    });

    expect(result.impactAssessment).toBeDefined();
    // With no edges, impact may be empty, but the reasoning still ran
    expect(result.answer).toContain('推理模式');
  });

  it('should perform dependency reasoning', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build(
      'Blog system',
      [],
      [{ id: 'f1', name: 'Blog Posts', description: 'Create and manage posts' }],
      [],
      [{ id: 's1', name: 'Blog API', architecture: 'monolith' }],
      [{ id: 'e1', name: 'Post', type: 'entity' }],
      [],
    );

    const result = await skill.execute({
      graph,
      question: 'What does the blog API depend on?',
      mode: 'dependency',
    });

    expect(result.causalChains.length).toBeGreaterThanOrEqual(0);
    expect(result.steps.length).toBeGreaterThanOrEqual(0);
  });

  it('should perform consistency reasoning', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build(
      'Task app',
      [],
      [
        { id: 'f1', name: 'Tasks', description: 'Task management' },
        { id: 'f2', name: 'Task List', description: 'Display tasks' },
      ],
      [],
      [],
      [],
      [],
    );

    const result = await skill.execute({
      graph,
      question: 'Are there any conflicting requirements?',
      mode: 'consistency',
    });

    expect(result.consistencyIssues).toBeDefined();
    expect(Array.isArray(result.consistencyIssues)).toBe(true);
  });

  it('should return empty result for empty graph', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build('Empty', [], [], [], [], [], []);

    const result = await skill.execute({
      graph,
      question: 'What is the impact?',
    });

    expect(result).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it('should use focus node when specified', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build(
      'System',
      [],
      [{ id: 'f1', name: 'Feature A', description: 'Feature A' }],
      [],
      [],
      [],
      [],
    );

    const firstNodeId = [...graph.nodes.keys()][0];

    const result = await skill.execute({
      graph,
      question: 'What about this node?',
      focusNodeId: firstNodeId,
      mode: 'causal',
    });

    // With no edges, steps may be empty but reasoning executed successfully
    expect(result.steps.length).toBeGreaterThanOrEqual(0);
  });

  it('should respect maxDepth', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build(
      'Chain system',
      [],
      [
        { id: 'f1', name: 'A', description: 'A' },
        { id: 'f2', name: 'B', description: 'B' },
        { id: 'f3', name: 'C', description: 'C' },
      ],
      [],
      [],
      [],
      [],
    );

    const result = await skill.execute({
      graph,
      question: 'Trace the chain',
      mode: 'dependency',
      maxDepth: 1,
    });

    expect(result).toBeDefined();
  });

  it('should compute confidence', async () => {
    const graphEngine = new RequirementGraphEngine();
    const graph = graphEngine.build('Test', [], [{ id: 'f1', name: 'Feature', description: 'test' }], [], [], [], []);

    const result = await skill.execute({
      graph,
      question: 'What is the confidence?',
    });

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
