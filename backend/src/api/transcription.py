"""Transcription API - Audio/Video Transcription with Layer 8.5 Integration"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
import uuid

from config.database import get_db_session, close_db_session
from services.transcription_service import TranscriptionService
from services.user_service import UserService
from models.user import User
from models.transcription import Transcription

router = APIRouter(prefix="/transcription", tags=["Transcription"])


# Pydantic models
class TranscriptionCreate(BaseModel):
    source_url: str
    source_type: str = "audio"
    language: str = "zh-CN"
    source_format: Optional[str] = None
    contract_id: Optional[str] = None


class TranscriptionResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    source_url: str
    source_type: str
    source_format: Optional[str]
    duration_seconds: Optional[float]
    status: str
    language: str
    transcript_text: Optional[str]
    transcript_url: Optional[str]
    confidence_score: Optional[float]
    engine: Optional[str]
    processing_time_seconds: Optional[float]
    error_message: Optional[str]
    contract_id: Optional[uuid.UUID]
    ownership_record_id: Optional[uuid.UUID]
    created_at: str
    updated_at: str
    started_at: Optional[str]
    completed_at: Optional[str]
    
    class Config:
        from_attributes = True


class TranscriptionProcessRequest(BaseModel):
    engine: str = "bailian"  # bailian or tikhub


# Routes
@router.post("", response_model=TranscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_transcription(transcription_data: TranscriptionCreate):
    """Create a new transcription task with Layer 8.5 ownership"""
    db = get_db_session()
    try:
        user_service = UserService(db)
        transcription_service = TranscriptionService(db)
        
        # Placeholder - will use actual current_user
        users = user_service.list_users(limit=1)
        if not users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No users found"
            )
        
        user = users[0]
        contract_id = uuid.UUID(transcription_data.contract_id) if transcription_data.contract_id else None
        
        transcription = transcription_service.create_transcription(
            owner_id=user.id,
            source_url=transcription_data.source_url,
            source_type=transcription_data.source_type,
            language=transcription_data.language,
            source_format=transcription_data.source_format,
            contract_id=contract_id
        )
        
        if not transcription:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create transcription"
            )
        
        return transcription
    finally:
        close_db_session(db)


@router.post("/{transcription_id}/process", response_model=TranscriptionResponse)
async def process_transcription(
    transcription_id: uuid.UUID,
    request: TranscriptionProcessRequest,
    background_tasks: BackgroundTasks
):
    """Process transcription asynchronously"""
    db = get_db_session()
    try:
        transcription_service = TranscriptionService(db)
        
        # Start async processing
        transcription = await transcription_service.process_transcription(
            transcription_id=transcription_id,
            engine=request.engine
        )
        
        if not transcription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transcription not found"
            )
        
        return transcription
    finally:
        close_db_session(db)


@router.get("", response_model=List[TranscriptionResponse])
def list_transcriptions(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None
):
    """List transcriptions for current user"""
    db = get_db_session()
    try:
        user_service = UserService(db)
        transcription_service = TranscriptionService(db)
        
        # Placeholder - will use actual current_user
        users = user_service.list_users(limit=1)
        if not users:
            return []
        
        user = users[0]
        transcriptions = transcription_service.get_user_transcriptions(
            user_id=user.id,
            skip=skip,
            limit=limit,
            status=status_filter
        )
        
        return transcriptions
    finally:
        close_db_session(db)


@router.get("/{transcription_id}", response_model=TranscriptionResponse)
def get_transcription(transcription_id: uuid.UUID):
    """Get transcription by ID"""
    db = get_db_session()
    try:
        transcription_service = TranscriptionService(db)
        transcription = transcription_service.get_transcription(transcription_id)
        
        if not transcription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transcription not found"
            )
        
        return transcription
    finally:
        close_db_session(db)


@router.post("/{transcription_id}/cancel", response_model=TranscriptionResponse)
def cancel_transcription(transcription_id: uuid.UUID):
    """Cancel a transcription"""
    db = get_db_session()
    try:
        user_service = UserService(db)
        transcription_service = TranscriptionService(db)
        
        # Placeholder - will use actual current_user
        users = user_service.list_users(limit=1)
        if not users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No users found"
            )
        
        user = users[0]
        transcription = transcription_service.cancel_transcription(transcription_id, user.id)
        
        if not transcription:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to cancel transcription"
            )
        
        return transcription
    finally:
        close_db_session(db)
