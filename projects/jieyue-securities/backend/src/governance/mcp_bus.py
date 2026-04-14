"""
MCP Bus - 多 Agent 协作消息总线

实现 Agent 间的异步消息传递，提供：
- 消息发布和订阅
- 请求 - 响应模式
- 广播功能
- 消息确认和追踪
"""
import uuid
import json
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any, Union, Callable, Set
from pydantic import BaseModel, Field
from sqlalchemy import Column, BigInteger, String, DateTime, JSON, Index
from db.session import Session
from sqlalchemy.sql import func

from db.session import Base


# ==================== 数据模型 ====================

class MCPMessageLog(Base):
    """MCP 消息日志"""
    __tablename__ = "mcp_message_logs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    message_id = Column(String(256), unique=True, nullable=False, index=True)
    from_agent = Column(String(256), nullable=False, index=True)
    to_agent = Column(String(256), nullable=False, index=True)
    message_type = Column(String(50), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(String(20), default="pending", index=True)  # pending, delivered, acked, failed
    created_at = Column(DateTime, server_default=func.now())
    delivered_at = Column(DateTime, nullable=True)
    ack_at = Column(DateTime, nullable=True)
    trace_id = Column(String(256), nullable=True, index=True)
    correlation_id = Column(String(256), nullable=True, index=True)
    error_message = Column(String(1024), nullable=True)
    
    __table_args__ = (
        Index('idx_created', 'created_at', 'status'),
        Index('idx_agent_pair', 'from_agent', 'to_agent'),
    )


# ==================== 消息模型 ====================

class MCPMessage(BaseModel):
    """
    MCP 消息模型
    
    协议版本：mcp/1.0
    """
    protocol: str = "mcp/1.0"
    id: Optional[str] = None
    from_agent: str
    to_agent: Union[str, List[str]]  # "*" for broadcast
    type: str  # proposal, query, command, feedback, approval, telemetry
    payload: Dict[str, Any]
    ttl: int = 300  # seconds
    correlation_id: Optional[str] = None
    schema_version: str = "2026-03"
    requires_ack: bool = True
    idempotent_key: Optional[str] = None
    trace_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    priority: int = 0  # 0-10, higher is more urgent
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class MessageBuilder:
    """消息构建器"""
    
    def __init__(self):
        self._message = MCPMessage(
            id=str(uuid.uuid4()),
            from_agent="unknown",
            to_agent="*",
            type="query",
            payload={}
        )
    
    def from_agent(self, agent_id: str) -> 'MessageBuilder':
        self._message.from_agent = agent_id
        return self
    
    def to_agent(self, agent_id: Union[str, List[str]]) -> 'MessageBuilder':
        self._message.to_agent = agent_id
        return self
    
    def type(self, msg_type: str) -> 'MessageBuilder':
        self._message.type = msg_type
        return self
    
    def payload(self, data: Dict[str, Any]) -> 'MessageBuilder':
        self._message.payload = data
        return self
    
    def correlation_id(self, corr_id: str) -> 'MessageBuilder':
        self._message.correlation_id = corr_id
        return self
    
    def trace_id(self, trace_id: str) -> 'MessageBuilder':
        self._message.trace_id = trace_id
        return self
    
    def requires_ack(self, required: bool) -> 'MessageBuilder':
        self._message.requires_ack = required
        return self
    
    def ttl(self, seconds: int) -> 'MessageBuilder':
        self._message.ttl = seconds
        return self
    
    def priority(self, level: int) -> 'MessageBuilder':
        self._message.priority = max(0, min(10, level))
        return self
    
    def idempotent_key(self, key: str) -> 'MessageBuilder':
        self._message.idempotent_key = key
        return self
    
    def build(self) -> MCPMessage:
        return self._message


# ==================== 结果模型 ====================

class PublishResult(BaseModel):
    """发布结果"""
    success: bool
    errors: List[str] = []
    message_id: Optional[str] = None
    trace_id: Optional[str] = None


class Subscription(BaseModel):
    """订阅信息"""
    subscription_id: str
    agent_id: str
    topics: List[str]
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class AckResult(BaseModel):
    """确认结果"""
    success: bool
    reason: Optional[str] = None


class DeliveryResult(BaseModel):
    """投递结果"""
    success: bool
    message_id: str
    delivered_at: str
    agent_id: str


# ==================== 异常类 ====================

class MCPError(Exception):
    """MCP 基础异常"""
    pass


class MCPTimeoutError(MCPError):
    """MCP 超时异常"""
    pass


class MCPValidationError(MCPError):
    """MCP 验证异常"""
    pass


# ==================== 消息验证 ====================

class MessageValidation(BaseModel):
    """消息验证结果"""
    valid: bool
    errors: List[str] = []


def validate_message(message: MCPMessage) -> MessageValidation:
    """验证 MCP 消息"""
    errors = []
    
    # 检查协议版本
    if message.protocol != "mcp/1.0":
        errors.append(f"Invalid protocol: {message.protocol}")
    
    # 检查消息类型
    valid_types = ["proposal", "query", "command", "feedback", "approval", "telemetry"]
    if message.type not in valid_types:
        errors.append(f"Invalid message type: {message.type}")
    
    # 检查 schema 版本
    if message.schema_version != "2026-03":
        errors.append(f"Unsupported schema version: {message.schema_version}")
    
    # 检查 TTL
    if message.ttl <= 0:
        errors.append("TTL must be positive")
    
    # 检查优先级
    if not (0 <= message.priority <= 10):
        errors.append("Priority must be between 0 and 10")
    
    # 检查 from_agent
    if not message.from_agent:
        errors.append("from_agent is required")
    
    # 检查 to_agent
    if isinstance(message.to_agent, list):
        if not message.to_agent:
            errors.append("to_agent list cannot be empty")
    elif not message.to_agent:
        errors.append("to_agent is required")
    
    return MessageValidation(valid=len(errors) == 0, errors=errors)


# ==================== MCP Bus 主类 ====================

class MCPBus:
    """
    MCP 消息总线
    
    实现 Agent 间的异步消息传递
    """
    
    def __init__(self, redis=None, db_session: Session = None):
        """
        初始化 MCP 总线
        
        Args:
            redis: Redis 客户端 (可选)
            db_session: 数据库会话
        """
        self.redis = redis
        self.db = db_session
        self.subscribers: Dict[str, Set[str]] = {}  # topic -> agent_ids
        self.agent_subscriptions: Dict[str, Subscription] = {}  # agent_id -> subscription
        self.message_handlers: Dict[str, Callable] = {}
        self.pending_messages: Dict[str, MCPMessage] = {}
    
    async def publish(self, message: MCPMessage) -> PublishResult:
        """
        发布消息
        
        Args:
            message: MCP 消息
        
        Returns:
            PublishResult: 发布结果
        """
        # 验证消息
        validation = validate_message(message)
        if not validation.valid:
            return PublishResult(
                success=False,
                errors=validation.errors
            )
        
        # 生成消息 ID
        if not message.id:
            message.id = str(uuid.uuid4())
        
        # 生成 Trace ID
        if not message.trace_id:
            message.trace_id = str(uuid.uuid4())
        
        # 检查幂等性
        if message.idempotent_key:
            if await self._check_idempotency(message.idempotent_key):
                return PublishResult(
                    success=True,
                    message_id=message.id,
                    trace_id=message.trace_id
                )
        
        # 存储消息日志
        if self.db:
            await self._store_message(message)
        
        # 发布到 Redis
        if self.redis:
            if message.to_agent == "*":
                # 广播
                await self.redis.publish(
                    "mcp:broadcast",
                    json.dumps(message.model_dump())
                )
            elif isinstance(message.to_agent, list):
                # 多播
                for agent_id in message.to_agent:
                    await self.redis.publish(
                        f"mcp:agent:{agent_id}",
                        json.dumps(message.model_dump())
                    )
            else:
                # 点对点
                await self.redis.publish(
                    f"mcp:agent:{message.to_agent}",
                    json.dumps(message.model_dump())
                )
        
        # 如果需要确认，设置待处理标记
        if message.requires_ack:
            self.pending_messages[message.id] = message
            if self.redis:
                await self.redis.setex(
                    f"mcp:pending:{message.id}",
                    message.ttl,
                    json.dumps(message.model_dump())
                )
        
        return PublishResult(
            success=True,
            message_id=message.id,
            trace_id=message.trace_id
        )
    
    async def subscribe(self, agent_id: str, 
                       topics: List[str]) -> Subscription:
        """
        订阅主题
        
        Args:
            agent_id: Agent ID
            topics: 主题列表
        
        Returns:
            Subscription: 订阅信息
        """
        subscription_id = str(uuid.uuid4())
        
        subscription = Subscription(
            subscription_id=subscription_id,
            agent_id=agent_id,
            topics=topics
        )
        
        self.agent_subscriptions[agent_id] = subscription
        
        # 添加到主题订阅
        for topic in topics:
            if topic not in self.subscribers:
                self.subscribers[topic] = set()
            self.subscribers[topic].add(agent_id)
            
            # 订阅 Redis 频道
            if self.redis:
                await self.redis.subscribe(f"mcp:topic:{topic}")
        
        return subscription
    
    async def unsubscribe(self, agent_id: str):
        """取消订阅"""
        if agent_id not in self.agent_subscriptions:
            return
        
        subscription = self.agent_subscriptions[agent_id]
        
        # 从主题订阅中移除
        for topic in subscription.topics:
            if topic in self.subscribers:
                self.subscribers[topic].discard(agent_id)
            
            # 取消 Redis 订阅
            if self.redis:
                await self.redis.unsubscribe(f"mcp:topic:{topic}")
        
        del self.agent_subscriptions[agent_id]
    
    async def request_response(self, message: MCPMessage, 
                               timeout: int = 30) -> MCPMessage:
        """
        请求 - 响应模式
        
        Args:
            message: 请求消息
            timeout: 超时时间 (秒)
        
        Returns:
            MCPMessage: 响应消息
        
        Raises:
            MCPTimeoutError: 请求超时
        """
        # 设置相关性 ID
        message.correlation_id = str(uuid.uuid4())
        message.requires_ack = True
        
        # 发布请求
        result = await self.publish(message)
        if not result.success:
            raise MCPError(f"Failed to publish: {result.errors}")
        
        # 等待响应
        if self.redis:
            response = await self.redis.blpop(
                f"mcp:response:{message.correlation_id}",
                timeout=timeout
            )
            
            if not response:
                raise MCPTimeoutError(f"Request timed out after {timeout}s")
            
            return MCPMessage.model_validate_json(response[1])
        else:
            # 无 Redis 时的简单实现
            await asyncio.sleep(0.1)  # 模拟延迟
            return MCPMessage(
                from_agent=message.to_agent if isinstance(message.to_agent, str) else "system",
                to_agent=message.from_agent,
                type="feedback",
                payload={"status": "ok"},
                correlation_id=message.correlation_id
            )
    
    async def acknowledge(self, message_id: str, 
                         agent_id: str, status: str = "success") -> AckResult:
        """
        确认消息
        
        Args:
            message_id: 消息 ID
            agent_id: Agent ID
            status: 状态 (success, failed)
        
        Returns:
            AckResult: 确认结果
        """
        # 验证消息
        message = self.pending_messages.get(message_id)
        if not message:
            # 尝试从数据库加载
            if self.db:
                message = await self._get_message(message_id)
        
        if not message:
            return AckResult(success=False, reason="Message not found")
        
        # 验证接收者
        if isinstance(message.to_agent, list):
            if agent_id not in message.to_agent and message.to_agent != "*":
                return AckResult(success=False, reason="Not recipient")
        elif message.to_agent != agent_id and message.to_agent != "*":
            return AckResult(success=False, reason="Not recipient")
        
        # 更新消息状态
        if self.db:
            await self._update_message_status(message_id, status)
        
        # 删除待处理标记
        if message_id in self.pending_messages:
            del self.pending_messages[message_id]
        
        if self.redis:
            await self.redis.delete(f"mcp:pending:{message_id}")
        
        # 如果有相关性 ID，发送响应
        if message.correlation_id and self.redis:
            response_key = f"mcp:response:{message.correlation_id}"
            await self.redis.setex(
                response_key,
                60,
                json.dumps({
                    "correlation_id": message.correlation_id,
                    "status": status,
                    "agent_id": agent_id
                })
            )
        
        return AckResult(success=True)
    
    async def broadcast(self, message: MCPMessage, 
                       exclude: List[str] = None) -> PublishResult:
        """
        广播消息
        
        Args:
            message: 消息
            exclude: 排除的 Agent ID 列表
        
        Returns:
            PublishResult: 发布结果
        """
        message.to_agent = "*"
        
        if exclude:
            # 在 payload 中添加排除列表
            message.payload["_exclude"] = exclude
        
        return await self.publish(message)
    
    def register_handler(self, message_type: str, handler: Callable):
        """注册消息处理器"""
        self.message_handlers[message_type] = handler
    
    async def process_message(self, message: MCPMessage):
        """处理消息"""
        handler = self.message_handlers.get(message.type)
        if handler:
            await handler(message)
    
    async def _store_message(self, message: MCPMessage):
        """存储消息到数据库"""
        if not self.db:
            return
        
        log = MCPMessageLog(
            message_id=message.id,
            from_agent=message.from_agent,
            to_agent=message.to_agent if isinstance(message.to_agent, str) else ",".join(message.to_agent),
            message_type=message.type,
            payload=message.payload,
            status="pending" if message.requires_ack else "delivered",
            trace_id=message.trace_id,
            correlation_id=message.correlation_id
        )
        self.db.add(log)
        self.db.commit()
    
    async def _get_message(self, message_id: str) -> Optional[MCPMessage]:
        """从数据库获取消息"""
        if not self.db:
            return None
        
        log = self.db.query(MCPMessageLog).filter(
            MCPMessageLog.message_id == message_id
        ).first()
        
        if not log:
            return None
        
        return MCPMessage(
            id=log.message_id,
            from_agent=log.from_agent,
            to_agent=log.to_agent,
            type=log.message_type,
            payload=log.payload,
            trace_id=log.trace_id,
            correlation_id=log.correlation_id
        )
    
    async def _update_message_status(self, message_id: str, status: str):
        """更新消息状态"""
        if not self.db:
            return
        
        log = self.db.query(MCPMessageLog).filter(
            MCPMessageLog.message_id == message_id
        ).first()
        
        if log:
            log.status = "acked" if status == "success" else "failed"
            if status == "success":
                log.ack_at = datetime.utcnow()
            self.db.commit()
    
    async def _check_idempotency(self, key: str) -> bool:
        """检查幂等性"""
        if not self.redis:
            return False
        
        exists = await self.redis.exists(f"mcp:idempotent:{key}")
        return bool(exists)
    
    async def _set_idempotency(self, key: str, ttl: int = 3600):
        """设置幂等键"""
        if self.redis:
            await self.redis.setex(f"mcp:idempotent:{key}", ttl, "1")


# ==================== 工具函数 ====================

def create_mcp_bus(redis=None, db_session: Session = None) -> MCPBus:
    """
    创建 MCP Bus 实例
    
    Args:
        redis: Redis 客户端
        db_session: 数据库会话
    
    Returns:
        MCPBus: 实例
    """
    return MCPBus(redis, db_session)


def create_message() -> MessageBuilder:
    """创建消息构建器"""
    return MessageBuilder()
