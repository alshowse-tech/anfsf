"""
WebSocket 连接管理器
"""
from fastapi import WebSocket
from typing import Dict, List, Set
import json
from loguru import logger


class ConnectionManager:
    """WebSocket 连接管理器"""
    
    def __init__(self):
        # 活跃连接
        self.active_connections: Set[WebSocket] = set()
        # 订阅关系：symbol -> [WebSocket]
        self.subscriptions: Dict[str, Set[WebSocket]] = {}
        # WebSocket -> 订阅的 symbols
        self.client_subscriptions: Dict[WebSocket, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket):
        """接受 WebSocket 连接"""
        await websocket.accept()
        self.active_connections.add(websocket)
        self.client_subscriptions[websocket] = set()
        logger.info(f"WebSocket 连接成功，当前连接数：{len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """断开 WebSocket 连接"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
            # 清理订阅关系
            if websocket in self.client_subscriptions:
                for symbol in self.client_subscriptions[websocket]:
                    if symbol in self.subscriptions:
                        self.subscriptions[symbol].discard(websocket)
                del self.client_subscriptions[websocket]
            
            logger.info(f"WebSocket 连接断开，当前连接数：{len(self.active_connections)}")
    
    def subscribe(self, websocket: WebSocket, symbol: str):
        """订阅股票"""
        if symbol not in self.subscriptions:
            self.subscriptions[symbol] = set()
        self.subscriptions[symbol].add(websocket)
        self.client_subscriptions[websocket].add(symbol)
        logger.info(f"订阅 {symbol}，当前订阅数：{len(self.subscriptions[symbol])}")
    
    def unsubscribe(self, websocket: WebSocket, symbol: str):
        """取消订阅股票"""
        if symbol in self.subscriptions:
            self.subscriptions[symbol].discard(websocket)
        if websocket in self.client_subscriptions:
            self.client_subscriptions[websocket].discard(symbol)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """发送个人消息"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"发送消息失败：{e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: dict):
        """广播消息给所有连接"""
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"广播消息失败：{e}")
                disconnected.add(connection)
        
        # 清理断开的连接
        for connection in disconnected:
            self.disconnect(connection)
    
    async def broadcast_to_symbol(self, symbol: str, message: dict):
        """广播消息给订阅特定股票的所有连接"""
        if symbol not in self.subscriptions:
            return
        
        disconnected = set()
        for websocket in self.subscriptions[symbol]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"发送消息到 {symbol} 失败：{e}")
                disconnected.add(websocket)
        
        # 清理断开的连接
        for connection in disconnected:
            self.disconnect(connection)
    
    async def send_price_update(self, symbol: str, price: float, change_pct: float):
        """发送价格更新"""
        message = {
            "type": "price_update",
            "data": {
                "symbol": symbol,
                "price": price,
                "change_pct": change_pct,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        await self.broadcast_to_symbol(symbol, message)
    
    async def send_trading_signal(self, signal: dict):
        """发送交易信号"""
        message = {
            "type": "trading_signal",
            "data": signal
        }
        await self.broadcast(message)
    
    async def send_alert(self, alert: dict):
        """发送告警"""
        message = {
            "type": "alert",
            "data": alert
        }
        await self.broadcast(message)


# 全局实例
ws_manager = ConnectionManager()
