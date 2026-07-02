# ANFSF Agent Loop 开发文档 — Phase 8: 上下文压缩 + 技能注册

> **日期**: 2026-06-29 | **状态**: 📋 待 CODEX 执行
> **执行方**: CODEX
> **前置**: Phase 3 (工具调用循环)
> **预估**: 3 天

---

## 1. 目标

1. **上下文压缩**: 将 `ContextCompressorSkill` 接入长 prompt 路径, 防止 token 线性膨胀
2. **技能注册**: 填充 `skills-registration.ts` 的无操作函数体, 将 5 个融合技能加载到运行时
3. **SkillsRegistry**: 在服务器启动时自动加载 18 个 Skill

**当前状态**:
- `ContextCompressorSkill` — 完整实现, 未接入
- `skills-registration.ts` — `registerFusionSkillsToHarnesses()` 函数体为空
- `SkillsRegistry` — 完整实现 (569行), 但服务器启动时从未调用
- 18 个 Skill 文件存在但零运行时加载

---

## 2. 实现清单

### 2.1 修改文件

| 文件 | 改动说明 |
|------|---------|
| `src/harness/skills-registration.ts` | 填充 `registerFusionSkillsToHarnesses()` 函数体 |
| `src/server/index.ts` | 启动时初始化 SkillsRegistry + 调用注册函数 |
| `src/agents/code-generation-loop.ts` | `buildSkeletonPrompt()` 集成上下文压缩 |
| `src/skills/index.ts` | 验证 `registerAllFusionSkills()` 完整性 |
| `src/skills/skills-registry.ts` | 确保 `load()` 路径正确 |

---

## 3. 详细设计

### 3.1 SkillsRegistration 填充 (`src/harness/skills-registration.ts`)

**当前** (no-op):
```typescript
export function registerFusionSkillsToHarnesses(registry: SkillsRegistry): void {
  // TODO: Register all fusion skills
}
```

**Phase 8 填充后**:
```typescript
import { SkillsRegistry } from '../skills/skills-registry';
import { registerAllFusionSkills } from '../skills';
import { registerContextCompressorSkill } from '../skills/context-compressor-skill';
import { registerMemoryConsolidationSkill } from '../skills/memory-consolidation-skill';
import { registerHybridRetrieverSkill } from '../skills/hybrid-retriever-skill';
import { registerCitationTracerSkill } from '../skills/citation-tracer-skill';
import { registerHallucinationGuardSkill } from '../skills/hallucination-guard-skill';

export function registerFusionSkillsToHarnesses(registry: SkillsRegistry): void {
  console.log('[SkillsRegistration] Registering fusion skills...');

  registerContextCompressorSkill(registry);
  registerMemoryConsolidationSkill(registry);
  registerHybridRetrieverSkill(registry);
  registerCitationTracerSkill(registry);
  registerHallucinationGuardSkill(registry);

  // Register all remaining skills from src/skills/index.ts
  registerAllFusionSkills(registry);

  const skillNames = registry.listSkills().map(s => s.name);
  console.log(`[SkillsRegistration] Registered ${skillNames.length} skills: ${skillNames.join(', ')}`);
}
```

### 3.2 server/index.ts 启动集成

```typescript
import { SkillsRegistry } from '../skills/skills-registry';
import { registerFusionSkillsToHarnesses } from '../harness/skills-registration';

// In server startup (before route registration):
const skillsRegistry = new SkillsRegistry({
  skillPaths: [path.resolve(__dirname, '../../src/skills')],
  hotReload: process.env.NODE_ENV !== 'production',
  sandboxConfig: {
    maxMemoryMB: 256,
    maxExecutionTimeMs: 30000,
    enableConsoleCapture: true,
  },
});

// Register fusion skills (5 core skills)
registerFusionSkillsToHarnesses(skillsRegistry);

// Load all .ts skill files from disk
const loadResult = await skillsRegistry.loadAll();
console.log(`[Server] Skills loaded: ${loadResult.loaded} succeeded, ${loadResult.failed} failed`);
if (loadResult.errors.length > 0) {
  console.warn('[Server] Skill load errors:', loadResult.errors);
}

// Make skillsRegistry available to routes
serverConfig.skillsRegistry = skillsRegistry;
```

### 3.3 上下文压缩集成

**触发条件**: prompt 超过 8000 字符时自动压缩 PRD 上下文:

```typescript
// src/agents/code-generation-loop.ts: buildSkeletonPrompt()

function buildSkeletonPrompt(
  spec: RequirementSpec,
  historyInjection?: string,
  compressedContext?: string,  // NEW
): LLMMessage[] {
  // ... existing prompt building ...

  // If compressed context is available, use it instead of raw PRD text
  const contextText = compressedContext ?? spec.context?.prdText ?? '';

  return [
    {
      role: "system",
      content: "You are a project skeleton generator..." +
        (historyInjection || "") +
        (contextText ? `\n\nPROJECT CONTEXT:\n${contextText}` : "") +
        "\nRules: ...",
    },
    { role: "user", content: `Project: ${spec.intent}\n\n...` },
  ];
}

// In generate(), before buildSkeletonPrompt():
async generate(spec): Promise<GeneratedCode> {
  let compressedContext: string | undefined;

  const rawPromptLength = JSON.stringify(spec).length;
  if (rawPromptLength > 8000) {
    // Context is large — try to compress
    const compressor = this.skillsRegistry?.get('context-compressor');
    if (compressor) {
      try {
        const compressed = await compressor.execute({
          text: spec.context?.prdText || spec.intent,
          maxTokens: 4000,
          mode: 'fast',
        });
        compressedContext = compressed.output;
      } catch (e) {
        // Compression failed — fall back to raw PRD text
        console.warn('[AgentLoop] Context compression failed, using raw PRD:', e);
      }
    }
  }

  const messages = buildSkeletonPrompt(spec, historyInjection, compressedContext);
  // ...
}
```

### 3.4 SkillsRegistry 加载路径验证

```typescript
// src/skills/skills-registry.ts

// 确保 load() 方法:
// 1. 递归扫描 skillPaths 目录
// 2. 读取 .ts 文件并解析 exports
// 3. 检查循环依赖 (DFS — 已实现)
// 4. 拓扑排序并加载

async loadAll(): Promise<{ loaded: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let loaded = 0;
  let failed = 0;

  // Walk skillPaths
  for (const skillDir of this.config.skillPaths) {
    const files = this.scanSkillFiles(skillDir);  // *.ts files
    for (const file of files) {
      try {
        const skill = await this.loadSkillFile(file);
        if (skill) {
          this.register(skill);
          loaded++;
        }
      } catch (e) {
        errors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`);
        failed++;
      }
    }
  }

  // Check dependencies (DFS cycle detection — already implemented)
  const depErrors = this.validateDependencies();
  errors.push(...depErrors);

  // Topological sort and enable skills in order
  if (depErrors.length === 0) {
    const order = this.topologicalSort();
    for (const name of order) {
      this.enable(name);
    }
  }

  return { loaded, failed, errors };
}
```

---

## 4. 已注册的 5 个融合技能

| # | 技能 | 功能 | Phase 使用 |
|---|------|------|-----------|
| 1 | `context-compressor` | 长文本摘要, 上下文窗口管理 | Phase 8 (本Phase) |
| 2 | `memory-consolidation` | 工作记忆→情景记忆→语义记忆 | Phase 9 (Evolution) |
| 3 | `hybrid-retriever` | 向量+关键词混合检索 | Phase 8 (RAG) |
| 4 | `citation-tracer` | 生成内容→源代码追溯 | Phase 8 (可解释性) |
| 5 | `hallucination-guard` | 幻觉检测 (已用于Phase 1验证) | Phase 1 ✅ |

---

## 5. 技能加载架构

```
Server startup
  ├── SkillsRegistry.loadAll()
  │   ├── 扫描 src/skills/*.ts (18 files)
  │   ├── 解析每个文件的 exports
  │   ├── DFS 循环依赖检测
  │   ├── 拓扑排序
  │   └── 按序加载 + enable
  │
  ├── registerFusionSkillsToHarnesses(registry)
  │   ├── registerContextCompressorSkill()
  │   ├── registerMemoryConsolidationSkill()
  │   ├── registerHybridRetrieverSkill()
  │   ├── registerCitationTracerSkill()
  │   └── registerHallucinationGuardSkill()
  │
  └── serverConfig.skillsRegistry = registry
      → 所有 Routes 可访问
      → Agent Loops 可查询 'context-compressor'
```

---

## 6. 测试

### 6.1 现有测试 (确认通过)
- `src/skills/__tests__/` — 14 个技能测试文件

### 6.2 新增测试

| 测试 | 文件 |
|------|------|
| SkillsRegistry.loadAll() | `skills-registry.test.ts` (已存在, 确认通过) |
| registerFusionSkillsToHarnesses() | `skills-registration.test.ts` (新建) |
| CodeGenerationLoop context compression | `code-generation-loop.test.ts` (修改) |
| SkillsRegistry in server startup | `server/index.test.ts` (修改) |

---

## 7. 验证清单

```bash
npx tsc --noEmit
npx jest --testPathPattern="skills-registry|context-compressor|skills-registration|code-generation-loop" --forceExit
npm test

# 手动验证:
# 1. 启动服务器 → 检查日志 "Skills loaded: 18 succeeded, 0 failed"
# 2. 提交大 PRD (>8000 chars) → 验证上下文压缩触发
# 3. 检查技能列表: GET /api/v1/skills → 返回 18 skills
```
