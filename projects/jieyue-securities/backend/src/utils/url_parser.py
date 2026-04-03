"""
URL 解析工具 - 支持多平台分享链接解析

支持平台：
- 抖音 (Douyin)
- 小红书 (Xiaohongshu)
- B 站 (Bilibili)
- 快手 (Kuaishou)
- 视频号 (WeChat Channels)
"""

import re
from typing import Optional, Dict, Any
from dataclasses import dataclass


@dataclass
class ParsedURL:
    """解析后的 URL 信息"""
    original_url: str
    platform: str
    video_id: Optional[str] = None
    is_short_link: bool = False
    normalized_url: Optional[str] = None


class ShareURLParser:
    """分享链接解析器"""
    
    # 平台 URL 模式
    PLATFORM_PATTERNS = {
        'douyin': [
            # 标准链接
            (r'https?://(?:www\.)?douyin\.com/video/(\w+)', False),
            # 短链接
            (r'https?://v\.douyin\.com/(\w+)/?', True),
        ],
        'xiaohongshu': [
            # 标准链接
            (r'https?://(?:www\.)?xiaohongshu\.com/explore/(\w+)', False),
            # 短链接
            (r'https?://xhslink\.com/o/(\w+)', True),
        ],
        'bilibili': [
            # 标准链接
            (r'https?://(?:www\.)?bilibili\.com/video/(BV\w+)', False),
            # 短链接
            (r'https?://b23\.tv/(\w+)', True),
        ],
        'kuaishou': [
            # 标准链接
            (r'https?://(?:www\.)?kuaishou\.com/short-video/(\w+)', False),
            # 短链接
            (r'https?://v\.kuaishou\.com/(\w+)', True),
        ],
        'wechat_channels': [
            # 视频号链接
            (r'https?://channels\.weixin\.qq\.com/web/pages\?feedId=(\w+)', False),
        ],
    }
    
    # 平台名称映射（用于显示）
    PLATFORM_NAMES = {
        'douyin': '抖音',
        'xiaohongshu': '小红书',
        'bilibili': 'B 站',
        'kuaishou': '快手',
        'wechat_channels': '视频号',
    }
    
    # 平台图标映射
    PLATFORM_ICONS = {
        'douyin': '🎵',
        'xiaohongshu': '📕',
        'bilibili': '📺',
        'kuaishou': '📹',
        'wechat_channels': '💬',
    }
    
    def extract_url(self, text: str) -> Optional[str]:
        """
        从分享文案中提取 URL
        
        Args:
            text: 包含 URL 的文本
            
        Returns:
            提取到的第一个 HTTP 链接，如果没有则返回 None
        """
        if not text:
            return None
            
        # 使用正则提取第一个 HTTP 链接
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        match = re.search(url_pattern, text)
        return match.group(0) if match else None
    
    def identify_platform(self, url: str) -> Optional[str]:
        """
        识别链接所属平台
        
        Args:
            url: 待识别的 URL
            
        Returns:
            平台标识符，如果无法识别则返回 None
        """
        if not url:
            return None
            
        for platform, patterns in self.PLATFORM_PATTERNS.items():
            for pattern, _ in patterns:
                if re.search(pattern, url, re.IGNORECASE):
                    return platform
        return None
    
    def extract_video_id(self, url: str, platform: str) -> Optional[str]:
        """
        从 URL 中提取视频 ID
        
        Args:
            url: 视频 URL
            platform: 平台标识符
            
        Returns:
            视频 ID，如果无法提取则返回 None
        """
        if not url or not platform:
            return None
            
        patterns = self.PLATFORM_PATTERNS.get(platform, [])
        for pattern, _ in patterns:
            match = re.search(pattern, url, re.IGNORECASE)
            if match and len(match.groups()) > 0:
                return match.group(1)
        return None
    
    def is_short_link(self, url: str, platform: str) -> bool:
        """
        判断是否为短链接
        
        Args:
            url: 待判断的 URL
            platform: 平台标识符
            
        Returns:
            是否为短链接
        """
        if not url or not platform:
            return False
            
        patterns = self.PLATFORM_PATTERNS.get(platform, [])
        for pattern, is_short in patterns:
            if re.search(pattern, url, re.IGNORECASE):
                return is_short
        return False
    
    def parse(self, text: str) -> Optional[ParsedURL]:
        """
        完整解析分享文案
        
        Args:
            text: 分享文案或 URL
            
        Returns:
            ParsedURL 对象，如果解析失败则返回 None
        """
        # 提取 URL
        url = self.extract_url(text)
        if not url:
            return None
        
        # 识别平台
        platform = self.identify_platform(url)
        if not platform:
            # 无法识别平台，返回基础信息
            return ParsedURL(
                original_url=url,
                platform='unknown',
            )
        
        # 提取视频 ID
        video_id = self.extract_video_id(url, platform)
        
        # 判断是否为短链接
        is_short = self.is_short_link(url, platform)
        
        return ParsedURL(
            original_url=url,
            platform=platform,
            video_id=video_id,
            is_short_link=is_short,
        )
    
    def get_platform_name(self, platform: str) -> str:
        """获取平台中文名称"""
        return self.PLATFORM_NAMES.get(platform, platform)
    
    def get_platform_icon(self, platform: str) -> str:
        """获取平台图标"""
        return self.PLATFORM_ICONS.get(platform, '🔗')
    
    def normalize_url(self, url: str, platform: str) -> str:
        """
        将短链接转换为标准链接格式（需要 URLExpander 服务配合）
        
        此方法仅做格式转换，不处理重定向
        实际的标准链接获取需要调用 url_expander 服务
        
        Args:
            url: 原始 URL
            platform: 平台标识符
            
        Returns:
            标准化格式的 URL（如果无法转换则返回原 URL）
        """
        if not url or not platform:
            return url
        
        video_id = self.extract_video_id(url, platform)
        if not video_id:
            return url
        
        # 根据平台生成标准链接格式
        standard_urls = {
            'douyin': f'https://www.douyin.com/video/{video_id}',
            'xiaohongshu': f'https://www.xiaohongshu.com/explore/{video_id}',
            'bilibili': f'https://www.bilibili.com/video/{video_id}',
            'kuaishou': f'https://www.kuaishou.com/short-video/{video_id}',
        }
        
        return standard_urls.get(platform, url)


# 单例实例
_parser_instance: Optional[ShareURLParser] = None


def get_parser() -> ShareURLParser:
    """获取解析器单例"""
    global _parser_instance
    if _parser_instance is None:
        _parser_instance = ShareURLParser()
    return _parser_instance


def parse_share_url(text: str) -> Optional[ParsedURL]:
    """便捷函数：解析分享 URL"""
    return get_parser().parse(text)


def extract_url_from_text(text: str) -> Optional[str]:
    """便捷函数：从文本中提取 URL"""
    return get_parser().extract_url(text)


def identify_platform(url: str) -> Optional[str]:
    """便捷函数：识别 URL 平台"""
    return get_parser().identify_platform(url)
