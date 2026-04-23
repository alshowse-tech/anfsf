"""
Evolution Harness 单元测试
"""
import pytest
from datetime import datetime, timedelta
from harness.evolution.src.kpi_collector import KPICollector, KPI
from harness.evolution.src.ab_tester import ABTester, ABTest
from harness.evolution.src.optimizer import Optimizer
from harness.evolution.src.metrics import MetricsCalculator


class TestKPICollector:
    """KPI Collector 测试"""
    
    def test_collect_all(self):
        """测试 KPI 收集"""
        collector = KPICollector()
        
        # 收集指标
        kpis = collector.collect_all()
        
        # 验证返回 KPI 列表
        assert isinstance(kpis, list)
        assert len(kpis) > 0
        
        # 验证 KPI 结构
        for kpi in kpis:
            assert isinstance(kpi, KPI)
            assert kpi.name is not None
            assert kpi.value is not None
            assert kpi.unit is not None
    
    def test_get_kpis(self):
        """测试获取指标"""
        collector = KPICollector()
        
        # 收集指标
        kpis = collector.collect_all()
        
        # 获取特定指标
        api_kpis = [k for k in kpis if "api" in k.name.lower()]
        assert len(api_kpis) > 0


class TestABTester:
    """A/B Tester 测试"""
    
    def test_create_test(self):
        """测试创建 A/B 测试"""
        tester = ABTester()
        
        test = tester.create_test(
            name="test_latency",
            variants=["A", "B"],
            traffic_split={"A": 0.5, "B": 0.5},
            metric="latency",
            duration_days=1
        )
        
        assert isinstance(test, ABTest)
        assert test.name == "test_latency"
        assert test.variants == ["A", "B"]
        assert test.metric == "latency"
        assert test.status == "running"
    
    def test_assign_variant(self):
        """测试变体分配"""
        tester = ABTester()
        
        test = tester.create_test(
            name="test_assignment",
            variants=["A", "B", "C"],
            traffic_split={"A": 0.4, "B": 0.4, "C": 0.2},
            metric="conversion",
            duration_days=1
        )
        
        # 分配变体
        variant = tester.assign_variant("user_1", test.id)
        assert variant in ["A", "B", "C"]
        
        # 相同用户应获得相同变体
        variant2 = tester.assign_variant("user_1", test.id)
        assert variant2 == variant
    
    def test_record_and_analyze(self):
        """测试记录和分析"""
        tester = ABTester()
        
        test = tester.create_test(
            name="test_analysis",
            variants=["A", "B"],
            traffic_split={"A": 0.5, "B": 0.5},
            metric="revenue",
            duration_days=1
        )
        
        # 记录指标
        tester.record_metric(test.id, "A", 100.0)
        tester.record_metric(test.id, "A", 120.0)
        tester.record_metric(test.id, "B", 150.0)
        tester.record_metric(test.id, "B", 160.0)
        
        # 分析结果
        results = tester.analyze(test.id)
        assert len(results) == 2
        
        # B 应该是获胜者
        winner = next(r for r in results if r.is_winner)
        assert winner.variant == "B"
        assert winner.metric_value > 140.0


class TestOptimizer:
    """Optimizer 测试"""
    
    def test_create_optimization(self):
        """测试创建优化"""
        tester = ABTester()
        optimizer = Optimizer(tester)
        
        # 创建测试
        test = tester.create_test(
            name="test_optimization",
            variants=["A", "B"],
            traffic_split={"A": 0.5, "B": 0.5},
            metric="conversion",
            duration_days=1
        )
        
        # 记录数据使 B 获胜
        tester.record_metric(test.id, "A", 0.1)
        tester.record_metric(test.id, "B", 0.2)
        
        # 创建优化
        def mock_action(variant):
            return f"Applied {variant}"
        
        opt = optimizer.create_optimization(
            name="test_opt",
            test_id=test.id,
            action=mock_action,
            confidence_threshold=0.9,
            auto_apply=False
        )
        
        assert opt is not None
        assert opt.winning_variant == "B"


class TestMetricsCalculator:
    """Metrics Calculator 测试"""
    
    def test_calculate_summary(self):
        """测试计算汇总"""
        calculator = MetricsCalculator()
        
        # 记录数据
        values = [100, 120, 80, 150, 90]
        for v in values:
            calculator.record("latency", v)
        
        # 计算汇总
        summary = calculator.calculate_summary("latency")
        assert summary is not None
        assert summary.count == 5
        assert abs(summary.mean - 108.0) < 0.1
        assert summary.min == 80
        assert summary.max == 150
    
    def test_calculate_correlation(self):
        """测试计算相关性"""
        calculator = MetricsCalculator()
        
        # 记录两个相关指标
        for i in range(10):
            calculator.record("metric_a", i * 2)
            calculator.record("metric_b", i * 2 + 1)
        
        # 计算相关性（应该很高）
        correlation = calculator.calculate_correlation("metric_a", "metric_b")
        assert correlation is not None
        assert correlation > 0.9
