# FastAPI 应用主入口
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api import tasks, wallets, users
from src.db.session import engine
from src.db.models import Base

# 创建数据库表（如果不存在）
try:
    Base.metadata.create_all(bind=engine)
    print("✓ 数据库表已创建/验证")
except Exception as e:
    print(f"⚠ 数据库表创建警告：{e}")

app = FastAPI(
    title="捷阅证券信息助手 API",
    description="证券内容智能分析与合规审核平台",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境需限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(tasks.router, prefix="/api/task", tags=["任务"])
app.include_router(wallets.router, prefix="/api/wallet", tags=["钱包"])
app.include_router(users.router, prefix="/api/user", tags=["用户"])

@app.get("/")
async def root():
    return {
        "name": "捷阅证券信息助手",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
