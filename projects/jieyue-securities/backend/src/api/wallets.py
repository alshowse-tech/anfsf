# 钱包 API 路由
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from db.session import get_db
from db.models import Wallet, Transaction, TransactionType, TransactionStatus

router = APIRouter()

# 请求/响应模型
class RechargeRequest(BaseModel):
    amount: float

class TransactionResponse(BaseModel):
    id: int
    user_id: int
    task_id: Optional[int] = None
    type: str
    amount: float
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class WalletBalanceResponse(BaseModel):
    user_id: int
    balance: float
    updated_at: datetime

@router.post("/recharge", response_model=TransactionResponse)
async def recharge(
    request: RechargeRequest,
    user_id: int,
    db: Session = Depends(get_db)
):
    """用户充值"""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="充值金额必须大于 0")
    
    # 开启事务
    try:
        # 创建充值记录
        transaction = Transaction(
            user_id=user_id,
            type=TransactionType.RECHARGE,
            amount=Decimal(str(request.amount)),
            status=TransactionStatus.SUCCESS
        )
        db.add(transaction)
        
        # 更新钱包余额
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        if not wallet:
            wallet = Wallet(user_id=user_id, balance=0)
            db.add(wallet)
        
        wallet.balance += Decimal(str(request.amount))
        db.commit()
        db.refresh(transaction)
        
        return transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"充值失败：{str(e)}")

@router.get("/{user_id}/balance", response_model=WalletBalanceResponse)
async def get_balance(user_id: int, db: Session = Depends(get_db)):
    """获取钱包余额"""
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="钱包不存在")
    
    return WalletBalanceResponse(
        user_id=wallet.user_id,
        balance=float(wallet.balance),
        updated_at=wallet.updated_at
    )

@router.post("/deduct")
async def deduct_balance(
    user_id: int,
    amount: float,
    task_id: int,
    db: Session = Depends(get_db)
):
    """扣费（内部调用）"""
    try:
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        if not wallet:
            return {"success": False, "error": "钱包不存在"}
        
        if wallet.balance < Decimal(str(amount)):
            return {"success": False, "error": "余额不足"}
        
        # 扣费
        wallet.balance -= Decimal(str(amount))
        
        # 创建消费记录
        transaction = Transaction(
            user_id=user_id,
            task_id=task_id,
            type=TransactionType.CONSUME,
            amount=Decimal(str(amount)),
            status=TransactionStatus.SUCCESS
        )
        db.add(transaction)
        db.commit()
        
        return {"success": True, "new_balance": float(wallet.balance)}
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}

@router.post("/refund")
async def refund(
    user_id: int,
    amount: float,
    task_id: int,
    db: Session = Depends(get_db)
):
    """退款（ASR 失败等场景）"""
    try:
        # 退款
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        if not wallet:
            wallet = Wallet(user_id=user_id, balance=0)
            db.add(wallet)
        
        wallet.balance += Decimal(str(amount))
        
        # 创建退款记录
        transaction = Transaction(
            user_id=user_id,
            task_id=task_id,
            type=TransactionType.REFUND,
            amount=Decimal(str(amount)),
            status=TransactionStatus.SUCCESS
        )
        db.add(transaction)
        db.commit()
        
        return {"success": True, "new_balance": float(wallet.balance)}
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
