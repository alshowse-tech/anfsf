"""
A/B Tester - A/B 测试框架

执行和评估 A/B 测试
"""
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import random
import json
from loguru import logger


@dataclass
class ABTest:
    """A/B 测试定义"""
    id: str
    name: str
    variants: List[str]  # 变体名称 (A, B, C...)
    traffic_split: Dict[str, float]  # 流量分配
    metric: str  # 评估指标
    start_time: datetime
    end_time: datetime
    status: str = "running"  # running/paused/stopped
    results: Dict = field(default_factory=dict)


@dataclass
class TestResult:
    """测试结果"""
    test_id: str
    variant: str
    sample_size: int
    metric_value: float
    confidence: float
    is_winner: bool


class ABTester:
    """A/B 测试器"""
    
    def __init__(self):
        self.tests: Dict[str, ABTest] = {}
        self.assignments: Dict[str, str] = {}  # user_id -> variant
        self.metrics: Dict[str, Dict[str, List[float]]] = {}
    
    def create_test(
        self,
        name: str,
        variants: List[str],
        traffic_split: Dict[str, float],
        metric: str,
        duration_days: int = 7
    ) -> ABTest:
        """
        创建 A/B 测试
        
        Args:
            name: 测试名称
            variants: 变体列表
            traffic_split: 流量分配 (总和=1.0)
            metric: 评估指标
            duration_days: 测试天数
        
        Returns:
            A/B 测试对象
        """
        test_id = f"ab_{name}_{datetime.now().strftime('%Y%m%d')}"
        
        test = ABTest(
            id=test_id,
            name=name,
            variants=variants,
            traffic_split=traffic_split,
            metric=metric,
            start_time=datetime.now(),
            end_time=datetime.now() + timedelta(days=duration_days)
        )
        
        self.tests[test_id] = test
        self.metrics[test_id] = {v: [] for v in variants}
        
        logger.info(f"🧪 创建 A/B 测试：{name} ({test_id})")
        return test
    
    def assign_variant(self, user_id: str, test_id: str) -> Optional[str]:
        """
        为用户分配变体
        
        Args:
            user_id: 用户 ID
            test_id: 测试 ID
        
        Returns:
            分配的变体
        """
        if test_id not in self.tests:
            logger.error(f"❌ 测试不存在：{test_id}")
            return None
        
        # 检查是否已有分配
        assignment_key = f"{user_id}:{test_id}"
        if assignment_key in self.assignments:
            return self.assignments[assignment_key]
        
        test = self.tests[test_id]
        
        # 按流量分配随机选择
        rand = random.random()
        cumulative = 0.0
        
        for variant, split in test.traffic_split.items():
            cumulative += split
            if rand <= cumulative:
                self.assignments[assignment_key] = variant
                return variant
        
        # 默认最后一个
        variant = test.variants[-1]
        self.assignments[assignment_key] = variant
        return variant
    
    def record_metric(self, test_id: str, variant: str, value: float):
        """
        记录指标值
        
        Args:
            test_id: 测试 ID
            variant: 变体
            value: 指标值
        """
        if test_id not in self.metrics:
            logger.error(f"❌ 测试不存在：{test_id}")
            return
        
        if variant not in self.metrics[test_id]:
            logger.error(f"❌ 变体不存在：{variant}")
            return
        
        self.metrics[test_id][variant].append(value)
    
    def analyze(self, test_id: str) -> List[TestResult]:
        """
        分析测试结果
        
        Args:
            test_id: 测试 ID
        
        Returns:
            测试结果列表
        """
        if test_id not in self.tests:
            logger.error(f"❌ 测试不存在：{test_id}")
            return []
        
        test = self.tests[test_id]
        results = []
        
        # 计算每个变体的统计
        variant_stats = {}
        for variant in test.variants:
            values = self.metrics[test_id].get(variant, [])
            if values:
                variant_stats[variant] = {
                    'mean': sum(values) / len(values),
                    'count': len(values),
                    'values': values
                }
        
        # 找出最佳变体
        best_variant = max(
            variant_stats.keys(),
            key=lambda v: variant_stats[v]['mean'],
            default=None
        )
        
        # 生成结果
        for variant, stats in variant_stats.items():
            # 简化版置信度计算
            confidence = self._calculate_confidence(
                stats['values'],
                variant_stats.get(best_variant, {}).get('values', [])
            ) if variant != best_variant else 1.0
            
            results.append(TestResult(
                test_id=test_id,
                variant=variant,
                sample_size=stats['count'],
                metric_value=stats['mean'],
                confidence=confidence,
                is_winner=(variant == best_variant)
            ))
        
        return results
    
    def _calculate_confidence(self, values_a: List[float], values_b: List[float]) -> float:
        """计算置信度 (简化版)"""
        if not values_a or not values_b:
            return 0.0
        
        mean_a = sum(values_a) / len(values_a)
        mean_b = sum(values_b) / len(values_b)
        
        # 简化：基于均值差异
        diff = abs(mean_b - mean_a) / max(mean_a, mean_b, 1)
        return min(diff * 10, 0.99)  # 归一化到 0-1
    
    def get_test(self, test_id: str) -> Optional[ABTest]:
        """获取测试"""
        return self.tests.get(test_id)
    
    def stop_test(self, test_id: str) -> bool:
        """停止测试"""
        if test_id in self.tests:
            self.tests[test_id].status = "stopped"
            logger.info(f"⏹️ 停止测试：{test_id}")
            return True
        return False
    
    def get_active_tests(self) -> List[ABTest]:
        """获取活跃测试"""
        return [t for t in self.tests.values() if t.status == "running"]
    
    def export_results(self, test_id: str) -> Dict:
        """导出测试结果"""
        results = self.analyze(test_id)
        return {
            "test_id": test_id,
            "test_name": self.tests.get(test_id, {}).name if test_id in self.tests else "",
            "results": [
                {
                    "variant": r.variant,
                    "sample_size": r.sample_size,
                    "metric_value": r.metric_value,
                    "confidence": r.confidence,
                    "is_winner": r.is_winner
                }
                for r in results
            ]
        }
