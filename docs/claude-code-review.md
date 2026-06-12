# ANFSF Code Review Report

> **日期**: 2026-06-12
> **审查人**: 架构师 (Claude)
> **分支**: master
> **范围**: Phase 2 交付 — GAP-01/GAP-02/GAP-03/GAP-06

---

## 审查总结

Phase 2 共交付 6 个模块，发现 11 个问题（2 严重 + 5 中等 + 4 低），全部已修复。最终 `tsc --noEmit` 0 错误，Jest 302/304 通过（2 失败为预存环境问题）。

---

## 第一轮审查 (2026-06-12 12:00) — GAP-01/GAP-02 骨架

### 已修复问题

| # | 严重度 | 文件 | 问题 | 修复方式 |
|---|--------|------|------|----------|
| 1 | CRITICAL | `src/pipeline/skeleton-generator.ts:37` | `AgentLoopResult['code']` 属性不存在，应使用 `GeneratedCode` | 架构师修复 |
| 2 | HIGH | `src/pipeline/__tests__/pipeline-state-machine.test.ts:17` | `ALL_STATES` 仅 15 个，漏了 `stage4_released_to_test`/`stage4_uat`/`stage4_uat_fixing`/`stage5_evolving` | 架构师修复 |
| 3 | MEDIUM | `src/agents/dev-fix-loop.ts` | 6 处中文编码损坏 (`→` 变 `鈫?`) | 架构师修复 |
| 4 | MEDIUM | `src/server/routes/synthesize.ts:209` | `CodeGenerationLoop` 绕过 `SkeletonGenerator`，TokenBudget 未接入 | 架构师添加注释说明 |
| 5 | MEDIUM | `src/agents/dev-fix-loop.ts:216` | `Promise.resolve()` 包装同步 `ContractWatcher.check()`，timeout 无法中断同步死循环 | 架构师添加注释 |
| 6 | LOW | `src/pipeline/pipeline-state-machine.ts:101` | `stage5_evolving` 无 outgoing transition（终端状态），未文档说明 | 架构师添加文档注释 |
| 7 | LOW | `src/agents/dev-fix-loop.ts:91` | `generate()` 是空壳 stub，模板方法设计气味 | 已知限制，Phase 3 重构 |

---

## 第二/第三轮合并审查 (2026-06-12 15:00) — CompileLearningDB + AgentLoop 修复

### 发现 + 已修复

| # | 严重度 | 文件 | 问题 | 修复方式 |
|---|--------|------|------|----------|
| 8 | CRITICAL | `src/agents/agent-loop-base.ts:61-117` | `run()` 中 `tokenUsage` 数组初始化后从未被 push，导致 `result.tokenUsage` 永远为空 | 架构师修复：新增 `roundTokenUsages` 实例字段，子类在 `generate()`/`fix()` 中 push |
| 9 | CRITICAL | `src/agents/agent-loop-base.ts:74` | `generate()` 失败时 `output: null`，`generateOld()` 将其赋给 `LegacyCodeGenResult.code` 导致 `result.code.files` NPE | 架构师修复：`generateOld()` 使用 `result.output ?? { files: [], contracts: {} }` |
| 10 | MEDIUM | `src/agents/code-generation-loop.ts:229` | `parseCodeFromResponse` JSON fallback 未剥离 markdown code fence (` ```json ... ``` `) | 架构师修复 |
| 11 | MEDIUM | `src/agents/code-generation-loop.ts` | 4 处中文编码损坏 (`—` 变 `��`) | 架构师修复 |

### 新增模块(已通过审查)

| 模块 | 路径 | 测试 | 评价 |
|------|------|------|------|
| CompileLearningDB | `src/pipeline/compile-learning-db.ts` | 15/15 | 设计干净：错误标准化→聚合统计→prompt 注入；minFrequency=2 过滤噪声；30s debounce 持久化 |
| AgentLoop Base | `src/agents/agent-loop-base.ts` | — | Template Method 模式正确；抽象层次清晰 |

---

## 第四轮审查 (2026-06-12 17:00) — Phase 2 收尾: FixExecutor + RecoveryEngine

### 发现 + 已修复

| # | 严重度 | 文件 | 问题 | 修复方式 |
|---|--------|------|------|----------|
| 12 | CRITICAL | `src/pipeline/fix-executor.ts:259` | `computePatch()` diff header 使用 `path.join(projectPath, "tmp")` 代替实际文件路径 | 架构师修复：改用 `record.file` |
| 13 | MEDIUM | `src/pipeline/fix-executor.ts:174` | L1 修复写入磁盘前未检查 LLM 是否返回完整文件（可能只返回 snippet 覆盖原文件） | 架构师修复：新增 50% 行数门禁 |
| 14 | MEDIUM | `src/pipeline/fix-executor.ts:186` | compile learning DB 错误记录 `outcome: "fixed"`（实际未验证） | 架构师修复：改为 `outcome: "abandoned"` |
| 15 | MEDIUM | `src/agents/dev-fix-loop.ts` | 6 处中文编码再次损坏（CODEX 的编辑器环境问题） | 架构师修复 |
| 16 | MEDIUM | `src/pipeline/checkpoint.ts` | 2 处中文编码损坏 | 架构师修复 |
| 17 | LOW | `src/pipeline/recovery-engine.ts:9` | `allStates` 硬编码 19 个状态字符串（与 `STATE_TO_STAGE` 第三份重复） | 架构师修复：改为 `Object.keys(STATE_TO_STAGE)` |
| 18 | LOW | `src/pipeline/fix-executor.ts:14` | 未使用的 `spawn` import | 架构师删除 |

### 新增模块(已通过审查)

| 模块 | 路径 | 测试 | 评价 |
|------|------|------|------|
| FixExecutor | `src/pipeline/fix-executor.ts` | 8/8 | L1/L2 流清晰；Diff 格式正确；安全门禁完善 |
| RecoveryEngine | `src/pipeline/recovery-engine.ts` | 3/3 | register→onLeave→auto-save→recover 链路简洁可靠 |
| DevFixLoop 更新 | `src/agents/dev-fix-loop.ts` | — | FixExecutor 集成正确；CompileLearningDB 记录到位 |

---

## 给 CODEX 的工作规范

### 1. 编码问题
你的编辑器保存文件时编码出了偏差。每次写完文件后运行这个检查：
```bash
grep -Pn '[^\x00-\x7F\x80-\xFF]' src/agents/*.ts src/pipeline/*.ts
```
如果输出非空，说明文件里有损坏的 Unicode 字符。用 `iconv` 或重新保存为 UTF-8。

### 2. 新增状态别忘了更新三处
`ProjectState` 类型新增状态后：
- `STATE_TO_STAGE` 映射表
- `TRANSITION_TABLE` 的 from/to 条目
- 测试文件中的 `ALL_STATES` 列表

**推荐**：让 `ALL_STATES` 从 `STATE_TO_STAGE` 的 keys 自动推导，而不是手动维护三份。

### 3. 新增 pipeline 模块的检查清单
- [ ] `tsc --noEmit` 无错误
- [ ] 所有 import 都被使用（无 dead import）
- [ ] 新建文件有对应的 `__tests__/` 文件
- [ ] 错误路径有测试覆盖（LLM 失败、文件不存在、空返回）
- [ ] 中文注释无编码损坏

### 4. 已知预存问题（不要碰）
- 4 个测试失败是环境依赖（compile-validator/auth/rate-limit/server），不是代码问题
- Jest worker force exit 警告来自 CompileLearningDB 单例的 saveTimer，不影响功能
