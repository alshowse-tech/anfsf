"""
Governance - Layer 8.5 Governance Control Plane

ANFSF V1.5.0 治理控制面，包含：
- Ownership Lattice: 所有权晶格权限控制
- Contract Pack: 契约包管理
- MCP Bus: MCP 消息总线
- Preview Controller: 预览控制器
- Readiness Gate: 就绪门禁
"""

from governance.ownership_lattice import (
    OwnershipLattice,
    OwnershipRecord,
    CheckResult,
    GrantResult,
    RevokeResult,
    OwnershipProof,
    PermissionType,
    OwnershipRule,
    create_ownership_lattice,
)

from governance.contract_pack import (
    ContractPack,
    APIContract,
    APIContractChange,
    RegisterResult,
    ValidationResult,
    CompatibilityResult,
    ActivateResult,
    DeprecateResult,
    ContractCreate,
    Change,
    BreakingChange,
    OpenAPIValidator,
    GraphQLValidator,
    create_contract_pack,
)

from governance.mcp_bus import (
    MCPBus,
    MCPMessage,
    MCPMessageLog,
    MessageBuilder,
    PublishResult,
    Subscription,
    AckResult,
    DeliveryResult,
    MCPError,
    MCPTimeoutError,
    MCPValidationError,
    validate_message,
    create_mcp_bus,
    create_message,
)

from governance.preview_controller import (
    PreviewController,
    Preview,
    ProbeResult,
    Change,
    PreviewContext,
    PreviewResult,
    ValidationResult,
    ApplyResult,
    DiscardResult,
    Probe,
    HTTPProbe,
    TCPProbe,
    CustomProbe,
    create_preview_controller,
)

from governance.readiness_gate import (
    ReadinessGate,
    Service,
    ProbeCheck,
    ReadinessResult,
    ProbeResult,
    RegisterResult,
    DeregisterResult,
    ProbeConfig,
    ServiceConfig,
    RepairTicket,
    HTTPProbe,
    TCPProbe,
    GRPCProbe,
    CustomProbe,
    create_readiness_gate,
    create_service_config,
)


__all__ = [
    # Ownership Lattice
    "OwnershipLattice",
    "OwnershipRecord",
    "CheckResult",
    "GrantResult",
    "RevokeResult",
    "OwnershipProof",
    "PermissionType",
    "OwnershipRule",
    "create_ownership_lattice",
    
    # Contract Pack
    "ContractPack",
    "Contract",
    "ContractChange",
    "RegisterResult",
    "ValidationResult",
    "CompatibilityResult",
    "ActivateResult",
    "DeprecateResult",
    "ContractCreate",
    "Change",
    "BreakingChange",
    "OpenAPIValidator",
    "GraphQLValidator",
    "create_contract_pack",
    
    # MCP Bus
    "MCPBus",
    "MCPMessage",
    "MCPMessageLog",
    "MessageBuilder",
    "PublishResult",
    "Subscription",
    "AckResult",
    "DeliveryResult",
    "MCPError",
    "MCPTimeoutError",
    "MCPValidationError",
    "validate_message",
    "create_mcp_bus",
    "create_message",
    
    # Preview Controller
    "PreviewController",
    "Preview",
    "ProbeResult",
    "PreviewContext",
    "PreviewResult",
    "ApplyResult",
    "DiscardResult",
    "Probe",
    "HTTPProbe",
    "TCPProbe",
    "CustomProbe",
    "create_preview_controller",
    
    # Readiness Gate
    "ReadinessGate",
    "Service",
    "ProbeCheck",
    "ReadinessResult",
    "RegisterResult",
    "DeregisterResult",
    "ProbeConfig",
    "ServiceConfig",
    "RepairTicket",
    "GRPCProbe",
    "create_readiness_gate",
    "create_service_config",
]

__version__ = "1.5.0"
