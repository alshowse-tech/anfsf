# 任务 API 路由
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import hashlib

from src.db.session import get_db
from src.db.models import Task, TaskStatus, ContentType

router = APIRouter()

# 请求/响应模型
class TaskCreate(BaseModel):
    url: str

class TaskResponse(BaseModel):
    id: int
    user_id: int
    url: Optional[str]
    status: str
    content_type: Optional[str]
    duration: Optional[int]
    cost: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True

class TaskDetailResponse(BaseModel):
    id: int
    user_id: int
    url: Optional[str]
    status: str
    content_type: Optional[str]
    duration: Optional[int]
    cost: Optional[float]
    error_msg: Optional[str]
    created_at: datetime
    updated_at: datetime
    result: Optional[dict] = None
    
    class Config:
        from_attributes = True

@router.post("/create", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    user_id: int,
    db: Session = Depends(get_db)
):
    """创建任务"""
    # 生成 URL hash（用于幂等性）
    url_hash = hashlib.sha256(task_data.url.encode()).hexdigest()
    
    # 检查是否已存在相同任务（幂等性）
    existing_task = db.query(Task).filter(
        Task.user_id == user_id,
        Task.url_hash == url_hash,
        Task.status.in_([TaskStatus.SUCCESS, TaskStatus.PARSING, TaskStatus.ASR_PROCESSING, TaskStatus.SUMMARIZING])
    ).first()
    
    if existing_task:
        return TaskResponse(
            id=existing_task.id,
            user_id=existing_task.user_id,
            url=existing_task.url,
            status=existing_task.status.value,
            content_type=existing_task.content_type.value if existing_task.content_type else None,
            duration=existing_task.duration,
            cost=float(existing_task.cost) if existing_task.cost else 0,
            created_at=existing_task.created_at
        )
    
    # 创建新任务
    db_task = Task(
        user_id=user_id,
        url=task_data.url,
        url_hash=url_hash,
        status=TaskStatus.INIT
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # TODO: 触发队列处理
    # await queue_parse.delay(db_task.id)
    
    return TaskResponse(
        id=db_task.id,
        user_id=db_task.user_id,
        url=db_task.url,
        status=db_task.status.value,
        content_type=None,
        duration=None,
        cost=0,
        created_at=db_task.created_at
    )

# 注意：/list 路由必须在 /{task_id} 之前定义，避免 "list" 被解析为 task_id
@router.get("/list", response_model=List[TaskResponse])
async def list_tasks(
    user_id: int,
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """获取任务列表"""
    query = db.query(Task).filter(Task.user_id == user_id)
    
    if status:
        query = query.filter(Task.status == status)
    
    tasks = query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        TaskResponse(
            id=task.id,
            user_id=task.user_id,
            url=task.url,
            status=task.status.value,
            content_type=task.content_type.value if task.content_type else None,
            duration=task.duration,
            cost=float(task.cost) if task.cost else 0,
            created_at=task.created_at
        )
        for task in tasks
    ]

@router.get("/{task_id}", response_model=TaskDetailResponse)
async def get_task(task_id: int, db: Session = Depends(get_db)):
    """获取任务详情"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    result = None
    if task.status == TaskStatus.SUCCESS:
        # TODO: 从 Content 和 Summary 表获取结果
        result = {
            "key_points": [],
            "abstract": "",
            "risk_tags": []
        }
    
    return TaskDetailResponse(
        id=task.id,
        user_id=task.user_id,
        url=task.url,
        status=task.status.value,
        content_type=task.content_type.value if task.content_type else None,
        duration=task.duration,
        cost=float(task.cost) if task.cost else 0,
        error_msg=task.error_msg,
        created_at=task.created_at,
        updated_at=task.updated_at,
        result=result
    )
