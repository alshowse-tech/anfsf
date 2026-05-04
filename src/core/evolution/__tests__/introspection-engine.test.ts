/**
 * Tests for Introspection Engine
 */

import { IntrospectionEngine, createIntrospectionEngine } from '../introspection-engine';

describe('IntrospectionEngine', () => {
  it('should create instance', () => {
    const engine = new IntrospectionEngine({ sourceDirs: ['src'] });
    expect(engine).toBeDefined();
  });

  it('should create via factory', () => {
    const engine = createIntrospectionEngine({ sourceDirs: ['src'] });
    expect(engine).toBeDefined();
  });

  it('should return empty report for no files', async () => {
    const engine = new IntrospectionEngine({
      sourceDirs: ['src'],
      apiKey: '',
    });

    const report = await engine.analyzeFiles([]);
    expect(report.filesAnalyzed).toBe(0);
    expect(report.findings).toEqual([]);
    expect(report.summary).toContain('No files');
  });

  it('should analyze files with fallback when no API key', async () => {
    const engine = new IntrospectionEngine({
      sourceDirs: ['src'],
      apiKey: '',
    });

    const report = await engine.analyzeFiles([
      { path: 'src/test.ts', content: 'export function add(a: number, b: number): number { return a + b; }' },
    ]);

    expect(report.filesAnalyzed).toBe(1);
    // Without API key, findings will be empty but report should still be valid
    expect(report).toHaveProperty('analyzedAt');
    expect(report).toHaveProperty('duration');
  });

  it('should handle multiple files in chunks', async () => {
    const engine = new IntrospectionEngine({
      sourceDirs: ['src'],
      apiKey: '',
    });

    const files = Array.from({ length: 12 }, (_, i) => ({
      path: `src/file${i}.ts`,
      content: `export const x${i} = ${i};`,
    }));

    const report = await engine.analyzeFiles(files);
    expect(report.filesAnalyzed).toBe(12);
  });

  it('should handle empty content files', async () => {
    const engine = new IntrospectionEngine({
      sourceDirs: ['src'],
      apiKey: '',
    });

    const report = await engine.analyzeFiles([
      { path: 'src/empty.ts', content: '' },
    ]);

    expect(report.filesAnalyzed).toBe(1);
  });
});
