---
name: anfsf-v1
description: AI Native Full-Stack Software Factory V1.0 - 工业化增强模块 (治理门禁 + 成本模型 + 安全优化)。提供否决权执行、所有权证明、经济学评分、返工风险预测、安全在线优化等工业级能力。
metadata: { "openclaw": { "emoji": "🏭", "requires": { "bins": ["node"] } } }
---

# AI Native Full-Stack Software Factory V1.0 - 工业化增强模块

**架构版本**: V1.0.0  
**OpenClaw 兼容性**: >=2026.3.24

---

## 功能说明

ASF V4.0 为 OpenClaw 提供工业级治理和优化能力：

- **否决权执行** - 硬/软否决规则验证变更
- **所有权证明** - 可验证的 single-writer 证明
- **经济学评分** - 基于成本的角色分配优化
- **返工风险** - 预测性风险分析
- **安全优化器** - 带回滚保护的在线优化

---

## 工具

| 工具 | 说明 |
|------|------|
| `veto-check` | 检查变更是否通过硬/软否决规则 |
| `ownership-proof` | 生成可验证的所有权证明 |
| `economics-score` | 计算角色分配经济学评分 |
| `interface-budget` | 计算跨角色依赖成本 |
| `rework-risk` | 预测任务返工风险 |
| `hot-contract` | 分析契约耦合度并建议角色数量 |
| `conflict-resolve` | 解决所有权冲突 |
| `safe-optimize` | 安全在线优化 |

---

## 命令

| 命令 | 说明 |
|------|------|
| `asf:status` | 检查 ASF V4.0 状态 |
| `asf:veto` | 运行否决检查 |
| `asf:proof` | 生成所有权证明 |
| `asf:score` | 计算经济学评分 |
| `asf:risk` | 预测返工风险 |
| `asf:hot-contracts` | 分析热契约 |

---

## 使用示例

```bash
# 检查状态
asf:status

# 运行否决检查
asf:veto --changes='[{"resourceType":"contract","resourcePath":"/orders","action":"update"}]'

# 生成所有权证明
asf:proof --resources='[{"type":"contract","path":"/orders#POST"}]' --roles='[{"id":"backend-team"}]'

# 计算经济学评分
asf:score --assignment='{"taskToRole":{"task-1":"role-1"}}' --dag='{"tasks":[],"edges":[]}' --roles='[{"id":"role-1"}]'

# 预测返工风险
asf:risk --task='{"id":"task-1","risk":"high"}' --changes='[{"contractId":"api-orders","breaking":true}]'

# 分析热契约
asf:hot-contracts --tasks='[{"id":"task-1","contractIds":["api-orders","db-orders"]}]'
```

---

## 架构影响

激活 AI Native Full-Stack Software Factory V1.0 后，17 层架构获得以下增强：

1. **Layer 3 (Input Governance)** - 否决门禁和冲突解决
2. **Layer 4 (Requirement Graph)** - 变更追溯和热力图
3. **Layer 8 (Adaptive DAG)** - 动态任务图和失败重规划
4. **Layer 9 (Agent OS)** - 角色 KPI 仪表板和 Agent 通信
5. **Layer 12 (Long-Chain Stability)** - Budgeted Reasoning 和安全 RLM
6. **Layer 13 (Semantic Consistency)** - 契约语义化 diff
7. **Layer 16 (Runtime Intelligence)** - 自动回滚和进化守卫
8. **Layer 17 (Evolution Guard)** - 回归检测和风险评分

---

## 许可证

MIT License
