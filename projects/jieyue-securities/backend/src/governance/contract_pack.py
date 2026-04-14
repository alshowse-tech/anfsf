"""
Contract Pack - 契约包管理系统

管理 API 契约版本和兼容性，提供：
- 契约注册和版本管理
- 契约变更验证
- 版本兼容性检查
- Breaking Change 检测
"""
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy import Column, BigInteger, String, DateTime, JSON, UniqueConstraint, Index, ForeignKey
from db.session import Session, relationship
from sqlalchemy.sql import func

from db.session import Base


# ==================== 数据模型 ====================

# API 契约模型（用于 API Contract Pack）
class APIContract(Base):
    """API 契约模型"""
    __tablename__ = "api_contracts"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(256), nullable=False, index=True)
    version = Column(String(50), nullable=False)
    type = Column(String(50), nullable=False)  # openapi, graphql, grpc
    spec = Column(JSON, nullable=False)
    status = Column(String(20), default="draft", index=True)  # draft, active, deprecated
    owner_id = Column(String(256), nullable=False)
    replacement_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('name', 'version', name='uniq_api_contract_version'),
        Index('idx_api_name_status', 'name', 'status'),
    )


class APIContractChange(Base):
    """API 契约变更记录"""
    __tablename__ = "api_contract_changes"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    contract_id = Column(BigInteger, ForeignKey('api_contracts.id'), nullable=False)
    change_type = Column(String(50), nullable=False)  # add, remove, modify
    path = Column(String(512), nullable=False)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ==================== 结果模型 ====================

class RegisterResult(BaseModel):
    """注册结果"""
    success: bool
    reason: Optional[str] = None
    contract_id: Optional[int] = None
    version: Optional[str] = None


class ValidationResult(BaseModel):
    """验证结果"""
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    breaking_changes: List[str] = []


class CompatibilityResult(BaseModel):
    """兼容性结果"""
    compatible: bool
    errors: List[str] = []
    warnings: List[str] = []
    breaking_changes: List[str] = []


class ActivateResult(BaseModel):
    """激活结果"""
    success: bool
    reason: Optional[str] = None


class DeprecateResult(BaseModel):
    """废弃结果"""
    success: bool
    reason: Optional[str] = None


# ==================== 契约创建模型 ====================

class ContractCreate(BaseModel):
    """契约创建请求"""
    name: str
    version: str
    type: str  # openapi, graphql, grpc
    spec: Dict[str, Any]
    owner_id: str


class Change(BaseModel):
    """变更"""
    type: str  # add, remove, modify
    path: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None


# ==================== Breaking Change 模型 ====================

class BreakingChange(BaseModel):
    """Breaking Change"""
    type: str
    path: str
    description: str
    severity: str = "high"  # high, medium, low


# ==================== 契约验证器 ====================

class ContractValidator:
    """契约验证器基类"""
    
    async def validate(self, spec: Dict[str, Any]) -> ValidationResult:
        """验证契约格式"""
        raise NotImplementedError
    
    async def detect_breaking_changes(self, old_spec: Dict[str, Any], 
                                      new_spec: Dict[str, Any]) -> List[BreakingChange]:
        """检测 Breaking Changes"""
        raise NotImplementedError


class OpenAPIValidator(ContractValidator):
    """OpenAPI 契约验证器"""
    
    async def validate(self, spec: Dict[str, Any]) -> ValidationResult:
        """验证 OpenAPI 规范"""
        errors = []
        warnings = []
        
        # 检查必需字段
        if "openapi" not in spec:
            errors.append("Missing 'openapi' field")
        elif not spec["openapi"].startswith("3."):
            errors.append("Only OpenAPI 3.x is supported")
        
        if "info" not in spec:
            errors.append("Missing 'info' field")
        else:
            if "title" not in spec["info"]:
                errors.append("Missing 'info.title' field")
            if "version" not in spec["info"]:
                errors.append("Missing 'info.version' field")
        
        if "paths" not in spec:
            errors.append("Missing 'paths' field")
        
        # 检查路径格式
        if "paths" in spec:
            for path, methods in spec["paths"].items():
                if not path.startswith("/"):
                    errors.append(f"Path must start with '/': {path}")
                
                if isinstance(methods, dict):
                    for method in methods:
                        if method.upper() not in ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]:
                            warnings.append(f"Non-standard HTTP method: {method}")
        
        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    async def detect_breaking_changes(self, old_spec: Dict[str, Any], 
                                      new_spec: Dict[str, Any]) -> List[BreakingChange]:
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
                description=f"Endpoint {path} was removed",
                severity="high"
            ))
        
        # 检查移除的 HTTP 方法
        for path in old_paths & new_paths:
            old_methods = set(old_spec["paths"][path].keys())
            new_methods = set(new_spec["paths"][path].keys())
            removed_methods = old_methods - new_methods
            
            for method in removed_methods:
                changes.append(BreakingChange(
                    type="method_removed",
                    path=f"{path} {method.upper()}",
                    description=f"Method {method.upper()} was removed from {path}",
                    severity="high"
                ))
        
        # 检查新增的必填字段
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
                        description=f"Field '{field}' is now required in {schema_name}",
                        severity="high"
                    ))
                
                # 移除字段也是 Breaking Change
                old_properties = set(old_schema.get("properties", {}).keys())
                new_properties = set(new_schema.get("properties", {}).keys())
                removed_properties = old_properties - new_properties
                
                for field in removed_properties:
                    changes.append(BreakingChange(
                        type="field_removed",
                        path=f"{schema_name}.{field}",
                        description=f"Field '{field}' was removed from {schema_name}",
                        severity="medium"
                    ))
        
        # 检查参数变更
        for path in old_paths & new_paths:
            old_path_item = old_spec["paths"][path]
            new_path_item = new_spec["paths"][path]
            
            for method in set(old_path_item.keys()) & set(new_path_item.keys()):
                old_op = old_path_item[method]
                new_op = new_path_item[method]
                
                # 检查参数移除
                old_params = {(p.get("name"), p.get("in")): p 
                             for p in old_op.get("parameters", [])}
                new_params = {(p.get("name"), p.get("in")): p 
                             for p in new_op.get("parameters", [])}
                
                removed_params = set(old_params.keys()) - set(new_params.keys())
                for name, in_ in removed_params:
                    changes.append(BreakingChange(
                        type="parameter_removed",
                        path=f"{path} {method.upper()} {name}",
                        description=f"Parameter '{name}' was removed",
                        severity="high"
                    ))
        
        return changes


class GraphQLValidator(ContractValidator):
    """GraphQL 契约验证器"""
    
    async def validate(self, spec: Dict[str, Any]) -> ValidationResult:
        """验证 GraphQL Schema"""
        errors = []
        warnings = []
        
        # 检查基本结构
        if "types" not in spec:
            errors.append("Missing 'types' definition")
        
        if "query" not in spec and "Mutation" not in str(spec.get("types", {})):
            warnings.append("No Query or Mutation type defined")
        
        # 检查类型定义
        if "types" in spec:
            for type_name, type_def in spec["types"].items():
                if not isinstance(type_def, dict):
                    errors.append(f"Invalid type definition for {type_name}")
                elif "fields" not in type_def:
                    warnings.append(f"Type {type_name} has no fields")
        
        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    async def detect_breaking_changes(self, old_spec: Dict[str, Any], 
                                      new_spec: Dict[str, Any]) -> List[BreakingChange]:
        """检测 GraphQL Breaking Changes"""
        changes = []
        
        old_types = set(old_spec.get("types", {}).keys())
        new_types = set(new_spec.get("types", {}).keys())
        
        # 检查移除的类型
        removed_types = old_types - new_types
        for type_name in removed_types:
            changes.append(BreakingChange(
                type="type_removed",
                path=type_name,
                description=f"Type '{type_name}' was removed",
                severity="high"
            ))
        
        # 检查类型字段变更
        for type_name in old_types & new_types:
            old_fields = set(old_spec["types"][type_name].get("fields", {}).keys())
            new_fields = set(new_spec["types"][type_name].get("fields", {}).keys())
            
            # 移除字段
            removed_fields = old_fields - new_fields
            for field in removed_fields:
                changes.append(BreakingChange(
                    type="field_removed",
                    path=f"{type_name}.{field}",
                    description=f"Field '{field}' was removed from type '{type_name}'",
                    severity="high"
                ))
            
            # 检查必填参数变更
            for field in old_fields & new_fields:
                old_field_def = old_spec["types"][type_name]["fields"][field]
                new_field_def = new_spec["types"][type_name]["fields"][field]
                
                old_args = set(old_field_def.get("args", {}).keys())
                new_args = set(new_field_def.get("args", {}).keys())
                
                # 新增必填参数
                for arg in new_args - old_args:
                    if new_field_def["args"][arg].get("required", False):
                        changes.append(BreakingChange(
                            type="required_arg_added",
                            path=f"{type_name}.{field}.{arg}",
                            description=f"Required argument '{arg}' was added",
                            severity="high"
                        ))
        
        return changes


# ==================== Contract Pack 主类 ====================

class ContractPack:
    """
    契约包管理系统
    
    管理 API 契约版本和兼容性
    """
    
    def __init__(self, db_session=None, storage=None):
        """
        初始化契约包
        
        Args:
            db_session: 数据库会话
            storage: 存储服务 (可选)
        """
        self.db = db_session or Session()
        self.storage = storage
        self.validators: Dict[str, ContractValidator] = {
            "openapi": OpenAPIValidator(),
            "graphql": GraphQLValidator(),
        }
    
    async def register(self, contract: ContractCreate) -> RegisterResult:
        """
        注册新契约
        
        Args:
            contract: 契约创建信息
        
        Returns:
            RegisterResult: 注册结果
        """
        # 获取验证器
        validator = self._get_validator(contract.type)
        if not validator:
            return RegisterResult(
                success=False,
                reason=f"Unknown contract type: {contract.type}"
            )
        
        # 验证契约格式
        validation = await validator.validate(contract.spec)
        if not validation.valid:
            return RegisterResult(
                success=False,
                reason=f"Invalid contract: {'; '.join(validation.errors)}"
            )
        
        # 检查版本是否已存在
        existing = await self._get_contract(contract.name, contract.version)
        if existing:
            return RegisterResult(
                success=False,
                reason="Contract version already exists"
            )
        
        # 创建契约记录
        db_contract = APIContract(
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
        
        # 存储契约文件 (如果有存储服务)
        if self.storage:
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
            warnings=validation.warnings + compatibility.warnings,
            breaking_changes=compatibility.breaking_changes
        )
    
    async def check_compatibility(self, name: str, old_version: str, 
                                 new_version: str) -> CompatibilityResult:
        """
        检查版本兼容性
        
        Args:
            name: 契约名称
            old_version: 旧版本号
            new_version: 新版本号
        
        Returns:
            CompatibilityResult: 兼容性结果
        """
        # 获取两个版本的契约
        old_contract = await self._get_contract(f"{name}:{old_version}")
        new_contract = await self._get_contract(f"{name}:{new_version}")
        
        if not old_contract:
            return CompatibilityResult(
                compatible=False,
                errors=[f"Contract version not found: {name}:{old_version}"]
            )
        
        if not new_contract:
            return CompatibilityResult(
                compatible=False,
                errors=[f"Contract version not found: {name}:{new_version}"]
            )
        
        # 检查类型是否一致
        if old_contract.type != new_contract.type:
            return CompatibilityResult(
                compatible=False,
                errors=["Contract type mismatch"]
            )
        
        # 检测 Breaking Changes
        validator = self._get_validator(old_contract.type)
        breaking_changes = await validator.detect_breaking_changes(
            old_contract.spec,
            new_contract.spec
        )
        
        return CompatibilityResult(
            compatible=len(breaking_changes) == 0,
            errors=[],
            warnings=[],
            breaking_changes=[bc.description for bc in breaking_changes]
        )
    
    async def activate(self, contract_id: int) -> ActivateResult:
        """激活契约"""
        contract = await self._get_contract_by_id(contract_id)
        if not contract:
            return ActivateResult(success=False, reason="Contract not found")
        
        contract.status = "active"
        contract.updated_at = datetime.utcnow()
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
        contract.updated_at = datetime.utcnow()
        self.db.commit()
        
        return DeprecateResult(success=True)
    
    async def get_active_contracts(self) -> List[APIContract]:
        """获取活跃契约列表"""
        return self.db.query(APIContract).filter(
            APIContract.status == "active"
        ).all()
    
    async def get_contract_versions(self, name: str) -> List[APIContract]:
        """获取契约的所有版本"""
        return self.db.query(APIContract).filter(
            APIContract.name == name
        ).order_by(APIContract.created_at.desc()).all()
    
    def _get_validator(self, contract_type: str) -> Optional[ContractValidator]:
        """获取验证器"""
        return self.validators.get(contract_type)
    
    async def _get_contract(self, name_version: str) -> Optional[APIContract]:
        """获取契约"""
        if ":" in name_version:
            name, version = name_version.split(":", 1)
            return self.db.query(APIContract).filter(
                APIContract.name == name,
                APIContract.version == version
            ).first()
        return None
    
    async def _get_contract_by_id(self, contract_id: int) -> Optional[APIContract]:
        """通过 ID 获取契约"""
        return self.db.query(APIContract).filter(
            APIContract.id == contract_id
        ).first()
    
    def _apply_changes(self, spec: Dict[str, Any], 
                      changes: List[Change]) -> Dict[str, Any]:
        """应用变更到契约"""
        import copy
        new_spec = copy.deepcopy(spec)
        
        for change in changes:
            path_parts = change.path.split(".")
            
            if change.type == "add":
                self._set_nested_value(new_spec, path_parts, change.new_value)
            elif change.type == "remove":
                self._delete_nested_value(new_spec, path_parts)
            elif change.type == "modify":
                self._set_nested_value(new_spec, path_parts, change.new_value)
        
        return new_spec
    
    def _set_nested_value(self, obj: Dict, path: List[str], value: Any):
        """设置嵌套值"""
        for key in path[:-1]:
            if key not in obj:
                obj[key] = {}
            obj = obj[key]
        obj[path[-1]] = value
    
    def _delete_nested_value(self, obj: Dict, path: List[str]):
        """删除嵌套值"""
        for key in path[:-1]:
            if key not in obj:
                return
            obj = obj[key]
        if path[-1] in obj:
            del obj[path[-1]]
    
    async def _check_compatibility(self, old_spec: Dict[str, Any], 
                                  new_spec: Dict[str, Any],
                                  contract_type: str) -> CompatibilityResult:
        """检查兼容性"""
        validator = self._get_validator(contract_type)
        if not validator:
            return CompatibilityResult(
                compatible=True,
                errors=[],
                warnings=[],
                breaking_changes=[]
            )
        
        breaking_changes = await validator.detect_breaking_changes(old_spec, new_spec)
        
        return CompatibilityResult(
            compatible=len(breaking_changes) == 0,
            errors=[],
            warnings=[],
            breaking_changes=[bc.description for bc in breaking_changes]
        )


# ==================== 工具函数 ====================

def create_contract_pack(db_session: Session, storage=None) -> ContractPack:
    """
    创建 Contract Pack 实例
    
    Args:
        db_session: 数据库会话
        storage: 存储服务
    
    Returns:
        ContractPack: 实例
    """
    return ContractPack(db_session, storage)
