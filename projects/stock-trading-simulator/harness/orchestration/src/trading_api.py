"""
Trading API - 交易接口

封装交易相关 API 调用
"""
from typing import Dict, List, Optional
import httpx
from loguru import logger


class TradingAPI:
    """交易 API 客户端"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.timeout = 30.0
    
    async def get_watchlist(self, token: str) -> Optional[Dict]:
        """获取白名单"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/trading/watchlist/current",
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data")
                
                return None
                
        except Exception as e:
            logger.error(f"获取白名单异常：{e}")
            return None
    
    async def init_watchlist(
        self,
        version_name: str,
        symbols: List[str],
        priority_map: Dict[str, int],
        token: str
    ) -> bool:
        """初始化白名单"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/trading/watchlist/init",
                    json={
                        "version_name": version_name,
                        "symbols": symbols,
                        "priority_map": priority_map
                    },
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                return response.status_code == 200
                
        except Exception as e:
            logger.error(f"初始化白名单异常：{e}")
            return False
    
    async def get_account(self, token: str) -> Optional[Dict]:
        """获取账户信息"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/trading/account",
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data")
                
                return None
                
        except Exception as e:
            logger.error(f"获取账户信息异常：{e}")
            return None
    
    async def get_orders(
        self,
        token: str,
        symbol: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> List[Dict]:
        """获取委托列表"""
        try:
            params = {"page": page, "page_size": page_size}
            if symbol:
                params["symbol"] = symbol
            if status:
                params["status"] = status
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/trading/orders",
                    params=params,
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data", {}).get("items", [])
                
                return []
                
        except Exception as e:
            logger.error(f"获取委托列表异常：{e}")
            return []
    
    async def run_noon_task(self, token: str, strategy_config: Dict = None) -> bool:
        """运行午间任务"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/trading/run/noon",
                    json={"strategy_config": strategy_config} if strategy_config else {},
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                return response.status_code == 200
                
        except Exception as e:
            logger.error(f"运行午间任务异常：{e}")
            return False
    
    async def run_close_task(self, token: str, strategy_config: Dict = None) -> bool:
        """运行日终任务"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/trading/run/close",
                    json={"strategy_config": strategy_config} if strategy_config else {},
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                return response.status_code == 200
                
        except Exception as e:
            logger.error(f"运行日终任务异常：{e}")
            return False
