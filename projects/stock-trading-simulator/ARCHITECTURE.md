# 🏛️ 股票操盘模拟系统 - ANFSF V1.5 架构

**版本**: V2.0 (ANFSF 重构版)  
**架构**: AI Native Full-Stack Software Factory V1.5.0  
**完成时间**: 2026-04-23  
**状态**: 🏗️ 重构中

---

## 📐 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 8.5 治理控制平面                          │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   MCP 总线      │  │  Skills Registry│  │ Harness Registry│  │
│  │  (Message Bus)  │  │   (技能注册)     │  │  (Harness 注册)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Orchestration   │ │   Evolution     │ │   UI/UX         │
│ Harness         │ │   Harness       │ │   Harness       │
│ (编排调度)       │ │ (自我进化)       │ │ (前端界面)       │
│                 │ │                 │ │                 │
│ • Agent Router  │ │ • KPI Collector │ │ • Dashboard     │
│ • Task Splitter │ │ • A/B Tester    │ │ • Components    │
│ • Context Mgr   │ │ • Optimizer     │ │ • Templates     │
│ • Stock API     │ │ • Metrics       │ │ • Charts        │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Governance     │
                    │  Harness        │
                    │  (治理控制)       │
                    │                 │
                    │ • Veto Engine   │
                    │ • Policy Check  │
                    │ • Safety Guard  │
                    │ • Audit Log     │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Data Layer    │
                    │   (数据层)       │
                    │                 │
                    │ • PostgreSQL    │
                    │ • Redis         │
                    │ • AkShare       │
                    └─────────────────┘
```

---

## 🏗️ Harness 详解

### 1. Orchestration Harness (编排调度)

**职责**: 任务编排、API 路由、上下文管理

**核心组件**:
```python
harness/orchestration/
├── agent_router.py      # Agent 路由
├── task_splitter.py     # 任务拆分
├── context_manager.py   # 上下文管理
├── stock_api.py         # 股票 API
└── trading_api.py       # 交易 API
```

**功能**:
- 请求路由到正确的 Handler
- 任务拆分和并行执行
- 上下文传递和管理
- API 端点暴露

---

### 2. Evolution Harness (自我进化)

**职责**: 性能监控、A/B 测试、自动优化

**核心组件**:
```python
harness/evolution/
├── kpi_collector.py     # KPI 收集
├── ab_tester.py         # A/B 测试
├── optimizer.py         # 自动优化
├── metrics.py           # 指标计算
└── feedback_loop.py     # 反馈循环
```

**功能**:
- 自动收集 KPI 指标
- 执行 A/B 测试
- 分析优化机会
- 自动应用优化

**KPI 指标**:
| 指标 | 说明 | 目标值 |
|------|------|--------|
| API 响应时间 | 平均响应时间 | <100ms |
| 缓存命中率 | 缓存命中比例 | >90% |
| 信号准确率 | 交易信号准确度 | >85% |
| 规则命中率 | 规则触发准确度 | >90% |

---

### 3. UI/UX Harness (前端界面)

**职责**: 前端组件、图表、用户交互

**核心组件**:
```typescript
harness/ui-ux/
├── components/          # Vue 组件
├── charts/              # ECharts 图表
├── templates/           # 页面模板
├── styles/              # 样式
└── interactions/        # 交互逻辑
```

**功能**:
- 6 个核心页面
- ECharts 图表渲染
- 实时数据更新
- 用户交互处理

---

### 4. Governance Harness (治理控制)

**职责**: 规则检查、安全护栏、审计日志

**核心组件**:
```python
harness/governance/
├── veto_engine.py       # Veto 引擎
├── policy_checker.py    # Policy 检查
├── safety_guard.py      # 安全护栏
└── audit_logger.py      # 审计日志
```

**功能**:
- Veto 规则执行
- Policy 合规检查
- 安全护栏触发
- 审计日志记录

**Veto 规则示例**:
```python
VETO_RULES = {
    'max_position_per_stock': 0.4,  # 单票最大 40%
    'max_non_mainline': 0.2,  # 非主线最大 20%
    'max_total_position': 0.8,  # 总仓位最大 80%
    'stop_loss_threshold': -0.05,  # 止损阈值 -5%
}
```

---

## 🔌 Layer 8.5 集成

### MCP 总线 (Message Communication Protocol)

**功能**: Harness 间通信

**消息类型**:
```python
class MCPMessage:
    type: str  # request/response/event
    source: str  # 发送方 Harness
    target: str  # 接收方 Harness
    payload: dict
    timestamp: str
```

**通信示例**:
```python
# Orchestration → Governance (Policy 检查)
message = MCPMessage(
    type="request",
    source="orchestration",
    target="governance",
    payload={
        "action": "check_policy",
        "trade": {"symbol": "300308.SZ", "quantity": 1000}
    }
)

# Governance → Orchestration (检查结果)
response = MCPMessage(
    type="response",
    source="governance",
    target="orchestration",
    payload={
        "approved": True,
        "veto": False,
        "reason": "Policy check passed"
    }
)
```

### Skills Registry (技能注册)

**注册的技能**:
| 技能 | 说明 | 状态 |
|------|------|------|
| stock_info | 股票信息查询 | ✅ |
| technical_analysis | 技术分析 | ✅ |
| trading_signal | 交易信号生成 | ✅ |
| risk_assessment | 风险评估 | ✅ |
| ai_analysis | AI 分析 | ✅ |

### Harness Registry (Harness 注册)

**注册的 Harness**:
| Harness | 端点 | 状态 |
|---------|------|------|
| Orchestration | /harness/orchestration | ✅ |
| Evolution | /harness/evolution | ✅ |
| UI/UX | /harness/ui-ux | ✅ |
| Governance | /harness/governance | ✅ |

---

## 🔄 自我进化闭环

```
┌─────────────────────────────────────────────────────────┐
│                    自我进化闭环                           │
│                                                         │
│  1. 收集 KPI ──→ 2. 分析 ──→ 3. 生成假设 ──→ 4. A/B 测试  │
│      ▲                                              │   │
│      │                                              ▼   │
│      └────────────────── 5. 应用优化 ◀─────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**进化流程**:
1. **收集 KPI**: 自动收集性能指标
2. **分析**: 识别优化机会
3. **生成假设**: 提出优化方案
4. **A/B 测试**: 验证优化效果
5. **应用优化**: 自动应用有效优化

---

## 🛡️ 治理控制

### Veto 引擎

**硬 Veto** (必须遵守):
- 单票仓位 ≤ 40%
- 非主线仓位 ≤ 20%
- 总仓位 ≤ 80%

**软 Veto** (建议遵守):
- RPS(10/20/50) > 90
- 站上 5 日线
- 非 ST/非停牌

### Policy 检查器

**检查项**:
- 股票代码有效性
- 交易时间合规性
- 仓位限制合规性
- 风控规则合规性

### 安全护栏

**护栏规则**:
- 单笔交易金额 ≤ 50 万
- 日交易次数 ≤ 20
- API 调用频率 ≤ 100 次/分钟

---

## 📊 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │Orchestration│ │  Evolution  │ │   UI/UX     │      │
│  │   Harness   │ │   Harness   │ │   Harness   │      │
│  │   :8001     │ │   :8002     │ │   :80       │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ Governance  │ │    MCP      │ │   Layer     │      │
│  │   Harness   │ │    Bus      │ │    8.5      │      │
│  │   :8003     │ │   :8004     │ │   :8005     │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐                       │
│  │ PostgreSQL  │ │    Redis    │                       │
│  │   :5432     │ │   :6379     │                       │
│  └─────────────┘ └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 重构进度

| 阶段 | 任务 | 状态 | 完成度 |
|------|------|------|--------|
| Phase 1 | Harness 分离 | ⏳ | 0% |
| Phase 2 | Layer 8.5 集成 | ⏳ | 0% |
| Phase 3 | 自我进化闭环 | ⏳ | 0% |
| Phase 4 | 治理控制 | ⏳ | 0% |
| Phase 5 | 测试验证 | ⏳ | 0% |

**总体进度**: 0%

---

**签字**: 格格 👸  
**日期**: 2026-04-23  
**版本**: V2.0 (ANFSF 重构版)
