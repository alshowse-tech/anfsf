# Phase 5: 前端看板 + 告警中心 (第 9-10 周)

## 5.1 实时监控页

### 组件结构

```
RealTimeDashboard/
├── Header/
│   ├── Timestamp          # 当前时间
│   ├── MarketStatus       # 市场状态 (开/闭/盘中)
│   └── AccountSummary     # 账户概览 (总资产/当日盈亏/收益率)
├── MainChart/
│   ├── PriceChart         # K线图 (15分钟粒度)
│   ├── IndicatorOverlay   # 指标叠加 (RPS/MA/ATR)
│   └── SignalMarkers      # 信号标记 (Buy/Sell/Rebuy)
├── SidePanel/
│   ├── CurrentPositions   # 当前持仓
│   │   ├── StockList
│   │   └── PositionDetails
│   ├── ActiveSignals      # 活跃信号
│   │   ├── SignalQueue
│   │   └── SignalDetail
│   └── RiskMetrics        # 风控指标
│       ├── PositionRisk   # 仓位风险
│       ├── StopLossCount  # 止损次数
│       └── DrawdownChart  # 回撤曲线
└── BottomPanel/
    ├── RecentTrades       # 最近交易
    ├── RecentSignals      # 最近信号
    └── SystemStatus       # 系统状态
```

### 数据接口

```typescript
// API: /api/dashboard/realtime
interface RealTimeDashboardData {
  account: {
    total_assets: number;
    cash_balance: number;
    market_value: number;
    daily_profit: number;
    daily_return_rate: number;
    overall_return_rate: number;
  };
  
  positions: Array<{
    symbol: string;
    name: string;
    quantity: number;
    cost_price: number;
    current_price: number;
    market_value: number;
    profit_loss: number;
    profit_rate: number;
    position_pct: number;
    is_mainline: boolean;
    is_auto_rebuy: boolean;
  }>;
  
  signals: Array<{
    signal_id: string;
    symbol: string;
    signal_type: 'BUY' | 'SELL' | 'HOLD';
    signal_reason: string;
    signal_strength: number;
    signal_time: string;
    status: 'pending' | 'executed';
  }>;
  
  risk_metrics: {
    position_risk: number;  // 当前仓位风险比例
    stop_loss_count: number;
    max_drawdown: number;
    current_drawdown: number;
  };
}
```

---

## 5.2 规则命中页

### 组件结构

```
RuleHitDashboard/
├── Header/
│   └── RuleFilter           # 规则筛选 (类型/日期/股票)
├── RuleList/
│   ├── MainlineFilter       # 超级主线过滤器
│   │   └── B001_RuleEntry
│   ├── PatternDetection     # 形态检测
│   │   ├── B002_Breakout
│   │   └── B003_Consolidation
│   ├── PositionControl      # 仓位管理
│   │   └── M001_PositionLimit
│   ├── StopLoss             # 止损
│   │   ├── S001_Platform
│   │   └── S002_ATR
│   ├── TakeProfit           # 止盈
│   │   ├── T001_MA5
│   │   ├── T002_MA5_2nd
│   │   └── T003_MA10
│   └── Rebuy                # 回补
│       └── R001_RebuyWindow
└── HitDetails/
    ├── RuleInfo             # 规则详情
    ├── TriggerTime          # 触发时间
    ├── StockDetails         # 股票详情
    └── SupportingData       # 支撑数据 (RPS/MA/成交量)
```

### 数据接口

```typescript
// API: /api/rules/hits
interface RuleHitLog {
  rule_id: string;           // B001, B002, S001 ...
  rule_name: string;         // 超级主线过滤, 放量突破 ...
  rule_type: string;         // filter, pattern, stop_loss ...
  symbol: string;
  trade_date: string;
  trigger_time: string;
  trigger_reason: string;    // RPS(10/20/50) > 90
  supporting_data: {
    rps_10: number;
    rps_20: number;
    rps_50: number;
    price: number;
    volume: number;
    ma_5: number;
    ma_10: number;
  };
  is_valid: boolean;         // 规则是否有效
}
```

---

## 5.3 回测对比页

### 组件结构

```
BacktestCompareDashboard/
├── Header/
│   ├── TimeRangeSelector    # 时间范围选择
│   └── StrategySelector     # 策略选择
├── MainCharts/
│   ├── EquityCurve          # 净值曲线
│   ├── DrawdownChart        # 回撤曲线
│   └── ReturnDistribution   # 收益分布
├── KeyMetrics/
│   ├── TotalReturn          # 累计收益
│   ├── AnnualizedReturn     # 年化收益
│   ├── SharpeRatio          # 夏普比率
│   ├── SortinoRatio         # 索提诺比率
│   ├── MaxDrawdown          # 最大回撤
│   ├── WinRate              # 胜率
│   └── ProfitFactor         # 盈亏比
├── TradeAnalysis/
│   ├── TradeCount           # 交易次数
│   ├── AvgTradeReturn       # 平均收益
│   ├── BestTrade            # 最佳交易
│   └── WorstTrade           # 最差交易
└── MonthlyReturns/
    ├── MonthlyBarChart      # 月度收益柱状图
    └── RollingMetrics       # 滚动指标
```

### 数据接口

```typescript
// API: /api/backtest/compare
interface BacktestMetrics {
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_capital: number;
  
  // 核心指标
  total_return_rate: number;      // 累计收益率 %
  annualized_return: number;      // 年化收益率 %
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;           // 最大回撤 %
  win_rate: number;               // 胜率 %
  profit_factor: number;
  
  // 交易统计
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  avg_win: number;
  avg_loss: number;
  
  // 月度收益
  monthly_returns: Array<{
    month: string;
    return_rate: number;
    cumulative: number;
  }>;
}
```

---

## 5.4 个股诊断页

### 组件结构

```
StockDiagnostics/
├── Header/
│   ├── StockSelector        # 股票选择器
│   └── DateSelector         # 诊断日期
├── MainSection/
│   ├── StockInfo            # 股票基本信息
│   │   ├── Symbol
│   │   ├── Name
│   │   ├── Sector
│   │   └── Industry
│   ├── RPSStats             # RPS 指标
│   │   ├── RPS_10 ('95.5')
│   │   ├── RPS_20 ('92.3')
│   │   ├── RPS_50 ('88.1')
│   │   └── RPS_Rank ('Top 15%')
│   ├── TechnicalIndicators  # 技术指标
│   │   ├── ATR_14 ('3.2')
│   │   ├── MACD ('0.8/0.5/-0.6')
│   │   ├── RSI_14 ('65.2')
│   │   └── KDJ ('73/72/75')
│   ├── MovingAverages       # 均线系统
│   │   ├── MA_5 ('128.0')
│   │   ├── MA_10 ('126.0')
│   │   ├── MA_20 ('124.0')
│   │   └── PricePosition    # 价格位置
│   └── FormPattern          # 形态检测
│       ├── NarrowConsolidation
│       ├── Breakout
│       └── Tendency         # 趋势
├── TradingRecommendation/
│   ├── Action ('持有/买入/卖出')
│   ├── Rationale            # 建议理由
│   ├── StopLoss             # 止损位
│   ├── TakeProfit           # 止盈位
│   └── RebuyCondition       # 回补条件
└── RiskAssessment/
    ├── ComprehensiveScore   # 综合评分 (85.5)
    ├── RiskLevel ('低')
    ├── RiskFactors          # 风险因素
    └── ComplianceCheck      # 合规检查
```

### 数据接口

```typescript
// API: /api/stocks/{symbol}/diagnostics
interface StockDiagnostics {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  
  // RPS 指标
  rps_stats: {
    rps_10: number;
    rps_20: number;
    rps_50: number;
    rps_rank_10: number;
    rps_rank_20: number;
    rps_rank_50: number;
    is_mainline: boolean;
  };
  
  // 技术指标
  indicators: {
    atr_14: number;
    macd: { diff: number; dea: number; bar: number };
    rsi_14: number;
    kdj: { k: number; d: number; j: number };
    ma: { 5: number; 10: number; 20: number };
    price_pos_ma_5: number;
    price_pos_ma_10: number;
  };
  
  // 形态检测
  form_pattern: {
    narrow_consolidation: {
      is_consolidation: boolean;
      consolidation_days: number;
      price_range: number;
      volume_trend: 'decreasing' | 'stable' | 'increasing';
    };
    breakout: {
      is_breakout: boolean;
      breakout_type: '放量突破' | '温和突破' | '无突破';
      breakout_price: number;
      breakout_volume_ratio: number;
    };
  };
  
  // 交易建议
  recommendation: {
    action: '持有' | '买入' | '卖出' | '观察';
    rationale: string[];
    stop_loss: number;
    take_profit: number;
    rebuy_condition: string;
    hold_days: number;
  };
  
  // 风险评估
  risk_assessment: {
    comprehensive_score: number;
    risk_level: '低' | '中' | '高';
    risk_factors: string[];
    compliance_check: {
      is_st: boolean;
      is_suspended: boolean;
      has_major_shareholder_reduction: boolean;
    };
  };
}
```

---

## 5.5 审计日志页

### 组件结构

```
AuditLogDashboard/
├── Header/
│   ├── FilterPanel          # 筛选面板
│   │   ├── DateRange
│   │   ├── UserSelector
│   │   ├── ModuleSelector
│   │   └── SeveritySelector
│   └── ExportButton         # 导出按钮
├── LogList/
│   ├── LogItem              # 日志条目
│   │   ├── Timestamp
│   │   ├── Severity         # 日志级别
│   │   ├── Module           # 模块
│   │   ├── Message          # 日志消息
│   │   └── Details          # 详情 (展开/折叠)
│   └── Pagination           # 分页
├── SummaryPanel/
│   ├── TotalLogs            # 总日志数
│   ├── ErrorCount           # 错误数
│   └── CriticalCount        # 关键错误数
└── ChartPanel/
    ├── LogsOverTime         # 日志时间趋势
    └── SeverityDistribution # 日志级别分布
```

### 数据接口

```typescript
// API: /api/audit/logs
interface AuditLog {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  module: string;
  message: string;
  details?: Record<string, any>;
  user?: string;
  ip?: string;
  trace_id?: string;
}

// API: /api/audit/stats
interface AuditStats {
  total_count: number;
  error_count: number;
  critical_count: number;
  logs_over_time: Array<{
    date: string;
    count: number;
    level: string;
  }>;
}
```

---

## 5.6 告警中心

### 组件结构

```
AlertCenter/
├── AlertList/
│   ├── AlertItem            # 告警条目
│   │   ├── AlertType
│   │   ├── Severity
│   │   ├── Timestamp
│   │   ├── Message
│   │   └── Actions
│   │       ├── Acknowledge
│   │       ├── Silence
│   │       └── Details
│   └── Pagination
├── AlertFilters/
│   ├── Status               # 待处理/已处理
│   ├── Severity             # 严重等级
│   ├── Category             # 类别
│   └── TimeRange
├── AlertCharts/
│   ├── AlertOverTime        # 告警时间趋势
│   ├── SeverityDistribution # 严重等级分布
│   └── CategoryDistribution # 类别分布
└── AlertSettings/
    ├── NotificationChannels # 通知渠道
    │   ├── Email
    │   ├── DingTalk
    │   ├── WeCom
    │   └── Webhook
    └── AlertThresholds      # 告警阈值
```

### 数据接口

```typescript
// API: /api/alerts
interface Alert {
  id: string;
  alert_type: string;
  severity: 'WARNING' | 'CRITICAL';
  timestamp: string;
  message: string;
  details?: Record<string, any>;
  status: 'pending' | 'acknowledged' | 'resolved';
  acknowledged_by?: string;
  ack_time?: string;
}

// API: /api/alerts/stats
interface AlertStats {
  total_count: number;
  pending_count: number;
  resolved_count: number;
  severity_distribution: {
    WARNING: number;
    CRITICAL: number;
  };
  alerts_over_time: Array<{
    date: string;
    count: number;
    severity: string;
  }>;
}
```

---

## 5.7 技术选型

### 前端框架
- **框架**: Vue 3 + TypeScript
- **UI 组件**: Element Plus / Ant Design Vue
- **图表**: ECharts / Apache ECharts
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **HTTP**: Axios
- **WebSocket**: Socket.io-client (实时信号推送)

### 服务端
- **API**: FastAPI (REST + WebSocket)
- **认证**: JWT
- **缓存**: Redis (前端缓存)
- **时区**: Asia/Shanghai

### 部署
- **前端**: Nginx
- **后端**: Gunicorn + Uvicorn
- **容器化**: Docker + Docker Compose

---

## 5.8 开发排期 (第 9-10 周)

| 周 | 任务 | 交付物 | 验收标准 |
|----|------|--------|---------|
| **第 9 周** | | | |
| Day 1-2 | 前端项目初始化 + UI 基础框架 | Vue 3 项目骨架 | 可启动，可路由 |
| Day 3-4 | 实时监控页 + 规则命中页 | Dashboard 组件 | 数据正常显示 |
| Day 5 | 重构 + 单元测试 | 可测试版本 | 覆盖率 ≥ 70% |
| **第 10 周** | | | |
| Day 1-2 | 回测对比页 + 个股诊断页 | 分析组件 | 数据正确 |
| Day 3-4 | 告警中心 + 审计日志页 | 告警组件 | 功能完整 |
| Day 5 | 集成测试 + 优化 | 预发布版本 | 无严重 bug |

---

## 5.9 验收标准

### 功能验收
- [ ] 实时监控页数据准确
- [ ] 规则命中页显示完整
- [ ] 回测对比页图表正常
- [ ] 个股诊断页建议合理
- [ ] 告警中心推送及时
- [ ] 审计日志记录完整

### 非功能验收
- [ ] 页面响应时间 < 500ms
- [ ] 实时信号延迟 < 1s
- [ ] 图表渲染流畅 (60fps)
- [ ] 移动端兼容性良好
- [ ] 浏览器兼容性 (Chrome/Edge/Firefox)

---

## 5.10 开发工具链

```bash
# 项目初始化
npm create vue@latest stock-dashboard

# 安装依赖
npm install
npm install echarts axios pinia vue-router

# 开发
npm run dev

# 构建
npm run build
```

---

## ✅ Phase 5 开发完成

**状态**: ✅ 设计完成  
**交付物**: 前端组件设计文档 + FastAPI 接口补充  
**下一步**: 开始 Phase 5 开发 (第 9-10 周)