# 📈 股票操盘模拟系统

**版本**: V1.0  
**状态**: Phase 1-4 开发完成，Phase 5 前端开发中  
**技术栈**: Python + FastAPI + PostgreSQL + Redis + Backtrader + Vue 3

---

## 🎯 项目目标

构建一个基于 V7.5 交易规则的股票操盘模拟系统，实现：
- ✅ 白名单驱动的操盘区管理
- ✅ 分钟级实时信号生成
- ✅ 日终全量回测与次日计划
- ✅ 分钟级回补触发逻辑
- ⏳ 前端监控看板与告警中心

---

## 📊 开发进度

| Phase | 内容 | 周期 | 状态 | 完成度 |
|-------|------|------|------|--------|
| **Phase 1** | 数据接入层 | 第 1-2 周 | ✅ 完成 | 100% |
| **Phase 2** | 指标计算引擎 | 第 3-4 周 | ✅ 完成 | 100% |
| **Phase 3** | 回测引擎 (Backtrader) | 第 5-6 周 | ✅ 完成 | 100% |
| **Phase 4** | 分钟级回补与实时信号 | 第 7-8 周 | ✅ 完成 | 100% |
| **Phase 5** | 前端看板 + 告警中心 | 第 9-10 周 | ⏳ 进行中 | 60% |

---

## 📁 项目结构

```
stock-trading-simulator/
├── backend/
│   ├── phase1_data_access.py      # 数据接入层 (AkShare/TuShare)
│   ├── phase2_indicators.py       # 指标计算引擎 (RPS/ATR/MACD)
│   ├── phase3_backtrader.py       # 回测引擎
│   ├── phase3_backtrader_simple.py # 简化版回测
│   └── phase4_realtime.py         # 实时信号生成
├── fastapi/
│   └── APISPEC.md                 # FastAPI 接口清单
├── frontend/
│   └── (待开发)                    # Vue 3 前端项目
├── sql/
│   ├── schema.sql                 # PostgreSQL 建表 SQL
│   └── data-import.sql            # 数据导入脚本
└── docs/
    ├── scheduling.md              # 实时 + 日终双同步调度方案
    └── frontend-dashboard-design.md # 前端看板设计文档
```

---

## 🔧 核心功能

### 1. 白名单管理
- 初始化/修正/查询白名单版本
- 优先级管理 (核心/重要/普通)
- 版本控制与归档

### 2. 交易任务调度
- **午间任务** (11:30): 分钟级指标计算 + 信号生成
- **日终任务** (15:00): 全量因子重算 + 次日计划

### 3. V7.5 规则引擎
- B001: 超级主线过滤 (RPS 10/20/50 > 90)
- B002: 形态拦截 (放量突破/窄幅横盘)
- M001: 仓位管理 (单票≤40%, 非主线≤20%)
- S001/S002: 止损规则 (平台破位/ATR)
- T001-T003: 止盈规则 (MA5 分批)
- R001: 回补规则 (15 分钟窗口)

### 4. 实时信号推送
- WebSocket 实时推送
- 信号去抖动 (5 分钟窗口)
- 信号强度评分 (0-1)

---

## 🗄️ 数据库设计

### 核心表
| 表名 | 用途 | 数据量级 |
|------|------|----------|
| `symbol_master` | 股票基础信息 | ~5000 |
| `market_bar_1m` | 分钟级行情 | ~1000 万/月 |
| `market_bar_1d` | 日线行情 | ~500 万 |
| `factor_rps` | RPS 因子 | ~500 万 |
| `factor_atr` | ATR 因子 | ~500 万 |
| `trade_signal` | 交易信号 | ~10 万/月 |
| `trading_order` | 模拟委托 | ~10 万/月 |
| `position_account` | 持仓与账户 | ~1000 |
| `rule_hit_log` | 规则命中日志 | ~100 万/月 |

---

## 🚀 快速开始

### 1. 数据库初始化
```bash
psql -U postgres -d stock_trading -f sql/schema.sql
psql -U postgres -d stock_trading -f sql/data-import.sql
```

### 2. 安装依赖
```bash
pip install fastapi uvicorn pandas numpy redis psycopg2-binary akshare tusshare
```

### 3. 启动服务
```bash
# 启动 Redis
redis-server

# 启动 FastAPI
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 访问文档
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 📋 下一步开发 (Phase 5)

### 第 9 周：前端基础 + 实时监控
- [ ] Day 1-2: Vue 3 项目初始化 + UI 框架
- [ ] Day 3-4: 实时监控页 + 规则命中页
- [ ] Day 5: 单元测试 + 重构

### 第 10 周：分析页面 + 告警中心
- [ ] Day 1-2: 回测对比页 + 个股诊断页
- [ ] Day 3-4: 告警中心 + 审计日志页
- [ ] Day 5: 集成测试 + 预发布

---

## 📞 联系方式

**项目负责人**: 格格 👸  
**技术栈**: Python + FastAPI + Vue 3 + PostgreSQL  
**部署环境**: 本地部署 (Huawei 主机)

---

**最后更新**: 2026-04-23 09:23  
**下次检查**: Phase 5 前端开发启动
