/**
 * Combined tests for T-203, T-204, T-205, T-206
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { ContractWatcher } from '../contract-watcher';
import { CommitVerifier } from '../commit-verification';
import { FaultReporter } from '../fault-reporter';
import { TaskGenerator } from '../task-generator';
import type { CodeAnnotation } from '../code-annotator';
import type { GiteaCommit, GiteaDiff } from '../../integrations/gitea-client';

// ============================================================================
// T-203: ContractWatcher
// ============================================================================

describe('ContractWatcher', () => {
  it('should detect backend API changes', () => {
    const watcher = new ContractWatcher();
    watcher.setContract({ openapi: '3.0.0', paths: { '/api/users': {} } });

    const annotations: CodeAnnotation[] = [{
      file: 'src/routes/users.ts', startLine: 0, endLine: 10,
      source: 'modified', commitSha: 'abc', annotatedAt: Date.now(),
    }];

    const result = watcher.check(annotations);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].type).toBe('api_changed');
  });

  it('should skip generated files', () => {
    const watcher = new ContractWatcher();
    watcher.setContract({ openapi: '3.0.0', paths: {} });

    const annotations: CodeAnnotation[] = [{
      file: 'src/routes/users.ts', startLine: 0, endLine: 10,
      source: 'generated', commitSha: 'abc', annotatedAt: Date.now(),
    }];

    const result = watcher.check(annotations);
    expect(result.violations).toHaveLength(0);
  });
});

// ============================================================================
// T-204: CommitVerifier
// ============================================================================

describe('CommitVerifier', () => {
  const COMMIT: GiteaCommit = { sha: 'abc', message: 'test', author: { name: 'd', email: 'd@t' }, timestamp: '' };
  const DIFFS: GiteaDiff[] = [];
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `anfsf-cv-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    // Create a minimal valid project so compile check doesn't run on entire ANFSF
    fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name":"test"}');
  });

  afterEach(() => {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('should run contract and compile checks', async () => {
    const verifier = new CommitVerifier();
    const report = await verifier.verify('p1', COMMIT, DIFFS, tempDir);
    expect(report.steps.length).toBe(2);
    expect(report.steps[0].name).toBe('contract-check');
    expect(report.steps[1].name).toBe('compile-check');
  }, 15000);

  it('should set passed=false when a step fails', async () => {
    const verifier = new CommitVerifier();
    const report = await verifier.verify('p1', COMMIT, DIFFS, '/nonexistent/path');
    expect(report.steps[1].passed).toBe(false);
    expect(report.passed).toBe(false);
  }, 15000);
});

// ============================================================================
// T-205: FaultReporter
// ============================================================================

describe('FaultReporter', () => {
  it('should generate a fault report from failed verification', () => {
    const reporter = new FaultReporter();
    const report = reporter.generate({
      projectId: 'p1', commitSha: 'abc', passed: false,
      steps: [
        { name: 'contract-check', passed: true, durationMs: 10, errors: [] },
        { name: 'compile-check', passed: false, durationMs: 50, errors: [
          "src/index.ts:10:5 - error TS2304: Cannot find name 'foo'.",
        ]},
      ],
      timestamp: Date.now(),
    });

    expect(report.summary).toContain('1 step(s) failed');
    expect(report.failedSteps).toContain('compile-check');
    expect(report.locations.length).toBeGreaterThan(0);
    expect(report.locations[0].file).toBe('src/index.ts');
    expect(report.locations[0].line).toBe(10);
  });

  it('should extract file and line from TS errors', () => {
    const reporter = new FaultReporter();
    const report = reporter.generate({
      projectId: 'p1', commitSha: 'abc', passed: false,
      steps: [
        { name: 'compile-check', passed: false, durationMs: 10, errors: [
          "src/components/App.tsx:42:10 - error TS2322: Type 'string' is not assignable to type 'number'.",
        ]},
      ],
      timestamp: Date.now(),
    });

    expect(report.locations[0].file).toBe('src/components/App.tsx');
    expect(report.locations[0].line).toBe(42);
    expect(report.locations[0].suggestedAction).toContain('TypeScript');
  });
});

// ============================================================================
// T-206: TaskGenerator
// ============================================================================

describe('TaskGenerator', () => {
  it('should generate frontend and backend task packages', () => {
    const generator = new TaskGenerator();
    const pkg = generator.generate({
      files: [
        { path: 'src/pages/Home.tsx', content: '// TODO: implement\n// TODO: add state', source: 'generated' },
        { path: 'src/routes/api.ts', content: '// TODO: implement auth', source: 'generated' },
        { path: 'package.json', content: '{}', source: 'generated' },
      ],
    });

    expect(pkg.frontend.tasks.length).toBeGreaterThan(0);
    expect(pkg.backend.tasks.length).toBeGreaterThan(0);
    expect(pkg.frontend.summary.total).toBeGreaterThan(0);
  });

  it('should skip TASK.md from task list', () => {
    const generator = new TaskGenerator();
    const pkg = generator.generate({
      files: [
        { path: 'src/pages/Home.tsx', content: '', source: 'generated' },
        { path: 'TASK.md', content: '# Tasks', source: 'generated' },
      ],
    });

    const allTaskIds = [...pkg.frontend.tasks, ...pkg.backend.tasks].map(t => t.id);
    const hasTaskMd = pkg.frontend.tasks.some(t => t.files.includes('TASK.md'));
    expect(hasTaskMd).toBe(false);
  });

  it('should generate valid markdown', () => {
    const generator = new TaskGenerator();
    const pkg = generator.generate({
      files: [
        { path: 'src/pages/Home.tsx', content: '// TODO: x\n// TODO: y', source: 'generated' },
        { path: 'src/routes/api.ts', content: '', source: 'generated' },
      ],
    });

    const md = generator.toMarkdown(pkg);
    expect(md.frontend).toContain('# Frontend Development Tasks');
    expect(md.backend).toContain('# Backend Development Tasks');
    expect(md.frontend).toContain('P0');
  });

  it('should estimate hours based on TODO count', () => {
    const generator = new TaskGenerator();
    const pkg = generator.generate({
      files: [
        { path: 'src/pages/Complex.tsx', content: '// TODO: a\n// TODO: b\n// TODO: c\n// TODO: d\n// TODO: e', source: 'generated' },
        { path: 'src/pages/Simple.tsx', content: '', source: 'generated' },
      ],
    });

    const complex = pkg.frontend.tasks.find(t => t.files[0] === 'src/pages/Complex.tsx');
    const simple = pkg.frontend.tasks.find(t => t.files[0] === 'src/pages/Simple.tsx');
    expect(complex!.estimatedHours).toBeGreaterThan(simple!.estimatedHours);
  });
});
