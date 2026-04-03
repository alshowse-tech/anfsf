"""
Readiness Gate - 就绪门禁系统

检查服务是否准备好接收流量，提供：
- 服务注册和注销
- 健康检查探针
- 就绪状态检查
- 自动修复触发
"""
import uuid
import time
from datetime import datetime
from typing import List, Optional, Dict, Any, Callable
from pydantic import BaseModel, Field
from sqlalchemy import Column, BigInteger, String, DateTime, JSON, Index, Boolean
from sqlalchemy.orm import Session
from sqlalchemy.sql import func


# ==================== 数据模型 ====================

class Service(Base):
    """服务注册记录"""
    __tablename__ = "services"
    
    id = Column(String(256), primary_key=True)
    name = Column(String(256), nullable=False, index=True)
    version = Column(String(50), nullable=False)
    endpoint = Column(String(512), nullable=False)
    status = Column(String(20), default="registering", index=True)  # registering, ready, not_ready, degraded
    metadata = Column(JSON, nullable=True)
    probes = Column(JSON, nullable=True)
    registered_at = Column(DateTime, server_default=func.now())
    last_check_at = Column(DateTime, nullable=True)
    last_ready_at = Column(DateTime, nullable=True)
    consecutive_failures = Column(BigInteger, default=0)


class ProbeCheck(Base):
    """探针检查记录"""
    __tablename__ = "probe_checks"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    service_id = Column(String(256), nullable=False, index=True)
    probe_type = Column(String(50), nullable=False)
    probe_name = Column(String(256), nullable=False)
    passed = Column(Boolean, default=False)
    latency_ms = Column(BigInteger, nullable=True)
    error = Column(String(1024), nullable=True)
    details = Column(JSON, nullable=True)
    checked_at = Column(DateTime, server_default=func.now())


# ==================== 模型类 ====================

class ProbeConfig(BaseModel):
    """探针配置"""
    type: str  # http, tcp, grpc, custom
    name: str
    endpoint: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    timeout: int = 30
    interval: int = 30
    healthy_threshold: int = 2
    unhealthy_threshold: int = 3
    config: Dict[str, Any] = Field(default_factory=dict)


class ServiceConfig(BaseModel):
    """服务配置"""
    id: str
    name: str
    version: str
    endpoint: str
    probes: List[ProbeConfig] = []
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ReadinessResult(BaseModel):
    """就绪检查结果"""
    ready: bool
    service_id: str
    status: str
    probe_results: List[Dict[str, Any]] = []
    timestamp: str
    message: Optional[str] = None


class ProbeResult(BaseModel):
    """探针结果"""
    passed: bool
    probe_type: str
    probe_name: str
    latency_ms: Optional[float] = None
    error: Optional[str] = None
    warning: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class RegisterResult(BaseModel):
    """注册结果"""
    success: bool
    service_id: Optional[str] = None
    reason: Optional[str] = None


class DeregisterResult(BaseModel):
    """注销结果"""
    success: bool
    reason: Optional[str] = None


class RepairTicket(BaseModel):
    """修复工单"""
    id: str
    service_id: str
    issue: str
    severity: str  # low, medium, high, critical
    status: str  # open, in_progress, resolved, failed
    created_at: str
    resolved_at: Optional[str] = None
    repair_action: Optional[str] = None


# ==================== 探针实现 ====================

class Probe:
    """探针基类"""
    
    def __init__(self, config: ProbeConfig):
        self.config = config
        self.name = config.name
        self.type = config.type
        self.timeout = config.timeout
    
    def check(self) -> ProbeResult:
        """执行检查"""
        raise NotImplementedError


class HTTPProbe(Probe):
    """HTTP 探针"""
    
    def check(self) -> ProbeResult:
        import requests
        
        try:
            start_time = time.time()
            response = requests.get(
                self.config.endpoint or self.config.config.get("endpoint"),
                timeout=self.timeout
            )
            latency_ms = (time.time() - start_time) * 1000
            
            passed = response.status_code == 200
            
            return ProbeResult(
                passed=passed,
                probe_type="http",
                probe_name=self.name,
                latency_ms=latency_ms,
                details={"status_code": response.status_code}
            )
        except Exception as e:
            return ProbeResult(
                passed=False,
                probe_type="http",
                probe_name=self.name,
                error=str(e)
            )


class TCPProbe(Probe):
    """TCP 探针"""
    
    def check(self) -> ProbeResult:
        import socket
        
        try:
            start_time = time.time()
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            result = sock.connect_ex((
                self.config.host or self.config.config.get("host"),
                self.config.port or self.config.config.get("port")
            ))
            sock.close()
            latency_ms = (time.time() - start_time) * 1000
            
            return ProbeResult(
                passed=result == 0,
                probe_type="tcp",
                probe_name=self.name,
                latency_ms=latency_ms,
                details={"host": self.config.host, "port": self.config.port}
            )
        except Exception as e:
            return ProbeResult(
                passed=False,
                probe_type="tcp",
                probe_name=self.name,
                error=str(e)
            )


class GRPCProbe(Probe):
    """gRPC 探针"""
    
    def check(self) -> ProbeResult:
        try:
            # 简化实现，实际需要 grpcio 库
            start_time = time.time()
            
            # 模拟 gRPC 健康检查
            endpoint = self.config.endpoint or self.config.config.get("endpoint")
            
            # 这里应该实现实际的 gRPC 健康检查
            # 为简化，假设总是成功
            latency_ms = (time.time() - start_time) * 1000
            
            return ProbeResult(
                passed=True,
                probe_type="grpc",
                probe_name=self.name,
                latency_ms=latency_ms,
                details={"endpoint": endpoint}
            )
        except Exception as e:
            return ProbeResult(
                passed=False,
                probe_type="grpc",
                probe_name=self.name,
                error=str(e)
            )


class CustomProbe(Probe):
    """自定义探针"""
    
    def __init__(self, config: ProbeConfig, check_func: Callable):
        super().__init__(config)
        self.check_func = check_func
    
    def check(self) -> ProbeResult:
        try:
            result = self.check_func(self.config)
            if isinstance(result, dict):
                return ProbeResult(**result)
            return result
        except Exception as e:
            return ProbeResult(
                passed=False,
                probe_type="custom",
                probe_name=self.name,
                error=str(e)
            )


# ==================== Readiness Gate 主类 ====================

class ReadinessGate:
    """
    就绪门禁系统
    
    检查服务是否准备好接收流量
    """
    
    def __init__(self, db_session: Session, cache=None):
        """
        初始化就绪门禁
        
        Args:
            db_session: 数据库会话
            cache: Redis 缓存 (可选)
        """
        self.db = db_session
        self.cache = cache
        self.services: Dict[str, ServiceConfig] = {}
        self.probe_factories: Dict[str, type] = {
            "http": HTTPProbe,
            "tcp": TCPProbe,
            "grpc": GRPCProbe,
        }
        self.repair_handlers: Dict[str, Callable] = {}
    
    def register_probe_type(self, probe_type: str, probe_class: type):
        """注册探针类型"""
        self.probe_factories[probe_type] = probe_class
    
    def register_repair_handler(self, issue_type: str, handler: Callable):
        """注册修复处理器"""
        self.repair_handlers[issue_type] = handler
    
    def check(self, service_id: str) -> ReadinessResult:
        """
        检查服务就绪状态
        
        Args:
            service_id: 服务 ID
        
        Returns:
            ReadinessResult: 就绪检查结果
        """
        # 获取服务
        service = self.db.query(Service).filter(Service.id == service_id).first()
        if not service:
            return ReadinessResult(
                ready=False,
                service_id=service_id,
                status="not_found",
                timestamp=datetime.utcnow().isoformat(),
                message="Service not registered"
            )
        
        # 检查缓存
        if self.cache:
            cached = self.cache.get(f"readiness:{service_id}")
            if cached:
                import json
                return ReadinessResult.model_validate_json(cached)
        
        # 运行探针检查
        probe_results = []
        probes = service.probes or []
        
        for probe_config in probes:
            config = ProbeConfig(**probe_config)
            probe = self._create_probe(config)
            result = probe.check()
            probe_results.append(result.model_dump())
            
            # 存储检查结果
            self._store_probe_result(service_id, result)
        
        # 计算就绪状态
        all_passed = all(r.get("passed", False) for r in probe_results)
        
        # 更新服务状态
        old_status = service.status
        if all_passed:
            service.status = "ready"
            service.last_ready_at = datetime.utcnow()
            service.consecutive_failures = 0
        else:
            service.consecutive_failures += 1
            if service.consecutive_failures >= 3:
                service.status = "not_ready"
            else:
                service.status = "degraded"
        
        service.last_check_at = datetime.utcnow()
        self.db.commit()
        
        # 如果状态变化，触发修复
        if old_status == "ready" and service.status != "ready":
            self._trigger_repair(service_id, service.status)
        
        # 缓存结果
        result = ReadinessResult(
            ready=all_passed,
            service_id=service_id,
            status=service.status,
            probe_results=probe_results,
            timestamp=datetime.utcnow().isoformat()
        )
        
        if self.cache:
            self.cache.setex(f"readiness:{service_id}", 30, result.model_dump_json())
        
        return result
    
    def probe(self, service_id: str, probe_type: str) -> ProbeResult:
        """
        执行特定探针检查
        
        Args:
            service_id: 服务 ID
            probe_type: 探针类型
        
        Returns:
            ProbeResult: 探针结果
        """
        # 获取服务
        service = self.db.query(Service).filter(Service.id == service_id).first()
        if not service:
            return ProbeResult(
                passed=False,
                probe_type=probe_type,
                probe_name="unknown",
                error="Service not registered"
            )
        
        # 查找探针配置
        probes = service.probes or []
        probe_config = None
        
        for p in probes:
            if p.get("type") == probe_type or p.get("name") == probe_type:
                probe_config = ProbeConfig(**p)
                break
        
        if not probe_config:
            return ProbeResult(
                passed=False,
                probe_type=probe_type,
                probe_name="unknown",
                error=f"Probe {probe_type} not found"
            )
        
        # 执行探针
        probe = self._create_probe(probe_config)
        result = probe.check()
        
        # 存储结果
        self._store_probe_result(service_id, result)
        
        return result
    
    def register(self, service: ServiceConfig) -> RegisterResult:
        """
        注册服务
        
        Args:
            service: 服务配置
        
        Returns:
            RegisterResult: 注册结果
        """
        # 检查是否已存在
        existing = self.db.query(Service).filter(Service.id == service.id).first()
        if existing:
            # 更新现有服务
            existing.name = service.name
            existing.version = service.version
            existing.endpoint = service.endpoint
            existing.metadata = service.metadata
            existing.probes = [p.model_dump() for p in service.probes]
            existing.status = "registering"
        else:
            # 创建新服务
            db_service = Service(
                id=service.id,
                name=service.name,
                version=service.version,
                endpoint=service.endpoint,
                metadata=service.metadata,
                probes=[p.model_dump() for p in service.probes],
                status="registering"
            )
            self.db.add(db_service)
        
        self.db.commit()
        
        # 添加到内存缓存
        self.services[service.id] = service
        
        # 执行初始检查
        self.check(service.id)
        
        return RegisterResult(success=True, service_id=service.id)
    
    def deregister(self, service_id: str) -> DeregisterResult:
        """
        注销服务
        
        Args:
            service_id: 服务 ID
        
        Returns:
            DeregisterResult: 注销结果
        """
        # 从数据库删除
        service = self.db.query(Service).filter(Service.id == service_id).first()
        if not service:
            return DeregisterResult(success=False, reason="Service not found")
        
        self.db.delete(service)
        self.db.commit()
        
        # 从内存缓存删除
        if service_id in self.services:
            del self.services[service_id]
        
        # 清除缓存
        if self.cache:
            self.cache.delete(f"readiness:{service_id}")
        
        return DeregisterResult(success=True)
    
    def list_services(self, status: Optional[str] = None) -> List[Service]:
        """列出服务"""
        query = self.db.query(Service)
        if status:
            query = query.filter(Service.status == status)
        return query.all()
    
    def get_service(self, service_id: str) -> Optional[Service]:
        """获取服务"""
        return self.db.query(Service).filter(Service.id == service_id).first()
    
    def _create_probe(self, config: ProbeConfig) -> Probe:
        """创建探针"""
        probe_class = self.probe_factories.get(config.type)
        if not probe_class:
            raise ValueError(f"Unknown probe type: {config.type}")
        return probe_class(config)
    
    def _store_probe_result(self, service_id: str, result: ProbeResult):
        """存储探针结果"""
        probe_check = ProbeCheck(
            service_id=service_id,
            probe_type=result.probe_type,
            probe_name=result.probe_name,
            passed=result.passed,
            latency_ms=result.latency_ms,
            error=result.error,
            details=result.details
        )
        self.db.add(probe_check)
        self.db.commit()
    
    def _trigger_repair(self, service_id: str, issue: str):
        """触发修复"""
        ticket = RepairTicket(
            id=str(uuid.uuid4()),
            service_id=service_id,
            issue=issue,
            severity="medium",
            status="open",
            created_at=datetime.utcnow().isoformat()
        )
        
        # 查找修复处理器
        handler = self.repair_handlers.get(issue)
        if handler:
            try:
                handler(ticket)
            except Exception as e:
                ticket.status = "failed"
                ticket.repair_action = f"Handler failed: {str(e)}"
        else:
            ticket.repair_action = "No handler registered"
        
        # 存储工单 (简化实现)
        print(f"Repair ticket created: {ticket.id} for service {service_id}")
    
    def auto_heal(self, service_id: str) -> bool:
        """
        自动修复服务
        
        Args:
            service_id: 服务 ID
        
        Returns:
            bool: 是否成功
        """
        service = self.get_service(service_id)
        if not service:
            return False
        
        # 尝试重启服务 (简化实现)
        # 实际应该调用容器编排 API 或部署系统
        
        # 重置失败计数
        service.consecutive_failures = 0
        service.status = "registering"
        self.db.commit()
        
        # 重新检查
        result = self.check(service_id)
        
        return result.ready


# ==================== 工具函数 ====================

def create_readiness_gate(db_session: Session, 
                         cache=None) -> ReadinessGate:
    """
    创建 Readiness Gate 实例
    
    Args:
        db_session: 数据库会话
        cache: Redis 缓存
    
    Returns:
        ReadinessGate: 实例
    """
    return ReadinessGate(db_session, cache)


def create_service_config(id: str, name: str, version: str, 
                         endpoint: str, probes: List[ProbeConfig] = None,
                         metadata: Dict[str, Any] = None) -> ServiceConfig:
    """创建服务配置"""
    return ServiceConfig(
        id=id,
        name=name,
        version=version,
        endpoint=endpoint,
        probes=probes or [],
        metadata=metadata or {}
    )
