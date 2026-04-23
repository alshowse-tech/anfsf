"""
Orchestration Harness 单元测试
"""
import pytest
import asyncio
from unittest.mock import Mock, patch
from harness.orchestration.src.agent_router import AgentRouter, RoutingResult
from harness.orchestration.src.task_splitter import TaskSplitter
from harness.orchestration.src.context_manager import ContextManager, RequestContext


class TestAgentRouter:
    """Agent Router 测试"""
    
    @pytest.mark.asyncio
    async def test_route_stock_info(self):
        """测试股票查询路由"""
        router = AgentRouter()
        
        # 测试股票查询路由
        result = await router.route("stock.info", {"symbol": "000001"})
        assert isinstance(result, RoutingResult)
        assert result.agent == "stock_agent"
    
    @pytest.mark.asyncio
    async def test_route_trading(self):
        """测试交易路由"""
        router = AgentRouter()
        
        # 测试交易路由
        result = await router.route("trading.order", {"symbol": "000001", "action": "buy"})
        assert isinstance(result, RoutingResult)
        assert result.agent == "trading_agent"


class TestTaskSplitter:
    """Task Splitter 测试"""
    
    def test_split_batch_query(self):
        """测试批量任务拆分"""
        splitter = TaskSplitter()
        
        # 测试批量股票查询拆分
        payload = {
            "symbols": ["000001", "000002", "000003"]
        }
        subtasks = splitter.split("batch_stock_query", payload)
        assert len(subtasks) == 3
        for i, subtask in enumerate(subtasks):
            assert subtask.action == "stock.info"
            assert subtask.payload["symbol"] == f"00000{i+1}"
    
    def test_split_portfolio(self):
        """测试持仓分析拆分"""
        splitter = TaskSplitter()
        
        payload = {
            "positions": [
                {"symbol": "000001", "quantity": 100},
                {"symbol": "000002", "quantity": 200}
            ]
        }
        subtasks = splitter.split("portfolio_analysis", payload)
        assert len(subtasks) >= 1


class TestContextManager:
    """Context Manager 测试"""
    
    def test_create_context(self):
        """测试上下文创建"""
        manager = ContextManager()
        
        context = manager.create_context(user_id="test_user", session_id="test_session")
        
        assert isinstance(context, RequestContext)
        assert context.user_id == "test_user"
        assert context.session_id == "test_session"
        assert context.request_id is not None
        assert context.created_at is not None
    
    def test_get_context(self):
        """测试获取上下文"""
        manager = ContextManager()
        
        context = manager.create_context(user_id="test_user")
        
        # 获取上下文
        retrieved = manager.get_context(context.request_id)
        assert retrieved is not None
        assert retrieved.user_id == "test_user"
