# 股票操盘模拟系统 - 数据导入脚本

**版本**: V1.0  
**作用**: 初始化股票基础信息和板块映射数据

---

## 📋 数据导入流程

### 1. 股票基础信息导入

```sql
-- 导入A股股票基础信息
-- 数据源: TuShare Pro / AkShare
-- 字段: symbol, name, exchange, market, list_date, sector, industry

INSERT INTO symbol_master (symbol, name, exchange, market, list_date, sector, industry)
VALUES
-- 主板股票
('600000.SH', '浦发银行', 'SH', '主板', '1999-11-17', '银行', '银行'),
('600036.SH', '招商银行', 'SH', '主板', '2002-07-15', '银行', '银行'),
('600519.SH', '贵州茅台', 'SH', '主板', '2001-08-27', '食品饮料', '白酒'),
('601318.SH', '中国平安', 'SH', '主板', '2007-03-01', '保险', '保险'),
-- 创业板股票
('300308.SZ', '中际旭创', 'SZ', '创业板', '2014-01-23', '通信', '光模块'),
('300502.SZ', '新 NL', 'SZ', '创业板', '2016-11-16', '电子', '半导体'),
('300122.SZ', '智飞生物', 'SZ', '创业板', '2010-05-26', '医药', '生物制药'),
('300750.SZ', '宁德时代', 'SZ', '创业板', '2018-06-11', '电力设备', '锂电池'),
-- 科创板股票
('688008.SH', '澜起科技', 'SH', '科创板', '2019-06-05', '电子', '半导体'),
('688111.SH', '金山办公', 'SH', '科创板', '2019-07-22', '计算机', '软件开发'),
-- 北交所股票
('830799.BJ', '诺思兰德', 'BJ', '北交所', '2011-02-22', '医药', '生物制药');

-- 创建索引
CREATE INDEX idx_symbol_master_list_date ON symbol_master(list_date);
CREATE INDEX idx_symbol_master_sector ON symbol_master(sector);
```

### 2. 板块映射导入

```sql
-- 导入申万行业映射
-- 数据源: TuShare Pro / 申万指数官网

INSERT INTO sector_membership (symbol, sector_code, sector_name, sub_sector_code, sub_sector_name, effective_date)
VALUES
-- 通信行业
('300308.SZ', '801010', '通信', '801011', '光通信及设备', '2026-01-01'),
('600050.SH', '801010', '通信', '801011', '光通信及设备', '2026-01-01'),
-- 电子行业
('300502.SZ', '801080', '电子', '801081', '半导体', '2026-01-01'),
('300136.SZ', '801080', '电子', '801081', '半导体', '2026-01-01'),
('603986.SH', '801080', '电子', '801082', '元件', '2026-01-01'),
-- 银行行业
('600000.SH', '801040', '银行', '801041', '银行', '2026-01-01'),
('600036.SH', '801040', '银行', '801041', '银行', '2026-01-01'),
-- 食品饮料行业
('600519.SH', '801130', '食品饮料', '801131', '白酒', '2026-01-01'),
-- 保险行业
('601318.SH', '801160', '非银金融', '801161', '保险', '2026-01-01'),
-- 医药行业
('300122.SZ', '801150', '医药生物', '801151', '生物制药', '2026-01-01'),
-- 电力设备行业
('300750.SZ', '801730', '电力设备', '801731', '锂电池', '2026-01-01'),
-- 计算机行业
('688111.SH', '801750', '计算机', '801751', '软件开发', '2026-01-01');

-- 创建索引
CREATE INDEX idx_sector_membership_sector ON sector_membership(sector_code);
CREATE INDEX idx_sector_membership_sub ON sector_membership(sub_sector_code);
```

### 3. 指数成分股导入

```sql
-- 导入沪深300成分股
INSERT INTO symbol_master (symbol, name, exchange, market, list_date, is_hs300)
VALUES
('600519.SH', '贵州茅台', 'SH', '主板', '2001-08-27', TRUE),
('601318.SH', '中国平安', 'SH', '主板', '2007-03-01', TRUE),
('600036.SH', '招商银行', 'SH', '主板', '2002-07-15', TRUE),
('300750.SZ', '宁德时代', 'SZ', '创业板', '2018-06-11', TRUE),
('601888.SH', '中免集团', 'SH', '主板', '2019-12-16', TRUE);

-- 导入中证500成分股
INSERT INTO symbol_master (symbol, name, exchange, market, list_date, is_zz500)
VALUES
('603996.SH', ' ST 中 审', 'SH', '主板', '2015-04-09', TRUE),
('603127.SH', '昭衍新药', 'SH', '主板', '2017-02-09', TRUE),
('603368.SH', '柳工', 'SH', '主板', '2015-04-09', TRUE);

-- 导入创业板指成分股
INSERT INTO symbol_master (symbol, name, exchange, market, list_date, is_cybz)
VALUES
('300308.SZ', '中际旭创', 'SZ', '创业板', '2014-01-23', TRUE),
('300502.SZ', '新 NL', 'SZ', '创业板', '2016-11-16', TRUE),
('300122.SZ', '智飞生物', 'SZ', '创业板', '2010-05-26', TRUE),
('300750.SZ', '宁德时代', 'SZ', '创业板', '2018-06-11', TRUE);
```

### 4. 日线行情数据导入 (示例)

```sql
-- 导入历史日线数据
-- 数据源: TuShare Pro
-- 字段: symbol, trade_date, open, high, low, close, volume, amount, prev_close, change_pct, turnover_rate

INSERT INTO market_bar_1d (symbol, trade_date, open, high, low, close, volume, amount, prev_close, change_pct, turnover_rate)
VALUES
-- 贵州茅台 (600519.SH) 示例数据
('600519.SH', '2026-04-22', 1780.00, 1820.50, 1775.00, 1805.00, 5000000, 90250000000, 1785.00, 1.12, 0.45),
('600519.SH', '2026-04-21', 1775.00, 1795.00, 1760.00, 1785.00, 4500000, 80000000000, 1760.00, 1.42, 0.40),
('600519.SH', '2026-04-20', 1750.00, 1780.00, 1740.00, 1760.00, 5200000, 91000000000, 1745.00, 0.86, 0.47),
-- 中际旭创 (300308.SZ) 示例数据
('300308.SZ', '2026-04-22', 125.00, 135.00, 124.50, 134.50, 800000, 10760000000, 128.00, 5.23, 2.50),
('300308.SZ', '2026-04-21', 128.00, 128.50, 124.00, 128.00, 500000, 6400000000, 129.50, -1.16, 1.56),
('300308.SZ', '2026-04-20', 130.00, 131.50, 127.00, 129.50, 600000, 7770000000, 130.00, -0.38, 1.88);
```

### 5. 分钟行情数据导入 (示例)

```sql
-- 导入分钟行情数据
-- 数据源: TuShare Pro / AkShare
-- 字段: symbol, trade_date, bar_time, open, high, low, close, volume, amount

INSERT INTO market_bar_1m (symbol, trade_date, bar_time, open, high, low, close, volume, amount)
VALUES
('300308.SZ', '2026-04-22', '09:30:00', 125.00, 126.50, 124.80, 126.20, 10000, 12580000),
('300308.SZ', '2026-04-22', '09:31:00', 126.20, 127.50, 125.50, 126.80, 15000, 19020000),
('300308.SZ', '2026-04-22', '09:32:00', 126.80, 128.00, 126.20, 127.50, 20000, 25500000),
-- 15:00 收盘价
('300308.SZ', '2026-04-22', '15:00:00', 134.00, 134.50, 133.50, 134.50, 50000, 67125000);
```

---

## 📊 数据质量校验SQL

### 1. 缺失值检查
```sql
-- 检查日线数据缺失
SELECT symbol, trade_date, 
       CASE WHEN open IS NULL THEN 'open' END AS missing_fields
FROM market_bar_1d
WHERE open IS NULL OR high IS NULL OR low IS NULL OR close IS NULL;
```

### 2. 重复数据检查
```sql
-- 检查分钟数据重复
SELECT symbol, trade_date, bar_time, COUNT(*) as cnt
FROM market_bar_1m
GROUP BY symbol, trade_date, bar_time
HAVING COUNT(*) > 1;
```

### 3. 时间错位检查
```sql
-- 检查分钟时间范围
SELECT COUNT(*) 
FROM market_bar_1m 
WHERE bar_time < '09:30:00' OR bar_time > '15:00:00';
```

### 4. 异常跳点检查
```sql
-- 检查价格异常波动 (>10%)
SELECT symbol, trade_date, 
       (close - LAG(close) OVER (PARTITION BY symbol ORDER BY trade_date)) / 
       LAG(close) OVER (PARTITION BY symbol ORDER BY trade_date) * 100 AS change_pct
FROM market_bar_1d
WHERE ABS((close - LAG(close) OVER (PARTITION BY symbol ORDER BY trade_date)) / 
       LAG(close) OVER (PARTITION BY symbol ORDER BY trade_date) * 100) > 10;
```

---

## 🔄 数据更新脚本

### 日线数据更新 (收盘后)
```sql
-- 更新前一日日线数据
UPDATE market_bar_1d
SET 
    change_pct = (close - prev_close) / prev_close * 100,
    turnover_rate = volume / (
        SELECT total_share FROM symbol_master WHERE symbol = market_bar_1d.symbol
    ) * 100
WHERE trade_date = CURRENT_DATE - INTERVAL '1 day';
```

### 分钟数据汇总
```sql
-- 每日收盘汇总分钟数据到日线
INSERT INTO market_bar_1d (symbol, trade_date, open, high, low, close, volume, amount)
SELECT 
    symbol,
    trade_date,
    MIN(open) filter (WHERE bar_time = '09:30:00') AS open,
    MAX(high) AS high,
    MIN(low) AS low,
    MAX(close) filter (WHERE bar_time = '15:00:00') AS close,
    SUM(volume) AS volume,
    SUM(amount) AS amount
FROM market_bar_1m
WHERE trade_date = CURRENT_DATE - INTERVAL '1 day'
GROUP BY symbol, trade_date;
```

---

## 📝 数据导入流程建议

### 实时数据接入
1. **数据源**: AkShare + TuShare Pro +交易所官网
2. **接入频率**: 
   - 分钟数据: 每分钟1次 (交易时段)
   - 日线数据: 每日收盘后1次
3. **缓存层**: Redis (实时数据)
4. **数据库**: PostgreSQL (历史数据)

### 数据质量保障
- **实时校验**: 插入前检查价格、成交量逻辑
- **每日校验**: 检查数据完整性、时间连续性
- **人工复核**: 每周抽查数据质量

### 数据保留策略
- 分钟数据: 保留 90 天
- 日线数据: 永久保留
- 指标快照: 保留 180 天

---

## 🚀 下一步行动

1. **建立数据库连接**
   - PostgreSQL: 本地/云实例
   - Redis: 本地/云实例

2. **创建表结构**
   - 执行 schema.sql

3. **初始数据导入**
   - 股票基础信息
   - 板块映射
   - 历史日线数据

4. **数据接入脚本**
   - AkShare/TuShare Pro API接入
   - 实时数据推送

5. **指标计算引擎**
   - RPS计算
   - ATR计算
   - 均线系统

6. **规则引擎实现**
   - V7.5规则字典
   - 规则匹配逻辑

7. **模拟交易引擎**
   - Backtrader集成
   - 模拟订单执行

---

**开发团队**: 量化架构组  
**版本**: V1.0  
**日期**: 2026-04-22