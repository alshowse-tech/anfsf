"""
股票信息管理 API
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import SymbolMaster
from auth import get_current_user

router = APIRouter()


@router.get("/info/{symbol}")
async def get_stock_info(
    symbol: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取股票信息
    
    Args:
        symbol: 股票代码 (如：300308.SZ)
    
    Returns:
        股票详细信息
    """
    result = await db.execute(
        select(SymbolMaster).where(SymbolMaster.symbol == symbol)
    )
    stock = result.scalars().first()
    
    if not stock:
        # 返回示例数据（如果数据库中没有）
        return {
            "code": 200,
            "message": "success",
            "data": get_mock_stock_info(symbol)
        }
    
    return {
        "code": 200,
        "message": "success",
        "data": {
            "symbol": stock.symbol,
            "name": stock.name,
            "exchange": stock.exchange,
            "market": stock.market,
            "sector": stock.sector,
            "industry": stock.industry,
            "status": stock.status,
            "list_date": stock.list_date.isoformat() if stock.list_date else None
        }
    }


@router.get("/search")
async def search_stocks(
    query: str = Query(..., min_length=1, description="搜索关键词（代码或名称）"),
    limit: int = Query(20, ge=1, le=100, description="返回数量限制"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    搜索股票（支持代码和名称）
    
    Args:
        query: 搜索关键词
        limit: 返回数量限制
    
    Returns:
        股票列表
    """
    query = query.upper()
    
    # 从数据库查询
    result = await db.execute(
        select(SymbolMaster)
        .where(
            (SymbolMaster.symbol.ilike(f"%{query}%")) |
            (SymbolMaster.name.ilike(f"%{query}%"))
        )
        .where(SymbolMaster.status == "active")
        .limit(limit)
    )
    stocks = result.scalars().all()
    
    if stocks:
        return {
            "code": 200,
            "message": "success",
            "data": {
                "query": query,
                "count": len(stocks),
                "stocks": [
                    {
                        "symbol": stock.symbol,
                        "name": stock.name,
                        "exchange": stock.exchange,
                        "market": stock.market,
                        "sector": stock.sector
                    }
                    for stock in stocks
                ]
            }
        }
    
    # 如果数据库没有，返回示例数据
    mock_stocks = search_mock_stocks(query, limit)
    
    return {
        "code": 200,
        "message": "success",
        "data": {
            "query": query,
            "count": len(mock_stocks),
            "stocks": mock_stocks
        }
    }


@router.get("/list")
async def get_stock_list(
    exchange: Optional[str] = Query(None, description="交易所 (SH/SZ)"),
    sector: Optional[str] = Query(None, description="行业"),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取股票列表
    
    Args:
        exchange: 交易所
        sector: 行业
        limit: 数量限制
    
    Returns:
        股票列表
    """
    query = select(SymbolMaster).where(SymbolMaster.status == "active")
    
    if exchange:
        query = query.where(SymbolMaster.exchange == exchange.upper())
    if sector:
        query = query.where(SymbolMaster.sector.ilike(f"%{sector}%"))
    
    query = query.limit(limit)
    result = await db.execute(query)
    stocks = result.scalars().all()
    
    return {
        "code": 200,
        "message": "success",
        "data": {
            "count": len(stocks),
            "stocks": [
                {
                    "symbol": stock.symbol,
                    "name": stock.name,
                    "exchange": stock.exchange,
                    "sector": stock.sector
                }
                for stock in stocks
            ]
        }
    }


@router.get("/names/batch")
async def get_stock_names_batch(
    symbols: str = Query(..., description="股票代码列表，逗号分隔"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    批量获取股票名称
    
    Args:
        symbols: 股票代码列表 (如：300308.SZ,300502.SZ)
    
    Returns:
        股票名称映射
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    
    result = await db.execute(
        select(SymbolMaster).where(SymbolMaster.symbol.in_(symbol_list))
    )
    stocks = result.scalars().all()
    
    name_map = {stock.symbol: stock.name for stock in stocks}
    
    # 补充缺失的股票
    for symbol in symbol_list:
        if symbol not in name_map:
            name_map[symbol] = get_mock_stock_name(symbol)
    
    return {
        "code": 200,
        "message": "success",
        "data": {
            "count": len(name_map),
            "names": name_map
        }
    }


# ========== 辅助函数 ==========

def get_mock_stock_info(symbol: str) -> dict:
    """获取模拟股票信息"""
    mock_data = {
        '300308.SZ': {'name': '中际旭创', 'sector': '通信', 'industry': '光模块'},
        '300502.SZ': {'name': '新易盛', 'sector': '电子', 'industry': '半导体'},
        '002463.SZ': {'name': '电科芯片', 'sector': '电子', 'industry': '半导体'},
        '600519.SH': {'name': '贵州茅台', 'sector': '食品饮料', 'industry': '白酒'},
        '300750.SZ': {'name': '宁德时代', 'sector': '电力设备', 'industry': '电池'},
        '000858.SZ': {'name': '五 粮 液', 'sector': '食品饮料', 'industry': '白酒'},
        '002594.SZ': {'name': '比亚迪', 'sector': '汽车', 'industry': '新能源汽车'},
        '300059.SZ': {'name': '东方财富', 'sector': '非银金融', 'industry': '证券'},
        '601318.SH': {'name': '中国平安', 'sector': '非银金融', 'industry': '保险'},
        '600036.SH': {'name': '招商银行', 'sector': '银行', 'industry': '股份制银行'}
    }
    
    data = mock_data.get(symbol, {'name': '未知', 'sector': '未知', 'industry': '未知'})
    
    return {
        'symbol': symbol,
        'name': data['name'],
        'exchange': symbol.split('.')[1] if '.' in symbol else 'SZ',
        'market': '创业板' if symbol.startswith('300') else '主板',
        'sector': data['sector'],
        'industry': data['industry'],
        'status': 'active'
    }


def get_mock_stock_name(symbol: str) -> str:
    """获取模拟股票名称"""
    return get_mock_stock_info(symbol)['name']


def search_mock_stocks(query: str, limit: int) -> list:
    """搜索模拟股票"""
    mock_stocks = [
        {'symbol': '300308.SZ', 'name': '中际旭创', 'exchange': 'SZ', 'market': '创业板', 'sector': '通信'},
        {'symbol': '300502.SZ', 'name': '新易盛', 'exchange': 'SZ', 'market': '创业板', 'sector': '电子'},
        {'symbol': '002463.SZ', 'name': '电科芯片', 'exchange': 'SZ', 'market': '主板', 'sector': '电子'},
        {'symbol': '600519.SH', 'name': '贵州茅台', 'exchange': 'SH', 'market': '主板', 'sector': '食品饮料'},
        {'symbol': '300750.SZ', 'name': '宁德时代', 'exchange': 'SZ', 'market': '创业板', 'sector': '电力设备'},
        {'symbol': '000858.SZ', 'name': '五 粮 液', 'exchange': 'SZ', 'market': '主板', 'sector': '食品饮料'},
        {'symbol': '002594.SZ', 'name': '比亚迪', 'exchange': 'SZ', 'market': '主板', 'sector': '汽车'},
        {'symbol': '300059.SZ', 'name': '东方财富', 'exchange': 'SZ', 'market': '创业板', 'sector': '非银金融'},
        {'symbol': '601318.SH', 'name': '中国平安', 'exchange': 'SH', 'market': '主板', 'sector': '非银金融'},
        {'symbol': '600036.SH', 'name': '招商银行', 'exchange': 'SH', 'market': '主板', 'sector': '银行'}
    ]
    
    query = query.upper()
    results = [
        stock for stock in mock_stocks
        if query in stock['symbol'] or query in stock['name']
    ][:limit]
    
    return results
