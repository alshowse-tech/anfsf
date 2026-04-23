"""
数据库模型定义
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Date, Time, Numeric, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime, date, time


class User(Base):
    """用户表"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="trader")  # trader, admin, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    tokens = relationship("Token", back_populates="user")


class Token(Base):
    """JWT Token 表"""
    __tablename__ = "tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(500), unique=True, index=True, nullable=False)
    token_type = Column(String(20), default="access")
    is_revoked = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="tokens")


class SymbolMaster(Base):
    """股票基础信息表"""
    __tablename__ = "symbol_master"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    exchange = Column(String(10), nullable=False)  # SH, SZ, BJ
    market = Column(String(10))  # 主板/创业板/科创板
    list_date = Column(Date)
    delist_date = Column(Date)
    status = Column(String(10), default="active")  # active, suspended, delisted
    sector = Column(String(50))  # 申万一级行业
    industry = Column(String(50))  # 申万二级行业
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class MarketBar1d(Base):
    """日线行情表"""
    __tablename__ = "market_bar_1d"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    trade_date = Column(Date, nullable=False, index=True)
    open = Column(Numeric(12, 4), nullable=False)
    high = Column(Numeric(12, 4), nullable=False)
    low = Column(Numeric(12, 4), nullable=False)
    close = Column(Numeric(12, 4), nullable=False)
    volume = Column(Integer, nullable=False)
    amount = Column(Numeric(16, 2), nullable=False)
    prev_close = Column(Numeric(12, 4))
    change_pct = Column(Numeric(8, 4))
    created_at = Column(DateTime, server_default=func.now())


class MarketBar1m(Base):
    """分钟线行情表"""
    __tablename__ = "market_bar_1m"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    trade_date = Column(Date, nullable=False, index=True)
    bar_time = Column(Time, nullable=False)
    open = Column(Numeric(12, 4), nullable=False)
    high = Column(Numeric(12, 4), nullable=False)
    low = Column(Numeric(12, 4), nullable=False)
    close = Column(Numeric(12, 4), nullable=False)
    volume = Column(Integer, nullable=False)
    amount = Column(Numeric(16, 2), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class WatchList(Base):
    """白名单表"""
    __tablename__ = "watchlist"
    
    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(String(50), index=True)
    version_name = Column(String(100), nullable=False)
    symbol = Column(String(20), nullable=False)
    priority = Column(Integer, default=0)  # 0:普通，1:重要，2:核心
    is_active = Column(Boolean, default=True)
    added_at = Column(DateTime, server_default=func.now())
    status = Column(String(20), default="active")  # active, archived


class Position(Base):
    """持仓表"""
    __tablename__ = "positions"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    cost_price = Column(Numeric(12, 4), nullable=False)
    current_price = Column(Numeric(12, 4))
    first_buy_date = Column(Date)
    hold_days = Column(Integer, default=0)
    is_mainline = Column(Boolean, default=False)
    is_auto_rebuy = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TradeOrder(Base):
    """交易委托表"""
    __tablename__ = "trade_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(50), unique=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    side = Column(String(10), nullable=False)  # buy, sell
    order_type = Column(String(20), nullable=False)  # market, limit, stop_loss, take_profit
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(12, 4))
    status = Column(String(20), default="pending")  # pending, filled, cancelled, expired
    filled_qty = Column(Integer, default=0)
    filled_avg_price = Column(Numeric(12, 4))
    created_at = Column(DateTime, server_default=func.now())
    filled_at = Column(DateTime)


class TradeSignal(Base):
    """交易信号表"""
    __tablename__ = "trade_signals"
    
    id = Column(Integer, primary_key=True, index=True)
    signal_id = Column(String(50), unique=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    trade_date = Column(Date, nullable=False)
    signal_time = Column(DateTime, nullable=False)
    signal_type = Column(String(10), nullable=False)  # BUY, SELL, HOLD, REBUY
    signal_reason = Column(Text)
    rule_ids = Column(JSON)  # ['B001', 'B002']
    signal_strength = Column(Float)
    status = Column(String(20), default="pending")  # pending, executed, cancelled
    created_at = Column(DateTime, server_default=func.now())


class RuleHitLog(Base):
    """规则命中日志表"""
    __tablename__ = "rule_hit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(10), nullable=False, index=True)  # B001, B002...
    rule_name = Column(String(100), nullable=False)
    rule_type = Column(String(20))  # filter, pattern, stop_loss...
    symbol = Column(String(20), nullable=False, index=True)
    trade_date = Column(Date, nullable=False)
    trigger_time = Column(DateTime, nullable=False)
    trigger_reason = Column(Text)
    supporting_data = Column(JSON)
    is_valid = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
