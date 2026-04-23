"""
MCP Bus - 消息总线

实现 Harness 间消息传递
"""
from typing import Dict, List, Callable, Optional, Any
from asyncio import Queue
import asyncio
from loguru import logger

from .message import MCPMessage


class MCPBus:
    """MCP 消息总线"""
    
    def __init__(self):
        # 消息队列
        self.queues: Dict[str, Queue] = {}
        # 订阅者
        self.subscribers: Dict[str, List[Callable]] = {}
        # 已处理的请求 (用于响应匹配)
        self.pending_requests: Dict[str, asyncio.Future] = {}
    
    def register_harness(self, harness_name: str):
        """注册 Harness"""
        if harness_name not in self.queues:
            self.queues[harness_name] = Queue()
            logger.info(f"✅ Harness 注册到 MCP 总线：{harness_name}")
    
    def subscribe(
        self,
        harness_name: str,
        handler: Callable[[MCPMessage], Any]
    ):
        """订阅消息"""
        if harness_name not in self.subscribers:
            self.subscribers[harness_name] = []
        self.subscribers[harness_name].append(handler)
        logger.debug(f"📬 Harness 订阅消息：{harness_name}")
    
    async def publish(self, message: MCPMessage):
        """
        发布消息
        
        Args:
            message: MCP 消息
        """
        target = message.target
        
        if message.is_broadcast():
            # 广播到所有 Harness
            for harness_name in self.queues:
                await self.queues[harness_name].put(message)
                await self._notify_subscribers(harness_name, message)
            logger.debug(f"📢 广播消息：{message.payload}")
        else:
            # 单播
            if target in self.queues:
                await self.queues[target].put(message)
                await self._notify_subscribers(target, message)
                logger.debug(f"📤 发送消息到 {target}: {message.payload}")
            else:
                logger.warning(f"⚠️ 目标 Harness 未注册：{target}")
    
    async def receive(self, harness_name: str, timeout: float = None) -> Optional[MCPMessage]:
        """
        接收消息
        
        Args:
            harness_name: Harness 名称
            timeout: 超时时间
        
        Returns:
            MCP 消息
        """
        if harness_name not in self.queues:
            logger.error(f"❌ Harness 未注册：{harness_name}")
            return None
        
        try:
            if timeout:
                message = await asyncio.wait_for(
                    self.queues[harness_name].get(),
                    timeout=timeout
                )
            else:
                message = await self.queues[harness_name].get()
            
            logger.debug(f"📥 {harness_name} 接收消息：{message.payload}")
            return message
            
        except asyncio.TimeoutError:
            return None
    
    async def send_request(
        self,
        source: str,
        target: str,
        payload: Dict,
        timeout: float = 30.0
    ) -> Optional[MCPMessage]:
        """
        发送请求并等待响应
        
        Args:
            source: 发送方
            target: 接收方
            payload: 请求负载
            timeout: 超时时间
        
        Returns:
            响应消息
        """
        request = MCPMessage.request(source, target, payload)
        
        # 创建 Future 等待响应
        future = asyncio.Future()
        self.pending_requests[request.message_id] = future
        
        # 发送请求
        await self.publish(request)
        
        try:
            # 等待响应
            response = await asyncio.wait_for(future, timeout=timeout)
            return response
        except asyncio.TimeoutError:
            logger.error(f"❌ 请求超时：{request.message_id}")
            return None
        finally:
            self.pending_requests.pop(request.message_id, None)
    
    async def send_response(self, response: MCPMessage):
        """发送响应"""
        if not response.correlation_id:
            logger.error("❌ 响应消息缺少 correlation_id")
            return
        
        # 唤醒等待的 Future
        future = self.pending_requests.get(response.correlation_id)
        if future:
            future.set_result(response)
        else:
            logger.warning(f"⚠️ 未找到等待的请求：{response.correlation_id}")
        
        # 发送响应消息
        await self.publish(response)
    
    async def _notify_subscribers(self, harness_name: str, message: MCPMessage):
        """通知订阅者"""
        if harness_name in self.subscribers:
            for handler in self.subscribers[harness_name]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(message)
                    else:
                        handler(message)
                except Exception as e:
                    logger.error(f"❌ 订阅者处理失败：{e}")
    
    def get_registered_harnesses(self) -> List[str]:
        """获取已注册的 Harness 列表"""
        return list(self.queues.keys())
