"""Ownership Record Model - Layer 8.5 Ownership Lattice"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base


class OwnershipRecord(Base):
    """Layer 8.5 Ownership Lattice - Provenance and ownership tracking"""
    
    __tablename__ = "ownership_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Asset identity
    asset_type = Column(String(100), nullable=False, index=True)  # task, transcription, data, model, etc.
    asset_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Reference to actual asset
    
    # Ownership proof
    proof_hash = Column(String(255), nullable=True)  # Cryptographic proof hash
    proof_metadata = Column(JSON, nullable=True)  # Additional proof data
    
    # Ownership chain
    parent_record_id = Column(UUID(as_uuid=True), ForeignKey("ownership_records.id"), nullable=True, index=True)
    derivation_path = Column(Text, nullable=True)  # Path from root ownership
    
    # Rights and permissions
    rights = Column(JSON, nullable=True)  # Granted rights (read, write, execute, transfer, etc.)
    restrictions = Column(JSON, nullable=True)  # Usage restrictions
    
    # Layer 8.5: Contract binding
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=True, index=True)
    
    # State
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_transferable = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    transferred_at = Column(DateTime, nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="ownership_records")
    parent_record = relationship("OwnershipRecord", remote_side=[id], backref="child_records")
    contract = relationship("Contract", back_populates="ownership_record")
    tasks = relationship("Task", back_populates="ownership_record")
    transcriptions = relationship("Transcription", back_populates="ownership_record")
    
    __table_args__ = (
        Index('ix_ownership_asset', 'asset_type', 'asset_id'),
        Index('ix_ownership_owner_active', 'owner_id', 'is_active'),
    )
    
    def __repr__(self):
        return f"<OwnershipRecord {self.id} asset={self.asset_type}:{self.asset_id}>"
