# ANFSF Code Review Report

> **日期**: 2026-06-12
> **审查人**: 架构师 (Claude)
> **分支**: master

---

## 最近审查: Phase 3 启动 (2026-06-12 19:00)

### 新增模块

| 模块 | 路径 | 测试 | 评价 |
|------|------|------|------|
| TestGenLoop | `src/agents/test-gen-loop.ts` | 3/3 | 结构正确，仿照 CodeGenLoop；语法验证链路完整；`detectFramework` 逻辑合理 |
| EvolutionRunner | `src/pipeline/evolution-runner.ts` | 2/2 | 设计正确，stage5_evolving 的轻量级入口；CompileLearningDB.flush + pruneOlderThan(90) 作为 MVP 合理 |
| INDEX.md 更新 | `docs/INDEX.md` | — | 路径更新 |

### 发现 + 已修复

| # | 严重度 | 文件 | 问题 | 修复方式 |
|---|--------|------|------|----------|
| 1 | CRITICAL | `src/agents/code-generation-loop.ts` | **全部溃烂**：CODEX 引入 BOM (`﻿`) + 4 处 `—`→`?`, `→`→`?` 字符全面损坏 | 架构师修复 |
| 2 | CRITICAL | `src/agents/dev-fix-loop.ts` | **全部溃烂**：BOM + 6 处编码损坏（含箭头 `→`→`?`，破折号 `—`→`?`） | 架构师修复 |
| 3 | CRITICAL | `src/pipeline/compile-learning-db.ts` | **全部溃烂**：BOM + 中文注释段全毁（`↓` 箭头 + 中文标题 + 箭头 `→` 全损坏） | 架构师修复 |
| 4 | CRITICAL | `src/pipeline/fix-executor.ts` | **全部溃烂**：BOM + 箭头链 `→`→`?`，破折号 `—`→`?` | 架构师修复 |
| 5 | MEDIUM | `src/pipeline/checkpoint.ts` | `—`→空格 2 处（BOM 已存在，被转码破坏） | 架构师修复 |
| 6 | LOW | 多个文件末尾 | CODEX 在 5 个文件中添加了多余的空尾行 | 架构师清理 |
| 7 | LOW | `src/agents/test-gen-loop.ts:1` | 标题行 `—`→`?` 1 处 | 架构师修复 |

### 给 CODEX 的紧急警告

**你的编辑器正在系统性损坏源文件的编码。** 5 个已有文件被加入了 BOM (byte-order mark `﻿`) 作为首字节，且所有 em-dash (`—` U+2014)、right arrow (`→` U+2192)、down arrow (`↓` U+2193) 字符全部被替换成问号或其他损坏字符。

**根本原因分析**：你创建/保存文件时，编辑器用了系统 ANSI 编码（Windows-1252 / GBK），而不是 UTF-8。这些 Unicode 字符在 ANSI 编码页中没有对应的字节表示，因此被替换。

**必须执行**：
1. 将编辑器默认编码设置为 **UTF-8 without BOM**
2. 修改已有文件前，先用 `file -bi <filename>` 确认当前编码是 `utf-8`
3. 提交前运行 `git diff` 肉眼扫描 — 如果看到 `?` 替换了中文或特殊字符，不要提交

### 验证结果

- `tsc --noEmit`: **0 错误**
- 现有测试 (fix-executor, recovery-engine): **11/11 通过**
- 新增测试 (test-gen-loop, evolution-runner): **5/5 通过**

---

## 历史审查: Phase 2 收尾 (2026-06-12 17:00)

### 发现 + 已修复

| # | 严重度 | 文件 | 问题 | 修复方式 |
|---|--------|------|------|----------|
| 1 | CRITICAL | `src/pipeline/fix-executor.ts:259` | `computePatch()` diff header 使用 `path.join(projectPath, "tmp")` 代替实际文件路径 | 架构师修复：改用 `record.file` |
| 2 | MEDIUM | `src/pipeline/fix-executor.ts:174` | L1 修复写入前未检查 LLM 是否返回完整文件 | 架构师修复：新增 50% 行数门禁 |
| 3 | MEDIUM | `src/pipeline/fix-executor.ts:186` | compile learning DB 错误记录 `outcome: "fixed"`（未验证） | 架构师修复：改为 `outcome: "abandoned"` |
| 4 | LOW | `src/pipeline/recovery-engine.ts:9` | `allStates` 硬编码 19 个状态字符串 | 架构师修复：改为 `Object.keys(STATE_TO_STAGE)` |

---

## 历史审查: CompileLearningDB + AgentLoop (2026-06-12 15:00)

### 发现 + 已修复

| # | 严重度 | 文件 | 问题 | 修复方式 |
|---|--------|------|------|----------|
| 1 | CRITICAL | `src/agents/agent-loop-base.ts:61-117` | `run()` 中 `tokenUsage` 从未被 push | 架构师修复：新增 `roundTokenUsages` 实例字段 |
| 2 | CRITICAL | `src/agents/agent-loop-base.ts:74` | `generate()` 失败时 `output: null` 导致 NPE | 架构师修复：`generateOld()` null-safe |
| 3 | MEDIUM | `src/agents/code-generation-loop.ts:229` | JSON fallback 未剥离 markdown fence | 架构师修复 |
| 4 | MEDIUM | `src/agents/code-generation-loop.ts` | 4 处中文编码损坏 | 架构师修复 |

---

## 历史审查: GAP-01/GAP-02 骨架 (2026-06-12 12:00)

### 发现 + 已修复

| # | 严重度 | 文件 | 问题 | 修复方式 |
|---|--------|------|------|----------|
| 1 | CRITICAL | `src/pipeline/skeleton-generator.ts:37` | `AgentLoopResult['code']` 不存在 | 架构师修复：改用 `GeneratedCode` |
| 2 | HIGH | `src/pipeline/__tests__/pipeline-state-machine.test.ts:17` | `ALL_STATES` 漏 4 个新状态 | 架构师修复 |
| 3 | MEDIUM | `src/agents/dev-fix-loop.ts` | 6 处中文编码损坏 | 架构师修复 |
| 4 | LOW | `src/pipeline/pipeline-state-machine.ts:101` | `stage5_evolving` 无出口未文档化 | 架构师添加注释 |

---

## 系统状态

### 测试基线 (2026-06-12)
```
Test Suites: 21 total (19 passed, 2 failed — 预存环境依赖)
Tests: 304 total (302 passed, 2 failed)
```

### 预存失败（不要碰）
- `compile-validator.test.ts` — jest globals 环境
- `auth.test.ts` — 同上

---

## CODEX 工作规范

### 1. 编辑器编码 ⚠️ 最高优先级
**这是最频繁的问题。** 每次 CODEX 提交都会引入编码损坏。
```
# 提交前检查：
grep -Pn '[^\x00-\x7F]' src/**/*.ts | grep -v '//\|/\*\|\*\/\|中文\|日语\|한국어'
# 如果出现 ? 或乱码字符，文件编码已损坏，不要提交。
```

### 2. 新增 PipelineState 别忘了三处同步
- `ProjectState` 类型定义
- `STATE_TO_STAGE` 映射表
- `TRANSITION_TABLE` 的 from/to 条目

### 3. 新增 pipeline 模块检查清单
- [ ] `tsc --noEmit` 无错误
- [ ] 所有 import 都被使用
- [ ] 新建文件有对应的 `__tests__/` 文件
- [ ] 错误路径有测试覆盖
- [ ] **中文/特殊字符无编码损坏**
