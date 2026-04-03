"""Health Check API - Layer 8.5 Readiness Gate"""

from fastapi import APIRouter, status
from pydantic import BaseModel
from typing import Dict, List
import logging

from core.layer8 import readiness_gate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    version: str
    layer8_enabled: bool


class ReadinessResponse(BaseModel):
    ready: bool
    probes: Dict[str, bool]
    details: List[str]


@router.get("", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check():
    """Basic health check"""
    from config.settings import get_settings
    settings = get_settings()
    
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        layer8_enabled=settings.layer8_enabled
    )


@router.get("/ready", response_model=ReadinessResponse, status_code=status.HTTP_200_OK)
async def readiness_check():
    """Layer 8.5 Readiness Gate check"""
    probe_results = await readiness_gate.check_all()
    
    is_ready = all(probe_results.values())
    details = []
    
    for probe_name, is_passing in probe_results.items():
        status_str = "✓" if is_passing else "✗"
        details.append(f"{status_str} {probe_name}")
    
    response = ReadinessResponse(
        ready=is_ready,
        probes=probe_results,
        details=details
    )
    
    if not is_ready:
        logger.warning(f"Service not ready: {details}")
    
    return response


@router.get("/live", status_code=status.HTTP_200_OK)
async def liveness_check():
    """Liveness check (always returns healthy if running)"""
    return {"status": "alive"}
