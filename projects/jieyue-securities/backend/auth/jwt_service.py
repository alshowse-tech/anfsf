"""
捷阅证券信息助手 - JWT 认证服务
提供 JWT 令牌的生成、验证和刷新功能
"""

import jwt
import datetime
from typing import Optional, Dict, Any
from functools import wraps
from fastapi import HTTPException, status, Request
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError


class JwtService:
    """JWT 服务类 - 处理令牌生成、验证和刷新"""
    
    def __init__(self, secret_key: str, algorithm: str = "HS256", 
                 access_token_expire_minutes: int = 30,
                 refresh_token_expire_days: int = 7):
        """
        初始化 JWT 服务
        
        Args:
            secret_key: JWT 密钥
            algorithm: 加密算法
            access_token_expire_minutes: Access Token 过期时间 (分钟)
            refresh_token_expire_days: Refresh Token 过期时间 (天)
        """
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.access_token_expire_minutes = access_token_expire_minutes
        self.refresh_token_expire_days = refresh_token_days
    
    def generate_token(self, payload: Dict[str, Any], 
                       expire_minutes: Optional[int] = None) -> str:
        """
        生成 JWT 令牌
        
        Args:
            payload: 载荷数据 (不包含 exp, iat)
            expire_minutes: 过期时间 (分钟), 默认使用配置的 access_token_expire_minutes
            
        Returns:
            str: JWT 令牌字符串
        """
        to_encode = payload.copy()
        
        # 设置过期时间
        if expire_minutes is None:
            expire_minutes = self.access_token_expire_minutes
            
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=expire_minutes)
        to_encode.update({
            "exp": expire,
            "iat": datetime.datetime.utcnow()
        })
        
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def generate_refresh_token(self, user_id: str) -> str:
        """
        生成刷新令牌
        
        Args:
            user_id: 用户 ID
            
        Returns:
            str: 刷新令牌
        """
        payload = {
            "sub": user_id,
            "type": "refresh"
        }
        return self.generate_token(payload, expire_minutes=self.refresh_token_expire_days * 24 * 60)
    
    def verify_token(self, token: str, token_type: str = "access") -> Dict[str, Any]:
        """
        验证 JWT 令牌
        
        Args:
            token: JWT 令牌
            token_type: 令牌类型 ("access" 或 "refresh")
            
        Returns:
            Dict: 解析后的载荷数据
            
        Raises:
            HTTPException: 令牌无效或已过期
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # 验证令牌类型
            if token_type and payload.get("type") != token_type and token_type != "access":
                if payload.get("type") is not None and payload.get("type") != token_type:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="无效的令牌类型",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
            
            return payload
            
        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="令牌已过期",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的令牌",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    def refresh_token(self, refresh_token: str) -> str:
        """
        使用刷新令牌获取新的访问令牌
        
        Args:
            refresh_token: 刷新令牌
            
        Returns:
            str: 新的访问令牌
            
        Raises:
            HTTPException: 刷新令牌无效
        """
        # 验证刷新令牌
        payload = self.verify_token(refresh_token, token_type="refresh")
        
        # 生成新的访问令牌
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的刷新令牌",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        new_access_token = self.generate_token({"sub": user_id, "type": "access"})
        return new_access_token


# 创建全局 JWT 服务实例 (从环境变量获取密钥)
import os
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# 全局 JWT 服务实例
jwt_service = JwtService(
    secret_key=JWT_SECRET_KEY,
    algorithm=JWT_ALGORITHM,
    access_token_expire_minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
    refresh_token_expire_days=JWT_REFRESH_TOKEN_EXPIRE_DAYS
)
