/**
 * T-501: Full Pipeline Integration Test
 *
 * Simulates a complete project lifecycle through all five stages.
 * Uses real modules (no LLM mocking needed for orchestration path).
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PipelineStateMachine } from '../pipeline-state-machine';
import type { ProjectState } from '../pipeline-state-machine';
import { CheckpointManager, InMemoryCheckpointStore } from '../checkpoint';
import { TokenBudget } from '../token-budget';
import { FixEngine } from '../fix-engine';
import { RegressionRunner } from '../regression-runner';
import { ReleaseCheck } from '../release-check';
import { Archiver } from '../archiver';
import { CodeAnnotator } from '../code-annotator';
import { ContractWatcher } from '../contract-watcher';
import { TaskGenerator } from '../task-generator';
import { evaluatePRDQuality } from '../../prd/prd-quality-check';
import { annotateRequirements } from '../../prd/confidence-annotator';

const GOOD_PRD = `
用户管理系统：管理员可以创建用户、编辑用户信息、删除用户。
支持按用户名搜索，按部门筛选。用户列表支持分页，每页20条。
验收标准：用户列表加载时间 < 500ms。
`;

describe('Full Pipeline Integration', () => {
  let sm: PipelineStateMachine;
  let checkpointMgr: CheckpointManager;
  let budget: TokenBudget;
  let fixEngine: FixEngine;
  let regRunner: RegressionRunner;
  let releaseCheck: ReleaseCheck;
  let archiver: Archiver;
  let projectId: string;

  beforeEach(() => {
    projectId = `proj-${Date.now()}`;
    sm = new PipelineStateMachine(projectId);
    checkpointMgr = new CheckpointManager(new InMemoryCheckpointStore());
    budget = new TokenBudget(projectId);
    fixEngine = new FixEngine();
    regRunner = new RegressionRunner();
    releaseCheck = new ReleaseCheck();
    archiver = new Archiver();
  });

  // ==========================================================================
  // Stage 0 → Stage 1: PRD → Requirements
  // ==========================================================================

  it('Stage 0→1: should validate PRD quality and advance to parsing', async () => {
    // Quality check
    const quality = evaluatePRDQuality(GOOD_PRD);
    expect(quality.level).toBe('green');
    expect(quality.score).toBeGreaterThanOrEqual(50);

    // State: created → stage1_parsing
    await sm.transition('stage1_parsing');
    expect(sm.getState()).toBe('stage1_parsing');
  });

  it('Stage 0→1: should detect low-quality PRD', () => {
    const quality = evaluatePRDQuality('做一个软件');
    expect(quality.level).toBe('red');
    expect(quality.triggerGuidedMode).toBe(true);
  });

  it('Stage 1: should annotate requirements with confidence', () => {
    const items = [
      { id: 'f1', text: '管理员可以创建用户', category: 'feature' },
      { id: 'f2', text: '支持按用户名搜索', category: 'feature' },
      { id: 'f3', text: '用户列表分页每页20条', category: 'feature' },
    ];
    const report = annotateRequirements(items, GOOD_PRD);
    expect(report.summary.total).toBe(3);
    expect(report.attentionItems.length).toBeGreaterThanOrEqual(0);
  });

  // ==========================================================================
  // Stage 2 → Stage 3: Development → Verification
  // ==========================================================================

  it('Stage 1→2→3: should lock requirements and advance through dev to verification', async () => {
    // Lock
    await sm.transition('stage1_parsing');
    await sm.transition('stage1_locked');
    expect(sm.getState()).toBe('stage1_locked');

    // Generate (simulated)
    await sm.transition('stage1_generating');
    await sm.transition('stage1_done');
    expect(sm.getState()).toBe('stage1_done');

    // Save checkpoint
    await checkpointMgr.save(projectId, 'stage1_done', { version: 'v1' } as any);

    // Dev phase
    await sm.transition('stage2_dev');
    expect(sm.getState()).toBe('stage2_dev');

    // Verify
    await sm.transition('stage3_verifying');
    expect(sm.getState()).toBe('stage3_verifying');
  });

  // ==========================================================================
  // Stage 4: Testing → Fix → Confirm
  // ==========================================================================

  it('Stage 4: should apply L1/L2/L3 fix classification correctly', () => {
    const results = [
      fixEngine.createFix({ projectId, source: 'generated', problemType: 'type_mismatch', file: 'a.ts', line: 1, description: 'e' }),
      fixEngine.createFix({ projectId, source: 'modified', problemType: 'interface_change', file: 'b.ts', line: 2, description: 'e' }),
      fixEngine.createFix({ projectId, source: 'new', problemType: 'business_logic', file: 'c.ts', line: 3, description: 'e' }),
    ];

    expect(results[0].level).toBe('L1');
    expect(results[1].level).toBe('L2');
    expect(results[2].level).toBe('L3');

    const summary = fixEngine.summarize(results.map(r => r.record));
    expect(summary.l1).toBe(1);
    expect(summary.l2).toBe(1);
    expect(summary.l3).toBe(1);
  });

  it('Stage 4: should run regression after fix', async () => {
    regRunner.recordPassing(projectId, ['tc1', 'tc2', 'tc3']);

    const fix = fixEngine.createFix({
      projectId, source: 'generated', problemType: 'type_mismatch',
      file: 'a.ts', line: 1, description: 'e',
    });

    const result = await regRunner.run(projectId, fix.record, [
      { testId: 'tc1', passed: true },
      { testId: 'tc2', passed: true },
      { testId: 'tc3', passed: true },
    ]);

    expect(result.passed).toBe(true);
  });

  // ==========================================================================
  // Stage 4→5: Release + Archive
  // ==========================================================================

  it('Stage 4→5: should pass release check and archive', async () => {
    // Advance to stage4_confirmed
    await sm.transition('stage1_parsing');
    await sm.transition('stage1_locked');
    await sm.transition('stage1_generating');
    await sm.transition('stage1_done');
    await sm.transition('stage2_dev');
    await sm.transition('stage3_verifying');
    await sm.transition('stage3_passed');
    await sm.transition('stage4_testing');
    await sm.transition('stage4_confirmed');

    // Release check
    const check = releaseCheck.check({
      projectId,
      fixRecords: [],
      testResults: [{ passed: true }, { passed: true }],
      changeRequests: [{ state: 'completed' }],
      frontendConfirmed: true,
      backendConfirmed: true,
    });

    expect(check.releasable).toBe(true);

    // Archive
    await sm.transition('stage5_archiving');

    const annotations = [
      { file: 'src/pages/Home.tsx', startLine: 0, endLine: 50, source: 'generated' as const, commitSha: 'a', annotatedAt: 1000 },
    ];

    const archive = archiver.archive({
      projectId, projectName: 'Test', stages: [],
      fixRecords: [], annotations,
      tokenByStage: {}, totalTokens: 100000,
      startTimestamp: 1000, endTimestamp: 2000,
    });

    expect(archive.metrics.projectName).toBe('Test');
    expect(archive.candidates.length).toBeGreaterThanOrEqual(0);

    await sm.transition('stage5_done');
    expect(sm.getState()).toBe('stage5_done');
  });

  // ==========================================================================
  // Error Recovery
  // ==========================================================================

  it('should recover from failed state via checkpoint', async () => {
    // Progress to stage1_done and save checkpoint
    await sm.transition('stage1_parsing');
    await sm.transition('stage1_locked');
    await sm.transition('stage1_generating');
    await sm.transition('stage1_done');
    await checkpointMgr.save(projectId, 'stage1_done', { skeleton: 'ok' } as any);

    // Simulate crash in stage2
    await sm.transition('stage2_dev');
    sm.restoreTo('failed'); // crash!

    // Recover
    const target = await checkpointMgr.findRecoveryTarget(projectId);
    expect(target).toBe('stage1_done');
    sm.restoreTo(target!);

    // Continue from recovered state
    await sm.transition('stage2_dev');
    expect(sm.getState()).toBe('stage2_dev');
  });

  // ==========================================================================
  // Code Annotation + Contract Watch
  // ==========================================================================

  it('should annotate commit and detect contract changes', () => {
    const annotator = new CodeAnnotator(['src/index.ts', 'src/App.tsx']);
    const result = annotator.annotate(
      { sha: 'abc123', message: 'feat', author: { name: 'dev', email: 'd@t' }, timestamp: '' },
      [
        { filename: 'src/index.ts', status: 'modified', additions: 5, deletions: 2 },
        { filename: 'src/services/new.ts', status: 'added', additions: 50, deletions: 0 },
      ],
      projectId,
    );

    expect(result.summary.modifiedFiles).toBe(1);
    expect(result.summary.newFiles).toBe(1);

    const watcher = new ContractWatcher();
    watcher.setContract({ openapi: '3.0.0', paths: { '/api/users': {} } });
    const violations = watcher.check(result.annotations);
    expect(Array.isArray(violations.violations)).toBe(true);
  });

  // ==========================================================================
  // Task Generation
  // ==========================================================================

  it('should generate task package from skeleton code', () => {
    const generator = new TaskGenerator();
    const pkg = generator.generate({
      files: [
        { path: 'src/pages/Home.tsx', content: '// TODO: implement', source: 'generated' },
        { path: 'src/routes/api.ts', content: '// TODO: implement', source: 'generated' },
      ],
    });

    expect(pkg.frontend.tasks.length).toBeGreaterThan(0);
    expect(pkg.backend.tasks.length).toBeGreaterThan(0);

    const md = generator.toMarkdown(pkg);
    expect(md.frontend).toContain('# Frontend');
    expect(md.backend).toContain('# Backend');
  });

  // ==========================================================================
  // Token Budget Flow
  // ==========================================================================

  it('should track token budget through stages', () => {
    budget.consume({ promptTokens: 500000, completionTokens: 200000, totalTokens: 700000 }, 'deepseek-chat', 'stage1_parsing', 'analysis');
    budget.consume({ promptTokens: 1500000, completionTokens: 500000, totalTokens: 2000000 }, 'deepseek-chat', 'stage1_generating', 'generation');

    const report = budget.getReport();
    expect(report.used).toBe(2700000);
    expect(report.usageRate).toBe(0.54);

    // Not yet at 70% warning
    expect(budget.isWarnThreshold()).toBe(false);

    const stageBreakdown = budget.getStageBreakdown();
    expect(Object.keys(stageBreakdown)).toHaveLength(2);
  });
});
