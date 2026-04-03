# 用户 API 路由
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import hashlib

from src.db.session import get_db
from src.db.models import User, Wallet

router = APIRouter()

# 请求/响应模型
class UserCreate(BaseModel):
    phone: Optional[str] = None
    wx_openid: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    phone: Optional[str]
    wx_openid: Optional[str]
    created_at: datetime
    status: int
    
    class Config:
        from_attributes = True

class WalletResponse(BaseModel):
    user_id: int
    balance: float
    updated_at: datetime
    
    class Config:
        from_attributes = True

@router.post("/create", response_model=UserResponse)
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """创建新用户"""
    db_user = User(
        phone=user_data.phone,
        wx_openid=user_data.wx_openid,
        status=1
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # 创建默认钱包
    db_wallet = Wallet(user_id=db_user.id, balance=0)
    db.add(db_wallet)
    db.commit()
    
    return db_user

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """获取用户信息"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user

@router.get("/{user_id}/wallet", response_model=WalletResponse)
async def get_wallet(user_id: int, db: Session = Depends(get_db)):
    """获取用户钱包余额"""
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="钱包不存在")
    return wallet
