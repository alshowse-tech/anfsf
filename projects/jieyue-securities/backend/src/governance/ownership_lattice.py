"""
Ownership Lattice - 所有权晶格权限控制系统

基于晶格理论实现细粒度资源所有权管理，提供：
- 资源所有权仲裁
- 权限授予和撤销
- 权限检查
- 所有权证明生成
"""
import uuid
import hmac
import hashlib
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy import Column, BigInteger, String, DateTime, JSON, UniqueConstraint, Index
from db.session import Session
from sqlalchemy.sql import func

from db.session import Base


# ==================== 数据模型 ====================

class OwnershipRecord(Base):
    """所有权记录"""
    __tablename__ = "ownership_records"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    resource_type = Column(String(50), nullable=False, index=True)
    resource_id = Column(String(256), nullable=False, index=True)
    owner_id = Column(String(256), nullable=False)
    agent_id = Column(String(256), nullable=False, index=True)
    permissions = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True, index=True)
    
    __table_args__ = (
        UniqueConstraint('resource_type', 'resource_id', 'agent_id', 
                        name='uniq_resource_agent'),
        Index('idx_owner', 'owner_id', 'resource_type'),
    )


# ==================== 结果模型 ====================

class CheckResult(BaseModel):
    """权限检查结果"""
    allowed: bool
    reason: str
    permissions: Optional[List[str]] = None
    expires_at: Optional[str] = None


class GrantResult(BaseModel):
    """授权结果"""
    success: bool
    reason: Optional[str] = None
    record_id: Optional[int] = None


class RevokeResult(BaseModel):
    """撤销结果"""
    success: bool
    reason: Optional[str] = None


class OwnershipProof(BaseModel):
    """所有权证明"""
    proof_id: str
    resource_type: str
    resource_id: str
    owner_id: str
    agent_id: str
    permissions: List[str]
    signature: str
    timestamp: str
    expires_at: Optional[str]
    verification_url: str


# ==================== 权限类型 ====================

class PermissionType:
    """权限类型定义"""
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"
    DELEGATE = "delegate"
    ADMIN = "admin"
    
    ALL = [READ, WRITE, EXECUTE, DELEGATE, ADMIN]


# ==================== 所有权规则 ====================

class OwnershipRule(BaseModel):
    """所有权规则"""
    id: str
    name: str
    description: str
    condition: str  # 规则条件表达式
    action: str  # 允许/拒绝
    priority: int = 0


# ==================== Ownership Lattice 主类 ====================

class OwnershipLattice:
    """
    所有权晶格权限控制系统
    
    基于晶格理论实现细粒度资源所有权管理
    """
    
    def __init__(self, db_session=None, cache=None, signing_key: str = "default-key"):
        """
        初始化所有权晶格
        
        Args:
            db_session: 数据库会话
            cache: Redis 缓存客户端 (可选)
            signing_key: 签名密钥
        """
        self.db = db_session or Session()
        self.cache = cache
        self.signing_key = signing_key
        self.rules: List[OwnershipRule] = []
    
    async def check(self, agent_id: str, resource_type: str, 
                   resource_id: str, action: str) -> CheckResult:
        """
        检查权限
        
        Args:
            agent_id: Agent 标识
            resource_type: 资源类型 (task, contract, model 等)
            resource_id: 资源标识
            action: 操作类型 (read, write, execute, delegate, admin)
        
        Returns:
            CheckResult: 检查结果
        """
        # 1. 检查缓存
        if self.cache:
            cache_key = f"permission:{agent_id}:{resource_type}:{resource_id}:{action}"
            cached = await self.cache.get(cache_key)
            if cached:
                return CheckResult.model_validate_json(cached)
        
        # 2. 查找资源所有者
        owner = await self._get_owner(resource_type, resource_id)
        if not owner:
            result = CheckResult(allowed=False, reason="Resource not found")
            if self.cache:
                cache_key = f"permission:{agent_id}:{resource_type}:{resource_id}:{action}"
                await self.cache.setex(cache_key, 60, result.model_dump_json())
            return result
        
        # 3. 检查是否是所有者
        if agent_id == owner.owner_id:
            result = CheckResult(
                allowed=True, 
                reason="Is owner",
                permissions=owner.permissions
            )
            if self.cache:
                cache_key = f"permission:{agent_id}:{resource_type}:{resource_id}:{action}"
                await self.cache.setex(cache_key, 300, result.model_dump_json())
            return result
        
        # 4. 检查直接权限
        permission = await self._get_permission(agent_id, resource_type, resource_id)
        if permission and action in permission.permissions:
            # 检查是否过期
            if permission.expires_at and permission.expires_at < datetime.utcnow():
                result = CheckResult(allowed=False, reason="Permission expired")
            else:
                result = CheckResult(
                    allowed=True, 
                    reason="Has permission",
                    permissions=permission.permissions,
                    expires_at=permission.expires_at.isoformat() if permission.expires_at else None
                )
            if self.cache:
                cache_key = f"permission:{agent_id}:{resource_type}:{resource_id}:{action}"
                await self.cache.setex(cache_key, 300, result.model_dump_json())
            return result
        
        # 5. 检查委托权限
        delegation = await self._get_delegation(agent_id, resource_type, resource_id)
        if delegation and action in delegation.permissions:
            if delegation.expires_at and delegation.expires_at < datetime.utcnow():
                result = CheckResult(allowed=False, reason="Delegation expired")
            else:
                result = CheckResult(
                    allowed=True, 
                    reason="Has delegation",
                    permissions=delegation.permissions,
                    expires_at=delegation.expires_at.isoformat() if delegation.expires_at else None
                )
            if self.cache:
                cache_key = f"permission:{agent_id}:{resource_type}:{resource_id}:{action}"
                await self.cache.setex(cache_key, 300, result.model_dump_json())
            return result
        
        # 6. 检查规则
        rule_result = await self._check_rules(agent_id, resource_type, resource_id, action)
        if rule_result.allowed:
            if self.cache:
                cache_key = f"permission:{agent_id}:{resource_type}:{resource_id}:{action}"
                await self.cache.setex(cache_key, 300, rule_result.model_dump_json())
            return rule_result
        
        # 7. 拒绝
        result = CheckResult(allowed=False, reason="No permission")
        if self.cache:
            cache_key = f"permission:{agent_id}:{resource_type}:{resource_id}:{action}"
            await self.cache.setex(cache_key, 60, result.model_dump_json())
        return result
    
    async def grant(self, owner_id: str, agent_id: str, resource_type: str,
                   resource_id: str, permissions: List[str],
                   expires_at: Optional[datetime] = None) -> GrantResult:
        """
        授予权限
        
        Args:
            owner_id: 所有者 ID
            agent_id: Agent ID
            resource_type: 资源类型
            resource_id: 资源标识
            permissions: 权限列表
            expires_at: 过期时间
        
        Returns:
            GrantResult: 授权结果
        """
        # 验证所有者身份
        owner = await self._get_owner(resource_type, resource_id)
        if not owner or owner.owner_id != owner_id:
            return GrantResult(success=False, reason="Not owner")
        
        # 验证权限有效性
        for perm in permissions:
            if perm not in PermissionType.ALL:
                return GrantResult(success=False, reason=f"Invalid permission: {perm}")
        
        # 检查是否已存在权限记录
        existing = await self._get_permission(agent_id, resource_type, resource_id)
        if existing:
            # 更新现有权限
            existing.permissions = permissions
            existing.expires_at = expires_at
        else:
            # 创建新权限记录
            record = OwnershipRecord(
                resource_type=resource_type,
                resource_id=resource_id,
                owner_id=owner_id,
                agent_id=agent_id,
                permissions=permissions,
                expires_at=expires_at
            )
            self.db.add(record)
        
        self.db.commit()
        
        # 清除缓存
        await self._invalidate_cache(resource_type, resource_id)
        
        return GrantResult(
            success=True, 
            record_id=existing.id if existing else record.id
        )
    
    async def revoke(self, owner_id: str, agent_id: str, 
                    resource_type: str, resource_id: str) -> RevokeResult:
        """
        撤销权限
        
        Args:
            owner_id: 所有者 ID
            agent_id: Agent ID
            resource_type: 资源类型
            resource_id: 资源标识
        
        Returns:
            RevokeResult: 撤销结果
        """
        # 查找权限记录
        record = await self._get_permission(agent_id, resource_type, resource_id)
        if not record or record.owner_id != owner_id:
            return RevokeResult(success=False, reason="Permission not found")
        
        self.db.delete(record)
        self.db.commit()
        
        # 清除缓存
        await self._invalidate_cache(resource_type, resource_id)
        
        return RevokeResult(success=True)
    
    async def prove(self, agent_id: str, resource_type: str, 
                   resource_id: str) -> OwnershipProof:
        """
        生成所有权证明
        
        Args:
            agent_id: Agent ID
            resource_type: 资源类型
            resource_id: 资源标识
        
        Returns:
            OwnershipProof: 所有权证明
        """
        # 获取权限记录
        record = await self._get_permission(agent_id, resource_type, resource_id)
        if not record:
            raise ValueError("No permission found")
        
        # 生成证明数据
        proof_id = str(uuid.uuid4())
        proof_data = {
            "proof_id": proof_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "owner_id": record.owner_id,
            "agent_id": agent_id,
            "permissions": record.permissions,
            "timestamp": datetime.utcnow().isoformat(),
            "expires_at": record.expires_at.isoformat() if record.expires_at else None
        }
        
        # 生成签名
        signature = self._sign_proof(proof_data)
        
        return OwnershipProof(
            **proof_data,
            signature=signature,
            verification_url=f"/api/v1/governance/verify-proof/{proof_id}"
        )
    
    async def register_resource(self, resource_type: str, resource_id: str, 
                               owner_id: str) -> bool:
        """
        注册资源所有权
        
        Args:
            resource_type: 资源类型
            resource_id: 资源标识
            owner_id: 所有者 ID
        
        Returns:
            bool: 是否成功
        """
        # 检查是否已存在
        existing = await self._get_owner(resource_type, resource_id)
        if existing:
            return False
        
        # 创建所有权记录
        record = OwnershipRecord(
            resource_type=resource_type,
            resource_id=resource_id,
            owner_id=owner_id,
            agent_id=owner_id,
            permissions=PermissionType.ALL,
            expires_at=None
        )
        self.db.add(record)
        self.db.commit()
        
        return True
    
    def _sign_proof(self, proof_data: Dict[str, Any]) -> str:
        """生成证明签名"""
        # 创建签名字符串
        message = json.dumps(proof_data, sort_keys=True)
        signature = hmac.new(
            self.signing_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    async def verify_proof(self, proof: OwnershipProof) -> bool:
        """验证所有权证明"""
        # 重新生成签名
        proof_data = {
            "proof_id": proof.proof_id,
            "resource_type": proof.resource_type,
            "resource_id": proof.resource_id,
            "owner_id": proof.owner_id,
            "agent_id": proof.agent_id,
            "permissions": proof.permissions,
            "timestamp": proof.timestamp,
            "expires_at": proof.expires_at
        }
        
        expected_signature = self._sign_proof(proof_data)
        
        # 验证签名
        if not hmac.compare_digest(proof.signature, expected_signature):
            return False
        
        # 验证过期时间
        if proof.expires_at:
            expires_at = datetime.fromisoformat(proof.expires_at)
            if expires_at < datetime.utcnow():
                return False
        
        return True
    
    async def _get_owner(self, resource_type: str, resource_id: str) -> Optional[OwnershipRecord]:
        """获取资源所有者"""
        record = self.db.query(OwnershipRecord).filter(
            OwnershipRecord.resource_type == resource_type,
            OwnershipRecord.resource_id == resource_id,
            OwnershipRecord.owner_id == OwnershipRecord.agent_id
        ).first()
        return record
    
    async def _get_permission(self, agent_id: str, resource_type: str, 
                             resource_id: str) -> Optional[OwnershipRecord]:
        """获取权限记录"""
        record = self.db.query(OwnershipRecord).filter(
            OwnershipRecord.resource_type == resource_type,
            OwnershipRecord.resource_id == resource_id,
            OwnershipRecord.agent_id == agent_id,
            OwnershipRecord.owner_id != OwnershipRecord.agent_id
        ).first()
        return record
    
    async def _get_delegation(self, agent_id: str, resource_type: str, 
                             resource_id: str) -> Optional[OwnershipRecord]:
        """获取委托权限 (与_get_permission 相同，预留扩展)"""
        return await self._get_permission(agent_id, resource_type, resource_id)
    
    async def _check_rules(self, agent_id: str, resource_type: str, 
                          resource_id: str, action: str) -> CheckResult:
        """检查规则 (预留实现)"""
        # TODO: 实现规则引擎
        return CheckResult(allowed=False, reason="No matching rules")
    
    async def _invalidate_cache(self, resource_type: str, resource_id: str):
        """清除缓存"""
        if self.cache:
            # 清除所有相关的缓存键
            pattern = f"permission:*:{resource_type}:{resource_id}:*"
            # Redis 通配符删除需要 SCAN
            keys = await self.cache.keys(pattern)
            if keys:
                await self.cache.delete(*keys)
    
    def add_rule(self, rule: OwnershipRule):
        """添加所有权规则"""
        self.rules.append(rule)
        self.rules.sort(key=lambda r: r.priority, reverse=True)
    
    def remove_rule(self, rule_id: str):
        """移除所有权规则"""
        self.rules = [r for r in self.rules if r.id != rule_id]


# ==================== 工具函数 ====================

def create_ownership_lattice(db_session: Session, cache=None, 
                            signing_key: str = None) -> OwnershipLattice:
    """
    创建 Ownership Lattice 实例
    
    Args:
        db_session: 数据库会话
        cache: Redis 缓存客户端
        signing_key: 签名密钥
    
    Returns:
        OwnershipLattice: 实例
    """
    import os
    if not signing_key:
        signing_key = os.getenv("OWNERSHIP_SIGNING_KEY", "default-key")
    
    return OwnershipLattice(db_session, cache, signing_key)
