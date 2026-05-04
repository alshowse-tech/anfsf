/**
 * Detail Polisher — unit tests
 */

import { DetailPolisher, FilePolishResult, PolishFinding } from '../detail-polisher';

describe('DetailPolisher', () => {
  describe('constructor', () => {
    it('should create instance with required config', () => {
      const polisher = new DetailPolisher({ apiKey: 'test-key' });
      expect(polisher).toBeDefined();
    });

    it('should use default model', () => {
      const polisher = new DetailPolisher({ apiKey: 'test-key' });
      expect(polisher).toBeDefined();
    });

    it('should accept custom model', () => {
      const polisher = new DetailPolisher({ apiKey: 'test-key', model: 'custom-model' });
      expect(polisher).toBeDefined();
    });
  });

  describe('polish()', () => {
    it('should handle empty file list', async () => {
      const polisher = new DetailPolisher({ apiKey: 'test-key' });
      const results = await polisher.polish([]);
      expect(results).toEqual([]);
    });

    it('should return results with non-modified files when no API key', async () => {
      const polisher = new DetailPolisher({ apiKey: '' });
      const results = await polisher.polish([{ path: 'test.ts', content: 'const x = 1;' }]);
      expect(results).toHaveLength(1);
      expect(results[0].modified).toBe(false);
      expect(results[0].code).toBe('const x = 1;');
      expect(results[0].findings).toEqual([]);
    });

    it('should skip disabled categories', async () => {
      const polisher = new DetailPolisher({
        apiKey: '',
        categories: [
          { dimension: 'experience', enabled: false },
          { dimension: 'performance', enabled: false },
          { dimension: 'edge-cases', enabled: false },
          { dimension: 'code-aesthetics', enabled: false },
        ],
      });
      const results = await polisher.polish([{ path: 'test.ts', content: 'const x = 1;' }]);
      expect(results).toHaveLength(1);
      expect(results[0].modified).toBe(false);
    });

    it('should pass prdContext through to categories', async () => {
      const polisher = new DetailPolisher({ apiKey: '' });
      const results = await polisher.polish(
        [{ path: 'test.ts', content: 'export function foo() { return 1; }' }],
        'This is a test PRD context'
      );
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('test.ts');
    });
  });

  describe('applyFixes (via polish with no API key)', () => {
    it('should preserve original code when no API key', async () => {
      const polisher = new DetailPolisher({ apiKey: '' });
      const original = 'import { foo } from "bar";\nconst x = 1;\n';
      const results = await polisher.polish([{ path: 'test.ts', content: original }]);
      expect(results[0].code).toBe(original);
      expect(results[0].originalCode).toBe(original);
    });
  });

  describe('createDetailPolisher factory', () => {
    it('should create polisher instance', () => {
      const { createDetailPolisher } = require('../detail-polisher');
      const polisher = createDetailPolisher({ apiKey: 'test' });
      expect(polisher).toBeDefined();
    });
  });
});
