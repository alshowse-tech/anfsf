"""
Harness Registry - Harness 注册中心
"""
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from loguru import logger


class HarnessStatus(Enum):
    """Harness 状态"""
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"


@dataclass
class HarnessInfo:
    """Harness 信息"""
    id: str
    name: str
    type: str
    version: str
    endpoint: str
    status: HarnessStatus = HarnessStatus.STARTING
    health_url: str = ""
    metadata: Dict = field(default_factory=dict)
    registered_at: datetime = field(default_factory=datetime.now)
    last_heartbeat: datetime = None


class HarnessRegistry:
    """Harness 注册中心"""
    
    def __init__(self):
        self.harnesses: Dict[str, HarnessInfo] = {}
    
    def register(self, harness: HarnessInfo):
        """注册 Harness"""
        self.harnesses[harness.id] = harness
        logger.info(f"✅ Harness 注册：{harness.id} - {harness.name}")
    
    def get(self, harness_id: str) -> Optional[HarnessInfo]:
        """获取 Harness 信息"""
        return self.harnesses.get(harness_id)
    
    def update_status(self, harness_id: str, status: HarnessStatus):
        """更新 Harness 状态"""
        if harness_id in self.harnesses:
            self.harnesses[harness_id].status = status
            logger.debug(f"📊 Harness 状态更新：{harness_id} -> {status.value}")
    
    def heartbeat(self, harness_id: str):
        """接收 Harness 心跳"""
        if harness_id in self.harnesses:
            self.harnesses[harness_id].last_heartbeat = datetime.now()
    
    def unregister(self, harness_id: str) -> bool:
        """注销 Harness"""
        if harness_id in self.harnesses:
            del self.harnesses[harness_id]
            logger.info(f"🗑️ Harness 注销：{harness_id}")
            return True
        return False
    
    def list_harnesses(self, type: str = None, status: HarnessStatus = None) -> List[Dict]:
        """列出 Harness"""
        harnesses = self.harnesses.values()
        
        if type:
            harnesses = [h for h in harnesses if h.type == type]
        
        if status:
            harnesses = [h for h in harnesses if h.status == status]
        
        return [
            {
                "id": h.id,
                "name": h.name,
                "type": h.type,
                "version": h.version,
                "status": h.status.value,
                "endpoint": h.endpoint,
                "last_heartbeat": h.last_heartbeat.isoformat() if h.last_heartbeat else None
            }
            for h in harnesses
        ]
    
    def get_healthy_harnesses(self, timeout_seconds: int = 60) -> List[HarnessInfo]:
        """获取健康的 Harness"""
        cutoff = datetime.now()
        
        return [
            h for h in self.harnesses.values()
            if h.status == HarnessStatus.RUNNING and
            (not h.last_heartbeat or
             (cutoff - h.last_heartbeat).total_seconds() < timeout_seconds)
        ]
    
    def check_health(self) -> Dict[str, bool]:
        """检查所有 Harness 健康状态"""
        return {
            harness_id: harness.status == HarnessStatus.RUNNING
            for harness_id, harness in self.harnesses.items()
        }
