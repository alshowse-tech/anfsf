"""
Metrics Calculator - 指标计算器

计算和分析各类指标
"""
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import math
from loguru import logger


@dataclass
class MetricSummary:
    """指标汇总"""
    name: str
    count: int
    mean: float
    std: float
    min: float
    max: float
    p50: float
    p95: float
    p99: float


class MetricsCalculator:
    """指标计算器"""
    
    def __init__(self):
        self.data: Dict[str, List[float]] = {}
    
    def record(self, metric_name: str, value: float):
        """记录指标值"""
        if metric_name not in self.data:
            self.data[metric_name] = []
        self.data[metric_name].append(value)
    
    def calculate_summary(self, metric_name: str) -> Optional[MetricSummary]:
        """
        计算指标汇总
        
        Args:
            metric_name: 指标名称
        
        Returns:
            指标汇总
        """
        if metric_name not in self.data:
            logger.error(f"❌ 指标不存在：{metric_name}")
            return None
        
        values = self.data[metric_name]
        
        if not values:
            return None
        
        n = len(values)
        mean = sum(values) / n
        
        # 标准差
        variance = sum((x - mean) ** 2 for x in values) / n
        std = math.sqrt(variance)
        
        # 排序用于百分位
        sorted_values = sorted(values)
        
        return MetricSummary(
            name=metric_name,
            count=n,
            mean=mean,
            std=std,
            min=min(values),
            max=max(values),
            p50=self._percentile(sorted_values, 50),
            p95=self._percentile(sorted_values, 95),
            p99=self._percentile(sorted_values, 99)
        )
    
    def _percentile(self, sorted_values: List[float], percentile: int) -> float:
        """计算百分位"""
        if not sorted_values:
            return 0.0
        
        k = (len(sorted_values) - 1) * percentile / 100
        f = math.floor(k)
        c = math.ceil(k)
        
        if f == c:
            return sorted_values[int(k)]
        
        return sorted_values[int(f)] * (c - k) + sorted_values[int(c)] * (k - f)
    
    def calculate_trend(
        self,
        metric_name: str,
        window_minutes: int = 60
    ) -> Optional[float]:
        """
        计算指标趋势
        
        Args:
            metric_name: 指标名称
            window_minutes: 时间窗口 (分钟)
        
        Returns:
            趋势值 (正=上升，负=下降)
        """
        # 简化实现：比较前后半段
        if metric_name not in self.data:
            return None
        
        values = self.data[metric_name]
        if len(values) < 2:
            return 0.0
        
        mid = len(values) // 2
        first_half = values[:mid]
        second_half = values[mid:]
        
        first_mean = sum(first_half) / len(first_half)
        second_mean = sum(second_half) / len(second_half)
        
        if first_mean == 0:
            return 0.0
        
        return (second_mean - first_mean) / first_mean
    
    def calculate_correlation(
        self,
        metric_a: str,
        metric_b: str
    ) -> Optional[float]:
        """
        计算两个指标的相关性
        
        Args:
            metric_a: 指标 A
            metric_b: 指标 B
        
        Returns:
            相关系数 (-1 到 1)
        """
        if metric_a not in self.data or metric_b not in self.data:
            return None
        
        values_a = self.data[metric_a]
        values_b = self.data[metric_b]
        
        # 对齐长度
        min_len = min(len(values_a), len(values_b))
        values_a = values_a[:min_len]
        values_b = values_b[:min_len]
        
        if min_len < 2:
            return None
        
        # 计算相关系数
        mean_a = sum(values_a) / len(values_a)
        mean_b = sum(values_b) / len(values_b)
        
        numerator = sum(
            (a - mean_a) * (b - mean_b)
            for a, b in zip(values_a, values_b)
        )
        
        denom_a = math.sqrt(sum((a - mean_a) ** 2 for a in values_a))
        denom_b = math.sqrt(sum((b - mean_b) ** 2 for b in values_b))
        
        if denom_a == 0 or denom_b == 0:
            return None
        
        return numerator / (denom_a * denom_b)
    
    def get_all_summaries(self) -> Dict[str, MetricSummary]:
        """获取所有指标的汇总"""
        return {
            name: self.calculate_summary(name)
            for name in self.data.keys()
        }
    
    def clear(self, metric_name: str = None):
        """清空数据"""
        if metric_name:
            self.data.pop(metric_name, None)
        else:
            self.data.clear()
    
    def export_json(self) -> Dict:
        """导出为 JSON"""
        return {
            name: {
                "summary": self.calculate_summary(name).__dict__ if self.calculate_summary(name) else None,
                "trend": self.calculate_trend(name),
                "count": len(values)
            }
            for name, values in self.data.items()
        }
