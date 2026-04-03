"""
短链接转换服务
支持将短链接转换为标准链接，并获取视频详细信息
"""

import asyncio
import aiohttp
from typing import Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
import hashlib


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


@dataclass
class ExpandResult:
    """短链接展开结果"""
    original_url: str
    expanded_url: str
    platform: str
    success: bool
    error: Optional[str] = None


class URLExpander:
    """短链接转换服务"""
    
    # 缓存配置
    CACHE_TTL = timedelta(hours=24)
    
    def __init__(self):
        self._cache: Dict[str, tuple[str, datetime]] = {}
        self._video_cache: Dict[str, tuple[VideoInfo, datetime]] = {}
    
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
        
        # 发送 HEAD 请求获取重定向 URL
        async with aiohttp.ClientSession() as session:
            try:
                async with session.head(
                    short_url,
                    allow_redirects=True,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    expanded_url = str(response.url)
                    
                    # 缓存结果
                    self._cache[cache_key] = (expanded_url, datetime.now())
                    
                    return expanded_url
            except asyncio.TimeoutError:
                raise Exception(f"短链接展开超时：{short_url}")
            except Exception as e:
                raise Exception(f"短链接展开失败：{str(e)}")
    
    async def expand_with_retry(
        self, 
        short_url: str, 
        max_retries: int = 3,
        retry_delay: float = 1.0
    ) -> str:
        """
        带重试的短链接展开
        
        Args:
            short_url: 短链接
            max_retries: 最大重试次数
            retry_delay: 重试间隔（秒）
            
        Returns:
            展开后的标准链接
        """
        last_error = None
        
        for attempt in range(max_retries):
            try:
                return await self.expand(short_url)
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * (attempt + 1))
        
        raise Exception(f"短链接展开失败（重试{max_retries}次）: {last_error}")
    
    async def get_video_info(self, url: str, platform: str) -> Optional[VideoInfo]:
        """
        获取视频详细信息
        
        Args:
            url: 视频 URL
            platform: 平台标识符
            
        Returns:
            VideoInfo 对象，如果获取失败则返回 None
        """
        # 检查缓存
        cache_key = self._get_cache_key(url)
        if cache_key in self._video_cache:
            video_info, timestamp = self._video_cache[cache_key]
            if self._is_cache_valid(timestamp):
                return video_info
        
        # 根据平台调用不同的获取方法
        video_info = None
        if platform == 'douyin':
            video_info = await self._get_douyin_info(url)
        elif platform == 'xiaohongshu':
            video_info = await self._get_xiaohongshu_info(url)
        elif platform == 'bilibili':
            video_info = await self._get_bilibili_info(url)
        elif platform == 'kuaishou':
            video_info = await self._get_kuaishou_info(url)
        elif platform == 'wechat_channels':
            video_info = await self._get_wechat_channels_info(url)
        
        # 缓存结果
        if video_info:
            self._video_cache[cache_key] = (video_info, datetime.now())
        
        return video_info
    
    async def _get_douyin_info(self, url: str) -> Optional[VideoInfo]:
        """获取抖音视频信息"""
        # TODO: 实现抖音 API 调用
        # 需要处理抖音的反爬机制，可能需要使用无头浏览器
        return VideoInfo(
            url=url,
            platform='douyin',
            video_id='unknown',
        )
    
    async def _get_xiaohongshu_info(self, url: str) -> Optional[VideoInfo]:
        """获取小红书笔记信息"""
        # TODO: 实现小红书 API 调用
        return VideoInfo(
            url=url,
            platform='xiaohongshu',
            video_id='unknown',
        )
    
    async def _get_bilibili_info(self, url: str) -> Optional[VideoInfo]:
        """获取 B 站视频信息"""
        # TODO: 实现 B 站 API 调用
        return VideoInfo(
            url=url,
            platform='bilibili',
            video_id='unknown',
        )
    
    async def _get_kuaishou_info(self, url: str) -> Optional[VideoInfo]:
        """获取快手视频信息"""
        # TODO: 实现快手 API 调用
        return VideoInfo(
            url=url,
            platform='kuaishou',
            video_id='unknown',
        )
    
    async def _get_wechat_channels_info(self, url: str) -> Optional[VideoInfo]:
        """获取视频号信息"""
        # TODO: 实现视频号 API 调用
        return VideoInfo(
            url=url,
            platform='wechat_channels',
            video_id='unknown',
        )
    
    async def batch_expand(self, urls: list[str]) -> Dict[str, str]:
        """
        批量展开短链接
        
        Args:
            urls: 短链接列表
            
        Returns:
            映射字典：{原始 URL: 展开后的 URL}
        """
        tasks = [self.expand_with_retry(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        expanded = {}
        for url, result in zip(urls, results):
            if isinstance(result, Exception):
                expanded[url] = url  # 失败时返回原 URL
            else:
                expanded[url] = result
        
        return expanded
    
    def clear_cache(self):
        """清空缓存"""
        self._cache.clear()
        self._video_cache.clear()
    
    def cleanup_expired_cache(self):
        """清理过期缓存"""
        now = datetime.now()
        
        # 清理 URL 缓存
        expired_keys = [
            key for key, (_, timestamp) in self._cache.items()
            if now - timestamp >= self.CACHE_TTL
        ]
        for key in expired_keys:
            del self._cache[key]
        
        # 清理视频信息缓存
        expired_keys = [
            key for key, (_, timestamp) in self._video_cache.items()
            if now - timestamp >= self.CACHE_TTL
        ]
        for key in expired_keys:
            del self._video_cache[key]


# 单例实例
_expander_instance: Optional[URLExpander] = None


def get_expander() -> URLExpander:
    """获取展开器单例"""
    global _expander_instance
    if _expander_instance is None:
        _expander_instance = URLExpander()
    return _expander_instance


async def expand_short_url(short_url: str) -> str:
    """便捷函数：展开短链接"""
    return await get_expander().expand_with_retry(short_url)


async def get_video_details(url: str, platform: str) -> Optional[VideoInfo]:
    """便捷函数：获取视频详情"""
    return await get_expander().get_video_info(url, platform)
