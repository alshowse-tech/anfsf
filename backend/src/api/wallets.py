"""Wallets API - Balance & Transaction Management"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
import uuid

from config.database import get_db_session, close_db_session
from services.wallet_service import WalletService
from services.user_service import UserService
from models.user import User
from models.wallet import Wallet
from models.transaction import Transaction

router = APIRouter(prefix="/wallets", tags=["Wallets"])


# Pydantic models
class WalletResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    balance_cents: Decimal
    currency: str
    status: str
    created_at: str
    
    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    id: uuid.UUID
    wallet_id: uuid.UUID
    amount_cents: Decimal
    currency: str
    type: str
    status: str
    description: Optional[str]
    reference_id: Optional[str]
    created_at: str
    completed_at: Optional[str]
    
    class Config:
        from_attributes = True


class RechargeRequest(BaseModel):
    amount_cents: int
    description: Optional[str] = "充值"
    reference_id: Optional[str] = None


class ConsumeRequest(BaseModel):
    amount_cents: int
    description: Optional[str] = "消费"
    reference_id: Optional[str] = None
    metadata: Optional[dict] = None


class BalanceResponse(BaseModel):
    user_id: uuid.UUID
    balance: Decimal
    balance_cents: Decimal
    currency: str


# Dependencies
def get_wallet_service(db: Session) -> WalletService:
    return WalletService(db)


# Routes
@router.get("/balance", response_model=BalanceResponse)
def get_balance(current_user: User = Depends(lambda: None)):
    """Get current user's wallet balance"""
    # This needs proper auth - placeholder for now
    db = get_db_session()
    try:
        # For now, get user from context (will be implemented with proper auth)
        user_service = UserService(db)
        wallet_service = get_wallet_service(db)
        
        # Placeholder - will use actual current_user
        users = user_service.list_users(limit=1)
        if not users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No users found"
            )
        
        user = users[0]
        wallet = wallet_service.get_wallet_by_user(user.id)
        
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
        
        return BalanceResponse(
            user_id=user.id,
            balance=wallet.balance,
            balance_cents=wallet.balance_cents,
            currency=wallet.currency
        )
    finally:
        close_db_session(db)


@router.post("/recharge", response_model=TransactionResponse)
def recharge_wallet(request: RechargeRequest):
    """Recharge wallet (add funds)"""
    db = get_db_session()
    try:
        user_service = UserService(db)
        wallet_service = get_wallet_service(db)
        
        # Placeholder - will use actual current_user
        users = user_service.list_users(limit=1)
        if not users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No users found"
            )
        
        user = users[0]
        transaction = wallet_service.recharge(
            user_id=user.id,
            amount_cents=request.amount_cents,
            description=request.description,
            reference_id=request.reference_id
        )
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to recharge wallet"
            )
        
        return transaction
    finally:
        close_db_session(db)


@router.post("/consume", response_model=TransactionResponse)
def consume_wallet(request: ConsumeRequest):
    """Consume from wallet (deduct funds)"""
    db = get_db_session()
    try:
        user_service = UserService(db)
        wallet_service = get_wallet_service(db)
        
        # Placeholder - will use actual current_user
        users = user_service.list_users(limit=1)
        if not users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No users found"
            )
        
        user = users[0]
        transaction = wallet_service.consume(
            user_id=user.id,
            amount_cents=request.amount_cents,
            description=request.description,
            reference_id=request.reference_id,
            metadata=request.metadata
        )
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance or wallet issue"
            )
        
        return transaction
    finally:
        close_db_session(db)


@router.get("/transactions", response_model=List[TransactionResponse])
def get_transactions(
    skip: int = 0,
    limit: int = 100,
    transaction_type: Optional[str] = None,
    status: Optional[str] = None
):
    """Get transaction history"""
    db = get_db_session()
    try:
        user_service = UserService(db)
        wallet_service = get_wallet_service(db)
        
        # Placeholder - will use actual current_user
        users = user_service.list_users(limit=1)
        if not users:
            return []
        
        user = users[0]
        transactions = wallet_service.get_transactions(
            user_id=user.id,
            skip=skip,
            limit=limit,
            transaction_type=transaction_type,
            status=status
        )
        
        return transactions
    finally:
        close_db_session(db)


@router.get("", response_model=WalletResponse)
def get_wallet():
    """Get current user's wallet"""
    db = get_db_session()
    try:
        user_service = UserService(db)
        wallet_service = get_wallet_service(db)
        
        # Placeholder - will use actual current_user
        users = user_service.list_users(limit=1)
        if not users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No users found"
            )
        
        user = users[0]
        wallet = wallet_service.get_wallet_by_user(user.id)
        
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
        
        return wallet
    finally:
        close_db_session(db)
