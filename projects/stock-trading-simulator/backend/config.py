"""
后端配置管理
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""
    
    # 应用基础配置
    APP_NAME: str = "股票操盘模拟系统"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # 数据库配置
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "stock_simulator"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    
    # Redis 配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # JWT 配置
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    
    # WebSocket 配置
    WS_PATH: str = "/ws"
    
    # 交易配置
    MAX_POSITION_PER_STOCK: float = 0.4  # 单票最大仓位 40%
    MAX_NON_MAINLINE_POSITION: float = 0.2  # 非主线最大仓位 20%
    REBUY_WINDOW_MINUTES: int = 15  # 回补窗口 15 分钟
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    # DeepSeek AI 配置
    DEEPSEEK_API_KEY: str = "sk-ce67c8965f8d4be882e6fa7809048c8a"
    DEEPSEEK_MODEL: str = "deepseek-chat"
    
    @property
    def database_url(self) -> str:
        """数据库连接 URL"""
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def redis_url(self) -> str:
        """Redis 连接 URL"""
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    @property
    def async_database_url(self) -> str:
        """异步数据库连接 URL"""
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True
    }


# 全局配置实例
settings = Settings()
