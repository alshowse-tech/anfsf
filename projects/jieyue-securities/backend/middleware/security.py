"""
捷阅证券信息助手 - CORS 和 CSRF 防护中间件
提供跨域资源共享和跨站请求伪造防护
"""

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import secrets
import hashlib
from typing import Optional, List
from dotenv import load_dotenv
import os

load_dotenv()


# ============== CORS 配置 ==============

def setup_cors(app: FastAPI):
    """
    配置 CORS
    
    Args:
        app: FastAPI 应用
    """
    # 从环境变量获取允许的来源
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8080")
    origins = [origin.strip() for origin in allowed_origins.split(",")]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Requested-With"],
        expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
        max_age=600,
    )


# ============== CSRF 防护 ==============

class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF 防护中间件"""
    
    def __init__(self, app, secret_key: Optional[str] = None, 
                 exempt_paths: Optional[List[str]] = None):
        """
        初始化 CSRF 中间件
        
        Args:
            app: FastAPI 应用
            secret_key: CSRF 密钥
            exempt_paths: 免验证路径列表
        """
        super().__init__(app)
        self.secret_key = secret_key or os.getenv("CSRF_SECRET_KEY", secrets.token_hex(32))
        self.exempt_paths = exempt_paths or [
            "/api/auth/login",
            "/api/auth/register",
            "/health",
            "/docs",
            "/openapi.json"
        ]
    
    def generate_csrf_token(self, session_id: str) -> str:
        """
        生成 CSRF 令牌
        
        Args:
            session_id: 会话 ID
            
        Returns:
            str: CSRF 令牌
        """
        token = secrets.token_hex(32)
        signature = hashlib.sha256(
            f"{token}{session_id}{self.secret_key}".encode()
        ).hexdigest()
        return f"{token}:{signature}"
    
    def validate_csrf_token(self, token: str, session_id: str) -> bool:
        """
        验证 CSRF 令牌
        
        Args:
            token: CSRF 令牌
            session_id: 会话 ID
            
        Returns:
            bool: 是否有效
        """
        try:
            token_part, signature_part = token.split(":")
            expected_signature = hashlib.sha256(
                f"{token_part}{session_id}{self.secret_key}".encode()
            ).hexdigest()
            return secrets.compare_digest(signature_part, expected_signature)
        except (ValueError, AttributeError):
            return False
    
    async def dispatch(self, request: Request, call_next):
        """
        中间件分发
        
        Args:
            request: HTTP 请求
            call_next: 下一个处理函数
            
        Returns:
            Response: HTTP 响应
        """
        # 跳过免验证路径
        if any(request.url.path.startswith(path) for path in self.exempt_paths):
            return await call_next(request)
        
        # 只验证状态变更方法
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return await call_next(request)
        
        # 获取 CSRF 令牌
        csrf_token = request.headers.get("X-CSRF-Token")
        session_id = request.cookies.get("session_id")
        
        # 如果没有 session_id，尝试从 Authorization 头获取
        if not session_id:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                # JWT 令牌作为 session_id 的替代
                session_id = auth_header[7:39]  # 取令牌的一部分
        
        # 验证 CSRF 令牌
        if csrf_token and session_id:
            if not self.validate_csrf_token(csrf_token, session_id):
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "CSRF 令牌无效"}
                )
        elif not csrf_token:
            # 如果没有 CSRF 令牌，返回 403
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "缺少 CSRF 令牌"}
            )
        
        return await call_next(request)


# ============== 请求签名验证 ==============

class RequestSignatureMiddleware(BaseHTTPMiddleware):
    """请求签名验证中间件"""
    
    def __init__(self, app, secret_key: Optional[str] = None,
                 timestamp_tolerance: int = 300):
        """
        初始化请求签名中间件
        
        Args:
            app: FastAPI 应用
            secret_key: 签名密钥
            timestamp_tolerance: 时间戳容差 (秒)
        """
        super().__init__(app)
        self.secret_key = secret_key or os.getenv("REQUEST_SIGNING_KEY", "")
        self.timestamp_tolerance = timestamp_tolerance
    
    async def dispatch(self, request: Request, call_next):
        """
        中间件分发
        
        Args:
            request: HTTP 请求
            call_next: 下一个处理函数
            
        Returns:
            Response: HTTP 响应
        """
        # 如果没有配置签名密钥，跳过验证
        if not self.secret_key:
            return await call_next(request)
        
        # 获取签名相关头
        signature = request.headers.get("X-Request-Signature")
        timestamp = request.headers.get("X-Request-Timestamp")
        
        # 如果没有签名头，跳过验证 (允许未签名请求)
        if not signature or not timestamp:
            return await call_next(request)
        
        # 验证时间戳
        try:
            timestamp_int = int(timestamp)
            current_time = int(time.time())
            if abs(current_time - timestamp_int) > self.timestamp_tolerance:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"detail": "请求已过期"}
                )
        except ValueError:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": "无效的时间戳"}
            )
        
        # 验证签名
        # TODO: 实现签名验证逻辑
        # expected_signature = self.generate_signature(request, timestamp)
        # if not secrets.compare_digest(signature, expected_signature):
        #     return JSONResponse(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         content={"detail": "签名验证失败"}
        #     )
        
        return await call_next(request)


# ============== 安全头中间件 ==============

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """安全头中间件"""
    
    async def dispatch(self, request: Request, call_next):
        """
        中间件分发
        
        Args:
            request: HTTP 请求
            call_next: 下一个处理函数
            
        Returns:
            Response: HTTP 响应
        """
        response = await call_next(request)
        
        # 添加安全头
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        
        return response


# ============== 中间件安装函数 ==============

def setup_security_middleware(app: FastAPI):
    """
    安装所有安全中间件
    
    Args:
        app: FastAPI 应用
    """
    # CORS
    setup_cors(app)
    
    # CSRF (如果启用)
    if os.getenv("ENABLE_CSRF", "true").lower() == "true":
        app.add_middleware(CSRFMiddleware)
    
    # 安全头
    app.add_middleware(SecurityHeadersMiddleware)


# 导入 time 用于签名中间件
import time
