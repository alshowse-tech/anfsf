"""
数据库初始化脚本
"""
import asyncio
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from config import settings
from models import Base


async def init_database():
    """初始化数据库"""
    print(f"🔧 开始初始化数据库...")
    print(f"   主机：{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}")
    print(f"   数据库：{settings.POSTGRES_DB}")
    
    # 创建引擎
    engine = create_async_engine(
        settings.async_database_url,
        echo=settings.DEBUG
    )
    
    try:
        # 测试连接
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("✅ 数据库连接成功")
        
        # 创建所有表
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            print("✅ 数据库表创建成功")
        
        # 插入示例数据
        await insert_sample_data(engine)
        
        print("\n✅ 数据库初始化完成!")
        
    except Exception as e:
        print(f"\n❌ 数据库初始化失败：{e}")
        raise
    finally:
        await engine.dispose()


async def insert_sample_data(engine):
    """插入示例数据"""
    print("\n📊 插入示例数据...")
    
    async with engine.begin() as conn:
        # 插入示例股票
        from sqlalchemy import text
        
        sample_stocks = [
            ("300308.SZ", "中际旭创", "SZ", "创业板", "2014-01-23", "通信", "光模块"),
            ("300502.SZ", "新易盛", "SZ", "创业板", "2016-11-16", "电子", "半导体"),
            ("002463.SZ", "电科芯片", "SZ", "主板", "2010-08-20", "电子", "半导体"),
            ("600519.SH", "贵州茅台", "SH", "主板", "2001-08-27", "食品饮料", "白酒"),
            ("300750.SZ", "宁德时代", "SZ", "创业板", "2018-06-11", "电力设备", "电池"),
        ]
        
        for symbol, name, exchange, market, list_date, sector, industry in sample_stocks:
            await conn.execute(text("""
                INSERT INTO symbol_master (symbol, name, exchange, market, list_date, sector, industry)
                VALUES (:symbol, :name, :exchange, :market, :list_date, :sector, :industry)
                ON CONFLICT (symbol, exchange) DO NOTHING
            """), {
                "symbol": symbol,
                "name": name,
                "exchange": exchange,
                "market": market,
                "list_date": list_date,
                "sector": sector,
                "industry": industry
            })
        
        print(f"   ✅ 插入 {len(sample_stocks)} 只示例股票")
        
        # 插入示例用户
        from auth import get_password_hash
        
        await conn.execute(text("""
            INSERT INTO users (username, email, hashed_password, role, is_active)
            VALUES ('admin', 'admin@example.com', :password, 'admin', true)
            ON CONFLICT (username) DO NOTHING
        """), {"password": get_password_hash("admin123")})
        
        print("   ✅ 插入示例用户 (admin/admin123)")


async def main():
    """主函数"""
    await init_database()


if __name__ == "__main__":
    asyncio.run(main())
