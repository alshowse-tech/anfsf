"""
Layer 8.5 单元测试
"""
import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from layer8_5.mcp_bus import MCPBus, MCPMessage
from layer8_5.skills_registry import SkillsRegistry
from layer8_5.skills_registry.src.registry import Skill
from layer8_5.harness_registry import HarnessRegistry
from layer8_5.harness_registry.src.registry import HarnessInfo, HarnessStatus


class TestMCPBus:
    """MCP Bus 测试"""
    
    @pytest.mark.asyncio
    async def test_publish_message(self):
        """测试发布消息"""
        bus = MCPBus()
        
        # 注册 Harness
        bus.register_harness("test_harness")
        
        # 注册监听器
        received_messages = []
        def listener(msg):
            received_messages.append(msg)
        
        bus.subscribe("test_harness", listener)
        
        # 发布消息
        msg = MCPMessage(
            type="request",
            source="test_source",
            target="test_harness",
            payload={"data": "test"}
        )
        await bus.publish(msg)
        
        # 验证消息接收
        assert len(received_messages) == 1
        assert received_messages[0].payload["data"] == "test"
    
    @pytest.mark.asyncio
    async def test_publish_broadcast(self):
        """测试广播消息"""
        bus = MCPBus()
        
        # 注册 Harness
        bus.register_harness("harness1")
        bus.register_harness("harness2")
        
        # 注册监听器
        listener1_msgs = []
        listener2_msgs = []
        
        def listener1(msg):
            listener1_msgs.append(msg)
        
        def listener2(msg):
            listener2_msgs.append(msg)
        
        bus.subscribe("harness1", listener1)
        bus.subscribe("harness2", listener2)
        
        # 广播消息
        msg = MCPMessage(
            type="event",
            source="test_source",
            target="*",
            payload={"event": "test_event"}
        )
        await bus.publish(msg)
        
        # 验证所有监听器都收到消息
        assert len(listener1_msgs) == 1
        assert len(listener2_msgs) == 1
        assert listener1_msgs[0].payload["event"] == "test_event"
        assert listener2_msgs[0].payload["event"] == "test_event"


class TestSkillsRegistry:
    """Skills Registry 测试"""
    
    def test_register_and_execute_skill(self):
        """测试注册和执行技能"""
        registry = SkillsRegistry()
        
        # 注册自定义技能
        def mock_handler(symbol):
            return {"symbol": symbol, "result": "success"}
        
        skill = Skill(
            id="test.skill",
            name="Test Skill",
            description="Test skill for unit testing",
            version="1.0.0",
            handler=mock_handler,
            inputs={"symbol": "Stock symbol"},
            outputs={"result": "Operation result"}
        )
        
        registry.register(skill)
        
        # 执行技能
        result = registry.execute("test.skill", symbol="000001")
        assert result is not None
        assert result["symbol"] == "000001"
        assert result["result"] == "success"
    
    def test_list_skills(self):
        """测试列出技能"""
        registry = SkillsRegistry()
        
        # 获取所有技能
        skills = registry.list_skills()
        assert len(skills) >= 5  # 默认有 5 个技能
        
        # 验证默认技能存在
        skill_ids = [s["id"] for s in skills]
        assert "stock.info" in skill_ids
        assert "trading.signal" in skill_ids
        assert "ai.analysis" in skill_ids


class TestHarnessRegistry:
    """Harness Registry 测试"""
    
    def test_register_and_get_harness(self):
        """测试注册和获取 Harness"""
        registry = HarnessRegistry()
        
        # 注册 Harness
        harness = HarnessInfo(
            id="test_harness",
            name="Test Harness",
            type="orchestration",
            version="1.0.0",
            endpoint="http://localhost:8000"
        )
        registry.register(harness)
        
        # 获取 Harness
        retrieved = registry.get("test_harness")
        assert retrieved is not None
        assert retrieved.id == "test_harness"
        assert retrieved.name == "Test Harness"
        assert retrieved.type == "orchestration"
    
    def test_list_healthy_harnesses(self):
        """测试列出健康 Harness"""
        registry = HarnessRegistry()
        
        # 注册健康的 Harness
        healthy = HarnessInfo(
            id="healthy_harness",
            name="Healthy Harness",
            type="evolution",
            version="1.0.0",
            endpoint="http://localhost:8001"
        )
        healthy.status = HarnessStatus.RUNNING
        healthy.last_heartbeat = datetime.now()
        registry.register(healthy)
        
        # 注册不健康的 Harness
        unhealthy = HarnessInfo(
            id="unhealthy_harness",
            name="Unhealthy Harness",
            type="governance",
            version="1.0.0",
            endpoint="http://localhost:8002"
        )
        unhealthy.status = HarnessStatus.ERROR
        registry.register(unhealthy)
        
        # 获取健康 Harness
        healthy_list = registry.get_healthy_harnesses()
        assert len(healthy_list) == 1
        assert healthy_list[0].id == "healthy_harness"
