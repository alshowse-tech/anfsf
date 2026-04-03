"""
捷阅证券信息助手 - 认证模块

提供完整的 JWT 认证系统，包括:
- JWT 令牌生成/验证
- 密码加密/验证
- Session 管理
- 认证中间件
- 登录/注册 API
"""

from .jwt_service import JwtService, jwt_service
from .password_service import PasswordService, password_service
from .session_service import SessionService, session_service
from .auth_middleware import AuthMiddleware, auth_middleware, get_current_user, get_current_user_id
from .auth_router import router as auth_router

__all__ = [
    "JwtService",
    "jwt_service",
    "PasswordService", 
    "password_service",
    "SessionService",
    "session_service",
    "AuthMiddleware",
    "auth_middleware",
    "get_current_user",
    "get_current_user_id",
    "auth_router"
]
