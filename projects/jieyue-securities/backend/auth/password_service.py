"""
捷阅证券信息助手 - 密码服务
提供密码加密、验证功能
"""

import bcrypt
from typing import Optional


class PasswordService:
    """密码服务类 - 处理密码加密和验证"""
    
    def __init__(self, rounds: int = 12):
        """
        初始化密码服务
        
        Args:
            rounds: bcrypt 加密轮数 (默认 12，越高越安全但越慢)
        """
        self.rounds = rounds
    
    def hash(self, password: str) -> str:
        """
        对密码进行哈希加密
        
        Args:
            password: 明文密码
            
        Returns:
            str: 加密后的密码哈希
        """
        # 将字符串转换为字节
        password_bytes = password.encode('utf-8')
        
        # 生成盐并加密
        salt = bcrypt.gensalt(rounds=self.rounds)
        hashed = bcrypt.hashpw(password_bytes, salt)
        
        return hashed.decode('utf-8')
    
    def compare(self, password: str, hashed_password: str) -> bool:
        """
        验证密码是否匹配
        
        Args:
            password: 明文密码
            hashed_password: 加密后的密码哈希
            
        Returns:
            bool: 密码是否匹配
        """
        password_bytes = password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    
    def needs_rehash(self, hashed_password: str) -> bool:
        """
        检查密码哈希是否需要重新加密 (例如 rounds 升级)
        
        Args:
            hashed_password: 当前的密码哈希
            
        Returns:
            bool: 是否需要重新加密
        """
        return bcrypt.hashpw(
            b"test", 
            hashed_password.encode('utf-8')
        ) != hashed_password.encode('utf-8')


# 创建全局密码服务实例
password_service = PasswordService(rounds=12)
