# FastAPI 应用主入口 - ANFSF V1.5.0 集成版
import asyncio
import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 添加 src 到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from api import tasks, wallets, users
from db.session import engine
from db.models import Base

# ============== Layer 8.5 Governance Control Plane 初始化 ==============

from governance import (
    OwnershipLattice,
    ContractPack,
    MCPBus,
    PreviewController,
    ReadinessGate,
)

# ============== Layer 9 Agent OS 初始化 ==============

from roles import URLParserAgent

# ============== 创建数据库表 ==============

try:
    Base.metadata.create_all(bind=engine)
    print("✓ 数据库表已创建/验证")
except Exception as e:
    print(f"⚠ 数据库表创建警告：{e}")

# ============== 初始化 Layer 8.5 模块 ==============

# Ownership Lattice - 权限控制
ownership_lattice = OwnershipLattice()

# Contract Pack - 契约管理
contract_pack = ContractPack()

# MCP Bus - 多 Agent 协作消息总线
mcp_bus = MCPBus()

# Preview Controller - 预览控制器
preview_controller = PreviewController()

# Readiness Gate - 就绪门禁
readiness_gate = ReadinessGate()

# ============== 初始化 Layer 9 Agent ==============

# URL Parser Agent
url_parser_agent = URLParserAgent()

# ============== 任务后台处理器 ==============

from tasks.processor import start_task_processor

# ============== 创建 FastAPI 应用 ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动任务处理后台线程
    task_processor_task = asyncio.create_task(start_task_processor())
    print("✓ 任务处理后台线程已启动")
    
    try:
        yield
    finally:
        # 关闭任务处理线程
        task_processor_task.cancel()
        try:
            await task_processor_task
        except asyncio.CancelledError:
            pass

app = FastAPI(
    title="捷阅证券信息助手 API",
    description="证券内容智能分析与合规审核平台 - ANFSF V1.5.0",
    version="2.0.0",
    lifespan=lifespan
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境需限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== 注册路由 ==============

app.include_router(tasks.router, prefix="/api/task", tags=["任务"])
app.include_router(wallets.router, prefix="/api/wallet", tags=["钱包"])
app.include_router(users.router, prefix="/api/user", tags=["用户"])

# ============== 健康检查 ==============

@app.get("/")
async def root():
    return {
        "name": "捷阅证券信息助手",
        "version": "2.0.0",
        "status": "running",
        "anfsf_version": "1.5.0",
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "task_processor": "running",
    }
