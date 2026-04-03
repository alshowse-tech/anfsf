"""Tasks API - Task Management with Layer 8.5 Integration"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid

from config.database import get_db_session, close_db_session
from services.task_service import TaskService
from services.user_service import UserService
from models.user import User
from models.task import Task

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# Pydantic models
class TaskCreate(BaseModel):
    title: str
    task_type: str
    description: Optional[str] = None
    priority: int = 5
    category: Optional[str] = None
    input_data: Optional[Dict[str, Any]] = None
    contract_id: Optional[str] = None


class TaskResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: Optional[str]
    status: str
    priority: int
    task_type: str
    category: Optional[str]
    progress_percent: int
    error_message: Optional[str]
    input_data: Optional[str]
    output_data: Optional[str]
    result_url: Optional[str]
    contract_id: Optional[uuid.UUID]
    ownership_record_id: Optional[uuid.UUID]
    created_at: str
    updated_at: str
    started_at: Optional[str]
    completed_at: Optional[str]
    
    class Config:
        from_attributes = True


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None


class TaskStatusUpdate(BaseModel):
    status: str
    progress_percent: Optional[int] = None
    error_message: Optional[str] = None
    output_data: Optional[Dict[str, Any]] = None
    result_url: Optional[str] = None


# Routes
@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task_data: TaskCreate):
    """Create a new task with Layer 8.5 ownership"""
    db = get_db_session()
    try:
        user_service = UserService(db)
        task_service = TaskService(db)
        
        # Placeholder - will use actual current_user
        users = user_service.list_users(limit=1)
        if not users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No users found"
            )
        
        user = users[0]
        contract_id = uuid.UUID(task_data.contract_id) if task_data.contract_id else None
        
        task = task_service.create_task(
            owner_id=user.id,
            title=task_data.title,
            task_type=task_data.task_type,
            description=task_data.description,
            priority=task_data.priority,
            category=task_data.category,
            input_data=task_data.input_data,
            contract_id=contract_id
        )
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create task"
            )
        
        return task
    finally:
        close_db_session(db)


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    task_type: Optional[str] = None
):
    """List tasks for current user"""
    db = get_db_session()
    try:
        user_service = UserService(db)
        task_service = TaskService(db)
        
        # Placeholder - will use actual current_user
        users = user_service.list_users(limit=1)
        if not users:
            return []
        
        user = users[0]
        tasks = task_service.get_user_tasks(
            user_id=user.id,
            skip=skip,
            limit=limit,
            status=status_filter,
            task_type=task_type
        )
        
        return tasks
    finally:
        close_db_session(db)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: uuid.UUID):
    """Get task by ID"""
    db = get_db_session()
    try:
        task_service = TaskService(db)
        task = task_service.get_task(task_id)
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        return task
    finally:
        close_db_session(db)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: uuid.UUID, task_data: TaskUpdate):
    """Update task (basic fields)"""
    db = get_db_session()
    try:
        task_service = TaskService(db)
        
        # Get current task
        task = task_service.get_task(task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Update fields
        update_data = task_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(task, key, value)
        
        db.commit()
        db.refresh(task)
        return task
    finally:
        close_db_session(db)


@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(task_id: uuid.UUID, status_data: TaskStatusUpdate):
    """Update task status and progress"""
    db = get_db_session()
    try:
        task_service = TaskService(db)
        task = task_service.update_task_status(
            task_id=task_id,
            status=status_data.status,
            progress_percent=status_data.progress_percent,
            error_message=status_data.error_message,
            output_data=status_data.output_data,
            result_url=status_data.result_url
        )
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        return task
    finally:
        close_db_session(db)


@router.post("/{task_id}/cancel", response_model=TaskResponse)
def cancel_task(task_id: uuid.UUID):
    """Cancel a task"""
    db = get_db_session()
    try:
        user_service = UserService(db)
        task_service = TaskService(db)
        
        # Placeholder - will use actual current_user
        users = user_service.list_users(limit=1)
        if not users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No users found"
            )
        
        user = users[0]
        task = task_service.cancel_task(task_id, user.id)
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to cancel task"
            )
        
        return task
    finally:
        close_db_session(db)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: uuid.UUID):
    """Delete a task"""
    db = get_db_session()
    try:
        user_service = UserService(db)
        task_service = TaskService(db)
        
        # Placeholder - will use actual current_user
        users = user_service.list_users(limit=1)
        if not users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No users found"
            )
        
        user = users[0]
        success = task_service.delete_task(task_id, user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete task"
            )
    finally:
        close_db_session(db)
