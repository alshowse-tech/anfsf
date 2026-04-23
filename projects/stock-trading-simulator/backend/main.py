"""
股票操盘模拟系统 - FastAPI 主应用
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional
import uvicorn

from config import settings
from database import get_db, init_db
from models import User, Token
from auth import create_access_token, verify_token, get_current_user
from api import trading_router, screener_router, health_router, ai_analysis_router
from websocket_manager import ConnectionManager

# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="股票操盘模拟系统 API - 基于 V7.5 交易规则",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket 管理器
ws_manager = ConnectionManager()

# 安全认证
security = HTTPBearer()

# 注册路由
app.include_router(health_router, prefix="/api", tags=["健康检查"])
app.include_router(trading_router, prefix="/api/trading", tags=["操盘区"])
app.include_router(screener_router, prefix="/api/screener", tags=["智能选股"])
app.include_router(ai_analysis_router, prefix="/api/ai", tags=["AI 分析"], name="ai_analysis_router")


@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    # 初始化数据库
    await init_db()
    print(f"✅ {settings.APP_NAME} V{settings.APP_VERSION} 启动成功")
    print(f"📡 API 文档：http://{settings.HOST}:{settings.PORT}/docs")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件"""
    print(f"👋 {settings.APP_NAME} 已关闭")


@app.get("/")
async def root():
    """根路径"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": settings.APP_VERSION
    }


# WebSocket 连接
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 实时推送"""
    # 接受连接
    await ws_manager.connect(websocket)
    
    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理订阅请求
            if message.get("type") == "subscribe":
                symbols = message.get("symbols", [])
                for symbol in symbols:
                    ws_manager.subscribe(websocket, symbol)
                await websocket.send_json({
                    "type": "subscribed",
                    "symbols": symbols
                })
            
            # 处理取消订阅
            elif message.get("type") == "unsubscribe":
                symbol = message.get("symbol")
                ws_manager.unsubscribe(websocket, symbol)
    
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket 错误：{e}")
        ws_manager.disconnect(websocket)


# 测试用 WebSocket 广播
@app.post("/api/test/broadcast")
async def test_broadcast(message: dict):
    """测试 WebSocket 广播 (仅开发环境)"""
    if settings.DEBUG:
        await ws_manager.broadcast(message)
        return {"status": "broadcasted"}
    raise HTTPException(status_code=403, detail="仅开发环境可用")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
