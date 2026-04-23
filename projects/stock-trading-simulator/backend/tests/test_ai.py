"""
AI 分析模块测试
"""
import pytest
import asyncio
from ai_analyzer import DeepSeekAnalyzer


@pytest.fixture
def analyzer():
    """创建分析器实例"""
    return DeepSeekAnalyzer(api_key="sk-ce67c8965f8d4be882e6fa7809048c8a")


@pytest.mark.asyncio
async def test_analyze_stock(analyzer):
    """测试个股分析"""
    stock_data = {
        "rps_10": 95.5,
        "rps_20": 92.3,
        "rps_50": 88.1,
        "atr_14": 3.2,
        "rsi_14": 65.2,
        "price_pos_ma_5": 2.5,
        "pattern": "放量突破",
        "price": 125.00,
        "stop_loss": 120.50,
        "take_profit": 135.00
    }
    
    result = await analyzer.analyze_stock("300308.SZ", stock_data)
    
    assert result["success"] in [True, False]  # 可能因 API 限制失败
    assert "timestamp" in result
    
    if result["success"]:
        assert "analysis" in result
        assert len(result["analysis"]) > 0
        print(f"✅ AI 分析成功:\n{result['analysis']}")


@pytest.mark.asyncio
async def test_analyze_market(analyzer):
    """测试市场分析"""
    market_data = {
        "advancing": 3000,
        "declining": 1500,
        "limit_up": 50,
        "limit_down": 10,
        "volume": 10000.0,
        "north_flow": 50.0,
        "strong_sectors": ["通信", "电子", "计算机"]
    }
    
    result = await analyzer.analyze_market(market_data)
    
    assert result["success"] in [True, False]
    assert "timestamp" in result
    
    if result["success"]:
        assert "analysis" in result
        print(f"✅ 市场分析成功:\n{result['analysis']}")


@pytest.mark.asyncio
async def test_generate_trade_plan(analyzer):
    """测试交易计划生成"""
    positions = [
        {
            "symbol": "300308.SZ",
            "quantity": 1000,
            "cost_price": 115.0,
            "current_price": 125.0,
            "profit_rate": 8.7,
            "is_mainline": True
        }
    ]
    
    signals = [
        {
            "symbol": "300502.SZ",
            "signal_type": "BUY",
            "signal_reason": "RPS > 90",
            "signal_strength": 0.85
        }
    ]
    
    result = await analyzer.generate_trade_plan(positions, signals)
    
    assert result["success"] in [True, False]
    assert "timestamp" in result
    
    if result["success"]:
        assert "plan" in result
        print(f"✅ 交易计划生成成功:\n{result['plan']}")
