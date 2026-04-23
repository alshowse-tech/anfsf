"""
Skills Registry - 技能注册中心
"""
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime
from loguru import logger


@dataclass
class Skill:
    """技能定义"""
    id: str
    name: str
    description: str
    version: str
    handler: Callable
    inputs: Dict[str, str] = field(default_factory=dict)
    outputs: Dict[str, str] = field(default_factory=dict)
    metadata: Dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    enabled: bool = True


class SkillsRegistry:
    """技能注册中心"""
    
    def __init__(self):
        self.skills: Dict[str, Skill] = {}
        self.categories: Dict[str, List[str]] = {}
        self._register_default_skills()
    
    def _register_default_skills(self):
        """注册默认技能"""
        # 股票信息技能
        self.register(Skill(
            id="stock.info",
            name="股票信息查询",
            description="查询股票基本信息",
            version="1.0.0",
            handler=self._mock_stock_info,
            inputs={"symbol": "股票代码"},
            outputs={"info": "股票信息"}
        ))
        
        # 技术分析技能
        self.register(Skill(
            id="stock.technical_analysis",
            name="技术分析",
            description="股票技术指标分析",
            version="1.0.0",
            handler=self._mock_technical_analysis,
            inputs={"symbol": "股票代码"},
            outputs={"indicators": "技术指标"}
        ))
        
        # 交易信号技能
        self.register(Skill(
            id="trading.signal",
            name="交易信号生成",
            description="基于规则生成交易信号",
            version="1.0.0",
            handler=self._mock_trading_signal,
            inputs={"symbol": "股票代码", "data": "行情数据"},
            outputs={"signal": "交易信号"}
        ))
        
        # 风险评估技能
        self.register(Skill(
            id="risk.assessment",
            name="风险评估",
            description="评估投资风险",
            version="1.0.0",
            handler=self._mock_risk_assessment,
            inputs={"symbol": "股票代码", "position": "持仓信息"},
            outputs={"risk_level": "风险等级"}
        ))
        
        # AI 分析技能
        self.register(Skill(
            id="ai.analysis",
            name="AI 智能分析",
            description="使用 AI 进行股票分析",
            version="1.0.0",
            handler=self._mock_ai_analysis,
            inputs={"symbol": "股票代码", "data": "行情数据"},
            outputs={"analysis": "分析报告"}
        ))
    
    def register(self, skill: Skill):
        """注册技能"""
        self.skills[skill.id] = skill
        logger.info(f"✅ 注册技能：{skill.id} - {skill.name}")
    
    def register_category(self, category: str, skill_ids: List[str]):
        """注册技能分类"""
        self.categories[category] = skill_ids
        logger.debug(f"📁 注册技能分类：{category} ({len(skill_ids)} 个技能)")
    
    def get(self, skill_id: str) -> Optional[Skill]:
        """获取技能"""
        return self.skills.get(skill_id)
    
    def execute(self, skill_id: str, **kwargs) -> Any:
        """
        执行技能
        
        Args:
            skill_id: 技能 ID
            **kwargs: 技能参数
        
        Returns:
            执行结果
        """
        skill = self.get(skill_id)
        
        if not skill:
            logger.error(f"❌ 技能不存在：{skill_id}")
            return None
        
        if not skill.enabled:
            logger.error(f"❌ 技能已禁用：{skill_id}")
            return None
        
        try:
            logger.debug(f"🚀 执行技能：{skill_id}")
            result = skill.handler(**kwargs)
            return result
        except Exception as e:
            logger.error(f"❌ 技能执行失败：{skill_id}: {e}")
            return None
    
    def list_skills(self, category: str = None) -> List[Dict]:
        """列出技能"""
        skills = self.skills.values()
        
        if category and category in self.categories:
            skill_ids = self.categories[category]
            skills = [s for s in skills if s.id in skill_ids]
        
        return [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "version": s.version,
                "enabled": s.enabled
            }
            for s in skills
        ]
    
    def enable(self, skill_id: str) -> bool:
        """启用技能"""
        if skill_id in self.skills:
            self.skills[skill_id].enabled = True
            logger.info(f"✅ 启用技能：{skill_id}")
            return True
        return False
    
    def disable(self, skill_id: str) -> bool:
        """禁用技能"""
        if skill_id in self.skills:
            self.skills[skill_id].enabled = False
            logger.info(f"⏸️ 禁用技能：{skill_id}")
            return True
        return False
    
    # ========== 默认技能实现 ==========
    
    def _mock_stock_info(self, symbol: str) -> Dict:
        """模拟股票信息查询"""
        return {
            "symbol": symbol,
            "name": "示例股票",
            "price": 100.0,
            "change_pct": 2.5
        }
    
    def _mock_technical_analysis(self, symbol: str) -> Dict:
        """模拟技术分析"""
        return {
            "symbol": symbol,
            "rsi": 65.0,
            "macd": 1.2,
            "ma_5": 98.0,
            "ma_20": 95.0
        }
    
    def _mock_trading_signal(self, symbol: str, data: Dict) -> Dict:
        """模拟交易信号"""
        return {
            "symbol": symbol,
            "signal": "BUY",
            "confidence": 0.85,
            "reason": "RPS > 90"
        }
    
    def _mock_risk_assessment(self, symbol: str, position: Dict) -> Dict:
        """模拟风险评估"""
        return {
            "symbol": symbol,
            "risk_level": "medium",
            "score": 65
        }
    
    def _mock_ai_analysis(self, symbol: str, data: Dict) -> Dict:
        """模拟 AI 分析"""
        return {
            "symbol": symbol,
            "recommendation": "持有",
            "target_price": 120.0,
            "confidence": 0.78
        }
