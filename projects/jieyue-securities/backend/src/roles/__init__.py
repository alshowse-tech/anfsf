"""
Roles - 角色合成器集成

ANFSF V1.5.0 角色定义，包含：
- URL Parser Agent: URL 解析
- Media Processor Agent: 媒体处理
- Transcription Agent: 语音转写
- Quality Checker Agent: 质量检查
- Gen UI Agent: UI 生成
"""

from roles.url_parser_agent import (
    URLParserAgent,
    URLParseRequest,
    URLParseResult,
    PlatformInfo,
    create_url_parser_agent,
    URLParserAgentKPI,
)


# 预留其他 Agent 的导入
# from roles.media_processor_agent import MediaProcessorAgent
# from roles.transcription_agent import TranscriptionAgent
# from roles.quality_checker_agent import QualityCheckerAgent
# from roles.gen_ui_agent import GenUIAgent


__all__ = [
    # URL Parser Agent
    "URLParserAgent",
    "URLParseRequest",
    "URLParseResult",
    "PlatformInfo",
    "create_url_parser_agent",
    "URLParserAgentKPI",
    
    # 其他 Agent (预留)
    # "MediaProcessorAgent",
    # "TranscriptionAgent",
    # "QualityCheckerAgent",
    # "GenUIAgent",
]

__version__ = "1.5.0"
