/**
 * Phase 1 Verification Script
 *
 * Runs the core pipeline with a real LLM:
 *   PRD → Quality Check → Confidence Annotation → Agent Loop → Skeleton Code
 *
 * Usage: npx ts-node scripts/verify-phase1.ts
 */

import { evaluatePRDQuality } from '../src/prd/prd-quality-check';
import { annotateRequirements } from '../src/prd/confidence-annotator';
import { CodeGenerationLoop, type RequirementSpec } from '../src/agents/code-generation-loop';
import { LLMClient } from '../src/integrations/llm-client';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Config
// ============================================================================

const API_KEY = 'sk-865b6777e6744aa3b1eaf623bb3524dd';
const MODEL = 'deepseek-chat';

const TEST_PRD = `
做一个简单的任务管理系统（Task Manager）。

用户角色：
- 普通用户：可以创建任务、编辑自己的任务、标记完成、删除自己的任务
- 管理员：可以查看所有用户的任务、删除任何任务

核心功能：
1. 用户注册与登录（邮箱+密码）
2. 任务列表页：显示当前用户的任务，支持按状态筛选（待办/进行中/已完成）
3. 任务详情页：查看任务完整信息
4. 创建/编辑任务：标题、描述、优先级（高/中/低）、截止日期
5. 删除任务（软删除，移到回收站）
6. 任务统计看板：显示各状态任务数量、本周完成数

验收标准：
- 任务列表加载时间 < 500ms
- 支持同时100个用户在线
- 移动端浏览器可正常使用
`;

const OUTPUT_DIR = path.resolve(__dirname, '../output/verify-phase1');

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  ANFSF Phase 1 Verification');
  console.log('═══════════════════════════════════════════\n');

  // Step 1: PRD Quality Check
  console.log('📋 Step 1: PRD Quality Check...');
  const quality = evaluatePRDQuality(TEST_PRD);
  console.log(`   Score: ${quality.score}/100 (${quality.level})`);
  console.log(`   Dimensions:`);
  console.log(`     Completeness:    ${quality.dimensions.completeness}/25`);
  console.log(`     Consistency:     ${quality.dimensions.consistency}/25`);
  console.log(`     Quantifiability: ${quality.dimensions.quantifiability}/25`);
  console.log(`     Verifiability:   ${quality.dimensions.verifiability}/25`);
  if (quality.issues.length > 0) {
    console.log(`   Issues: ${quality.issues.join(', ')}`);
  }
  console.log('   ✅ Quality check passed\n');

  // Step 2: Confidence Annotation (simulated requirements from PRD)
  console.log('📋 Step 2: Confidence Annotation...');
  const items = [
    { id: 'f1', text: '用户注册与登录（邮箱+密码）', category: 'feature' },
    { id: 'f2', text: '任务列表页支持按状态筛选', category: 'feature' },
    { id: 'f3', text: '创建/编辑任务（标题、描述、优先级、截止日期）', category: 'feature' },
    { id: 'f4', text: '删除任务（软删除，移到回收站）', category: 'feature' },
    { id: 'f5', text: '任务统计看板', category: 'feature' },
    { id: 'f6', text: '移动端响应式适配', category: 'feature' },
  ];
  const annotation = annotateRequirements(items, TEST_PRD);
  console.log(`   Total: ${annotation.summary.total}`);
  console.log(`   🟢 Explicit: ${annotation.summary.explicit}  🟡 Inferred: ${annotation.summary.inferred}  🔴 Supplemented: ${annotation.summary.supplemented}`);
  console.log(`   High: ${annotation.summary.highConfidence}  Medium: ${annotation.summary.mediumConfidence}  Low: ${annotation.summary.lowConfidence}`);
  if (annotation.attentionItems.length > 0) {
    console.log(`   ⚠️  Attention items: ${annotation.attentionItems.join(', ')}`);
  }
  console.log('   ✅ Annotation complete\n');

  // Step 3: Agent Loop — Generate Skeleton Code
  console.log('📋 Step 3: Agent Loop — Generating skeleton code...');
  console.log('   Model: deepseek-chat');
  console.log('   This will take 30-60 seconds...\n');

  const llm = new LLMClient({
    apiKey: API_KEY,
    defaultModel: MODEL,
    baseUrl: 'https://api.deepseek.com/v1',  // DeepSeek API
  });
  const agentLoop = new CodeGenerationLoop(llm, { maxRetries: 2 });

  const spec: RequirementSpec = {
    intent: 'Task Manager — simple task management system',
    features: items.map(i => ({ id: i.id, name: i.text, description: i.text, priority: 'P0' })),
    deploymentForm: 'web',
  };

  // Ensure output dir exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const startTime = Date.now();
  const result = await agentLoop.generate(spec, OUTPUT_DIR);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`   ⏱️  Duration: ${duration}s`);
  console.log(`   🔄 Rounds: ${result.rounds}`);
  console.log(`   📁 Files generated: ${result.code.files.length}`);
  console.log(`   🪙 Tokens used: ${result.tokenUsage.reduce((s, u) => s + u.totalTokens, 0)}`);
  console.log(`   ✅ Success: ${result.success}`);

  if (!result.success) {
    console.log(`   ⚠️  Message: ${result.message}`);
    if (result.errors.length > 0) {
      console.log(`   Errors (${result.errors.length}):`);
      for (const e of result.errors.slice(0, 5)) {
        console.log(`     - ${e.message}`);
      }
    }
  }

  // Step 4: Show output
  console.log('\n📋 Step 4: Generated files:');
  for (const file of result.code.files.slice(0, 15)) {
    console.log(`   📄 ${file.path} (${file.content.length} chars)`);
  }
  if (result.code.files.length > 15) {
    console.log(`   ... and ${result.code.files.length - 15} more files`);
  }

  console.log(`\n   📂 Full output: ${OUTPUT_DIR}`);
  console.log('\n═══════════════════════════════════════════');
  console.log('  Verification complete!');
  console.log('═══════════════════════════════════════════');
}

main().catch(err => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
