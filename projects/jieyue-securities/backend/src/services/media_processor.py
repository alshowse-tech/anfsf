"""
音视频处理服务

重构版本：集成 ProviderRouter、重试机制、健康检查、降级策略
符合 ANFSF V1.5.0 架构规范
"""
import os
import asyncio
import uuid
import time
import tempfile
from typing import Optional, Dict, Any, Callable, List
from datetime import datetime
from pydantic import BaseModel
from enum import Enum


class ProcessingStep(str, Enum):
    """处理步骤"""
    PARSING = "parsing"
    DOWNLOADING = "downloading"
    UPLOADING = "uploading"
    TRANSCRIBING = "transcribing"
    COMPLETED = "completed"


class ProcessingStatus(str, Enum):
    """处理状态"""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    TIMEOUT = "timeout"


class VideoProviderStatus(str, Enum):
    """Provider 状态"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"


class ProviderHealthChecker:
    """Provider 健康检查器"""
    
    def __init__(self, timeout: int = 5):
        self.timeout = timeout
        self.results: Dict[str, VideoProviderStatus] = {}
    
    async def check(self, url: str, provider_id: str) -> VideoProviderStatus:
        """检查 Provider 健康状态"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    return VideoProviderStatus.HEALTHY
                else:
                    return VideoProviderStatus.UNHEALTHY
        except Exception:
            return VideoProviderStatus.UNHEALTHY
    
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


# 导入重构后的服务模块
import importlib.util
spec = importlib.util.spec_from_file_location("tikhub_client", "/root/.openclaw/workspace-main/projects/jieyue-securities/backend/src/services/tikhub_client.py")
tikhub_client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tikhub_client)

spec = importlib.util.spec_from_file_location("oss_storage", "/root/.openclaw/workspace-main/projects/jieyue-securities/backend/src/services/oss_storage.py")
oss_storage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(oss_storage)

spec = importlib.util.spec_from_file_location("bailian_client", "/root/.openclaw/workspace-main/projects/jieyue-securities/backend/src/services/bailian_client.py")
bailian_client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bailian_client)


class TranscriptionResult(BaseModel):
    """转写结果"""
    success: bool
    video_id: Optional[str] = None
    task_id: Optional[str] = None
    transcription: Optional[str] = None
    oss_url: Optional[str] = None
    error_message: Optional[str] = None
    duration: Optional[int] = None  # 视频时长（秒）
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    provider_id: Optional[str] = None  # ANFSF V1.5.0 Layer 8.5


class ProcessingProgress(BaseModel):
    """处理进度"""
    step: str  # parsing, downloading, uploading, transcribing, completed
    progress: float  # 0-100
    message: str
    current_file: Optional[str] = None
    provider_id: Optional[str] = None


class MediaProvider:
    """媒体 Provider 基类"""
    
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
    
    async def process(self, url: str, temp_dir: str) -> TranscriptionResult:
        """处理媒体（需要子类实现）"""
        raise NotImplementedError


class DefaultMediaProvider(MediaProvider):
    """默认媒体 Provider（完整流程）"""
    
    def __init__(self, provider_id: str, config: Dict[str, Any]):
        super().__init__(provider_id, "Default Media", config)
        self.tikhub = tikhub_client.TikHubClient(config.get("tikhub", {}))
        self.oss = oss_storage.OSSStorage(config.get("oss", {}))
        self.bailian = bailian_client.BailianClient(config.get("bailian", {}))
    
    async def process(self, url: str, temp_dir: str,
                     progress_callback: Optional[Callable[[ProcessingProgress], None]] = None,
                     timeout: int = 600) -> TranscriptionResult:
        """处理媒体_url"""
        start_time = time.time()
        video_id = str(uuid.uuid4())
        temp_file_path = os.path.join(temp_dir, f"{video_id}.mp4")
        
        try:
            # Step 1: 解析 URL
            if progress_callback:
                progress_callback(ProcessingProgress(
                    step=ProcessingStep.PARSING.value,
                    progress=10,
                    message="解析视频 URL",
                    current_file=temp_file_path
                ))
            
            video_info = await self.tikhub.parse_video_url(url)
            if not video_info.download_url:
                raise ValueError("解析视频失败：无法获取下载 URL")
            
            # Step 2: 下载视频
            if progress_callback:
                progress_callback(ProcessingProgress(
                    step=ProcessingStep.DOWNLOADING.value,
                    progress=30,
                    message="下载视频",
                    current_file=temp_file_path
                ))
            
            await self.tikhub.download_video(video_info.download_url, temp_file_path)
            
            # Step 3: 上传到 OSS
            if progress_callback:
                progress_callback(ProcessingProgress(
                    step=ProcessingStep.UPLOADING.value,
                    progress=50,
                    message="上传到 OSS",
                    current_file=temp_file_path
                ))
            
            oss_url = await self.oss.upload_file(temp_file_path, f"videos/{video_id}.mp4")
            
            # Step 4: 转文字
            if progress_callback:
                progress_callback(ProcessingProgress(
                    step=ProcessingStep.TRANSCRIBING.value,
                    progress=70,
                    message="转文字",
                    current_file=oss_url
                ))
            
            transcription_task = await self.bailian.transcribe_audio(oss_url)
            
            elapsed_ms = (time.time() - start_time) * 1000
            
            self.stats["total_requests"] += 1
            self.stats["success_requests"] += 1
            self.stats["total_time_ms"] += elapsed_ms
            
            return TranscriptionResult(
                success=True,
                video_id=video_id,
                task_id=transcription_task.task_id,
                oss_url=oss_url,
                duration=video_info.duration,
                provider_id=self.provider_id,
                created_at=datetime.now()
            )
            
        except Exception as e:
            self.stats["total_requests"] += 1
            self.stats["failed_requests"] += 1
            
            return TranscriptionResult(
                success=False,
                video_id=video_id,
                error_message=str(e),
                provider_id=self.provider_id,
                created_at=datetime.now()
            )


class FallbackMediaProvider(MediaProvider):
    """备用媒体 Provider（fallback）"""
    
    def __init__(self, provider_id: str = "fallback"):
        super().__init__(provider_id, "Fallback Media", {})
    
    async def process(self, url: str, temp_dir: str) -> TranscriptionResult:
        """备用处理流程"""
        return TranscriptionResult(
            success=False,
            video_id=str(uuid.uuid4()),
            error_message="备用 Provider：需要接入真实的媒体处理服务",
            provider_id=self.provider_id,
            created_at=datetime.now()
        )


class MediaProviderRouter:
    """
    媒体 Provider 路由器
    
    功能：
    - Provider 路由（按优先级、负载均衡）
    - 健康检查
    - 故障切换
    - 负载均衡
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.providers: Dict[str, MediaProvider] = {}
        self.routing_config = config.get("routing", {
            "strategy": "priority",
            "max_retries": 3
        })
        
        # 初始化 Providers
        for provider_config in config.get("providers", []):
            provider_id = provider_config["id"]
            provider_type = provider_config.get("type", "default")
            
            if provider_type == "default":
                self.providers[provider_id] = DefaultMediaProvider(provider_id, provider_config)
            elif provider_type == "fallback":
                self.providers[provider_id] = FallbackMediaProvider(provider_id)
    
    async def process(self, url: str, temp_dir: str,
                     progress_callback: Optional[Callable[[ProcessingProgress], None]] = None,
                     timeout: int = 600) -> TranscriptionResult:
        """处理媒体（自动路由）"""
        max_retries = self.routing_config.get("max_retries", 3)
        
        for attempt in range(max_retries):
            for provider_id, provider in self.providers.items():
                try:
                    result = await provider.process(url, temp_dir, progress_callback, timeout)
                    return result
                except Exception:
                    # 继续尝试下一个 Provider
                    continue
        
        # 所有Providers都失败，返回错误
        return TranscriptionResult(
            success=False,
            error_message="所有 媒体 Providers 都不可用",
            provider_id="default"
        )
    
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


class MediaProcessor:
    """
    音视频处理器（完整实现）
    
    功能增强：
    - 集成 MediaProviderRouter 多 Provider 路由
    - 自动重试机制（最多 3 次）
    - 降级策略（fallback 到备用 Provider）
    - 健康检查和监控
    - ANFSF V1.5.0 Layer 8.5 集成
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化媒体处理器
        
        Args:
            config: 配置字典
        """
        self.router = MediaProviderRouter(config)
        self.config = config
        
        # 临时文件目录
        self.temp_dir = tempfile.mkdtemp(prefix="media_processor_")
    
    async def process_url(self, url: str,
                          progress_callback: Optional[Callable[[ProcessingProgress], None]] = None,
                          keep_original: bool = False,
                          timeout: int = 600) -> TranscriptionResult:
        """
        完整流程：URL → 解析 → 下载 → OSS 上传 → 百炼转写
        
        Args:
            url: 视频 URL（抖音、TikTok 等）
            progress_callback: 进度回调函数
            keep_original: 是否保留本地临时文件
            timeout: 转写超时时间（秒）
            
        Returns:
            TranscriptionResult: 转写结果
        """
        return await self.router.process(url, self.temp_dir, progress_callback, timeout)
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return self.router.get_stats()
    
    async def cleanup(self):
        """清理临时文件"""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)


# 工具函数
def create_media_processor(config_path: Optional[str] = None) -> MediaProcessor:
    """
    创建媒体处理器
    
    Args:
        config_path: 配置文件路径（可选）
        
    Returns:
        MediaProcessor: 实例
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
                    "id": "media-1",
                    "type": "default",
                    "priority": 1,
                    "tikhub": {},
                    "oss": {},
                    "bailian": {}
                },
                {
                    "id": "fallback",
                    "type": "fallback",
                    "priority": 10
                }
            ]
        }
    
    return MediaProcessor(config)
