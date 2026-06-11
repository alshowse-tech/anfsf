/**
 * Full Integration Verification
 * Tests Phase 1 modules wired together (bypasses HTTP for reliable testing)
 */

import { PipelineStateMachine } from '../src/pipeline/pipeline-state-machine';
import { CheckpointManager, InMemoryCheckpointStore } from '../src/pipeline/checkpoint';
import { TokenBudget } from '../src/pipeline/token-budget';
import { FixEngine } from '../src/pipeline/fix-engine';
import { RegressionRunner } from '../src/pipeline/regression-runner';
import { ReleaseCheck } from '../src/pipeline/release-check';
import { Archiver } from '../src/pipeline/archiver';
import { CodeAnnotator } from '../src/pipeline/code-annotator';
import { ContractWatcher } from '../src/pipeline/contract-watcher';
import { TaskGenerator } from '../src/pipeline/task-generator';
import { RoleManager } from '../src/server/auth/roles';
import { evaluatePRDQuality } from '../src/prd/prd-quality-check';
import { annotateRequirements } from '../src/prd/confidence-annotator';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function check(name: string, fn: () => boolean | Promise<boolean>) {
  Promise.resolve(fn()).then(ok => {
    if (ok) { passed++; console.log(`  ${GREEN}✓${RESET} ${name}`); }
    else { failed++; console.log(`  ${RED}✗${RESET} ${name}`); }
  }).catch(err => {
    failed++; console.log(`  ${RED}✗${RESET} ${name} — ${err.message}`);
  });
}

async function main() {
  console.log('\n═══════════════════════════════════════');
  console.log('  ANFSF Integration Verification');
  console.log('═══════════════════════════════════════\n');

  const pid = 'verify-' + Date.now();

  // 1. State Machine
  console.log('📋 Pipeline State Machine');
  const sm = new PipelineStateMachine(pid);
  check('starts at created', () => sm.getState() === 'created');
  check('transitions created→stage1_parsing', async () => { await sm.transition('stage1_parsing'); return sm.getState() === 'stage1_parsing'; });
  check('transitions through full happy path', async () => {
    const sm2 = new PipelineStateMachine(pid + '-2');
    const path = ['stage1_parsing','stage1_locked','stage1_generating','stage1_done','stage2_dev','stage3_verifying','stage3_passed','stage4_testing','stage4_confirmed','stage5_archiving','stage5_done'] as const;
    for (const s of path) await sm2.transition(s);
    return sm2.getState() === 'stage5_done';
  });
  check('error recovery', async () => {
    const sm3 = new PipelineStateMachine(pid + '-3');
    await sm3.transition('stage1_parsing');
    await sm3.transition('stage1_locked');
    sm3.restoreTo('failed');
    sm3.restoreTo('stage1_done');
    await sm3.transition('stage2_dev');
    return sm3.getState() === 'stage2_dev';
  });

  await new Promise(r => setTimeout(r, 100));

  // 2. Checkpoint
  console.log('📋 Checkpoint Manager');
  const cpStore = new InMemoryCheckpointStore();
  const cpm = new CheckpointManager(cpStore);
  check('saves checkpoint', async () => { const cp = await cpm.save(pid, 'stage1_done', {}); return cp.stage === 'stage1_done'; });
  check('loads checkpoint', async () => { const cp = await cpm.load(pid); return cp?.stage === 'stage1_done'; });
  check('finds recovery target', async () => { const t = await cpm.findRecoveryTarget(pid); return t === 'stage1_done'; });

  await new Promise(r => setTimeout(r, 100));

  // 3. Token Budget
  console.log('📋 Token Budget');
  const budget = new TokenBudget(pid);
  check('tracks consumption', () => { budget.consume({ promptTokens: 100, completionTokens: 50, totalTokens: 150 }, 'deepseek-chat', 'stage1_parsing', 'analysis'); return budget.remaining() < 5_000_000; });
  check('warns at 70%', () => {
    const b = new TokenBudget(pid + '-b');
    b.consume({ promptTokens: 4_000_000, completionTokens: 0, totalTokens: 4_000_000 }, 'd', 's1', 'gen');
    return b.isWarnThreshold();
  });

  await new Promise(r => setTimeout(r, 100));

  // 4. PRD Quality
  console.log('📋 PRD Quality Check');
  const goodPRD = '用户管理系统：管理员可以创建用户、编辑用户信息。支持搜索和分页。验收标准：加载时间<500ms。';
  const badPRD = '做个软件';
  check('scores good PRD ≥ 70', () => evaluatePRDQuality(goodPRD).score >= 70);
  check('flags bad PRD as red', () => evaluatePRDQuality(badPRD).level === 'red');
  check('triggers guided mode for bad PRD', () => evaluatePRDQuality(badPRD).triggerGuidedMode === true);

  await new Promise(r => setTimeout(r, 100));

  // 5. Confidence Annotation
  console.log('📋 Confidence Annotation');
  const items = [{ id: 'f1', text: '管理员可以创建用户', category: 'feature' }, { id: 'f2', text: '第三方支付集成', category: 'feature' }];
  const report = annotateRequirements(items, goodPRD);
  check('annotates explicit matches', () => report.items[0].annotation.source === 'explicit');
  check('identifies supplemented items', () => report.attentionItems.length > 0);

  await new Promise(r => setTimeout(r, 100));

  // 6. Fix Engine
  console.log('📋 Fix Engine');
  const fixer = new FixEngine();
  check('L1 for generated + type_mismatch', () => fixer.classify('generated', 'type_mismatch') === 'L1');
  check('L2 for modified + type_mismatch', () => fixer.classify('modified', 'type_mismatch') === 'L2');
  check('L3 for new + business_logic', () => fixer.classify('new', 'business_logic') === 'L3');
  const fix = fixer.createFix({ projectId: pid, source: 'generated', problemType: 'type_mismatch', file: 'a.ts', line: 1, description: 'e' });
  check('auto-applies L1 fix', () => fix.record.fixStatus === 'auto_fixed');

  await new Promise(r => setTimeout(r, 100));

  // 7. Regression Runner
  console.log('📋 Regression Runner');
  const rr = new RegressionRunner();
  rr.recordPassing(pid, ['tc1', 'tc2']);
  check('passes regression', async () => {
    const r = await rr.run(pid, fix.record, [{ testId: 'tc1', passed: true }, { testId: 'tc2', passed: true }]);
    return r.passed;
  });
  check('detects regression', async () => {
    const r = await rr.run(pid, fix.record, [{ testId: 'tc1', passed: true }, { testId: 'tc2', passed: false }]);
    return !r.passed && r.newFailures.includes('tc2');
  });

  await new Promise(r => setTimeout(r, 100));

  // 8. Release Check
  console.log('📋 Release Check');
  const rc = new ReleaseCheck();
  const relResult = rc.check({ projectId: pid, fixRecords: [], testResults: [{ passed: true }], changeRequests: [], frontendConfirmed: true, backendConfirmed: true });
  check('passes release check', () => relResult.releasable === true);
  check('blocks on test failure', () => {
    const r2 = rc.check({ projectId: pid, fixRecords: [], testResults: [{ passed: false }], changeRequests: [], frontendConfirmed: false, backendConfirmed: false });
    return r2.releasable === false;
  });

  await new Promise(r => setTimeout(r, 100));

  // 9. Archiver
  console.log('📋 Archiver');
  const ar = new Archiver();
  const archive = ar.archive({ projectId: pid, projectName: 'Test', stages: [], fixRecords: [], annotations: [{ file: 'src/pages/Home.tsx', startLine: 0, endLine: 50, source: 'generated', commitSha: 'a', annotatedAt: 1000 }], tokenByStage: {}, totalTokens: 1000, startTimestamp: 1000, endTimestamp: 2000 });
  check('generates metrics', () => archive.metrics.projectName === 'Test');
  check('identifies stable candidates', () => archive.candidates.length > 0);

  await new Promise(r => setTimeout(r, 100));

  // 10. Code Annotator + Contract Watcher + Task Generator
  console.log('📋 Pipeline Modules');
  const annotator = new CodeAnnotator(['src/index.ts', 'src/App.tsx']);
  const result = annotator.annotate({ sha: 'abc', message: 't', author: { name: 'd', email: 'd@t' }, timestamp: '' }, [{ filename: 'src/index.ts', status: 'modified', additions: 5, deletions: 2 }, { filename: 'src/new.ts', status: 'added', additions: 20, deletions: 0 }], pid);
  check('annotates modified file', () => result.summary.modifiedFiles === 1);
  check('annotates new file', () => result.summary.newFiles === 1);

  const watcher = new ContractWatcher();
  watcher.setContract({ openapi: '3.0.0', paths: { '/api/users': {} } });
  check('detects API changes', () => {
    const apiAnnotator = new CodeAnnotator(['src/routes/users.ts']);
    const apiResult = apiAnnotator.annotate({ sha: 'def', message: 'api', author: { name: 'd', email: 'd@t' }, timestamp: '' }, [{ filename: 'src/routes/users.ts', status: 'modified', additions: 10, deletions: 5 }], pid);
    return watcher.check(apiResult.annotations).violations.length > 0;
  });

  const gen = new TaskGenerator();
  const pkg = gen.generate({ files: [{ path: 'src/pages/Home.tsx', content: '// TODO', source: 'generated' }, { path: 'src/routes/api.ts', content: '// TODO', source: 'generated' }] });
  check('generates FE tasks', () => pkg.frontend.tasks.length > 0);
  check('generates BE tasks', () => pkg.backend.tasks.length > 0);

  await new Promise(r => setTimeout(r, 100));

  // 11. Role Manager
  console.log('📋 Role Manager');
  const rm = new RoleManager();
  rm.addMember({ userId: 'u1', projectId: pid, role: 'pm', isLead: true, joinedAt: Date.now() });
  check('grants pm permissions', () => rm.can('u1', pid, 'canRelease') === true);
  check('denies frontend permissions to pm', () => rm.can('u1', pid, 'canEditFrontend') === false);
  check('transfers role', () => { rm.transferRole(pid, 'u1', 'u2'); return rm.can('u1', pid, 'canRelease') === false && rm.can('u2', pid, 'canRelease') === true; });

  await new Promise(r => setTimeout(r, 200));

  // Results
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  ${GREEN}Passed: ${passed}${RESET}  ${failed > 0 ? RED + 'Failed: ' + failed + RESET : ''}`);
  console.log(`═══════════════════════════════════════\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
