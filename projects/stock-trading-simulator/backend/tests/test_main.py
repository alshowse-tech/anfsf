"""
主应用测试
"""
import pytest
from httpx import AsyncClient
from fastapi.testclient import TestClient
from main import app
from config import settings


def test_root():
    """测试根路径"""
    client = TestClient(app)
    response = client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == settings.APP_NAME
    assert data["version"] == settings.APP_VERSION
    assert data["status"] == "running"


def test_health_check():
    """测试健康检查"""
    client = TestClient(app)
    response = client.get("/api/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_websocket_connect():
    """测试 WebSocket 连接"""
    # WebSocket 测试需要异步客户端
    # 这里仅做占位，实际测试需要更复杂的设置
    pass
