"""
MCP Message - MCP 消息

定义 Harness 间通信消息格式
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, Optional
import uuid
import json


@dataclass
class MCPMessage:
    """MCP 消息"""
    
    # 消息类型
    type: str  # request/response/event
    # 发送方
    source: str  # Harness 名称
    # 接收方
    target: str  # Harness 名称或 "*" 广播
    # 消息负载
    payload: Dict[str, Any]
    # 消息 ID
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    # 关联 ID (用于请求 - 响应配对)
    correlation_id: Optional[str] = None
    # 时间戳
    timestamp: datetime = field(default_factory=datetime.now)
    # 元数据
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "type": self.type,
            "source": self.source,
            "target": self.target,
            "payload": self.payload,
            "message_id": self.message_id,
            "correlation_id": self.correlation_id,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata
        }
    
    def to_json(self) -> str:
        """序列化为 JSON"""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, data: Dict) -> "MCPMessage":
        """从字典创建"""
        return cls(
            type=data["type"],
            source=data["source"],
            target=data["target"],
            payload=data["payload"],
            message_id=data.get("message_id", str(uuid.uuid4())),
            correlation_id=data.get("correlation_id"),
            timestamp=datetime.fromisoformat(data["timestamp"]),
            metadata=data.get("metadata", {})
        )
    
    @classmethod
    def from_json(cls, json_str: str) -> "MCPMessage":
        """从 JSON 创建"""
        return cls.from_dict(json.loads(json_str))
    
    # ========== 快捷方法 ==========
    
    @classmethod
    def request(cls, source: str, target: str, payload: Dict) -> "MCPMessage":
        """创建请求消息"""
        return cls(
            type="request",
            source=source,
            target=target,
            payload=payload
        )
    
    @classmethod
    def response(
        cls,
        source: str,
        target: str,
        payload: Dict,
        correlation_id: str
    ) -> "MCPMessage":
        """创建响应消息"""
        return cls(
            type="response",
            source=source,
            target=target,
            payload=payload,
            correlation_id=correlation_id
        )
    
    @classmethod
    def event(cls, source: str, payload: Dict, broadcast: bool = True) -> "MCPMessage":
        """创建事件消息"""
        return cls(
            type="event",
            source=source,
            target="*" if broadcast else "",
            payload=payload
        )
    
    def is_request(self) -> bool:
        """是否为请求消息"""
        return self.type == "request"
    
    def is_response(self) -> bool:
        """是否为响应消息"""
        return self.type == "response"
    
    def is_event(self) -> bool:
        """是否为事件消息"""
        return self.type == "event"
    
    def is_broadcast(self) -> bool:
        """是否为广播消息"""
        return self.target == "*"
