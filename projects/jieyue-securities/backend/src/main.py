# FastAPI 应用主入口 - ANFSF V1.5.0 集成版
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api import tasks, wallets, users
from src.db.session import engine
from src.db.models import Base

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

# ============== 创建 FastAPI 应用 ==============

app = FastAPI(
    title="捷阅证券信息助手 API",
    description="证券内容智能分析与合规审核平台 - ANFSF V1.5.0",
    version="2.0.0"
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
    }
