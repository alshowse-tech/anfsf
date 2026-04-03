"""Wallet Service - Balance & Transaction Management"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select
import uuid
import json

from models.wallet import Wallet
from models.transaction import Transaction
from models.user import User


class WalletService:
    """Service for wallet and transaction management"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_wallet_by_user(self, user_id: uuid.UUID) -> Optional[Wallet]:
        """Get wallet by user ID"""
        stmt = select(Wallet).where(Wallet.user_id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()
    
    def get_wallet_by_id(self, wallet_id: uuid.UUID) -> Optional[Wallet]:
        """Get wallet by ID"""
        return self.db.get(Wallet, wallet_id)
    
    def get_balance(self, user_id: uuid.UUID) -> Decimal:
        """Get user's wallet balance"""
        wallet = self.get_wallet_by_user(user_id)
        if not wallet:
            return Decimal(0)
        return wallet.balance
    
    def recharge(
        self,
        user_id: uuid.UUID,
        amount_cents: int,
        description: str = "充值",
        reference_id: Optional[str] = None
    ) -> Optional[Transaction]:
        """Recharge wallet (add funds)"""
        wallet = self.get_wallet_by_user(user_id)
        if not wallet or wallet.status != "active":
            return None
        
        # Create transaction record
        transaction = Transaction(
            wallet_id=wallet.id,
            amount_cents=amount_cents,
            currency=wallet.currency,
            type="recharge",
            status="completed",
            description=description,
            reference_id=reference_id,
            completed_at=datetime.utcnow()
        )
        self.db.add(transaction)
        
        # Update wallet balance
        wallet.balance_cents += amount_cents
        wallet.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(transaction)
        return transaction
    
    def consume(
        self,
        user_id: uuid.UUID,
        amount_cents: int,
        description: str = "消费",
        reference_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> Optional[Transaction]:
        """Consume from wallet (deduct funds)"""
        wallet = self.get_wallet_by_user(user_id)
        if not wallet or wallet.status != "active":
            return None
        
        # Check sufficient balance
        if wallet.balance_cents < amount_cents:
            return None
        
        # Create transaction record
        transaction = Transaction(
            wallet_id=wallet.id,
            amount_cents=-amount_cents,  # Negative for debit
            currency=wallet.currency,
            type="consumption",
            status="completed",
            description=description,
            reference_id=reference_id,
            extra_data=json.dumps(metadata) if metadata else None,
            completed_at=datetime.utcnow()
        )
        self.db.add(transaction)
        
        # Update wallet balance
        wallet.balance_cents -= amount_cents
        wallet.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(transaction)
        return transaction
    
    def get_transactions(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        transaction_type: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Transaction]:
        """Get user's transaction history"""
        wallet = self.get_wallet_by_user(user_id)
        if not wallet:
            return []
        
        stmt = select(Transaction).where(Transaction.wallet_id == wallet.id)
        
        if transaction_type:
            stmt = stmt.where(Transaction.type == transaction_type)
        if status:
            stmt = stmt.where(Transaction.status == status)
        
        stmt = stmt.order_by(Transaction.created_at.desc()).offset(skip).limit(limit)
        return self.db.execute(stmt).scalars().all()
    
    def freeze_wallet(self, user_id: uuid.UUID) -> Optional[Wallet]:
        """Freeze user's wallet"""
        wallet = self.get_wallet_by_user(user_id)
        if not wallet:
            return None
        
        wallet.status = "frozen"
        wallet.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(wallet)
        return wallet
    
    def unfreeze_wallet(self, user_id: uuid.UUID) -> Optional[Wallet]:
        """Unfreeze user's wallet"""
        wallet = self.get_wallet_by_user(user_id)
        if not wallet:
            return None
        
        wallet.status = "active"
        wallet.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(wallet)
        return wallet
