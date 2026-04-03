"""Task Service - Task Management"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
import uuid
import json

from models.task import Task
from models.user import User
from models.contract import Contract
from models.ownership_record import OwnershipRecord

from core.layer8 import verify_ownership, check_contract_validity, publish_to_mcp_bus


class TaskService:
    """Service for task management with Layer 8.5 integration"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_task(self, task_id: uuid.UUID) -> Optional[Task]:
        """Get task by ID"""
        return self.db.get(Task, task_id)
    
    def create_task(
        self,
        owner_id: uuid.UUID,
        title: str,
        task_type: str,
        description: Optional[str] = None,
        priority: int = 5,
        category: Optional[str] = None,
        input_data: Optional[Dict[str, Any]] = None,
        contract_id: Optional[uuid.UUID] = None
    ) -> Optional[Task]:
        """Create a new task with Layer 8.5 integration"""
        # Verify owner exists
        owner = self.db.get(User, owner_id)
        if not owner:
            return None
        
        # Verify contract if provided (Layer 8.5 Contract Pack)
        if contract_id:
            contract = self.db.get(Contract, contract_id)
            if not contract or not contract.is_active:
                return None
            
            # Check contract validity
            if not check_contract_validity(contract):
                return None
        
        # Create task
        task = Task(
            owner_id=owner_id,
            title=title,
            description=description,
            task_type=task_type,
            category=category,
            priority=priority,
            status="pending",
            input_data=json.dumps(input_data) if input_data else None,
            contract_id=contract_id
        )
        self.db.add(task)
        self.db.flush()
        
        # Create Layer 8.5 ownership record
        ownership_record = OwnershipRecord(
            owner_id=owner_id,
            asset_type="task",
            asset_id=task.id,
            contract_id=contract_id,
            rights={"read": True, "write": True, "execute": True, "transfer": False},
            is_active=True
        )
        self.db.add(ownership_record)
        self.db.flush()
        
        task.ownership_record_id = ownership_record.id
        
        # Publish to MCP Bus (Layer 8.5)
        publish_to_mcp_bus(
            event_type="task.created",
            payload={
                "task_id": str(task.id),
                "owner_id": str(owner_id),
                "title": title,
                "type": task_type
            }
        )
        
        self.db.commit()
        self.db.refresh(task)
        return task
    
    def update_task_status(
        self,
        task_id: uuid.UUID,
        status: str,
        progress_percent: Optional[int] = None,
        error_message: Optional[str] = None,
        output_data: Optional[Dict[str, Any]] = None,
        result_url: Optional[str] = None
    ) -> Optional[Task]:
        """Update task status and progress"""
        task = self.get_task(task_id)
        if not task:
            return None
        
        old_status = task.status
        task.status = status
        
        if progress_percent is not None:
            task.progress_percent = progress_percent
        
        if error_message:
            task.error_message = error_message
        
        if output_data:
            task.output_data = json.dumps(output_data)
        
        if result_url:
            task.result_url = result_url
        
        # Update timestamps based on status
        now = datetime.utcnow()
        if status == "running" and old_status == "pending":
            task.started_at = now
        elif status in ["completed", "failed", "cancelled"]:
            task.completed_at = now
        
        task.updated_at = now
        self.db.commit()
        self.db.refresh(task)
        
        # Publish to MCP Bus
        publish_to_mcp_bus(
            event_type="task.status_updated",
            payload={
                "task_id": str(task_id),
                "old_status": old_status,
                "new_status": status,
                "progress": progress_percent
            }
        )
        
        return task
    
    def get_user_tasks(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        task_type: Optional[str] = None
    ) -> List[Task]:
        """Get tasks for a user"""
        stmt = select(Task).where(Task.owner_id == user_id)
        
        if status:
            stmt = stmt.where(Task.status == status)
        if task_type:
            stmt = stmt.where(Task.task_type == task_type)
        
        stmt = stmt.order_by(Task.created_at.desc()).offset(skip).limit(limit)
        return self.db.execute(stmt).scalars().all()
    
    def cancel_task(self, task_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Task]:
        """Cancel a task (with ownership verification)"""
        task = self.get_task(task_id)
        if not task:
            return None
        
        # Verify ownership (Layer 8.5)
        if not verify_ownership(self.db, user_id, "task", task_id):
            return None
        
        if task.status in ["completed", "failed", "cancelled"]:
            return None
        
        return self.update_task_status(task_id, "cancelled")
    
    def delete_task(self, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a task (with ownership verification)"""
        task = self.get_task(task_id)
        if not task:
            return False
        
        # Verify ownership (Layer 8.5)
        if not verify_ownership(self.db, user_id, "task", task_id):
            return False
        
        self.db.delete(task)
        self.db.commit()
        return True
