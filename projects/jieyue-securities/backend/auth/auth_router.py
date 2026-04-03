"""
捷阅证券信息助手 - 认证路由
提供用户登录、注册、刷新令牌等 API 端点
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
import re

from .jwt_service import jwt_service
from .password_service import password_service
from .session_service import session_service
from .auth_middleware import get_current_user, get_current_user_id


router = APIRouter(prefix="/api/auth", tags=["认证"])


# ============== 数据模型 ==============

class UserRegister(BaseModel):
    """用户注册请求"""
    email: EmailStr = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=8, max_length=128, description="密码")
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    
    @validator('password')
    def validate_password(cls, v):
        """验证密码强度"""
        if not re.search(r'[A-Z]', v):
            raise ValueError('密码必须包含至少一个大写字母')
        if not re.search(r'[a-z]', v):
            raise ValueError('密码必须包含至少一个小写字母')
        if not re.search(r'\d', v):
            raise ValueError('密码必须包含至少一个数字')
        return v


class UserLogin(BaseModel):
    """用户登录请求"""
    email: EmailStr = Field(..., description="邮箱地址")
    password: str = Field(..., description="密码")
    remember_me: bool = Field(default=False, description="是否记住我")


class TokenResponse(BaseModel):
    """令牌响应"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    """刷新令牌请求"""
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    
    @validator('new_password')
    def validate_new_password(cls, v):
        """验证新密码强度"""
        if not re.search(r'[A-Z]', v):
            raise ValueError('密码必须包含至少一个大写字母')
        if not re.search(r'[a-z]', v):
            raise ValueError('密码必须包含至少一个小写字母')
        if not re.search(r'\d', v):
            raise ValueError('密码必须包含至少一个数字')
        return v


# ============== 模拟用户数据库 ==============
# TODO: 替换为真实的数据库操作

class UserDatabase:
    """模拟用户数据库"""
    
    def __init__(self):
        self.users = {}  # email -> user_data
    
    def create_user(self, email: str, username: str, password_hash: str) -> dict:
        """创建用户"""
        import uuid
        user_id = str(uuid.uuid4())
        self.users[email] = {
            "id": user_id,
            "email": email,
            "username": username,
            "password_hash": password_hash,
            "is_active": True
        }
        return self.users[email]
    
    def get_user_by_email(self, email: str) -> Optional[dict]:
        """通过邮箱获取用户"""
        return self.users.get(email)
    
    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """通过 ID 获取用户"""
        for user in self.users.values():
            if user["id"] == user_id:
                return user
        return None


# 全局用户数据库实例 (TODO: 替换为真实数据库)
user_db = UserDatabase()


# ============== API 端点 ==============

@router.post("/register", response_model=TokenResponse, summary="用户注册")
async def register(user_data: UserRegister):
    """
    注册新用户
    
    - **email**: 邮箱地址
    - **username**: 用户名
    - **password**: 密码 (必须包含大小写字母和数字)
    """
    # 检查用户是否已存在
    existing_user = user_db.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被注册"
        )
    
    # 加密密码
    password_hash = password_service.hash(user_data.password)
    
    # 创建用户
    user = user_db.create_user(
        email=user_data.email,
        username=user_data.username,
        password_hash=password_hash
    )
    
    # 生成令牌
    access_token = jwt_service.generate_token({"sub": user["id"], "type": "access"})
    refresh_token = jwt_service.generate_refresh_token(user["id"])
    
    # 创建会话
    session_service.create_session(user["id"], {"email": user_data.email})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=jwt_service.access_token_expire_minutes * 60
    )


@router.post("/login", response_model=TokenResponse, summary="用户登录")
async def login(login_data: UserLogin):
    """
    用户登录
    
    - **email**: 邮箱地址
    - **password**: 密码
    - **remember_me**: 是否记住我 (延长会话时间)
    """
    # 获取用户
    user = user_db.get_user_by_email(login_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )
    
    # 验证密码
    if not password_service.compare(login_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )
    
    # 检查用户是否活跃
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账户已被禁用"
        )
    
    # 生成令牌
    access_token = jwt_service.generate_token({"sub": user["id"], "type": "access"})
    refresh_token = jwt_service.generate_refresh_token(user["id"])
    
    # 创建会话
    session_expire_hours = 24 * 30 if login_data.remember_me else 24
    session_service.create_session(
        user["id"], 
        {"email": login_data.email, "remember_me": login_data.remember_me}
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=jwt_service.access_token_expire_minutes * 60
    )


@router.post("/refresh", response_model=TokenResponse, summary="刷新令牌")
async def refresh_token(request: RefreshTokenRequest):
    """
    使用刷新令牌获取新的访问令牌
    """
    try:
        # 验证刷新令牌
        payload = jwt_service.verify_token(request.refresh_token, token_type="refresh")
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的刷新令牌"
            )
        
        # 生成新的访问令牌
        new_access_token = jwt_service.generate_token({"sub": user_id, "type": "access"})
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=request.refresh_token,
            expires_in=jwt_service.access_token_expire_minutes * 60
        )
        
    except HTTPException:
        raise


@router.post("/logout", summary="用户登出")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    用户登出 (删除当前会话)
    """
    # TODO: 从请求头获取 session_id
    # session_service.delete_session(session_id)
    
    return {"message": "登出成功"}


@router.post("/logout-all", summary="登出所有设备")
async def logout_all(current_user: dict = Depends(get_current_user)):
    """
    登出所有设备 (删除用户的所有会话)
    """
    user_id = current_user["user_id"]
    count = session_service.delete_user_sessions(user_id)
    
    return {"message": f"已登出 {count} 个设备"}


@router.get("/me", summary="获取当前用户信息")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    获取当前登录用户的信息
    """
    user_id = current_user["user_id"]
    user = user_db.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"]
    }


@router.put("/password", summary="修改密码")
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    修改当前用户的密码
    """
    user_id = current_user["user_id"]
    user = user_db.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 验证旧密码
    if not password_service.compare(request.old_password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="原密码错误"
        )
    
    # 更新密码
    new_password_hash = password_service.hash(request.new_password)
    user["password_hash"] = new_password_hash
    
    # 登出所有设备 (安全考虑)
    session_service.delete_user_sessions(user_id)
    
    return {"message": "密码修改成功"}
