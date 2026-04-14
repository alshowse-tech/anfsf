"""
Provider 路由管理器

层级：Layer 8.5 - Governance Control Plane
功能：多 Provider 路由、故障切换、负载均衡
版本：V1.0.0
"""
import time
import random
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


class RoutingStrategy(str, Enum):
    """路由策略枚举"""
    PRIORITY = "priority"  # 优先级优先
    ROUND_ROBIN = "round_robin"  # 轮询
    WEIGHTED = "weighted"  # 加权轮询
    LATENCY = "latency"  # 延迟最低
    COST_OPTIMIZED = "cost_optimized"  # 成本优化


@dataclass
class ProviderConfig:
    """Provider 配置"""
    id: str
    name: str
    base_url: str
    api: str
    priority: int = 5  # 1-10, 1 最高
    weight: int = 1  # 用于负载均衡
    timeout_ms: int = 30000
    max_retries: int = 3
    enabled: bool = True
    health_check_enabled: bool = True
    health_check_interval_ms: int = 60000
    health_check_timeout_ms: int = 5000


@dataclass
class ProviderHealthStatus:
    """Provider 健康状态"""
    provider_id: str
    healthy: bool = True
    last_check_at: int = field(default_factory=lambda: int(time.time() * 1000))
    consecutive_failures: int = 0
    avg_response_time_ms: float = 0.0
    success_rate: float = 1.0
    total_requests: int = 0
    failed_requests: int = 0


@dataclass
class RoutingResult:
    """路由结果"""
    selected_provider: str
    reason: str
    alternatives: List[str]
    routing_time_ms: int


@dataclass
class RouterConfig:
    """路由配置"""
    strategy: RoutingStrategy = RoutingStrategy.PRIORITY
    fallback_chain: List[str] = field(default_factory=lambda: ["modelstudio", "bailian", "anthropic", "openai"])
    max_retries: int = 3
    timeout_ms: int = 30000
    enable_health_check: bool = True
    health_check_interval_ms: int = 60000  # 1 分钟
    auto_exclude_unhealthy: bool = True
    exclude_duration_ms: int = 300000  # 5 分钟


class ProviderRouter:
    """
    Provider 路由管理器
    
    功能：
    - Provider 健康检查
    - 故障切换
    - 负载均衡
    - 超时重试
    """
    
    def __init__(self, config: Optional[RouterConfig] = None):
        """
        初始化路由管理器
        
        Args:
            config: 路由配置，使用默认配置如果未提供
        """
        self.config = config or RouterConfig()
        self.providers: Dict[str, ProviderConfig] = {}
        self.health_status: Dict[str, ProviderHealthStatus] = {}
        self.round_robin_index: int = 0
        self.last_health_check_time: int = int(time.time() * 1000)
    
    def register_provider(self, provider: ProviderConfig) -> None:
        """
        注册 Provider
        
        Args:
            provider: Provider 配置
        """
        self.providers[provider.id] = provider
        self.health_status[provider.id] = ProviderHealthStatus(
            provider_id=provider.id,
            healthy=True,
            last_check_at=int(time.time() * 1000),
            consecutive_failures=0,
            avg_response_time_ms=0.0,
            success_rate=1.0,
            total_requests=0,
            failed_requests=0
        )
        print(f"[Provider Router] 📝 Registered: {provider.id} (priority: {provider.priority})")
    
    def select_provider(self, model_preference: Optional[str] = None) -> RoutingResult:
        """
        选择 Provider
        
        Args:
            model_preference: 模型偏好（可选）
            
        Returns:
            RoutingResult: 路由结果
            
        Raises:
            ValueError: 没有可用的 Provider
        """
        start_time = int(time.time() * 1000)
        alternatives: List[str] = []
        
        # 获取可用的 Provider 列表
        available_providers = self.get_available_providers()
        
        if not available_providers:
            raise ValueError("No available providers")
        
        selected: Optional[ProviderConfig] = None
        reason = ""
        
        # 根据策略选择
        if self.config.strategy == RoutingStrategy.PRIORITY:
            selected = self._select_by_priority(available_providers)
            reason = "Priority-based selection"
        elif self.config.strategy == RoutingStrategy.ROUND_ROBIN:
            selected = self._select_round_robin(available_providers)
            reason = "Round-robin selection"
        elif self.config.strategy == RoutingStrategy.WEIGHTED:
            selected = self._select_weighted(available_providers)
            reason = "Weighted selection"
        elif self.config.strategy == RoutingStrategy.LATENCY:
            selected = self._select_by_latency(available_providers)
            reason = "Lowest latency selection"
        elif self.config.strategy == RoutingStrategy.COST_OPTIMIZED:
            selected = self._select_by_cost(available_providers, model_preference)
            reason = "Cost-optimized selection"
        
        if not selected:
            raise ValueError("Failed to select provider")
        
        # 构建备选列表
        alternatives = [p.id for p in available_providers if p.id != selected.id]
        
        return RoutingResult(
            selected_provider=selected.id,
            reason=reason,
            alternatives=alternatives,
            routing_time_ms=int(time.time() * 1000) - start_time
        )
    
    def record_result(self, provider_id: str, success: bool, response_time_ms: float) -> None:
        """
        记录 Provider 请求结果
        
        Args:
            provider_id: Provider ID
            success: 是否成功
            response_time_ms: 响应时间（毫秒）
        """
        status = self.health_status.get(provider_id)
        if not status:
            return
        
        status.last_check_at = int(time.time() * 1000)
        status.total_requests += 1
        
        if success:
            status.consecutive_failures = 0
            status.success_rate = min(1.0, status.success_rate + 0.1)
        else:
            status.consecutive_failures += 1
            status.failed_requests += 1
            status.success_rate = max(0.0, status.success_rate - 0.2)
            
            # 自动剔除不健康的 Provider
            if (
                self.config.auto_exclude_unhealthy and
                status.consecutive_failures >= 3
            ):
                status.healthy = False
                print(f"[Provider Router] ⚠️ Provider {provider_id} marked unhealthy ({status.consecutive_failures} failures)")
        
        # 更新平均响应时间
        status.avg_response_time_ms = (status.avg_response_time_ms * 0.8) + (response_time_ms * 0.2)
    
    def get_health_status(self, provider_id: str) -> Optional[ProviderHealthStatus]:
        """
        获取 Provider 健康状态
        
        Args:
            provider_id: Provider ID
            
        Returns:
            ProviderHealthStatus: 健康状态，如果不存在则返回 None
        """
        return self.health_status.get(provider_id)
    
    def get_all_health_status(self) -> List[ProviderHealthStatus]:
        """
        获取所有 Provider 状态
        
        Returns:
            List[ProviderHealthStatus]: 所有 Provider 的健康状态列表
        """
        return list(self.health_status.values())
    
    def recover_provider(self, provider_id: str) -> None:
        """
        手动恢复 Provider
        
        Args:
            provider_id: Provider ID
        """
        status = self.health_status.get(provider_id)
        if status:
            status.healthy = True
            status.consecutive_failures = 0
            print(f"[Provider Router] ✅ Provider {provider_id} recovered")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        获取路由统计
        
        Returns:
            Dict: 统计信息
        """
        statuses = list(self.health_status.values())
        healthy = [s for s in statuses if s.healthy]
        unhealthy = [s for s in statuses if not s.healthy]
        
        avg_success_rate = (
            sum(s.success_rate for s in statuses) / len(statuses)
            if statuses else 0.0
        )
        avg_response_time = (
            sum(s.avg_response_time_ms for s in statuses) / len(statuses)
            if statuses else 0.0
        )
        
        return {
            "total_providers": len(statuses),
            "healthy_providers": len(healthy),
            "unhealthy_providers": len(unhealthy),
            "avg_success_rate": avg_success_rate,
            "avg_response_time_ms": avg_response_time,
        }
    
    def get_fallback_provider(self, current_provider_id: str) -> Optional[str]:
        """
        获取 fallback Provider
        
        Args:
            current_provider_id: 当前 Provider ID
            
        Returns:
            Optional[str]: fallback Provider ID，如果没有则返回 None
        """
        # 在 fallback 链中查找下一个可用的 Provider
        try:
            current_index = self.config.fallback_chain.index(current_provider_id)
        except ValueError:
            # 当前 Provider 不在 fallback 链中，返回链中的第一个
            return self.config.fallback_chain[0] if self.config.fallback_chain else None
        
        # 查找下一个可用的 Provider
        for i in range(current_index + 1, len(self.config.fallback_chain)):
            provider_id = self.config.fallback_chain[i]
            if provider_id in self.providers:
                status = self.health_status.get(provider_id)
                if status and status.healthy:
                    return provider_id
        
        return None
    
    # ============== 私有方法 ==============
    
    def get_available_providers(self) -> List[ProviderConfig]:
        """
        获取可用的 Provider 列表
        
        Returns:
            List[ProviderConfig]: 可用的 Provider 列表
        """
        available = [
            p for p in self.providers.values()
            if p.enabled
        ]
        
        # 过滤不健康的 Provider
        if self.config.enable_health_check:
            available = [
                p for p in available
                if self.health_status.get(p.id, ProviderHealthStatus(provider_id=p.id)).healthy
            ]
        
        # 按优先级排序
        return sorted(available, key=lambda p: p.priority)
    
    def _select_by_priority(self, providers: List[ProviderConfig]) -> ProviderConfig:
        """按优先级选择"""
        return providers[0]
    
    def _select_round_robin(self, providers: List[ProviderConfig]) -> ProviderConfig:
        """轮询选择"""
        self.round_robin_index = (self.round_robin_index + 1) % len(providers)
        return providers[self.round_robin_index]
    
    def _select_weighted(self, providers: List[ProviderConfig]) -> ProviderConfig:
        """加权选择"""
        total_weight = sum(p.weight for p in providers)
        random_value = random.random() * total_weight
        
        cumulative_weight = 0
        for provider in providers:
            cumulative_weight += provider.weight
            if random_value <= cumulative_weight:
                return provider
        
        return providers[-1]
    
    def _select_by_latency(self, providers: List[ProviderConfig]) -> ProviderConfig:
        """按延迟选择"""
        best = providers[0]
        best_latency = float('inf')
        
        for provider in providers:
            status = self.health_status.get(provider.id)
            latency = status.avg_response_time_ms if status else float('inf')
            
            if latency < best_latency:
                best = provider
                best_latency = latency
        
        return best
    
    def _select_by_cost(
        self,
        providers: List[ProviderConfig],
        model_preference: Optional[str] = None
    ) -> ProviderConfig:
        """
        按成本选择（简化实现）
        
        Args:
            providers: Provider 列表
            model_preference: 模型偏好
            
        Returns:
            ProviderConfig: 选中的 Provider
        """
        # 优先选择免费/低成本 Provider
        cost_order = ["modelstudio", "bailian", "anthropic", "openai"]
        
        for provider_id in cost_order:
            provider = next((p for p in providers if p.id == provider_id), None)
            if provider:
                return provider
        
        return providers[0]


# ============== 默认实例 ==============

_default_router: Optional[ProviderRouter] = None


def get_provider_router(config: Optional[RouterConfig] = None) -> ProviderRouter:
    """
    获取 Provider 路由器实例（单例）
    
    Args:
        config: 路由配置
        
    Returns:
        ProviderRouter: 路由器实例
    """
    global _default_router
    if _default_router is None:
        _default_router = ProviderRouter(config)
    return _default_router


def reset_provider_router() -> None:
    """重置路由器实例（用于测试）"""
    global _default_router
    _default_router = None
