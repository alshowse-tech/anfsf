"""
捷阅证券信息助手 - FastAPI 应用入口
"""
import os
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

# 添加 src 到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from db.database import engine, Base
from api import users, wallets, payment, tasks, transcription


# 数据库模型
# 注意：需要在 db/models.py 中定义所有模型


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    print("🚀 应用启动中...")
    
    # 创建数据库表
    Base.metadata.create_all(bind=engine)
    print("✅ 数据库表已就绪")
    
    yield
    
    # 关闭时
    print("👋 应用关闭中...")


# 创建 FastAPI 应用
app = FastAPI(
    title="捷阅证券信息助手 API",
    description="音视频转写、内容分析、付费墙管理系统",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://jieyue-securities.com",
        "*"  # 开发环境
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": str(exc),
            "path": request.url.path
        }
    )


# 注册路由
app.include_router(users.router, prefix="/api/v1")
app.include_router(wallets.router, prefix="/api/v1")
app.include_router(payment.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(transcription.router, prefix="/api/v1")


# 健康检查
@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "jieyue-securities-api",
        "version": "1.0.0"
    }


# 根路径
@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "捷阅证券信息助手 API",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
