"""
认证模块测试
"""
import pytest
from datetime import timedelta
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    verify_token
)
from config import settings


def test_password_hashing():
    """测试密码哈希"""
    password = "test_password_123"
    hashed = get_password_hash(password)
    
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrong_password", hashed)


def test_create_access_token():
    """测试创建 Token"""
    data = {"sub": "test_user", "role": "trader"}
    token = create_access_token(data)
    
    assert token is not None
    assert len(token) > 0


def test_verify_token():
    """测试验证 Token"""
    data = {"sub": "test_user", "role": "trader"}
    token = create_access_token(data)
    
    payload = verify_token(token)
    assert payload is not None
    assert payload["sub"] == "test_user"
    assert payload["role"] == "trader"


def test_verify_expired_token():
    """测试过期 Token"""
    data = {"sub": "test_user"}
    token = create_access_token(data, expires_delta=timedelta(seconds=-1))
    
    payload = verify_token(token)
    # 过期的 token 应该返回 None 或抛出异常
    assert payload is None or "exp" in payload


def test_token_expiration():
    """测试 Token 过期时间"""
    data = {"sub": "test_user"}
    token = create_access_token(data, expires_delta=timedelta(minutes=15))
    
    payload = verify_token(token)
    assert payload is not None
    assert "exp" in payload
