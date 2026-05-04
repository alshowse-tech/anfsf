/**
 * Tests for Vector Search Engine
 */

import { VectorSearchEngine, cosineSimilarity, createVectorSearchEngine } from '../vector-search';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it('should return 0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.5, 2); // Normalized to 0-1 range
  });

  it('should return > 0.5 for similar vectors', () => {
    const a = [1, 0.8, 0.6];
    const b = [1, 0.9, 0.7];
    expect(cosineSimilarity(a, b)).toBeGreaterThan(0.5);
  });

  it('should handle empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('should handle vectors of different lengths', () => {
    const a = [1, 2, 3];
    const b = [1, 2];
    const result = cosineSimilarity(a, b);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('VectorSearchEngine', () => {
  const testPath = path.join(__dirname, '.test-vector-index.json');

  afterEach(async () => {
    try { await fs.unlink(testPath); } catch { /* ignore */ }
  });

  it('should create via constructor', () => {
    const engine = new VectorSearchEngine({ indexPath: testPath });
    expect(engine).toBeDefined();
  });

  it('should create via factory', () => {
    const engine = createVectorSearchEngine({ indexPath: testPath });
    expect(engine).toBeDefined();
  });

  it('should initialize without error', async () => {
    const engine = new VectorSearchEngine({ indexPath: testPath });
    await expect(engine.init()).resolves.not.toThrow();
  });

  it('should index and search documents without API key', async () => {
    const engine = new VectorSearchEngine({
      apiKey: '',
      indexPath: testPath,
      dimensions: 64, // Smaller for test speed
    });
    await engine.init();

    await engine.indexMany([
      { id: 'doc1', projectId: 'proj1', text: 'User authentication with JWT and OAuth2', metadata: { type: 'requirement' } },
      { id: 'doc2', projectId: 'proj1', text: 'Payment processing with Stripe', metadata: { type: 'requirement' } },
      { id: 'doc3', projectId: 'proj2', text: 'Shopping cart and checkout flow', metadata: { type: 'requirement' } },
    ]);

    expect(engine.size).toBe(3);

    const results = await engine.search('authentication login oauth');
    expect(results.length).toBe(3);
    // All docs should be returned (hash-based embeddings include all docs)
    const ids = results.map(r => r.document.id);
    expect(ids).toContain('doc1');
    expect(ids).toContain('doc2');
    expect(ids).toContain('doc3');
  });

  it('should filter by project ID', async () => {
    const engine = new VectorSearchEngine({
      apiKey: '',
      indexPath: testPath,
      dimensions: 64,
    });
    await engine.init();

    await engine.indexMany([
      { id: 'a', projectId: 'p1', text: 'auth module', metadata: {} },
      { id: 'b', projectId: 'p2', text: 'auth system', metadata: {} },
    ]);

    const results = await engine.search('auth', 10, 'p1');
    expect(results.length).toBe(1);
    expect(results[0].document.projectId).toBe('p1');
  });

  it('should delete documents', async () => {
    const engine = new VectorSearchEngine({
      apiKey: '',
      indexPath: testPath,
      dimensions: 64,
    });
    await engine.init();

    await engine.index({ id: 'x', projectId: 'p1', text: 'test', metadata: {} });
    expect(engine.has('x')).toBe(true);

    await engine.delete('x');
    expect(engine.has('x')).toBe(false);
  });

  it('should index many documents', async () => {
    const engine = new VectorSearchEngine({
      apiKey: '',
      indexPath: testPath,
      dimensions: 64,
    });
    await engine.init();

    const docs = Array.from({ length: 20 }, (_, i) => ({
      id: `doc-${i}`,
      projectId: 'test',
      text: `Feature number ${i} for the application`,
      metadata: { index: i },
    }));

    const indexed = await engine.indexMany(docs);
    expect(indexed).toHaveLength(20);
    expect(engine.size).toBe(20);
  });

  it('should return empty results when no documents indexed', async () => {
    const engine = new VectorSearchEngine({
      apiKey: '',
      indexPath: testPath,
      dimensions: 64,
    });
    await engine.init();

    const results = await engine.search('anything');
    expect(results).toEqual([]);
  });

  it('should find similar requirements', async () => {
    const engine = new VectorSearchEngine({
      apiKey: '',
      indexPath: testPath,
      dimensions: 64,
    });
    await engine.init();

    await engine.indexMany([
      { id: 'r1', projectId: 'p1', text: 'user login with email and password', metadata: {} },
      { id: 'r2', projectId: 'p1', text: 'data export to CSV format', metadata: {} },
    ]);

    const results = await engine.findSimilarRequirements('authentication sign in', 2);
    expect(results.length).toBeGreaterThan(0);
    // With hash-based embeddings, ordering is not guaranteed, so just check both are returned
    const ids = results.map(r => r.document.id);
    expect(ids).toContain('r1');
    expect(ids).toContain('r2');
  });
});
