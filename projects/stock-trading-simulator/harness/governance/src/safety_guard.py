"""
Safety Guard - 安全护栏

防止系统异常和危险操作
"""
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import defaultdict
from loguru import logger


@dataclass
class SafetyRule:
    """安全规则"""
    id: str
    name: str
    condition: callable
    action: callable
    cooldown_seconds: int = 300


@dataclass
class GuardEvent:
    """护栏事件"""
    rule_id: str
    triggered_at: datetime
    context: Dict
    action_taken: str


class SafetyGuard:
    """安全护栏"""
    
    def __init__(self):
        self.rules: List[SafetyRule] = []
        self.trigger_history: Dict[str, List[datetime]] = defaultdict(list)
        self.events: List[GuardEvent] = []
        self._register_default_rules()
    
    def _register_default_rules(self):
        """注册默认安全规则"""
        # API 频率限制
        self.register_rule(SafetyRule(
            id="safety_001",
            name="API 调用频率限制",
            condition=lambda ctx: self._check_api_rate_limit(ctx),
            action=lambda ctx: self._trigger_rate_limit(ctx),
            cooldown_seconds=60
        ))
        
        # 交易频率限制
        self.register_rule(SafetyRule(
            id="safety_002",
            name="日交易次数限制",
            condition=lambda ctx: self._check_daily_trade_count(ctx),
            action=lambda ctx: self._trigger_trade_limit(ctx),
            cooldown_seconds=0  # 日限制，无冷却
        ))
        
        # 异常价格检测
        self.register_rule(SafetyRule(
            id="safety_003",
            name="异常价格检测",
            condition=lambda ctx: self._check_abnormal_price(ctx),
            action=lambda ctx: self._trigger_price_alert(ctx),
            cooldown_seconds=300
        ))
        
        # 仓位异常检测
        self.register_rule(SafetyRule(
            id="safety_004",
            name="仓位异常检测",
            condition=lambda ctx: self._check_position_anomaly(ctx),
            action=lambda ctx: self._trigger_position_alert(ctx),
            cooldown_seconds=600
        ))
    
    def register_rule(self, rule: SafetyRule):
        """注册安全规则"""
        self.rules.append(rule)
        logger.debug(f"🛡️ 注册安全规则：{rule.id} - {rule.name}")
    
    def check(self, context: Dict) -> bool:
        """
        执行安全检查
        
        Args:
            context: 检查上下文
        
        Returns:
            是否安全
        """
        all_safe = True
        
        for rule in self.rules:
            try:
                # 检查冷却时间
                if self._is_in_cooldown(rule.id, rule.cooldown_seconds):
                    continue
                
                # 执行检查
                is_safe = rule.condition(context)
                
                if not is_safe:
                    # 触发保护动作
                    rule.action(context)
                    
                    # 记录事件
                    self._record_event(GuardEvent(
                        rule_id=rule.id,
                        triggered_at=datetime.now(),
                        context=context,
                        action_taken=rule.name
                    ))
                    
                    # 记录触发时间
                    self.trigger_history[rule.id].append(datetime.now())
                    
                    all_safe = False
                    
            except Exception as e:
                logger.error(f"安全检查失败：{rule.id}: {e}")
        
        return all_safe
    
    def _is_in_cooldown(self, rule_id: str, cooldown_seconds: int) -> bool:
        """检查是否在冷却期"""
        if cooldown_seconds == 0:
            return False
        
        history = self.trigger_history.get(rule_id, [])
        if not history:
            return False
        
        last_trigger = max(history)
        return (datetime.now() - last_trigger).total_seconds() < cooldown_seconds
    
    def _record_event(self, event: GuardEvent):
        """记录护栏事件"""
        self.events.append(event)
        logger.warning(f"🛡️ 安全护栏触发：{event.rule_id} - {event.action_taken}")
        
        # 保留最近 1000 个事件
        if len(self.events) > 1000:
            self.events = self.events[-1000:]
    
    # ========== 检查函数 ==========
    
    def _check_api_rate_limit(self, context: Dict) -> bool:
        """检查 API 频率限制"""
        # 简化实现：检查上下文中的调用次数
        api_calls = context.get("api_calls_last_minute", 0)
        return api_calls <= 100
    
    def _check_daily_trade_count(self, context: Dict) -> bool:
        """检查日交易次数"""
        daily_trades = context.get("daily_trades", 0)
        return daily_trades <= 20
    
    def _check_abnormal_price(self, context: Dict) -> bool:
        """检查异常价格"""
        price = context.get("price", 0)
        prev_close = context.get("prev_close", price)
        
        if prev_close == 0:
            return True
        
        change_pct = abs(price - prev_close) / prev_close
        return change_pct <= 0.1  # 涨跌幅不超过 10%
    
    def _check_position_anomaly(self, context: Dict) -> bool:
        """检查仓位异常"""
        position_pct = context.get("position_pct", 0)
        return position_pct <= 1.0  # 仓位不超过 100%
    
    # ========== 动作函数 ==========
    
    def _trigger_rate_limit(self, context: Dict):
        """触发频率限制"""
        logger.error(f"🚫 API 频率限制触发：{context.get('api_calls_last_minute', 0)} 次/分钟")
    
    def _trigger_trade_limit(self, context: Dict):
        """触发交易限制"""
        logger.error(f"🚫 日交易次数限制触发：{context.get('daily_trades', 0)} 次")
    
    def _trigger_price_alert(self, context: Dict):
        """触发价格告警"""
        logger.error(f"🚫 异常价格告警：{context.get('symbol')} 价格 {context.get('price')}")
    
    def _trigger_position_alert(self, context: Dict):
        """触发仓位告警"""
        logger.error(f"🚫 仓位异常告警：{context.get('position_pct', 0)*100:.1f}%")
    
    def get_events(self, limit: int = 100) -> List[GuardEvent]:
        """获取护栏事件"""
        return self.events[-limit:]
    
    def get_trigger_count(self, rule_id: str, window_minutes: int = 60) -> int:
        """获取规则触发次数"""
        cutoff = datetime.now() - timedelta(minutes=window_minutes)
        history = self.trigger_history.get(rule_id, [])
        return sum(1 for t in history if t > cutoff)
    
    def reset(self, rule_id: str = None):
        """重置护栏"""
        if rule_id:
            self.trigger_history.pop(rule_id, None)
        else:
            self.trigger_history.clear()
            self.events.clear()
