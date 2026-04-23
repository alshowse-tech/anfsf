"""
Veto Engine - Veto 规则引擎

执行硬性和软性 Veto 规则
"""
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from loguru import logger


class VetoType(Enum):
    """Veto 类型"""
    HARD = "hard"  # 硬性 Veto (必须遵守)
    SOFT = "soft"  # 软性 Veto (建议遵守)


@dataclass
class VetoRule:
    """Veto 规则"""
    id: str
    name: str
    veto_type: VetoType
    condition: callable
    message: str


@dataclass
class VetoResult:
    """Veto 结果"""
    approved: bool
    vetoes: List[str]
    warnings: List[str]
    details: Dict


class VetoEngine:
    """Veto 引擎"""
    
    def __init__(self):
        self.rules: List[VetoRule] = []
        self._register_default_rules()
    
    def _register_default_rules(self):
        """注册默认 Veto 规则"""
        # 硬性 Veto - 仓位限制
        self.register_rule(VetoRule(
            id="veto_001",
            name="单票最大仓位",
            veto_type=VetoType.HARD,
            condition=lambda ctx: ctx.get("position_pct", 0) <= 0.4,
            message="单票仓位不能超过 40%"
        ))
        
        self.register_rule(VetoRule(
            id="veto_002",
            name="非主线最大仓位",
            veto_type=VetoType.HARD,
            condition=lambda ctx: ctx.get("non_mainline_pct", 0) <= 0.2,
            message="非主线仓位不能超过 20%"
        ))
        
        self.register_rule(VetoRule(
            id="veto_003",
            name="总仓位限制",
            veto_type=VetoType.HARD,
            condition=lambda ctx: ctx.get("total_position_pct", 0) <= 0.8,
            message="总仓位不能超过 80%"
        ))
        
        # 软性 Veto - 选股条件
        self.register_rule(VetoRule(
            id="veto_004",
            name="RPS 要求",
            veto_type=VetoType.SOFT,
            condition=lambda ctx: all(
                ctx.get(f"rps_{period}", 0) > 90
                for period in [10, 20, 50]
            ),
            message="建议 RPS(10/20/50) > 90"
        ))
        
        self.register_rule(VetoRule(
            id="veto_005",
            name="5 日线要求",
            veto_type=VetoType.SOFT,
            condition=lambda ctx: ctx.get("price_above_ma5", False),
            message="建议站上 5 日线"
        ))
    
    def register_rule(self, rule: VetoRule):
        """注册 Veto 规则"""
        self.rules.append(rule)
        logger.debug(f"🛑 注册 Veto 规则：{rule.id} - {rule.name}")
    
    def check(self, context: Dict) -> VetoResult:
        """
        执行 Veto 检查
        
        Args:
            context: 检查上下文
        
        Returns:
            Veto 结果
        """
        vetoes = []
        warnings = []
        
        for rule in self.rules:
            try:
                passed = rule.condition(context)
                
                if not passed:
                    if rule.veto_type == VetoType.HARD:
                        vetoes.append(rule.message)
                        logger.warning(f"🛑 硬性 Veto 触发：{rule.name}")
                    else:
                        warnings.append(rule.message)
                        logger.debug(f"⚠️ 软性 Veto 触发：{rule.name}")
                        
            except Exception as e:
                logger.error(f"Veto 规则执行失败：{rule.id}: {e}")
        
        return VetoResult(
            approved=len(vetoes) == 0,
            vetoes=vetoes,
            warnings=warnings,
            details=context
        )
    
    def check_trade(self, trade_context: Dict) -> VetoResult:
        """
        检查交易
        
        Args:
            trade_context: 交易上下文
                - symbol: 股票代码
                - quantity: 数量
                - price: 价格
                - current_positions: 当前持仓
                - total_assets: 总资产
        
        Returns:
            Veto 结果
        """
        # 计算仓位
        trade_value = trade_context.get("quantity", 0) * trade_context.get("price", 0)
        total_assets = trade_context.get("total_assets", 1000000)
        
        # 计算当前持仓
        current_positions = trade_context.get("current_positions", {})
        symbol = trade_context.get("symbol")
        
        # 计算单票仓位
        current_stock_value = current_positions.get(symbol, {}).get("market_value", 0)
        new_position_pct = (current_stock_value + trade_value) / total_assets
        
        # 计算总仓位
        total_position_value = sum(
            pos.get("market_value", 0)
            for pos in current_positions.values()
        )
        total_position_pct = (total_position_value + trade_value) / total_assets
        
        # 是否为主线
        is_mainline = trade_context.get("is_mainline", True)
        non_mainline_pct = 0 if is_mainline else new_position_pct
        
        context = {
            "position_pct": new_position_pct,
            "non_mainline_pct": non_mainline_pct,
            "total_position_pct": total_position_pct,
            "rps_10": trade_context.get("rps_10", 95),
            "rps_20": trade_context.get("rps_20", 93),
            "rps_50": trade_context.get("rps_50", 90),
            "price_above_ma5": trade_context.get("price_above_ma5", True)
        }
        
        return self.check(context)
