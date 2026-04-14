"""
阿里云百炼模型客户端
真实实现，支持音视频转文字（ASR）功能和摘要生成
"""
import os
import asyncio
import json
import time
from typing import Optional, Dict, Any
import httpx

class BailianClient:
    """
    阿里云百炼模型客户端
    
    功能：
    - 音视频转文字（ASR）
    - 文本摘要生成
    """
    
    def __init__(self):
        """初始化客户端"""
        self.api_key = os.getenv("DASHSCOPE_API_KEY", "")
        if not self.api_key:
            raise ValueError("DASHSCOPE_API_KEY environment variable is required")
        
        self.base_url = "https://dashscope.aliyuncs.com/api/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        self.timeout = 30
    
    async def _submit_transcription_task(
        self,
        file_url: str,
        is_video: bool = False,
        language: str = "zh-CN"
    ) -> Dict[str, Any]:
        """
        提交转写任务
        
        Args:
            file_url: 文件 URL
            is_video: 是否为视频
            language: 语言代码
            
        Returns:
            Dict: 任务提交结果
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                # 准备请求数据
                model = "paraformer-realtime-v2" if not is_video else "paraformer-v2"
                payload = {
                    "model": model,
                    "input": {
                        "file_url": file_url
                    },
                    "parameters": {
                        "language": language
                    }
                }
                
                response = await client.post(
                    f"{self.base_url}/services/audio/transcription",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "success": True,
                    "task_id": data.get("task_id") or data.get("output", {}).get("task_id", ""),
                    "status": data.get("status", "PENDING")
                }
                
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }
    
    async def _get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        查询任务状态
        
        Args:
            task_id: 任务 ID
            
        Returns:
            Dict: 任务状态
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(
                    f"{self.base_url}/tasks/{task_id}",
                    headers=self.headers
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "success": True,
                    "status": data.get("status", "UNKNOWN"),
                    "text": data.get("output", {}).get("text", ""),
                    "error": data.get("error", {}).get("message", "")
                }
                
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }
    
    async def transcribe_and_wait(
        self,
        file_url: str,
        is_video: bool = False,
        language: str = "zh-CN",
        timeout: int = 300,
        extract_points: bool = False
    ) -> Dict[str, Any]:
        """
        提交转写并等待完成（一站式方法）
        
        Args:
            file_url: 文件 URL（音频或视频）
            is_video: 是否为视频
            language: 语言代码
            timeout: 超时时间（秒）
            extract_points: 是否需要观点提炼
            
        Returns:
            Dict: 转写结果
        """
        # 提交转写任务
        submit_result = await self._submit_transcription_task(file_url, is_video, language)
        if not submit_result["success"]:
            return {
                "success": False,
                "error": f"Failed to submit transcription task: {submit_result['error']}"
            }
        
        task_id = submit_result["task_id"]
        if not task_id:
            return {
                "success": False,
                "error": "No task ID returned from transcription service"
            }
        
        # 等待任务完成
        start_time = time.time()
        while time.time() - start_time < timeout:
            status_result = await self._get_task_status(task_id)
            if not status_result["success"]:
                return {
                    "success": False,
                    "error": f"Failed to get task status: {status_result['error']}"
                }
            
            if status_result["status"] == "SUCCEEDED":
                return {
                    "success": True,
                    "text": status_result["text"],
                    "task_id": task_id,
                    "provider_id": "bailian-asr"
                }
            elif status_result["status"] == "FAILED":
                return {
                    "success": False,
                    "error": f"Transcription task failed: {status_result['error']}"
                }
            
            # 等待 2 秒后重试
            await asyncio.sleep(2)
        
        return {
            "success": False,
            "error": f"Transcription task timeout after {timeout} seconds"
        }
    
    async def _extract_points(self, text: str, model: str = "qwen3-plus") -> Dict[str, Any]:
        """
        观点提炼 (使用 Qwen 大模型)
        
        Args:
            text: 转写文字
            model: 使用的大模型
            
        Returns:
            Dict: 提炼后的观点
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                prompt = "请从以下转写文字中提取核心观点，总结要点，输出结构化 bullet points。如果内容包含多个任务/议题，请分别提炼。"
                
                payload = {
                    "model": model,
                    "input": {
                        "messages": [
                            {
                                "role": "user",
                                "content": f"{prompt}\n\n转写文字:\n{text}"
                            }
                        ]
                    },
                    "parameters": {
                        "temperature": 0.3,
                        "max_tokens": 1024
                    }
                }
                
                response = await client.post(
                    f"{self.base_url}/services/aigc/text-generation/generation",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                
                output = data.get("output", {})
                content = output.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                return {
                    "success": True,
                    "bullet_points": content,
                    "model": model
                }
                
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e),
                    "model": model
                }


# 单例实例
_client_instance: Optional[BailianClient] = None


def get_bailian_client() -> BailianClient:
    """
    获取百炼客户端实例（单例）
    
    Returns:
        BailianClient: 客户端实例
    """
    global _client_instance
    if _client_instance is None:
        _client_instance = BailianClient()
    return _client_instance


def reset_bailian_client() -> None:
    """重置客户端实例（用于测试）"""
    global _client_instance
    _client_instance = None