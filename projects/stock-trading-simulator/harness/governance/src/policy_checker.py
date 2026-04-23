"""
Policy Checker - Policy 检查器

检查操作是否符合政策要求
"""
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
from loguru import logger


class PolicyType(Enum):
    """政策类型"""
    TRADING = "trading"  # 交易政策
    RISK = "risk"  # 风控政策
    COMPLIANCE = "compliance"  # 合规政策
    POSITION = "position"  # 仓位政策


@dataclass
class Policy:
    """政策定义"""
    id: str
    name: str
    policy_type: PolicyType
    rule: callable
    severity: str  # low/medium/high/critical
    message: str


@dataclass
class PolicyResult:
    """政策检查结果"""
    passed: bool
    violations: List[str]
    warnings: List[str]
    details: Dict


class PolicyChecker:
    """政策检查器"""
    
    def __init__(self):
        self.policies: List[Policy] = []
        self._register_default_policies()
    
    def _register_default_policies(self):
        """注册默认政策"""
        # 交易政策
        self.register_policy(Policy(
            id="policy_001",
            name="交易时间限制",
            policy_type=PolicyType.TRADING,
            rule=lambda ctx: self._check_trading_time(ctx),
            severity="high",
            message="只能在交易时间内交易"
        ))
        
        # 风控政策
        self.register_policy(Policy(
            id="policy_002",
            name="单笔交易限额",
            policy_type=PolicyType.RISK,
            rule=lambda ctx: ctx.get("trade_value", 0) <= 500000,
            severity="critical",
            message="单笔交易不能超过 50 万"
        ))
        
        # 合规政策
        self.register_policy(Policy(
            id="policy_003",
            name="ST 股票限制",
            policy_type=PolicyType.COMPLIANCE,
            rule=lambda ctx: not ctx.get("is_st", False),
            severity="high",
            message="不能交易 ST 股票"
        ))
        
        # 仓位政策
        self.register_policy(Policy(
            id="policy_004",
            name="行业集中度",
            policy_type=PolicyType.POSITION,
            rule=lambda ctx: ctx.get("sector_position_pct", 0) <= 0.5,
            severity="medium",
            message="单一行业仓位不能超过 50%"
        ))
    
    def register_policy(self, policy: Policy):
        """注册政策"""
        self.policies.append(policy)
        logger.debug(f"📋 注册政策：{policy.id} - {policy.name}")
    
    def check(self, context: Dict) -> PolicyResult:
        """
        执行政策检查
        
        Args:
            context: 检查上下文
        
        Returns:
            检查结果
        """
        violations = []
        warnings = []
        
        for policy in self.policies:
            try:
                passed = policy.rule(context)
                
                if not passed:
                    if policy.severity in ["high", "critical"]:
                        violations.append(policy.message)
                        logger.warning(f"🚫 政策违反 [{policy.severity}]: {policy.name}")
                    else:
                        warnings.append(policy.message)
                        logger.debug(f"⚠️ 政策警告：{policy.name}")
                        
            except Exception as e:
                logger.error(f"政策执行失败：{policy.id}: {e}")
        
        return PolicyResult(
            passed=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            details=context
        )
    
    def _check_trading_time(self, context: Dict) -> bool:
        """检查交易时间"""
        from datetime import datetime, time
        
        now = datetime.now().time()
        
        # 早盘：9:30-11:30
        morning_start = time(9, 30)
        morning_end = time(11, 30)
        
        # 午盘：13:00-15:00
        afternoon_start = time(13, 0)
        afternoon_end = time(15, 0)
        
        is_trading_time = (
            (morning_start <= now <= morning_end) or
            (afternoon_start <= now <= afternoon_end)
        )
        
        # 周末不交易
        is_weekday = datetime.now().weekday() < 5
        
        return is_trading_time and is_weekday
    
    def check_trade(self, trade_context: Dict) -> PolicyResult:
        """
        检查交易
        
        Args:
            trade_context: 交易上下文
                - symbol: 股票代码
                - quantity: 数量
                - price: 价格
                - is_st: 是否 ST
        
        Returns:
            政策检查结果
        """
        # 计算交易金额
        trade_value = trade_context.get("quantity", 0) * trade_context.get("price", 0)
        
        context = {
            **trade_context,
            "trade_value": trade_value
        }
        
        return self.check(context)
    
    def get_policies_by_type(self, policy_type: PolicyType) -> List[Policy]:
        """按类型获取政策"""
        return [p for p in self.policies if p.policy_type == policy_type]
    
    def get_all_policies(self) -> List[Dict]:
        """获取所有政策"""
        return [
            {
                "id": p.id,
                "name": p.name,
                "type": p.policy_type.value,
                "severity": p.severity,
                "message": p.message
            }
            for p in self.policies
        ]
