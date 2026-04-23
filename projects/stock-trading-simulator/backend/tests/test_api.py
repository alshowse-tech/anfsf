"""
API 路由测试
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token

client = TestClient(app)


def create_test_token():
    """创建测试 Token"""
    return create_access_token(data={"sub": "test_user", "role": "trader"})


def test_health_api():
    """测试健康检查 API"""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_unauthorized_access():
    """测试未授权访问"""
    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get("/api/trading/watchlist/current", headers=headers)
    assert response.status_code == 401


def test_screener_symbol():
    """测试个股诊断 API"""
    response = client.get("/api/screener/symbol/300308.SZ")
    # 需要认证
    assert response.status_code == 401


def test_screener_symbol_with_auth():
    """测试个股诊断 API (带认证)"""
    token = create_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/screener/symbol/300308.SZ", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert data["data"]["symbol"] == "300308.SZ"
