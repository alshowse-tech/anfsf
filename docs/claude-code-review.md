# ANFSF Code Review Report

> **日期**: 2026-06-12
> **审查人**: 架构师 (Claude)
> **分支**: master

---

## 最新审查: Phase 3 (2026-06-12 19:00-20:00)

Phase 3 分三批交付，共新增 6 个模块，发现 1 个遗留问题（编码复发）。

### 新增模块

| 模块 | 路径 | 测试 | 评价 |
|------|------|------|------|
| TestGenLoop | `src/agents/test-gen-loop.ts` | 3/3 | 第三 AgentLoop 变体，生成 Playwright/Jest/Vitest 测试；TypeScript 语法验证链路完整 |
| EvolutionRunner | `src/pipeline/evolution-runner.ts` | 2/2 | stage5_evolving 轻量级入口；v2 新增 `runProjectEvolution()` + ComponentMiner 集成 |
| ComponentMiner | `src/pipeline/component-miner.ts` | 5/5 | 进化一核心 — 正则解析 React 组件名/Props/hooks/依赖；去重合并同名校验 |
| CodeGenLoop 更新 | `src/agents/code-generation-loop.ts` | — | `generate()` 同时注入 CompileLearningDB + ComponentMiner (进化一+进化二联合) |
| Checkpoint 优化 | `src/pipeline/checkpoint.ts` | — | `loadCheckpoint()` 增加 timestamp 排序 + 同时间戳时按插入顺序 |
| INDEX.md | `docs/INDEX.md` | — | 文档路径更新 |

### 发现 + 已修复

| # | 严重度 | 文件 | 问题 | 修复方式 |
|---|--------|------|------|----------|
| 1 | MEDIUM | `code-generation-loop.ts` | BOM 引入 + 编码损坏（CODEX 第 N 次复发） | 架构师修复 |
| 2 | MEDIUM | `checkpoint.ts` | BOM 引入 + 编码损坏 | 架构师修复 |
| 3 | LOW | `code-generation-loop.ts:130-134` | ComponentMiner 单例调用开销（每次 generate 都取实例但 getComponentMiner 是 O(1) 缓存） | 可接受，单例模式 |

### 验证结果

- `tsc --noEmit`: **0 错误**
- Pipeline 测试: **161/162 passed**
- 1 个预存失败: `product-pipeline.test.ts > handles LLM API failure during PRD parsing` (mock 不匹配，与本次无关)

### 给 CODEX 的追加说明

**ComponentMiner + CompileLearningDB 注入点**:
- `CodeGenLoop.generate()` 现在同时调用 `getCompileLearningDB().getPromptInjection()` 和 `getComponentMiner().getPromptInjection()`
- 两个注入通过 `extraContext = [history, componentInfo].filter(Boolean).join("\n")` 合并后传入 `buildSkeletonPrompt()`
- **不要**在同一个 `generate()` 中重复调 LLM 来获取这些数据 — 它们都是从本地持久化 DB 读取的

**EvolutionRunner 两个入口**:
- `runEvolution(projectId)`: 只做 CompileLearningDB.flush + prune
- `runProjectEvolution(projectId, projectPath, projectType, modifiedFiles)`: 额外扫描 ComponentMiner
- RecoveryEngine 的 `onEnter('stage5_evolving')` 目前只调 `runEvolution` — Phase 4 需要改为 `runProjectEvolution`

---

## 历史审查汇总

### Phase 2 收尾 (2026-06-12 17:00)

| # | 严重度 | 文件 | 问题 |
|---|--------|------|------|
| 1 | CRITICAL | `fix-executor.ts:259` | `computePatch()` diff header 用 `tmp` 代替实际文件路径 |
| 2 | MEDIUM | `fix-executor.ts:174` | L1 写入前未检查 LLM 返回内容行数 |
| 3 | MEDIUM | `fix-executor.ts:186` | 未验证就记录 `outcome: "fixed"` |
| 4 | LOW | `recovery-engine.ts:9` | `allStates` 硬编码重复 |

### AgentLoop + CompileLearningDB (2026-06-12 15:00)

| # | 严重度 | 文件 | 问题 |
|---|--------|------|------|
| 1 | CRITICAL | `agent-loop-base.ts:61` | `tokenUsage` 从未填充 |
| 2 | CRITICAL | `code-generation-loop.ts:197` | `null.code.files` NPE |
| 3 | MEDIUM | `code-generation-loop.ts:229` | JSON markdown fence 未剥离 |

### GAP-01/GAP-02 骨架 (2026-06-12 12:00)

| # | 严重度 | 文件 | 问题 |
|---|--------|------|------|
| 1 | CRITICAL | `skeleton-generator.ts:37` | `AgentLoopResult['code']` 不存在 |
| 2 | HIGH | `pipeline-state-machine.test.ts` | `ALL_STATES` 缺 4 状态 |
| 3 | MEDIUM | `dev-fix-loop.ts` | 6 处编码损坏 |

---

## 系统状态

### 测试基线 (2026-06-12)
```
Run Suites: 21 total (20 passed, 1 failed — 预存 mock 问题)
Tests:     162 total (161 passed, 1 failed)
```

### 预存失败（不修复）
- `product-pipeline.test.ts:261` — LLM mock 不匹配新 parser 行为

---

## CODEX 工作规范

### 编辑器编码 ⚠️ 最重要
CODEX 的编辑器环境持续引入 BOM 和编码损坏。每次提交都复发。
```
# 提交前必跑:
xxd src/agents/*.ts | grep "efbb bf" && echo "BOM FOUND — FIX BEFORE COMMIT"
grep -r "鈥" src/ && echo "ENCODING CORRUPTION — FIX BEFORE COMMIT"
```
**这不是架构师该反复修的问题 — 请修好你的编辑器默认保存编码。**

### 模块清单
- [ ] `tsc --noEmit` 无错误
- [ ] 新建文件有对应的 `__tests__/` 文件
- [ ] 错误路径有测试覆盖
- [ ] 无中文/特殊字符编码损坏
- [ ] 提交前跑 `git diff --stat` 确认改动范围
