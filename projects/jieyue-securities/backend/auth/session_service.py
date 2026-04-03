"""
捷阅证券信息助手 - Session 管理服务
提供用户会话的创建、验证、删除功能
"""

import redis
import json
import uuid
import datetime
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import os

load_dotenv()


class SessionService:
    """Session 服务类 - 管理用户会话"""
    
    def __init__(self, redis_url: Optional[str] = None, 
                 session_expire_hours: int = 24):
        """
        初始化 Session 服务
        
        Args:
            redis_url: Redis 连接 URL
            session_expire_hours: Session 过期时间 (小时)
        """
        self.session_expire_hours = session_expire_hours
        
        # 连接 Redis
        redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis = redis.from_url(redis_url, decode_responses=True)
    
    def create_session(self, user_id: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        创建新会话
        
        Args:
            user_id: 用户 ID
            metadata: 额外元数据
            
        Returns:
            str: Session ID
        """
        session_id = str(uuid.uuid4())
        expire_seconds = self.session_expire_hours * 3600
        
        session_data = {
            "user_id": user_id,
            "created_at": datetime.datetime.utcnow().isoformat(),
            "expires_at": (datetime.datetime.utcnow() + 
                          datetime.timedelta(hours=self.session_expire_hours)).isoformat(),
            "metadata": json.dumps(metadata or {}),
            "is_active": "true"
        }
        
        # 存储到 Redis
        session_key = f"session:{session_id}"
        self.redis.hset(session_key, mapping=session_data)
        self.redis.expire(session_key, expire_seconds)
        
        # 创建用户会话索引
        user_session_key = f"user_sessions:{user_id}"
        self.redis.sadd(user_session_key, session_id)
        self.redis.expire(user_session_key, expire_seconds)
        
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        获取会话信息
        
        Args:
            session_id: Session ID
            
        Returns:
            Dict: 会话数据，如果不存在则返回 None
        """
        session_key = f"session:{session_id}"
        session_data = self.redis.hgetall(session_key)
        
        if not session_data:
            return None
        
        # 检查会话是否活跃
        if session_data.get("is_active") != "true":
            return None
        
        # 解析元数据
        if "metadata" in session_data:
            try:
                session_data["metadata"] = json.loads(session_data["metadata"])
            except json.JSONDecodeError:
                session_data["metadata"] = {}
        
        return session_data
    
    def validate_session(self, session_id: str) -> bool:
        """
        验证会话是否有效
        
        Args:
            session_id: Session ID
            
        Returns:
            bool: 会话是否有效
        """
        session_data = self.get_session(session_id)
        return session_data is not None
    
    def refresh_session(self, session_id: str) -> bool:
        """
        刷新会话过期时间
        
        Args:
            session_id: Session ID
            
        Returns:
            bool: 是否刷新成功
        """
        session_key = f"session:{session_id}"
        if not self.redis.exists(session_key):
            return False
        
        expire_seconds = self.session_expire_hours * 3600
        self.redis.expire(session_key, expire_seconds)
        
        # 更新过期时间
        self.redis.hset(session_key, "expires_at", 
                       (datetime.datetime.utcnow() + 
                        datetime.timedelta(hours=self.session_expire_hours)).isoformat())
        return True
    
    def delete_session(self, session_id: str) -> bool:
        """
        删除会话 (登出)
        
        Args:
            session_id: Session ID
            
        Returns:
            bool: 是否删除成功
        """
        session_key = f"session:{session_id}"
        session_data = self.redis.hgetall(session_key)
        
        if not session_data:
            return False
        
        user_id = session_data.get("user_id")
        
        # 删除会话
        self.redis.delete(session_key)
        
        # 从用户会话索引中移除
        if user_id:
            user_session_key = f"user_sessions:{user_id}"
            self.redis.srem(user_session_key, session_id)
        
        return True
    
    def delete_user_sessions(self, user_id: str) -> int:
        """
        删除用户的所有会话 (强制登出所有设备)
        
        Args:
            user_id: 用户 ID
            
        Returns:
            int: 删除的会话数量
        """
        user_session_key = f"user_sessions:{user_id}"
        session_ids = self.redis.smembers(user_session_key)
        
        count = 0
        for session_id in session_ids:
            if self.delete_session(session_id):
                count += 1
        
        # 删除用户会话索引
        self.redis.delete(user_session_key)
        
        return count
    
    def get_user_sessions(self, user_id: str) -> list:
        """
        获取用户的所有活跃会话
        
        Args:
            user_id: 用户 ID
            
        Returns:
            list: 会话 ID 列表
        """
        user_session_key = f"user_sessions:{user_id}"
        return list(self.redis.smembers(user_session_key))


# 创建全局 Session 服务实例
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
SESSION_EXPIRE_HOURS = int(os.getenv("SESSION_EXPIRE_HOURS", "24"))

session_service = SessionService(
    redis_url=REDIS_URL,
    session_expire_hours=SESSION_EXPIRE_HOURS
)
