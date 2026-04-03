# Service Layer Tests

import pytest
from unittest.mock import Mock, patch, AsyncMock
from decimal import Decimal
from src.db.models import Task, TaskStatus, ContentType
from src.services.url_parser import URLParserService
from src.services.asr import ASRService
from src.services.summarizer import SummaryService
from src.services.risk_detector import RiskTagService, RiskLevel


class TestURLParserService:
    """URL 解析服务测试"""
    
    @pytest.mark.asyncio
    async def test_parse_douyin_url(self):
        """测试解析抖音 URL"""
        with patch('src.services.url_parser.TikHubParser') as mock_parser:
            mock_parser.return_value.parse = AsyncMock(return_value={
                "success": True,
                "title": "Test Video",
                "duration": 300,
                "author": "Test Author"
            })
            
            service = URLParserService(api_key="test_key")
            result = await service.parse("https://www.douyin.com/video/123")
            
            assert result["success"] is True
            assert result["title"] == "Test Video"
            assert result["duration"] == 300
    
    @pytest.mark.asyncio
    async def test_parse_fallback(self):
        """测试 fallback 解析"""
        with patch('src.services.url_parser.TikHubParser') as mock_primary:
            mock_primary.return_value.parse = AsyncMock(side_effect=Exception("API Error"))
            
            with patch('src.services.url_parser.FallbackParser') as mock_fallback:
                mock_fallback.return_value.parse = AsyncMock(return_value={
                    "success": True,
                    "title": "Fallback Title",
                    "duration": 180
                })
                
                service = URLParserService(api_key="test_key")
                result = await service.parse("https://www.douyin.com/video/123")
                
                assert result["success"] is True
                assert result["title"] == "Fallback Title"
    
    @pytest.mark.asyncio
    async def test_parse_invalid_url(self):
        """测试无效 URL"""
        service = URLParserService(api_key="test_key")
        result = await service.parse("not-a-valid-url")
        
        assert result["success"] is False
        assert "error" in result


class TestASRService:
    """ASR 语音识别服务测试"""
    
    @pytest.mark.asyncio
    async def test_transcribe_success(self):
        """测试转录成功"""
        with patch('src.services.asr.VolcanoASR') as mock_asr:
            mock_asr.return_value.transcribe = AsyncMock(return_value={
                "success": True,
                "transcript": "这是测试文本",
                "confidence": 0.95
            })
            
            service = ASRService(access_key="test", secret_key="test")
            result = await service.transcribe("https://example.com/audio.mp3")
            
            assert result["success"] is True
            assert result["transcript"] == "这是测试文本"
    
    @pytest.mark.asyncio
    async def test_transcribe_with_retry(self):
        """测试重试机制"""
        with patch('src.services.asr.VolcanoASR') as mock_asr:
            # First two calls fail, third succeeds
            mock_asr.return_value.transcribe = AsyncMock(
                side_effect=[
                    Exception("Network Error"),
                    Exception("Timeout"),
                    {"success": True, "transcript": "Success after retry", "confidence": 0.9}
                ]
            )
            
            service = ASRService(access_key="test", secret_key="test")
            result = await service.transcribe("https://example.com/audio.mp3")
            
            assert result["success"] is True
            assert mock_asr.return_value.transcribe.call_count == 3


class TestSummaryService:
    """摘要服务测试"""
    
    @pytest.mark.asyncio
    async def test_summarize_success(self):
        """测试摘要生成成功"""
        with patch('src.services.summarizer.LLMSummarizer') as mock_llm:
            mock_llm.return_value.summarize = AsyncMock(return_value={
                "success": True,
                "key_points": ["要点 1", "要点 2"],
                "abstract": "这是摘要",
                "risk_tags": ["投资建议"]
            })
            
            service = SummaryService(api_key="test_key")
            result = await service.summarize("这是测试文本" * 100)
            
            assert result["success"] is True
            assert len(result["key_points"]) > 0
    
    @pytest.mark.asyncio
    async def test_summarize_fallback(self):
        """测试模板摘要 fallback"""
        with patch('src.services.summarizer.LLMSummarizer') as mock_llm:
            mock_llm.return_value.summarize = AsyncMock(side_effect=Exception("API Error"))
            
            service = SummaryService(api_key="test_key")
            result = await service.summarize("这是测试文本")
            
            assert result["success"] is True  # Fallback should succeed
            assert "abstract" in result


class TestRiskDetector:
    """风险检测服务测试"""
    
    def test_analyze_critical_risk(self):
        """测试违法内容识别"""
        service = RiskTagService()
        result = service.analyze("这是诈骗内容，保证收益 100%，快来投资")
        
        assert result["success"] is True
        assert result["highest_level"] == "critical"
        assert result["should_block"] is True
    
    def test_analyze_high_risk(self):
        """测试高风险识别"""
        service = RiskTagService()
        result = service.analyze("稳赚不赔，收钱入群，内幕消息")
        
        assert result["success"] is True
        assert result["highest_level"] == "high"
        assert result["should_block"] is True
    
    def test_analyze_medium_risk(self):
        """测试中等风险识别"""
        service = RiskTagService()
        result = service.analyze("我认为这只股票可能上涨，推荐关注")
        
        assert result["success"] is True
        assert result["highest_level"] == "medium"
        assert result["should_block"] is False
    
    def test_analyze_low_risk(self):
        """测试低风险识别"""
        service = RiskTagService()
        result = service.analyze("今天天气不错，分享日常生活")
        
        assert result["success"] is True
        assert result["highest_level"] == "low"
        assert result["should_block"] is False
    
    def test_analyze_empty_text(self):
        """测试空文本"""
        service = RiskTagService()
        result = service.analyze("")
        
        assert result["success"] is True
        assert result["highest_level"] == "low"
