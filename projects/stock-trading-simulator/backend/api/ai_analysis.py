"""
AI 数据分析 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from pydantic import BaseModel

from database import get_db
from auth import get_current_user
from ai_analyzer import analyzer

router = APIRouter()


class StockAnalysisRequest(BaseModel):
    """个股分析请求"""
    symbol: str
    rps_10: Optional[float] = None
    rps_20: Optional[float] = None
    rps_50: Optional[float] = None
    atr_14: Optional[float] = None
    rsi_14: Optional[float] = None
    price_pos_ma_5: Optional[float] = None
    pattern: Optional[str] = None
    price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None


class MarketAnalysisRequest(BaseModel):
    """市场分析请求"""
    advancing: Optional[int] = None
    declining: Optional[int] = None
    limit_up: Optional[int] = None
    limit_down: Optional[int] = None
    volume: Optional[float] = None
    north_flow: Optional[float] = None
    strong_sectors: Optional[list] = None


@router.post("/stock")
async def analyze_stock(
    request: StockAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """个股 AI 分析"""
    stock_data = request.dict()
    result = await analyzer.analyze_stock(request.symbol, stock_data)
    
    if result["success"]:
        return {
            "code": 200,
            "message": "分析成功",
            "data": result
        }
    else:
        raise HTTPException(
            status_code=500,
            detail=f"AI 分析失败：{result.get('error', '未知错误')}"
        )


@router.post("/market")
async def analyze_market(
    request: MarketAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """市场 AI 分析"""
    market_data = request.dict()
    result = await analyzer.analyze_market(market_data)
    
    if result["success"]:
        return {
            "code": 200,
            "message": "分析成功",
            "data": result
        }
    else:
        raise HTTPException(
            status_code=500,
            detail=f"AI 分析失败：{result.get('error', '未知错误')}"
        )


@router.post("/trade-plan")
async def generate_trade_plan(
    positions: list,
    signals: list,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """生成交易计划"""
    result = await analyzer.generate_trade_plan(positions, signals)
    
    if result["success"]:
        return {
            "code": 200,
            "message": "计划生成成功",
            "data": result
        }
    else:
        raise HTTPException(
            status_code=500,
            detail=f"AI 分析失败：{result.get('error', '未知错误')}"
        )


@router.get("/test")
async def test_ai_api(
    current_user: dict = Depends(get_current_user)
):
    """测试 AI API 连接"""
    result = await analyzer.analyze_stock(
        "300308.SZ",
        {
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
    )
    
    return {
        "code": 200,
        "message": "测试成功",
        "data": result
    }
