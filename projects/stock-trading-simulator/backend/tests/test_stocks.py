"""
股票信息 API 测试
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token

client = TestClient(app)


def create_test_token():
    """创建测试 Token"""
    return create_access_token(data={"sub": "test_user", "role": "trader"})


def test_get_stock_info():
    """测试获取股票信息"""
    token = create_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/stocks/info/300308.SZ", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert data["data"]["symbol"] == "300308.SZ"
    assert data["data"]["name"] == "中际旭创"


def test_search_stocks_by_symbol():
    """测试搜索股票 (按代码)"""
    token = create_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/stocks/search?query=300308", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert data["data"]["count"] > 0
    assert any(stock["symbol"] == "300308.SZ" for stock in data["data"]["stocks"])


def test_search_stocks_by_name():
    """测试搜索股票 (按名称)"""
    token = create_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/stocks/search?query=茅台", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert data["data"]["count"] > 0
    assert any(stock["name"] == "贵州茅台" for stock in data["data"]["stocks"])


def test_get_stock_names_batch():
    """测试批量获取股票名称"""
    token = create_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get(
        "/api/stocks/names/batch?symbols=300308.SZ,300502.SZ,600519.SH",
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert data["data"]["names"]["300308.SZ"] == "中际旭创"
    assert data["data"]["names"]["300502.SZ"] == "新易盛"
    assert data["data"]["names"]["600519.SH"] == "贵州茅台"


def test_get_stock_list():
    """测试获取股票列表"""
    token = create_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/stocks/list?limit=10", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert data["data"]["count"] > 0
    assert "symbol" in data["data"]["stocks"][0]
    assert "name" in data["data"]["stocks"][0]
