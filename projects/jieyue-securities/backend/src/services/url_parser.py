"""
URL 解析服务

重构版本：集成 URLParserAgent、平台识别、fallback 机制
符合 ANFSF V1.5.0 架构规范
"""
import httpx
import re
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from dataclasses import dataclass
from enum import Enum


class PlatformType(str, Enum):
    """平台类型枚举"""
    DOUYIN = "douyin"
    KUAISHOU = "kuaishou"
    BILIBILI = "bilibili"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"
    WEIBO = "weibo"
    XIAOHONGSHU = "xiaohongshu"
    UNKNOWN = "unknown"


@dataclass
class ParsedResult:
    """解析结果"""
    success: bool
    title: str = ""
    author: str = ""
    duration: int = 0
    content_type: str = "video"
    download_url: str = ""
    platform: str = "unknown"
    estimated_duration: bool = False
    error: Optional[str] = None
    thumbnail_url: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[int] = None
    provider_id: Optional[str] = None


class PlatformMatcher:
    """
    平台识别器
    
    功能：根据 URL 识别视频平台
    """
    
    # 平台 URL 模式
    PLATFORM_PATTERNS: Dict[PlatformType, List[str]] = {
        PlatformType.DOUYIN: [
            r"(?:https?://)?(?:www\.)?(?:douyin\.com|iesdouyin\.com)",
            r"(?:https?://)?(?:v\.)?douyin\.com",
        ],
        PlatformType.KUAISHOU: [
            r"(?:https?://)?(?:www\.)?(?:kuaishou\.com|ixigua\.com)",
            r"(?:https?://)?(?:m\.)?ixigua\.com",
        ],
        PlatformType.BILIBILI: [
            r"(?:https?://)?(?:www\.)?(?:bilibili\.com|b23\.tv)",
            r"(?:https?://)?(?:av|bv)?\d+",
        ],
        PlatformType.TIKTOK: [
            r"(?:https?://)?(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com)",
        ],
        PlatformType.YOUTUBE: [
            r"(?:https?://)?(?:www\.)?(?:youtube\.com|youtu\.be)",
        ],
        PlatformType.WEIBO: [
            r"(?:https?://)?(?:www\.)?(?:weibo\.com|m\.weibo\.com)",
        ],
        PlatformType.XIAOHONGSHU: [
            r"(?:https?://)?(?:www\.)?(?:xiaohongshu\.com|xhslink\.com)",
        ],
    }
    
    @classmethod
    def identify_platform(cls, url: str) -> Tuple[PlatformType, str]:
        """
        识别平台
        
        Args:
            url: 视频 URL
            
        Returns:
            Tuple[PlatformType, str]: 平台类型和匹配的模式
        """
        for platform, patterns in cls.PLATFORM_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, url, re.IGNORECASE):
                    return platform, pattern
        
        return PlatformType.UNKNOWN, ""
    
    @classmethod
    def extract_video_id(cls, url: str, platform: PlatformType) -> Optional[str]:
        """
        提取视频 ID
        
        Args:
            url: 视频 URL
            platform: 平台类型
            
        Returns:
            Optional[str]: 视频 ID，如果无法提取则返回 None
        """
        if platform == PlatformType.BILIBILI:
            # B 站：BV 号或 av 号
            bv_match = re.search(r"(BV[a-zA-Z0-9]+)", url)
            if bv_match:
                return bv_match.group(1)
            av_match = re.search(r"av(\d+)", url)
            if av_match:
                return f"av{av_match.group(1)}"
        
        elif platform == PlatformType.YOUTUBE:
            # YouTube: 视频 ID
            match = re.search(r"(?:v=|/)([a-zA-Z0-9_-]{11})", url)
            if match:
                return match.group(1)
        
        elif platform == PlatformType.DOUYIN:
            # 抖音：从短链接提取
            match = re.search(r"/video/(\d+)", url)
            if match:
                return match.group(1)
        
        return None


class TikHubParser:
    """
    TikHub URL 解析器
    
    支持多平台视频解析
    """
    
    def __init__(self, api_key: str, timeout: int = 30, expand_timeout: int = 10):
        """
        初始化 TikHub 解析器
        
        Args:
            api_key: API Key
            timeout: 超时时间（秒）
            expand_timeout: 短链接展开超时时间（秒）
        """
        self.api_key = api_key
        self.base_url = "https://api.tikhub.io"
        self.timeout = timeout
        self.expand_timeout = expand_timeout
        self.headers = {"Authorization": f"Bearer {self.api_key}"}
    
    async def parse(self, url: str) -> ParsedResult:
        """
        解析视频 URL（支持短链接）
        
        Args:
            url: 视频 URL
            
        Returns:
            ParsedResult: 解析结果
        """
        start_time = datetime.now()
        
        # 第一步：展开短链接
        expanded_url = url
        if re.search(r"(?:douyin\.com|v\.douyin\.com)/", url, re.IGNORECASE):
            import aiohttp
            try:
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.expand_timeout)) as session:
                    async with session.head(url, allow_redirects=True) as response:
                        expanded_url = str(response.url)
                        print(f"[TikHubParser] 展开短链接: {url} -> {expanded_url}")
            except Exception as e:
                print(f"[TikHubParser] 短链接展开失败: {e}")
        
        # 第二步：调用 TikHub API
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(
                    f"{self.base_url}/api/video",
                    params={"url": expanded_url},
                    headers=self.headers
                )
                response.raise_for_status()
                data = response.json()
                
                # 识别平台
                platform, _ = PlatformMatcher.identify_platform(url)
                
                return ParsedResult(
                    success=True,
                    title=data.get("title", ""),
                    author=data.get("author", ""),
                    duration=data.get("duration", 0),
                    content_type="video",
                    download_url=data.get("video_url", ""),
                    platform=platform.value,
                    thumbnail_url=data.get("cover", ""),
                    description=data.get("description", ""),
                    created_at=int(start_time.timestamp()),
                    provider_id="tikhub"
                )
                
            except httpx.HTTPStatusError as e:
                return ParsedResult(
                    success=False,
                    error=f"TikHub API 请求失败：{e.response.status_code}",
                    platform=PlatformMatcher.identify_platform(url)[0].value
                )
            except httpx.RequestError as e:
                return ParsedResult(
                    success=False,
                    error=f"TikHub API 连接失败：{str(e)}",
                    platform=PlatformMatcher.identify_platform(url)[0].value
                )
            except Exception as e:
                return ParsedResult(
                    success=False,
                    error=f"解析失败：{str(e)}",
                    platform=PlatformMatcher.identify_platform(url)[0].value
                )


class FallbackParser:
    """
    备用解析器
    
    功能：当主要解析器失败时提供基础解析能力
    """
    
    async def parse(self, url: str) -> ParsedResult:
        """
        备用解析逻辑
        
        Args:
            url: 视频 URL
            
        Returns:
            ParsedResult: 解析结果
        """
        start_time = datetime.now()
        
        # 识别平台
        platform, _ = PlatformMatcher.identify_platform(url)
        
        # 尝试提取视频 ID
        video_id = PlatformMatcher.extract_video_id(url, platform)
        
        return ParsedResult(
            success=True,
            title=f"视频内容 ({platform.value})",
            author="未知作者",
            duration=60,  # 默认 60 秒
            content_type="video",
            download_url="",
            platform=platform.value,
            estimated_duration=True,
            created_at=int(start_time.timestamp()),
            provider_id="fallback"
        )


class URLParserAgent:
    """
    URL 解析代理
    
    功能：
    - 自动平台识别
    - 多解析器路由
    - 智能 fallback
    - 健康检查
    """
    
    def __init__(self, tikhub_api_key: str, timeout: int = 30):
        """
        初始化 URL 解析代理
        
        Args:
            tikhub_api_key: TikHub API Key
            timeout: 超时时间（秒）
        """
        self.tikhub = TikHubParser(tikhub_api_key, timeout)
        self.fallback = FallbackParser()
        
        # 失败计数（用于自动切换 fallback）
        self.fail_count = 0
        self.fail_threshold = 3
        self.success_count = 0
        
        # 平台特定配置
        self.platform_parsers: Dict[PlatformType, Any] = {}
    
    async def parse(self, url: str, force_platform: Optional[PlatformType] = None) -> ParsedResult:
        """
        解析 URL（自动 fallback）
        
        Args:
            url: 视频 URL
            force_platform: 强制指定平台（可选）
            
        Returns:
            ParsedResult: 解析结果
        """
        # 识别平台
        if force_platform:
            platform = force_platform
        else:
            platform, _ = PlatformMatcher.identify_platform(url)
        
        # 检查是否需要切换 fallback
        if self.fail_count >= self.fail_threshold:
            print(f"[URLParserAgent] ⚠️ Switching to fallback (fail_count={self.fail_count})")
            return await self.fallback.parse(url)
        
        # 尝试 TikHub
        result = await self.tikhub.parse(url)
        
        if result.success:
            self.fail_count = 0  # 重置失败计数
            self.success_count += 1
            return result
        else:
            self.fail_count += 1
            print(f"[URLParserAgent] ❌ TikHub failed ({self.fail_count}/{self.fail_threshold})")
            
            # 重试 2 次
            if self.fail_count < 3:
                result = await self.tikhub.parse(url)
                if result.success:
                    self.fail_count = 0
                    self.success_count += 1
                    return result
            
            # 切换到 fallback
            print(f"[URLParserAgent] 🔄 Falling back to fallback parser")
            return await self.fallback.parse(url)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        获取统计信息
        
        Returns:
            Dict: 统计信息
        """
        total = self.fail_count + self.success_count
        success_rate = self.success_count / total if total > 0 else 0.0
        
        return {
            "total_requests": total,
            "success_count": self.success_count,
            "fail_count": self.fail_count,
            "success_rate": success_rate,
            "fail_threshold": self.fail_threshold,
            "using_fallback": self.fail_count >= self.fail_threshold
        }
    
    def reset_stats(self) -> None:
        """重置统计信息"""
        self.fail_count = 0
        self.success_count = 0


class URLParserService:
    """
    URL 解析服务（带 fallback）
    
    重构版本：集成 URLParserAgent
    """
    
    def __init__(self, tikhub_api_key: str, timeout: int = 30):
        """
        初始化 URL 解析服务
        
        Args:
            tikhub_api_key: TikHub API Key
            timeout: 超时时间（秒）
        """
        self.agent = URLParserAgent(tikhub_api_key, timeout)
        self.fallback = FallbackParser()
    
    async def parse(self, url: str) -> Dict[str, Any]:
        """
        解析 URL
        
        Args:
            url: 视频 URL
            
        Returns:
            Dict: 解析结果
        """
        result = await self.agent.parse(url)
        
        return {
            "success": result.success,
            "title": result.title,
            "author": result.author,
            "duration": result.duration,
            "content_type": result.content_type,
            "download_url": result.download_url,
            "platform": result.platform,
            "estimated_duration": result.estimated_duration,
            "thumbnail_url": result.thumbnail_url,
            "description": result.description,
            "error": result.error,
            "provider_id": result.provider_id
        }
    
    async def parse_with_platform(
        self,
        url: str,
        platform: PlatformType
    ) -> Dict[str, Any]:
        """
        解析 URL（指定平台）
        
        Args:
            url: 视频 URL
            platform: 平台类型
            
        Returns:
            Dict: 解析结果
        """
        result = await self.agent.parse(url, force_platform=platform)
        
        return {
            "success": result.success,
            "title": result.title,
            "author": result.author,
            "duration": result.duration,
            "content_type": result.content_type,
            "download_url": result.download_url,
            "platform": result.platform,
            "estimated_duration": result.estimated_duration,
            "error": result.error
        }
    
    def identify_platform(self, url: str) -> str:
        """
        识别平台
        
        Args:
            url: 视频 URL
            
        Returns:
            str: 平台名称
        """
        platform, _ = PlatformMatcher.identify_platform(url)
        return platform.value
    
    def get_stats(self) -> Dict[str, Any]:
        """
        获取服务统计
        
        Returns:
            Dict: 统计信息
        """
        return self.agent.get_stats()
    
    def reset_stats(self) -> None:
        """重置统计"""
        self.agent.reset_stats()


# ============== 便捷函数 ==============

def identify_platform(url: str) -> str:
    """
    识别视频平台（便捷函数）
    
    Args:
        url: 视频 URL
        
    Returns:
        str: 平台名称
    """
    return PlatformMatcher.identify_platform(url)[0].value


def extract_video_id(url: str, platform: Optional[str] = None) -> Optional[str]:
    """
    提取视频 ID（便捷函数）
    
    Args:
        url: 视频 URL
        platform: 平台名称（可选，自动识别如果未提供）
        
    Returns:
        Optional[str]: 视频 ID
    """
    if platform:
        try:
            platform_enum = PlatformType(platform)
        except ValueError:
            platform_enum = PlatformType.UNKNOWN
    else:
        platform_enum, _ = PlatformMatcher.identify_platform(url)
    
    return PlatformMatcher.extract_video_id(url, platform_enum)


# ============== 单例实例 ==============

_parser_instance: Optional[URLParserService] = None


def get_url_parser(tikhub_api_key: str) -> URLParserService:
    """
    获取 URL 解析服务实例（单例）
    
    Args:
        tikhub_api_key: TikHub API Key
        
    Returns:
        URLParserService: 解析服务实例
    """
    global _parser_instance
    if _parser_instance is None:
        _parser_instance = URLParserService(tikhub_api_key)
    return _parser_instance


def reset_url_parser() -> None:
    """重置解析服务实例（用于测试）"""
    global _parser_instance
    _parser_instance = None
