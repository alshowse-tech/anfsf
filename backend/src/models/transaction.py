"""Transaction Model - Financial Records"""

from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base


class Transaction(Base):
    """Transaction record for wallet operations"""
    
    __tablename__ = "transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wallets.id"), nullable=False, index=True)
    
    # Transaction details
    amount_cents = Column(Numeric(20, 0), nullable=False)  # Positive for credit, negative for debit
    currency = Column(String(3), default="CNY", nullable=False)
    
    # Transaction type
    type = Column(String(50), nullable=False, index=True)  # recharge, consumption, refund, transfer
    status = Column(String(20), default="completed", nullable=False)  # pending, completed, failed, cancelled
    
    # Description and metadata
    description = Column(Text, nullable=True)
    reference_id = Column(String(255), nullable=True, index=True)  # External reference (order ID, etc.)
    extra_data = Column(String(1000), nullable=True)  # JSON string for additional data
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    wallet = relationship("Wallet", back_populates="transactions")
    
    __table_args__ = (
        Index('ix_transactions_type_status', 'type', 'status'),
        Index('ix_transactions_created', 'created_at'),
    )
    
    @property
    def amount(self) -> Decimal:
        """Return amount in yuan (converted from cents)"""
        return Decimal(self.amount_cents) / 100
    
    def __repr__(self):
        return f"<Transaction {self.id} type={self.type} amount={self.amount}>"
