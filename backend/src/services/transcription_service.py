"""Transcription Service - Audio/Video Transcription with TikHub + OSS + Bailian"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
import uuid
import json
import httpx

from models.transcription import Transcription
from models.user import User
from models.contract import Contract
from models.ownership_record import OwnershipRecord

from core.layer8 import verify_ownership, check_contract_validity, publish_to_mcp_bus
from config.settings import get_settings

settings = get_settings()


class TranscriptionService:
    """Service for transcription with Layer 8.5 integration"""
    
    def __init__(self, db: Session):
        self.db = db
        self.settings = settings
    
    def get_transcription(self, transcription_id: uuid.UUID) -> Optional[Transcription]:
        """Get transcription by ID"""
        return self.db.get(Transcription, transcription_id)
    
    def create_transcription(
        self,
        owner_id: uuid.UUID,
        source_url: str,
        source_type: str = "audio",
        language: str = "zh-CN",
        source_format: Optional[str] = None,
        contract_id: Optional[uuid.UUID] = None
    ) -> Optional[Transcription]:
        """Create a new transcription task with Layer 8.5 integration"""
        # Verify owner exists
        owner = self.db.get(User, owner_id)
        if not owner:
            return None
        
        # Verify contract if provided
        if contract_id:
            contract = self.db.get(Contract, contract_id)
            if not contract or not contract.is_active:
                return None
            if not check_contract_validity(contract):
                return None
        
        # Create transcription record
        transcription = Transcription(
            owner_id=owner_id,
            source_url=source_url,
            source_type=source_type,
            source_format=source_format,
            language=language,
            status="pending",
            contract_id=contract_id
        )
        self.db.add(transcription)
        self.db.flush()
        
        # Create Layer 8.5 ownership record
        ownership_record = OwnershipRecord(
            owner_id=owner_id,
            asset_type="transcription",
            asset_id=transcription.id,
            contract_id=contract_id,
            rights={"read": True, "write": True, "execute": True, "transfer": False},
            is_active=True
        )
        self.db.add(ownership_record)
        self.db.flush()
        
        transcription.ownership_record_id = ownership_record.id
        
        # Publish to MCP Bus
        publish_to_mcp_bus(
            event_type="transcription.created",
            payload={
                "transcription_id": str(transcription.id),
                "owner_id": str(owner_id),
                "source_url": source_url,
                "language": language
            }
        )
        
        self.db.commit()
        self.db.refresh(transcription)
        return transcription
    
    async def process_transcription(
        self,
        transcription_id: uuid.UUID,
        engine: str = "bailian"
    ) -> Optional[Transcription]:
        """Process transcription using specified engine"""
        transcription = self.get_transcription(transcription_id)
        if not transcription:
            return None
        
        # Update status to processing
        transcription.status = "processing"
        transcription.engine = engine
        transcription.started_at = datetime.utcnow()
        self.db.commit()
        
        try:
            # Process based on engine
            if engine == "bailian":
                result = await self._process_with_bailian(transcription)
            elif engine == "tikhub":
                result = await self._process_with_tikhub(transcription)
            else:
                raise ValueError(f"Unknown engine: {engine}")
            
            # Update with results
            transcription.status = "completed"
            transcription.transcript_text = result.get("text", "")
            transcription.transcript_url = result.get("oss_url")
            transcription.confidence_score = result.get("confidence", 0.0)
            transcription.processing_time_seconds = result.get("processing_time", 0.0)
            transcription.completed_at = datetime.utcnow()
            
            # Publish to MCP Bus
            publish_to_mcp_bus(
                event_type="transcription.completed",
                payload={
                    "transcription_id": str(transcription_id),
                    "status": "completed",
                    "confidence": result.get("confidence", 0.0)
                }
            )
            
        except Exception as e:
            transcription.status = "failed"
            transcription.error_message = str(e)
            transcription.completed_at = datetime.utcnow()
            
            # Publish to MCP Bus
            publish_to_mcp_bus(
                event_type="transcription.failed",
                payload={
                    "transcription_id": str(transcription_id),
                    "error": str(e)
                }
            )
        
        self.db.commit()
        self.db.refresh(transcription)
        return transcription
    
    async def _process_with_bailian(self, transcription: Transcription) -> Dict[str, Any]:
        """Process transcription using Alibaba Bailian"""
        start_time = datetime.utcnow()
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            # Call Bailian API
            response = await client.post(
                self.settings.bailian_api_url,
                headers={
                    "Authorization": f"Bearer {self.settings.bailian_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "audio_url": transcription.source_url,
                    "language": transcription.language,
                    "format": transcription.source_format
                }
            )
            response.raise_for_status()
            result = response.json()
        
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        return {
            "text": result.get("transcript", ""),
            "oss_url": result.get("oss_url"),
            "confidence": result.get("confidence", 0.95),
            "processing_time": processing_time
        }
    
    async def _process_with_tikhub(self, transcription: Transcription) -> Dict[str, Any]:
        """Process transcription using TikHub"""
        start_time = datetime.utcnow()
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                self.settings.tikhub_api_url,
                headers={
                    "Authorization": f"Bearer {self.settings.tikhub_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "file_url": transcription.source_url,
                    "language": transcription.language
                }
            )
            response.raise_for_status()
            result = response.json()
        
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        return {
            "text": result.get("text", ""),
            "oss_url": result.get("storage_url"),
            "confidence": result.get("confidence_score", 0.9),
            "processing_time": processing_time
        }
    
    def get_user_transcriptions(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[Transcription]:
        """Get transcriptions for a user"""
        stmt = select(Transcription).where(Transcription.owner_id == user_id)
        
        if status:
            stmt = stmt.where(Transcription.status == status)
        
        stmt = stmt.order_by(Transcription.created_at.desc()).offset(skip).limit(limit)
        return self.db.execute(stmt).scalars().all()
    
    def cancel_transcription(self, transcription_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Transcription]:
        """Cancel a transcription (with ownership verification)"""
        transcription = self.get_transcription(transcription_id)
        if not transcription:
            return None
        
        if not verify_ownership(self.db, user_id, "transcription", transcription_id):
            return None
        
        if transcription.status in ["completed", "failed", "cancelled"]:
            return None
        
        transcription.status = "cancelled"
        transcription.completed_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(transcription)
        return transcription
