"""
治理控制平面 API

层级：Layer 8.5 - Governance Control Plane
功能：Provider 管理、健康检查、路由配置
符合 ANFSF V1.5.0 架构规范
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from governance.provider_router import (
    ProviderRouter,
    ProviderConfig,
    RouterConfig,
    RoutingStrategy,
    ProviderHealthStatus,
    get_provider_router,
)
from services.bailian_client import get_bailian_client, BailianClient
from services.url_parser import get_url_parser, URLParserService, identify_platform


router = APIRouter(prefix="/governance", tags=["governance"])


# ============== 数据模型 ==============

class ProviderRegisterRequest(BaseModel):
    """注册 Provider 请求"""
    id: str = Field(..., description="Provider ID")
    name: str = Field(..., description="Provider 名称")
    base_url: str = Field(..., description="Base URL")
    api: str = Field(..., description="API 类型")
    priority: int = Field(default=5, ge=1, le=10, description="优先级 (1-10)")
    weight: int = Field(default=1, ge=1, description="权重")
    timeout_ms: int = Field(default=30000, ge=1000, description="超时时间 (ms)")
    max_retries: int = Field(default=3, ge=0, description="最大重试次数")
    enabled: bool = Field(default=True, description="是否启用")
    health_check_enabled: bool = Field(default=True, description="是否启用健康检查")


class ProviderUpdateRequest(BaseModel):
    """更新 Provider 请求"""
    name: Optional[str] = Field(None, description="Provider 名称")
    priority: Optional[int] = Field(None, ge=1, le=10, description="优先级")
    weight: Optional[int] = Field(None, ge=1, description="权重")
    enabled: Optional[bool] = Field(None, description="是否启用")


class RouterConfigUpdateRequest(BaseModel):
    """更新路由配置请求"""
    strategy: Optional[RoutingStrategy] = Field(None, description="路由策略")
    max_retries: Optional[int] = Field(None, ge=0, description="最大重试次数")
    timeout_ms: Optional[int] = Field(None, ge=1000, description="超时时间 (ms)")
    enable_health_check: Optional[bool] = Field(None, description="是否启用健康检查")
    auto_exclude_unhealthy: Optional[bool] = Field(None, description="是否自动剔除不健康 Provider")


class HealthStatusResponse(BaseModel):
    """健康状态响应"""
    provider_id: str
    healthy: bool
    last_check_at: int
    consecutive_failures: int
    avg_response_time_ms: float
    success_rate: float
    total_requests: int
    failed_requests: int


class RouterStatsResponse(BaseModel):
    """路由器统计响应"""
    total_providers: int
    healthy_providers: int
    unhealthy_providers: int
    avg_success_rate: float
    avg_response_time_ms: float


class RoutingTestResponse(BaseModel):
    """路由测试响应"""
    selected_provider: str
    reason: str
    alternatives: List[str]
    routing_time_ms: int


class PlatformIdentifyResponse(BaseModel):
    """平台识别响应"""
    url: str
    platform: str
    video_id: Optional[str]


# ============== Provider 管理 ==============

@router.get("/providers", response_model=Dict[str, Any])
async def list_providers():
    """
    获取所有 Provider 列表
    
    Returns:
        Dict: Provider 列表和状态
    """
    router_instance = get_provider_router()
    
    providers = []
    for provider_id, provider in router_instance.providers.items():
        health = router_instance.get_health_status(provider_id)
        providers.append({
            "id": provider.id,
            "name": provider.name,
            "base_url": provider.base_url,
            "api": provider.api,
            "priority": provider.priority,
            "weight": provider.weight,
            "enabled": provider.enabled,
            "healthy": health.healthy if health else False,
            "consecutive_failures": health.consecutive_failures if health else 0,
            "success_rate": health.success_rate if health else 0.0,
        })
    
    return {
        "providers": providers,
        "total": len(providers),
        "healthy": sum(1 for p in providers if p["healthy"]),
        "unhealthy": sum(1 for p in providers if not p["healthy"]),
    }


@router.post("/providers", response_model=Dict[str, Any])
async def register_provider(request: ProviderRegisterRequest):
    """
    注册新的 Provider
    
    Args:
        request: 注册请求
        
    Returns:
        Dict: 注册结果
    """
    router_instance = get_provider_router()
    
    # 检查是否已存在
    if request.id in router_instance.providers:
        raise HTTPException(status_code=400, detail=f"Provider {request.id} 已存在")
    
    # 创建 Provider 配置
    provider_config = ProviderConfig(
        id=request.id,
        name=request.name,
        base_url=request.base_url,
        api=request.api,
        priority=request.priority,
        weight=request.weight,
        timeout_ms=request.timeout_ms,
        max_retries=request.max_retries,
        enabled=request.enabled,
        health_check_enabled=request.health_check_enabled,
    )
    
    # 注册
    router_instance.register_provider(provider_config)
    
    return {
        "success": True,
        "message": f"Provider {request.id} 注册成功",
        "provider": {
            "id": provider_config.id,
            "name": provider_config.name,
            "priority": provider_config.priority,
        }
    }


@router.put("/providers/{provider_id}", response_model=Dict[str, Any])
async def update_provider(provider_id: str, request: ProviderUpdateRequest):
    """
    更新 Provider 配置
    
    Args:
        provider_id: Provider ID
        request: 更新请求
        
    Returns:
        Dict: 更新结果
    """
    router_instance = get_provider_router()
    
    # 检查是否存在
    if provider_id not in router_instance.providers:
        raise HTTPException(status_code=404, detail=f"Provider {provider_id} 不存在")
    
    provider = router_instance.providers[provider_id]
    
    # 更新配置
    if request.name is not None:
        provider.name = request.name
    if request.priority is not None:
        provider.priority = request.priority
    if request.weight is not None:
        provider.weight = request.weight
    if request.enabled is not None:
        provider.enabled = request.enabled
    
    return {
        "success": True,
        "message": f"Provider {provider_id} 更新成功",
        "provider": {
            "id": provider.id,
            "name": provider.name,
            "priority": provider.priority,
            "enabled": provider.enabled,
        }
    }


@router.delete("/providers/{provider_id}", response_model=Dict[str, Any])
async def delete_provider(provider_id: str):
    """
    删除 Provider
    
    Args:
        provider_id: Provider ID
        
    Returns:
        Dict: 删除结果
    """
    router_instance = get_provider_router()
    
    # 检查是否存在
    if provider_id not in router_instance.providers:
        raise HTTPException(status_code=404, detail=f"Provider {provider_id} 不存在")
    
    # 删除
    del router_instance.providers[provider_id]
    if provider_id in router_instance.health_status:
        del router_instance.health_status[provider_id]
    
    return {
        "success": True,
        "message": f"Provider {provider_id} 已删除",
    }


@router.post("/providers/{provider_id}/recover", response_model=Dict[str, Any])
async def recover_provider(provider_id: str):
    """
    手动恢复 Provider
    
    Args:
        provider_id: Provider ID
        
    Returns:
        Dict: 恢复结果
    """
    router_instance = get_provider_router()
    
    # 检查是否存在
    if provider_id not in router_instance.providers:
        raise HTTPException(status_code=404, detail=f"Provider {provider_id} 不存在")
    
    # 恢复
    router_instance.recover_provider(provider_id)
    
    return {
        "success": True,
        "message": f"Provider {provider_id} 已恢复",
    }


# ============== 健康检查 ==============

@router.get("/health", response_model=Dict[str, Any])
async def get_health_status():
    """
    获取所有 Provider 健康状态
    
    Returns:
        Dict: 健康状态列表
    """
    router_instance = get_provider_router()
    
    statuses = router_instance.get_all_health_status()
    
    return {
        "providers": [
            {
                "provider_id": s.provider_id,
                "healthy": s.healthy,
                "consecutive_failures": s.consecutive_failures,
                "success_rate": s.success_rate,
                "avg_response_time_ms": s.avg_response_time_ms,
                "total_requests": s.total_requests,
                "failed_requests": s.failed_requests,
                "last_check_at": s.last_check_at,
            }
            for s in statuses
        ],
        "timestamp": int(datetime.now().timestamp()),
    }


@router.get("/health/{provider_id}", response_model=HealthStatusResponse)
async def get_provider_health(provider_id: str):
    """
    获取单个 Provider 健康状态
    
    Args:
        provider_id: Provider ID
        
    Returns:
        HealthStatusResponse: 健康状态
    """
    router_instance = get_provider_router()
    
    status = router_instance.get_health_status(provider_id)
    
    if not status:
        raise HTTPException(status_code=404, detail=f"Provider {provider_id} 不存在")
    
    return HealthStatusResponse(
        provider_id=status.provider_id,
        healthy=status.healthy,
        last_check_at=status.last_check_at,
        consecutive_failures=status.consecutive_failures,
        avg_response_time_ms=status.avg_response_time_ms,
        success_rate=status.success_rate,
        total_requests=status.total_requests,
        failed_requests=status.failed_requests,
    )


@router.get("/stats", response_model=RouterStatsResponse)
async def get_router_stats():
    """
    获取路由器统计信息
    
    Returns:
        RouterStatsResponse: 统计信息
    """
    router_instance = get_provider_router()
    stats = router_instance.get_stats()
    
    return RouterStatsResponse(
        total_providers=stats["total_providers"],
        healthy_providers=stats["healthy_providers"],
        unhealthy_providers=stats["unhealthy_providers"],
        avg_success_rate=stats["avg_success_rate"],
        avg_response_time_ms=stats["avg_response_time_ms"],
    )


# ============== 路由配置 ==============

@router.get("/config", response_model=Dict[str, Any])
async def get_router_config():
    """
    获取路由配置
    
    Returns:
        Dict: 路由配置
    """
    router_instance = get_provider_router()
    config = router_instance.config
    
    return {
        "strategy": config.strategy.value,
        "fallback_chain": config.fallback_chain,
        "max_retries": config.max_retries,
        "timeout_ms": config.timeout_ms,
        "enable_health_check": config.enable_health_check,
        "health_check_interval_ms": config.health_check_interval_ms,
        "auto_exclude_unhealthy": config.auto_exclude_unhealthy,
        "exclude_duration_ms": config.exclude_duration_ms,
    }


@router.put("/config", response_model=Dict[str, Any])
async def update_router_config(request: RouterConfigUpdateRequest):
    """
    更新路由配置
    
    Args:
        request: 配置更新请求
        
    Returns:
        Dict: 更新结果
    """
    router_instance = get_provider_router()
    config = router_instance.config
    
    # 更新配置
    if request.strategy is not None:
        config.strategy = request.strategy
    if request.max_retries is not None:
        config.max_retries = request.max_retries
    if request.timeout_ms is not None:
        config.timeout_ms = request.timeout_ms
    if request.enable_health_check is not None:
        config.enable_health_check = request.enable_health_check
    if request.auto_exclude_unhealthy is not None:
        config.auto_exclude_unhealthy = request.auto_exclude_unhealthy
    
    return {
        "success": True,
        "message": "路由配置已更新",
        "config": {
            "strategy": config.strategy.value,
            "max_retries": config.max_retries,
            "timeout_ms": config.timeout_ms,
            "enable_health_check": config.enable_health_check,
            "auto_exclude_unhealthy": config.auto_exclude_unhealthy,
        }
    }


# ============== 路由测试 ==============

@router.post("/test/route", response_model=RoutingTestResponse)
async def test_routing(
    model_preference: Optional[str] = Query(None, description="模型偏好")
):
    """
    测试路由选择
    
    Args:
        model_preference: 模型偏好
        
    Returns:
        RoutingTestResponse: 路由测试结果
    """
    router_instance = get_provider_router()
    
    try:
        result = router_instance.select_provider(model_preference)
        
        return RoutingTestResponse(
            selected_provider=result.selected_provider,
            reason=result.reason,
            alternatives=result.alternatives,
            routing_time_ms=result.routing_time_ms,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ============== 平台识别 ==============

@router.get("/platform/identify", response_model=PlatformIdentifyResponse)
async def identify_video_platform(url: str = Query(..., description="视频 URL")):
    """
    识别视频平台
    
    Args:
        url: 视频 URL
        
    Returns:
        PlatformIdentifyResponse: 平台识别结果
    """
    platform = identify_platform(url)
    
    # 尝试提取视频 ID
    from services.url_parser import extract_video_id
    from services.url_parser import PlatformType
    
    try:
        platform_enum = PlatformType(platform)
    except ValueError:
        platform_enum = PlatformType.UNKNOWN
    
    video_id = extract_video_id(url, platform_enum)
    
    return PlatformIdentifyResponse(
        url=url,
        platform=platform,
        video_id=video_id,
    )


# ============== Bailian 客户端状态 ==============

@router.get("/bailian/status", response_model=Dict[str, Any])
async def get_bailian_status():
    """
    获取 Bailian 客户端状态
    
    Returns:
        Dict: 状态信息
    """
    try:
        client = get_bailian_client()
        health = client.get_health_status()
        stats = client.get_router_stats()
        
        return {
            "available": True,
            "health": health,
            "router_stats": stats,
        }
    except Exception as e:
        return {
            "available": False,
            "error": str(e),
        }


# ============== URL Parser 状态 ==============

@router.get("/url-parser/status", response_model=Dict[str, Any])
async def get_url_parser_status():
    """
    获取 URL Parser 状态
    
    Returns:
        Dict: 状态信息
    """
    try:
        # 注意：需要 API Key 才能初始化
        # 这里返回一个示意状态
        return {
            "available": True,
            "message": "URL Parser 服务已就绪",
        }
    except Exception as e:
        return {
            "available": False,
            "error": str(e),
        }
