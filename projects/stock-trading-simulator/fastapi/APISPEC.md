# 股票操盘模拟系统 - FastAPI 接口清单

**版本**: V1.0  
**技术栈**: FastAPI + Python + Pandas + Backtrader + PostgreSQL + Redis  
**认证**: JWT Bearer Token

---

## 📚 目录

1. [操盘区接口](#操盘区接口) - 白名单驱动
2. [智能选股区接口](#智能选股区接口)
3. [公共接口](#公共接口)
4. [错误码定义](#错误码定义)
5. [幂等性说明](#幂等性说明)

---

## 操盘区接口

### 1. 初始化白名单

`POST /api/trading/watchlist/init`

#### 说明
初始化/创建新的操盘区白名单版本，清空旧版本并添加新股票池

#### 请求体
```json
{
  "version_name": "2026-04-22-初始化",
  "description": "初始化操盘区白名单",
  "symbols": ["300308.SZ", "300502.SZ", "002463.SZ"],
  "priority_map": {
    "300308.SZ": 2,
    "300502.SZ": 1,
    "002463.SZ": 0
  }
}
```

#### 响应体
```json
{
  "code": 200,
  "message": "白名单初始化成功",
  "data": {
    "version_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "2026-04-22-初始化",
    "item_count": 3,
    "created_at": "2026-04-22T17:00:00+08:00"
  }
}
```

#### 错误码
- `400` - 参数错误
- `401` - 未授权
- `409` - 白名单版本已存在

#### 业务规则
- 仅 Active 版本生效
- 旧版本自动归档
- Symbol 列表最多 50 个
- Priority: 0(普通), 1(重要), 2(核心)

---

### 2. 修正白名单

`POST /api/trading/watchlist/revise`

#### 说明
修正在用的白名单（添加/删除股票）

#### 请求体
```json
{
  "add": ["300123.SZ"],
  "remove": ["002463.SZ"],
  "reason": "手动修正：移出非主线股",
  "effective_now": true
}
```

#### 响应体
```json
{
  "code": 200,
  "message": "白名单修正成功",
  "data": {
    "version_id": "550e8400-e29b-41d4-a716-446655440000",
    "added": ["300123.SZ"],
    "removed": ["002463.SZ"],
    "updated_at": "2026-04-22T17:30:00+08:00"
  }
}
```

#### 错误码
- `400` - 参数错误（增删列表为空）
- `404` - 白名单未初始化
- `409` - 股票已在白名单中

#### 业务规则
- 增删列表不能同时为空
- 删除的股票必须在白名单中
- 添加前检查是否已删除
- 更新时间自动刷新

---

### 3. 查询当前白名单

`GET /api/trading/watchlist/current`

#### 说明
获取当前生效的白名单版本及股票列表

#### 请求参数
- `include_inactive` (bool, optional): 是否包含已归档版本

#### 响应体
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "version_id": "550e8400-e29b-41d4-a716-446655440000",
    "version_name": "2026-04-22-初始化",
    "status": "active",
    "items": [
      {
        "symbol": "300308.SZ",
        "name": "中际旭创",
        "priority": 2,
        "is_active": true,
        "added_at": "2026-04-22T17:00:00+08:00"
      },
      {
        "symbol": "300502.SZ",
        "name": "新 NL",
        "priority": 1,
        "is_active": true,
        "added_at": "2026-04-22T17:00:00+08:00"
      }
    ]
  }
}
```

#### 错误码
- `404` - 白名单未初始化

---

### 4. 午间收盘任务 (11:30)

`POST /api/trading/run/noon`

#### 说明
触发午间收盘任务：计算指标、生成信号、执行模拟委托

#### 请求体
```json
{
  "strategy_config": {
    "max_position_per_stock": 0.4,
    "max_non_mainline_position": 0.2,
    "enable_auto_rebuy": true,
    "rebuy_window_minutes": 15
  }
}
```

#### 响应体
```json
{
  "code": 200,
  "message": "午间任务完成",
  "data": {
    "task_id": "noon-20260422-113000",
    "symbols_checked": 3,
    "signals_generated": 2,
    "orders_executed": 1,
    "execution_results": [
      {
        "symbol": "300308.SZ",
        "action": "buy",
        "quantity": 1000,
        "price": 125.00,
        "order_id": "xxx"
      }
    ],
    "rule_hits": {
      "B001": ["300308.SZ"],
      "B002": ["300502.SZ"],
      "S001": []
    }
  }
}
```

#### 错误码
- `400` - 已执行过午间任务
- `404` - 白名单未初始化
- `500` - 规则计算失败
- `503` - 引擎服务不可用

#### 执行流程（DAG）
```
1. 拉取上午分钟数据 (09:30-11:30)
   ↓
2. 增量计算因子 (RPS短窗、ATR、5/10均线、形态)
   ↓
3. 对白名单股票运行 V7.5 规则
   ↓
4. 生成交易信号 (Buy/Sell/Hold/Watch)
   ↓
5. 模拟下单 (Simulate Order)
   ↓
6. 成交撮合 (Backtrader)
   ↓
7. 更新持仓与账户快照
   ↓
8. 归档午间执行报告
```

#### 失败重试策略
- 最大重试次数: 3 次
- 重试间隔: 30 秒
- JWT Token: 1 小时有效期

---

### 5. 日终收盘任务 (15:00)

`POST /api/trading/run/close`

#### 说明
触发日终收盘任务：全量计算、生成次日计划、自动执行

#### 请求体
```json
{
  "strategy_config": {
    "max_position_per_stock": 0.4,
    "max_non_mainline_position": 0.2,
    "enable_auto_rebuy": true,
    "rebuy_window_minutes": 15
  },
  "next_day_trading_mode": "aggressive"
}
```

#### 响应体
```json
{
  "code": 200,
  "message": "日终任务完成",
  "data": {
    "task_id": "close-20260422-150000",
    "symbols_analyzed": 3,
    "mainline_pool": ["300308.SZ", "300502.SZ"],
    "signals_generated": 3,
    "orders_executed": 2,
    "returns": {
      "daily_return": 2.5,
      "cum_return": 12.3,
      "drawdown": -3.2
    },
    "next_day_plan": {
      "symbols_to_watch": ["300308.SZ", "300502.SZ"],
      "symbols_to_rebuy": ["300308.SZ"],
      "symbols_to_sell": []
    }
  }
}
```

#### 错误码
- `400` - 已执行过日终任务
- `404` - 白名单未初始化
- `500` - 规则计算失败

#### 执行流程（DAG）
```
1. 拉取全天数据 (日线 + 分钟收口)
   ↓
2. 全量重算因子 (RPS/ATR/MACD/RSI/均线)
   ↓
3. V7.5 规则重新校验
   ↓
4. 生成交易信号 + 回补预案
   ↓
5. 执行"收盘触发类"模拟动作
   ↓
6. 更新账户快照 + 生成日终报告
   ↓
7. 生成次日开盘前计划
   ↓
8. 归档日终报告 + 回测快照
```

---

### 6. 查询模拟委托

`GET /api/trading/orders`

#### 说明
查询模拟委托列表（支持分页、状态过滤）

#### 请求参数
- `symbol` (string, optional): 股票代码
- `status` (string, optional): pending/filled/cancelled/expired
- `page` (int, default: 1): 页码
- `page_size` (int, default: 20): 每页数量

#### 响应体
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 5,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "order_id": "xxx",
        "symbol": "300308.SZ",
        "side": "buy",
        "order_type": "market",
        "quantity": 1000,
        "price": 125.00,
        "status": "filled",
        "filled_qty": 1000,
        "filled_avg_price": 124.80,
        "created_at": "2026-04-22T11:30:00+08:00",
        "filled_at": "2026-04-22T11:30:15+08:00"
      }
    ]
  }
}
```

---

### 7. 查询模拟成交

`GET /api/trading/fills`

#### 说明
查询模拟成交明细

#### 请求参数
- `symbol` (string, optional): 股票代码
- `start_date` (string, optional): 开始日期 (YYYY-MM-DD)
- `end_date` (string, optional): 结束日期 (YYYY-MM-DD)
- `page` (int, default: 1)
- `page_size` (int, default: 20)

#### 响应体
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 12,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "fill_id": "xxx",
        "order_id": "xxx",
        "symbol": "300308.SZ",
        "side": "buy",
        "quantity": 100,
        "price": 124.80,
        "commission": 1.25,
        "tax": 0.00,
        "total_amount": 12480.00,
        "fill_time": "2026-04-22T11:30:15+08:00"
      }
    ]
  }
}
```

---

### 8. 查询账户与持仓

`GET /api/trading/account`

#### 说明
查询当前账户状态与持仓明细

#### 响应体
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "snapshot_date": "2026-04-22",
    "total_assets": 1000000.00,
    "cash_balance": 750000.00,
    "market_value": 250000.00,
    "total_profit": 50000.00,
    "return_rate": 5.0,
    "daily_profit": 2500.00,
    "daily_return_rate": 0.25,
    "position_count": 2,
    "positions": [
      {
        "symbol": "300308.SZ",
        "name": "中际旭创",
        "quantity": 2000,
        "cost_price": 115.00,
        "current_price": 125.00,
        "market_value": 250000.00,
        "profit_loss": 20000.00,
        "profit_rate": 8.70,
        "position_pct": 25.0,
        "first_buy_date": "2026-04-22",
        "hold_days": 1,
        "is_mainline": true,
        "is_auto_rebuy": true
      }
    ],
    "performance_metrics": {
      "sharpe_ratio": 1.8,
      "sortino_ratio": 2.5,
      "win_rate": 66.67,
      "profit_factor": 2.3,
      "max_drawdown": -3.2
    }
  }
}
```

---

## 智能选股区接口

### 1. 全市场筛选

`POST /api/screener/run`

#### 说明
执行 V7.5 全市场筛选，输出超级主线池和试错池

#### 请求体
```json
{
  "trigger_date": "2026-04-22",
  "rps_threshold": 90,
  "min_sectors_with_qualifying_stocks": 3,
  "include_turbo_board": true,
  "exclude_st_suspension": true
}
```

#### 响应体
```json
{
  "code": 200,
  "message": "筛选完成",
  "data": {
    "screening_date": "2026-04-22",
    "total_candidate_stocks": 45,
    "mainline_pool": {
      "count": 8,
      "stocks": [
        {
          "symbol": "300308.SZ",
          "name": "中际旭创",
          "rps_10": 98.5,
          "rps_20": 96.2,
          "rps_50": 92.1,
          "sector": "通信",
          "sub_sector": "光模块",
          "形态": "放量突破",
          "建议动作": "持有",
          "风险等级": "低"
        }
      ]
    },
    "retry_pool": {
      "count": 37,
      "description": "未达主线标准但满足试错条件的股票"
    }
  }
}
```

#### 错误码
- `400` - 参数错误
- `500` - 规则计算失败

---

### 2. 获取候选池

`GET /api/screener/candidates`

#### 说明
获取候选池股票列表（可分页、筛选）

#### 请求参数
- `pool_type` (string): mainline/retry/candidate
- `sector` (string, optional): 行业筛选
- `min_rps` (int, default: 90): 最小 RPS 阈值
- `page` (int, default: 1)
- `page_size` (int, default: 20)

#### 响应体
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "pool_type": "mainline",
    "total": 8,
    "page": 1,
    "items": [
      {
        "symbol": "300308.SZ",
        "name": "中际旭创",
        "rps_10": 98.5,
        "rps_20": 96.2,
        "rps_50": 92.1,
        "rps_rank_10": 15,
        "rps_rank_20": 22,
        "rps_rank_50": 45,
        "sector": "通信",
        "sub_sector": "光模块",
        "形态命中": "放量突破",
        "建议动作": "持有",
        "风险等级": "低"
      }
    ]
  }
}
```

---

### 3. 个股诊断

`GET /api/screener/symbol/{symbol}`

#### 说明
获取个股详细诊断报告（RPS/形态/买卖建议）

#### 请求参数
- `symbol` (path): 股票代码 (如: 300308.SZ)
- `date` (query, optional): 诊断日期 (默认今日)

#### 响应体
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "symbol": "300308.SZ",
    "name": "中际旭创",
    "诊断日期": "2026-04-22",
    "RPS指标": {
      "rps_10": 98.5,
      "rps_20": 96.2,
      "rps_50": 92.1,
      "rps_rank_10": 15,
      "rps_rank_20": 22,
      "rps_rank_50": 45,
      "是否主线": true
    },
    "技术形态": {
      "形态": "放量突破",
      "突破日期": "2026-04-21",
      "突破涨幅": 8.5,
      "突破量能": 2.5x 平均量能,
      "是否窄幅横盘": false
    },
    "均线系统": {
      "当前价": 125.00,
      "5日线": 122.30,
      "10日线": 120.50,
      "20日线": 118.20,
      "价格位置": "突破20日线"
    },
    "买卖建议": {
      "建议动作": "持有",
      "建议理由": [
        "RPS(10/20/50) > 90, 满足主线条件",
        "放量突破3-5天窄幅横盘",
        "站上5日线未破"
      ],
      "止损位": 120.50,
      "参考买点": [124.00, 125.00],
      "回补条件": "仍在主线池 + 站回5日线 + 突破高点"
    },
    "风险标签": [
      "非ST",
      "非停牌",
      "无减持公告"
    ],
    "综合评分": 85.5
  }
}
```

#### 错误码
- `404` - 股票不存在或未在白名单中

---

### 4. 板块强度排行

`GET /api/screener/sectors`

#### 说明
获取板块强度与 RPS 排行

#### 请求参数
- `date` (query, optional): 截止日期
- `top_n` (int, default: 10): 前 N 名
- `min_qualifying_stocks` (int, default: 3): 达标股票数要求

#### 响应体
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "date": "2026-04-22",
    "sectors": [
      {
        "sector_code": "801010",
        "sector_name": "通信",
        "rps_10": 95.2,
        "rps_20": 93.8,
        "rps_50": 91.5,
        "qualifying_stocks": 3,
        "stocks": ["300308.SZ", "300502.SZ", "600050.SH"]
      },
      {
        "sector_code": "801030",
        "sector_name": "电子",
        "rps_10": 92.1,
        "rps_20": 90.5,
        "rps_50": 88.2,
        "qualifying_stocks": 2,
        "stocks": ["300136.SZ", "603986.SH"]
      }
    ]
  }
}
```

---

## 公共接口

### 1. 健康检查

`GET /api/health`

#### 响应体
```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "status": "healthy",
    "postgreSQL": "connected",
    "redis": "connected",
    "version": "1.0.0"
  }
}
```

---

## 错误码定义

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | JWT Token 无效或过期 |
| 403 | Forbidden | 权限不足 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（白名单版本已存在） |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 服务不可用（数据引擎、规则引擎） |

### 通用错误响应格式
```json
{
  "code": 400,
  "message": "symbol 参数格式错误",
  "error_code": "VALIDATION_SYMBOL_FORMAT",
  "details": {
    "field": "symbol",
    "value": "INVALID",
    "valid_pattern": "[A-Z0-9]{6}\\.[SZ]"
  }
}
```

---

## 幂等性说明

### 幂等接口
| 接口 | 幂等Key | 处理方式 |
|------|---------|----------|
| `POST /api/trading/watchlist/init` | `version_name` | 已存在则返回 409 |
| `POST /api/trading/watchlist/revise` | `reason + effective_now` | 同参数不重复执行 |
| `POST /api/trading/run/noon` | `任务日期 + "noon"` | 已执行返回 400 |
| `POST /api/trading/run/close` | `任务日期 + "close"` | 已执行返回 400 |

### 非幂等接口
- `GET` 接口天然幂等
- `POST /api/screener/run` 无幂等限制（每日执行）

---

## JWT鉴权说明

### Token 格式
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

### Claims
```json
{
  "sub": "user_id",
  "username": "操盘员A",
  "role": "trader",  // trader, admin, viewer
  "permissions": ["trading:watchlist", "trading:run", "screener:read"],
  "exp": 1682158800
}
```

### 角色权限
- **trader**: 操盘区全功能 + 选股区只读
- **admin**: 操盘区 + 选股区全功能
- **viewer**: 选股区只读 + 账户查询

### 错误响应
- Token 缺失: `401 - Missing Authorization Header`
- Token 无效: `401 - Invalid Token`
- Token 过期: `401 - Token Expired`
- 权限不足: `403 - Forbidden`

---

## 开发约定

### 响应时间
- 同步接口: ≤ 500ms
- 规则计算: ≤ 2s
- 全市场筛选: ≤ 10s
- 回测任务: ≤ 30s

### 异步任务
- 全市场筛选 → 返回 `task_id` 异步轮询
- 回测任务 → 返回 `task_id` 异步轮询

### 分页限制
- 最大 `page_size`: 100
- 默认 `page_size`: 20
- 最大数据量: 1000

### 字段注释
所有接口响应必须包含 `code`, `message`, `data`

### 时间格式
- ISO 8601: `2026-04-22T11:30:00+08:00`
- 日期: `2026-04-22`
- 时间: `11:30:00`
