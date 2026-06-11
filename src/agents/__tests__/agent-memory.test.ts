import { describe, it, expect, beforeEach } from '@jest/globals';
import { AgentMemoryStore } from '../agent-memory';

describe('Agent Memory Store', () => {
  let store: AgentMemoryStore;

  beforeEach(() => {
    store = new AgentMemoryStore();
  });

  it('should store a working memory', () => {
    const memory = store.store('agent-1', {
      type: 'working',
      content: { query: 'how to sort array' },
    });

    expect(memory.id).toBeDefined();
    expect(memory.agentId).toBe('agent-1');
    expect(memory.type).toBe('working');
    expect(memory.accessCount).toBe(0);
  });

  it('should store episodic memory with tags', () => {
    const memory = store.store('agent-1', {
      type: 'episodic',
      content: { task: 'build-api', outcome: 'success' },
      tags: ['task:api-build', 'api'],
    });

    expect(memory.tags).toContain('task:api-build');
    expect(memory.tags).toContain('api');
  });

  it('should store semantic memory with importance', () => {
    const memory = store.store('agent-1', {
      type: 'semantic',
      content: { pattern: 'use factory for objects' },
      importance: 0.9,
    });

    expect(memory.importance).toBe(0.9);
  });

  it('should retrieve memories by type', () => {
    store.store('agent-1', { type: 'working', content: { a: 1 } });
    store.store('agent-1', { type: 'episodic', content: { b: 2 } });
    store.store('agent-1', { type: 'semantic', content: { c: 3 } });

    const working = store.retrieve('agent-1', { type: 'working' });
    expect(working.length).toBe(1);
    expect(working[0].type).toBe('working');
  });

  it('should retrieve memories by tags', () => {
    store.store('agent-1', { type: 'episodic', content: { a: 1 }, tags: ['api', 'rest'] });
    store.store('agent-1', { type: 'episodic', content: { b: 2 }, tags: ['graphql'] });

    const apiMems = store.retrieve('agent-1', { tags: ['api'] });
    expect(apiMems.length).toBe(1);
  });

  it('should limit results', () => {
    store.store('agent-1', { type: 'working', content: { i: 1 } });
    store.store('agent-1', { type: 'working', content: { i: 2 } });
    store.store('agent-1', { type: 'working', content: { i: 3 } });

    const results = store.retrieve('agent-1', { type: 'working', limit: 2 });
    expect(results.length).toBe(2);
  });

  it('should increment access count on retrieve', () => {
    const memory = store.store('agent-1', { type: 'working', content: {} });
    store.retrieve('agent-1', { type: 'working' });

    const retrieved = store.retrieve('agent-1', { type: 'working' });
    expect(retrieved[0].accessCount).toBeGreaterThan(0);
  });

  it('should search memories by content', () => {
    store.store('agent-1', { type: 'working', content: { query: 'sorting algorithms' } });
    store.store('agent-1', { type: 'working', content: { query: 'search algorithms' } });

    const results = store.search('agent-1', 'sorting');
    expect(results.length).toBe(1);
  });

  it('should search by tags', () => {
    store.store('agent-1', { type: 'semantic', content: {}, tags: ['typescript', 'patterns'] });

    const results = store.search('agent-1', 'typescript');
    expect(results.length).toBe(1);
  });

  it('should filter search by type', () => {
    store.store('agent-1', { type: 'working', content: { text: 'find me' } });
    store.store('agent-1', { type: 'semantic', content: { text: 'find me' } });

    const results = store.search('agent-1', 'find me', 'semantic');
    expect(results.length).toBe(1);
    expect(results[0].type).toBe('semantic');
  });

  it('should consolidate memories', async () => {
    store.store('agent-1', {
      type: 'episodic',
      content: { task: 'test', outcome: 'success' },
      tags: ['task:test-1'],
    });

    const result = await store.consolidate('agent-1');
    expect(result.consolidatedCount).toBeGreaterThanOrEqual(0);
    expect(result.prunedCount).toBeGreaterThanOrEqual(0);
    expect(result.importanceScores).toBeDefined();
  });

  it('should return empty consolidation for no memories', async () => {
    const result = await store.consolidate('empty-agent');
    expect(result.consolidatedCount).toBe(0);
    expect(result.prunedCount).toBe(0);
  });

  it('should clear memories by type', () => {
    store.store('agent-1', { type: 'working', content: {} });
    store.store('agent-1', { type: 'episodic', content: {} });

    store.clear('agent-1', 'working');
    const remaining = store.retrieve('agent-1');
    expect(remaining.length).toBe(1);
    expect(remaining[0].type).toBe('episodic');
  });

  it('should clear all memories for agent', () => {
    store.store('agent-1', { type: 'working', content: {} });
    store.store('agent-1', { type: 'episodic', content: {} });

    store.clear('agent-1');
    expect(store.retrieve('agent-1').length).toBe(0);
  });

  it('should return memory stats', () => {
    store.store('agent-1', { type: 'working', content: {} });
    store.store('agent-1', { type: 'working', content: {} });
    store.store('agent-1', { type: 'episodic', content: {} });
    store.store('agent-1', { type: 'semantic', content: {} });

    const stats = store.getStats('agent-1');
    expect(stats.working).toBe(2);
    expect(stats.episodic).toBe(1);
    expect(stats.semantic).toBe(1);
  });

  it('should return total count', () => {
    store.store('agent-1', { type: 'working', content: {} });
    store.store('agent-2', { type: 'working', content: {} });
    store.store('agent-2', { type: 'episodic', content: {} });

    expect(store.getTotalCount()).toBe(3);
  });
});
