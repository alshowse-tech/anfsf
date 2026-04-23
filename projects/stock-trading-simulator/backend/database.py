"""
数据库连接管理
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from config import settings
import asyncio

# 异步数据库引擎
engine = create_async_engine(
    settings.async_database_url,
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)

# 会话工厂
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# 基类
Base = declarative_base()


async def get_db():
    """获取数据库会话 (依赖注入)"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """初始化数据库 (创建表)"""
    async with engine.begin() as conn:
        # 导入所有模型以创建表
        from models import User, Token, SymbolMaster, MarketBar1d, MarketBar1m
        await conn.run_sync(Base.metadata.create_all)
    print("✅ 数据库表创建成功")


async def close_db():
    """关闭数据库连接"""
    await engine.dispose()
    print("👋 数据库连接已关闭")
