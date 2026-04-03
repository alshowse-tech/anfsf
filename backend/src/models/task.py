"""Task Model - Task Management"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Index, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base


class Task(Base):
    """Task model with Layer 8.5 ownership integration"""
    
    __tablename__ = "tasks"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Task details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="pending", nullable=False, index=True)  # pending, running, completed, failed, cancelled
    priority = Column(Integer, default=5, nullable=False)  # 1-10, 1=highest
    
    # Task type and category
    task_type = Column(String(100), nullable=False, index=True)  # transcription, analysis, report, etc.
    category = Column(String(100), nullable=True, index=True)
    
    # Progress tracking
    progress_percent = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    
    # Input/Output references
    input_data = Column(Text, nullable=True)  # JSON string
    output_data = Column(Text, nullable=True)  # JSON string
    result_url = Column(String(500), nullable=True)
    
    # Layer 8.5: Contract binding
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=True, index=True)
    ownership_record_id = Column(UUID(as_uuid=True), ForeignKey("ownership_records.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="tasks")
    contract = relationship("Contract", back_populates="tasks")
    ownership_record = relationship("OwnershipRecord", back_populates="tasks")
    
    __table_args__ = (
        Index('ix_tasks_owner_status', 'owner_id', 'status'),
        Index('ix_tasks_created', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Task {self.id} title={self.title} status={self.status}>"
