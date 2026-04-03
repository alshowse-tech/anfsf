"""Wallet Model - Balance & Transactions"""

from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base


class Wallet(Base):
    """Wallet model for user balance management"""
    
    __tablename__ = "wallets"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    
    # Balance in cents (to avoid floating point issues)
    balance_cents = Column(Numeric(20, 0), default=0, nullable=False)
    currency = Column(String(3), default="CNY", nullable=False)
    
    # Wallet status
    status = Column(String(20), default="active", nullable=False)  # active, frozen, closed
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="wallet")
    transactions = relationship("Transaction", back_populates="wallet", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('ix_wallets_user_status', 'user_id', 'status'),
    )
    
    @property
    def balance(self) -> Decimal:
        """Return balance in yuan (converted from cents)"""
        return Decimal(self.balance_cents) / 100
    
    def __repr__(self):
        return f"<Wallet {self.user_id} balance={self.balance} {self.currency}>"
