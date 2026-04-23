"""
MCP Bus - 消息传递总线
"""

from .src.bus import MCPBus
from .src.message import MCPMessage

__all__ = ["MCPBus", "MCPMessage"]