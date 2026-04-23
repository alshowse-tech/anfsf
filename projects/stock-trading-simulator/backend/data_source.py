"""
实时数据接入模块 - AkShare
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json

try:
    import akshare as ak
    AKSHARE_AVAILABLE = True
except ImportError:
    AKSHARE_AVAILABLE = False
    print("⚠️ akshare 未安装，使用模拟数据")


class AkShareDataSource:
    """AkShare 数据源"""
    
    def __init__(self):
        self.name = "AkShare"
        self.available = AKSHARE_AVAILABLE
    
    def get_realtime_quote(self, symbol: str) -> Optional[Dict]:
        """
        获取实时行情
        
        Args:
            symbol: 股票代码 (如：300308.SZ)
        
        Returns:
            实时行情数据
        """
        if not self.available:
            return self._mock_realtime_quote(symbol)
        
        try:
            # 转换股票代码格式
            ak_symbol = symbol.replace(".SZ", "").replace(".SH", "")
            
            # 获取实时行情
            data = ak.stock_zh_a_spot_em()
            stock_data = data[data['代码'] == ak_symbol]
            
            if stock_data.empty:
                return self._mock_realtime_quote(symbol)
            
            row = stock_data.iloc[0]
            return {
                "symbol": symbol,
                "price": float(row['最新价']),
                "change_pct": float(row['涨跌幅']),
                "change": float(row['涨跌额']),
                "volume": float(row['成交量']),
                "amount": float(row['成交额']),
                "high": float(row['最高']),
                "low": float(row['最低']),
                "open": float(row['今开']),
                "prev_close": float(row['昨收']),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"获取实时行情失败：{e}")
            return self._mock_realtime_quote(symbol)
    
    def get_minute_bar(self, symbol: str, period: str = "1") -> Optional[pd.DataFrame]:
        """
        获取分钟 K 线
        
        Args:
            symbol: 股票代码
            period: 周期 (1/5/15/30/60)
        
        Returns:
            DataFrame: open/high/low/close/volume
        """
        if not self.available:
            return self._mock_minute_bar(symbol, period)
        
        try:
            ak_symbol = symbol.replace(".SZ", "").replace(".SH", "")
            
            # 获取分钟 K 线
            data = ak.stock_zh_a_minute_em(
                symbol=ak_symbol,
                period=period,
                adjust="qfq"
            )
            
            return data
            
        except Exception as e:
            print(f"获取分钟 K 线失败：{e}")
            return self._mock_minute_bar(symbol, period)
    
    def get_daily_bar(self, symbol: str, start_date: str = None, end_date: str = None) -> Optional[pd.DataFrame]:
        """
        获取日线数据
        
        Args:
            symbol: 股票代码
            start_date: 开始日期 (YYYY-MM-DD)
            end_date: 结束日期 (YYYY-MM-DD)
        
        Returns:
            DataFrame: open/high/low/close/volume/amount
        """
        if not self.available:
            return self._mock_daily_bar(symbol, start_date, end_date)
        
        try:
            ak_symbol = symbol.replace(".SZ", "").replace(".SH", "")
            
            if start_date is None:
                start_date = "20230101"
            else:
                start_date = start_date.replace("-", "")
            
            if end_date is None:
                end_date = datetime.now().strftime("%Y%m%d")
            else:
                end_date = end_date.replace("-", "")
            
            # 获取日线数据
            data = ak.stock_zh_a_hist(
                symbol=ak_symbol,
                period="daily",
                start_date=start_date,
                end_date=end_date,
                adjust="qfq"
            )
            
            return data
            
        except Exception as e:
            print(f"获取日线数据失败：{e}")
            return self._mock_daily_bar(symbol, start_date, end_date)
    
    def get_market_overview(self) -> Dict:
        """
        获取市场概览
        
        Returns:
            市场整体数据
        """
        if not self.available:
            return self._mock_market_overview()
        
        try:
            # 获取涨跌家数
            data = ak.stock_market_activity_legu()
            
            return {
                "advancing": int(data.get('上涨家数', 0)),
                "declining": int(data.get('下跌家数', 0)),
                "limit_up": int(data.get('涨停家数', 0)),
                "limit_down": int(data.get('跌停家数', 0)),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"获取市场概览失败：{e}")
            return self._mock_market_overview()
    
    def get_sector_ranking(self, days: int = 10) -> List[Dict]:
        """
        获取板块排行
        
        Args:
            days: 统计天数
        
        Returns:
            板块排行列表
        """
        if not self.available:
            return self._mock_sector_ranking(days)
        
        try:
            # 获取板块排行
            data = ak.stock_board_industry_name_em()
            
            sectors = []
            for _, row in data.iterrows():
                sectors.append({
                    "sector_name": row.get('板块名称', ''),
                    "change_pct": float(row.get('涨跌幅', 0)),
                    "total_stock": int(row.get('总股本', 0)),
                    "stock_count": int(row.get('板块家数', 0))
                })
            
            return sectors[:20]  # 返回前 20
            
        except Exception as e:
            print(f"获取板块排行失败：{e}")
            return self._mock_sector_ranking(days)
    
    # ========== 模拟数据方法 (用于测试) ==========
    
    def _mock_realtime_quote(self, symbol: str) -> Dict:
        """模拟实时行情"""
        base_price = np.random.uniform(50, 200)
        change_pct = np.random.uniform(-5, 5)
        
        return {
            "symbol": symbol,
            "price": round(base_price, 2),
            "change_pct": round(change_pct, 2),
            "change": round(base_price * change_pct / 100, 2),
            "volume": np.random.randint(100000, 10000000),
            "amount": np.random.uniform(1000, 100000),
            "high": round(base_price * 1.05, 2),
            "low": round(base_price * 0.95, 2),
            "open": round(base_price * 0.99, 2),
            "prev_close": round(base_price, 2),
            "timestamp": datetime.now().isoformat()
        }
    
    def _mock_minute_bar(self, symbol: str, period: str) -> pd.DataFrame:
        """模拟分钟 K 线"""
        dates = pd.date_range(
            start=datetime.now().replace(hour=9, minute=30),
            periods=240,
            freq=f'{period}min'
        )
        
        base_price = np.random.uniform(100, 150)
        prices = np.cumsum(np.random.randn(240) * 0.5) + base_price
        
        return pd.DataFrame({
            '时间': dates,
            '开盘': prices + np.random.randn(240) * 0.2,
            '最高': prices + np.abs(np.random.randn(240) * 0.5),
            '最低': prices - np.abs(np.random.randn(240) * 0.5),
            '收盘': prices,
            '成交量': np.random.randint(1000, 100000, 240),
            '成交额': np.random.uniform(100, 10000, 240)
        })
    
    def _mock_daily_bar(self, symbol: str, start_date: str, end_date: str) -> pd.DataFrame:
        """模拟日线数据"""
        if start_date and len(str(start_date)) == 8:
            start = datetime.strptime(str(start_date), "%Y%m%d")
        else:
            start = datetime.now() - timedelta(days=365)
        
        if end_date and len(str(end_date)) == 8:
            end = datetime.strptime(str(end_date), "%Y%m%d")
        else:
            end = datetime.now()
        
        dates = pd.date_range(start=start, end=end, freq='B')
        
        base_price = np.random.uniform(100, 150)
        prices = np.cumsum(np.random.randn(len(dates)) * 2) + base_price
        
        return pd.DataFrame({
            '日期': dates,
            '开盘': prices + np.random.randn(len(dates)) * 0.5,
            '最高': prices + np.abs(np.random.randn(len(dates)) * 1),
            '最低': prices - np.abs(np.random.randn(len(dates)) * 1),
            '收盘': prices,
            '成交量': np.random.randint(100000, 10000000, len(dates)),
            '成交额': np.random.uniform(1000, 100000, len(dates))
        })
    
    def _mock_market_overview(self) -> Dict:
        """模拟市场概览"""
        total = 5000
        advancing = np.random.randint(2000, 3500)
        
        return {
            "advancing": advancing,
            "declining": total - advancing,
            "limit_up": np.random.randint(30, 100),
            "limit_down": np.random.randint(5, 30),
            "timestamp": datetime.now().isoformat()
        }
    
    def _mock_sector_ranking(self, days: int) -> List[Dict]:
        """模拟板块排行"""
        sectors = ["通信", "电子", "计算机", "医药生物", "食品饮料", 
                   "电力设备", "国防军工", "机械设备", "基础化工", "汽车"]
        
        result = []
        for sector in sectors:
            result.append({
                "sector_name": sector,
                "change_pct": round(np.random.uniform(-3, 5), 2),
                "total_stock": np.random.uniform(100, 500),
                "stock_count": np.random.randint(50, 200)
            })
        
        return sorted(result, key=lambda x: x['change_pct'], reverse=True)[:10]


# 全局数据源实例
data_source = AkShareDataSource()
