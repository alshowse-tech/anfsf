# ASF V4.0 架构与使用指南

**版本**: v0.9.0  
**最后更新**: 2026-03-31  
**适用**: OpenClaw >= 2026.3.24

---

## 📖 一、ASF V4.0 架构概述

### 1.1 什么是 ASF V4.0?

ASF (AI Native Full-Stack Software Factory) V4.0 是一个工业化增强模块，为 OpenClaw 提供：

- 🛡️ **治理门禁** - 硬/软否决权执行，防止"智能但失控"
- 📊 **成本模型** - 经济学评分，基于成本的智能角色分配
- ⚠️ **风险预测** - 返工风险预测，提前识别问题
- ✅ **所有权证明** - Single-writer 可验证证明
- 🔄 **安全优化** - 带回滚和冷却的在线优化

### 1.2 ASF V4.0 核心模块

```
┌─────────────────────────────────────────────────────────────┐
│                    ASF V4.0 工业化增强                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 治理门禁     │  │ 成本模型     │  │ 安全优化     │      │
│  │ VetoEnforcer │  │ Economics    │  │ SafeOptimizer│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 所有权证明   │  │ 返工风险     │  │ 冲突解决     │      │
│  │ OwnershipProof│ │ ReworkRisk   │  │ ConflictResolver│   │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ 热契约分析   │  │ 接口预算     │                         │
│  │ HotContract  │  │ InterfaceBudget│                       │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ 二、ASF 17 层架构

### 2.1 完整架构图

```
┌─────────────────────────────────────────────────────────────┐
│ L17: Performance Guard    - 性能防护层                       │
├─────────────────────────────────────────────────────────────┤
│ L16: Security Guard       - 安全防护层                       │
├─────────────────────────────────────────────────────────────┤
│ L15: Regression Guard     - 回归防护层                       │
├─────────────────────────────────────────────────────────────┤
│ L14: Monitoring & Alerting - 监控告警层                      │
├─────────────────────────────────────────────────────────────┤
│ L13: Collective Intelligence - 集体智能层 ⭐                 │
├─────────────────────────────────────────────────────────────┤
│ L12: Experience Distiller  - 经验提炼层                      │
├─────────────────────────────────────────────────────────────┤
│ L11: Testing & QA         - 测试质量层                       │
├─────────────────────────────────────────────────────────────┤
│ L10: Frontend Framework   - 前端框架层                       │
├─────────────────────────────────────────────────────────────┤
│ L9: Stability Layer       - 稳定性层 (自愈) ⭐               │
├─────────────────────────────────────────────────────────────┤
│ L8: Bidirectional Sync    - 双向同步层 (Code↔Graph) ⭐       │
├─────────────────────────────────────────────────────────────┤
│ L7: Efficiency Layer      - 效率层 (优化) ⭐                 │
├─────────────────────────────────────────────────────────────┤
│ L6: Code Generation       - 代码生成层                       │
├─────────────────────────────────────────────────────────────┤
│ L5: IR Generation         - 中间代码层                       │
├─────────────────────────────────────────────────────────────┤
│ L4: Knowledge Graph       - 知识图谱层 ⭐ (ASF V4.0 核心)    │
├─────────────────────────────────────────────────────────────┤
│ L3: Governance Policy     - 治理策略层 ⭐ (ASF V4.0 核心)    │
├─────────────────────────────────────────────────────────────┤
│ L2: Requirement Validator - 需求验证层                       │
├─────────────────────────────────────────────────────────────┤
│ L1: PRD                   - 产品需求层                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 ASF V4.0 增强的层

| 层 | 名称 | ASF V4.0 增强内容 |
|----|------|------------------|
| ⭐ L4 | Knowledge Graph | 图追溯 + 热力图 + ChangeEvent |
| ⭐ L3 | Governance Policy | Veto 门禁 + Ownership Proof |
| ⭐ L7 | Efficiency | Interface Budget v2 + Economics Scoring |
| ⭐ L8 | Bidirectional Sync | Graph Patch Validator + AST Back-Write |
| ⭐ L9 | Stability | Self-Healing Probe + Repair Ticket |
| ⭐ L13 | Collective Intelligence | Experience Distiller + Memory-Graph Fusion |

---

## 🛠️ 三、ASF V4.0 工具 (8 个)

### 3.1 veto-check - 否决权检查

**功能**: 验证变更是否满足治理规则

```typescript
const result = await tools['veto-check']({
  changes: [
    { 
      resourceType: 'contract', 
      resourcePath: '/orders', 
      action: 'update' 
    }
  ],
  approvals: [
    { 
      authority: 'architect', 
      scope: 'contract:OpenAPI:*', 
      status: 'approved' 
    }
  ]
});

// 返回:
{ 
  passed: true, 
  reason?: string, 
  requiredRole?: string,
  warnings?: string[] 
}
```

**使用场景**:
- API 契约变更审批
- 架构变更审核
- 发布门禁检查

---

### 3.2 ownership-proof - 所有权证明

**功能**: 生成可验证的 single-writer ownership 证明

```typescript
const result = await tools['ownership-proof']({
  resources: [
    { type: 'contract', path: '/orders#POST', format: 'openapi' }
  ],
  roles: [
    { id: 'backend-team' }, 
    { id: 'architect' }
  ],
  rules: [] // 可选：自定义所有权规则
});

// 返回:
{ 
  proofs: [...], 
  valid: true, 
  invalidCount: 0 
}
```

**使用场景**:
- 资源所有权确认
- 责任归属追溯
- 合规审计

---

### 3.3 economics-score - 经济学评分

**功能**: 计算角色分配的经济学评分

```typescript
const score = await tools['economics-score']({
  assignment: { 
    taskToRole: { 
      'task-1': 'role-1', 
      'task-2': 'role-2' 
    } 
  },
  dag: { 
    tasks: [...], 
    edges: [...] 
  },
  roles: [
    { id: 'role-1', economics: { costPerTask: 1.0 } }
  ]
});

// 返回:
{ 
  interfaceCost: 45.5,
  bottleneck: 0.8,
  skillMatch: 0.9,
  parallelismGain: 0.7,
  totalScore: 0.75
}
```

**评分权重**:
- `interfaceCost`: -0.30 (接口成本，越低越好)
- `bottleneck`: -0.20 (瓶颈程度，越低越好)
- `skillMatch`: +0.20 (技能匹配，越高越好)
- `parallelismGain`: +0.15 (并行收益，越高越好)
- `reworkRisk`: -0.15 (返工风险，越低越好)

---

### 3.4 interface-budget - 接口预算

**功能**: 计算跨角色依赖成本

```typescript
const budget = await tools['interface-budget']({
  roleId: 'backend-team',
  assignment: { taskToRole: {...} },
  dag: { tasks: [...], edges: [...] },
  roles: [...]
});

// 返回:
{ 
  baseCost: 50,
  dependencyCost: 25,
  totalCost: 75,
  concurrentCap: 100
}
```

**接口权重**:
- `depends_on`: 1.0
- `calls`: 1.2
- `updates`: 1.4

---

### 3.5 rework-risk - 返工风险预测

**功能**: 预测任务返工风险

```typescript
const risk = await tools['rework-risk']({
  task: { 
    id: 'task-1', 
    featureId: 'feat-orders', 
    risk: 'high' 
  },
  contractChanges: [
    { 
      contractId: 'api-orders', 
      breaking: true, 
      deprecated: false 
    }
  ],
  historicalData: [...] // 可选：历史数据
});

// 返回:
{ 
  score: 0.65,        // 0-1, 越高风险越大
  factors: ['Breaking change in API contract'],
  mitigation: 'Add versioning to API contract'
}
```

---

### 3.6 hot-contract - 热契约分析

**功能**: 分析契约耦合度，建议角色数量

```typescript
const analysis = await tools['hot-contract']({
  tasks: [
    { id: 'task-1', contractIds: ['api-orders', 'db-orders'] },
    { id: 'task-2', contractIds: ['api-orders'] }
  ],
  constraints: { kMin: 2, kMax: 8 }
});

// 返回:
{ 
  theoreticalMin: 3,
  practicalMax: 6,
  optimal: 4,
  hotContracts: ['api-orders'],
  recommendation: '建议 4 个角色，api-orders 耦合度高'
}
```

---

### 3.7 conflict-resolve - 冲突解决

**功能**: 预算驱动的所有权冲突解决

```typescript
const resolution = await tools['conflict-resolve']({
  resource: { 
    id: 'api-orders', 
    type: 'OpenAPI', 
    path: '/orders' 
  },
  conflictingRoles: [
    { id: 'backend-team' }, 
    { id: 'frontend-team' }
  ],
  currentBudget: 80,
  budgetLimit: 100
});

// 返回:
{ 
  action: 'merge_roles' | 'introduce_contract',
  reason: '预算超支，建议合并角色',
  contractCost: 15
}
```

---

### 3.8 safe-optimize - 安全在线优化

**功能**: 带回滚和冷却的安全优化

```typescript
const result = await tools['safe-optimize']({
  current: { roles: [...], assignment: {...} },
  metrics: {
    failureRate: 0.15,
    previewFailures: 1,
    queueLength: 10,
    utilization: 0.25,
    interfaceCost: 75,
    budget: 100
  },
  projectId: 'project-alpha'
});

// 返回:
{ 
  optimized: true,
  knobApplied: 'roleCountDelta',
  rolledBack: false,
  cooldownUntil: '2026-03-31T16:30:00Z'
}
```

**安全机制**:
- 冷却时间：30 分钟
- 失败阈值：2 次
- 自动回滚：启用

---

## 💻 四、CLI 命令 (6 个)

### 4.1 asf:status - 检查状态

```bash
asf:status
```

**输出示例**:
```
ASF V4.0 Skill Status
=====================
Version: v0.9.0
Status: ✅ Active

Tools: 8/8 ready
Commands: 6/6 ready

Performance:
  Memory: 38MB (<50MB ✅)
  Latency: 50ms (<100ms ✅)
  CPU: 2% (<5% ✅)
```

---

### 4.2 asf:veto - 运行否决检查

```bash
asf:veto --changes='[{"resourceType":"contract","resourcePath":"/orders","action":"update"}]' \
         --approvals='[{"authority":"architect","scope":"contract:OpenAPI:*","status":"approved"}]'
```

---

### 4.3 asf:proof - 生成所有权证明

```bash
asf:proof --resources='[{"type":"contract","path":"/orders#POST","format":"openapi"}]' \
          --roles='[{"id":"backend-team"},{"id":"architect"}]'
```

---

### 4.4 asf:score - 计算经济学评分

```bash
asf:score --assignment='{"taskToRole":{"task-1":"role-1"}}' \
          --dag='{"tasks":[...],"edges":[...]}' \
          --roles='[{"id":"role-1"}]'
```

---

### 4.5 asf:risk - 预测返工风险

```bash
asf:risk --task='{"id":"task-1","featureId":"feat-orders"}' \
         --changes='[{"contractId":"api-orders","breaking":true}]'
```

---

### 4.6 asf:hot-contracts - 分析热契约

```bash
asf:hot-contracts --tasks='[{"id":"task-1","contractIds":["api-orders","db-orders"]}]'
```

---

## ⚙️ 五、配置选项

### 5.1 配置文件位置

`skills/asf-v4/config/asf-v4.config.yaml`

### 5.2 完整配置示例

```yaml
# ==================== Veto 配置 ====================
veto:
  mode: default  # default | strict | custom
  rules:
    - id: "api-change-approval"
      scope: "contract:OpenAPI:*"
      requiredAuthority: "architect"
      type: "hard"  # hard | soft

# ==================== 经济学评分权重 ====================
economics:
  interfaceWeights:
    depends_on: 1.0
    calls: 1.2
    updates: 1.4
  scoreWeights:
    interfaceCost: -0.30    # 接口成本 (负向)
    bottleneck: -0.20       # 瓶颈程度 (负向)
    skillMatch: 0.20        # 技能匹配 (正向)
    parallelismGain: 0.15   # 并行收益 (正向)
    reworkRisk: -0.15       # 返工风险 (负向)

# ==================== 优化器配置 ====================
optimizer:
  enabled: true
  cooldownMs: 1800000  # 30 分钟
  failureThreshold: 2
  knobs:
    roleCountDelta: true      # 角色数量调整
    budgetMultiplier: true    # 预算倍数调整
    assignmentSwap: true      # 任务交换
  rollback:
    enabled: true
    autoRollbackOnFailure: true

# ==================== 监控配置 ====================
monitoring:
  enabled: true
  metrics:
    - veto_enforcement_count
    - ownership_proof_count
    - economics_score_avg
    - rework_risk_avg
    - optimization_count
  alerts:
    - high_rework_risk
    - budget_exceeded
    - optimization_failure
```

---

## 🔗 六、OpenClaw 集成

### 6.1 添加到 openclaw.json

```json
{
  "skills": {
    "local": [
      "/root/.openclaw/workspace-main/skills/asf-v4"
    ]
  },
  "tools": {
    "alsoAllow": [
      "asf_v4"
    ]
  },
  "plugins": {
    "entries": {
      "asf-v4": {
        "enabled": true,
        "config": {
          "vetoMode": "default",
          "economicsWeights": "default",
          "safeOptimizer": true
        }
      }
    }
  }
}
```

### 6.2 启用技能

```bash
# 重启 Gateway
systemctl restart openclaw-gateway.service

# 验证技能状态
openclaw skills list | grep asf-v4
```

---

## 📚 七、使用场景

### 场景 1: API 变更治理

```typescript
// 1. 检查变更是否通过 veto
const vetoResult = await tools['veto-check']({
  changes: [{ resourceType: 'contract', resourcePath: '/api/orders', action: 'update' }],
  approvals: [{ authority: 'architect', scope: 'contract:OpenAPI:*', status: 'approved' }]
});

if (!vetoResult.passed) {
  throw new Error(`Veto failed: ${vetoResult.reason}`);
}

// 2. 生成所有权证明
const proof = await tools['ownership-proof']({
  resources: [{ type: 'contract', path: '/api/orders#POST', format: 'openapi' }],
  roles: [{ id: 'backend-team' }]
});

// 3. 评估返工风险
const risk = await tools['rework-risk']({
  task: { id: 'task-api-update', featureId: 'feat-orders' },
  contractChanges: [{ contractId: 'api-orders', breaking: false }]
});

console.log(`Rework risk: ${risk.score} (${risk.factors.join(', ')})`);
```

---

### 场景 2: 角色分配优化

```typescript
// 1. 分析热契约
const hotContracts = await tools['hot-contract']({
  tasks: projectTasks,
  constraints: { kMin: 2, kMax: 8 }
});

console.log(`Optimal role count: ${hotContracts.optimal}`);

// 2. 计算当前分配的经济学评分
const currentScore = await tools['economics-score']({
  assignment: currentAssignment,
  dag: taskDag,
  roles: availableRoles
});

// 3. 计算接口预算
const budget = await tools['interface-budget']({
  roleId: 'backend-team',
  assignment: currentAssignment,
  dag: taskDag,
  roles: availableRoles
});

if (budget.totalCost > budget.concurrentCap) {
  console.warn('Budget exceeded! Consider restructuring roles.');
}

// 4. 安全优化
const optimized = await tools['safe-optimize']({
  current: { roles: availableRoles, assignment: currentAssignment },
  metrics: {
    failureRate: 0.1,
    interfaceCost: budget.totalCost,
    budget: budget.concurrentCap
  },
  projectId: 'project-alpha'
});
```

---

### 场景 3: 冲突解决

```typescript
// 检测所有权冲突
const conflict = await tools['conflict-resolve']({
  resource: { id: 'api-orders', type: 'OpenAPI', path: '/orders' },
  conflictingRoles: [
    { id: 'backend-team' },
    { id: 'frontend-team' }
  ],
  currentBudget: 80,
  budgetLimit: 100
});

if (conflict.action === 'merge_roles') {
  console.log('建议合并角色:', conflict.reason);
} else if (conflict.action === 'introduce_contract') {
  console.log('建议引入契约，成本:', conflict.contractCost);
}
```

---

## 📊 八、性能基准

| 指标 | 目标 | 实测 | 状态 |
|------|------|------|------|
| 内存占用 | <50MB | 38MB | ✅ |
| 启动时间 | <500ms | 400ms | ✅ |
| Tool 响应 (P95) | <100ms | 50ms | ✅ |
| CPU 影响 | <5% | 2% | ✅ |
| Memory Write (P95) | <5ms | 3ms | ✅ |
| Memory Read (P95) | <10ms | 8ms | ✅ |
| Agent Status (P95) | <5ms | 4ms | ✅ |

---

## 🔒 九、安全审计

### 9.1 审计项

| 类别 | 检查项 | 通过 |
|------|--------|------|
| 代码安全 | 5 项 | ✅ 5/5 |
| 权限控制 | 5 项 | ✅ 5/5 |
| 数据隔离 | 3 项 | ✅ 3/3 |
| 审计日志 | 3 项 | ✅ 3/3 |
| 安全优化 | 4 项 | ✅ 4/4 |
| 依赖安全 | 3 项 | ✅ 3/3 |

**总分**: 23/23 (100%)

### 9.2 安全特性

- ✅ 所有工具输入验证
- ✅ 操作审计日志记录
- ✅ 数据访问权限控制
- ✅ 冷却时间防止滥用
- ✅ 自动回滚保护

---

## 📖 十、相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| PRD | `PRD.md` | 产品需求文档 |
| API 参考 | `docs/ROLE-SYNTHESIZER-v0.9.0.md` | 详细 API 文档 |
| 部署指南 | `DEPLOYMENT-GUIDE.md` | 生产部署指南 |
| Phase 1 完成 | `PHASE-1-COMPLETE.md` | Phase 1 报告 |
| Phase 2 完成 | `PHASE-2-COMPLETE.md` | Phase 2 报告 |
| Phase 3 完成 | `PHASE-3-COMPLETE.md` | Phase 3 报告 |

---

## 🆘 十一、故障排查

### 问题 1: 技能未加载

```bash
# 检查技能配置
cat ~/.openclaw/openclaw.json | grep asf-v4

# 重启 Gateway
systemctl restart openclaw-gateway.service

# 查看日志
journalctl -u openclaw-gateway.service -n 50
```

### 问题 2: Tool 调用失败

```bash
# 检查工具注册
openclaw skills list | grep asf-v4

# 测试命令
asf:status

# 查看详细错误
journalctl -u openclaw-gateway.service --since "5 minutes ago"
```

### 问题 3: 性能问题

```bash
# 检查内存占用
ps aux | grep openclaw-gateway

# 检查 CPU 使用
top -p $(pgrep openclaw-gateway)

# 优化配置：增加冷却时间
# 编辑 config/asf-v4.config.yaml
# optimizer.cooldownMs: 3600000  # 1 小时
```

---

## 📞 十二、支持

- **文档**: `/root/.openclaw/workspace-main/skills/asf-v4/README.md`
- **问题反馈**: GitHub Issues
- **社区**: Discord https://discord.com/invite/clawd

---

**最后更新**: 2026-03-31  
**维护者**: ASF V4.0 Team  
**许可证**: MIT
