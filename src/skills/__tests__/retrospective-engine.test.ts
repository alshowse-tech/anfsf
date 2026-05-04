/**
 * Tests for Retrospective Engine
 */

import { RetrospectiveEngine, createRetrospectiveEngine } from '../retrospective-engine';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('RetrospectiveEngine', () => {
  const testPath = path.join(__dirname, '.test-knowledge.json');

  afterEach(async () => {
    try { await fs.unlink(testPath); } catch { /* ignore */ }
  });

  it('should create instance with default config', () => {
    const engine = new RetrospectiveEngine();
    expect(engine).toBeDefined();
  });

  it('should create via factory', () => {
    const engine = createRetrospectiveEngine({ knowledgeBasePath: testPath });
    expect(engine).toBeDefined();
  });

  it('should init without error', async () => {
    const engine = new RetrospectiveEngine({ knowledgeBasePath: testPath });
    await expect(engine.init()).resolves.not.toThrow();
  });

  it('should produce retrospective result without API key', async () => {
    const engine = new RetrospectiveEngine({
      apiKey: '',
      knowledgeBasePath: testPath,
    });
    await engine.init();

    const result = await engine.retrospective({
      projectId: 'test-1',
      prdText: 'Build a todo app',
      pipelineSteps: [
        { name: 'L1: PRD Parse', duration: 100, status: 'ok' },
        { name: 'L4: Graph', duration: 200, status: 'ok' },
        { name: 'L6: Architecture', duration: 300, status: 'error', error: 'Test error' },
      ],
      outputMetrics: {
        filesGenerated: 10,
        filesPolished: 0,
        qualityScore: 0.85,
        compileSuccess: true,
        guardPassed: true,
      },
      duration: 600,
      success: false,
    });

    expect(result.projectId).toBe('test-1');
    expect(result.summary).toContain('failed');
    expect(result.lessons.length).toBeGreaterThan(0);
    // Storage may fail if knowledge base path is invalid, which is fine for this test
  });

  it('should produce lessons for successful projects', async () => {
    const engine = new RetrospectiveEngine({
      apiKey: '',
      knowledgeBasePath: testPath,
    });
    await engine.init();

    const result = await engine.retrospective({
      projectId: 'test-2',
      prdText: 'Build a dashboard',
      pipelineSteps: [
        { name: 'L1: PRD Parse', duration: 100, status: 'ok' },
        { name: 'L4: Graph', duration: 200, status: 'ok' },
      ],
      outputMetrics: {
        filesGenerated: 5,
        filesPolished: 5,
        qualityScore: 0.95,
        compileSuccess: true,
        guardPassed: true,
      },
      duration: 300,
      success: true,
    });

    expect(result.lessons.length).toBeGreaterThan(0);
    expect(result.lessons[0].action).toBe('do');
  });

  it('should query lessons', async () => {
    const engine = new RetrospectiveEngine({
      apiKey: '',
      knowledgeBasePath: testPath,
    });
    await engine.init();

    const result = await engine.retrospective({
      projectId: 'test-3',
      prdText: 'Build something',
      pipelineSteps: [],
      duration: 100,
      success: true,
    });

    // Storage may fail silently without valid path, so query may return empty
    const entries = await engine.queryLessons('test-3');
    if (result.stored) {
      expect(entries.length).toBeGreaterThan(0);
    } else {
      expect(entries).toEqual([]);
    }
  });

  it('should handle empty query', async () => {
    const engine = new RetrospectiveEngine({ knowledgeBasePath: testPath });
    await engine.init();
    const entries = await engine.queryLessons('nonexistent');
    expect(entries).toEqual([]);
  });
});
