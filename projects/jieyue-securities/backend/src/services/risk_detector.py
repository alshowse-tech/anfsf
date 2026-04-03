# 风险标签识别服务
from typing import Dict, Any, List, Tuple
from enum import Enum

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskTag:
    """风险标签定义"""
    
    # 拦截规则（违法内容）
    BLOCK_KEYWORDS = [
        "违法", "诈骗", "传销", "非法集资", "洗钱"
    ]
    
    # 高风险（明确诈骗）
    HIGH_RISK_KEYWORDS = [
        "保证收益", "保本保息", "稳赚不赔", "零风险", "100% 收益",
        "收钱", "转账", "投资返利", "高额回报"
    ]
    
    # 中风险（需要提示）
    MEDIUM_RISK_KEYWORDS = [
        "投资建议", "推荐股票", "买入", "卖出", "目标价",
        "内幕消息", "庄家", "拉升", "涨停"
    ]
    
    # 低风险（主观判断）
    LOW_RISK_KEYWORDS = [
        "我认为", "我觉得", "可能", "或许", "应该",
        "看好", "看空", "预期", "预测"
    ]


class RiskDetector:
    """风险检测器"""
    
    def __init__(self):
        self.tag_map = {
            RiskLevel.CRITICAL: RiskTag.BLOCK_KEYWORDS,
            RiskLevel.HIGH: RiskTag.HIGH_RISK_KEYWORDS,
            RiskLevel.MEDIUM: RiskTag.MEDIUM_RISK_KEYWORDS,
            RiskLevel.LOW: RiskTag.LOW_RISK_KEYWORDS
        }
    
    def detect(self, text: str) -> Dict[str, Any]:
        """检测文本风险"""
        detected_risks = []
        highest_level = RiskLevel.LOW
        
        for level, keywords in self.tag_map.items():
            for keyword in keywords:
                if keyword in text:
                    detected_risks.append({
                        "keyword": keyword,
                        "level": level.value,
                        "category": self._get_category(level)
                    })
                    if self._level_priority(level) > self._level_priority(highest_level):
                        highest_level = level
        
        # 生成建议
        action = self._get_action(highest_level)
        
        return {
            "success": True,
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


class RiskTagService:
    """风险标签服务"""
    
    def __init__(self):
        self.detector = RiskDetector()
    
    def analyze(self, text: str, title: str = "", author: str = "") -> Dict[str, Any]:
        """分析内容风险"""
        # 合并文本
        full_text = f"{title} {author} {text}"
        
        # 检测风险
        result = self.detector.detect(full_text)
        
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
            "details": result["risk_tags"]
        }
