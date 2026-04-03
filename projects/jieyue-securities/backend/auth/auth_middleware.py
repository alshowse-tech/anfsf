"""
捷阅证券信息助手 - 认证中间件
提供 JWT 认证中间件和依赖注入
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from .jwt_service import jwt_service, JwtService
from .session_service import session_service, SessionService


# HTTP Bearer 认证方案
security = HTTPBearer(auto_error=False)


class AuthMiddleware:
    """认证中间件类"""
    
    def __init__(self, jwt_service: JwtService = None, 
                 session_service: SessionService = None):
        """
        初始化认证中间件
        
        Args:
            jwt_service: JWT 服务实例
            session_service: Session 服务实例
        """
        self.jwt_service = jwt_service or jwt_service
        self.session_service = session_service or session_service
    
    async def __call__(self, request: Request, call_next):
        """
        中间件调用
        
        Args:
            request: HTTP 请求
            call_next: 下一个处理函数
            
        Returns:
            Response: HTTP 响应
        """
        # 跳过认证的路径
        skip_paths = [
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/refresh",
            "/docs",
            "/openapi.json",
            "/health"
        ]
        
        if request.url.path in skip_paths:
            return await call_next(request)
        
        # 获取 Authorization 头
        auth_header = request.headers.get("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            return await call_next(request)
        
        token = auth_header.split(" ")[1]
        
        try:
            # 验证 JWT 令牌
            payload = self.jwt_service.verify_token(token)
            
            # 将用户信息添加到请求状态
            request.state.user_id = payload.get("sub")
            request.state.user_payload = payload
            
        except HTTPException:
            # 令牌无效，但继续处理 (由路由级别的依赖处理)
            pass
        
        return await call_next(request)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    jwt_service: JwtService = Depends(lambda: jwt_service)
) -> dict:
    """
    获取当前认证用户
    
    Args:
        credentials: HTTP Bearer 凭证
        jwt_service: JWT 服务实例
        
    Returns:
        dict: 用户信息
        
    Raises:
        HTTPException: 认证失败
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = jwt_service.verify_token(token)
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return {
        "user_id": user_id,
        "payload": payload
    }


async def get_current_user_id(
    current_user: dict = Depends(get_current_user)
) -> str:
    """
    获取当前用户 ID
    
    Args:
        current_user: 当前用户信息
        
    Returns:
        str: 用户 ID
    """
    return current_user["user_id"]


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    jwt_service: JwtService = Depends(lambda: jwt_service)
) -> Optional[dict]:
    """
    获取当前认证用户 (可选，允许未认证)
    
    Args:
        credentials: HTTP Bearer 凭证
        jwt_service: JWT 服务实例
        
    Returns:
        Optional[dict]: 用户信息，如果未认证则返回 None
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        payload = jwt_service.verify_token(token)
        
        user_id = payload.get("sub")
        if user_id is None:
            return None
        
        return {
            "user_id": user_id,
            "payload": payload
        }
    except HTTPException:
        return None


# 创建全局中间件实例
auth_middleware = AuthMiddleware()
