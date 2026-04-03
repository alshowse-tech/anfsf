"""
音视频处理服务
完整流程编排：URL → TikHub 解析 → 下载 → OSS 上传 → 百炼转写
"""
import os
import asyncio
import uuid
import tempfile
from typing import Optional, Dict, Any, Callable
from datetime import datetime
from pydantic import BaseModel

from services.tikhub_client import TikHubClient, VideoInfo
from services.oss_storage import OSSStorage, get_oss_storage
from services.bailian_client import BailianClient, get_bailian_client, TranscriptionTask


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


class ProcessingProgress(BaseModel):
    """处理进度"""
    step: str  # parsing, downloading, uploading, transcribing, completed
    progress: float  # 0-100
    message: str
    current_file: Optional[str] = None


class MediaProcessor:
    """音视频处理器"""
    
    def __init__(self, 
                 tikhub_api_key: Optional[str] = None,
                 oss_storage: Optional[OSSStorage] = None,
                 bailian_client: Optional[BailianClient] = None):
        """
        初始化媒体处理器
        
        Args:
            tikhub_api_key: TikHub API Key
            oss_storage: OSS 存储实例
            bailian_client: 百炼客户端
        """
        self.tikhub = TikHubClient(api_key=tikhub_api_key)
        self.oss = oss_storage or get_oss_storage()
        self.bailian = bailian_client or get_bailian_client()
        
        # 临时文件目录
        self.temp_dir = tempfile.mkdtemp(prefix="media_processor_")
    
    async def process_url(self, url: str,
                          progress_callback: Optional[Callable[[ProcessingProgress], None]] = None,
                          keep_original: bool = False,
                          timeout: int = 600) -> TranscriptionResult:
        """
        完整流程：URL → 解析 → 下载 → 上传 OSS → 转文字
        
        Args:
            url: 视频 URL（抖音、TikTok 等）
            progress_callback: 进度回调函数
            keep_original: 是否保留本地临时文件
            timeout: 转写超时时间（秒）
            
        Returns:
            TranscriptionResult: 转写结果
        """
        video_id = str(uuid.uuid4())
        temp_file_path = os.path.join(self.temp_dir, f"{video_id}.mp4")
        
        try:
            # 1. 解析 URL
            if progress_callback:
                progress_callback(ProcessingProgress(
                    step="parsing",
                    progress=10,
                    message="正在解析视频 URL..."
                ))
            
            video_info = await self._parse_url(url)
            
            # 2. 下载视频
            if progress_callback:
                progress_callback(ProcessingProgress(
                    step="downloading",
                    progress=30,
                    message=f"正在下载视频：{video_info.title}",
                    current_file=temp_file_path
                ))
            
            await self._download_video(video_info.download_url, temp_file_path)
            
            # 3. 上传到 OSS
            if progress_callback:
                progress_callback(ProcessingProgress(
                    step="uploading",
                    progress=60,
                    message="正在上传到 OSS..."
                ))
            
            oss_url = await self._upload_to_oss(temp_file_path, video_id)
            
            # 4. 转文字
            if progress_callback:
                progress_callback(ProcessingProgress(
                    step="transcribing",
                    progress=80,
                    message="正在进行语音识别..."
                ))
            
            transcription = await self._transcribe_video(oss_url, timeout)
            
            # 5. 清理临时文件
            if not keep_original and os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            
            if progress_callback:
                progress_callback(ProcessingProgress(
                    step="completed",
                    progress=100,
                    message="处理完成"
                ))
            
            return TranscriptionResult(
                success=True,
                video_id=video_id,
                task_id=transcription.get("task_id"),
                transcription=transcription.get("text"),
                oss_url=oss_url,
                duration=video_info.duration,
                created_at=datetime.now(),
                completed_at=datetime.now()
            )
            
        except Exception as e:
            # 清理临时文件
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            
            return TranscriptionResult(
                success=False,
                video_id=video_id,
                error_message=str(e),
                created_at=datetime.now()
            )
    
    async def _parse_url(self, url: str) -> VideoInfo:
        """解析视频 URL"""
        return await self.tikhub.parse_video_url(url)
    
    async def _download_video(self, video_url: str, save_path: str) -> str:
        """下载视频"""
        return await self.tikhub.download_video(video_url, save_path)
    
    async def _upload_to_oss(self, file_path: str, video_id: str) -> str:
        """上传到 OSS"""
        return await self.oss.upload_video(file_path, video_id)
    
    async def _transcribe_video(self, video_url: str, timeout: int) -> Dict[str, Any]:
        """转写视频"""
        return await self.bailian.transcribe_and_wait(video_url, is_video=True, timeout=timeout)
    
    async def process_audio_url(self, audio_url: str,
                                progress_callback: Optional[Callable] = None,
                                timeout: int = 600) -> TranscriptionResult:
        """
        处理音频 URL（直接转写，不需要 TikHub）
        
        Args:
            audio_url: 音频文件 URL
            progress_callback: 进度回调
            timeout: 超时时间
            
        Returns:
            TranscriptionResult: 转写结果
        """
        audio_id = str(uuid.uuid4())
        
        try:
            if progress_callback:
                progress_callback(ProcessingProgress(
                    step="uploading",
                    progress=30,
                    message="正在上传音频到 OSS..."
                ))
            
            # 下载并上传音频
            temp_path = os.path.join(self.temp_dir, f"{audio_id}.mp3")
            await self._download_audio(audio_url, temp_path)
            
            oss_url = await self.oss.upload_audio(temp_path, audio_id)
            
            if progress_callback:
                progress_callback(ProcessingProgress(
                    step="transcribing",
                    progress=70,
                    message="正在进行语音识别..."
                ))
            
            transcription = await self.bailian.transcribe_and_wait(oss_url, is_video=False, timeout=timeout)
            
            # 清理
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            return TranscriptionResult(
                success=True,
                video_id=audio_id,
                task_id=transcription.get("task_id"),
                transcription=transcription.get("text"),
                oss_url=oss_url,
                created_at=datetime.now(),
                completed_at=datetime.now()
            )
            
        except Exception as e:
            return TranscriptionResult(
                success=False,
                error_message=str(e),
                created_at=datetime.now()
            )
    
    async def _download_audio(self, audio_url: str, save_path: str) -> str:
        """下载音频文件"""
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream("GET", audio_url) as response:
                response.raise_for_status()
                with open(save_path, "wb") as f:
                    async for chunk in response.aiter_bytes(8192):
                        f.write(chunk)
                return save_path
    
    def cleanup_temp_files(self, max_age: int = 3600):
        """清理旧的临时文件"""
        import time
        now = time.time()
        
        for filename in os.listdir(self.temp_dir):
            filepath = os.path.join(self.temp_dir, filename)
            if os.path.isfile(filepath):
                mtime = os.path.getmtime(filepath)
                if now - mtime > max_age:
                    os.remove(filepath)


# 导入 httpx（在文件顶部）
import httpx
