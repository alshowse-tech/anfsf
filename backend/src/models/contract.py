"""Contract Model - Layer 8.5 Contract Pack"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base


class Contract(Base):
    """Layer 8.5 Contract Pack - Governs operations and permissions"""
    
    __tablename__ = "contracts"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Contract identity
    name = Column(String(255), nullable=False)
    version = Column(String(50), default="1.0.0", nullable=False)
    description = Column(Text, nullable=True)
    
    # Contract type and scope
    contract_type = Column(String(100), nullable=False, index=True)  # service, access, data, custom
    scope = Column(String(50), default="private", nullable=False)  # private, shared, public
    
    # Contract terms (JSON structure)
    terms = Column(JSON, nullable=True)  # Contract terms and conditions
    constraints = Column(JSON, nullable=True)  # Operational constraints
    permissions = Column(JSON, nullable=True)  # Granted permissions
    
    # Contract state
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_enforced = Column(Boolean, default=True, nullable=False)
    
    # Validity period
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    
    # Layer 8.5: Ownership binding
    ownership_record_id = Column(UUID(as_uuid=True), ForeignKey("ownership_records.id"), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", back_populates="contracts")
    ownership_record = relationship("OwnershipRecord", back_populates="contracts")
    tasks = relationship("Task", back_populates="contract")
    transcriptions = relationship("Transcription", back_populates="contract")
    
    __table_args__ = (
        Index('ix_contracts_type_active', 'contract_type', 'is_active'),
    )
    
    def __repr__(self):
        return f"<Contract {self.name} v{self.version} type={self.contract_type}>"
