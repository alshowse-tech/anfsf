"""
KPI Collector - KPI 指标收集

自动收集系统和业务指标
"""
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import json
from loguru import logger


@dataclass
class KPI:
    """KPI 指标"""
    name: str
    value: float
    unit: str
    timestamp: datetime
    tags: Dict[str, str] = field(default_factory=dict)
    metadata: Dict = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "value": self.value,
            "unit": self.unit,
            "timestamp": self.timestamp.isoformat(),
            "tags": self.tags,
            "metadata": self.metadata
        }


class KPICollector:
    """KPI 收集器"""
    
    def __init__(self):
        self.kpis: List[KPI] = []
        self.max_kpis = 100000
        self.collector_funcs = []
        self._register_default_collectors()
    
    def _register_default_collectors(self):
        """注册默认收集器"""
        # API 性能指标
        self.collector_funcs.append(self._collect_api_metrics)
        # 缓存指标
        self.collector_funcs.append(self._collect_cache_metrics)
        # 业务指标
        self.collector_funcs.append(self._collect_business_metrics)
    
    def register_collector(self, func: callable):
        """注册自定义收集器"""
        self.collector_funcs.append(func)
        logger.debug(f"📊 注册 KPI 收集器：{func.__name__}")
    
    def _collect_api_metrics(self) -> List[KPI]:
        """收集 API 性能指标"""
        # 从监控系统获取
        # 这里简化实现
        return [
            KPI(
                name="api_response_time_avg",
                value=85.5,
                unit="ms",
                timestamp=datetime.now(),
                tags={"endpoint": "/api/stocks/info"}
            ),
            KPI(
                name="api_requests_total",
                value=15234,
                unit="requests",
                timestamp=datetime.now(),
                tags={"method": "GET"}
            )
        ]
    
    def _collect_cache_metrics(self) -> List[KPI]:
        """收集缓存指标"""
        return [
            KPI(
                name="cache_hit_rate",
                value=0.92,
                unit="ratio",
                timestamp=datetime.now(),
                tags={"cache_type": "stock_name"}
            ),
            KPI(
                name="cache_size",
                value=8542,
                unit="items",
                timestamp=datetime.now()
            )
        ]
    
    def _collect_business_metrics(self) -> List[KPI]:
        """收集业务指标"""
        return [
            KPI(
                name="signal_accuracy",
                value=0.87,
                unit="ratio",
                timestamp=datetime.now(),
                tags={"signal_type": "BUY"}
            ),
            KPI(
                name="rule_hit_rate",
                value=0.94,
                unit="ratio",
                timestamp=datetime.now(),
                tags={"rule_type": "filter"}
            )
        ]
    
    def collect_all(self) -> List[KPI]:
        """收集所有 KPI"""
        all_kpis = []
        
        for collector in self.collector_funcs:
            try:
                kpis = collector()
                all_kpis.extend(kpis)
            except Exception as e:
                logger.error(f"KPI 收集失败：{collector.__name__}: {e}")
        
        # 存储 KPI
        self.kpis.extend(all_kpis)
        
        # 清理过期 KPI
        if len(self.kpis) > self.max_kpis:
            self._cleanup()
        
        return all_kpis
    
    def get_kpis(
        self,
        name: str = None,
        start_time: datetime = None,
        end_time: datetime = None,
        tags: Dict = None
    ) -> List[KPI]:
        """查询 KPI"""
        result = self.kpis
        
        if name:
            result = [k for k in result if k.name == name]
        
        if start_time:
            result = [k for k in result if k.timestamp >= start_time]
        
        if end_time:
            result = [k for k in result if k.timestamp <= end_time]
        
        if tags:
            for key, value in tags.items():
                result = [k for k in result if k.tags.get(key) == value]
        
        return result
    
    def get_latest(self, name: str) -> Optional[KPI]:
        """获取最新 KPI"""
        kpis = [k for k in self.kpis if k.name == name]
        if kpis:
            return max(kpis, key=lambda k: k.timestamp)
        return None
    
    def get_average(
        self,
        name: str,
        window_minutes: int = 60
    ) -> Optional[float]:
        """获取平均值"""
        start_time = datetime.now() - timedelta(minutes=window_minutes)
        kpis = self.get_kpis(name=name, start_time=start_time)
        
        if kpis:
            return sum(k.value for k in kpis) / len(kpis)
        return None
    
    def _cleanup(self):
        """清理过期 KPI (保留最近 50000 个)"""
        self.kpis = sorted(self.kpis, key=lambda k: k.timestamp, reverse=True)[:50000]
    
    def export_json(self, filename: str):
        """导出 KPI 到 JSON"""
        data = [k.to_dict() for k in self.kpis]
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"📊 KPI 导出到：{filename}")
