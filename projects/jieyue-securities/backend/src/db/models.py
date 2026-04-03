# 数据库模型
from sqlalchemy import Column, BigInteger, String, DateTime, DECIMAL, Text, Enum, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from src.db.session import Base

# 任务状态枚举
class TaskStatus(str, PyEnum):
    INIT = "INIT"
    PARSING = "PARSING"
    PARSE_FAILED = "PARSE_FAILED"
    ASR_PROCESSING = "ASR_PROCESSING"
    ASR_FAILED = "ASR_FAILED"
    SUMMARIZING = "SUMMARIZING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

# 内容类型枚举
class ContentType(str, PyEnum):
    TEXT = "TEXT"
    AUDIO = "AUDIO"
    VIDEO = "VIDEO"

# 交易类型枚举
class TransactionType(str, PyEnum):
    RECHARGE = "RECHARGE"
    CONSUME = "CONSUME"
    REFUND = "REFUND"

# 交易状态枚举
class TransactionStatus(str, PyEnum):
    INIT = "INIT"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

# 用户表
class User(Base):
    __tablename__ = "users"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    phone = Column(String(20), nullable=True)
    wx_openid = Column(String(64), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    status = Column(Integer, default=1)

# 钱包表
class Wallet(Base):
    __tablename__ = "wallets"
    
    user_id = Column(BigInteger, primary_key=True)
    balance = Column(DECIMAL(10, 2), default=0, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

# 交易流水表
class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, nullable=False)
    task_id = Column(BigInteger, nullable=True)
    type = Column(Enum(TransactionType), nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.INIT)
    created_at = Column(DateTime, server_default=func.now())

# 任务表（核心）
class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, nullable=False)
    url = Column(Text, nullable=True)
    url_hash = Column(String(64), nullable=True)
    platform = Column(String(20), nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.INIT)
    content_type = Column(Enum(ContentType), nullable=True)
    duration = Column(Integer, nullable=True)  # 秒
    cost = Column(DECIMAL(10, 2), nullable=True)
    parse_provider = Column(String(20), nullable=True)
    asr_provider = Column(String(20), nullable=True)
    error_msg = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('user_id', 'url_hash', name='uniq_user_url'),
    )

# 内容表
class Content(Base):
    __tablename__ = "contents"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    task_id = Column(BigInteger, unique=True, nullable=False)
    raw_text = Column(Text, nullable=True)
    transcript = Column(Text, nullable=True)
    title = Column(String(512), nullable=True)
    author = Column(String(256), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

# 摘要表
class Summary(Base):
    __tablename__ = "summaries"
    
    task_id = Column(BigInteger, primary_key=True)
    key_points = Column(Text, nullable=True)  # JSON 格式
    abstract = Column(Text, nullable=True)
    risk_tags = Column(Text, nullable=True)  # JSON 格式
    created_at = Column(DateTime, server_default=func.now())

# 定价配置表
class PricingConfig(Base):
    __tablename__ = "pricing_configs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    base_price = Column(DECIMAL(10, 2), nullable=False)
    per_minute_price = Column(DECIMAL(10, 2), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    status = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
