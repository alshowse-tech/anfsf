"""
音视频转写 API 端点
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
import asyncio
import uuid
from datetime import datetime

from db.database import get_db
from services.media_processor import MediaProcessor, TranscriptionResult, ProcessingProgress
from services.tikhub_client import TikHubClient
from services.oss_storage import get_oss_storage
from services.bailian_client import get_bailian_client


router = APIRouter(prefix="/transcribe", tags=["transcription"])


# ============== 请求/响应模型 ==============

class TranscriptionRequest(BaseModel):
    """转写请求"""
    url: str
    is_audio: bool = False  # 是否为音频 URL（跳过 TikHub 解析）
    language: str = "zh-CN"
    timeout: int = 600  # 超时时间（秒）


class TranscriptionResponse(BaseModel):
    """转写响应"""
    task_id: str
    status: str
    message: str
    result: Optional[TranscriptionResult] = None


class TranscriptionStatus(BaseModel):
    """转写状态"""
    task_id: str
    status: str  # pending, processing, completed, failed
    progress: float  # 0-100
    message: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ============== 内存存储（生产环境应使用数据库） ==============

# 任务存储
_tasks: Dict[str, Dict[str, Any]] = {}


def _get_processor() -> MediaProcessor:
    """获取媒体处理器实例"""
    return MediaProcessor()


# ============== API 端点 ==============

@router.post("/", response_model=TranscriptionResponse)
async def create_transcription_task(
    request: TranscriptionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    创建音视频转文字任务
    
    - **url**: 视频/音频 URL
    - **is_audio**: 是否为音频 URL（true 则跳过 TikHub 解析）
    - **language**: 语言代码
    - **timeout**: 超时时间（秒）
    
    返回任务 ID，可后续查询状态
    """
    task_id = str(uuid.uuid4())
    
    # 保存任务状态
    _tasks[task_id] = {
        "task_id": task_id,
        "status": "pending",
        "progress": 0,
        "message": "任务已创建，等待处理",
        "request": request.dict(),
        "created_at": datetime.now(),
        "result": None,
        "error": None
    }
    
    # 后台处理
    background_tasks.add_task(
        _process_transcription,
        task_id,
        request
    )
    
    return TranscriptionResponse(
        task_id=task_id,
        status="pending",
        message="转写任务已创建，正在后台处理"
    )


@router.post("/sync", response_model=TranscriptionResult)
async def create_transcription_task_sync(
    request: TranscriptionRequest,
    db: Session = Depends(get_db)
):
    """
    同步创建转写任务（等待完成）
    
    ⚠️ 注意：此接口会阻塞直到转写完成，适合短音频/视频
    对于长视频，建议使用异步接口 /transcribe/
    """
    processor = _get_processor()
    
    def progress_callback(progress: ProcessingProgress):
        """进度回调（日志记录）"""
        print(f"[{progress.step}] {progress.message} ({progress.progress}%)")
    
    try:
        if request.is_audio:
            result = await processor.process_audio_url(
                request.url,
                progress_callback=progress_callback,
                timeout=request.timeout
            )
        else:
            result = await processor.process_url(
                request.url,
                progress_callback=progress_callback,
                timeout=request.timeout
            )
        
        if not result.success:
            raise HTTPException(status_code=500, detail=result.error_message)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}", response_model=TranscriptionStatus)
async def get_transcription_result(task_id: str):
    """
    查询转写任务状态
    
    - **task_id**: 任务 ID
    
    返回任务当前状态和结果（如果已完成）
    """
    task = _tasks.get(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return TranscriptionStatus(
        task_id=task["task_id"],
        status=task["status"],
        progress=task["progress"],
        message=task["message"],
        result=task["result"],
        error=task["error"],
        created_at=task["created_at"],
        completed_at=task.get("completed_at")
    )


@router.get("/{task_id}/result")
async def get_transcription_text(task_id: str):
    """
    获取转写文本结果
    
    仅返回转写后的文本内容，适合直接展示
    """
    task = _tasks.get(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    if task["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"任务尚未完成，当前状态：{task['status']}"
        )
    
    result = task.get("result", {})
    if isinstance(result, TranscriptionResult):
        return JSONResponse(content={
            "task_id": task_id,
            "text": result.transcription,
            "video_id": result.video_id,
            "oss_url": result.oss_url
        })
    else:
        return JSONResponse(content={
            "task_id": task_id,
            "text": result.get("transcription") if result else None
        })


@router.delete("/{task_id}")
async def delete_transcription_task(task_id: str):
    """
    删除转写任务
    
    清理任务记录和相关资源
    """
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    del _tasks[task_id]
    
    return {"message": "任务已删除", "task_id": task_id}


@router.get("/")
async def list_transcription_tasks(
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0
):
    """
    列出转写任务
    
    - **status**: 按状态过滤（pending, processing, completed, failed）
    - **limit**: 返回数量限制
    - **offset**: 偏移量
    """
    tasks = list(_tasks.values())
    
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    
    # 按创建时间倒序
    tasks.sort(key=lambda x: x["created_at"], reverse=True)
    
    # 分页
    total = len(tasks)
    tasks = tasks[offset:offset + limit]
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "tasks": tasks
    }


# ============== 后台处理函数 ==============

async def _process_transcription(task_id: str, request: TranscriptionRequest):
    """后台处理转写任务"""
    
    def progress_callback(progress: ProcessingProgress):
        """更新任务进度"""
        if task_id in _tasks:
            _tasks[task_id]["status"] = "processing"
            _tasks[task_id]["progress"] = progress.progress
            _tasks[task_id]["message"] = progress.message
    
    try:
        processor = _get_processor()
        
        if request.is_audio:
            result = await processor.process_audio_url(
                request.url,
                progress_callback=progress_callback,
                timeout=request.timeout
            )
        else:
            result = await processor.process_url(
                request.url,
                progress_callback=progress_callback,
                timeout=request.timeout
            )
        
        if result.success:
            _tasks[task_id]["status"] = "completed"
            _tasks[task_id]["progress"] = 100
            _tasks[task_id]["message"] = "转写完成"
            _tasks[task_id]["result"] = result
            _tasks[task_id]["completed_at"] = datetime.now()
        else:
            _tasks[task_id]["status"] = "failed"
            _tasks[task_id]["error"] = result.error_message
            _tasks[task_id]["message"] = f"转写失败：{result.error_message}"
            
    except Exception as e:
        _tasks[task_id]["status"] = "failed"
        _tasks[task_id]["error"] = str(e)
        _tasks[task_id]["message"] = f"处理异常：{str(e)}"


# ============== 健康检查 ==============

@router.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "transcription",
        "timestamp": datetime.now().isoformat()
    }
