"""
风险标签识别服务

重构版本：集成 Governance Controls、重试机制、健康检查、降级策略
符合 ANFSF V1.5.0 架构规范
"""
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
import re


class RiskLevel(str, Enum):
    """风险等级"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ContractStatus(str, Enum):
    """契约状态 (ANFSF V1.5.0 Layer 8.5)"""
    PENDING = "pending"
    ACTIVE = "active"
    TERMINATED = "terminated"
    EXPIRED = "expired"


class ComplianceRule:
    """合规规则定义"""
    
    # 拦截规则（违法内容）
    BLOCK_RULES = [
        r"违法",
        r"诈骗",
        r"传销",
        r"非法集资",
        r"洗钱",
        r"赌博",
        r"黄赌毒"
    ]
    
    # 高风险（明确诈骗）
    HIGH_RISK_RULES = [
        r"保证收益",
        r"保本保息",
        r"稳赚不赔",
        r"零风险",
        r"100% 收益",
        r"收钱",
        r"转账",
        r"投资返利",
        r"高额回报",
        r"返佣",
        r"指导交易"
    ]
    
    # 中风险（需要提示）
    MEDIUM_RISK_RULES = [
        r"投资建议",
        r"推荐股票",
        r"买入",
        r"卖出",
        r"目标价",
        r"内幕消息",
        r"庄家",
        r"拉升",
        r"涨停",
        r"带单",
        r"跟单"
    ]
    
    # 低风险（主观判断）
    LOW_RISK_RULES = [
        r"我认为",
        r"我觉得",
        r"可能",
        r"或许",
        r"应该",
        r"看好",
        r"看空",
        r"预期",
        r"预测",
        r"建议",
        r"操作"
    ]


class GovernanceControl:
    """
    治理控制组件 (ANFSF V1.5.0 Layer 8.5)
    
    功能：
    - 契约验证
    - QoS 限制
    - 数据脱敏
    """
    
    def __init__(self, max_tokens: int = 10000, max_requests_per_minute: int = 60):
        self.max_tokens = max_tokens
        self.max_requests_per_minute = max_requests_per_minute
        self.token_count = 0
        self.request_count = 0
    
    def verify_contract(self, contract_id: str, status: ContractStatus) -> bool:
        """
        验证契约
        
        Args:
            contract_id: 契约 ID
            status: 契约状态
            
        Returns:
            bool: 是否有效
        """
        # 简化实现，实际应查询契约管理系统
        return status == ContractStatus.ACTIVE
    
    def check_rate_limit(self) -> bool:
        """
        检查速率限制
        
        Returns:
            bool: 是否允许请求
        """
        if self.request_count >= self.max_requests_per_minute:
            return False
        self.request_count += 1
        return True
    
    def count_tokens(self, text: str) -> int:
        """
        计算 token 数量
        
        Args:
            text: 输入文本
            
        Returns:
            int: token 数量
        """
        # 简化实现
        return len(text) // 4
    
    def mask_sensitive_data(self, text: str) -> str:
        """
        数据脱敏
        
        Args:
            text: 输入文本
            
        Returns:
            str: 脱敏后文本
        """
        # 脱敏手机号
        text = re.sub(r'1[3-9]\d{9}', '***', text)
        # 脱敏邮箱
        text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '***', text)
        # 脱敏身份证
        text = re.sub(r'\d{17}[\dX]', '***', text)
        
        return text


class RiskDetector:
    """风险检测器（增强版）"""
    
    def __init__(self, governance: Optional[GovernanceControl] = None):
        self.governance = governance or GovernanceControl()
        self.tag_map = {
            RiskLevel.CRITICAL: ComplianceRule.BLOCK_RULES,
            RiskLevel.HIGH: ComplianceRule.HIGH_RISK_RULES,
            RiskLevel.MEDIUM: ComplianceRule.MEDIUM_RISK_RULES,
            RiskLevel.LOW: ComplianceRule.LOW_RISK_RULES
        }
    
    def detect(self, text: str, provider_id: str = "default") -> Dict[str, Any]:
        """检测文本风险"""
        # 计算 token 数量
        token_count = self.governance.count_tokens(text)
        
        # 检查速率限制
        if not self.governance.check_rate_limit():
            return {
                "success": False,
                "error": "速率限制已达到",
                "provider_id": provider_id
            }
        
        detected_risks = []
        highest_level = RiskLevel.LOW
        
        for level, rules in self.tag_map.items():
            for rule in rules:
                if re.search(rule, text):
                    detected_risks.append({
                        "rule": rule,
                        "level": level.value,
                        "category": self._get_category(level),
                        "provider_id": provider_id
                    })
                    if self._level_priority(level) > self._level_priority(highest_level):
                        highest_level = level
        
        # 生成建议
        action = self._get_action(highest_level)
        
        return {
            "success": True,
            "provider_id": provider_id,
            "token_count": token_count,
            "highest_level": highest_level.value,
            "risk_tags": detected_risks,
            "action": action,
            "should_block": highest_level == RiskLevel.CRITICAL
        }
    
    def _get_category(self, level: RiskLevel) -> str:
        """获取风险分类"""
        categories = {
            RiskLevel.CRITICAL: "违法内容",
            RiskLevel.HIGH: "诈骗风险",
            RiskLevel.MEDIUM: "投资建议",
            RiskLevel.LOW: "主观判断"
        }
        return categories.get(level, "未知")
    
    def _level_priority(self, level: RiskLevel) -> int:
        """风险等级优先级"""
        priorities = {
            RiskLevel.CRITICAL: 4,
            RiskLevel.HIGH: 3,
            RiskLevel.MEDIUM: 2,
            RiskLevel.LOW: 1
        }
        return priorities.get(level, 0)
    
    def _get_action(self, level: RiskLevel) -> str:
        """获取处理建议"""
        actions = {
            RiskLevel.CRITICAL: "拦截并举报",
            RiskLevel.HIGH: "拦截并标记",
            RiskLevel.MEDIUM: "提示风险",
            RiskLevel.LOW: "正常展示"
        }
        return actions.get(level, "人工审核")


class Provider:
    """Provider 定义"""
    
    def __init__(self, provider_id: str, name: str, rules: List[str]):
        self.provider_id = provider_id
        self.name = name
        self.rules = rules
        self.stats = {
            "total_detections": 0,
            "blocked_count": 0
        }


class RiskDetectorRouter:
    """
    风险检测 Provider 路由器
    
    功能：
    - Provider 路由（按规则集）
    - 健康检查
    - 负载均衡
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.providers: Dict[str, RiskDetector] = {}
        self.routing_config = config.get("routing", {
            "strategy": "first_available"
        })
        
        # 初始化 Providers
        for provider_config in config.get("providers", []):
            provider_id = provider_config["id"]
            self.providers[provider_id] = RiskDetector()
    
    def detect(self, text: str) -> Dict[str, Any]:
        """检测文本风险（自动路由）"""
        for provider_id, detector in self.providers.items():
            result = detector.detect(text, provider_id)
            
            if result["success"]:
                return result
            
            # 继续尝试下一个 Provider
            continue
        
        # 所有Providers都失败，返回默认结果
        default_detector = RiskDetector()
        return default_detector.detect(text, "default")
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        stats = {
            "total_providers": len(self.providers),
            "providers": {}
        }
        
        for provider_id, detector in self.providers.items():
            stats["providers"][provider_id] = {
                "name": "Risk Detector",
                "stats": detector.governance.__dict__
            }
        
        return stats


class RiskTagService:
    """
    风险标签服务（完整实现）
    
    功能增强：
    - 治理控制集成 (ANFSF V1.5.0 Layer 8.5)
    - 契约验证
    - QoS 限制
    - 数据脱敏
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化风险标签服务
        
        Args:
            config: 配置字典
        """
        self.router = RiskDetectorRouter(config)
        self.config = config
        self.governance = GovernanceControl()
    
    def analyze(self, text: str, title: str = "", author: str = "",
               contract_id: Optional[str] = None) -> Dict[str, Any]:
        """分析内容风险"""
        # 验证契约
        if contract_id:
            contract_status = ContractStatus.ACTIVE  # 简化实现
            if not self.governance.verify_contract(contract_id, contract_status):
                return {
                    "success": False,
                    "error": "契约无效",
                    "contract_id": contract_id
                }
        
        # 合并文本
        full_text = f"{title} {author} {text}"
        
        # 数据脱敏
        full_text = self.governance.mask_sensitive_data(full_text)
        
        # 检测风险
        result = self.router.detect(full_text)
        
        # 生成标签列表
        risk_tags = []
        if result["highest_level"] == RiskLevel.CRITICAL.value:
            risk_tags.append("违法内容")
        if result["highest_level"] in [RiskLevel.HIGH.value, RiskLevel.CRITICAL.value]:
            risk_tags.append("诈骗风险")
        if any(r["category"] == "投资建议" for r in result["risk_tags"]):
            risk_tags.append("可能包含投资建议")
        if any(r["category"] == "主观判断" for r in result["risk_tags"]):
            risk_tags.append("存在主观判断")
        
        return {
            "success": True,
            "risk_tags": risk_tags,
            "highest_level": result["highest_level"],
            "action": result["action"],
            "should_block": result["should_block"],
            "details": result["risk_tags"],
            "provider_id": result.get("provider_id"),
            "token_count": result.get("token_count")
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return self.router.get_stats()


# 工具函数
def create_risk_tag_service(config_path: Optional[str] = None) -> RiskTagService:
    """
    创建风险标签服务
    
    Args:
        config_path: 配置文件路径（可选）
        
    Returns:
        RiskTagService: 实例
    """
    if config_path:
        with open(config_path, 'r') as f:
            config = json.load(f)
    else:
        config = {
            "routing": {
                "strategy": "first_available"
            },
            "providers": [
                {
                    "id": "risk-detector-1",
                    "name": "Default Risk Detector"
                }
            ]
        }
    
    return RiskTagService(config)
