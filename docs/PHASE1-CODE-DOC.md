# ANFSF Agent Loop 开发文档 — Phase 1: 验证链扩展

> **日期**: 2026-06-29 | **状态**: ✅ 已完成
> **执行方**: Claude Code (Phase 1 实现) + CODEX (后续执行)
> **基线**: 测试通过率 99.1%, 零类型错误

---

## 1. 概述

将 Agent Loop 验证链从 1 个工具 (`tsc-compile`) 扩展到 4 个工具。三个已实现的 Skill（CodeQualityGuard、HallucinationGuard、SecurityAuditor）被包装为 `VerificationTool` 并接入 `VerificationRunner`。

### 关键指标
- 验证工具: 1 → 4
- 受影响的 Agent Loop: CodeGenerationLoop
- 不改架构、不引入新依赖

---

## 2. 实现清单

### 2.1 新增文件

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/agents/verification-tools/index.ts` | 10 | Barrel export |
| `src/agents/verification-tools/code-quality-guard-tool.ts` | 180 | CodeQualityGuardSkill → VerificationTool |
| `src/agents/verification-tools/hallucination-guard-tool.ts` | 175 | HallucinationGuardSkill → VerificationTool |
| `src/agents/verification-tools/security-auditor-tool.ts` | 240 | SecurityAuditorSkill → VerificationTool |

### 2.2 修改文件

| 文件 | 改动 | 说明 |
|------|------|------|
| `src/agents/verification-runner.ts` | L92: `const` → `export const` | 导出 `DEFAULT_TOOLS` |
| `src/agents/code-generation-loop.ts` | L29, L123-131 | 导入 `VerificationTool`, 构造函数接受 `extraTools` |
| `src/server/routes/synthesize.ts` | L24-26, L252-255 | 导入 3 工具, 传入 CodeGenerationLoop 构造函数 |

### 2.3 工具详情

#### CodeQualityGuardTool
```
rule: 'code-quality'
延迟目标: <10ms (并行执行 4 项检查)
检查项:
  - 静态分析: 文件长度/函数复杂度/嵌套深度/TODO数量/console.log
  - 语义验证: 需求-代码匹配/undefined引用检测
  - 性能预测: 同步I/O/大型循环/内存分配
  - 策略合规: eval/Function/exec/硬编码密钥
```

#### HallucinationGuardTool
```
rule: 'hallucination'
延迟目标: <12ms (fast模式)
检查项:
  - 自洽性检查: 语句变体生成+语义相似度
  - 来源锚定: keyword overlap scoring
  - 幻觉分类: unsupported / contradictory / fabricated
```

#### SecurityAuditorTool
```
rule: 'security'
检查项:
  - 源码扫描: eval/innerHTML/document.write/硬编码密码/日志泄露
  - IR构建: 从源码文件推断端点/实体/组件/服务
  - OWASP Top 10: A01(访问控制)/A02(加密)/A03(注入)/A05(配置)/A07(认证)
  - 安全评分: 0-100, critical/high为error, medium/low为warning
```

---

## 3. 验证结果

### 类型检查
```bash
$ npx tsc --noEmit
# 零错误
```

### 单元测试
```bash
$ npx jest src/agents/__tests__/code-generation-loop.test.ts --no-coverage --forceExit
Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
Time:        32.806 s
```

### 测试覆盖
- parseCodeFromResponse: 6/6
- CodeGenerationLoop successful generation: 1/1
- LLM failure: 2/2
- Config: 2/2
- Token tracking: 1/1
- File writing: 1/1
- Budget integration: 4/4

---

## 4. CODEX 后续执行要点

Phase 1 已经完成且经过验证。CODEX 可以基于此文档直接进入 Phase 2 的编码工作。

**文件清单**:
- `src/agents/verification-tools/code-quality-guard-tool.ts` — 已创建
- `src/agents/verification-tools/hallucination-guard-tool.ts` — 已创建
- `src/agents/verification-tools/security-auditor-tool.ts` — 已创建
- `src/agents/verification-tools/index.ts` — 已创建
- `src/agents/verification-runner.ts` — 已修改 (DEFAULT_TOOLS 导出)
- `src/agents/code-generation-loop.ts` — 已修改 (extraTools 参数)
- `src/server/routes/synthesize.ts` — 已修改 (导入+传入工具)
