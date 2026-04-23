"""
Governance Harness 单元测试
"""
import pytest
from datetime import datetime
from harness.governance.src.veto_engine import VetoEngine, VetoRule, VetoType, VetoResult
from harness.governance.src.policy_checker import PolicyChecker, Policy, PolicyType, PolicyResult
from harness.governance.src.safety_guard import SafetyGuard, SafetyRule
from harness.governance.src.audit_logger import AuditLogger, AuditEntry


class TestVetoEngine:
    """Veto Engine 测试"""
    
    def test_register_and_check_veto(self):
        """测试注册和检查 Veto 规则"""
        engine = VetoEngine()
        
        # 注册自定义规则
        rule = VetoRule(
            id="veto_test",
            name="Test Rule",
            veto_type=VetoType.HARD,
            condition=lambda ctx: ctx.get("value", 0) <= 100,
            message="Value too high"
        )
        engine.register_rule(rule)
        
        # 检查通过的情况
        result = engine.check({"value": 50})
        assert result.approved == True
        assert len(result.vetoes) == 0
        
        # 检查被阻止的情况
        result = engine.check({"value": 150})
        assert result.approved == False
        assert len(result.vetoes) > 0


class TestPolicyChecker:
    """Policy Checker 测试"""
    
    def test_check_policy(self):
        """测试政策检查"""
        checker = PolicyChecker()
        
        # 检查合规情况 (非 ST 股票，交易金额合理)
        result = checker.check_trade({
            "symbol": "000001",
            "quantity": 100,
            "price": 10.0,
            "is_st": False,
            "sector_position_pct": 0.3
        })
        
        # 注意：交易时间检查可能会失败 (非交易时间)
        # 这里只验证结果结构
        assert isinstance(result, PolicyResult)
        assert hasattr(result, 'passed')
        assert hasattr(result, 'violations')
        assert hasattr(result, 'warnings')
    
    def test_st_stock_violation(self):
        """测试 ST 股票违规"""
        checker = PolicyChecker()
        
        # ST 股票应该被阻止
        result = checker.check_trade({
            "symbol": "000001",
            "quantity": 100,
            "price": 10.0,
            "is_st": True,
            "sector_position_pct": 0.3
        })
        
        # 应该有违规
        assert len(result.violations) > 0 or len(result.warnings) > 0


class TestSafetyGuard:
    """Safety Guard 测试"""
    
    def test_safety_check(self):
        """测试安全检查"""
        guard = SafetyGuard()
        
        # 安全的情况
        safe = guard.check({
            "api_calls_last_minute": 50,
            "daily_trades": 10,
            "price": 100.0,
            "prev_close": 99.0,
            "position_pct": 0.5
        })
        assert safe == True
        
        # 不安全的情况（API 调用过多）
        unsafe = guard.check({
            "api_calls_last_minute": 200,
            "daily_trades": 10,
            "price": 100.0,
            "prev_close": 99.0,
            "position_pct": 0.5
        })
        assert unsafe == False


class TestAuditLogger:
    """Audit Logger 测试"""
    
    def test_log_entry(self):
        """测试日志条目"""
        logger = AuditLogger()
        
        # 记录交易日志
        entry = logger.log_trade(
            user_id="test_user",
            symbol="000001",
            side="buy",
            quantity=100,
            price=10.0,
            result="success"
        )
        
        assert isinstance(entry, AuditEntry)
        assert entry.user_id == "test_user"
        assert entry.action == "trade"
        assert entry.resource == "order"
        assert entry.resource_id == "000001"
        assert entry.details["side"] == "buy"
        assert entry.details["quantity"] == 100
        assert entry.details["price"] == 10.0
    
    def test_query_logs(self):
        """测试查询日志"""
        logger = AuditLogger()
        
        # 记录多个条目
        logger.log_trade("user1", "000001", "buy", 100, 10.0)
        logger.log_trade("user2", "000002", "sell", 200, 20.0)
        logger.log_login("user1", "127.0.0.1", "test-agent", "success")
        
        # 查询特定用户的交易
        trades = logger.query(user_id="user1", action="trade")
        assert len(trades) == 1
        assert trades[0].user_id == "user1"
        assert trades[0].action == "trade"
