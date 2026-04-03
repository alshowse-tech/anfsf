"""
捷阅证券信息助手 - 速率限制中间件
防止 API 滥用和 DDoS 攻击
"""

import time
from collections import defaultdict
from typing import Dict, Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis
from dotenv import load_dotenv
import os

load_dotenv()


class RateLimiter:
    """速率限制器 - 基于令牌桶算法"""
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        初始化速率限制器
        
        Args:
            redis_url: Redis 连接 URL
        """
        redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis = redis.from_url(redis_url, decode_responses=True)
    
    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> bool:
        """
        检查请求是否允许
        
        Args:
            key: 限制键 (通常是用户 ID 或 IP)
            max_requests: 窗口期内最大请求数
            window_seconds: 时间窗口 (秒)
            
        Returns:
            bool: 是否允许请求
        """
        current_time = int(time.time())
        window_key = f"rate_limit:{key}:{current_time // window_seconds}"
        
        # 获取当前请求数
        current_count = self.redis.get(window_key)
        
        if current_count is None:
            # 第一次请求
            self.redis.setex(window_key, window_seconds, 1)
            return True
        
        current_count = int(current_count)
        
        if current_count >= max_requests:
            return False
        
        # 增加计数
        self.redis.incr(window_key)
        return True
    
    def get_remaining(self, key: str, max_requests: int, window_seconds: int) -> int:
        """
        获取剩余请求数
        
        Args:
            key: 限制键
            max_requests: 窗口期内最大请求数
            window_seconds: 时间窗口 (秒)
            
        Returns:
            int: 剩余请求数
        """
        current_time = int(time.time())
        window_key = f"rate_limit:{key}:{current_time // window_seconds}"
        
        current_count = self.redis.get(window_key)
        
        if current_count is None:
            return max_requests
        
        return max(0, max_requests - int(current_count))


class RateLimitMiddleware(BaseHTTPMiddleware):
    """速率限制中间件"""
    
    def __init__(self, app, 
                 requests_per_minute: int = 60,
                 requests_per_hour: int = 1000,
                 redis_url: Optional[str] = None):
        """
        初始化速率限制中间件
        
        Args:
            app: FastAPI 应用
            requests_per_minute: 每分钟最大请求数
            requests_per_hour: 每小时最大请求数
            redis_url: Redis 连接 URL
        """
        super().__init__(app)
        self.limiter = RateLimiter(redis_url)
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
    
    async def get_client_key(self, request: Request) -> str:
        """
        获取客户端标识
        
        Args:
            request: HTTP 请求
            
        Returns:
            str: 客户端标识 (IP 或用户 ID)
        """
        # 尝试获取用户 ID (如果已认证)
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            return f"user:{user_id}"
        
        # 使用 IP 地址
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip = forwarded_for.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"ip:{ip}"
    
    async def dispatch(self, request, call_next):
        """
        中间件分发
        
        Args:
            request: HTTP 请求
            call_next: 下一个处理函数
            
        Returns:
            Response: HTTP 响应
        """
        # 跳过特定路径
        skip_paths = ["/health", "/docs", "/openapi.json"]
        if request.url.path in skip_paths:
            return await call_next(request)
        
        client_key = await self.get_client_key(request)
        
        # 检查每分钟限制
        if not self.limiter.is_allowed(client_key, self.requests_per_minute, 60):
            remaining = self.limiter.get_remaining(client_key, self.requests_per_minute, 60)
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "请求过于频繁，请稍后再试",
                    "retry_after": 60
                },
                headers={
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": str(remaining),
                    "X-RateLimit-Reset": str(int(time.time()) + 60)
                }
            )
        
        # 处理请求
        response = await call_next(request)
        
        # 添加速率限制头
        remaining = self.limiter.get_remaining(client_key, self.requests_per_minute, 60)
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + 60)
        
        return response


# 创建中间件实例
def create_rate_limit_middleware(app, **kwargs):
    """
    创建速率限制中间件
    
    Args:
        app: FastAPI 应用
        **kwargs: 其他参数
        
    Returns:
        RateLimitMiddleware: 中间件实例
    """
    return RateLimitMiddleware(app, **kwargs)
