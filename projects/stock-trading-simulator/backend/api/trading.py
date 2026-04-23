"""
操盘区 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime, date
import uuid

from database import get_db
from models import WatchList, Position, TradeOrder, TradeSignal, RuleHitLog
from auth import get_current_user
from websocket_manager import ws_manager

router = APIRouter()


# ============ 白名单管理 ============

@router.post("/watchlist/init", response_model=None)
async def init_watchlist(
    watchlist_data: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """初始化白名单"""
    version_name = watchlist_data.get("version_name")
    symbols = watchlist_data.get("symbols", [])
    priority_map = watchlist_data.get("priority_map", {})
    
    # 检查版本名是否已存在
    result = await db.execute(
        select(WatchList).where(WatchList.version_name == version_name)
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="白名单版本已存在"
        )
    
    version_id = str(uuid.uuid4())
    
    # 添加股票
    items = []
    for symbol in symbols:
        watchlist_item = WatchList(
            version_id=version_id,
            version_name=version_name,
            symbol=symbol,
            priority=priority_map.get(symbol, 0)
        )
        db.add(watchlist_item)
        items.append({
            "symbol": symbol,
            "priority": priority_map.get(symbol, 0)
        })
    
    await db.commit()
    
    return {
        "code": 200,
        "message": "白名单初始化成功",
        "data": {
            "version_id": version_id,
            "name": version_name,
            "item_count": len(symbols),
            "created_at": datetime.now().isoformat()
        }
    }


@router.post("/watchlist/revise", response_model=None)
async def revise_watchlist(
    revise_data: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """修正白名单"""
    add_symbols = revise_data.get("add", [])
    remove_symbols = revise_data.get("remove", [])
    
    if not add_symbols and not remove_symbols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="增删列表不能同时为空"
        )
    
    # 添加股票
    added = []
    for symbol in add_symbols:
        watchlist_item = WatchList(
            version_id="current",
            version_name="current",
            symbol=symbol,
            priority=0
        )
        db.add(watchlist_item)
        added.append(symbol)
    
    # 删除股票
    removed = []
    for symbol in remove_symbols:
        result = await db.execute(
            select(WatchList).where(WatchList.symbol == symbol)
        )
        item = result.scalars().first()
        if item:
            await db.delete(item)
            removed.append(symbol)
    
    await db.commit()
    
    return {
        "code": 200,
        "message": "白名单修正成功",
        "data": {
            "added": added,
            "removed": removed,
            "updated_at": datetime.now().isoformat()
        }
    }


@router.get("/watchlist/current", response_model=None)
async def get_current_watchlist(
    include_inactive: bool = False,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """查询当前白名单"""
    query = select(WatchList).where(WatchList.is_active == True)
    
    if not include_inactive:
        query = query.where(WatchList.status == "active")
    
    result = await db.execute(query)
    items = result.scalars().all()
    
    return {
        "code": 200,
        "message": "success",
        "data": {
            "version_id": "current",
            "version_name": "当前版本",
            "status": "active",
            "items": [
                {
                    "symbol": item.symbol,
                    "name": "",
                    "priority": item.priority,
                    "is_active": item.is_active,
                    "added_at": item.added_at.isoformat()
                }
                for item in items
            ]
        }
    }


# ============ 交易任务 ============

@router.post("/run/noon", response_model=None)
async def run_noon_task(
    task_data: dict = {},
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """午间收盘任务"""
    # TODO: 实现午间任务逻辑
    return {
        "code": 200,
        "message": "午间任务完成",
        "data": {
            "task_id": f"noon-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            "symbols_checked": 0,
            "signals_generated": 0,
            "orders_executed": 0
        }
    }


@router.post("/run/close", response_model=None)
async def run_close_task(
    task_data: dict = {},
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """日终收盘任务"""
    # TODO: 实现日终任务逻辑
    return {
        "code": 200,
        "message": "日终任务完成",
        "data": {
            "task_id": f"close-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            "symbols_analyzed": 0,
            "mainline_pool": [],
            "signals_generated": 0
        }
    }


# ============ 委托与成交 ============

@router.get("/orders", response_model=None)
async def get_orders(
    symbol: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """查询模拟委托"""
    query = select(TradeOrder)
    
    if symbol:
        query = query.where(TradeOrder.symbol == symbol)
    if status:
        query = query.where(TradeOrder.status == status)
    
    query = query.order_by(TradeOrder.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    return {
        "code": 200,
        "message": "success",
        "data": {
            "total": 0,
            "page": page,
            "page_size": page_size,
            "items": [
                {
                    "order_id": order.order_id,
                    "symbol": order.symbol,
                    "side": order.side,
                    "order_type": order.order_type,
                    "quantity": order.quantity,
                    "price": float(order.price) if order.price else None,
                    "status": order.status,
                    "filled_qty": order.filled_qty,
                    "created_at": order.created_at.isoformat()
                }
                for order in orders
            ]
        }
    }


@router.get("/account", response_model=None)
async def get_account(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """查询账户与持仓"""
    # TODO: 实现账户查询逻辑
    return {
        "code": 200,
        "message": "success",
        "data": {
            "snapshot_date": datetime.now().strftime("%Y-%m-%d"),
            "total_assets": 1000000.0,
            "cash_balance": 750000.0,
            "market_value": 250000.0,
            "total_profit": 50000.0,
            "return_rate": 5.0,
            "daily_profit": 2500.0,
            "daily_return_rate": 0.25,
            "position_count": 0,
            "positions": []
        }
    }
