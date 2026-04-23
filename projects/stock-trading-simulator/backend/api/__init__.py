"""
API 路由模块
"""
from .health import router as health_router
from .trading import router as trading_router
from .screener import router as screener_router
from .ai_analysis import router as ai_analysis_router
from .stocks import router as stocks_router

__all__ = ["health_router", "trading_router", "screener_router", "ai_analysis_router", "stocks_router"]
