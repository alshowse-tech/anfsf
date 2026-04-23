"""
Context Manager - 上下文管理

管理请求上下文，支持跨 Harness 传递
"""
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
import uuid
import json


@dataclass
class RequestContext:
    """请求上下文"""
    request_id: str
    user_id: str
    session_id: str
    created_at: datetime
    data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "request_id": self.request_id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "created_at": self.created_at.isoformat(),
            "data": self.data,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "RequestContext":
        """从字典创建"""
        return cls(
            request_id=data["request_id"],
            user_id=data["user_id"],
            session_id=data["session_id"],
            created_at=datetime.fromisoformat(data["created_at"]),
            data=data.get("data", {}),
            metadata=data.get("metadata", {})
        )


class ContextManager:
    """上下文管理器"""
    
    def __init__(self):
        self.contexts: Dict[str, RequestContext] = {}
        self.max_contexts = 10000
    
    def create_context(
        self,
        user_id: str,
        session_id: str = None,
        initial_data: Dict = None
    ) -> RequestContext:
        """
        创建新上下文
        
        Args:
            user_id: 用户 ID
            session_id: 会话 ID (可选)
            initial_data: 初始数据
        
        Returns:
            上下文对象
        """
        request_id = str(uuid.uuid4())
        session_id = session_id or str(uuid.uuid4())
        
        context = RequestContext(
            request_id=request_id,
            user_id=user_id,
            session_id=session_id,
            created_at=datetime.now(),
            data=initial_data or {},
            metadata={}
        )
        
        # 清理过期上下文
        if len(self.contexts) >= self.max_contexts:
            self._cleanup()
        
        self.contexts[request_id] = context
        return context
    
    def get_context(self, request_id: str) -> Optional[RequestContext]:
        """获取上下文"""
        return self.contexts.get(request_id)
    
    def update_context(
        self,
        request_id: str,
        data: Dict = None,
        metadata: Dict = None
    ) -> bool:
        """更新上下文"""
        context = self.get_context(request_id)
        if not context:
            return False
        
        if data:
            context.data.update(data)
        if metadata:
            context.metadata.update(metadata)
        
        return True
    
    def delete_context(self, request_id: str) -> bool:
        """删除上下文"""
        if request_id in self.contexts:
            del self.contexts[request_id]
            return True
        return False
    
    def _cleanup(self):
        """清理过期上下文 (保留最近 1000 个)"""
        # 按创建时间排序
        sorted_contexts = sorted(
            self.contexts.items(),
            key=lambda x: x[1].created_at,
            reverse=True
        )
        
        # 保留最近 1000 个
        to_delete = sorted_contexts[1000:]
        for request_id, _ in to_delete:
            del self.contexts[request_id]
    
    def serialize(self, context: RequestContext) -> str:
        """序列化上下文 (用于 MCP 总线传递)"""
        return json.dumps(context.to_dict())
    
    def deserialize(self, data: str) -> RequestContext:
        """反序列化上下文"""
        return RequestContext.from_dict(json.loads(data))
    
    def get_session_contexts(self, session_id: str) -> list:
        """获取会话的所有上下文"""
        return [
            ctx for ctx in self.contexts.values()
            if ctx.session_id == session_id
        ]
