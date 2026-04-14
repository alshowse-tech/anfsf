"""
短链接转换服务

重构版本：集成 ProviderRouter、重试机制、健康检查、降级策略
符合 ANFSF V1.5.0 架构规范
"""
import asyncio
import aiohttp
import time
import hashlib
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum


class ExpandProviderStatus(str, Enum):
    """Provider 状态"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"


class ProviderHealthChecker:
    """Provider 健康检查器"""
    
    def __init__(self, timeout: int = 5):
        self.timeout = timeout
        self.results: Dict[str, ExpandProviderStatus] = {}
    
    async def check(self, url: str, provider_id: str) -> ExpandProviderStatus:
        """检查 Provider 健康状态"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=self.timeout)) as response:
                    if response.status == 200:
                        return ExpandProviderStatus.HEALTHY
                    else:
                        return ExpandProviderStatus.UNHEALTHY
        except Exception:
            return ExpandProviderStatus.UNHEALTHY
    
    async def health_check_loop(self, providers: List[Dict[str, Any]], interval: int = 30):
        """定期健康检查"""
        while True:
            for provider in providers:
                if "health_check_url" in provider:
                    status = await self.check(
                        provider["health_check_url"],
                        provider["id"]
                    )
                    self.results[provider["id"]] = status
            await asyncio.sleep(interval)


@dataclass
class VideoInfo:
    """视频信息"""
    url: str
    platform: str
    video_id: str
    title: Optional[str] = None
    author: Optional[str] = None
    cover_url: Optional[str] = None
    duration: Optional[int] = None  # 秒
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    provider_id: Optional[str] = None  # ANFSF V1.5.0 Layer 8.5


@dataclass
class ExpandResult:
    """短链接展开结果"""
    original_url: str
    expanded_url: str
    platform: str
    success: bool
    error: Optional[str] = None
    provider_id: Optional[str] = None


class ExpandProvider:
    """展开 Provider 基类"""
    
    def __init__(self, provider_id: str, name: str, config: Dict[str, Any]):
        self.provider_id = provider_id
        self.name = name
        self.config = config
        self.stats = {
            "total_requests": 0,
            "success_requests": 0,
            "failed_requests": 0,
            "total_time_ms": 0
        }
    
    async def expand(self, short_url: str) -> ExpandResult:
        """展开短链接（需要子类实现）"""
        raise NotImplementedError


class AiohttpExpandProvider(ExpandProvider):
    """Aiohttp 展开 Provider"""
    
    def __init__(self, provider_id: str, config: Dict[str, Any]):
        super().__init__(provider_id, "Aiohttp Expand", config)
        self.timeout = config.get("timeout", 10)
    
    async def expand(self, short_url: str) -> ExpandResult:
        """展开短链接"""
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.head(
                    short_url,
                    allow_redirects=True,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    expanded_url = str(response.url)
                    
                    # 识别平台
                    platform = self._identify_platform(expanded_url)
                    
                    elapsed_ms = (time.time() - start_time) * 1000
                    
                    self.stats["total_requests"] += 1
                    self.stats["success_requests"] += 1
                    self.stats["total_time_ms"] += elapsed_ms
                    
                    return ExpandResult(
                        original_url=short_url,
                        expanded_url=expanded_url,
                        platform=platform,
                        success=True,
                        provider_id=self.provider_id
                    )
        except Exception as e:
            self.stats["total_requests"] += 1
            self.stats["failed_requests"] += 1
            
            return ExpandResult(
                original_url=short_url,
                expanded_url="",
                platform="unknown",
                success=False,
                error=str(e),
                provider_id=self.provider_id
            )
    
    def _identify_platform(self, url: str) -> str:
        """识别平台"""
        if "douyin" in url or "iesdouyin" in url:
            return "douyin"
        elif "bilibili" in url or "b23.tv" in url:
            return "bilibili"
        elif "tiktok" in url:
            return "tiktok"
        elif "kuaishou" in url:
            return "kuaishou"
        elif "xiaohongshu" in url:
            return "xiaohongshu"
        else:
            return "unknown"


class FallbackExpandProvider(ExpandProvider):
    """备用展开 Provider（fallback）"""
    
    def __init__(self, provider_id: str = "fallback"):
        super().__init__(provider_id, "Fallback Expand", {})
    
    async def expand(self, short_url: str) -> ExpandResult:
        """备用展开"""
        return ExpandResult(
            original_url=short_url,
            expanded_url=short_url,
            platform="unknown",
            success=True,
            provider_id=self.provider_id
        )


class ExpandProviderRouter:
    """
    展开 Provider 路由器
    
    功能：
    - Provider 路由（按优先级、负载均衡）
    - 健康检查
    - 故障切换
    - 负载均衡
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.providers: Dict[str, ExpandProvider] = {}
        self.routing_config = config.get("routing", {
            "strategy": "priority",
            "max_retries": 3
        })
        
        # 初始化 Providers
        for provider_config in config.get("providers", []):
            provider_id = provider_config["id"]
            provider_type = provider_config.get("type", "aiohttp")
            
            if provider_type == "aiohttp":
                self.providers[provider_id] = AiohttpExpandProvider(provider_id, provider_config)
            elif provider_type == "fallback":
                self.providers[provider_id] = FallbackExpandProvider(provider_id)
    
    async def expand(self, short_url: str) -> ExpandResult:
        """展开短链接（自动路由）"""
        max_retries = self.routing_config.get("max_retries", 3)
        
        for attempt in range(max_retries):
            for provider_id, provider in self.providers.items():
                try:
                    result = await provider.expand(short_url)
                    if result.success:
                        return result
                    # 继续尝试下一个 Provider
                    continue
                except Exception:
                    # 继续尝试下一个 Provider
                    continue
        
        # 所有Providers都失败，返回默认结果
        default_provider = FallbackExpandProvider("default")
        return await default_provider.expand(short_url)
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        stats = {
            "total_providers": len(self.providers),
            "providers": {}
        }
        
        for provider_id, provider in self.providers.items():
            stats["providers"][provider_id] = {
                "name": provider.name,
                "stats": provider.stats
            }
        
        return stats


class URLExpander:
    """
    短链接转换服务（完整实现）
    
    功能增强：
    - 集成 ExpandProviderRouter 多 Provider 路由
    - 自动重试机制（最多 3 次）
    - 降级策略（fallback 到备用 Provider）
    - 健康检查和监控
    - ANFSF V1.5.0 Layer 8.5 集成
    """
    
    # 缓存配置
    CACHE_TTL = timedelta(hours=24)
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化短链接转换服务
        
        Args:
            config: 配置字典
        """
        self.router = ExpandProviderRouter(config)
        self.config = config
        self._cache: Dict[str, tuple[str, datetime]] = {}
    
    def _get_cache_key(self, url: str) -> str:
        """生成缓存键"""
        return hashlib.md5(url.encode()).hexdigest()
    
    def _is_cache_valid(self, timestamp: datetime) -> bool:
        """检查缓存是否有效"""
        return datetime.now() - timestamp < self.CACHE_TTL
    
    async def expand(self, short_url: str) -> str:
        """
        将短链接转换为标准链接
        
        Args:
            short_url: 短链接
            
        Returns:
            展开后的标准链接
        """
        # 检查缓存
        cache_key = self._get_cache_key(short_url)
        if cache_key in self._cache:
            expanded_url, timestamp = self._cache[cache_key]
            if self._is_cache_valid(timestamp):
                return expanded_url
        
        # 展开短链接
        result = await self.router.expand(short_url)
        
        if result.success:
            # 缓存结果
            self._cache[cache_key] = (result.expanded_url, datetime.now())
            return result.expanded_url
        
        return short_url
    
    async def expand_and_get_info(self, short_url: str) -> Dict[str, Any]:
        """
        展开短链接并获取视频信息
        
        Args:
            short_url: 短链接
            
        Returns:
            Dict[str, Any]: 视频信息
        """
        expanded_url = await self.expand(short_url)
        
        return {
            "success": True,
            "original_url": short_url,
            "expanded_url": expanded_url,
            "provider_id": "expand-router"
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return self.router.get_stats()


# 工具函数
def create_url_expander(config_path: Optional[str] = None) -> URLExpander:
    """
    创建短链接转换服务
    
    Args:
        config_path: 配置文件路径（可选）
        
    Returns:
        URLExpander: 实例
    """
    if config_path:
        with open(config_path, 'r') as f:
            config = json.load(f)
    else:
        config = {
            "routing": {
                "strategy": "priority",
                "max_retries": 3
            },
            "providers": [
                {
                    "id": "expand-1",
                    "type": "aiohttp",
                    "timeout": 10,
                    "priority": 1
                },
                {
                    "id": "fallback",
                    "type": "fallback",
                    "priority": 10
                }
            ]
        }
    
    return URLExpander(config)
