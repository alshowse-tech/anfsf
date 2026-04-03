"""
阿里云百炼模型配置模块
"""
import os
from typing import Optional
from pydantic import BaseModel


class BailianConfig(BaseModel):
    """百炼模型配置"""
    api_key: str
    base_url: str = "https://dashscope.aliyuncs.com/api/v1"
    
    @classmethod
    def from_env(cls) -> Optional["BailianConfig"]:
        """从环境变量加载配置"""
        api_key = os.getenv("ALIYUN_BAILIAN_API_KEY")
        base_url = os.getenv("ALIYUN_BAILIAN_BASE_URL", "https://dashscope.aliyuncs.com/api/v1")
        
        if not api_key:
            return None
        
        return cls(
            api_key=api_key,
            base_url=base_url
        )


# 全局配置实例（延迟加载）
_bailian_config: Optional[BailianConfig] = None


def get_bailian_config() -> BailianConfig:
    """获取百炼配置"""
    global _bailian_config
    if _bailian_config is None:
        config = BailianConfig.from_env()
        if config is None:
            raise ValueError("百炼配置未设置，请检查环境变量")
        _bailian_config = config
    return _bailian_config
