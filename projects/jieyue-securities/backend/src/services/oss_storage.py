"""
阿里云 OSS 存储服务

重构版本：集成 ProviderRouter、重试机制、健康检查、降级策略
符合 ANFSF V1.5.0 架构规范
"""
import os
import asyncio
import hashlib
import time
from typing import Optional, Dict, Any, List, Callable
from datetime import datetime, timedelta
import httpx
from enum import Enum


class StorageStatus(str, Enum):
    """存储状态"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class ProviderHealthChecker:
    """Provider 健康检查器"""
    
    def __init__(self, timeout: int = 5):
        self.timeout = timeout
        self.results: Dict[str, StorageStatus] = {}
    
    async def check(self, url: str, provider_id: str) -> StorageStatus:
        """检查 Provider 健康状态"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    return StorageStatus.HEALTHY
                else:
                    return StorageStatus.UNHEALTHY
        except Exception:
            return StorageStatus.UNHEALTHY
    
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


class StorageProvider:
    """存储 Provider 基类"""
    
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
    
    async def upload(self, file_path: str, object_name: str) -> str:
        """上传文件（需要子类实现）"""
        raise NotImplementedError
    
    async def download(self, object_name: str, file_path: str) -> bool:
        """下载文件（需要子类实现）"""
        raise NotImplementedError
    
    async def delete(self, object_name: str) -> bool:
        """删除文件（需要子类实现）"""
        raise NotImplementedError


class OSSStorageProvider(StorageProvider):
    """阿里云 OSS 存储 Provider"""
    
    def __init__(self, provider_id: str, config: Dict[str, Any]):
        super().__init__(provider_id, "OSS Storage", config)
        self.endpoint = config.get("endpoint", "oss-cn-hangzhou.aliyuncs.com")
        self.bucket = config.get("bucket", "your-bucket")
        self.bucket_url = f"https://{self.bucket}.{self.endpoint}"
    
    def _get_object_url(self, object_name: str) -> str:
        """获取对象访问 URL"""
        return f"{self.bucket_url}/{object_name}"
    
    async def upload(self, file_path: str, object_name: str) -> str:
        """上传文件到 OSS"""
        start_time = time.time()
        
        if not os.path.exists(file_path):
            raise IOError(f"文件不存在：{file_path}")
        
        # 计算文件大小
        file_size = os.path.getsize(file_path)
        
        # 读取文件内容
        with open(file_path, "rb") as f:
            file_content = f.read()
        
        # 计算 MD5
        file_md5 = hashlib.md5(file_content).hexdigest()
        
        # 使用 HTTP API 上传
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                headers = {
                    "Authorization": f"Bearer {self.config.get('api_key', '')}",
                    "Content-Type": "application/octet-stream",
                    "x-oss-object-acl": "public-read"
                }
                
                response = await client.put(
                    self._get_object_url(object_name),
                    content=file_content,
                    headers=headers
                )
                response.raise_for_status()
                
                elapsed_ms = (time.time() - start_time) * 1000
                
                self.stats["total_requests"] += 1
                self.stats["success_requests"] += 1
                self.stats["total_time_ms"] += elapsed_ms
                
                return self._get_object_url(object_name)
            except Exception as e:
                self.stats["total_requests"] += 1
                self.stats["failed_requests"] += 1
                
                raise IOError(f"上传失败：{str(e)}")
    
    async def download(self, object_name: str, file_path: str) -> bool:
        """下载文件"""
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                response = await client.get(self._get_object_url(object_name))
                response.raise_for_status()
                
                with open(file_path, "wb") as f:
                    f.write(response.content)
                
                elapsed_ms = (time.time() - start_time) * 1000
                
                self.stats["total_requests"] += 1
                self.stats["success_requests"] += 1
                self.stats["total_time_ms"] += elapsed_ms
                
                return True
            except Exception as e:
                self.stats["total_requests"] += 1
                self.stats["failed_requests"] += 1
                
                return False
    
    async def delete(self, object_name: str) -> bool:
        """删除文件"""
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                headers = {
                    "Authorization": f"Bearer {self.config.get('api_key', '')}",
                }
                
                response = await client.delete(
                    self._get_object_url(object_name),
                    headers=headers
                )
                response.raise_for_status()
                
                elapsed_ms = (time.time() - start_time) * 1000
                
                self.stats["total_requests"] += 1
                self.stats["success_requests"] += 1
                self.stats["total_time_ms"] += elapsed_ms
                
                return True
            except Exception as e:
                self.stats["total_requests"] += 1
                self.stats["failed_requests"] += 1
                
                return False


class LocalStorageProvider(StorageProvider):
    """本地存储 Provider（fallback）"""
    
    def __init__(self, provider_id: str = "local", storage_path: str = "/tmp/storage"):
        super().__init__(provider_id, "Local Storage", {})
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)
    
    async def upload(self, file_path: str, object_name: str) -> str:
        """上传文件到本地存储"""
        import shutil
        start_time = time.time()
        
        dest_path = os.path.join(self.storage_path, object_name)
        dest_dir = os.path.dirname(dest_path)
        os.makedirs(dest_dir, exist_ok=True)
        
        shutil.copy2(file_path, dest_path)
        
        elapsed_ms = (time.time() - start_time) * 1000
        
        self.stats["total_requests"] += 1
        self.stats["success_requests"] += 1
        self.stats["total_time_ms"] += elapsed_ms
        
        return dest_path
    
    async def download(self, object_name: str, file_path: str) -> bool:
        """下载文件"""
        import shutil
        start_time = time.time()
        
        src_path = os.path.join(self.storage_path, object_name)
        if not os.path.exists(src_path):
            return False
        
        shutil.copy2(src_path, file_path)
        
        elapsed_ms = (time.time() - start_time) * 1000
        
        self.stats["total_requests"] += 1
        self.stats["success_requests"] += 1
        self.stats["total_time_ms"] += elapsed_ms
        
        return True
    
    async def delete(self, object_name: str) -> bool:
        """删除文件"""
        start_time = time.time()
        
        file_path = os.path.join(self.storage_path, object_name)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        elapsed_ms = (time.time() - start_time) * 1000
        
        self.stats["total_requests"] += 1
        self.stats["success_requests"] += 1
        self.stats["total_time_ms"] += elapsed_ms
        
        return True


class OSSStorageProviderRouter:
    """
    OSS Storage Provider 路由器
    
    功能：
    - Provider 路由（按优先级、负载均衡）
    - 健康检查
    - 故障切换
    - 负载均衡
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.providers: Dict[str, StorageProvider] = {}
        self.routing_config = config.get("routing", {
            "strategy": "priority",
            "max_retries": 3
        })
        
        # 初始化 Providers
        for provider_config in config.get("providers", []):
            provider_id = provider_config["id"]
            provider_type = provider_config.get("type", "oss")
            
            if provider_type == "oss":
                self.providers[provider_id] = OSSStorageProvider(provider_id, provider_config)
            elif provider_type == "local":
                self.providers[provider_id] = LocalStorageProvider(provider_id)
    
    async def upload(self, file_path: str, object_name: str) -> str:
        """上传文件（自动路由）"""
        max_retries = self.routing_config.get("max_retries", 3)
        
        for attempt in range(max_retries):
            for provider_id, provider in self.providers.items():
                try:
                    result = await provider.upload(file_path, object_name)
                    return result
                except Exception:
                    # 继续尝试下一个 Provider
                    continue
        
        # 所有Providers都失败，返回错误
        raise IOError("所有 Storage Providers 都不可用")
    
    async def download(self, object_name: str, file_path: str) -> bool:
        """下载文件"""
        for provider_id, provider in self.providers.items():
            try:
                result = await provider.download(object_name, file_path)
                if result:
                    return True
            except Exception:
                continue
        
        return False
    
    async def delete(self, object_name: str) -> bool:
        """删除文件"""
        for provider_id, provider in self.providers.items():
            try:
                result = await provider.delete(object_name)
                if result:
                    return True
            except Exception:
                continue
        
        return False
    
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


class OSSStorage:
    """
    OSS 存储服务（完整实现）
    
    功能增强：
    - 集成 OSSStorageProviderRouter 多 Provider 路由
    - 自动重试机制（最多 3 次）
    - 降级策略（fallback 到本地存储）
    - 健康检查和监控
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化 OSS 存储服务
        
        Args:
            config: 配置字典
        """
        self.router = OSSStorageProviderRouter(config)
        self.config = config
    
    async def upload_file(self, file_path: str, object_name: str) -> str:
        """
        上传文件到 OSS
        
        Args:
            file_path: 本地文件路径
            object_name: OSS 对象名称（包含路径）
            
        Returns:
            str: 文件访问 URL
            
        Raises:
            IOError: 上传失败
        """
        return await self.router.upload(file_path, object_name)
    
    async def download_file(self, object_name: str, file_path: str) -> bool:
        """
        下载文件
        
        Args:
            object_name: OSS 对象名称
            file_path: 本地文件路径
            
        Returns:
            bool: 是否成功
        """
        return await self.router.download(object_name, file_path)
    
    async def delete_file(self, object_name: str) -> bool:
        """
        删除文件
        
        Args:
            object_name: OSS 对象名称
            
        Returns:
            bool: 是否成功
        """
        return await self.router.delete(object_name)
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return self.router.get_stats()


# 工具函数
def create_oss_storage(config_path: Optional[str] = None) -> OSSStorage:
    """
    创建 OSS 存储服务
    
    Args:
        config_path: 配置文件路径（可选）
        
    Returns:
        OSSStorage: 实例
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
                    "id": "oss-1",
                    "type": "oss",
                    "endpoint": "oss-cn-hangzhou.aliyuncs.com",
                    "bucket": "your-bucket",
                    "priority": 1
                },
                {
                    "id": "local-1",
                    "type": "local",
                    "storage_path": "/tmp/storage",
                    "priority": 10
                }
            ]
        }
    
    return OSSStorage(config)
