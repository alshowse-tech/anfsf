"""
MCP Bus - 消息通信总线

Harness 间通信协议
"""

__version__ = "2.0.0"
__anfsf_version__ = "1.5.0"

from .message import MCPMessage
from .bus import MCPBus

__all__ = [
    "MCPMessage",
    "MCPBus"
]
