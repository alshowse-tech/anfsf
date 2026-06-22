# ANFSF 智能软件开发系统 — 全面审查报告

> **版本**: 1.0 | **日期**: 2026-06-17  
> **审查范围**: 全流程 13 步工作流 + 生成阶段深度审计 + 17 层架构 + Agent Loop + 成本管理体系  
> **系统目标**: 软件开发全流程 AI/Agent 化，保留 1 产品 + 1 后端 + 1 前端人员，进行 PRD 确认、逻辑编码、测试、优化  

---

## 一、执行摘要

ANFSF 是一个 57,665 行 TypeScript 代码库（211 个源文件，126 个测试文件），目标是从 PRD 到可部署项目的全自动闭环。当前运行时接入率约 **35%**——即 65% 的代码存在但未接入主执行路径。

本报告覆盖两个审查维度：
1. **全流程审查**：13 步工作流覆盖、三层人员角色设计、系统架构完整性
2. **生成阶段深度审计**：Agent Loop 核心执行引擎、验证链、LLM 调用路径、fix 循环、上下文管理、成本管控

---

## 二、全流程审查：13 步工作流覆盖

### 2.1 三步覆盖矩阵

| Step | 名称 | 责任人 | 运行时状态 | 评分 |
|------|------|--------|-----------|------|
| 1 | PM 提供 PRD | 产品 | ✅ 文本+附件+注入检测 | 9/10 |
| 2 | ANFSF 指出优化建议 | 系统 | ⚠️ 4维评分有，无结构化改进路径 | 5/10 |
| 3 | PM 确认锁定 PRD | 产品 | ⚠️ RequirementReview组件有，无迭代对话 | 5/10 |
| 4 | 结构化 PRD→代码+任务 | 系统 | ✅ 骨架生成+TaskGenerator | 7/10 |
| 5 | 开发者执行任务 | 后端+前端 | ⚠️ Gitea push best-effort，DevFixLoop 未接入 | 4/10 |
| 6 | 自动化测试反馈 | 系统 | ❌ 无 CommitVerifier 调用 | 2/10 |
| 7 | 开发者修复提交 | 后端+前端 | ❌ 无 FixEngine 调用 | 0/10 |
| 8 | 发布测试版本 | 系统 | ❌ 无 ReleaseCheck/Canary | 0/10 |
| 9 | PM 反馈 UI/UX | 产品 | ❌ 完全未实现 | 0/10 |
| 10 | 前端修复提交 | 前端 | ❌ 完全未实现 | 0/10 |
| 11 | 发布演示版本 | 系统 | ❌ 完全未实现 | 0/10 |
| 12 | 项目归档 | 系统 | ❌ 无 Archiver/CodeAnnotator | 0/10 |
| 13 | 自进化 | 系统 | ❌ 7个进化模块存在但0接入 | 0/10 |

**加权得分**: 32/130 ≈ **24.6%**（此数字基于评分相加，仅为定性参考。REFACTOR-FIX 的 35% 覆盖率和 BLUEPRINT 的 45% 代码完成率均为独立指标，不可直接对比）

### 2.2 生成阶段在主体流程中的位置

```
生成阶段 (Step 1-4) ───▶ 开发者阶段 (Step 5-7) ───▶ 验证发布阶段 (Step 8-12) ───▶ 进化阶段 (Step 13)
   ═══ 已实现 ═══            ═══ 部分实现 ═══            ═══ 零实现 ═══              ═══ 零实现 ═══
```

---

## 三、生成阶段深度审计（Step 1-5，系统核心执行路径）

### 3.1 实际执行链路

```
POST /api/v1/synthesize
  → sanitizePRDText() + detectPromptInjection()           [Step 1: 输入治理]
  → evaluatePRDQuality()                                    [Step 2: 质量评分，无LLM]
  → PipelineStateMachine.stage1_parsing                    [状态转换]
  → TokenBudget(jobId) + loadBudgetRecords()               [预算恢复]
  → AINativePRDParser.parse() → LLM call #1               [Step 2: PRD解析，实际LLM调用]
  → budget.consumeSync(actual usage)                       [成本记录]
  → CodeGenerationLoop.run(spec, outputDir)                [Step 3-4: 骨架生成]
     ├── generate() → LLM call #2                         [生成代码]
     ├── writeOutput() → npm install                       [写磁盘+装依赖]
     ├── verify() → VerificationRunner.runAll()            [tsc --noEmit验证]
     │   └── CompileValidator.validate() → spawn tsc       [唯一有效的验证工具]
     ├── fix() → LLM call #3 (if errors)                  [修复代码，最多2轮]
     │   └── verify() again
     └── return AgentLoopResult                            [results+tokens+budgetReport]
  → TaskGenerator.generate() → TASK_FRONTEND.md + TASK_BACKEND.md  [任务分解]
  → GiteaClient.push()                                     [Step 5: best effort推送]
  → saveBudgetRecords()                                    [预算持久化]
  → PipelineStateMachine.stage1_done                       [状态转换]
```

### 3.2 Agent Loop 引擎审计

| 维度 | 当前实现 | 对标差距 | 评分 |
|------|---------|---------|------|
| **Loop 模式** | 模板方法 `generate→verify→fix`(214行基类+382行子类) | ✅ 设计正确，三个子类已实现 | 8/10 |
| **LLM 调用点** | generate() + fix() 各1次，最多3次/run | ❌ 无工具系统，纯文本管道 | 5/10 |
| **verify 链** | 仅 CompileValidator(tsc --noEmit) | ❌ 3个已实现的 Skill 未接入(CodeQualityGuard/HallucinationGuard/SecurityAuditor) | 4/10 |
| **fix 循环** | 最多2轮，LLM直接修复 | ❌ 无 FixEngine 三级分类矩阵(L1/L2/L3) | 3/10 |
| **上下文管理** | Prompt拼接，无压缩 | ❌ 长PRD+多轮fix后prompt线性膨胀 | 3/10 |
| **上下文学习** | CompileLearningDB 跨项目记录错误模式 | ⚠️ 功能存在但数据有限 | 6/10 |
| **KnowledgeBridge** | 同步到 KnowledgeBase | ⚠️ 只记录不查询 | 5/10 |
| **沙箱执行** | ❌ 无，npm install直接在本地运行 | ❌ 安全风险 | 0/10 |
| **子Agent委托** | ❌ 无，整个PRD一次生成 | ❌ 大项目无任务分解 | 0/10 |
| **多LLM后端** | DeepSeek + DashScope | ⚠️ 2个，够用但无供应商冗余 | 6/10 |
| **成本管理** | 三级阈值+统一定价+SQLite持久化+Prometheus | ✅ 行业领先 | 9/10 |

**生成阶段加权总分**: 49/110 ≈ **44.5%**

### 3.3 LLM 调用路径全量审计

生成阶段涉及 **7 个 LLM 调用路径**，其中 3 个在生产主路径（synthesize.ts），4 个在备用/旧 pipeline/未接入路径：

| # | 调用位置 | 文件 | 模型 | 预算覆盖 | 路径 |
|---|---------|------|------|---------|------|
| 1 | PRD解析(parse) | `prd-parser.ts:222` | deepseek-chat | ✅ consumeSync | 🟢 主路径 |
| 2 | PRD质量评估(assessQuality) | `prd-parser.ts:419` | deepseek-chat | ⚠️ lastUsage已记录，但 synthesize.ts 走 `evaluatePRDQuality()`（无LLM），此方法仅被旧 pipeline 调用 | 🟡 备用 |
| 3 | PRD增强(autoEnhancePRD) | `prd-parser.ts:540` | 任意 | ❌ 独立函数，无预算挂载 | 🟡 旧 pipeline |
| 4 | AgentLoop生成 | `code-generation-loop.ts:177` | default | ✅ preEvaluate+consumeSync | 🟢 主路径 |
| 5 | AgentLoop修复 | `code-generation-loop.ts:251` | default | ✅ preEvaluate+consumeSync | 🟢 主路径 |
| 6 | TestGenLoop生成 | `test-gen-loop.ts:152` | default | ❌ 未接入运行时 | 🔴 未接入 |
| 7 | IntrospectionEngine | `introspection-engine.ts:298` | 可配 | ❌ 未接入运行时 | 🔴 未接入 |

**主路径覆盖**：3/3 全部覆盖 ✅
**全部路径覆盖**：3/7 = 43% ⚠️（4 条备用路径中 #6 和 #7 是 Phase 2/3 目标，当前不需要；#2 和 #3 在旧 pipeline 中，不在 synthesize.ts 主路径）

### 3.4 验证链深度审计

**当前真正运行的验证**：
```
VerificationRunner.runAll()
  └── CompileValidator (tsc --noEmit)
       ├── 路径安全检查 (SAFE_PATH_RE)
       ├── spawn('node', [tscPath, '--noEmit']) — 非shell执行，防注入
       └── 超时保护 60s
```

**已实现但未接入的验证能力**（共 3 项）：
| Skill | 文件 | 行数 | 验证内容 |
|-------|------|------|---------|
| CodeQualityGuardSkill | `skills/code-quality-guard-skill.ts` | 314 | 静态+语义四维检查 |
| HallucinationGuardSkill | `skills/hallucination-guard-skill.ts` | 405 | 幻觉三分类检测 |
| SecurityAuditorSkill | `skills/security-auditor-skill.ts` | 365 | OWASP + CWE 检查 |

**接入路径**: VerificationRunner 已支持工具注册机制（`new VerificationRunner(tools)`），只需在 CodeGenerationLoop 构造函数中传入额外工具即可。

### 3.5 Fix 循环审计

**当前流程**：
```
verify() 返回错误列表
  → fix() 直接 LLM 调用: "Fix ONLY the listed errors"
  → 目标文件重新生成
  → mergeFixedFiles 合并回原始代码
  → 最多2轮
  → 失败: "Still N error(s) after 2 fix round(s)"
```

**关键缺失**：

1. **FixEngine 三级分类矩阵未接入**：`dev-fix-loop.ts:58-60` 定义了完整的 L1(自动修复)/L2(建议Diff)/L3(仅定位) 分类矩阵，但 `code-generation-loop.ts` 根本不使用它。当前所有错误一律 LLM 修复，无任何智能分类。

2. **FixExecutor 未接入**：`fix-executor.ts` 包含 L1 自动修复执行器（147行+232行两处LLM调用），但从未被 CodeGenerationLoop 调用。

3. **无 Git 集成修复**：Aider 的 git-native fix 循环（修复→commit→失败→revert→重试）完全缺失。当前修复直接覆写磁盘文件，无版本控制。

4. **循环收敛风险**：修复 A 引入新错误 → 修复 B 修复 A 的错误但引入 C → 修复 C 重新引入 A。当前无循环检测，仅靠 maxRetries=2 硬限制。

### 3.6 成本管理体系完整性

本分支完成的成本修复已覆盖：
- ✅ 统一定价（llm-client.ts MODEL_PRICING → token-budget.ts 单一来源）
- ✅ 三级阈值（warn 70% / block 90% / hardBlock 135%）
- ✅ budgetGuard 回调（LLM 调用前检查）
- ✅ preEvaluate（预估不消耗）
- ✅ BudgetExhaustedError（语义化异常）
- ✅ SQLite + Postgres 持久化
- ✅ Prometheus 指标
- ✅ AgentLoopResult.budgetExhausted + budgetReport

**剩余缺口**：
- ❌ chatVision() 多模态路径无预算检查（代码已添加，但当前无调用方）
- ❌ 模型选择器未按实际质量数据选择（Phase D，需要至少50次运行数据）

---

## 四、17 层架构 vs 目标人员角色映射

### 4.1 目标角色定义

| 角色 | 职责 | 预期AI替代比例 |
|------|------|-------------|
| **产品** | PRD编写、需求确认、验收标准、UI/UX反馈 | 0%（人机协作确认） |
| **后端** | 逻辑编码、API实现、数据库设计、业务代码 | 80%（骨架生成+AI辅助填充） |
| **前端** | 组件开发、页面实现、UI交互 | 80%（骨架生成+AI辅助填充） |

### 4.2 17 层能力对目标角色的覆盖率

| 17层 | 层级名称 | 对"产品"的支持 | 对"后端"的支持 | 对"前端"的支持 | 运行时状态 |
|------|---------|-------------|-------------|-------------|-----------|
| L1 | AI-Native PRD | ✅ 文本输入+附件解析 | — | — | ✅ 接入 |
| L2 | Product Input | ✅ 补全引擎+质量检查 | — | — | ⚠️ 部分 |
| L3 | Input Governance | ✅ 注入检测+输入净化 | — | — | ✅ 接入 |
| L4 | Requirement Graph | ⚠️ 需求结构化但无图编译 | — | — | ❌ 未接入 |
| L5 | Strategy Layer | — | ⚠️ 接口预算+KPI | — | ❌ 未接入 |
| L6 | System Architecture | — | ❌ 后端架构生成未接入 | ❌ 前端架构生成未接入 | ❌ 代码存在 |
| L7 | Contract-First | — | ❌ API契约未自动生成 | ❌ UI契约未自动生成 | ❌ 代码存在 |
| L8 | Adaptive Task DAG | — | ❌ 动态任务未分解 | ❌ 动态任务未分解 | ❌ 代码存在 |
| L8.5 | Governance Control | — | ⚠️ 治理检查未接入 | ⚠️ 治理检查未接入 | ❌ 外部化 |
| L9 | Agent OS | — | ⚠️ AgentOS有，但Pipeline不用 | ⚠️ AgentOS有，但Pipeline不用 | ❌ 未接入 |
| L10 | Efficiency | — | ❌ 上下文压缩/批处理 | ❌ 上下文压缩/批处理 | ❌ 部分 |
| L11 | Cognitive Integrity | ❌ 语义共识未实现 | ❌ 认知追踪未实现 | ❌ 认知追踪未实现 | ❌ 零实现 |
| L12 | Long-Chain Stability | — | ❌ MemWeaver缺失 | ❌ MemWeaver缺失 | ❌ 部分 |
| L13 | Semantic Consistency | — | ❌ API一致性未独立 | ❌ UI一致性未独立 | ❌ 部分 |
| L14 | Simulation | ⚠️ E2E测试框架有 | ⚠️ 负载模拟未接入 | ⚠️ 用户行为模拟未接入 | ❌ 部分 |
| L15 | Runtime+ Deploy | — | ❌ 部署流水线未接入 | ❌ 部署流水线未接入 | ❌ 仅金丝雀 |
| L16 | Runtime Intelligence | — | ❌ KPI监控未接入 | ❌ KPI监控未接入 | ❌ 代码存在 |
| L17 | Evolution Guard | — | ❌ 回归检测/回滚未接入 | ❌ 回归检测/回滚未接入 | ❌ 代码存在 |

**17层加权覆盖率**：产品 ~40%，后端 ~15%，前端 ~10%。大部分层的代码存在但未接入运行时。

### 4.3 目标能力缺口矩阵

| 目标能力 | 当前系统支持 | 缺口 | 最接近的竞品参照 |
|---------|------------|------|---------------|
| PRD→结构化需求 | ✅ LLM解析，质量评分 | ⚠️ 无迭代对话确认 | MetaGPT PM Agent |
| PRD→后端代码 | ✅ 骨架生成(Express, routes, services) | ❌ 无业务逻辑 + 无DB schema生成 | MetaGPT Architect |
| PRD→前端代码 | ✅ 骨架生成(React, components, pages) | ❌ 无UI组件合成 + 无状态管理 | MetaGPT UI合成 |
| 开发者代码验证 | ❌ 无自动测试 | ❌ 无CommitVerifier接入 | SWE-agent submit |
| 开发者代码修复 | ❌ 无FixEngine接入 | ❌ 无L1自动修复执行 | Aider lint反射 |
| 版本发布 | ❌ | ❌ | OpenHands PR创建 |
| 架构进化 | ❌ 7个模块全孤立 | ❌ 无离线优化触发 | StrongDM收敛循环 |
| 成本管控 | ✅ 行业领先 | ⚠️ 模型选择器缺数据 | 无竞品匹敌 |

---

## 五、系统弱点深度分析

### 5.1 致命级（阻碍目标达成）

**F1: 运行时接入率 35%**
- 57,665 行代码中仅 ~20,000 行在活跃路径
- 17 层架构的 49 个 core 模块仅 1 个在运行（compile-validator）
- 18 个 Skills 中 17 个从未被注册
- 9 个 Harnesses 全孤立

**F2: Agent Loop 无工具系统**
- Claude Code: 43-54 个工具（Bash/Read/Edit/Write/Grep/Glob/Agent/TodoWrite）
- SWE-agent: 4 个 ACI 旗舰工具（Viewer/Search/Editor/Submit）
- OpenHands: 8 种动态工具（bash/python/editor/browser/delegation/finish/think/task）
- **ANFSF**: 0 个工具。`generate()` 只有一行 `this.llm.chat(request)`

**F3: 无沙箱执行**
- npm install 直接在本地文件系统运行（安全风险）
- tsc 编译在本地 spawn （可接受，因为只读 verify）
- 竞品: OpenHands Docker/Kata 双模式、SWE-agent SWE-ReX 4种后端、Claude Code SandboxManager(FS+网络+Unix socket)

**F4: 无任务分解**
- 无论 PRD 是 3 个 feature 还是 30 个，Agent Loop 都是一次性生成所有代码
- 竞品: Factory-AI Mission→Milestone→Feature→Worker 4级分解
- 竞品: MetaGPT PM→Architect→PM→Engineer→QA 5阶段 SOP

### 5.2 严重级（显著影响系统能力）

**S1: 无多 Agent 协作**
- 单一 CodeGenerationLoop 处理全流程
- DevFixLoop 和 TestGenLoop 代码已存在但孤立
- Claude Code Coordinator→Team→Subagent 三层多 Agent 体系

**S2: 验证链薄弱**
- 仅 tsc 编译检查是真正运行的
- 3 个额外 Skill 已实现未接入（CodeQualityGuard/HallucinationGuard/SecurityAuditor）
- 无 E2E 测试、无性能测试、无可访问性测试

**S3: 无 Issue→PR 自主修复**
- OpenHands: 直接在真实 GitHub repo 上修复 issue 并提交 PR
- SWE-agent: 补丁生成→submit 哨兵→自动产出
- ANFSF: Stage 2 是黑盒，后续步骤完全未实现

**S4: Fix 循环无智能分类**
- 所有错误一律 LLM 修复（最多2轮）
- FixEngine 的 L1(自动修复)/L2(建议Diff)/L3(仅定位) 完全未调用
- 循环收敛无检测——修复A打破B→修复B打破C→修复C打破A（仅在 maxRetries=2 被硬止损）

**S5: 无上下文压缩**
- 长 PRD + 多轮 fix 后 prompt 线性膨胀
- Claude Code: 5层压缩管线（预算→裁剪→微压缩→上下文折叠→自动摘要）
- OpenHands: LLM摘要冷凝器（~2x 成本节省）
- Aider: RepoMap（Pagerank 符号图）

### 5.3 中等（影响质量和效率）

**M1: Prompt 无版本化管理** — 全部内联在代码中，无 A/B 测试
**M2: 多 LLM 后端有限** — 2 个 Provider vs OpenHands/Aider 的 100+(LiteLLM)
**M3: 无 SWE-bench 参与** — 无法量化和竞品对比能力
**M4: 中文 PRD 解析优化但英文 prompt 模板共存** — 不一致
**M5: 无 Prettier/Husky** — 代码格式化未强制执行

---

## 六、综合评分矩阵

| 维度 | 得分 | 权重 | 加权 | 说明 |
|------|------|------|------|------|
| 架构完整度（理论设计） | 8/10 | 15% | 1.20 | 17层覆盖全SDLC |
| 架构执行力（运行时接入） | 3/10 | 25% | 0.75 | 仅35%接入 |
| Agent Loop 核心引擎 | 5/10 | 20% | 1.00 | 模式正确，无工具系统 |
| 代码生成质量 | 6/10 | 15% | 0.90 | 编译通过率高，但只是骨架 |
| 验证链完整度 | 4/10 | 10% | 0.40 | 仅 tsc |
| 成本管理体系 | 9/10 | 10% | 0.90 | 行业领先 |
| 安全防护 | 5/10 | 5% | 0.25 | 注入检测+API密钥保护有漏洞 |
| **加权总分** | | | **5.40/10** | |

### 与竞品对比

| 竞品 | 对标得分 | ANFSF 差距 |
|------|---------|-----------|
| Claude Code | 8.6/10 | -3.2: 工具系统+沙箱+多Agent全缺 |
| OpenHands | 7.0/10 | -1.6: 验证链+沙箱+PR创建全缺 |
| MetaGPT | 6.2/10 | -0.8: 多Agent管线+任务分解缺 |
| Aider | 6.8/10 | -1.4: Git集成+上下文+工具系统缺 |
| StrongDM Attractor | 6.1/10 | -0.7: 验证方法论缺但理念相近 |
| **ANFSF 加权** | **5.4/10** | **基准线** |

### ANFSF 的差异化优势

1. **PRD→全栈代码端到端** — 唯一从此方向切入的完整系统（竞品关注补丁/修改而非新项目生成）
2. **成本管理深度** — 三级阈值+统一定价+持久化+Prometheus 在竞品中无匹敌
3. **中文本地化** — 模糊词检测+中文PRD优化+双语架构是独特壁垒
4. **编译验证闭环** — generate→verify(tsc)→fix 循环是仅有在生成阶段就强制编译通过的项目

---

## 七、修复路线图

### Phase 1 — 生成阶段加固（3 天，P0）

```
目标: 将 Agent Loop 验证链从 1 个工具扩展到 4 个
```

| 任务 | 文件 | 时间 |
|------|------|------|
| VerificationRunner 接入 CodeQualityGuard | `verification-runner.ts` 新增工具 | 0.5d |
| VerificationRunner 接入 HallucinationGuard | 同上 | 0.5d |
| VerificationRunner 接入 SecurityAuditor | 同上 | 0.5d |
| CodeGenerationLoop 构造函数传入 4 工具集 | `code-generation-loop.ts` | 0.5d |
| 测试 + 集成验证 | `*.test.ts` | 1d |

### Phase 2 — Agent Loop 工具系统（5 天，P0）

```
目标: 为 Agent Loop 建立最小可行工具系统
```

| 任务 | 说明 | 时间 |
|------|------|------|
| 定义 Tool 接口 | `read_file/write_file/execute_bash/search_code` | 1d |
| 实现 FileRead/FileWrite/Bash 工具 | 对标 Claude Code 核心3工具 | 2d |
| AgentLoop.generate/fix 接入工具调用循环 | 替代纯 LLM 文本管道 | 1d |
| 沙箱基础（只读文件系统） | path 白名单 + SAFE_PATH_RE | 1d |

### Phase 3 — 任务分解（3 天，P1）

```
目标: 大 PRD 自动拆分为子任务，Agent Loop 并行处理
```

| 任务 | 说明 | 时间 |
|------|------|------|
| TaskDAGEngine 接入 Agent Loop | 继承 `core/task-dag/task-dag-engine.ts` | 1d |
| 并行生成骨架 | 每个子任务一个 CodeGenerationLoop | 1d |
| 结果合并 + 全量编译验证 | 合并后统一 tsc | 1d |

### Phase 4 — 开发者验证闭环（5 天，P1）

```
目标: 接入 DevFixLoop 到 Gitea webhook
```

| 任务 | 说明 | 时间 |
|------|------|------|
| Webhook 路由接入 DevFixLoop | Gitea push → verify → fix | 2d |
| FixEngine L1/L2/L3 分类接入 | 替代当前一律 LLM 修复 | 2d |
| CommitVerifier + ContractWatcher 接入 | 编译+契约双层验证 | 1d |

### Phase 5 — 上下文压缩 + 测试自动化（4 天，P2）

| 任务 | 说明 | 时间 |
|------|------|------|
| ContextCompressorSkill 接入 | 长上下文自动摘要 | 1d |
| TestGenLoop 接入 synthesize | PRD→测试脚本生成 | 2d |
| E2E 测试框架接入 | Playwright + CommitVerifier | 1d |

### Phase 6 — 发布 + 进化闭环（5 天，P3）

| 任务 | 说明 | 时间 |
|------|------|------|
| ReleaseCheck + CanaryDeployer 接入 | 发布门禁 | 2d |
| EvolutionHarness 接入 stage5_done | 离线优化循环 | 2d |
| KPI Dashboard 接入 | 实时监控 | 1d |

**总计**: 25 天，分 6 个 Phase。

---

## 八、关键指标仪表盘

| 指标 | 当前值 | 目标值（Phase 6 后） | 行业基准 |
|------|--------|---------------------|---------|
| 运行时接入率 | 35% | 70% | 100%（所有竞品） |
| Agent Loop 验证工具数 | 1 | 4 | 4-8（竞品均值） |
| 13步工作流覆盖 | 5/13 | 11/13 | 8-13/13 |
| LLM 调用路径预算覆盖 | 5/5（主路径） | 7/7 | — |
| SWE-bench 参与 | 否 | 否（Phase 7 目标） | OpenHands 72% |
| 类型错误 | 0 | 0 | — |
| 测试通过率 | 95.9% | 96%+ | — |
| 代码行数 | 57,665 | ~60,000 | — |

---

## 九、附录：与 17 层架构的对齐比照

| 17层 | 对标竞品能力 | ANFSF 代码状态 | 运行时接入 | 完成度 |
|------|------------|-------------|-----------|--------|
| L1-L2 PRD层 | MetaGPT PM Agent | ✅ 文本+附件+质量评分 | ✅ | 80% |
| L3 输入治理 | Claude Code 输入净化 | ✅ sanitization+注入检测 | ✅ | 85% |
| L4 需求图 | MetaGPT+Claude Code | ⚠️ graph-engine 1029行 | ❌ | 30% |
| L5-L7 策略+架构+契约 | MetaGPT Architect | ⚠️ 代码存在但未接入 | ❌ | 15% |
| L8-L8.5 任务+治理 | Factory Mission分解 | ⚠️ task-dag 667行 | ❌ | 10% |
| L9 Agent OS | Claude Code AgentTool | ⚠️ 6Agent类型定义 | ❌ | 10% |
| L10-L12 效率+完整性+长链 | Claude Code 压缩管线 | ⚠️ compressor存在 | ❌ | 10% |
| L13-L15 一致性+模拟+部署 | OpenHands沙箱+测试 | ⚠️ 金丝雀部署存在 | ❌ | 5% |
| L16-L17 智能+进化 | StrongDM收敛循环 | ⚠️ 7模块完整 | ❌ | 5% |
