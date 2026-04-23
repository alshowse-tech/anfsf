"""
股票操盘模拟系统 - FastAPI 主应用
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
import uvicorn

from config import settings
from database import get_db, init_db
from models import User, Token
from auth import create_access_token, verify_token, get_current_user
from api import trading_router, screener_router, health_router, ai_analysis_router, stocks_router
from websocket_manager import ConnectionManager
from monitoring import MonitoringMiddleware, get_metrics, get_metrics_content_type
from logging_config import setup_logging, intercept_standard_logging, log_request

# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="股票操盘模拟系统 API - 基于 V7.5 交易规则",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 添加监控中间件
app.add_middleware(MonitoringMiddleware)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 性能监控中间件
@app.middleware("http")
async def performance_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    # 记录请求日志
    log_request(request, duration)
    
    return response

# WebSocket 管理器
ws_manager = ConnectionManager()

# 安全认证
security = HTTPBearer()

# 注册路由
app.include_router(health_router, prefix="/api", tags=["健康检查"])
app.include_router(trading_router, prefix="/api/trading", tags=["操盘区"])
app.include_router(screener_router, prefix="/api/screener", tags=["智能选股"])
app.include_router(ai_analysis_router, prefix="/api/ai", tags=["AI 分析"])
app.include_router(stocks_router, prefix="/api/stocks", tags=["股票信息"])


@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    # 初始化日志系统
    setup_logging(settings.LOG_LEVEL, settings.LOG_FILE)
    intercept_standard_logging()
    
    # 初始化数据库
    await init_db()
    
    # 初始化调度器
    from scheduler import init_scheduler
    await init_scheduler()
    
    logger.info(f"✅ {settings.APP_NAME} V{settings.APP_VERSION} 启动成功")
    logger.info(f"📡 API 文档：http://{settings.HOST}:{settings.PORT}/docs")
    logger.info(f"📊 Prometheus 指标：http://{settings.HOST}:{settings.PORT}/metrics")
    logger.info(f"🤖 AI 分析：DeepSeek 已集成")
    logger.info(f"⏰ 定时任务：午间 (11:30) / 日终 (15:00)")
    logger.info(f"📝 日志文件：{settings.LOG_FILE}")


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


# Prometheus 指标
@app.get("/metrics")
async def get_prometheus_metrics():
    """Prometheus 监控指标"""
    return Response(
        content=get_metrics(),
        media_type=get_metrics_content_type()
    )

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
