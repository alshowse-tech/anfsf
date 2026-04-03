"""Transcription Model - Audio/Video Transcription Records"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Index, Float
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base


class Transcription(Base):
    """Transcription record with Layer 8.5 ownership integration"""
    
    __tablename__ = "transcriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Source media
    source_url = Column(String(500), nullable=False)
    source_type = Column(String(50), nullable=False)  # audio, video
    source_format = Column(String(20), nullable=True)  # mp3, mp4, wav, etc.
    duration_seconds = Column(Float, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    
    # Transcription details
    status = Column(String(50), default="pending", nullable=False, index=True)  # pending, processing, completed, failed
    language = Column(String(20), default="zh-CN", nullable=False)
    
    # Output
    transcript_text = Column(Text, nullable=True)
    transcript_url = Column(String(500), nullable=True)  # OSS URL for stored transcript
    confidence_score = Column(Float, nullable=True)  # 0.0-1.0
    
    # Processing metadata
    engine = Column(String(50), nullable=True)  # tikhub, bailian, etc.
    processing_time_seconds = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Layer 8.5: Contract binding
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=True, index=True)
    ownership_record_id = Column(UUID(as_uuid=True), ForeignKey("ownership_records.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="transcriptions")
    contract = relationship("Contract", back_populates="transcriptions")
    ownership_record = relationship("OwnershipRecord", back_populates="transcriptions")
    
    __table_args__ = (
        Index('ix_transcriptions_owner_status', 'owner_id', 'status'),
        Index('ix_transcriptions_created', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Transcription {self.id} status={self.status} language={self.language}>"
