"""
TikHub API 客户端
支持抖音、TikTok 等平台的视频解析和下载
"""
import os
import httpx
from typing import Optional, Dict, Any
from pydantic import BaseModel
import asyncio


class VideoInfo(BaseModel):
    """视频信息"""
    id: str
    title: str
    author: str
    cover_url: str
    download_url: str
    duration: int = 0
    width: int = 0
    height: int = 0
    format: str = "mp4"


class TikHubClient:
    """TikHub API 客户端"""
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        """
        初始化 TikHub 客户端
        
        Args:
            api_key: API Key，默认从环境变量读取
            base_url: API 基础 URL，中国大陆使用 api.tikhub.dev，全球使用 api.tikhub.io
        """
        self.api_key = api_key or os.getenv("TIKHUB_API_KEY")
        self.base_url = base_url or os.getenv("TIKHUB_BASE_URL", "https://api.tikhub.dev")
        
        if not self.api_key:
            raise ValueError("TikHub API Key 未设置")
        
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    async def parse_video_url(self, url: str) -> VideoInfo:
        """
        解析视频 URL，获取视频信息
        
        Args:
            url: 视频 URL（抖音、TikTok 等）
            
        Returns:
            VideoInfo: 视频信息对象
            
        Raises:
            httpx.HTTPError: API 请求失败
            ValueError: 解析失败或 URL 无效
        """
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                # 调用 TikHub 解析 API
                # 根据文档，使用抖音 Web API 或 App API
                response = await client.post(
                    f"{self.base_url}/api/douyin/web/video",
                    headers=self.headers,
                    json={"url": url}
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get("code") != 0:
                    raise ValueError(f"TikHub API 错误：{data.get('message', 'Unknown error')}")
                
                video_data = data.get("data", {})
                
                return VideoInfo(
                    id=video_data.get("video_id", "") or video_data.get("aweme_id", ""),
                    title=video_data.get("title", "") or video_data.get("desc", ""),
                    author=video_data.get("author", {}).get("nickname", "") if isinstance(video_data.get("author"), dict) else "",
                    cover_url=video_data.get("cover", "") or video_data.get("dynamic_cover", ""),
                    download_url=video_data.get("play_addr", {}).get("url_list", [""])[0] if isinstance(video_data.get("play_addr"), dict) else video_data.get("play_addr", ""),
                    duration=video_data.get("duration", 0) // 1000 if video_data.get("duration") else 0,
                    width=video_data.get("width", 0),
                    height=video_data.get("height", 0),
                    format="mp4"
                )
                
            except httpx.HTTPStatusError as e:
                raise ValueError(f"TikHub API 请求失败：{e.response.status_code} - {e.response.text}")
            except httpx.RequestError as e:
                raise ValueError(f"TikHub API 连接失败：{str(e)}")
    
    async def download_video(self, video_url: str, save_path: str, chunk_size: int = 8192) -> str:
        """
        下载视频文件
        
        Args:
            video_url: 视频下载 URL
            save_path: 保存路径
            chunk_size: 分块大小（字节）
            
        Returns:
            str: 保存的文件路径
            
        Raises:
            httpx.HTTPError: 下载失败
            IOError: 文件写入失败
        """
        async with httpx.AsyncClient(timeout=300) as client:
            try:
                # 使用流式下载，避免大文件内存溢出
                async with client.stream("GET", video_url) as response:
                    response.raise_for_status()
                    
                    # 确保目录存在
                    os.makedirs(os.path.dirname(save_path) if os.path.dirname(save_path) else ".", exist_ok=True)
                    
                    # 分块写入文件
                    with open(save_path, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size):
                            f.write(chunk)
                    
                    return save_path
                    
            except httpx.HTTPStatusError as e:
                raise IOError(f"视频下载失败：{e.response.status_code} - {e.response.text}")
            except httpx.RequestError as e:
                raise IOError(f"视频下载连接失败：{str(e)}")
    
    async def parse_and_download(self, url: str, save_path: str) -> VideoInfo:
        """
        解析并下载视频（一步完成）
        
        Args:
            url: 视频 URL
            save_path: 保存路径
            
        Returns:
            VideoInfo: 视频信息对象
        """
        video_info = await self.parse_video_url(url)
        await self.download_video(video_info.download_url, save_path)
        return video_info


# 测试代码
if __name__ == "__main__":
    import asyncio
    
    async def test():
        client = TikHubClient()
        
        # 测试 URL（示例）
        test_url = "https://www.douyin.com/video/xxxxx"
        
        try:
            video_info = await client.parse_video_url(test_url)
            print(f"视频信息：{video_info}")
        except Exception as e:
            print(f"解析失败：{e}")
    
    # asyncio.run(test())
