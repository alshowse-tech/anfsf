# 捷阅证券信息系统 - ANFSF V1.5.0 架构设计文档

**日期**: 2026-04-02  
**版本**: 1.5.0  
**状态**: 设计中

---

## 📋 执行摘要

本文档描述捷阅证券信息系统基于 ANFSF V1.5.0 的完整架构设计，包括 17 层架构映射、Layer 8.5 治理控制面、MCP 消息协议和 Ownership Lattice 权限模型。

---

## 🏗️ 一、ANFSF 17 层架构映射

### 1.1 完整架构图

```
┌─────────────────────────────────────────────────────────────────┐
│ L17: Performance Guard        - 性能防护层 (API 限流/缓存)        │
├─────────────────────────────────────────────────────────────────┤
│ L16: Security Guard           - 安全防护层 (认证/授权/审计)       │
├─────────────────────────────────────────────────────────────────┤
│ L15: Regression Guard         - 回归防护层 (测试门禁)             │
├─────────────────────────────────────────────────────────────────┤
│ L14: Monitoring & Alerting    - 监控告警层 (日志/指标/告警)       │
├─────────────────────────────────────────────────────────────────┤
│ L13: Collective Intelligence  - 集体智能层 (多 Agent 协作)        │
├─────────────────────────────────────────────────────────────────┤
│ L12: Experience Distiller     - 经验提炼层 (历史数据分析)         │
├─────────────────────────────────────────────────────────────────┤
│ L11: Testing & QA             - 测试质量层 (单元/集成/E2E)        │
├─────────────────────────────────────────────────────────────────┤
│ L10: Frontend Framework       - 前端框架层 (Next.js 14)           │
├─────────────────────────────────────────────────────────────────┤
│ L9: Stability Layer           - 稳定性层 (自愈/熔断/降级)         │
├─────────────────────────────────────────────────────────────────┤
│ L8: Bidirectional Sync        - 双向同步层 (Code↔Graph)           │
├─────────────────────────────────────────────────────────────────┤
│ L7: Efficiency Layer          - 效率层 (任务调度/优化)            │
├─────────────────────────────────────────────────────────────────┤
│ L6: Code Generation           - 代码生成层 (动态服务生成)         │
├─────────────────────────────────────────────────────────────────┤
│ L5: IR Generation             - 中间代码层 (API 契约转换)         │
├─────────────────────────────────────────────────────────────────┤
│ L4: Knowledge Graph           - 知识图谱层 (业务实体关系)         │
├─────────────────────────────────────────────────────────────────┤
│ L3: Governance Policy         - 治理策略层 (规则/策略/门禁)       │
├─────────────────────────────────────────────────────────────────┤
│ L2: Requirement Validator     - 需求验证层 (输入校验)             │
├─────────────────────────────────────────────────────────────────┤
│ L1: PRD                       - 产品需求层 (业务需求)             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 层级职责映射

| 层 | 捷阅证券实现 | 关键组件 |
|----|-------------|----------|
| L17 | API 限流中间件 | `middleware/rate_limiter.py` |
| L16 | 认证授权中间件 | `auth/jwt_handler.py` |
| L15 | 测试门禁 | `__tests__/gate_test.py` |
| L14 | 监控告警 | `monitoring/logger.py` |
| L13 | 多 Agent 协作 | `roles/*.py` |
| L12 | 经验提炼 | `services/analytics.py` |
| L11 | 测试体系 | `__tests__/*` |
| L10 | Next.js 14 + Tailwind CSS v4 | `frontend/src/app/`, `frontend/src/components/` |
| L9 | 自愈机制 | `governance/readiness_gate.py` |
| L8 | 双向同步 | `governance/mcp_bus.py` |
| L7 | 任务调度 | `queues/task_queue.py` |
| L6 | 服务生成 | `services/factory.py` |
| L5 | 契约转换 | `governance/contract_pack.py` |
| L4 | 知识图谱 | `db/models.py` |
| L3 | 治理策略 | `governance/ownership_lattice.py` |
| L2 | 输入校验 | `api/validators.py` |
| L1 | 业务需求 | `docs/PRD.md` |

---

## 🛡️ 二、Layer 8.5 Governance Control Plane 设计

### 2.1 架构概述

Layer 8.5 是 ANFSF V1.5.0 的核心治理层，位于 L8 (双向同步) 和 L9 (稳定性) 之间，提供：

- **所有权仲裁**: 资源访问权限控制
- **契约管理**: API 版本和兼容性
- **消息总线**: Agent 间通信
- **就绪门禁**: 服务健康检查
- **预览控制**: 变更预览和验证

### 2.2 组件图

```
┌─────────────────────────────────────────────────────────────┐
│              Layer 8.5 Governance Control Plane             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Ownership Lattice│  │   Contract Pack  │                │
│  │                  │  │                  │                │
│  │ - 资源所有权     │  │ - 契约版本       │                │
│  │ - 权限仲裁       │  │ - 兼容性检查     │                │
│  │ - 访问控制       │  │ - 变更追踪       │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                           │
│           └──────────┬──────────┘                           │
│                      │                                      │
│           ┌──────────▼──────────┐                           │
│           │     MCP Bus         │                           │
│           │                     │                           │
│           │ - 消息路由          │                           │
│           │ - 协议转换          │                           │
│           │ - 追踪上下文        │                           │
│           └──────────┬──────────┘                           │
│                      │                                      │
│    ┌─────────────────┼─────────────────┐                    │
│    │                 │                 │                    │
│ ┌──▼──────┐    ┌─────▼─────┐    ┌─────▼──────┐             │
│ │ Preview │    │ Readiness │    │   Audit   │             │
│ │Controller│   │   Gate    │    │   Logger  │             │
│ └─────────┘    └───────────┘    └────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 核心模块设计

#### 2.3.1 Ownership Lattice (所有权晶格)

```python
class OwnershipLattice:
    """
    所有权晶格权限控制系统
    
    基于晶格理论实现细粒度资源所有权管理
    """
    
    def check(self, agent_id: str, resource: str, action: str) -> CheckResult:
        """检查 Agent 是否有权限执行操作"""
        pass
    
    def grant(self, owner: str, agent: str, resource: str, 
              permissions: List[str]) -> GrantResult:
        """授予权限"""
        pass
    
    def revoke(self, owner: str, agent: str, resource: str) -> RevokeResult:
        """撤销权限"""
        pass
    
    def prove(self, agent_id: str, resource: str) -> OwnershipProof:
        """生成所有权证明"""
        pass
```

**数据模型**:
```python
class OwnershipRecord(Base):
    __tablename__ = "ownership_records"
    
    id = Column(BigInteger, primary_key=True)
    resource_type = Column(String(50))  # task, contract, model
    resource_id = Column(String(256))
    owner_id = Column(String(256))
    agent_id = Column(String(256))
    permissions = Column(JSON)  # ["read", "write", "execute"]
    created_at = Column(DateTime)
    expires_at = Column(DateTime, nullable=True)
```

#### 2.3.2 Contract Pack (契约包)

```python
class ContractPack:
    """
    契约包管理系统
    
    管理 API 契约版本和兼容性
    """
    
    def register(self, contract: Contract) -> RegisterResult:
        """注册新契约"""
        pass
    
    def validate(self, contract_id: str, changes: List[Change]) -> ValidationResult:
        """验证契约变更"""
        pass
    
    def check_compatibility(self, old_version: str, 
                           new_version: str) -> CompatibilityResult:
        """检查版本兼容性"""
        pass
    
    def get_active_contracts(self) -> List[Contract]:
        """获取活跃契约列表"""
        pass
```

**数据模型**:
```python
class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(BigInteger, primary_key=True)
    name = Column(String(256))
    version = Column(String(50))
    type = Column(String(50))  # openapi, graphql, grpc
    spec = Column(JSON)
    status = Column(String(20))  # draft, active, deprecated
    owner_id = Column(String(256))
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
```

#### 2.3.3 MCP Bus (消息总线)

```python
class MCPBus:
    """
    MCP 消息总线
    
    实现 Agent 间的异步消息传递
    """
    
    async def publish(self, message: MCPMessage) -> PublishResult:
        """发布消息"""
        pass
    
    async def subscribe(self, agent_id: str, 
                       topics: List[str]) -> Subscription:
        """订阅主题"""
        pass
    
    async def request_response(self, message: MCPMessage, 
                               timeout: int) -> MCPMessage:
        """请求 - 响应模式"""
        pass
    
    async def broadcast(self, message: MCPMessage, 
                       exclude: List[str] = None) -> BroadcastResult:
        """广播消息"""
        pass
```

**消息格式**:
```python
class MCPMessage(BaseModel):
    protocol: str = "mcp/1.0"
    id: str
    from_agent: str
    to_agent: Union[str, List[str]]  # "*" for broadcast
    type: str  # proposal, query, command, feedback, approval, telemetry
    payload: Dict[str, Any]
    ttl: int = 300  # seconds
    correlation_id: Optional[str] = None
    schema_version: str = "2026-03"
    requires_ack: bool = True
    idempotent_key: Optional[str] = None
    trace_id: Optional[str] = None
```

#### 2.3.4 Preview Controller (预览控制器)

```python
class PreviewController:
    """
    预览可用性控制器
    
    管理变更预览和验证
    """
    
    async def create_preview(self, changes: List[Change], 
                            context: PreviewContext) -> Preview:
        """创建预览"""
        pass
    
    async def validate_preview(self, preview_id: str) -> ValidationResult:
        """验证预览"""
        pass
    
    async def apply_preview(self, preview_id: str) -> ApplyResult:
        """应用预览"""
        pass
    
    async def discard_preview(self, preview_id: str) -> DiscardResult:
        """丢弃预览"""
        pass
```

#### 2.3.5 Readiness Gate (就绪门禁)

```python
class ReadinessGate:
    """
    就绪门禁系统
    
    检查服务是否准备好接收流量
    """
    
    def check(self, service_id: str) -> ReadinessResult:
        """检查服务就绪状态"""
        pass
    
    def probe(self, service_id: str, probe_type: str) -> ProbeResult:
        """执行探针检查"""
        pass
    
    def register(self, service: Service) -> RegisterResult:
        """注册服务"""
        pass
    
    def deregister(self, service_id: str) -> DeregisterResult:
        """注销服务"""
        pass
```

**探针类型**:
- `http`: HTTP 端点检查
- `tcp`: TCP 连接检查
- `grpc`: gRPC 健康检查
- `custom`: 自定义检查

---

## 🔐 三、Ownership Lattice 权限模型

### 3.1 权限模型概述

Ownership Lattice 基于晶格理论实现，提供：

- **细粒度权限**: 资源级别的权限控制
- **可传递性**: 权限可以委托和继承
- **可证明性**: 所有权限操作可追溯和证明
- **动态性**: 权限可以动态授予和撤销

### 3.2 权限类型

| 权限 | 描述 | 适用资源 |
|------|------|----------|
| `read` | 读取资源 | 所有资源 |
| `write` | 修改资源 | 任务、契约、配置 |
| `execute` | 执行操作 | 服务、任务 |
| `delegate` | 委托权限 | 所有资源 |
| `admin` | 管理权限 | 所有资源 |

### 3.3 权限决策流程

```
┌─────────────┐
│ 请求到达    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 身份验证    │───失败───▶ 拒绝
└──────┬──────┘
       │ 成功
       ▼
┌─────────────┐
│ 资源查找    │───不存在───▶ 拒绝
└──────┬──────┘
       │ 存在
       ▼
┌─────────────┐
│ 所有权检查  │───是所有者───▶ 允许
└──────┬──────┘
       │ 非所有者
       ▼
┌─────────────┐
│ 权限检查    │───有权限───▶ 允许
└──────┬──────┘
       │ 无权限
       ▼
┌─────────────┐
│ 委托检查    │───有委托───▶ 允许
└──────┬──────┘
       │ 无委托
       ▼
┌─────────────┐
│ 拒绝访问    │
└─────────────┘
```

### 3.4 权限证明

```python
class OwnershipProof(BaseModel):
    """所有权证明"""
    
    proof_id: str
    resource_type: str
    resource_id: str
    owner_id: str
    agent_id: str
    permissions: List[str]
    signature: str  # 数字签名
    timestamp: datetime
    expires_at: Optional[datetime]
    verification_url: str
```

---

## 📨 四、MCP 消息协议

### 4.1 协议概述

MCP (Multi-Agent Collaboration Protocol) 是 ANFSF V1.5.0 的多 Agent 协作协议，提供：

- **异步通信**: 非阻塞消息传递
- **可靠投递**: 消息确认和重试
- **全链路追踪**: 分布式追踪支持
- **幂等性**: 防止重复执行

### 4.2 消息类型

| 类型 | 描述 | 使用场景 |
|------|------|----------|
| `proposal` | 提案消息 | 发起新任务或变更 |
| `query` | 查询消息 | 请求信息 |
| `command` | 命令消息 | 执行操作 |
| `feedback` | 反馈消息 | 返回结果 |
| `approval` | 审批消息 | 权限审批 |
| `telemetry` | 遥测消息 | 监控指标 |

### 4.3 消息流转

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Agent A │────▶│  MCP Bus │────▶│  Agent B │
└──────────┘     └──────────┘     └──────────┘
     │                  │                  │
     │   1. publish     │                  │
     │─────────────────▶│                  │
     │                  │   2. route       │
     │                  │─────────────────▶│
     │                  │                  │
     │                  │   3. ack         │
     │                  │◀─────────────────│
     │   4. delivery    │                  │
     │◀─────────────────│                  │
     │     confirm      │                  │
```

### 4.4 消息头字段

```python
message_headers = {
    "x-mcp-protocol": "mcp/1.0",
    "x-mcp-message-id": "msg_123456",
    "x-mcp-from": "url-parser-agent",
    "x-mcp-to": "media-processor-agent",
    "x-mcp-type": "command",
    "x-mcp-correlation-id": "corr_789",
    "x-mcp-trace-id": "trace_abc",
    "x-mcp-ttl": "300",
    "x-mcp-requires-ack": "true",
    "x-mcp-idempotent-key": "idem_xyz",
    "x-mcp-schema-version": "2026-03",
    "x-mcp-timestamp": "2026-04-02T00:00:00Z"
}
```

---

## 📊 五、数据模型设计

### 5.1 核心实体关系图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │     │    Task     │     │  Contract   │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id          │     │ id          │     │ id          │
│ phone       │     │ user_id ───┼────▶│ contract_id │
│ wx_openid   │     │ url         │     │ version     │
│ status      │     │ status      │     │ spec        │
└─────────────┘     │ content_type│     │ status      │
                    │ owner_id    │     └─────────────┘
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │Transcription│
                    ├─────────────┤
                    │ id          │
                    │ task_id     │
                    │ transcript  │
                    │ status      │
                    └─────────────┘
```

### 5.2 新增数据模型

#### 5.2.1 Contract 模型

```python
class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(256), nullable=False)
    version = Column(String(50), nullable=False)
    type = Column(String(50), nullable=False)  # openapi, graphql, grpc
    spec = Column(JSON, nullable=False)
    status = Column(String(20), default="draft")
    owner_id = Column(String(256), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('name', 'version', name='uniq_contract_version'),
    )
```

#### 5.2.2 OwnershipRecord 模型

```python
class OwnershipRecord(Base):
    __tablename__ = "ownership_records"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(256), nullable=False)
    owner_id = Column(String(256), nullable=False)
    agent_id = Column(String(256), nullable=False)
    permissions = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        UniqueConstraint('resource_type', 'resource_id', 'agent_id', 
                        name='uniq_resource_agent'),
    )
```

#### 5.2.3 MCPMessageLog 模型

```python
class MCPMessageLog(Base):
    __tablename__ = "mcp_message_logs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    message_id = Column(String(256), unique=True, nullable=False)
    from_agent = Column(String(256), nullable=False)
    to_agent = Column(String(256), nullable=False)
    message_type = Column(String(50), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, server_default=func.now())
    delivered_at = Column(DateTime, nullable=True)
    ack_at = Column(DateTime, nullable=True)
    trace_id = Column(String(256), nullable=True)
    correlation_id = Column(String(256), nullable=True)
```

---

## 🔄 六、Agent 角色设计

### 6.1 角色清单

| 角色 | 职责 | 输入 | 输出 |
|------|------|------|------|
| `url-parser-agent` | URL 解析 | URL 字符串 | 解析结果 |
| `media-processor-agent` | 媒体处理 | 媒体文件 | 处理后的文件 |
| `transcription-agent` | 语音转写 | 音频文件 | 转写文本 |
| `gen-ui-agent` | UI 生成 | 需求描述 | UI 代码 |
| `quality-checker-agent` | 质量检查 | 代码/内容 | 质量报告 |

### 6.2 角色通信协议

```python
# URL 解析 Agent → 媒体处理 Agent
class URLParseResult(MCPMessage):
    url: str
    platform: str
    media_url: str
    content_type: str
    duration: Optional[int]
    metadata: Dict[str, Any]

# 媒体处理 Agent → 转写 Agent
class MediaProcessResult(MCPMessage):
    task_id: str
    local_path: str
    format: str
    duration: int
    size: int

# 转写 Agent → 质量检查 Agent
class TranscriptionResult(MCPMessage):
    task_id: str
    transcript: str
    confidence: float
    language: str
    segments: List[Segment]
```

### 6.3 角色 KPI 定义

| 角色 | KPI | 目标值 |
|------|-----|--------|
| `url-parser-agent` | 解析成功率 | >99% |
| `url-parser-agent` | 平均响应时间 | <500ms |
| `media-processor-agent` | 处理成功率 | >98% |
| `media-processor-agent` | 平均处理时间 | <30s |
| `transcription-agent` | 转写准确率 | >95% |
| `transcription-agent` | 平均转写时间 | <60s |
| `quality-checker-agent` | 问题检出率 | >90% |
| `quality-checker-agent` | 误报率 | <5% |

---

## 🎨 六、Layer 10 Frontend Framework 规范

### 6.1 架构概述

Layer 10 前端框架层负责用户界面渲染和交互，基于 Next.js 14 和 Tailwind CSS v4 构建。

**核心职责**:
- SSR/SSG 页面渲染
- 客户端交互处理
- 样式系统管理
- 构建产物生成

### 6.2 技术栈

| 组件 | 版本 | 用途 | 配置要求 |
|------|------|------|----------|
| Next.js | 14.1.0 | 应用框架 | `output: 'standalone'` |
| React | 18.2.0 | UI 库 | `reactStrictMode: true` |
| Tailwind CSS | 4.x | 样式框架 | `@import "tailwindcss"` |
| TypeScript | 5.x | 类型系统 | `jsx: 'preserve'` |
| PostCSS | 8.x | CSS 处理 | `@tailwindcss/postcss` |

### 6.3 构建门禁 (ANFSF V1.5.0 Layer 3)

**构建流程**:
```bash
# 1. 类型检查
npm run typecheck

# 2. 代码 lint
npm run lint

# 3. 构建
npm run build

# 4. 产物验证
test -d .next/standalone || exit 1
test -f .next/standalone/server.js || exit 1
```

**CSS 大小验证**:
```bash
# CSS 文件应 > 10KB（过小说明构建不完整）
CSS_SIZE=$(wc -c < .next/static/css/*.css)
if [ $CSS_SIZE -lt 10000 ]; then
  echo "❌ CSS 文件过小，可能构建不完整"
  exit 1
fi
```

### 6.4 兼容性规范

**Tailwind CSS v4 语法**:
```css
/* ✅ 正确 */
@import "tailwindcss";
```

```css
/* ❌ 错误 - v3 语法 */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**PostCSS 配置**:
```javascript
// ✅ v4 配置
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

### 6.5 监控指标 (ANFSF V1.5.0 Layer 14)

| 指标 | 正常值 | 告警值 | 检查方式 |
|------|--------|--------|----------|
| 构建时间 | < 2min | > 5min | CI/CD |
| CSS 大小 | > 30KB | < 10KB | 构建后检查 |
| JS Chunk | < 20 | > 50 | Bundle Analyzer |
| TS 错误 | 0 | > 0 | `npm run typecheck` |

### 6.6 代码清理规范

**未使用组件识别**:
```bash
grep -r "ComponentName" src/app/ --include="*.tsx"
# 返回空表示未使用，应删除
```

**定期清理**:
- 每周：检查未使用组件
- 每月：清理废弃文件
- 每版本：依赖版本审查

---

## 📝 七、部署架构

### 7.1 容器化部署

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=mysql://user:pass@db:3306/jieyue
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
  
  db:
    image: mysql:8.0
    volumes:
      - mysql_data:/var/lib/mysql
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

### 7.2 服务依赖图

```
                    ┌─────────────┐
                    │   Nginx     │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │ Frontend │   │ Backend  │   │  Admin   │
     │  :3000   │   │  :8000   │   │  :8001   │
     └────┬─────┘   └────┬─────┘   └────┬─────┘
          │              │              │
          └──────────────┼──────────────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐
     │   MySQL  │ │  Redis   │ │   OSS    │
     │  :3306   │ │  :6379   │ │  (外部)  │
     └──────────┘ └──────────┘ └──────────┘
```

---

## ✅ 八、验收标准

### 8.1 架构验收

- [ ] 17 层架构完整实现
- [ ] Layer 8.5 所有模块正常工作
- [ ] MCP 消息总线测试通过
- [ ] Ownership Lattice 权限检查通过
- [ ] Contract Pack 版本管理正常

### 8.2 性能验收

- [ ] API P95 响应时间 <500ms
- [ ] 系统吞吐量 >1000 req/s
- [ ] 内存使用 <2GB
- [ ] CPU 使用 <80%

### 8.3 安全验收

- [ ] 所有 API 需要认证
- [ ] 敏感数据加密存储
- [ ] 权限检查覆盖所有资源
- [ ] 审计日志完整

---

## 📎 附录

### A. 术语表

| 术语 | 定义 |
|------|------|
| ANFSF | AI Native Full-Stack Software Factory |
| MCP | Multi-Agent Collaboration Protocol |
| Ownership Lattice | 基于晶格理论的所有权权限系统 |
| Contract Pack | API 契约包管理系统 |
| Readiness Gate | 服务就绪检查门禁 |

### B. 参考文档

- [ANFSF V1.5.0 规范](../../docs/ASF-V4.0-ARCHITECTURE-AND-USAGE.md)
- [Layer 8.5 实现报告](../../docs/LAYER8.5-IMPLEMENTATION-REPORT.md)
- [MCP 协议规范](../../src/mcp/README.md)

---

**文档状态**: 草稿  
**最后更新**: 2026-04-02  
**负责人**: ANFSF 重构团队
