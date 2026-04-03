# URL 解析服务
import httpx
from typing import Dict, Any, Optional
from datetime import datetime

class TikHubParser:
    """TikHub URL 解析器"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.tikhub.io"
        self.timeout = 30
    
    async def parse(self, url: str) -> Dict[str, Any]:
        """解析视频 URL"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(
                    f"{self.base_url}/api/video",
                    params={"url": url},
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "success": True,
                    "title": data.get("title", ""),
                    "author": data.get("author", ""),
                    "duration": data.get("duration", 0),
                    "content_type": "video",
                    "download_url": data.get("video_url", "")
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }


class FallbackParser:
    """备用解析器"""
    
    async def parse(self, url: str) -> Dict[str, Any]:
        """备用解析逻辑"""
        # 简单解析：从 URL 提取平台信息
        platform = "unknown"
        if "douyin" in url:
            platform = "douyin"
        elif "kuaishou" in url:
            platform = "kuaishou"
        elif "bilibili" in url:
            platform = "bilibili"
        
        return {
            "success": True,
            "title": f"视频内容 ({platform})",
            "author": "未知作者",
            "duration": 60,  # 默认 60 秒
            "content_type": "video",
            "download_url": "",
            "platform": platform,
            "estimated_duration": True
        }


class URLParserService:
    """URL 解析服务（带 fallback）"""
    
    def __init__(self, tikhub_api_key: str):
        self.tikhub = TikHubParser(tikhub_api_key)
        self.fallback = FallbackParser()
        self.fail_count = 0
        self.fail_threshold = 3
    
    async def parse(self, url: str) -> Dict[str, Any]:
        """解析 URL（自动 fallback）"""
        # 检查是否需要切换 fallback
        if self.fail_count >= self.fail_threshold:
            return await self.fallback.parse(url)
        
        # 尝试 TikHub
        result = await self.tikhub.parse(url)
        
        if result["success"]:
            self.fail_count = 0  # 重置失败计数
            return result
        else:
            self.fail_count += 1
            # 重试 2 次
            if self.fail_count < 3:
                result = await self.tikhub.parse(url)
                if result["success"]:
                    self.fail_count = 0
                    return result
            
            # 切换到 fallback
            return await self.fallback.parse(url)
