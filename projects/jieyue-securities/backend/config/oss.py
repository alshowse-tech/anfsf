"""
阿里云 OSS 配置模块
"""
import os
from typing import Optional
from pydantic import BaseModel


class OSSConfig(BaseModel):
    """OSS 配置"""
    access_key: str
    secret_key: str
    bucket: str
    endpoint: str
    
    @property
    def bucket_url(self) -> str:
        """获取 Bucket 访问 URL"""
        return f"https://{self.bucket}.{self.endpoint}"
    
    @classmethod
    def from_env(cls) -> Optional["OSSConfig"]:
        """从环境变量加载配置"""
        access_key = os.getenv("ALIYUN_OSS_ACCESS_KEY")
        secret_key = os.getenv("ALIYUN_OSS_SECRET_KEY")
        bucket = os.getenv("ALIYUN_OSS_BUCKET")
        endpoint = os.getenv("ALIYUN_OSS_ENDPOINT")
        
        if not all([access_key, secret_key, bucket, endpoint]):
            return None
        
        return cls(
            access_key=access_key,
            secret_key=secret_key,
            bucket=bucket,
            endpoint=endpoint
        )


# 全局配置实例（延迟加载）
_oss_config: Optional[OSSConfig] = None


def get_oss_config() -> OSSConfig:
    """获取 OSS 配置"""
    global _oss_config
    if _oss_config is None:
        config = OSSConfig.from_env()
        if config is None:
            raise ValueError("OSS 配置未设置，请检查环境变量")
        _oss_config = config
    return _oss_config
