"""
Agent Router - Agent 路由

负责将请求路由到正确的处理 Agent
"""
from typing import Dict, Any, Optional
from dataclasses import dataclass
import asyncio
from loguru import logger


@dataclass
class RoutingResult:
    """路由结果"""
    success: bool
    agent: str
    result: Any
    latency_ms: float
    error: Optional[str] = None


class AgentRouter:
    """Agent 路由器"""
    
    def __init__(self):
        self.agents: Dict[str, Any] = {}
        self.routing_table: Dict[str, str] = {}
        self._register_default_agents()
    
    def _register_default_agents(self):
        """注册默认 Agent"""
        # 股票相关
        self.routing_table["stock.info"] = "stock_agent"
        self.routing_table["stock.search"] = "stock_agent"
        self.routing_table["stock.list"] = "stock_agent"
        
        # 交易相关
        self.routing_table["trading.watchlist"] = "trading_agent"
        self.routing_table["trading.order"] = "trading_agent"
        self.routing_table["trading.signal"] = "trading_agent"
        
        # AI 分析
        self.routing_table["ai.analyze"] = "ai_agent"
        self.routing_table["ai.plan"] = "ai_agent"
        
        # 选股
        self.routing_table["screener.run"] = "screener_agent"
        self.routing_table["screener.candidates"] = "screener_agent"
    
    def register_agent(self, name: str, agent: Any):
        """注册 Agent"""
        self.agents[name] = agent
        logger.info(f"✅ 注册 Agent: {name}")
    
    def register_route(self, pattern: str, agent_name: str):
        """注册路由规则"""
        self.routing_table[pattern] = agent_name
        logger.debug(f"📍 注册路由：{pattern} → {agent_name}")
    
    async def route(self, action: str, payload: Dict) -> RoutingResult:
        """
        路由请求到合适的 Agent
        
        Args:
            action: 动作 (如：stock.info)
            payload: 请求负载
        
        Returns:
            路由结果
        """
        import time
        start_time = time.time()
        
        # 查找目标 Agent
        agent_name = self.routing_table.get(action)
        
        if not agent_name:
            return RoutingResult(
                success=False,
                agent="unknown",
                result=None,
                latency_ms=(time.time() - start_time) * 1000,
                error=f"未知动作：{action}"
            )
        
        agent = self.agents.get(agent_name)
        
        if not agent:
            return RoutingResult(
                success=False,
                agent=agent_name,
                result=None,
                latency_ms=(time.time() - start_time) * 1000,
                error=f"Agent 未注册：{agent_name}"
            )
        
        try:
            # 调用 Agent
            if asyncio.iscoroutinefunction(agent.handle):
                result = await agent.handle(action, payload)
            else:
                result = agent.handle(action, payload)
            
            return RoutingResult(
                success=True,
                agent=agent_name,
                result=result,
                latency_ms=(time.time() - start_time) * 1000
            )
            
        except Exception as e:
            logger.error(f"❌ Agent 调用失败：{e}")
            return RoutingResult(
                success=False,
                agent=agent_name,
                result=None,
                latency_ms=(time.time() - start_time) * 1000,
                error=str(e)
            )
    
    def get_routing_table(self) -> Dict[str, str]:
        """获取路由表"""
        return self.routing_table.copy()
    
    def get_registered_agents(self) -> list:
        """获取已注册的 Agent 列表"""
        return list(self.agents.keys())
