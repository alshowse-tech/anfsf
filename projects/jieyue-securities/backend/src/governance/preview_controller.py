"""
Preview Controller - 预览可用性控制器

管理变更预览和验证，提供：
- 预览环境创建
- 变更应用和验证
- 探针检查
- 预览应用和回滚
"""
import uuid
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy import Column, BigInteger, String, DateTime, JSON, Index
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from src.db.session import Base


# ==================== 数据模型 ====================

class Preview(Base):
    """预览记录"""
    __tablename__ = "previews"
    
    id = Column(String(256), primary_key=True)  # UUID
    changes = Column(JSON, nullable=False)
    context = Column(JSON, nullable=False)
    status = Column(String(20), default="pending", index=True)  # pending, ready, failed, applied, discarded
    created_by = Column(String(256), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    validated_at = Column(DateTime, nullable=True)
    applied_at = Column(DateTime, nullable=True)
    probe_results = Column(JSON, nullable=True)
    error_message = Column(String(1024), nullable=True)


class ProbeResult(Base):
    """探针检查结果"""
    __tablename__ = "probe_results"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    preview_id = Column(String(256), nullable=False, index=True)
    probe_type = Column(String(50), nullable=False)
    probe_name = Column(String(256), nullable=False)
    passed = Column(String(1), default="N")  # Y/N
    latency_ms = Column(BigInteger, nullable=True)
    error = Column(String(1024), nullable=True)
    warning = Column(String(1024), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ==================== 模型类 ====================

class Change(BaseModel):
    """变更"""
    type: str  # add, remove, modify, move
    path: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None


class PreviewContext(BaseModel):
    """预览上下文"""
    user_id: str
    project_id: Optional[str] = None
    description: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PreviewResult(BaseModel):
    """预览结果"""
    preview_id: str
    status: str
    probe_results: List[Dict[str, Any]] = []
    errors: List[str] = []
    warnings: List[str] = []


class ValidationResult(BaseModel):
    """验证结果"""
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []


class ApplyResult(BaseModel):
    """应用结果"""
    success: bool
    preview_id: Optional[str] = None
    reason: Optional[str] = None


class DiscardResult(BaseModel):
    """丢弃结果"""
    success: bool
    reason: Optional[str] = None


# ==================== 探针接口 ====================

class Probe:
    """探针基类"""
    
    def __init__(self, name: str, timeout: int = 30):
        self.name = name
        self.timeout = timeout
    
    async def check(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行检查"""
        raise NotImplementedError


class HTTPProbe(Probe):
    """HTTP 探针"""
    
    async def check(self, context: Dict[str, Any]) -> Dict[str, Any]:
        import requests
        
        endpoint = context.get("endpoint")
        if not endpoint:
            return {"passed": False, "error": "No endpoint specified"}
        
        try:
            response = requests.get(endpoint, timeout=self.timeout)
            return {
                "passed": response.status_code == 200,
                "latency_ms": response.elapsed.total_seconds() * 1000,
                "details": {"status_code": response.status_code}
            }
        except Exception as e:
            return {"passed": False, "error": str(e)}


class TCPProbe(Probe):
    """TCP 探针"""
    
    async def check(self, context: Dict[str, Any]) -> Dict[str, Any]:
        import socket
        
        host = context.get("host")
        port = context.get("port")
        
        if not host or not port:
            return {"passed": False, "error": "Host and port required"}
        
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            result = sock.connect_ex((host, port))
            sock.close()
            
            return {
                "passed": result == 0,
                "details": {"host": host, "port": port}
            }
        except Exception as e:
            return {"passed": False, "error": str(e)}


class CustomProbe(Probe):
    """自定义探针"""
    
    def __init__(self, name: str, check_func: callable, timeout: int = 30):
        super().__init__(name, timeout)
        self.check_func = check_func
    
    async def check(self, context: Dict[str, Any]) -> Dict[str, Any]:
        try:
            return await self.check_func(context)
        except Exception as e:
            return {"passed": False, "error": str(e)}


# ==================== Preview Controller 主类 ====================

class PreviewController:
    """
    预览可用性控制器
    
    管理变更预览和验证
    """
    
    def __init__(self, db_session: Session, storage=None):
        """
        初始化预览控制器
        
        Args:
            db_session: 数据库会话
            storage: 存储服务 (可选)
        """
        self.db = db_session
        self.storage = storage
        self.probes: List[Probe] = []
        
        # 注册默认探针
        self.register_probe(HTTPProbe("http_health", timeout=10))
        self.register_probe(TCPProbe("tcp_connect", timeout=5))
    
    def register_probe(self, probe: Probe):
        """注册探针"""
        self.probes.append(probe)
    
    def unregister_probe(self, probe_name: str):
        """注销探针"""
        self.probes = [p for p in self.probes if p.name != probe_name]
    
    async def create_preview(self, changes: List[Change], 
                            context: PreviewContext) -> Preview:
        """
        创建预览
        
        Args:
            changes: 变更列表
            context: 预览上下文
        
        Returns:
            Preview: 预览记录
        """
        preview_id = str(uuid.uuid4())
        
        # 创建预览记录
        preview = Preview(
            id=preview_id,
            changes=[c.model_dump() for c in changes],
            context=context.model_dump(),
            status="pending",
            created_by=context.user_id
        )
        self.db.add(preview)
        self.db.commit()
        
        # 创建预览环境
        if self.storage:
            preview_path = f"previews/{preview_id}"
            await self.storage.create_directory(preview_path)
            
            # 应用变更到预览环境
            for change in changes:
                await self._apply_change_to_preview(preview_path, change)
        
        # 运行探针检查
        probe_results = await self._run_probes({
            "preview_id": preview_id,
            "preview_path": f"previews/{preview_id}" if self.storage else None
        })
        
        # 存储探针结果
        for result in probe_results:
            probe_result = ProbeResult(
                preview_id=preview_id,
                probe_type=result.get("type", "custom"),
                probe_name=result.get("name", "unknown"),
                passed="Y" if result.get("passed") else "N",
                latency_ms=result.get("latency_ms"),
                error=result.get("error"),
                warning=result.get("warning"),
                details=result.get("details")
            )
            self.db.add(probe_result)
        
        # 更新预览状态
        all_passed = all(r.get("passed", False) for r in probe_results)
        preview.status = "ready" if all_passed else "failed"
        preview.probe_results = probe_results
        preview.validated_at = datetime.utcnow() if all_passed else None
        self.db.commit()
        self.db.refresh(preview)
        
        return preview
    
    async def validate_preview(self, preview_id: str) -> ValidationResult:
        """
        验证预览
        
        Args:
            preview_id: 预览 ID
        
        Returns:
            ValidationResult: 验证结果
        """
        # 获取预览
        preview = self.db.query(Preview).filter(Preview.id == preview_id).first()
        if not preview:
            return ValidationResult(
                valid=False,
                errors=["Preview not found"]
            )
        
        if preview.status == "pending":
            return ValidationResult(
                valid=False,
                errors=["Preview is still pending"]
            )
        
        if preview.status == "failed":
            return ValidationResult(
                valid=False,
                errors=[preview.error_message or "Preview validation failed"]
            )
        
        # 重新运行探针
        probe_results = await self._run_probes({
            "preview_id": preview_id,
            "preview_path": f"previews/{preview_id}" if self.storage else None
        })
        
        errors = []
        warnings = []
        
        for result in probe_results:
            if not result.get("passed"):
                if result.get("error"):
                    errors.append(f"{result.get('name')}: {result.get('error')}")
            elif result.get("warning"):
                warnings.append(f"{result.get('name')}: {result.get('warning')}")
        
        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    async def apply_preview(self, preview_id: str) -> ApplyResult:
        """
        应用预览
        
        Args:
            preview_id: 预览 ID
        
        Returns:
            ApplyResult: 应用结果
        """
        # 获取预览
        preview = self.db.query(Preview).filter(Preview.id == preview_id).first()
        if not preview:
            return ApplyResult(success=False, reason="Preview not found")
        
        if preview.status != "ready":
            return ApplyResult(
                success=False, 
                reason=f"Preview not ready: {preview.status}"
            )
        
        # 应用变更到生产环境
        changes = [Change(**c) for c in preview.changes]
        for change in changes:
            try:
                await self._apply_change_to_production(change)
            except Exception as e:
                return ApplyResult(
                    success=False,
                    reason=f"Failed to apply change: {str(e)}"
                )
        
        # 更新预览状态
        preview.status = "applied"
        preview.applied_at = datetime.utcnow()
        self.db.commit()
        
        return ApplyResult(success=True, preview_id=preview_id)
    
    async def discard_preview(self, preview_id: str) -> DiscardResult:
        """
        丢弃预览
        
        Args:
            preview_id: 预览 ID
        
        Returns:
            DiscardResult: 丢弃结果
        """
        # 获取预览
        preview = self.db.query(Preview).filter(Preview.id == preview_id).first()
        if not preview:
            return DiscardResult(success=False, reason="Preview not found")
        
        if preview.status == "applied":
            return DiscardResult(
                success=False, 
                reason="Cannot discard applied preview"
            )
        
        # 更新状态
        preview.status = "discarded"
        self.db.commit()
        
        # 清理预览环境
        if self.storage:
            await self.storage.delete_directory(f"previews/{preview_id}")
        
        return DiscardResult(success=True)
    
    async def get_preview(self, preview_id: str) -> Optional[Preview]:
        """获取预览"""
        return self.db.query(Preview).filter(Preview.id == preview_id).first()
    
    async def list_previews(self, status: Optional[str] = None, 
                           limit: int = 50) -> List[Preview]:
        """列出预览"""
        query = self.db.query(Preview)
        if status:
            query = query.filter(Preview.status == status)
        return query.order_by(Preview.created_at.desc()).limit(limit).all()
    
    async def _run_probes(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """运行所有探针"""
        results = []
        
        for probe in self.probes:
            try:
                result = await probe.check(context)
                result["name"] = probe.name
                result["type"] = probe.__class__.__name__
                results.append(result)
            except Exception as e:
                results.append({
                    "name": probe.name,
                    "type": probe.__class__.__name__,
                    "passed": False,
                    "error": str(e)
                })
        
        return results
    
    async def _apply_change_to_preview(self, preview_path: str, change: Change):
        """应用变更到预览环境"""
        if not self.storage:
            return
        
        # 根据变更类型应用
        if change.type == "add":
            await self.storage.upload(
                f"{preview_path}/{change.path}",
                json.dumps(change.new_value)
            )
        elif change.type == "modify":
            await self.storage.upload(
                f"{preview_path}/{change.path}",
                json.dumps(change.new_value)
            )
        elif change.type == "remove":
            await self.storage.delete(f"{preview_path}/{change.path}")
    
    async def _apply_change_to_production(self, change: Change):
        """应用变更到生产环境"""
        # 这里应该实现实际的生产环境变更逻辑
        # 例如：更新数据库、部署代码、更新配置等
        pass


# ==================== 工具函数 ====================

def create_preview_controller(db_session: Session, 
                             storage=None) -> PreviewController:
    """
    创建 Preview Controller 实例
    
    Args:
        db_session: 数据库会话
        storage: 存储服务
    
    Returns:
        PreviewController: 实例
    """
    return PreviewController(db_session, storage)
