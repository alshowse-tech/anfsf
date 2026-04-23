"""
Audit Logger - 审计日志

记录所有重要操作和事件
"""
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
import json
from loguru import logger


@dataclass
class AuditEntry:
    """审计条目"""
    id: str
    timestamp: datetime
    user_id: str
    action: str
    resource: str
    resource_id: str
    details: Dict = field(default_factory=dict)
    result: str = "success"  # success/failure
    ip_address: str = ""
    user_agent: str = ""


class AuditLogger:
    """审计日志器"""
    
    def __init__(self):
        self.entries: List[AuditEntry] = []
        self.max_entries = 100000
    
    def log(
        self,
        user_id: str,
        action: str,
        resource: str,
        resource_id: str,
        details: Dict = None,
        result: str = "success",
        ip_address: str = "",
        user_agent: str = ""
    ) -> AuditEntry:
        """
        记录审计日志
        
        Args:
            user_id: 用户 ID
            action: 动作
            resource: 资源
            resource_id: 资源 ID
            details: 详细信息
            result: 结果
            ip_address: IP 地址
            user_agent: 用户代理
        
        Returns:
            审计条目
        """
        import uuid
        
        entry = AuditEntry(
            id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            details=details or {},
            result=result,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.entries.append(entry)
        
        # 清理过期日志
        if len(self.entries) > self.max_entries:
            self._cleanup()
        
        logger.info(f"📝 审计：{user_id} {action} {resource}/{resource_id} - {result}")
        
        return entry
    
    def log_trade(
        self,
        user_id: str,
        symbol: str,
        side: str,
        quantity: int,
        price: float,
        result: str = "success"
    ) -> AuditEntry:
        """记录交易日志"""
        return self.log(
            user_id=user_id,
            action="trade",
            resource="order",
            resource_id=symbol,
            details={
                "side": side,
                "quantity": quantity,
                "price": price
            },
            result=result
        )
    
    def log_signal(
        self,
        user_id: str,
        symbol: str,
        signal_type: str,
        rule_ids: List[str]
    ) -> AuditEntry:
        """记录信号日志"""
        return self.log(
            user_id=user_id,
            action="signal",
            resource="signal",
            resource_id=symbol,
            details={
                "signal_type": signal_type,
                "rule_ids": rule_ids
            }
        )
    
    def log_login(
        self,
        user_id: str,
        ip_address: str,
        user_agent: str,
        result: str = "success"
    ) -> AuditEntry:
        """记录登录日志"""
        return self.log(
            user_id=user_id,
            action="login",
            resource="auth",
            resource_id=user_id,
            result=result,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    def log_policy_violation(
        self,
        user_id: str,
        policy_id: str,
        context: Dict
    ) -> AuditEntry:
        """记录政策违日志"""
        return self.log(
            user_id=user_id,
            action="policy_violation",
            resource="policy",
            resource_id=policy_id,
            details=context,
            result="failure"
        )
    
    def log_veto(
        self,
        user_id: str,
        veto_id: str,
        context: Dict
    ) -> AuditEntry:
        """记录 Veto 日志"""
        return self.log(
            user_id=user_id,
            action="veto",
            resource="veto",
            resource_id=veto_id,
            details=context,
            result="failure"
        )
    
    def query(
        self,
        user_id: str = None,
        action: str = None,
        resource: str = None,
        start_time: datetime = None,
        end_time: datetime = None,
        result: str = None,
        limit: int = 100
    ) -> List[AuditEntry]:
        """查询审计日志"""
        results = self.entries
        
        if user_id:
            results = [e for e in results if e.user_id == user_id]
        
        if action:
            results = [e for e in results if e.action == action]
        
        if resource:
            results = [e for e in results if e.resource == resource]
        
        if start_time:
            results = [e for e in results if e.timestamp >= start_time]
        
        if end_time:
            results = [e for e in results if e.timestamp <= end_time]
        
        if result:
            results = [e for e in results if e.result == result]
        
        return results[-limit:]
    
    def _cleanup(self):
        """清理过期日志 (保留最近 50000 条)"""
        self.entries = self.entries[-50000:]
    
    def export_json(self, filename: str):
        """导出审计日志到 JSON"""
        data = [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat(),
                "user_id": e.user_id,
                "action": e.action,
                "resource": e.resource,
                "resource_id": e.resource_id,
                "details": e.details,
                "result": e.result,
                "ip_address": e.ip_address,
                "user_agent": e.user_agent
            }
            for e in self.entries
        ]
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"📁 审计日志导出到：{filename}")
    
    def get_statistics(self, window_hours: int = 24) -> Dict:
        """获取统计信息"""
        from datetime import timedelta
        
        cutoff = datetime.now() - timedelta(hours=window_hours)
        recent = [e for e in self.entries if e.timestamp > cutoff]
        
        return {
            "total_entries": len(recent),
            "by_action": self._count_by_field(recent, "action"),
            "by_result": self._count_by_field(recent, "result"),
            "by_user": self._count_by_field(recent, "user_id"),
            "failure_rate": sum(1 for e in recent if e.result == "failure") / len(recent) if recent else 0
        }
    
    def _count_by_field(self, entries: List[AuditEntry], field: str) -> Dict:
        """按字段统计"""
        from collections import Counter
        values = [getattr(e, field) for e in entries]
        return dict(Counter(values))
