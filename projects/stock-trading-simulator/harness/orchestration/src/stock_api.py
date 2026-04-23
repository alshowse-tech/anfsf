"""
Stock API - 股票信息接口

封装股票相关 API 调用
"""
from typing import Dict, List, Optional
import httpx
from loguru import logger


class StockAPI:
    """股票 API 客户端"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.timeout = 30.0
    
    async def get_stock_info(self, symbol: str, token: str) -> Optional[Dict]:
        """获取股票信息"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/stocks/info/{symbol}",
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data")
                
                logger.error(f"获取股票信息失败：{response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"获取股票信息异常：{e}")
            return None
    
    async def search_stocks(self, query: str, token: str, limit: int = 20) -> List[Dict]:
        """搜索股票"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/stocks/search",
                    params={"query": query, "limit": limit},
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data", {}).get("stocks", [])
                
                return []
                
        except Exception as e:
            logger.error(f"搜索股票异常：{e}")
            return []
    
    async def get_stock_names_batch(
        self,
        symbols: List[str],
        token: str
    ) -> Dict[str, str]:
        """批量获取股票名称"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/stocks/names/batch",
                    params={"symbols": ",".join(symbols)},
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data", {}).get("names", {})
                
                return {}
                
        except Exception as e:
            logger.error(f"批量获取股票名称异常：{e}")
            return {}
    
    async def get_stock_list(
        self,
        exchange: Optional[str] = None,
        sector: Optional[str] = None,
        limit: int = 100,
        token: str = None
    ) -> List[Dict]:
        """获取股票列表"""
        try:
            params = {"limit": limit}
            if exchange:
                params["exchange"] = exchange
            if sector:
                params["sector"] = sector
            
            headers = {}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/stocks/list",
                    params=params,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data", {}).get("stocks", [])
                
                return []
                
        except Exception as e:
            logger.error(f"获取股票列表异常：{e}")
            return []
