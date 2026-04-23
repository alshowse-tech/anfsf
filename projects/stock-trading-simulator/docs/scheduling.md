# 股票操盘模拟系统 - 实时+日终双同步调度方案

**版本**: V1.0  
**调度技术**: APScheduler / Celery / Airflow (推荐 Airflow)

---

## 📋 调度策略概览

### 双时点核心任务

| 时点 | 任务 | 时间 | 频率 |
|------|------|------|------|
| **午间收盘** | 午间任务 | 11:30:00 | 每交易日 |
| **日终收盘** | 日终任务 | 15:00:00 | 每交易日 |

### 同步模式

| 模式 | 数据源 | 更新频率 | 用途 |
|------|--------|---------|------|
| **实时同步** | AkShare + 东财API | 每分钟 | 午间任务数据源 |
| **日终同步** | TuShare Pro + 交易所 | 每日收盘后 | 日终任务数据源 |

---

## 🔄 实时同步链路 (交易时段 09:30-11:30, 13:00-15:00)

### 数据流架构

```
┌─────────────────────────────────────────────────────────────┐
│                    实时同步链路 (交易时段)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. 数据源拉取 (每分钟)                                       │
│    ├─ AkShare 实时行情 API                                  │
│    ├─ 东财分钟行情 API                                      │
│    └─ TuShare Pro 实时接口 (备用)                           │
│                                                             │
│ 2. Redis 缓存层                                             │
│    ├─ real_time:bar:{symbol} (1分钟K线缓存)                │
│    ├─ real_time: factor:{symbol} (因子缓存)                │
│    └─ real_time: signal:{symbol} (信号缓存)                │
│                                                             │
│ 3. 指标增量更新                                             │
│    ├─ RPS 短窗计算 (10/20/50)                              │
│    ├─ ATR 计算                                              │
│    ├─ 均线系统更新 (5/10/20)                                │
│    └─ 形态判断更新                                          │
│                                                             │
│ 4. V7.5 规则计算                                            │
│    ├─ 超级主线过滤                                          │
│    ├─ 形态拦截检查                                          │
│    ├─ 仓位管理验证                                          │
│    └─ 止损止盈检查                                          │
│                                                             │
│ 5. 信号推送                                                 │
│    ├─ Trade Signal 写入 PostgreSQL                        │
│    ├─ Redis Signal Queue (实时推送)                        │
│    └─ 告警消息 (Webhook/钉钉/企业微信)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 调度任务设计

```python
# real_time_scheduler.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'quant_team',
    'depends_on_past': False,
    'start_date': datetime(2026, 4, 22),
    'retries': 3,
    'retry_delay': timedelta(minutes=1),
}

dag = DAG(
    'stock_real_time_scheduler',
    default_args=default_args,
    description='Real-time stock data scheduler',
    schedule_interval='* 9-15 * * 1-5',  # 周一至周五 9-15点每分钟
    catchup=False,
)

# Task 1: 拉取实时行情
task_pull_minute_bar = PythonOperator(
    task_id='pull_minute_bar_data',
    python_callable=pull_minute_bar_from_api,
    dag=dag,
)

# Task 2: 写入Redis缓存
task_cache_minute_bar = PythonOperator(
    task_id='cache_minute_bar_to_redis',
    python_callable=cache_minute_bar_to_redis,
    dag=dag,
)

# Task 3: 增量计算因子
task_compute_factor = PythonOperator(
    task_id='incremental_factor_calculation',
    python_callable=incremental_factor_calculation,
    dag=dag,
)

# Task 4: 运行V7.5规则
task_run_v75_rule = PythonOperator(
    task_id='run_v75_trading_rule',
    python_callable=run_v75_trading_rule,
    dag=dag,
)

# Task 5: 生成交易信号
task_generate_signal = PythonOperator(
    task_id='generate_trading_signal',
    python_callable=generate_trading_signal,
    dag=dag,
)

# 依赖关系
task_pull_minute_bar >> task_cache_minute_bar >> task_compute_factor >> task_run_v75_rule >> task_generate_signal
```

### 任务详细说明

#### Task 1: 拉取实时行情
```python
def pull_minute_bar_from_api():
    """拉取分钟级别行情数据"""
    symbols = get_active_watchlist()  # 从白名单获取股票列表
    for symbol in symbols:
        # 调用 AkShare API
        data = akshare_api.get_realtime_minute_bar(symbol)
        
        # 数据校验
        if not validate_minute_bar(data):
            logger.error(f"Invalid minute bar data for {symbol}")
            continue
            
        # 存入 Redis
        redis_client.setex(
            f"real_time:bar:{symbol}",
            timedelta(minutes=10),  # 10分钟过期
            json.dumps(data)
        )
        
        logger.info(f"Pulled minute bar for {symbol}")
```

#### Task 3: 增量计算因子
```python
def incremental_factor_calculation():
    """增量计算因子 (只更新分钟级变化)"""
    symbols = get_active_watchlist()
    
    for symbol in symbols:
        # 从 Redis 读取最新数据
        latest_bar = redis_client.get(f"real_time:bar:{symbol}")
        prev_factors = redis_client.get(f"real_time:factor:{symbol}")
        
        # 增量计算 RPS 短窗
        rps_10 = calculate_rps_10(latest_bar)
        rps_20 = calculate_rps_20(latest_bar)
        
        # 计算 ATR
        atr_14 = calculate_atr_14(symbol)
        
        # 计算均线偏移
        ma_5_offset = calculate_price_position_ma5(symbol)
        
        # 更新 Redis
        factor_data = {
            'rps_10': rps_10,
            'rps_20': rps_20,
            'atr_14': atr_14,
            'price_pos_ma_5': ma_5_offset,
            'updated_at': datetime.now().isoformat()
        }
        
        redis_client.setex(
            f"real_time:factor:{symbol}",
            timedelta(minutes=5),
            json.dumps(factor_data)
        )
```

#### Task 4: 运行V7.5规则
```python
def run_v75_trading_rule():
    """运行 V7.5 交易规则引擎"""
    symbols = get_active_watchlist()
    
    for symbol in symbols:
        factors = get_factors_from_redis(symbol)
        position = get_current_position(symbol)
        
        # 1. 超级主线过滤
        is_mainline = (
            factors['rps_10'] > 90 and
            factors['rps_20'] > 90 and
            factors['rps_50'] > 90
        )
        
        # 2. 形态拦截
       形态 = check_form_pattern(symbol)
        
        # 3. 仓位管理
        if position:
            is_within_limit = validate_position_limit(position)
        else:
            is_within_limit = True
            
        # 4. 止损检查
        stop_loss_triggered = check_stop_loss(symbol, factors)
        
        # 输出规则命中
        rule_hits = []
        if is_mainline:
            rule_hits.append('B001')  # 超级主线过滤
        if 形态 == '放量突破':
            rule_hits.append('B002')  # 形态拦截
        if is_within_limit:
            rule_hits.append('M001')  # 仓位管理
        if stop_loss_triggered:
            rule_hits.append('S001')  # 止损触发
            
        redis_client.setex(
            f"real_time:signal:{symbol}",
            timedelta(minutes=1),
            json.dumps({
                'is_mainline': is_mainline,
                '形态': 形态,
                'rule_hits': rule_hits,
                'action': 'BUY' if should_buy(factors) else 'SELL' if should_sell(factors) else 'HOLD'
            })
        )
```

---

## 📅 日终同步链路 (收盘后 15:00+)

### 数据流架构

```
┌─────────────────────────────────────────────────────────────┐
│                      日终同步链路 (收盘后)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. 全量数据拉取 (15:00+)                                     │
│    ├─ 全部日线历史数据 (TuShare Pro)                        │
│    ├─ 全部分钟数据收口                                       │
│    └─ 公告/财报/资金流数据                                   │
│                                                             │
│ 2. 全量校验                                                 │
│    ├─ 数据完整性检查                                         │
│    ├─ 数据一致性检查                                         │
│    └─ 异常数据标记                                           │
│                                                             │
│ 3. 因子重算                                                 │
│    ├─ RPS 全量重算 (10/20/50)                              │
│    ├─ ATR 全量重算                                          │
│    ├─ MACD/RSI/KDJ 全量重算                                 │
│    └─ 均线系统全量重算                                       │
│                                                             │
│ 4. 回测快照                                                 │
│    ├─ 当日盈亏计算                                           │
│    ├─ 夏普比率计算                                          │
│    ├─ 回撤计算                                               │
│    └─ 胜率/盈亏比计算                                        │
│                                                             │
│ 5. 规则计算 + 次日计划                                        │
│    ├─ V7.5 规则重新校验                                      │
│    ├─ 超级主线池更新                                         │
│    ├─ 回补预案生成                                           │
│    └─ 次日开盘前计划                                         │
│                                                             │
│ 6. 报告生成                                                 │
│    ├─ 日终执行报告                                           │
│    ├─ 回测报告                                               │
│    └─ 次日计划报告                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 调度任务设计

```python
# daily_close_scheduler.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'quant_team',
    'depends_on_past': False,
    'start_date': datetime(2026, 4, 22),
    'retries': 3,
    'retry_delay': timedelta(minutes=2),
}

dag = DAG(
    'stock_daily_close_scheduler',
    default_args=default_args,
    description='Daily closing data scheduler',
    schedule_interval='30 15 * * 1-5',  # 周一至周五 15:30 开始
    catchup=False,
)

# Task 1: 全量拉取日线数据
task_pull_daily_data = PythonOperator(
    task_id='pull_daily_data',
    python_callable=pull_daily_data_from_api,
    dag=dag,
)

# Task 2: 数据完整性校验
task_validate_data = PythonOperator(
    task_id='validate_data_completeness',
    python_callable=validate_data_completeness,
    dag=dag,
)

# Task 3: 因子全量重算
task_recompute_factors = PythonOperator(
    task_id='recompute_all_factors',
    python_callable=recompute_all_factors,
    dag=dag,
)

# Task 4: 回测快照生成
task_generate_backtest_snapshot = PythonOperator(
    task_id='generate_backtest_snapshot',
    python_callable=generate_backtest_snapshot,
    dag=dag,
)

# Task 5: 规则重新校验 + 次日计划
task_reapply_rules = PythonOperator(
    task_id='reapply_v75_rules_and_generate_next_day_plan',
    python_callable=reapply_v75_rules_and_generate_next_day_plan,
    dag=dag,
)

# Task 6: 报告生成
task_generate_reports = PythonOperator(
    task_id='generate_daily_reports',
    python_callable=generate_daily_reports,
    dag=dag,
)

# 依赖关系
task_pull_daily_data >> task_validate_data >> task_recompute_factors >> \
    task_generate_backtest_snapshot >> task_reapply_rules >> task_generate_reports
```

### 任务详细说明

#### Task 1: 全量拉取日线数据
```python
def pull_daily_data_from_api():
    """拉取日线级别历史数据"""
    symbols = get_all_symbols()
    
    for symbol in symbols:
        # 调用 TuShare Pro API
        data = tusshare_api.get_daily_bar(symbol, start_date='2020-01-01')
        
        # 批量插入 PostgreSQL
        postgres_client.insert_batch('market_bar_1d', data)
        
        logger.info(f"Pulled daily data for {symbol}")
```

#### Task 4: 回测快照生成
```python
def generate_backtest_snapshot():
    """生成回测快照"""
    positions = get_current_positions()
    
    # 1. 当日盈亏
    daily_profit = 0
    for pos in positions:
        daily_profit += (pos.current_price - pos.cost_price) * pos.quantity
    
    # 2. 累计盈亏
    total_profit = positions[0].account.total_assets - 1000000  # 假设初始资金100万
    
    # 3. 夏普比率
    daily_returns = get DailyReturns(days=90)
    sharpe = calculate_sharpe_ratio(daily_returns)
    
    # 4. 回撤
    drawdown = calculate_max_drawdown(positions[0].account.history)
    
    # 5. 胜率
    wins = sum(1 for t in trades if t.profit > 0)
    win_rate = wins / len(trades) * 100
    
    # 插入快照表
    snapshot = PositionAccount(
        snapshot_date=datetime.now().date(),
        total_assets=positions[0].account.total_assets,
        daily_profit=daily_profit,
        total_profit=total_profit,
        return_rate=total_profit / 1000000 * 100,
        sharpe_ratio=sharpe,
        drawdown=drawdown,
        win_rate=win_rate
    )
    postgres_client.insert('position_account', snapshot.to_dict())
```

#### Task 5: 次日计划生成
```python
def reapply_v75_rules_and_generate_next_day_plan():
    """重新应用 V7.5 规则，生成次日计划"""
    # 1. 重新计算超级主线池
    mainline_pool = []
    candidates = get_all_candidates()
    
    for stock in candidates:
        if (stock.rps_10 > 90 and 
            stock.rps_20 > 90 and 
            stock.rps_50 > 90 and
            sector_qualifying_stocks(stock.sector) >= 3):
            mainline_pool.append(stock.symbol)
    
    # 2. 回补预案生成
    rebuy_pendings = []
    for pos in get_positions():
        if should_rebuy(pos):
            rebuy_pendings.append({
                'symbol': pos.symbol,
                'rebuy_condition': '仍在主线池 + 站回5日线 + 突破高点',
                'rebuy_window': 15  # 15分钟内
            })
    
    # 3. 次日开盘前计划
    next_day_plan = {
        'symbols_to_watch': mainline_pool,
        'symbols_to_rebuy': [p['symbol'] for p in rebuy_pendings],
        'symbols_to_sell': get_stop_loss_candidates(),
        'maximum_position_per_stock': 0.4,
        'maximum_non_mainline': 0.2
    }
    
    # 保存到数据库
    postgres_client.insert('next_day_plan', next_day_plan)
    
    return next_day_plan
```

---

## 🔁 失败重试与补数机制

### 失败重试策略

| 任务 | 最大重试 | 重试间隔 | 失败处理 |
|------|---------|---------|---------|
| 数据拉取 | 3次 | 30秒 | 发送告警 + 手动重试 |
| 数据校验 | 3次 | 30秒 | 标记异常数据 + 继续 |
| 因子计算 | 5次 | 1分钟 | 部分数据跳过 + 告警 |
| 规则计算 | 5次 | 1分钟 | 降级处理 + 告警 |

### 补数机制

```python
def补数机制():
    """数据补数逻辑"""
    
    # 1. 检测缺失时间点
    missing_minutes = check_missing_minute_bars()
    missing_days = check_missing_daily_bars()
    
    # 2. 补数策略
    for symbol, time in missing_minutes:
        if (datetime.now() - time).seconds < 600:  # 10分钟内
            # 补数 (AkShare 有10分钟数据保留)
            data = akshare_api.get_minute_bar(symbol, time)
            redis_client.setex(f"real_time:bar:{symbol}", timedelta(minutes=10), json.dumps(data))
        else:
            # 告警
            send_alert(f"Missing minute bar for {symbol} at {time}")
    
    for symbol, date in missing_days:
        # 补数日线数据 (TuShare Pro 历史数据完整)
        data = tusshare_api.get_daily_bar(symbol, start_date=date, end_date=date)
        postgres_client.insert_batch('market_bar_1d', data)
```

---

## ⏰ 时钟与交易日历处理

### 交易日历

```python
# ChinaTradingCalendar.py
class ChinaTradingCalendar:
    """中国股票交易日历"""
    
    def __init__(self):
        self.holidays = [
            # 春节
            '2026-02-10', '2026-02-11', '2026-02-12', '2026-02-13', '2026-02-14', '2026-02-17', '2026-02-18',
            # 清明节
            '2026-04-04', '2026-04-05', '2026-04-06',
            # 劳动节
            '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
            # 端午节
            '2026-06-22', '2026-06-23', '2026-06-24',
            # 中秋节
            '2026-09-21', '2026-09-22', '2026-09-23',
            # 国庆节
            '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07',
        ]
    
    def is_trading_day(self, date):
        """判断是否为交易日"""
        if date.strftime('%Y-%m-%d') in self.holidays:
            return False
        if date.weekday() >= 5:  # 周末
            return False
        return True
    
    def get_next_trading_day(self, date):
        """获取下一个交易日"""
        while True:
            date += timedelta(days=1)
            if self.is_trading_day(date):
                return date
    
    def get_previous_trading_day(self, date):
        """获取上一个交易日"""
        while True:
            date -= timedelta(days=1)
            if self.is_trading_day(date):
                return date
```

### 午休处理

```python
# TradingSession.py
class TradingSession:
    """交易时段处理"""
    
    MORNING_SESSION = (time(9, 30), time(11, 30))
    AFTERNOON_SESSION = (time(13, 0), time(15, 0))
    
    @classmethod
    def is_trading_time(cls, current_time):
        """判断是否在交易时段"""
        morning_start, morning_end = cls.MORNING_SESSION
        afternoon_start, afternoon_end = cls.AFTERNOON_SESSION
        
        if morning_start <= current_time <= morning_end:
            return True
        if afternoon_start <= current_time <= afternoon_end:
            return True
        return False
    
    @classmethod
    def get_current_session(cls, current_time):
        """获取当前时段"""
        if cls.MORNING_SESSION[0] <= current_time <= cls.MORNING_SESSION[1]:
            return 'morning'
        elif cls.AFTERNOON_SESSION[0] <= current_time <= cls.AFTERNOON_SESSION[1]:
            return 'afternoon'
        else:
            return 'none'
```

---

## 📊 监控与告警

### 监控指标

| 指标 | 阈值 | 告警级别 |
|------|------|---------|
| 数据拉取失败率 | >5% | WARNING |
| 数据延迟 | >5分钟 | CRITICAL |
| 规则计算超时 | >10秒 | WARNING |
| Redis缓存命中率 | <95% | WARNING |
| 数据校验失败率 | >1% | CRITICAL |

### 告警通道

```python
# AlertManager.py
class AlertManager:
    """告警管理"""
    
    @staticmethod
    def send_alert(level, message, details=None):
        """发送告警"""
        if level == 'CRITICAL':
            # 钉钉 + 企业微信 + 邮件
            dingbot.send(message)
            wecom.send(message)
            send_email(message)
        elif level == 'WARNING':
            # 企业微信 + 邮件
            wecom.send(message)
            send_email(message)
        
        # 记录到日志
        logger.warning(f"[{level}] {message} - {details}")
```

---

## 🔄 DAG流程图 (文字版)

### 实时调度 DAG
```
┌─────────────────────┐
│ * 9-15 * * 1-5      │  (每分钟触发)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ pull_minute_bar     │  (拉取行情)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ cache_minute_bar    │  (写入Redis)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ compute_factor      │  (计算因子)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ run_v75_rule        │  (运行规则)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ generate_signal     │  (生成信号)
└─────────────────────┘
```

### 日终调度 DAG
```
┌─────────────────────┐
│ 30 15 * * 1-5       │  (15:30触发)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ pull_daily_data     │  (拉取日线)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ validate_data       │  (数据校验)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ recompute_factor    │  (重算因子)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ backtest_snapshot   │  (回测快照)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ reapply_rules       │  (应用规则)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ generate_reports    │  (生成报告)
└─────────────────────┘
```

---

## 📝 开发优先级

### Phase 1 (第1-2周)
- [ ] 实时数据拉取脚本
- [ ] Redis缓存初始化
- [ ] 基础任务调度 (APScheduler)

### Phase 2 (第3-4周)
- [ ] 因子计算引擎
- [ ] V7.5规则引擎
- [ ] 信号生成逻辑

### Phase 3 (第5-6周)
- [ ] 日终任务补充
- [ ] 回测快照生成
- [ ] 报告生成

### Phase 4 (第7-8周)
- [ ] 完整 DAG 定义 (Airflow)
- [ ] 告警系统集成
- [ ] 监控仪表盘

---

**调度方案版本**: V1.0  
**最后更新**: 2026-04-22  
**建议调度工具**: Apache Airflow (生产级)