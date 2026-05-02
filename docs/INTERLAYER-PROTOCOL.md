# ANFSF 层间协议（Interlayer Protocol）

> 定义 17 层架构中每层的输入/输出格式、前置条件、后置条件。
> 所有类型引用自 `src/` 下实际源文件。

---

## 协议总览

```
L1  PRD 解析    string → AINativePRD
L2  需求精炼    AINativePRD → RefinedGraph
L3  治理门禁    AINativePRD + RefinedGraph → VetoResult + EconomicsScore
L4  认知内核    RefinedGraph → RequirementGraph → IR
L5  策略层      IR + RoleAssignment → BudgetMetrics + KPISnapshot
L6  架构生成    IR → BackendArchitecture + FrontendArchitecture
L7  契约优先    IR → ContractDiff + SemVer
L8  任务 DAG    Policy + TestScenario → TestResult
L8.5 控制平面  ChangeEvent + TraceEdge + Skill → GovernanceOperation
L9  Agent OS   MCPMessage → MCPResponse
L10 效率层     GuardPipelineConfig → GuardPipelineResult
L11 认知完整   VerificationContext → VerificationResult
L12 长链稳定   CompressionContext → CompressedContext
L13 语义一致   Code + RequirementGraph → GuardResult
L14 模拟层     TestScenario + RiskProfile → TestResult
L15 部署层     Policy + CanaryOptions → DeploymentResult
L16 运行时智能 RoleId → RoleKPISnapshot + KPIAction
L17 进化护栏   EvolutionProposal → EvolutionResult
```

---

## L1: AI-Native PRD 解析层

**源文件**: `src/prd/prd-parser.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `prdText` | `string` | 非结构化 PRD 自然语言文本 |
| `config?` | `PRDParserConfig` | API 密钥、模型地址、模型名 |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `AINativePRD` | `AINativePRD` | 结构化 PRD，含 12 个子规格 |

`AINativePRD` 结构：
```typescript
{
  features: Feature[];           // P0-P3 优先级功能列表
  userFlows: UserFlow[];         // 用户操作流程
  uiRequirements: UIRequirement[];
  data: DataSpec[];              // 实体+字段+关系
  constraints: Constraint[];     // 技术/业务/法规约束
  acceptanceCriteria: AcceptanceCriterion[];
  dependencies: Dependency[];
  nonFunctionalSpecs: NonFunctionalSpec[];  // 性能/安全/可扩展/可靠性
  workflow: Workflow[];
  backendSpecs: BackendSpec[];   // API + 服务规格
  infrastructureSpecs: InfrastructureSpec[];
  qaSpecs: QASpec[];
}
```

### 前置条件
- PRD 文本非空（空文本返回空 `AINativePRD`）
- 若启用 AI 解析，需配置有效的 `DASHSCOPE_API_KEY`

### 后置条件
- 输出 `AINativePRD` 所有 12 个字段均已初始化（空数组为默认值）
- `validateCompleteness()` 可检查 `features` 是否为空（阻塞）和 `acceptanceCriteria` 是否缺失（警告）

### 关键方法签名
```typescript
parse(prdText: string): Promise<AINativePRD>
validateCompleteness(prd: AINativePRD): ValidationReport
extractFeatures(prd: AINativePRD): Feature[]
extractDataSpecs(prd: AINativePRD): DataSpec[]
```

---

## L2: Product Input Layer 需求精炼层

**源文件**: `src/skills/requirement-refiner-skill.ts`, `src/skills/hybrid-retriever-skill.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `rawRequirements` | `string` | 原始需求文本（L1 输出或独立输入） |
| `mode` | `'sparse_only' \| 'hybrid' \| 'full'` | 检索模式 |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `RefinedGraph` | `RefinedGraph` | 精炼后的需求图 |

`RefinedGraph` 结构：
```typescript
{
  nodes: Array<{ id: string; type: string; content: string }>;
  edges: Array<{ from: string; to: string; type: string }>;
  quality: number;      // 0-1 质量分
  completeness: number; // 0-1 完整度
  traceId: string;
}
```

### 前置条件
- 原始需求文本非空
- Skills Registry 已加载 6 个子技能

### 后置条件
- 输出图经过双源上下文检索（历史记忆 + 当前压缩）
- 混合检索结果经 RRF 融合（k=60）
- 幻觉防护验证通过
- 若启用 A/B 验证，改进幅度 < 20% 时回滚到基线

### 数据流
```
rawRequirements → [MemoryConsolidation + ContextCompressor]
  → [HybridRetriever (BM25 + Vector + Graph)]
  → [HallucinationGuard]
  → RefinedGraph
```

---

## L3: Input Governance 输入治理层

**源文件**: `src/input-governance/governance.ts`, `src/core/synthesizer/veto/veto-enforcer.ts`, `src/core/synthesizer/economics/scoring.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `prd` | `AINativePRD` | L1 输出 |
| `refinedGraph?` | `RefinedGraph` | L2 输出 |
| `design?` | `object` | 设计文档（可选） |
| `api?` | `object` | API 文档（可选） |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `VetoResult` | `VetoResult` | `{ passed, reason?, warnings?, riskMultiplier?, requireProbe? }` |
| `EconomicsScore` | `EconomicsScore` | `{ interfaceCost, bottleneck, skillMatch, parallelismGain, totalScore }` |
| `OwnershipProof` | `OwnershipProof` | `{ resource, writer, proposer, approver, rulesApplied, valid }` |

### 前置条件
- L1 已输出有效的 `AINativePRD`
- 默认 Veto 规则已加载（API 合同变更、DB Schema 变更、认证变更、实体变更）

### 后置条件
- 四大检查（一致性/完整性/模糊性/冲突）已执行
- Veto 执行完成（硬/软否决）
- 经济学评分已计算：`-0.30×interfaceCost -0.20×bottleneck +0.20×skillMatch +0.15×parallelismGain`
- 所有权证明已生成

### 关键方法签名
```typescript
checkConsistency(prd: AINativePRD, design?: object, api?: object): ConsistencyReport
checkCompleteness(prd: AINativePRD): CompletenessReport
detectAmbiguities(prd: AINativePRD): AmbiguityReport
enforceVeto(changeSet: ChangeSet): VetoResult
computeEconomicsScore(assignment, dag, roles): EconomicsScore
```

---

## L4: Requirement Graph Engine 认知内核

**源文件**: `src/req-graph/graph-engine.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `intent` | `any` | 意图数据 |
| `experience` | `any` | 经验数据 |
| `features` | `any[]` | 功能列表 |
| `interactions` | `any[]` | 交互列表 |
| `system` | `any` | 系统规格 |
| `execution` | `any` | 执行规格 |
| `validation` | `any` | 验证规格 |

或从 L2 接收：
| 字段 | 类型 | 说明 |
|------|------|------|
| `refinedGraph` | `RefinedGraph` | L2 精炼图 |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `RequirementGraph` | `RequirementGraph` | 7 层有向需求图 |
| `IR` | `IR` | 编译后的中间表示 |

`IR` 结构：
```typescript
{
  service: ServiceIR;   // { endpoints: EndpointIR[], services: ServiceComponentIR[] }
  ui: UIIR;            // { components: ComponentIR[], pages: PageIR[] }
  workflow: WorkflowIR; // { workflows: WorkflowDefinitionIR[] }
  data: DataIR;        // { entities: EntityIR[], relationships: RelationshipIR[] }
}
```

### 前置条件
- 7 层输入数据（intent/experience/features/interactions/system/execution/validation）至少部分提供
- 或 L2 精炼图已就绪

### 后置条件
- `RequirementGraph` 包含 7 层节点（L0_Intent → L5_Validation）
- 节点已去重、命名统一、结构规范化
- 约束已应用（schema/semantic/architecture/policy）
- 概率补全完成（confidence > 0.7 的候选被选中）
- IR 已从图中编译提取

### 关键方法签名
```typescript
build(intent, experience, features, interactions, system, execution, validation): RequirementGraph
normalize(): RequirementGraph
applyConstraints(constraints: Constraint[]): RequirementGraph
completeProbabilistically(): ProbabilisticCompletion
compileToIR(): IR
```

---

## L5: Strategy Layer 策略层

**源文件**: `src/core/role/interface-budget.ts`, `src/core/role/kpi-engine.ts`, `src/core/role/kpi-types.ts`, `src/core/synthesizer/optimization/safe-optimizer.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `assignment` | `Assignment` | 任务到角色的分配 |
| `dag` | `TaskDAG` | 任务依赖图 |
| `roles` | `Record<string, RoleEconomics>` | 角色经济学配置 |
| `currentKPIs?` | `AgentKPI[]` | 当前 KPI 快照 |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `BudgetMetrics` | `BudgetMetrics` | `{ totalBudget, usedBudget, remainingBudget, utilizationRate, crossRoleEdges, contractTouches, weightedCost, riskAdjustedCost }` |
| `RoleKPISnapshot` | `RoleKPISnapshot` | `{ roleId, throughput, failureRate, reworkRate, queuePressure, conflictRate, driftIndex, healthScore, trend }` |
| `KPIAction[]` | `KPIAction[]` | 触发动作（suggest_split/suggest_merge/suggest_reassign/alert） |

### 前置条件
- L4 IR 已生成
- 角色经济学参数已配置（costPerTask, overheadPerDependency, parallelismCap）
- 边成本矩阵已加载（owns=0.5, depends_on=1.0, calls=1.2, updates=1.4 等）

### 后置条件
- 接口预算已计算：`weighted_cost = Σ(EDGE_COST×riskWeight) + Σ(CONTRACT_COST×riskWeight)`
- JSD 漂移指数已计算
- KPI 健康评分已更新
- 安全优化器冷却状态已检查

### 关键方法签名
```typescript
computeInterfaceBudget(assignment, dag): BudgetMetrics
calculateJSDrift(currentDist, capabilityDist): number
evaluateKPI(roleId, metrics): RoleKPISnapshot
safeOptimize(knob: SafeKnob): OptimizationResult
```

---

## L6: System Architecture 架构生成层

**源文件**: `src/core/evolution/backend-architect.ts`, `src/core/evolution/frontend-architect.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `serviceIR` | `ServiceIR` | L4 编译的服务 IR |
| `dataIR` | `DataIR` | L4 编译的数据 IR |
| `uiIR` | `UIIR` | L4 编译的 UI IR |
| `workflowIR` | `WorkflowIR` | L4 编译的工作流 IR |

### 输出

**后端**:
| 字段 | 类型 | 说明 |
|------|------|------|
| `BackendArchitecture` | `BackendArchitecture` | `{ files: GeneratedFile[], summary: { totalFiles, endpoints, services, models } }` |

`GeneratedFile` (backend) type: `'route' | 'controller' | 'service' | 'model' | 'middleware' | 'entry'`

**前端**:
| 字段 | 类型 | 说明 |
|------|------|------|
| `FrontendArchitecture` | `FrontendArchitecture` | `{ files: GeneratedFile[], summary: { totalFiles, components, pages, stores } }` |

`GeneratedFile` (frontend) type: `'component' | 'page' | 'route' | 'store' | 'entry' | 'hook'`

### 前置条件
- L4 已输出有效的 `IR`
- `ServiceIR.endpoints` 和 `ServiceIR.services` 至少有一个非空（后端生成）
- `UIIR.components` 和 `UIIR.pages` 至少有一个非空（前端生成）

### 后置条件
- 后端：Express 入口、中间件、Model 接口、Service 类（CRUD）、Controller 类、路由注册 全部生成
- 前端：React 组件 stub、页面组件、路由（react-router/wouter）、Store（zustand/redux/jotai）、入口、自定义 Hooks 全部生成
- 所有文件路径使用 kebab-case 命名

### 关键方法签名
```typescript
// Backend
generate(serviceIR: ServiceIR, dataIR: DataIR): BackendArchitecture

// Frontend
generate(uiIR: UIIR, workflowIR: WorkflowIR): FrontendArchitecture
```

---

## L7: Contract-First Engine 契约优先层

**源文件**: `src/core/contract/types.ts`, `src/core/contract/semver.ts`, `src/core/contract/diff-openapi.ts`, `src/core/contract/diff-dbschema.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `before` | `object` | 变更前的契约（OpenAPI/DBSchema/UIProps） |
| `after` | `object` | 变更后的契约 |
| `contractType` | `ContractType` | `'OpenAPI' | 'DBSchema' | 'UIProps' | 'EventSchema' | 'ConfigSchema'` |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `ContractDiff` | `ContractDiff` | `{ contractType, version, changes, breaking, requiresApproval, changelog, riskScore? }` |
| `SemVer` | `SemVer` | `{ major, minor, patch }` 版本升级 |

### 前置条件
- L6 已生成架构文件或 L4 IR 提供了契约规格
- 变更前后的契约对象均已提供

### 后置条件
- Breaking change 已检测（OpenAPI: 新增 required 字段/类型变更/删除 endpoint；DBSchema: 列类型变更/NULL→NOT NULL/删除列）
- 风险评分已计算：`50(基础) + 30(breaking) + critical×5 + removed×10 + modified×3`（上限 100）
- 自动审批判定完成（非 breaking + 新增可选字段 + 无删除 + riskScore < 20）
- SemVer 版本号已 bump

### 关键方法签名
```typescript
diffOpenAPI(before: object, after: object): OpenAPIDiff
diffDBSchema(before: object, after: object): DBSchemaDiff
bumpVersion(currentVersion: string, bumpType: BumpType): string
```

---

## L8: Adaptive Task DAG 自适应任务编排层

**源文件**: `src/harness/orchestration-harness.ts`, `src/governance/dynamic-router.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `projectId` | `string` | 项目 ID |
| `tokenBudget` | `number` | 可用 Token 预算 |
| `features` | `Feature[]` | 功能列表（用于复杂度评估） |
| `policy` | `Policy` | 待测试/部署的策略 |
| `scenario?` | `TestScenario` | 测试场景（可选） |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `TestResult` | `TestResult` | `{ passed, scenarioId, status, metrics, error?, executionTime, pValue? }` |
| `activationMode` | `'light' | 'standard' | 'full'` | 根据复杂度决定的 Harness 激活模式 |

### 前置条件
- Token 预算已确定（<50K=light, <200K=standard, ≥200K=full）
- Harness 已注册到 Orchestration Harness

### 后置条件
- 复杂度评分已计算
- 对应模式的 Harness 已激活
- 测试场景已执行（若提供）
- 消息已通过 MCP Bus 路由到目标 Harness

### 关键方法签名
```typescript
calculateComplexity(prd: AINativePRD): number
activateHarnesses(mode: ActivationMode): void
routeMessage(message: MCPMessage): Promise<void>
```

---

## L8.5: Governance Control Plane 治理控制平面

**源文件**: `src/governance/control-plane.ts`, `src/mcp/mcp-bus.ts`, `src/skills/skills-registry.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `projectId` | `string` | 项目 ID |
| `policy?` | `Policy` | 待部署策略 |
| `scenario?` | `TestScenario` | 待执行测试 |
| `skill?` | `Skill` | 待加载技能 |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `GovernanceOperation` | `GovernanceOperation` | `{ id, type, status, changeEvent?, data?, error?, timestamp }` |
| `ChangeEvent` | `ChangeEvent` | `{ id, ts, actorRoleId, action, target, ownershipRuleId, diff, riskScore?, blastRadius?, heatScore? }` |
| `TraceEdge` | `TraceEdge` | `{ id, from, to, relation, ts }` |

### 前置条件
- MCP Bus 已初始化
- Skills Registry 已就绪
- 默认角色 ID 已配置

### 后置条件
- 治理操作已执行（synthesize/deploy/test/verify/loadSkill）
- ChangeEvent 已创建并分发
- TraceEdge 已记录
- 技能已加载并通过依赖检查

### 关键方法签名
```typescript
synthesize(projectId: string, options?): Promise<GovernanceOperation>
deployPolicy(policy: Policy, canaryOptions?: CanaryOptions): Promise<GovernanceOperation>
runTest(scenario: TestScenario): Promise<GovernanceOperation>
verify(projectId: string): Promise<GovernanceOperation>
loadSkill(skill: Skill): Promise<GovernanceOperation>
```

---

## L9: Agent Operating System Agent 操作系统层

**源文件**: `src/harness/agent-harness.ts`, `src/harness/evolution-harness.ts`, `src/harness/governance-harness.ts`, `src/mcp/mcp-bus.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `MCPMessage` | `MCPMessage` | `{ protocol, id, from, to, type, payload, ttl, correlationId, schemaVersion, requiresAck }` |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `MCPResponse` | `MCPResponse` | `{ messageId, correlationId, status, payload?, error?, timestamp, from }` |
| `TestResult` | `TestResult` | Harness 测试输出 |
| `DeploymentResult` | `DeploymentResult` | Harness 部署输出 |
| `KPIOptimizationResult` | `KPIOptimizationResult` | Harness KPI 优化输出 |

### 前置条件
- 5 个 Harness 已注册（Agent/Evolution/Governance/UI-UX/Orchestration）
- MCP Bus 已启动，TTL/幂等性/订阅机制就绪
- External Review Agent 独立连接（不同数据库端口）

### 后置条件
- 消息已路由到正确的 Harness
- 幂等性保证（60 秒内相同 idempotentKey 不重复执行）
- TTL 追踪（MessageTrace 记录 hopCount + totalLatency）
- Harness 执行完成并返回结果

### MCP 消息类型
`proposal` | `query` | `command` | `feedback` | `approval` | `telemetry`

### 关键方法签名
```typescript
// AgentHarness
runTest(scenario: TestScenario): Promise<TestResult>
deployWithCanary(newPolicy: Policy, options?: CanaryOptions): Promise<DeploymentResult>
rollback(deploymentId: string): Promise<void>

// EvolutionHarness
optimizeKPIs(agentId: string, currentKPIs: AgentKPI[]): Promise<KPIOptimizationResult>
runDataFlywheel(): Promise<DataFlywheelResult>

// GovernanceHarness
runVetoCheck(changeSet: ChangeSet): Promise<VetoResult>
generateOwnershipProof(resource: ResourceKey): Promise<OwnershipProof>
```

---

## L10: Efficiency Layer 效率层

**源文件**: `src/core/guard-pipeline.ts`, `src/skills/code-quality-guard-skill.ts`, `src/skills/context-compressor-skill.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `config` | `GuardPipelineConfig` | `{ checks, scoreMode?, threshold, vetoOnCritical?, customVeto?, alertThreshold? }` |

或 Guard Skill 输入：
| 字段 | 类型 | 说明 |
|------|------|------|
| `generatedCode` | `string` | 待检查的生成代码 |
| `requirementGraph` | `RefinedGraph` | 需求图（用于语义验证） |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `GuardPipelineResult` | `GuardPipelineResult` | `{ passed, score, violations, details, vetoReason?, alert? }` |
| `GuardResult` | `GuardResult` | `{ passed, score?, reason?, details: { staticResult, semanticResult, performanceResult, policyResult } }` |
| `CompressedContext` | `CompressedContext` | `{ tokens, tokenCount, compressionRatio, truncated, droppedSections }` |

### 前置条件
- GuardPipeline 的 checks 数组已配置
- 阈值已设定（Code Quality Guard: 0.92，Policy Guard: 0.70）
- 检测模式已选择（fast/standard/thorough）

### 后置条件
- 检查已并行执行（`Promise.all`）
- 分数已按 scoreMode 计算（weighted/min/average）
- 否决规则已评估（critical violations 自动否决，sub-check failures 触发否决）
- 若分数低于 alertThreshold 但高于 threshold，生成告警

### 关键方法签名
```typescript
// GuardPipeline
execute(): Promise<GuardPipelineResult>

// CodeQualityGuardSkill
execute(ctx: { code: string; requirementGraph: RefinedGraph }): Promise<GuardResult>

// ContextCompressorSkill
execute(ctx: CompressionContext): Promise<CompressionResult>
```

---

## L11: Cognitive Integrity 认知完整性层

**源文件**: `src/skills/hallucination-guard-skill.ts`, `src/skills/citation-tracer-skill.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `context` | `VerificationContext` | `{ generatedText, sources: VerificationSource[], mode, enableGraphValidation? }` |

`VerificationSource`: `{ id, content, type: 'document'|'database'|'graph_node'|'external_api', reliability? }`

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `VerificationResult` | `VerificationResult` | `{ passed, hallucinations, verifiedStatements, overallConfidence, graphValidation? }` |

`hallucination` 条目：`{ statement, type: 'unsupported'|'contradictory'|'fabricated', confidence, suggestion? }`

### 前置条件
- 生成文本已提供
- 验证来源（sources）已配置
- 检测模式已选择（fast: 1 variant/0.7 阈值, standard: 3 variants/0.8 阈值, thorough: 5 variants/0.9 阈值）

### 后置条件
- 文本已分割为独立语句
- 自洽性检查完成（多版本生成 + 语义相似度计算）
- 来源锚定检查完成（词重叠评分）
- GraphRAG 验证已执行（若启用）
- 幻觉已分类（unsupported/fabricated/contradictory）

### 关键方法签名
```typescript
execute(ctx: VerificationContext): Promise<VerificationResult>
checkSelfConsistency(statements: string[], variants: number): Promise<Array<{ score, variants }>>
checkSourceGrounding(statements: string[], sources: VerificationSource[]): Array<{ supported, score, supportedSources }>
```

---

## L12: Long-Chain Stability 长链稳定性层

**源文件**: `src/skills/memory-consolidation-skill.ts`, `src/skills/context-compressor-skill.ts`, `src/skills/sandbox-executor.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `context` | `CompressionContext` | `{ rawTokens, tokenCount, tokenBudget, performanceMode, taskType }` |

或 Memory 操作：
| 字段 | 类型 | 说明 |
|------|------|------|
| `memoryId` | `string` | 记忆 ID |
| `content` | `string` | 记忆内容 |
| `importance?` | `number` | 重要性评分（0-1） |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `CompressedContext` | `CompressedContext` | `{ tokens, tokenCount, compressionRatio, truncated, droppedSections }` |
| `ExecutionResult` | `ExecutionResult` | `{ status, returnValue?, error?, executionTime, memoryUsed }` |
| `MemoryResult` | `{ retrieved: Memory[], pruned: string[], consolidated: Memory[] }` | 记忆操作结果 |

### 前置条件
- Token 预算已知（MAX_TOKENS = 180,000）
- 三层存储已初始化（short 24h / long 7d / cold 无限）
- 沙箱配置已设定（requirement-graph: 512MB/60s, ui-synthesis: 256MB/30s）

### 后置条件
- 上下文已压缩（分层压缩：L1 原始/L2 摘要/L3 图索引）
- 4-bit 量化已应用（16 token/cluster，压缩比 16:1）
- 记忆重要性已计算（taskImpact 40% + frequency 25% + connectivity 15% + rlReward 10% + userFeedback 10%）
- 过期记忆已按半衰期剪枝（高>0.8: 60 天，中: 30 天，低<0.5: 15 天）

### 关键方法签名
```typescript
execute(ctx: CompressionContext): Promise<CompressionResult>
consolidate(memory: Memory): Promise<Memory>
prune(threshold: number): Promise<string[]>
retrieve(query: string, topK: number): Promise<Memory[]>
```

---

## L13: Semantic Consistency 语义一致性层

**源文件**: `src/skills/policy-guard-skill.ts`, `src/skills/code-quality-guard-skill.ts`, `src/core/contract/diff-openapi.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 生成的代码 |
| `requirementGraph` | `RefinedGraph` | 需求图 |
| `contractBefore?` | `object` | 变更前契约 |
| `contractAfter?` | `object` | 变更后契约 |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `GuardResult` | `GuardResult` | `{ passed, score?, reason?, details }` |
| `ContractDiff` | `ContractDiff` | 契约差异 |
| `OwnershipCheckResult` | `OwnershipCheckResult` | `{ allowed, owningRoleId?, reason?, requiredApprovals? }` |

### 前置条件
- 代码已生成（来自 L6 或外部）
- 需求图已就绪（来自 L4）
- 所有权规则已加载
- 安全评分阈值已设定（0.70）

### 后置条件
- 安全评分已计算（基础 1.0，critical -0.30，major -0.15，minor -0.05）
- 所有权冲突已检测（多个 `// Owner:` 标记）
- API/Schema 契约差异已检测
- 安全评分 < 0.70 或有 critical 问题时代码被拒绝

### 关键方法签名
```typescript
execute(ctx: { code: string; requirementGraph: RefinedGraph }): Promise<GuardResult>
checkOwnership(code: string): OwnershipCheckResult
diffContract(before: object, after: object): ContractDiff
```

---

## L14: Simulation Layer 模拟层

**源文件**: `src/harness/agent-harness.ts`, `src/simulation/auto-decision-engine.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `scenario` | `TestScenario` | `{ id, name, type: 'unit'|'integration'|'e2e'|'load'|'chaos', config, expectedOutcomes, successCriteria }` |
| `riskProfile?` | `object` | `{ domainRisk, scaleRisk, dataRisk, complianceRisk }` |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `TestResult` | `TestResult` | `{ passed, scenarioId, status, metrics, error?, executionTime, pValue?, confidenceInterval? }` |
| `simulationLevel` | `0 | 1 | 2 | 3` | 自动决策的模拟级别 |

### 前置条件
- 测试场景已定义（类型、配置、成功标准）
- 风险评分已计算（若启用自动决策）
- 模拟环境已就绪

### 后置条件
- 模拟级别已确定（riskScore = domainRisk×0.35 + scaleRisk×0.25 + dataRisk×0.25 + complianceRisk×0.15）
- 测试已执行（ownership 检查 → 实际执行 → 显著性检验）
- A/B 显著性检验已计算（t 统计量 + p-value + Cohen's d + 95% 置信区间）
- 统计显著性未达阈值时标记失败

### 关键方法签名
```typescript
runTest(scenario: TestScenario): Promise<TestResult>
decideSimulationLevel(riskProfile: RiskProfile): number
calculateSignificance(groupA, groupB): { pValue, isSignificant, effectSize }
```

---

## L15: Runtime + Deployment 运行时与部署层

**源文件**: `src/harness/canary-deployer.ts`, `src/harness/agent-harness.ts`, `src/harness/governance-harness.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `policy` | `Policy` | `{ id, name, type, version, config, rollbackPolicy? }` |
| `options?` | `CanaryOptions` | `{ stages?, stageDurationMs?, monitorMetrics?, autoPromote?, rollbackOnFailure?, significanceCheck? }` |
| `healthCheck` | `() => Promise<boolean>` | 健康检查函数 |
| `metricsCollector` | `() => Promise<Record<string, number>>` | 指标采集函数 |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `DeploymentResult` | `DeploymentResult` | `{ deploymentId, status, currentStage?, trafficPercentage?, startTime, endTime?, metricsSummary?, rollbackInfo?, approvalStatus? }` |

### 前置条件
- 策略已通过 L13 语义一致性检查和 L10 质量检查
- External Review Agent 审核通过（若启用双层审核）
- 预算检查通过（若启用 BudgetController）

### 后置条件
- 金丝雀部署按阶段执行（默认 1% → 5% → 20% → 50% → 100%）
- 每阶段执行健康检查（error_rate < 0.05, latency_p99 < 1000ms, success_rate > 0.95）
- 触发回滚条件时自动回滚
- 部署完成或失败状态已记录

### 关键方法签名
```typescript
deploy(policy: Policy, metricsCollector, healthCheck): Promise<DeploymentResult>
rollback(deploymentId: string): Promise<void>
checkMetricsHealth(metrics: Record<string, number>): boolean
```

---

## L16: Runtime Intelligence 运行时智能层

**源文件**: `src/core/role/kpi-engine.ts`, `src/core/role/kpi-types.ts`, `src/core/role/kpi-export.ts`, `src/harness/kpi-dashboard.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `roleId` | `string` | 角色 ID |
| `window?` | `KPIWindow` | `'30m' | '2h' | '1d' | '7d'` |
| `tasks` | `Task[]` | 已完成任务列表 |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `RoleKPISnapshot` | `RoleKPISnapshot` | `{ roleId, timestamp, window, throughput, failureRate, reworkRate, queuePressure, conflictRate, driftIndex, healthScore, trend, taskCount, changeCount }` |
| `KPIAction` | `KPIAction` | `'suggest_split' | 'suggest_merge' | 'suggest_reassign' | 'alert'` |
| `BudgetAlert[]` | `BudgetAlert[]` | 预算告警列表 |

### 前置条件
- 角色已分配任务
- KPI 引擎已初始化
- 权重矩阵已加载

### 后置条件
- 6 维 KPI 已计算（throughput/failureRate/reworkRate/queuePressure/conflictRate/driftIndex）
- 健康评分已更新（基础 100 分，减去各指标加权，高吞吐量 +5）
- JSD 漂移指数已计算
- 趋势已判定（delta > +5 = improving, < -5 = degrading, 否则 stable）
- 触发动作策略已评估（queuePressure > 1.2 → 建议拆分角色等）
- 指标可导出为 Prometheus/JSONL/CSV/Grafana 格式

### 关键方法签名
```typescript
getSnapshot(roleId: string, window?: KPIWindow): RoleKPISnapshot
calculateHealthScore(metrics: Partial<RoleKPISnapshot>): number
calculateJSDrift(currentDist: number[], capabilityDist: number[]): number
evaluateActions(snapshot: RoleKPISnapshot): KPIAction[]
exportMetrics(roleId: string, format: 'prometheus' | 'jsonl' | 'csv' | 'grafana'): string
```

---

## L17: Evolution Guard 进化护栏层

**源文件**: `src/harness/evolution-harness.ts`, `src/core/evolution/framework.ts`, `src/core/evolution/offline-optimizer.ts`

### 输入
| 字段 | 类型 | 说明 |
|------|------|------|
| `proposal` | `EvolutionProposal` | `{ id, description, kpiImpact, budgetImpact, riskScore, changes: ContractDiff[] }` |
| `projectId` | `string` | 项目 ID |
| `currentKPIs` | `AgentKPI[]` | 当前 KPI 列表 |

### 输出
| 字段 | 类型 | 说明 |
|------|------|------|
| `EvolutionResult` | `EvolutionResult` | `{ approved, rejectionReason?, kpiViolations, budgetViolation? }` |
| `KPIOptimizationResult` | `KPIOptimizationResult` | `{ optimizedKPIs, improvements, errors }` |
| `DataFlywheelResult` | `DataFlywheelResult` | `{ dataPoints, modelUpdates, feedbackLoops, timestamp }` |

### 前置条件
- L16 KPI 快照已就绪
- 预算状态已知（总预算 1M tokens/天 + 样式子预算 100K tokens/天）
- 5 类 KPI 目标已配置（style_loading 99.5%, contract_change 95%, role_assignment 85%, token_budget 100%, deployment 98%）

### 后置条件
- 进化提案已评估（KPI 违规 → 拒绝，预算违规 → 拒绝）
- KPI 优化已执行（连续违规 ≥ 3 次 → 自动回滚）
- 数据飞轮已运行（数据点收集 → 模型更新 → 反馈循环）
- 经济学权重已校准（R² ≥ 0.6 + 样本增益 ≥ 0.8 才采纳）
- 外部融合启用条件已检查（projectCount ≥ 5 AND externalDataFilterAccuracy ≥ 0.92 AND sandboxIsolationPassRate == 100%）

### 关键方法签名
```typescript
evaluateProposal(proposal: EvolutionProposal): Promise<EvolutionResult>
optimizeKPIs(agentId: string, currentKPIs: AgentKPI[]): Promise<KPIOptimizationResult>
runDataFlywheel(): Promise<DataFlywheelResult>
performSelfUpgrade(buildUpgradeContext, llmGenerate): Promise<{ success, result?, error?, compressedTokens }>
```

---

## 层间数据流图

```
L1: string ──────────────────────────────────────────→ AINativePRD
  │
  ▼
L2: AINativePRD ─────────────────────────────────────→ RefinedGraph
  │
  ▼
L3: AINativePRD + RefinedGraph ──────────────────────→ VetoResult + EconomicsScore
  │                                                     (通过则继续，否则阻断)
  ▼
L4: RefinedGraph ────────────────────────────────────→ RequirementGraph → IR
  │
  ├──────────────────────────────────────────────────┐
  ▼                                                  ▼
L5: IR + Assignment ───────────────────────────────→ BudgetMetrics + KPISnapshot
  │
  ▼
L6: IR ──────────────────────────────────────────────→ BackendArchitecture + FrontendArchitecture
  │
  ▼
L7: Contract(before/after) ──────────────────────────→ ContractDiff + SemVer
  │
  ▼
L8: Policy + TestScenario ───────────────────────────→ TestResult + ActivationMode
  │
  ▼
L8.5: ChangeEvent + TraceEdge + Skill ───────────────→ GovernanceOperation
  │
  ▼
L9: MCPMessage ──────────────────────────────────────→ MCPResponse + Harness Result
  │
  ▼
L10: GuardPipelineConfig / code ─────────────────────→ GuardPipelineResult / GuardResult
  │
  ▼
L11: VerificationContext ────────────────────────────→ VerificationResult
  │
  ▼
L12: CompressionContext / Memory ────────────────────→ CompressedContext / MemoryResult
  │
  ▼
L13: code + RequirementGraph ────────────────────────→ GuardResult + ContractDiff
  │
  ▼
L14: TestScenario + RiskProfile ─────────────────────→ TestResult + SimulationLevel
  │
  ▼
L15: Policy + CanaryOptions ─────────────────────────→ DeploymentResult
  │
  ▼
L16: RoleId + Tasks ─────────────────────────────────→ RoleKPISnapshot + KPIAction
  │
  ▼
L17: EvolutionProposal ──────────────────────────────→ EvolutionResult
  │
  └──→ 反馈到 L11-L16 全链路，形成持续进化闭环
```

---

## 共享类型跨层引用

| 类型 | 定义位置 | 使用层 |
|------|----------|--------|
| `Violation` | `src/core/guard-pipeline.ts` | L3, L10, L13, L17 |
| `CheckResult` | `src/core/guard-pipeline.ts` | L3, L10, L13, L17 |
| `GuardPipelineResult` | `src/core/guard-pipeline.ts` | L3, L10, L13, L17 |
| `TestScenario` / `TestResult` | `src/harness/types.ts` | L8, L14, L15 |
| `Policy` / `DeploymentResult` | `src/harness/types.ts` | L8, L15 |
| `VetoRule` / `VetoResult` | `src/core/synthesizer/veto/veto-enforcer.ts` | L3, L9, L13 |
| `ContractDiff` / `SemVer` | `src/core/contract/types.ts` + `semver.ts` | L4, L7, L13, L17 |
| `ChangeEvent` / `TraceEdge` | `src/core/graph/types.ts` | L4, L8.5, L15 |
| `MCPMessage` / `MCPResponse` | `src/mcp/types.ts` | L8, L8.5, L9 |
| `RoleKPISnapshot` / `KPIAction` | `src/core/role/kpi-types.ts` | L5, L16, L17 |
| `EvolutionProposal` / `EvolutionResult` | `src/core/evolution/framework.ts` | L6, L17 |
| `GuardResult` | `src/skills/code-quality-guard-skill.ts` | L10, L13, L15 |
| `VerificationResult` | `src/skills/hallucination-guard-skill.ts` | L10, L11 |
| `IR` (ServiceIR/UIIR/WorkflowIR/DataIR) | `src/req-graph/graph-engine.ts` | L4, L6, L7 |
| `AINativePRD` | `src/prd/prd-parser.ts` | L1, L2, L3, L8 |
