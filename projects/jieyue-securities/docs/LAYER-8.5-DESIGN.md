# 捷阅证券信息系统 - Layer 8.5 Governance Control Plane 详细设计

**日期**: 2026-04-02  
**版本**: 1.0.0  
**状态**: 设计中

---

## 📋 执行摘要

本文档详细描述 Layer 8.5 Governance Control Plane 的实现设计，包括 5 个核心模块的接口定义、数据结构和算法流程。

---

## 🏗️ 一、模块概述

### 1.1 模块清单

| 模块 | 文件 | 行数 | 复杂度 |
|------|------|------|--------|
| Ownership Lattice | `ownership_lattice.py` | ~400 | 高 |
| Contract Pack | `contract_pack.py` | ~350 | 中 |
| MCP Bus | `mcp_bus.py` | ~450 | 高 |
| Preview Controller | `preview_controller.py` | ~300 | 中 |
| Readiness Gate | `readiness_gate.py` | ~250 | 中 |

### 1.2 依赖关系

```
                    ┌───────────────────┐
                    │   Control Plane   │
                    └─────────┬─────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│Ownership Lattice│ │  Contract Pack  │ │    MCP Bus      │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│Preview Controller│ │ Readiness Gate  │ │   Audit Logger  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 🔐 二、Ownership Lattice 详细设计

### 2.1 类结构

```python
class OwnershipLattice:
    """所有权晶格权限控制系统"""
    
    def __init__(self, db_session: Session, cache: Redis):
        self.db = db_session
        self.cache = cache
        self.rules: List[OwnershipRule] = []
    
    async def check(self, agent_id: str, resource_type: str, 
                   resource_id: str, action: str) -> CheckResult:
        """
        检查权限
        
        Args:
            agent_id: Agent 标识
            resource_type: 资源类型 (task, contract, model)
            resource_id: 资源标识
            action: 操作类型 (read, write, execute, delegate, admin)
        
        Returns:
            CheckResult: 检查结果
        """
        # 1. 检查缓存
        cache_key = f"permission:{agent_id}:{resource_type}:{resource_id}:{action}"
        cached = await self.cache.get(cache_key)
        if cached:
            return CheckResult.model_validate_json(cached)
        
        # 2. 查找资源所有者
        owner = await self._get_owner(resource_type, resource_id)
        if not owner:
            return CheckResult(allowed=False, reason="Resource not found")
        
        # 3. 检查是否是所有者
        if agent_id == owner.owner_id:
            result = CheckResult(allowed=True, reason="Is owner")
            await self.cache.setex(cache_key, 300, result.model_dump_json())
            return result
        
        # 4. 检查直接权限
        permission = await self._get_permission(agent_id, resource_type, resource_id)
        if permission and action in permission.permissions:
            result = CheckResult(allowed=True, reason="Has permission")
            await self.cache.setex(cache_key, 300, result.model_dump_json())
            return result
        
        # 5. 检查委托权限
        delegation = await self._get_delegation(agent_id, resource_type, resource_id)
        if delegation and action in delegation.permissions:
            result = CheckResult(allowed=True, reason="Has delegation")
            await self.cache.setex(cache_key, 300, result.model_dump_json())
            return result
        
        # 6. 拒绝
        result = CheckResult(allowed=False, reason="No permission")
        await self.cache.setex(cache_key, 60, result.model_dump_json())
        return result
    
    async def grant(self, owner_id: str, agent_id: str, resource_type: str,
                   resource_id: str, permissions: List[str],
                   expires_at: Optional[datetime] = None) -> GrantResult:
        """授予权限"""
        # 验证所有者身份
        owner = await self._get_owner(resource_type, resource_id)
        if not owner or owner.owner_id != owner_id:
            return GrantResult(success=False, reason="Not owner")
        
        # 创建权限记录
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
        
        return GrantResult(success=True, record_id=record.id)
    
    async def revoke(self, owner_id: str, agent_id: str, 
                    resource_type: str, resource_id: str) -> RevokeResult:
        """撤销权限"""
        # 查找并删除权限记录
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
        """生成所有权证明"""
        # 获取权限记录
        record = await self._get_permission(agent_id, resource_type, resource_id)
        if not record:
            raise ValueError("No permission found")
        
        # 生成证明
        proof_data = {
            "proof_id": str(uuid.uuid4()),
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
            verification_url=f"/api/v1/governance/verify-proof/{proof_data['proof_id']}"
        )
    
    def _sign_proof(self, proof_data: Dict) -> str:
        """生成证明签名"""
        message = json.dumps(proof_data, sort_keys=True)
        return hmac.new(
            self.signing_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
```

### 2.2 数据模型

```python
class OwnershipRecord(Base):
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


class CheckResult(BaseModel):
    allowed: bool
    reason: str
    permissions: Optional[List[str]] = None
    expires_at: Optional[datetime] = None


class GrantResult(BaseModel):
    success: bool
    reason: Optional[str] = None
    record_id: Optional[int] = None


class RevokeResult(BaseModel):
    success: bool
    reason: Optional[str] = None


class OwnershipProof(BaseModel):
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
```

### 2.3 权限检查流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Permission Check Flow                     │
└─────────────────────────────────────────────────────────────┘

     ┌─────────────┐
     │   Request   │
     └──────┬──────┘
            │
            ▼
     ┌─────────────┐
     │ Check Cache │────Hit────▶ Return Cached Result
     └──────┬──────┘
            │ Miss
            ▼
     ┌─────────────┐
     │Find Resource│────Not Found────▶ Deny
     └──────┬──────┘
            │ Found
            ▼
     ┌─────────────┐
     │  Is Owner?  │────Yes────▶ Allow
     └──────┬──────┘
            │ No
            ▼
     ┌─────────────┐
     │Has Permission?│───Yes────▶ Allow
     └──────┬──────┘
            │ No
            ▼
     ┌─────────────┐
     │Has Delegation?│───Yes────▶ Allow
     └──────┬──────┘
            │ No
            ▼
     ┌─────────────┐
     │    Deny     │
     └─────────────┘
```

---

## 📄 三、Contract Pack 详细设计

### 3.1 类结构

```python
class ContractPack:
    """契约包管理系统"""
    
    def __init__(self, db_session: Session, storage: StorageService):
        self.db = db_session
        self.storage = storage
        self.validators: Dict[str, ContractValidator] = {}
    
    async def register(self, contract: ContractCreate) -> RegisterResult:
        """
        注册新契约
        
        Args:
            contract: 契约创建信息
        
        Returns:
            RegisterResult: 注册结果
        """
        # 验证契约格式
        validator = self._get_validator(contract.type)
        validation = await validator.validate(contract.spec)
        if not validation.valid:
            return RegisterResult(
                success=False,
                reason=f"Invalid contract: {validation.errors}"
            )
        
        # 检查版本是否已存在
        existing = await self._get_contract(contract.name, contract.version)
        if existing:
            return RegisterResult(
                success=False,
                reason="Contract version already exists"
            )
        
        # 创建契约记录
        db_contract = Contract(
            name=contract.name,
            version=contract.version,
            type=contract.type,
            spec=contract.spec,
            status="draft",
            owner_id=contract.owner_id
        )
        self.db.add(db_contract)
        self.db.commit()
        self.db.refresh(db_contract)
        
        # 存储契约文件
        spec_path = f"contracts/{contract.name}/{contract.version}/spec.json"
        await self.storage.upload(spec_path, json.dumps(contract.spec))
        
        return RegisterResult(
            success=True,
            contract_id=db_contract.id,
            version=db_contract.version
        )
    
    async def validate(self, contract_id: int, 
                      changes: List[Change]) -> ValidationResult:
        """
        验证契约变更
        
        Args:
            contract_id: 契约 ID
            changes: 变更列表
        
        Returns:
            ValidationResult: 验证结果
        """
        # 获取契约
        contract = await self._get_contract_by_id(contract_id)
        if not contract:
            return ValidationResult(
                valid=False,
                errors=["Contract not found"]
            )
        
        # 应用变更
        new_spec = self._apply_changes(contract.spec, changes)
        
        # 验证新契约
        validator = self._get_validator(contract.type)
        validation = await validator.validate(new_spec)
        
        # 检查兼容性
        compatibility = await self._check_compatibility(
            contract.spec,
            new_spec,
            contract.type
        )
        
        return ValidationResult(
            valid=validation.valid and compatibility.compatible,
            errors=validation.errors + compatibility.errors,
            warnings=compatibility.warnings,
            breaking_changes=compatibility.breaking_changes
        )
    
    async def check_compatibility(self, old_version: str, 
                                 new_version: str) -> CompatibilityResult:
        """检查版本兼容性"""
        # 获取两个版本的契约
        old_contract = await self._get_contract_by_version(old_version)
        new_contract = await self._get_contract_by_version(new_version)
        
        if not old_contract or not new_contract:
            return CompatibilityResult(
                compatible=False,
                errors=["Contract version not found"]
            )
        
        # 检查类型是否一致
        if old_contract.type != new_contract.type:
            return CompatibilityResult(
                compatible=False,
                errors=["Contract type mismatch"]
            )
        
        # 检查 Breaking Changes
        breaking_changes = await self._detect_breaking_changes(
            old_contract.spec,
            new_contract.spec,
            old_contract.type
        )
        
        return CompatibilityResult(
            compatible=len(breaking_changes) == 0,
            breaking_changes=breaking_changes,
            warnings=[]
        )
    
    async def activate(self, contract_id: int) -> ActivateResult:
        """激活契约"""
        contract = await self._get_contract_by_id(contract_id)
        if not contract:
            return ActivateResult(success=False, reason="Contract not found")
        
        contract.status = "active"
        self.db.commit()
        
        return ActivateResult(success=True)
    
    async def deprecate(self, contract_id: int, 
                       replacement_id: Optional[int] = None) -> DeprecateResult:
        """废弃契约"""
        contract = await self._get_contract_by_id(contract_id)
        if not contract:
            return DeprecateResult(success=False, reason="Contract not found")
        
        contract.status = "deprecated"
        if replacement_id:
            contract.replacement_id = replacement_id
        self.db.commit()
        
        return DeprecateResult(success=True)
```

### 3.2 数据模型

```python
class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(256), nullable=False, index=True)
    version = Column(String(50), nullable=False)
    type = Column(String(50), nullable=False)  # openapi, graphql, grpc
    spec = Column(JSON, nullable=False)
    status = Column(String(20), default="draft", index=True)
    owner_id = Column(String(256), nullable=False)
    replacement_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('name', 'version', name='uniq_contract_version'),
        Index('idx_name_status', 'name', 'status'),
    )


class ContractChange(Base):
    __tablename__ = "contract_changes"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    contract_id = Column(BigInteger, ForeignKey('contracts.id'), nullable=False)
    change_type = Column(String(50), nullable=False)  # add, remove, modify
    path = Column(String(512), nullable=False)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class RegisterResult(BaseModel):
    success: bool
    reason: Optional[str] = None
    contract_id: Optional[int] = None
    version: Optional[str] = None


class ValidationResult(BaseModel):
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    breaking_changes: List[str] = []


class CompatibilityResult(BaseModel):
    compatible: bool
    errors: List[str] = []
    warnings: List[str] = []
    breaking_changes: List[str] = []
```

### 3.3 Breaking Change 检测

```python
class BreakingChangeDetector:
    """Breaking Change 检测器"""
    
    async def detect(self, old_spec: Dict, new_spec: Dict, 
                    contract_type: str) -> List[BreakingChange]:
        """检测 Breaking Changes"""
        breaking_changes = []
        
        if contract_type == "openapi":
            breaking_changes.extend(await self._detect_openapi_breaking(
                old_spec, new_spec
            ))
        elif contract_type == "graphql":
            breaking_changes.extend(await self._detect_graphql_breaking(
                old_spec, new_spec
            ))
        
        return breaking_changes
    
    async def _detect_openapi_breaking(self, old_spec: Dict, 
                                       new_spec: Dict) -> List[BreakingChange]:
        """检测 OpenAPI Breaking Changes"""
        changes = []
        
        # 检查移除的端点
        old_paths = set(old_spec.get("paths", {}).keys())
        new_paths = set(new_spec.get("paths", {}).keys())
        removed_paths = old_paths - new_paths
        
        for path in removed_paths:
            changes.append(BreakingChange(
                type="endpoint_removed",
                path=path,
                description=f"Endpoint {path} was removed"
            ))
        
        # 检查移除的必填字段
        old_schemas = old_spec.get("components", {}).get("schemas", {})
        new_schemas = new_spec.get("components", {}).get("schemas", {})
        
        for schema_name, old_schema in old_schemas.items():
            if schema_name in new_schemas:
                new_schema = new_schemas[schema_name]
                old_required = set(old_schema.get("required", []))
                new_required = set(new_schema.get("required", []))
                
                # 新增必填字段是 Breaking Change
                added_required = new_required - old_required
                for field in added_required:
                    changes.append(BreakingChange(
                        type="required_field_added",
                        path=f"{schema_name}.{field}",
                        description=f"Field {field} is now required"
                    ))
        
        return changes
```

---

## 📨 四、MCP Bus 详细设计

### 4.1 类结构

```python
class MCPBus:
    """MCP 消息总线"""
    
    def __init__(self, redis: Redis, db_session: Session):
        self.redis = redis
        self.db = db_session
        self.subscribers: Dict[str, Set[str]] = defaultdict(set)
        self.message_handlers: Dict[str, Callable] = {}
    
    async def publish(self, message: MCPMessage) -> PublishResult:
        """
        发布消息
        
        Args:
            message: MCP 消息
        
        Returns:
            PublishResult: 发布结果
        """
        # 验证消息
        validation = self._validate_message(message)
        if not validation.valid:
            return PublishResult(
                success=False,
                errors=validation.errors
            )
        
        # 生成消息 ID
        if not message.id:
            message.id = str(uuid.uuid4())
        
        # 生成 Trace ID
        if not message.trace_id:
            message.trace_id = str(uuid.uuid4())
        
        # 存储消息
        await self._store_message(message)
        
        # 发布到 Redis
        if message.to_agent == "*":
            # 广播
            await self.redis.publish("mcp:broadcast", message.model_dump_json())
        else:
            # 点对点
            await self.redis.publish(f"mcp:agent:{message.to_agent}", 
                                    message.model_dump_json())
        
        # 如果需要确认，设置超时
        if message.requires_ack:
            await self.redis.setex(
                f"mcp:pending:{message.id}",
                message.ttl,
                message.model_dump_json()
            )
        
        return PublishResult(
            success=True,
            message_id=message.id,
            trace_id=message.trace_id
        )
    
    async def subscribe(self, agent_id: str, 
                       topics: List[str]) -> Subscription:
        """订阅主题"""
        subscription_id = str(uuid.uuid4())
        
        for topic in topics:
            self.subscribers[topic].add(agent_id)
            await self.redis.subscribe(f"mcp:topic:{topic}")
        
        return Subscription(
            subscription_id=subscription_id,
            agent_id=agent_id,
            topics=topics
        )
    
    async def request_response(self, message: MCPMessage, 
                               timeout: int = 30) -> MCPMessage:
        """请求 - 响应模式"""
        # 设置相关性 ID
        message.correlation_id = str(uuid.uuid4())
        message.requires_ack = True
        
        # 发布请求
        result = await self.publish(message)
        if not result.success:
            raise MCPError(f"Failed to publish: {result.errors}")
        
        # 等待响应
        response_key = f"mcp:response:{message.correlation_id}"
        response = await self.redis.blpop(response_key, timeout=timeout)
        
        if not response:
            raise MCPTimeoutError(f"Request timed out after {timeout}s")
        
        return MCPMessage.model_validate_json(response[1])
    
    async def acknowledge(self, message_id: str, 
                         agent_id: str, status: str) -> AckResult:
        """确认消息"""
        # 验证消息
        message = await self._get_message(message_id)
        if not message:
            return AckResult(success=False, reason="Message not found")
        
        if message.to_agent != agent_id and message.to_agent != "*":
            return AckResult(success=False, reason="Not recipient")
        
        # 更新消息状态
        await self._update_message_status(message_id, status)
        
        # 删除待处理标记
        await self.redis.delete(f"mcp:pending:{message_id}")
        
        return AckResult(success=True)
```

### 4.2 数据模型

```python
class MCPMessage(BaseModel):
    """MCP 消息模型"""
    protocol: str = "mcp/1.0"
    id: Optional[str] = None
    from_agent: str
    to_agent: Union[str, List[str]]  # "*" for broadcast
    type: str  # proposal, query, command, feedback, approval, telemetry
    payload: Dict[str, Any]
    ttl: int = 300
    correlation_id: Optional[str] = None
    schema_version: str = "2026-03"
    requires_ack: bool = True
    idempotent_key: Optional[str] = None
    trace_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class MCPMessageLog(Base):
    __tablename__ = "mcp_message_logs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    message_id = Column(String(256), unique=True, nullable=False, index=True)
    from_agent = Column(String(256), nullable=False, index=True)
    to_agent = Column(String(256), nullable=False, index=True)
    message_type = Column(String(50), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(String(20), default="pending", index=True)
    created_at = Column(DateTime, server_default=func.now())
    delivered_at = Column(DateTime, nullable=True)
    ack_at = Column(DateTime, nullable=True)
    trace_id = Column(String(256), nullable=True, index=True)
    correlation_id = Column(String(256), nullable=True, index=True)
    
    __table_args__ = (
        Index('idx_created', 'created_at', 'status'),
    )


class PublishResult(BaseModel):
    success: bool
    errors: List[str] = []
    message_id: Optional[str] = None
    trace_id: Optional[str] = None


class Subscription(BaseModel):
    subscription_id: str
    agent_id: str
    topics: List[str]


class AckResult(BaseModel):
    success: bool
    reason: Optional[str] = None
```

### 4.3 消息流转

```
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Message Flow                            │
└─────────────────────────────────────────────────────────────────┘

  Publisher                          MCP Bus                          Subscriber
     │                                 │                                  │
     │  1. publish(message)            │                                  │
     │────────────────────────────────▶│                                  │
     │                                 │                                  │
     │                                 │  2. validate(message)            │
     │                                 │  3. store(message)               │
     │                                 │  4. redis.publish(topic)         │
     │                                 │                                  │
     │                                 │  5. deliver(message)             │
     │                                 │─────────────────────────────────▶│
     │                                 │                                  │
     │                                 │  6. process(message)             │
     │                                 │                                  │
     │                                 │  7. ack(message_id, status)      │
     │                                 │◀─────────────────────────────────│
     │                                 │                                  │
     │  8. publish_result              │                                  │
     │◀────────────────────────────────│                                  │
     │                                 │                                  │
```

---

## 👁️ 五、Preview Controller 详细设计

### 5.1 类结构

```python
class PreviewController:
    """预览可用性控制器"""
    
    def __init__(self, storage: StorageService, db_session: Session):
        self.storage = storage
        self.db = db_session
        self.probes: List[Probe] = []
    
    async def create_preview(self, changes: List[Change], 
                            context: PreviewContext) -> Preview:
        """创建预览"""
        preview_id = str(uuid.uuid4())
        
        # 创建预览记录
        preview = Preview(
            id=preview_id,
            changes=changes,
            context=context,
            status="pending",
            created_by=context.user_id
        )
        self.db.add(preview)
        self.db.commit()
        
        # 应用变更到预览环境
        preview_path = f"previews/{preview_id}"
        await self.storage.create_directory(preview_path)
        
        for change in changes:
            await self._apply_change_to_preview(preview_path, change)
        
        # 运行探针检查
        probe_results = await self._run_probes(preview_path)
        
        # 更新预览状态
        preview.status = "ready" if all(r.passed for r in probe_results) else "failed"
        preview.probe_results = probe_results
        self.db.commit()
        
        return preview
    
    async def validate_preview(self, preview_id: str) -> ValidationResult:
        """验证预览"""
        preview = await self._get_preview(preview_id)
        if not preview:
            return ValidationResult(
                valid=False,
                errors=["Preview not found"]
            )
        
        if preview.status != "ready":
            return ValidationResult(
                valid=False,
                errors=[f"Preview not ready: {preview.status}"]
            )
        
        # 运行验证探针
        probe_results = await self._run_probes(f"previews/{preview_id}")
        
        return ValidationResult(
            valid=all(r.passed for r in probe_results),
            errors=[r.error for r in probe_results if not r.passed],
            warnings=[r.warning for r in probe_results if r.warning]
        )
    
    async def apply_preview(self, preview_id: str) -> ApplyResult:
        """应用预览"""
        preview = await self._get_preview(preview_id)
        if not preview:
            return ApplyResult(success=False, reason="Preview not found")
        
        if preview.status != "ready":
            return ApplyResult(success=False, reason="Preview not ready")
        
        # 应用变更到生产环境
        for change in preview.changes:
            await self._apply_change_to_production(change)
        
        # 更新预览状态
        preview.status = "applied"
        preview.applied_at = datetime.utcnow()
        self.db.commit()
        
        return ApplyResult(success=True, preview_id=preview_id)
```

---

## 🚦 六、Readiness Gate 详细设计

### 6.1 类结构

```python
class ReadinessGate:
    """就绪门禁系统"""
    
    def __init__(self, db_session: Session, cache: Redis):
        self.db = db_session
        self.cache = cache
        self.services: Dict[str, Service] = {}
        self.probes: Dict[str, Probe] = {}
    
    def check(self, service_id: str) -> ReadinessResult:
        """检查服务就绪状态"""
        service = self.services.get(service_id)
        if not service:
            return ReadinessResult(
                ready=False,
                reason="Service not registered"
            )
        
        # 运行所有探针
        probe_results = []
        for probe in service.probes:
            result = self._run_probe(probe)
            probe_results.append(result)
        
        # 检查所有探针是否通过
        all_passed = all(r.passed for r in probe_results)
        
        return ReadinessResult(
            ready=all_passed,
            service_id=service_id,
            probe_results=probe_results,
            timestamp=datetime.utcnow()
        )
    
    def probe(self, service_id: str, probe_type: str) -> ProbeResult:
        """执行探针检查"""
        service = self.services.get(service_id)
        if not service:
            return ProbeResult(passed=False, error="Service not registered")
        
        probe = self._get_probe(service, probe_type)
        if not probe:
            return ProbeResult(passed=False, error=f"Probe {probe_type} not found")
        
        return self._run_probe(probe)
    
    def register(self, service: Service) -> RegisterResult:
        """注册服务"""
        self.services[service.id] = service
        
        # 存储到缓存
        self.cache.setex(
            f"service:{service.id}",
            3600,
            json.dumps(service.model_dump())
        )
        
        return RegisterResult(success=True, service_id=service.id)
    
    def deregister(self, service_id: str) -> DeregisterResult:
        """注销服务"""
        if service_id not in self.services:
            return DeregisterResult(success=False, reason="Service not found")
        
        del self.services[service_id]
        self.cache.delete(f"service:{service_id}")
        
        return DeregisterResult(success=True)
    
    def _run_probe(self, probe: Probe) -> ProbeResult:
        """运行探针"""
        try:
            if probe.type == "http":
                return self._run_http_probe(probe)
            elif probe.type == "tcp":
                return self._run_tcp_probe(probe)
            elif probe.type == "grpc":
                return self._run_grpc_probe(probe)
            else:
                return ProbeResult(passed=False, error=f"Unknown probe type: {probe.type}")
        except Exception as e:
            return ProbeResult(passed=False, error=str(e))
    
    def _run_http_probe(self, probe: Probe) -> ProbeResult:
        """运行 HTTP 探针"""
        response = requests.get(
            probe.endpoint,
            timeout=probe.timeout
        )
        
        return ProbeResult(
            passed=response.status_code == 200,
            latency_ms=response.elapsed.total_seconds() * 1000,
            details={"status_code": response.status_code}
        )
```

---

## 📊 七、性能优化

### 7.1 缓存策略

| 数据类型 | 缓存键 | TTL | 失效策略 |
|----------|--------|-----|----------|
| 权限检查 | `permission:{agent}:{resource}:{action}` | 300s | 权限变更时 |
| 服务状态 | `service:{service_id}` | 3600s | 服务注册/注销时 |
| 契约数据 | `contract:{name}:{version}` | 600s | 契约更新时 |
| 消息状态 | `mcp:pending:{message_id}` | TTL | 消息确认时 |

### 7.2 数据库索引

```sql
-- Ownership Records
CREATE INDEX idx_resource ON ownership_records(resource_type, resource_id);
CREATE INDEX idx_agent ON ownership_records(agent_id);
CREATE INDEX idx_owner ON ownership_records(owner_id, resource_type);
CREATE INDEX idx_expires ON ownership_records(expires_at);

-- Contracts
CREATE INDEX idx_contract_name ON contracts(name, version);
CREATE INDEX idx_contract_status ON contracts(status);

-- MCP Message Logs
CREATE INDEX idx_message_id ON mcp_message_logs(message_id);
CREATE INDEX idx_trace_id ON mcp_message_logs(trace_id);
CREATE INDEX idx_created ON mcp_message_logs(created_at, status);
```

### 7.3 批量操作

```python
class BatchPermissionChecker:
    """批量权限检查器"""
    
    async def check_batch(self, requests: List[PermissionRequest]) -> List[CheckResult]:
        """批量检查权限"""
        # 1. 检查缓存
        cache_keys = [self._get_cache_key(r) for r in requests]
        cached = await self.cache.mget(cache_keys)
        
        # 2. 找出未命中的请求
        pending = [r for i, r in enumerate(requests) if not cached[i]]
        
        # 3. 批量查询数据库
        if pending:
            db_results = await self._batch_query(pending)
            
            # 4. 更新缓存
            await self._update_cache(pending, db_results)
        
        # 5. 合并结果
        return self._merge_results(requests, cached, db_results)
```

---

## ✅ 八、测试策略

### 8.1 单元测试

```python
class TestOwnershipLattice:
    
    async def test_check_owner_permission(self):
        """测试所有者权限检查"""
        lattice = OwnershipLattice(self.db, self.cache)
        
        # 创建资源
        resource = await self._create_resource("task", "task_1", "user_1")
        
        # 检查所有者权限
        result = await lattice.check("user_1", "task", "task_1", "write")
        
        assert result.allowed is True
        assert result.reason == "Is owner"
    
    async def test_check_delegated_permission(self):
        """测试委托权限检查"""
        lattice = OwnershipLattice(self.db, self.cache)
        
        # 创建资源和委托
        await self._create_resource("task", "task_1", "user_1")
        await lattice.grant("user_1", "user_2", "task", "task_1", ["read"])
        
        # 检查委托权限
        result = await lattice.check("user_2", "task", "task_1", "read")
        
        assert result.allowed is True
        assert result.reason == "Has delegation"
```

### 8.2 集成测试

```python
class TestGovernanceIntegration:
    
    async def test_full_workflow(self):
        """测试完整工作流程"""
        # 1. 注册契约
        contract_result = await contract_pack.register(contract_data)
        assert contract_result.success
        
        # 2. 授予权限
        grant_result = await ownership_lattice.grant(
            "owner_1", "agent_1", "contract", 
            str(contract_result.contract_id), ["read", "execute"]
        )
        assert grant_result.success
        
        # 3. 发送 MCP 消息
        message = MCPMessage(
            from_agent="test_agent",
            to_agent="agent_1",
            type="command",
            payload={"action": "process"}
        )
        publish_result = await mcp_bus.publish(message)
        assert publish_result.success
        
        # 4. 检查权限
        check_result = await ownership_lattice.check(
            "agent_1", "contract", 
            str(contract_result.contract_id), "execute"
        )
        assert check_result.allowed
```

---

## 📎 附录

### A. API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/v1/governance/check` | POST | 权限检查 |
| `/api/v1/governance/grant` | POST | 授予权限 |
| `/api/v1/governance/revoke` | POST | 撤销权限 |
| `/api/v1/governance/proof` | GET | 获取所有权证明 |
| `/api/v1/governance/contracts` | POST | 注册契约 |
| `/api/v1/governance/contracts/{id}/validate` | POST | 验证契约变更 |
| `/api/v1/governance/mcp/publish` | POST | 发布消息 |
| `/api/v1/governance/mcp/subscribe` | POST | 订阅主题 |
| `/api/v1/governance/preview` | POST | 创建预览 |
| `/api/v1/governance/preview/{id}/apply` | POST | 应用预览 |
| `/api/v1/governance/readiness/{service_id}` | GET | 检查服务就绪状态 |

### B. 错误码

| 错误码 | 描述 |
|--------|------|
| `GOV_001` | 资源不存在 |
| `GOV_002` | 权限不足 |
| `GOV_003` | 契约版本已存在 |
| `GOV_004` | 契约验证失败 |
| `GOV_005` | 消息发布失败 |
| `GOV_006` | 消息超时 |
| `GOV_007` | 预览创建失败 |
| `GOV_008` | 服务未注册 |

---

**文档状态**: 草稿  
**最后更新**: 2026-04-02  
**负责人**: ANFSF 重构团队
