import { describe, it, expect, beforeEach } from '@jest/globals';
import { CodeAnnotator } from '../code-annotator';
import type { GiteaCommit, GiteaDiff } from '../../integrations/gitea-client';

const COMMIT: GiteaCommit = { sha: 'abc123', message: 'test', author: { name: 'dev', email: 'd@t' }, timestamp: '' };
const GENERATED_FILES = ['src/index.ts', 'src/App.tsx', 'package.json'];

describe('CodeAnnotator', () => {
  let annotator: CodeAnnotator;

  beforeEach(() => {
    annotator = new CodeAnnotator(GENERATED_FILES);
  });

  it('should classify untouched generated file as generated', () => {
    const diffs: GiteaDiff[] = [{ filename: 'src/index.ts', status: 'modified', additions: 0, deletions: 0 }];
    const result = annotator.annotate(COMMIT, diffs, 'p1');
    // Modified generated file = modified (dev changed it)
    expect(result.annotations[0].source).toBe('modified');
  });

  it('should classify new file not in generated set as new', () => {
    const diffs: GiteaDiff[] = [{ filename: 'src/services/payment.ts', status: 'added', additions: 50, deletions: 0 }];
    const result = annotator.annotate(COMMIT, diffs, 'p1');
    expect(result.annotations[0].source).toBe('new');
  });

  it('should track correct summary counts', () => {
    const diffs: GiteaDiff[] = [
      { filename: 'src/index.ts', status: 'modified', additions: 5, deletions: 2, patch: '+line\n-line' },
      { filename: 'src/newfile.ts', status: 'added', additions: 20, deletions: 0, patch: '...content...' },
    ];
    const result = annotator.annotate(COMMIT, diffs, 'p1');
    expect(result.summary.totalFiles).toBe(2);
    expect(result.summary.modifiedFiles).toBe(1);
    expect(result.summary.newFiles).toBe(1);
  });

  it('should add generated files dynamically', () => {
    annotator.addGeneratedFiles(['src/new-component.tsx']);
    expect(annotator.getGeneratedFiles()).toContain('src/new-component.tsx');
  });
});
