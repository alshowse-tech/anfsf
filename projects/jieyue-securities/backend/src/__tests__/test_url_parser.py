"""
URL 解析工具单元测试
"""

import pytest
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.url_parser import (
    ShareURLParser,
    ParsedURL,
    get_parser,
    parse_share_url,
    extract_url_from_text,
    identify_platform,
)


class TestShareURLParser:
    """ShareURLParser 测试类"""
    
    @pytest.fixture
    def parser(self):
        """创建解析器实例"""
        return ShareURLParser()
    
    # ==================== 测试 URL 提取 ====================
    
    def test_extract_url_from_pure_url(self, parser):
        """测试从纯 URL 文本中提取"""
        url = "https://www.douyin.com/video/123456789"
        result = parser.extract_url(url)
        assert result == url
    
    def test_extract_url_from_share_text_douyin(self, parser):
        """测试从抖音分享文案中提取 URL"""
        text = "8.71 复制打开抖音，看看【迷糊君的作品】https://v.douyin.com/qCkhMi8y3qs/ UYm:/ 11/07"
        result = parser.extract_url(text)
        assert result == "https://v.douyin.com/qCkhMi8y3qs/"
    
    def test_extract_url_from_share_text_xiaohongshu(self, parser):
        """测试从小红书分享文案中提取 URL"""
        text = "复制后打开【小红书】查看笔记！http://xhslink.com/o/abc123"
        result = parser.extract_url(text)
        assert result == "http://xhslink.com/o/abc123"
    
    def test_extract_url_from_share_text_bilibili(self, parser):
        """测试从 B 站分享文案中提取 URL"""
        text = "【标题】https://b23.tv/abc123"
        result = parser.extract_url(text)
        assert result == "https://b23.tv/abc123"
    
    def test_extract_url_from_empty_text(self, parser):
        """测试从空文本中提取"""
        result = parser.extract_url("")
        assert result is None
    
    def test_extract_url_from_text_without_url(self, parser):
        """测试从无 URL 文本中提取"""
        text = "这是一段没有链接的普通文本"
        result = parser.extract_url(text)
        assert result is None
    
    def test_extract_url_multiple_urls(self, parser):
        """测试从包含多个 URL 的文本中提取（应返回第一个）"""
        text = "第一个 https://www.douyin.com/video/123 第二个 https://www.bilibili.com/video/456"
        result = parser.extract_url(text)
        assert result == "https://www.douyin.com/video/123"
    
    # ==================== 测试平台识别 ====================
    
    def test_identify_platform_douyin_standard(self, parser):
        """测试识别抖音标准链接"""
        url = "https://www.douyin.com/video/123456789"
        result = parser.identify_platform(url)
        assert result == 'douyin'
    
    def test_identify_platform_douyin_short(self, parser):
        """测试识别抖音短链接"""
        url = "https://v.douyin.com/qCkhMi8y3qs/"
        result = parser.identify_platform(url)
        assert result == 'douyin'
    
    def test_identify_platform_xiaohongshu_standard(self, parser):
        """测试识别小红书标准链接"""
        url = "https://www.xiaohongshu.com/explore/123456"
        result = parser.identify_platform(url)
        assert result == 'xiaohongshu'
    
    def test_identify_platform_xiaohongshu_short(self, parser):
        """测试识别小红书短链接"""
        url = "http://xhslink.com/o/abc123"
        result = parser.identify_platform(url)
        assert result == 'xiaohongshu'
    
    def test_identify_platform_bilibili_standard(self, parser):
        """测试识别 B 站标准链接"""
        url = "https://www.bilibili.com/video/BV1abc2"
        result = parser.identify_platform(url)
        assert result == 'bilibili'
    
    def test_identify_platform_bilibili_short(self, parser):
        """测试识别 B 站短链接"""
        url = "https://b23.tv/abc123"
        result = parser.identify_platform(url)
        assert result == 'bilibili'
    
    def test_identify_platform_kuaishou_standard(self, parser):
        """测试识别快手标准链接"""
        url = "https://www.kuaishou.com/short-video/abc"
        result = parser.identify_platform(url)
        assert result == 'kuaishou'
    
    def test_identify_platform_kuaishou_short(self, parser):
        """测试识别快手短链接"""
        url = "https://v.kuaishou.com/abc123"
        result = parser.identify_platform(url)
        assert result == 'kuaishou'
    
    def test_identify_platform_wechat_channels(self, parser):
        """测试识别视频号链接"""
        url = "https://channels.weixin.qq.com/web/pages?feedId=abc"
        result = parser.identify_platform(url)
        assert result == 'wechat_channels'
    
    def test_identify_platform_unknown(self, parser):
        """测试识别未知平台"""
        url = "https://example.com/video/123"
        result = parser.identify_platform(url)
        assert result is None
    
    def test_identify_platform_empty_url(self, parser):
        """测试空 URL"""
        result = parser.identify_platform("")
        assert result is None
    
    # ==================== 测试完整解析 ====================
    
    def test_parse_douyin_share_text(self, parser):
        """测试完整解析抖音分享文案"""
        text = "8.71 复制打开抖音，看看【迷糊君的作品】https://v.douyin.com/qCkhMi8y3qs/ UYm:/ 11/07"
        result = parser.parse(text)
        
        assert result is not None
        assert result.platform == 'douyin'
        assert result.is_short_link is True
        assert result.video_id == 'qCkhMi8y3qs'
    
    def test_parse_xiaohongshu_share_text(self, parser):
        """测试完整解析小红书分享文案"""
        text = "复制后打开【小红书】查看笔记！http://xhslink.com/o/abc123"
        result = parser.parse(text)
        
        assert result is not None
        assert result.platform == 'xiaohongshu'
        assert result.is_short_link is True
        assert result.video_id == 'abc123'
    
    def test_parse_bilibili_share_text(self, parser):
        """测试完整解析 B 站分享文案"""
        text = "【标题】https://b23.tv/abc123"
        result = parser.parse(text)
        
        assert result is not None
        assert result.platform == 'bilibili'
        assert result.is_short_link is True
        assert result.video_id == 'abc123'
    
    def test_parse_standard_url(self, parser):
        """测试解析标准链接"""
        url = "https://www.douyin.com/video/123456789"
        result = parser.parse(url)
        
        assert result is not None
        assert result.platform == 'douyin'
        assert result.is_short_link is False
        assert result.video_id == '123456789'
    
    def test_parse_no_url(self, parser):
        """测试解析无 URL 文本"""
        text = "这是一段没有链接的文本"
        result = parser.parse(text)
        assert result is None
    
    # ==================== 测试辅助方法 ====================
    
    def test_get_platform_name(self, parser):
        """测试获取平台中文名称"""
        assert parser.get_platform_name('douyin') == '抖音'
        assert parser.get_platform_name('xiaohongshu') == '小红书'
        assert parser.get_platform_name('bilibili') == 'B 站'
        assert parser.get_platform_name('kuaishou') == '快手'
        assert parser.get_platform_name('wechat_channels') == '视频号'
        assert parser.get_platform_name('unknown') == 'unknown'
    
    def test_get_platform_icon(self, parser):
        """测试获取平台图标"""
        assert parser.get_platform_icon('douyin') == '🎵'
        assert parser.get_platform_icon('xiaohongshu') == '📕'
        assert parser.get_platform_icon('bilibili') == '📺'
        assert parser.get_platform_icon('kuaishou') == '📹'
        assert parser.get_platform_icon('wechat_channels') == '💬'
        assert parser.get_platform_icon('unknown') == '🔗'
    
    def test_normalize_url_douyin(self, parser):
        """测试抖音 URL 标准化"""
        short_url = "https://v.douyin.com/qCkhMi8y3qs/"
        normalized = parser.normalize_url(short_url, 'douyin')
        assert normalized == 'https://www.douyin.com/video/qCkhMi8y3qs'
    
    def test_normalize_url_xiaohongshu(self, parser):
        """测试小红书 URL 标准化"""
        short_url = "http://xhslink.com/o/abc123"
        normalized = parser.normalize_url(short_url, 'xiaohongshu')
        assert normalized == 'https://www.xiaohongshu.com/explore/abc123'
    
    def test_normalize_url_bilibili(self, parser):
        """测试 B 站 URL 标准化"""
        short_url = "https://b23.tv/abc123"
        normalized = parser.normalize_url(short_url, 'bilibili')
        assert normalized == 'https://www.bilibili.com/video/abc123'


class TestConvenienceFunctions:
    """便捷函数测试"""
    
    def test_parse_share_url(self):
        """测试 parse_share_url 便捷函数"""
        text = "https://v.douyin.com/qCkhMi8y3qs/"
        result = parse_share_url(text)
        assert result is not None
        assert result.platform == 'douyin'
    
    def test_extract_url_from_text(self):
        """测试 extract_url_from_text 便捷函数"""
        text = "看看这个 https://www.douyin.com/video/123"
        result = extract_url_from_text(text)
        assert result == "https://www.douyin.com/video/123"
    
    def test_identify_platform_function(self):
        """测试 identify_platform 便捷函数"""
        url = "https://www.bilibili.com/video/BV1abc2"
        result = identify_platform(url)
        assert result == 'bilibili'


class TestEdgeCases:
    """边界情况测试"""
    
    @pytest.fixture
    def parser(self):
        return ShareURLParser()
    
    def test_url_with_trailing_slash(self, parser):
        """测试带斜杠的 URL"""
        url = "https://v.douyin.com/qCkhMi8y3qs//"
        result = parser.extract_url(url)
        assert result is not None
    
    def test_url_with_query_params(self, parser):
        """测试带查询参数的 URL"""
        url = "https://channels.weixin.qq.com/web/pages?feedId=abc&from=share"
        result = parser.identify_platform(url)
        assert result == 'wechat_channels'
    
    def test_mixed_case_url(self, parser):
        """测试大小写混合的 URL"""
        url = "HTTPS://WWW.DOUYIN.COM/VIDEO/123"
        result = parser.identify_platform(url)
        assert result == 'douyin'
    
    def test_url_in_brackets(self, parser):
        """测试括号中的 URL"""
        text = "【https://v.douyin.com/qCkhMi8y3qs/】"
        result = parser.extract_url(text)
        assert result is not None
    
    def test_special_characters_in_share_text(self, parser):
        """测试分享文案中的特殊字符"""
        text = "8.71 复制打开抖音，看看【迷糊君的作品】https://v.douyin.com/qCkhMi8y3qs/ UYm:/ 11/07 @#$%^&*"
        result = parser.extract_url(text)
        assert result is not None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
