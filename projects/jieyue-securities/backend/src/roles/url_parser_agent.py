"""
URL Parser Agent - URL 解析 Agent

负责解析各种平台的 URL，提取媒体信息
支持：抖音、B 站、小红书、快手、视频号等
"""
import re
import hashlib
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime

from src.services.url_parser import parse_url as original_parse_url
from src.services.url_expander import expand_url as original_expand_url
from src.governance.mcp_bus import MCPMessage, MCPBus


# ==================== 消息模型 ====================

class URLParseRequest(BaseModel):
    """URL 解析请求"""
    url: str
    request_id: str
    from_agent: str


class URLParseResult(BaseModel):
    """URL 解析结果"""
    request_id: str
    success: bool
    url: str
    platform: Optional[str] = None
    media_url: Optional[str] = None
    content_type: Optional[str] = None  # video, audio, image, text
    duration: Optional[int] = None  # seconds
    title: Optional[str] = None
    author: Optional[str] = None
    metadata: Dict[str, Any] = {}
    error: Optional[str] = None


# ==================== 平台定义 ====================

class PlatformInfo(BaseModel):
    """平台信息"""
    name: str
    patterns: List[str]
    content_types: List[str]


SUPPORTED_PLATFORMS = {
    "douyin": PlatformInfo(
        name="抖音",
        patterns=[
            r"(https?://)?(www\.)?(douyin\.com|iesdouyin\.com)/.*",
            r"(https?://)?(www\.)?(v\.douyin\.com)/.*",
        ],
        content_types=["video", "image"]
    ),
    "bilibili": PlatformInfo(
        name="B 站",
        patterns=[
            r"(https?://)?(www\.)?(bilibili\.com)/video/.*",
            r"(https?://)?(www\.)?(b23\.tv)/.*",
        ],
        content_types=["video"]
    ),
    "xiaohongshu": PlatformInfo(
        name="小红书",
        patterns=[
            r"(https?://)?(www\.)?(xiaohongshu\.com)/.*",
            r"(https?://)?(www\.)?(xhslink\.com)/.*",
        ],
        content_types=["video", "image", "text"]
    ),
    "kuaishou": PlatformInfo(
        name="快手",
        patterns=[
            r"(https?://)?(www\.)?(kuaishou\.com)/.*",
            r"(https?://)?(www\.)?(v\.kuaishou\.com)/.*",
        ],
        content_types=["video"]
    ),
    "wechat": PlatformInfo(
        name="视频号",
        patterns=[
            r"(https?://)?(mp\.weixin\.qq\.com)/.*",
            r"(https?://)?(channels\.vip\.qq\.com)/.*",
        ],
        content_types=["video", "text"]
    ),
}


# ==================== URL Parser Agent ====================

class URLParserAgent:
    """
    URL 解析 Agent
    
    职责:
    - 解析各种平台的 URL
    - 提取媒体信息
    - 生成 URL 哈希用于去重
    - 通过 MCP 总线与其他 Agent 通信
    """
    
    def __init__(self, agent_id: str = "url-parser-agent", mcp_bus: MCPBus = None):
        """
        初始化 URL 解析 Agent
        
        Args:
            agent_id: Agent ID
            mcp_bus: MCP 总线实例
        """
        self.agent_id = agent_id
        self.mcp_bus = mcp_bus
        self.supported_platforms = SUPPORTED_PLATFORMS
    
    async def parse(self, url: str, request_id: str = None) -> URLParseResult:
        """
        解析 URL
        
        Args:
            url: 待解析的 URL
            request_id: 请求 ID
        
        Returns:
            URLParseResult: 解析结果
        """
        if not request_id:
            request_id = self._generate_request_id(url)
        
        try:
            # 1. 扩展短链接
            expanded_url = await self._expand_url(url)
            
            # 2. 识别平台
            platform = self._identify_platform(expanded_url)
            if not platform:
                return URLParseResult(
                    request_id=request_id,
                    success=False,
                    url=url,
                    error="Unsupported platform"
                )
            
            # 3. 解析 URL
            parse_result = await self._parse_platform_url(expanded_url, platform)
            
            # 4. 生成结果
            result = URLParseResult(
                request_id=request_id,
                success=True,
                url=url,
                platform=platform,
                media_url=parse_result.get("media_url"),
                content_type=parse_result.get("content_type"),
                duration=parse_result.get("duration"),
                title=parse_result.get("title"),
                author=parse_result.get("author"),
                metadata={
                    "expanded_url": expanded_url,
                    "url_hash": self._generate_url_hash(expanded_url),
                    **parse_result.get("metadata", {})
                }
            )
            
            # 5. 发送结果 (如果有 MCP 总线)
            if self.mcp_bus and request_id:
                await self._send_result(result)
            
            return result
            
        except Exception as e:
            return URLParseResult(
                request_id=request_id,
                success=False,
                url=url,
                error=str(e)
            )
    
    async def _expand_url(self, url: str) -> str:
        """扩展短链接"""
        try:
            # 使用现有的 URL 扩展服务
            expanded = await original_expand_url(url)
            return expanded or url
        except Exception:
            return url
    
    def _identify_platform(self, url: str) -> Optional[str]:
        """识别平台"""
        for platform_id, platform_info in self.supported_platforms.items():
            for pattern in platform_info.patterns:
                if re.match(pattern, url, re.IGNORECASE):
                    return platform_id
        return None
    
    async def _parse_platform_url(self, url: str, platform: str) -> Dict[str, Any]:
        """解析平台 URL"""
        try:
            # 使用现有的 URL 解析服务
            result = await original_parse_url(url)
            
            if result and result.get("success"):
                return {
                    "media_url": result.get("url"),
                    "content_type": result.get("type", "video"),
                    "title": result.get("title"),
                    "author": result.get("author"),
                    "metadata": result
                }
            
            # 如果解析失败，返回基本信息
            return {
                "media_url": url,
                "content_type": "video",  # 默认
                "metadata": {"raw": True}
            }
            
        except Exception as e:
            return {
                "media_url": url,
                "content_type": "video",
                "error": str(e)
            }
    
    def _generate_url_hash(self, url: str) -> str:
        """生成 URL 哈希用于去重"""
        return hashlib.sha256(url.encode()).hexdigest()[:64]
    
    def _generate_request_id(self, url: str) -> str:
        """生成请求 ID"""
        import uuid
        return f"url_{uuid.uuid4().hex[:16]}"
    
    async def _send_result(self, result: URLParseResult):
        """发送结果到 MCP 总线"""
        if not self.mcp_bus:
            return
        
        message = MCPMessage(
            from_agent=self.agent_id,
            to_agent="*",  # 广播
            type="feedback",
            payload=result.model_dump(),
            correlation_id=result.request_id
        )
        
        await self.mcp_bus.publish(message)
    
    def get_supported_platforms(self) -> List[str]:
        """获取支持的平台列表"""
        return list(self.supported_platforms.keys())
    
    def get_platform_info(self, platform: str) -> Optional[PlatformInfo]:
        """获取平台信息"""
        return self.supported_platforms.get(platform)


# ==================== 工具函数 ====================

def create_url_parser_agent(agent_id: str = "url-parser-agent", 
                           mcp_bus: MCPBus = None) -> URLParserAgent:
    """
    创建 URL 解析 Agent
    
    Args:
        agent_id: Agent ID
        mcp_bus: MCP 总线实例
    
    Returns:
        URLParserAgent: 实例
    """
    return URLParserAgent(agent_id, mcp_bus)


# ==================== KPI 定义 ====================

class URLParserAgentKPI:
    """URL 解析 Agent KPI"""
    
    # 解析成功率目标
    TARGET_PARSE_SUCCESS_RATE = 0.99
    
    # 平均响应时间目标 (ms)
    TARGET_AVG_RESPONSE_TIME = 500
    
    # 支持平台数量
    TARGET_SUPPORTED_PLATFORMS = 5
    
    @classmethod
    def calculate_success_rate(cls, total: int, success: int) -> float:
        """计算成功率"""
        if total == 0:
            return 0.0
        return success / total
    
    @classmethod
    def check_performance(cls, success_rate: float, 
                         avg_response_time: float) -> Dict[str, Any]:
        """检查性能"""
        return {
            "success_rate_ok": success_rate >= cls.TARGET_PARSE_SUCCESS_RATE,
            "response_time_ok": avg_response_time <= cls.TARGET_AVG_RESPONSE_TIME,
            "overall_ok": (success_rate >= cls.TARGET_PARSE_SUCCESS_RATE and 
                          avg_response_time <= cls.TARGET_AVG_RESPONSE_TIME)
        }
