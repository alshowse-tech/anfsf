"""
Evolution Harness - 自我进化层

职责:
- KPI 指标收集
- A/B 测试
- 自动优化
- 性能监控
"""

__version__ = "2.0.0"
__anfsf_version__ = "1.5.0"

from .kpi_collector import KPICollector
from .ab_tester import ABTester
from .optimizer import Optimizer
from .metrics import MetricsCalculator

__all__ = [
    "KPICollector",
    "ABTester",
    "Optimizer",
    "MetricsCalculator"
]
