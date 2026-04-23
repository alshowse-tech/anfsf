-- ============================================
-- 股票操盘模拟系统 - PostgreSQL建表SQL
-- 版本: V1.0
-- 技术栈: Python + Pandas + Backtrader + PostgreSQL + Redis + FastAPI
-- ============================================

-- 创建 extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. symbol_master - 股票基础信息表
-- ============================================
CREATE TABLE symbol_master (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    exchange VARCHAR(10) NOT NULL,  -- SH: 上交所, SZ: 深交所
    market VARCHAR(10) NOT NULL,    -- 主板/创业板/科创板/北交所
    list_date DATE NOT NULL,
    delist_date DATE,
    status VARCHAR(10) DEFAULT 'active',  -- active, suspended, delisted
    sector VARCHAR(50),
    industry VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_symbol_exchange UNIQUE (symbol, exchange)
);

CREATE INDEX idx_symbol_master_symbol ON symbol_master(symbol);
CREATE INDEX idx_symbol_master_status ON symbol_master(status);
CREATE INDEX idx_symbol_master_market ON symbol_master(market);

COMMENT ON TABLE symbol_master IS '股票基础信息表';
COMMENT ON COLUMN symbol_master.symbol IS '股票代码 (如: 300308.SZ)';
COMMENT ON COLUMN symbol_master.exchange IS '交易所 (SH: 上交所, SZ: 深交所)';
COMMENT ON COLUMN symbol_master.market IS '市场类别 (主板/创业板/科创板/北交所)';
COMMENT ON COLUMN symbol_master.sector IS '申万一级行业';
COMMENT ON COLUMN symbol_master.industry IS '申万二级行业';

-- 示例数据
INSERT INTO symbol_master (symbol, name, exchange, market, list_date, sector, industry) VALUES
('300308.SZ', '中际旭创', 'SZ', '创业板', '2014-01-23', '通信', '光模块'),
('300502.SZ', '新 NL', 'SZ', '创业板', '2016-11-16', '电子', '半导体'),
('002463.SZ', '电科芯片', 'SZ', '主板', '2010-08-20', '电子', '半导体');

-- ============================================
-- 2. market_bar_1m - 分钟级别行情表 (1分钟)
-- ============================================
CREATE TABLE market_bar_1m (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    trade_date DATE NOT NULL,
    bar_time TIME NOT NULL,  -- 09:30:00 ~ 15:00:00
    open NUMERIC(12,4) NOT NULL,
    high NUMERIC(12,4) NOT NULL,
    low NUMERIC(12,4) NOT NULL,
    close NUMERIC(12,4) NOT NULL,
    volume BIGINT NOT NULL,      -- 成交量
    amount NUMERIC(16,2) NOT NULL,  -- 成交额
    amount_rad NUMERIC(16,2),    -- 成交额(元)
    CONSTRAINT pk_market_bar_1m PRIMARY KEY (symbol, trade_date, bar_time),
    CONSTRAINT chk_bar_time_range CHECK (bar_time >= '09:30:00' AND bar_time <= '15:00:00'),
    CONSTRAINT chk_price_positive CHECK (open > 0 AND high > 0 AND low > 0 AND close > 0),
    CONSTRAINT chk_volume_positive CHECK (volume > 0),
    CONSTRAINT chk_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_market_bar_1m_symbol_date ON market_bar_1m (symbol, trade_date);
CREATE INDEX idx_market_bar_1m_date ON market_bar_1m (trade_date);

-- 分区建议: 按月分区
-- CREATE TABLE market_bar_1m_202604 PARTITION OF market_bar_1m
--     FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

COMMENT ON TABLE market_bar_1m IS '分钟级别行情表 (1分钟)';
COMMENT ON COLUMN market_bar_1m.symbol IS '股票代码';
COMMENT ON COLUMN market_bar_1m.trade_date IS '交易日期';
COMMENT ON COLUMN market_bar_1m.bar_time IS '分钟时间点 (09:30:00 ~ 15:00:00)';
COMMENT ON COLUMN market_bar_1m.volume IS '成交手数';
COMMENT ON COLUMN market_bar_1m.amount IS '成交金额(万元)';

-- ============================================
-- 3. market_bar_1d - 日线行情表
-- ============================================
CREATE TABLE market_bar_1d (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    trade_date DATE NOT NULL,
    open NUMERIC(12,4) NOT NULL,
    high NUMERIC(12,4) NOT NULL,
    low NUMERIC(12,4) NOT NULL,
    close NUMERIC(12,4) NOT NULL,
    volume BIGINT NOT NULL,
    amount NUMERIC(16,2) NOT NULL,
    prev_close NUMERIC(12,4) NOT NULL,  -- 昨收价
    change_pct NUMERIC(8,4),            -- 涨跌幅 (%)
    turnover_rate NUMERIC(8,4),         -- 换手率 (%)
    pe_ttm NUMERIC(12,4),               -- TTM市盈率
    pb NUMERIC(8,4),                    -- 市净率
    ps_ttm NUMERIC(12,4),               -- TTM市销率
    mv NUMERIC(16,2),                   -- 市值(亿元)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT pk_market_bar_1d PRIMARY KEY (symbol, trade_date),
    CONSTRAINT chk_price_positive_1d CHECK (open > 0 AND high > 0 AND low > 0 AND close > 0),
    CONSTRAINT chk_volume_positive_1d CHECK (volume > 0)
);

CREATE INDEX idx_market_bar_1d_symbol ON market_bar_1d (symbol);
CREATE INDEX idx_market_bar_1d_date ON market_bar_1d (trade_date);
CREATE INDEX idx_market_bar_1d_symbol_date ON market_bar_1d (symbol, trade_date);

-- 分区策略: 按季度分区
-- CREATE TABLE market_bar_1d_2026Q1 PARTITION OF market_bar_1d
--     FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

COMMENT ON TABLE market_bar_1d IS '日线行情表';
COMMENT ON COLUMN market_bar_1d.turnover_rate IS '换手率 (%)';
COMMENT ON COLUMN market_bar_1d.pe_ttm IS 'TTM市盈率';
COMMENT ON COLUMN market_bar_1d.pb IS '市净率';
COMMENT ON COLUMN market_bar_1d.mv IS '市值(亿元)';

-- ============================================
-- 4. factor_snapshot - 指标快照表 (RPS/ATR/MACD/RSI/KDJ/均线)
-- ============================================
CREATE TABLE factor_snapshot (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    trade_date DATE NOT NULL,
    -- RPS 系列
    rps_10 NUMERIC(8,2),      -- RPS(10)
    rps_20 NUMERIC(8,2),      -- RPS(20)
    rps_50 NUMERIC(8,2),      -- RPS(50)
    rps_rank_10 INTEGER,      -- RPS(10) 排名
    rps_rank_20 INTEGER,      -- RPS(20) 排名
    rps_rank_50 INTEGER,      -- RPS(50) 排名
    -- 技术指标
    atr_14 NUMERIC(12,4),     -- ATR(14)
    macd_diff NUMERIC(12,4),  -- MACD DIF
    macd_dea NUMERIC(12,4),   -- MACD DEA
    macd_bar NUMERIC(12,4),   -- MACD BAR
    rsi_14 NUMERIC(8,2),      -- RSI(14)
    kdj_k NUMERIC(8,2),       -- KDJ K
    kdj_d NUMERIC(8,2),       -- KDJ D
    kdj_j NUMERIC(8,2),       -- KDJ J
    -- 均线系统
    ma_5 NUMERIC(12,4),       -- 5日均线
    ma_10 NUMERIC(12,4),      -- 10日均线
    ma_20 NUMERIC(12,4),      -- 20日均线
    ma_30 NUMERIC(12,4),      -- 30日均线
    ma_60 NUMERIC(12,4),      -- 60日均线
    ma_120 NUMERIC(12,4),     -- 120日均线
    ma_250 NUMERIC(12,4),     -- 250日均线
    -- 价格位置
    price_pos_ma_5 NUMERIC(8,4),  -- 价格偏离5日线 %
    price_pos_ma_10 NUMERIC(8,4), -- 价格偏离10日线 %
    price_pos_ma_20 NUMERIC(8,4), -- 价格偏离20日线 %
    -- 市场位置
    price_52w_high NUMERIC(12,4), -- 52周最高价
    price_52w_low NUMERIC(12,4),  -- 52周最低价
    price_52w_pos NUMERIC(8,4),   -- 52周位置 %
    -- 成分股标识
    is_hs300 BOOLEAN DEFAULT FALSE,   -- 沪深300
    is_zz500 BOOLEAN DEFAULT FALSE,   -- 中证500
    is_cybz BOOLEAN DEFAULT FALSE,    -- 创业板指
    is_sci BOOLEAN DEFAULT FALSE,     -- 科创50
    -- 标记字段
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT pk_factor_snapshot PRIMARY KEY (symbol, trade_date),
    CONSTRAINT chk_rps_value CHECK (
        (rps_10 IS NULL OR (rps_10 >= 0 AND rps_10 <= 100)) AND
        (rps_20 IS NULL OR (rps_20 >= 0 AND rps_20 <= 100)) AND
        (rps_50 IS NULL OR (rps_50 >= 0 AND rps_50 <= 100))
    ),
    CONSTRAINT chk_indicator_values CHECK (
        (atr_14 IS NULL OR atr_14 > 0) AND
        (rsi_14 IS NULL OR (rsi_14 >= 0 AND rsi_14 <= 100)) AND
        (kdj_k IS NULL OR (kdj_k >= 0 AND kdj_k <= 100)) AND
        (kdj_d IS NULL OR (kdj_d >= 0 AND kdj_d <= 100)) AND
        (kdj_j IS NULL OR (kdj_j >= 0 AND kdj_j <= 100))
    )
);

CREATE INDEX idx_factor_snapshot_symbol ON factor_snapshot (symbol);
CREATE INDEX idx_factor_snapshot_date ON factor_snapshot (trade_date);
CREATE INDEX idx_factor_snapshot_rps ON factor_snapshot (trade_date, rps_10 DESC, rps_20 DESC, rps_50 DESC);

COMMENT ON TABLE factor_snapshot IS '指标快照表 (RPS/ATR/MACD/RSI/KDJ/均线)';
COMMENT ON COLUMN factor_snapshot.rps_10 IS 'RPS(10) - 10日相对价格强度';
COMMENT ON COLUMN factor_snapshot.rps_rank_10 IS 'RPS(10) 排名';
COMMENT ON COLUMN factor_snapshot.atr_14 IS 'ATR(14) - 14日平均真实波幅';
COMMENT ON COLUMN factor_snapshot.price_pos_ma_5 IS '价格偏离5日线百分比';
COMMENT ON COLUMN factor_snapshot.price_52w_pos IS '52周位置百分比';

-- ============================================
-- 5. sector_membership - 板块与成分映射表
-- ============================================
CREATE TABLE sector_membership (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    sector_code VARCHAR(10) NOT NULL,     -- 申万一级行业代码
    sector_name VARCHAR(50) NOT NULL,     -- 申万一级行业名称
    sub_sector_code VARCHAR(12) NOT NULL, -- 申万二级行业代码
    sub_sector_name VARCHAR(100) NOT NULL,-- 申万二级行业名称
    weight NUMERIC(12,4) DEFAULT 1.0,   -- 成分股权重 (For ETF)
    effective_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_sector_membership UNIQUE (symbol, sector_code, effective_date)
);

CREATE INDEX idx_sector_membership_symbol ON sector_membership (symbol);
CREATE INDEX idx_sector_membership_sector ON sector_membership (sector_code, effective_date);

COMMENT ON TABLE sector_membership IS '板块与成分映射表 (申万行业)';
COMMENT ON COLUMN sector_membership.sector_code IS '申万一级行业代码 (如: 801010)';
COMMENT ON COLUMN sector_membership.sub_sector_code IS '申万二级行业代码 (如: 801011)';

-- ============================================
-- 6. watchlist_version - 操盘区白名单版本表
-- ============================================
CREATE TABLE watchlist_version (
    id BIGSERIAL PRIMARY KEY,
    version_id UUID DEFAULT uuid_generate_v4() NOT NULL,
    name VARCHAR(100) NOT NULL,           -- 版本名称
    description TEXT,                     -- 版本描述
    watchlist_type VARCHAR(20) NOT NULL,  -- whitelist: 操作区白名单, candidate: 候选池
    status VARCHAR(10) DEFAULT 'active',  -- active, archived
    created_by VARCHAR(50) NOT NULL,      -- 创建者
    created_at TIMESTAMPTZ DEFAULT NOW(),
    effective_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    CONSTRAINT uk_watchlist_version UNIQUE (version_id)
);

CREATE INDEX idx_watchlist_version_status ON watchlist_version (status, effective_date);

COMMENT ON TABLE watchlist_version IS '操盘区白名单版本表';
COMMENT ON COLUMN watchlist_version.watchlist_type IS 'whitelist: 操作区白名单, candidate: 候选池';
COMMENT ON COLUMN watchlist_version.created_by IS '创建者 (操作员ID)';

-- ============================================
-- 7. watchlist_item - 白名单具体股票项目
-- ============================================
CREATE TABLE watchlist_item (
    id BIGSERIAL PRIMARY KEY,
    version_id UUID NOT NULL REFERENCES watchlist_version(version_id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    reason TEXT,                          -- 加入理由
    priority INTEGER DEFAULT 0,           -- 优先级 (0: 普通, 1: 重要, 2: 核心)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_watchlist_item UNIQUE (version_id, symbol)
);

CREATE INDEX idx_watchlist_item_version ON watchlist_item (version_id);
CREATE INDEX idx_watchlist_item_symbol ON watchlist_item (symbol);
CREATE INDEX idx_watchlist_item_priority ON watchlist_item (priority DESC);

COMMENT ON TABLE watchlist_item IS '白名单具体股票项目';
COMMENT ON COLUMN watchlist_item.reason IS '加入白名单的理由';
COMMENT ON COLUMN watchlist_item.priority IS '优先级 (0: 普通, 1: 重要, 2: 核心)';

-- ============================================
-- 8. trade_signal - 规则引擎输出信号表
-- ============================================
CREATE TABLE trade_signal (
    id BIGSERIAL PRIMARY KEY,
    signal_id UUID DEFAULT uuid_generate_v4() NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    trade_date DATE NOT NULL,
    signal_time TIMESTAMPTZ NOT NULL,     -- 信号生成时间
    signal_type VARCHAR(20) NOT NULL,     -- buy, sell, hold, watch
    signal_reason TEXT NOT NULL,          -- 信号原因 (规则ID组合)
    rule_ids TEXT[],                      -- 命中的规则ID数组
    signal_strength NUMERIC(8,4),         -- 信号强度 (0-1)
    expected_entry_price NUMERIC(12,4),   -- 预期入场价
    expected_exit_price NUMERIC(12,4),    -- 预期出场价
    stop_loss_price NUMERIC(12,4),        -- 止损价
    take_profit_price NUMERIC(12,4),      -- 止盈价
    hold_days INTEGER DEFAULT 5,          -- 预期持有天数
    risk_level VARCHAR(10) DEFAULT 'medium', -- 风险等级 (low, medium, high)
    status VARCHAR(10) DEFAULT 'pending', -- pending, executed, cancelled, expired
    created_at TIMESTAMPTZ DEFAULT NOW(),
    executed_at TIMESTAMPTZ,
    CONSTRAINT uk_trade_signal UNIQUE (signal_id)
);

CREATE INDEX idx_trade_signal_symbol ON trade_signal (symbol);
CREATE INDEX idx_trade_signal_date ON trade_signal (trade_date);
CREATE INDEX idx_trade_signal_status ON trade_signal (status);
CREATE INDEX idx_trade_signal_rule ON trade_signal (rule_ids);

COMMENT ON TABLE trade_signal IS '规则引擎输出信号表';
COMMENT ON COLUMN trade_signal.signal_type IS 'buy: 买入, sell: 卖出, hold: 持有, watch: 观察';
COMMENT ON COLUMN trade_signal.signal_reason IS '信号原因 (规则ID组合, 以逗号分隔)';
COMMENT ON COLUMN trade_signal.rule_ids IS '命中的规则ID数组';
COMMENT ON COLUMN trade_signal.stop_loss_price IS '止损价 (平台下沿或2×ATR)';

-- ============================================
-- 9. sim_order - 模拟委托表
-- ============================================
CREATE TABLE sim_order (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID DEFAULT uuid_generate_v4() NOT NULL,
    signal_id UUID NOT NULL REFERENCES trade_signal(signal_id),
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,            -- buy, sell
    order_type VARCHAR(20) NOT NULL,      -- market, limit, stop_loss, take_profit
    quantity INTEGER NOT NULL,            -- 买入数量 (股)
    price NUMERIC(12,4),                  -- 价格 (限价单/止损单/止盈单)
    status VARCHAR(20) DEFAULT 'pending', -- pending, filled, cancelled, expired
    filled_qty INTEGER DEFAULT 0,         -- 已成交数量
    filled_avg_price NUMERIC(12,4),       -- 成交均价
    commission NUMERIC(12,4) DEFAULT 0,   -- 手续费
    tax NUMERIC(12,4) DEFAULT 0,          -- 印花税
    created_at TIMESTAMPTZ DEFAULT NOW(),
    filled_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    CONSTRAINT uk_sim_order UNIQUE (order_id),
    CONSTRAINT chk_order_quantity CHECK (quantity > 0),
    CONSTRAINT chk_filled_qty CHECK (filled_qty >= 0 AND filled_qty <= quantity)
);

CREATE INDEX idx_sim_order_signal ON sim_order (signal_id);
CREATE INDEX idx_sim_order_symbol ON sim_order (symbol);
CREATE INDEX idx_sim_order_status ON sim_order (status);
CREATE INDEX idx_sim_order_created ON sim_order (created_at);

COMMENT ON TABLE sim_order IS '模拟委托表';
COMMENT ON COLUMN sim_order.order_type IS 'market: 市价, limit: 限价, stop_loss: 止损, take_profit: 止盈';
COMMENT ON COLUMN sim_order.commission IS '手续费 (Simulated)';
COMMENT ON COLUMN sim_order.tax IS '印花税 (Simulated)';

-- ============================================
-- 10. sim_fill - 模拟成交表
-- ============================================
CREATE TABLE sim_fill (
    id BIGSERIAL PRIMARY KEY,
    fill_id UUID DEFAULT uuid_generate_v4() NOT NULL,
    order_id UUID NOT NULL REFERENCES sim_order(order_id),
    trade_date DATE NOT NULL,
    fill_time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,            -- buy, sell
    quantity INTEGER NOT NULL,
    price NUMERIC(12,4) NOT NULL,
    commission NUMERIC(12,4) DEFAULT 0,
    tax NUMERIC(12,4) DEFAULT 0,
    total_amount NUMERIC(16,2) NOT NULL,
    slippage NUMERIC(12,4),               -- 滑点
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_sim_fill UNIQUE (fill_id),
    CONSTRAINT chk_fill_quantity CHECK (quantity > 0),
    CONSTRAINT chk_fill_price CHECK (price > 0)
);

CREATE INDEX idx_sim_fill_order ON sim_fill (order_id);
CREATE INDEX idx_sim_fill_symbol ON sim_fill (symbol);
CREATE INDEX idx_sim_fill_date ON sim_fill (trade_date);

COMMENT ON TABLE sim_fill IS '模拟成交表';
COMMENT ON COLUMN sim_fill.slippage IS '滑点 (Simulated)';

-- ============================================
-- 11. position_account - 持仓与账户净值快照表
-- ============================================
CREATE TABLE position_account (
    id BIGSERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    snapshot_time TIMESTAMPTZ,            -- 交易时段 snapshots
    total_assets NUMERIC(16,2),           -- 总资产
    cash_balance NUMERIC(16,2),           -- 现金余额
    market_value NUMERIC(16,2),           -- 市值
    total_profit NUMERIC(16,2),           -- 总盈亏
    return_rate NUMERIC(12,4),            -- 累计收益率 (%)
    daily_profit NUMERIC(16,2),           -- 当日盈亏
    daily_return_rate NUMERIC(12,4),      -- 当日收益率 (%)
    drawdown NUMERIC(12,4),               -- 回撤 (%)
    max_drawdown NUMERIC(12,4),           -- 最大回撤 (%)
    sharpe_ratio NUMERIC(12,4),           -- 夏普比率
    sortino_ratio NUMERIC(12,4),          -- 索提诺比率
    win_rate NUMERIC(8,4),                -- 胜率 (%)
    profit_factor NUMERIC(12,4),          -- 盈亏比
    position_count INTEGER DEFAULT 0,     -- 持仓数量
    position_max NUMERIC(8,4),            -- 单股最大仓位 (%)
    sector_concentration NUMERIC(8,4),    -- 行业集中度
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_position_account_snapshot UNIQUE (snapshot_date, snapshot_time)
);

CREATE INDEX idx_position_account_date ON position_account (snapshot_date);

COMMENT ON TABLE position_account IS '持仓与账户净值快照表';
COMMENT ON COLUMN position_account.return_rate IS '累计收益率 (%)';
COMMENT ON COLUMN position_account.drawdown IS '回撤 (%)';
COMMENT ON COLUMN position_account.sharpe_ratio IS '夏普比率';
COMMENT ON COLUMN position_account.win_rate IS '胜率 (%)';
COMMENT ON COLUMN position_account.position_max IS '单股最大仓位 (%)';

-- ============================================
-- 12. sim_position - 实际持仓明细表
-- ============================================
CREATE TABLE sim_position (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES position_account(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,            -- 持仓数量
    cost_price NUMERIC(12,4) NOT NULL,    -- 成本价
    current_price NUMERIC(12,4) NOT NULL, -- 当前价
    market_value NUMERIC(16,2) NOT NULL,  -- 市值
    profit_loss NUMERIC(16,2) NOT NULL,   -- 盈亏
    profit_rate NUMERIC(12,4) NOT NULL,   -- 盈亏率 (%)
    position_pct NUMERIC(12,4) NOT NULL,  -- 占比 (%)
    first_buy_date DATE NOT NULL,         -- 首次买入日期
    last_buy_date DATE NOT NULL,          -- 最近买入日期
    last_sell_date DATE,                  -- 最近卖出日期
    hold_days INTEGER NOT NULL,           -- 持仓天数
    is_mainline BOOLEAN DEFAULT FALSE,    -- 是否主线股
    is_auto_rebuy BOOLEAN DEFAULT FALSE,  -- 是否启用自动回补
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_sim_position UNIQUE (account_id, symbol),
    CONSTRAINT chk_position_quantity CHECK (quantity >= 0),
    CONSTRAINT chk_position_pct CHECK (position_pct >= 0 AND position_pct <= 100)
);

CREATE INDEX idx_sim_position_account ON sim_position (account_id);
CREATE INDEX idx_sim_position_symbol ON sim_position (symbol);
CREATE INDEX idx_sim_position_mainline ON sim_position (is_mainline);

COMMENT ON TABLE sim_position IS '实际持仓明细表';
COMMENT ON COLUMN sim_position.is_mainline IS '是否主线股';
COMMENT ON COLUMN sim_position.is_auto_rebuy IS '是否启用自动回补';

-- ============================================
-- 13. system_log - 系统日志表
-- ============================================
CREATE TABLE system_log (
    id BIGSERIAL PRIMARY KEY,
    log_time TIMESTAMPTZ DEFAULT NOW(),
    log_level VARCHAR(10) NOT NULL,       -- DEBUG, INFO, WARN, ERROR, FATAL
    module VARCHAR(50) NOT NULL,          -- data, factor, rule, sim, api
    message TEXT NOT NULL,
    details JSONB,                        -- 详细信息
    trace_id VARCHAR(50),                 -- 追踪ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_log_time ON system_log (log_time DESC);
CREATE INDEX idx_system_log_level ON system_log (log_level);
CREATE INDEX idx_system_log_module ON system_log (module);

COMMENT ON TABLE system_log IS '系统日志表';
COMMENT ON COLUMN system_log.module IS '模块 (data, factor, rule, sim, api)';
COMMENT ON COLUMN system_log.details IS '详细信息 (JSONB)';