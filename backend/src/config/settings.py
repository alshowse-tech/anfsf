"""Application Settings"""

from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # Application
    app_name: str = "捷阅证券后端"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/jieyue_db"
    db_pool_size: int = 10
    db_max_overflow: int = 20
    
    # Redis/Queue
    redis_url: str = "redis://localhost:6379/0"
    queue_prefix: str = "jieyue:"
    
    # CORS
    cors_origins: list = ["http://localhost:3000", "http://localhost:8080"]
    
    # TikHub (Transcription)
    tikhub_api_key: str = ""
    tikhub_api_url: str = "https://api.tikhub.io/v1/transcribe"
    
    # Alibaba Bailian (Transcription)
    bailian_api_key: str = ""
    bailian_api_url: str = "https://dashscope.aliyuncs.com/api/v1/services/audio/transcription/transcription"
    
    # OSS (Object Storage)
    oss_endpoint: str = "oss-cn-shanghai.aliyuncs.com"
    oss_bucket: str = "jieyue-media"
    oss_access_key: str = ""
    oss_secret_key: str = ""
    
    # Layer 8.5
    layer8_enabled: bool = True
    mcp_bus_url: str = "redis://localhost:6379/1"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
