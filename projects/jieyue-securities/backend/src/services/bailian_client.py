"""
阿里云百炼模型客户端
支持音视频转文字（ASR）功能
"""
import os
import asyncio
import time
import json
from typing import Optional, Dict, Any, List
import httpx

from config.bailian import BailianConfig, get_bailian_config


class TranscriptionTask(BaseModel):
    """转写任务信息"""
    task_id: str
    status: str  # PENDING, RUNNING, SUCCEEDED, FAILED
    audio_url: Optional[str] = None
    video_url: Optional[str] = None
    result_url: Optional[str] = None
    text: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[int] = None
    completed_at: Optional[int] = None


class BailianClient:
    """阿里云百炼模型客户端"""
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        """
        初始化百炼客户端
        
        Args:
            api_key: API Key，默认从环境变量读取
            base_url: API 基础 URL
        """
        self.api_key = api_key or os.getenv("ALIYUN_BAILIAN_API_KEY")
        self.base_url = base_url or os.getenv("ALIYUN_BAILIAN_BASE_URL", 
                                               "https://dashscope.aliyuncs.com/api/v1")
        
        if not self.api_key:
            raise ValueError("百炼 API Key 未设置")
        
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # 转写模型
        self.transcription_model = "paraformer-realtime-v2"  # 实时语音识别
    
    async def transcribe_audio(self, audio_url: str, 
                               language: str = "zh-CN",
                               callback_url: Optional[str] = None) -> TranscriptionTask:
        """
        音频转文字
        
        Args:
            audio_url: 音频文件 URL（必须是可公开访问的 URL 或 OSS URL）
            language: 语言代码，默认 zh-CN
            callback_url: 回调 URL（可选，异步通知）
            
        Returns:
            TranscriptionTask: 转写任务信息
        """
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                # 提交转写任务
                payload = {
                    "model": self.transcription_model,
                    "input": {
                        "file_url": audio_url
                    },
                    "parameters": {
                        "format": "json",
                        "language": language
                    }
                }
                
                if callback_url:
                    payload["callback"] = callback_url
                
                response = await client.post(
                    f"{self.base_url}/services/audio/transcription",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                
                task_id = data.get("task_id", "") or data.get("output", {}).get("task_id", "")
                
                return TranscriptionTask(
                    task_id=task_id,
                    status=data.get("status", "PENDING"),
                    audio_url=audio_url,
                    created_at=int(time.time())
                )
                
            except httpx.HTTPStatusError as e:
                return TranscriptionTask(
                    task_id="",
                    status="FAILED",
                    error_message=f"百炼 API 请求失败：{e.response.status_code} - {e.response.text}"
                )
            except httpx.RequestError as e:
                return TranscriptionTask(
                    task_id="",
                    status="FAILED",
                    error_message=f"百炼 API 连接失败：{str(e)}"
                )
    
    async def transcribe_video(self, video_url: str,
                               language: str = "zh-CN",
                               callback_url: Optional[str] = None) -> TranscriptionTask:
        """
        视频转文字（提取音频后转写）
        
        Args:
            video_url: 视频文件 URL
            language: 语言代码
            callback_url: 回调 URL
            
        Returns:
            TranscriptionTask: 转写任务信息
        """
        # 视频转文字与音频转文字使用相同的 API
        # 百炼会自动提取视频中的音频
        return await self.transcribe_audio(video_url, language, callback_url)
    
    async def get_task_status(self, task_id: str) -> TranscriptionTask:
        """
        查询任务状态
        
        Args:
            task_id: 任务 ID
            
        Returns:
            TranscriptionTask: 任务信息（包含结果）
        """
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                response = await client.get(
                    f"{self.base_url}/tasks/{task_id}",
                    headers=self.headers
                )
                response.raise_for_status()
                data = response.json()
                
                output = data.get("output", {})
                
                return TranscriptionTask(
                    task_id=task_id,
                    status=data.get("status", "UNKNOWN"),
                    text=output.get("text", "") or output.get("transcript", ""),
                    result_url=output.get("result_url"),
                    completed_at=int(time.time()) if data.get("status") == "SUCCEEDED" else None
                )
                
            except httpx.HTTPStatusError as e:
                return TranscriptionTask(
                    task_id=task_id,
                    status="FAILED",
                    error_message=f"查询任务状态失败：{e.response.status_code}"
                )
    
    async def wait_for_completion(self, task_id: str, 
                                  timeout: int = 600,
                                  poll_interval: int = 5) -> TranscriptionTask:
        """
        等待任务完成
        
        Args:
            task_id: 任务 ID
            timeout: 超时时间（秒），默认 10 分钟
            poll_interval: 轮询间隔（秒）
            
        Returns:
            TranscriptionTask: 最终任务结果
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            task = await self.get_task_status(task_id)
            
            if task.status in ["SUCCEEDED", "FAILED"]:
                return task
            
            await asyncio.sleep(poll_interval)
        
        # 超时
        return TranscriptionTask(
            task_id=task_id,
            status="TIMEOUT",
            error_message=f"任务执行超时（{timeout}秒）"
        )
    
    async def transcribe_and_wait(self, file_url: str,
                                  is_video: bool = False,
                                  language: str = "zh-CN",
                                  timeout: int = 600) -> Dict[str, Any]:
        """
        提交转写并等待完成（一站式方法）
        
        Args:
            file_url: 文件 URL（音频或视频）
            is_video: 是否为视频
            language: 语言代码
            timeout: 超时时间（秒）
            
        Returns:
            Dict: 转写结果
        """
        # 提交任务
        if is_video:
            task = await self.transcribe_video(file_url, language)
        else:
            task = await self.transcribe_audio(file_url, language)
        
        if task.status == "FAILED":
            return {
                "success": False,
                "error": task.error_message
            }
        
        # 等待完成
        result = await self.wait_for_completion(task.task_id, timeout)
        
        if result.status == "SUCCEEDED":
            return {
                "success": True,
                "text": result.text,
                "task_id": result.task_id
            }
        else:
            return {
                "success": False,
                "error": result.error_message or f"任务状态：{result.status}"
            }


# 使用 DashScope SDK 的备选实现（如果安装了 SDK）
class BailianClientSDK:
    """使用官方 DashScope SDK 的客户端"""
    
    def __init__(self, api_key: Optional[str] = None):
        try:
            import dashscope
            dashscope.api_key = api_key or os.getenv("ALIYUN_BAILIAN_API_KEY")
            self.sdk_available = True
        except ImportError:
            self.sdk_available = False
    
    async def transcribe_audio(self, audio_url: str) -> Dict[str, Any]:
        """使用 SDK 进行音频转写"""
        if not self.sdk_available:
            raise ImportError("DashScope SDK 未安装，请使用 BailianClient")
        
        from dashscope import AudioTranscription
        
        try:
            # 提交任务
            task = AudioTranscription.submit(
                model="paraformer-realtime-v2",
                input={"file_url": audio_url}
            )
            
            # 等待完成
            result = AudioTranscription.wait(task=task)
            
            if result.status_code == 200:
                return {
                    "success": True,
                    "text": result.output.get("text", "")
                }
            else:
                return {
                    "success": False,
                    "error": result.message
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# 单例实例
_client_instance: Optional[BailianClient] = None


def get_bailian_client() -> BailianClient:
    """获取百炼客户端实例"""
    global _client_instance
    if _client_instance is None:
        _client_instance = BailianClient()
    return _client_instance


# 导入 BaseModel
from pydantic import BaseModel
