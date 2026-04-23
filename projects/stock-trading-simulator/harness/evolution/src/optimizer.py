"""
Optimizer - 自动优化器

基于 A/B 测试结果自动应用优化
"""
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass
from datetime import datetime
import asyncio
from loguru import logger

from .ab_tester import ABTester, TestResult


@dataclass
class Optimization:
    """优化配置"""
    id: str
    name: str
    test_id: str
    winning_variant: str
    action: Callable
    confidence_threshold: float
    auto_apply: bool
    status: str = "pending"  # pending/approved/applied/rejected


class Optimizer:
    """自动优化器"""
    
    def __init__(self, ab_tester: ABTester):
        self.ab_tester = ab_tester
        self.optimizations: Dict[str, Optimization] = {}
        self.applied_optimizations: List[str] = []
    
    def create_optimization(
        self,
        name: str,
        test_id: str,
        action: Callable,
        confidence_threshold: float = 0.95,
        auto_apply: bool = True
    ) -> Optimization:
        """
        创建优化配置
        
        Args:
            name: 优化名称
            test_id: 关联的 A/B 测试 ID
            action: 优化动作函数
            confidence_threshold: 置信度阈值
            auto_apply: 是否自动应用
        
        Returns:
            优化配置
        """
        opt_id = f"opt_{name}_{datetime.now().strftime('%Y%m%d')}"
        
        # 分析测试结果
        results = self.ab_tester.analyze(test_id)
        winner = next((r for r in results if r.is_winner), None)
        
        if not winner:
            logger.error(f"❌ 测试无获胜者：{test_id}")
            return None
        
        opt = Optimization(
            id=opt_id,
            name=name,
            test_id=test_id,
            winning_variant=winner.variant,
            action=action,
            confidence_threshold=confidence_threshold,
            auto_apply=auto_apply,
            status="pending" if winner.confidence < confidence_threshold else "approved"
        )
        
        self.optimizations[opt_id] = opt
        logger.info(f"✨ 创建优化：{name} (置信度：{winner.confidence:.2%})")
        
        return opt
    
    async def apply_optimization(self, opt_id: str) -> bool:
        """
        应用优化
        
        Args:
            opt_id: 优化 ID
        
        Returns:
            是否成功
        """
        if opt_id not in self.optimizations:
            logger.error(f"❌ 优化不存在：{opt_id}")
            return False
        
        opt = self.optimizations[opt_id]
        
        # 检查状态
        if opt.status == "applied":
            logger.warning(f"⚠️ 优化已应用：{opt_id}")
            return True
        
        if opt.status == "rejected":
            logger.warning(f"⚠️ 优化已拒绝：{opt_id}")
            return False
        
        # 检查置信度
        results = self.ab_tester.analyze(opt.test_id)
        winner = next((r for r in results if r.is_winner), None)
        
        if not winner or winner.confidence < opt.confidence_threshold:
            logger.warning(f"⚠️ 置信度不足：{winner.confidence:.2%} < {opt.confidence_threshold:.2%}")
            if not opt.auto_apply:
                return False
        
        # 执行优化动作
        try:
            logger.info(f"🚀 应用优化：{opt.name}")
            
            if asyncio.iscoroutinefunction(opt.action):
                await opt.action(opt.winning_variant)
            else:
                opt.action(opt.winning_variant)
            
            opt.status = "applied"
            self.applied_optimizations.append(opt_id)
            
            logger.info(f"✅ 优化应用成功：{opt.name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ 优化应用失败：{e}")
            opt.status = "rejected"
            return False
    
    async def apply_all_pending(self) -> Dict[str, bool]:
        """应用所有待处理的优化"""
        results = {}
        
        for opt_id, opt in self.optimizations.items():
            if opt.status == "pending" or (opt.status == "approved" and opt.auto_apply):
                results[opt_id] = await self.apply_optimization(opt_id)
        
        return results
    
    def get_optimization(self, opt_id: str) -> Optional[Optimization]:
        """获取优化配置"""
        return self.optimizations.get(opt_id)
    
    def get_pending_optimizations(self) -> List[Optimization]:
        """获取待处理的优化"""
        return [o for o in self.optimizations.values() if o.status in ["pending", "approved"]]
    
    def get_applied_optimizations(self) -> List[str]:
        """获取已应用的优化 ID 列表"""
        return self.applied_optimizations.copy()
    
    def rollback_optimization(self, opt_id: str) -> bool:
        """回滚优化"""
        if opt_id not in self.optimizations:
            return False
        
        opt = self.optimizations[opt_id]
        if opt.status != "applied":
            logger.warning(f"⚠️ 优化未应用，无法回滚：{opt_id}")
            return False
        
        # TODO: 实现回滚逻辑
        logger.info(f"🔙 回滚优化：{opt.name}")
        opt.status = "rolled_back"
        
        if opt_id in self.applied_optimizations:
            self.applied_optimizations.remove(opt_id)
        
        return True
