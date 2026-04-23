"""
健康检查 API
"""
from fastapi import APIRouter
from datetime import datetime
from config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """健康检查接口"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": settings.APP_VERSION,
        "app": settings.APP_NAME
    }
