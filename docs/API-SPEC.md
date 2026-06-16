# ANFSF API 设计规范

> **版本**: 1.1 | **日期**: 2026-06-16 | **Phase 1 范围** | **Base URL**: `http://localhost:3000`
> ⚠️ **实现状态标注**: 每个端点右侧标注了运行时实现状态。
> ✅ 已实现并接入 | ⚠️ 代码存在但未接入运行时 | ❌ 未实现
> 详细审计见 [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md)

---

## 一、通用约定

### 1.1 请求格式

- Content-Type: `application/json`（JSON 端点）/ `multipart/form-data`（文件上传）
- 字符编码：UTF-8
- 认证：`Authorization: Bearer <token>`（Phase 1 本地开发可跳过）

### 1.2 响应格式

所有成功响应包含：
```json
{
  "status": "ok",
  "data": { ... }
}
```

所有错误响应包含：
```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

### 1.3 HTTP 状态码

| 状态码 | 语义 |
|--------|------|
| 200 | 成功（GET） |
| 201 | 创建成功 |
| 202 | 已接受，异步处理中 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 413 | 请求体过大 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用（如 LLM API 未配置） |

### 1.4 追踪

所有响应包含 `X-Request-ID` 头，用于日志追踪。

---

## 二、核心 API 端点

### 2.1 提交 PRD（JSON） ✅ 已实现

```
POST /api/v1/synthesize
```

**Request**:
```json
{
  "prdText": "string (required, min 10 chars)",
  "projectName": "string (optional, auto-generated if empty)",
  "options": {
    "enableCodeQualityGate": "boolean (default: false)",
    "blockInjections": "boolean (default: true)",
    "deploymentForm": "web | h5 | miniprogram (default: web)"
  }
}
```

**Response** (202):
```json
{
  "status": "ok",
  "data": {
    "jobId": "uuid",
    "status": "queued",
    "createdAt": "ISO8601"
  }
}
```

**Errors**: 400（prdText 为空或过短）、413（超过大小限制）、503（LLM API 未配置）

---

### 2.2 提交 PRD（Multipart，含附件） ✅ 已实现

```
POST /api/v1/synthesize/multipart
```

**Request**: FormData
- `prdText`: string (required)
- `files`: File[] (optional, max 10 files × 5MB each)

**Response**: 同 2.1

---

### 2.3 需求确认 ⚠️ 路由存在但未接入 Agent Loop

```
PUT /api/v1/pipeline/:jobId/requirements/confirm
```

**Request**:
```json
{
  "version": "string (需求规格版本号)",
  "confirmedItems": [
    {
      "itemId": "string",
      "action": "confirmed | modified | rejected",
      "modifiedValue": "string (仅当 action=modified)",
      "note": "string (optional)"
    }
  ]
}
```

**Response** (200):
```json
{
  "status": "ok",
  "data": {
    "version": "v1",
    "lockedAt": "ISO8601",
    "lockedBy": "string"
  }
}
```

---

### 2.4 获取项目状态 ✅ 已实现

```
GET /api/v1/pipeline/:jobId
```

**Response** (200):
```json
{
  "status": "ok",
  "data": {
    "jobId": "uuid",
    "projectState": "stage2_dev",
    "currentStage": 2,
    "stages": [
      { "stage": 0, "state": "completed", "completedAt": "ISO8601" },
      { "stage": 1, "state": "completed", "completedAt": "ISO8601" },
      { "stage": 2, "state": "active", "startedAt": "ISO8601" },
      { "stage": 3, "state": "pending" },
      { "stage": 4, "state": "pending" },
      { "stage": 5, "state": "pending" }
    ],
    "progress": {
      "totalTasks": 12,
      "completedTasks": 4
    },
    "checkpoints": ["ISO8601", "ISO8601"]
  }
}
```

---

### 2.5 获取项目列表 ✅ 已实现

```
GET /api/v1/pipeline?limit=20&offset=0
```

**Response** (200):
```json
{
  "status": "ok",
  "data": {
    "runs": [
      {
        "jobId": "uuid",
        "projectName": "string",
        "projectState": "string",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601"
      }
    ],
    "total": 42
  }
}
```

---

### 2.6 SSE 实时进度流 ✅ 已实现

```
GET /api/v1/pipeline/:jobId/stream
```

**Response**: `text/event-stream`

事件格式：
```
event: stage_change
data: {"stage":2,"state":"active","timestamp":"ISO8601"}

event: step_progress
data: {"step":"skeleton_generation","progress":0.6,"message":"Generating frontend skeleton..."}

event: error
data: {"code":"LLM_TIMEOUT","message":"LLM call timed out after 60s"}

event: complete
data: {"stage":5,"state":"completed"}
```

---

### 2.7 提交测试反馈 ❌ 未实现（FixEngine 存在但未接入此路由）

```
POST /api/v1/pipeline/:jobId/feedback
```

**Request**:
```json
{
  "testCaseId": "string (required)",
  "result": "passed | failed",
  "failureDetails": {
    "category": "missing_feature | behavior_mismatch | style_issue | performance | other",
    "description": "string",
    "screenshot": "base64 (optional)"
  }
}
```

**Response** (200):
```json
{
  "status": "ok",
  "data": {
    "feedbackId": "uuid",
    "fixLevel": "L1 | L2 | L3",
    "fixStatus": "auto_fixed | suggestion_ready | located_only"
  }
}
```

---

### 2.8 提交需求变更 ❌ 未实现

```
POST /api/v1/pipeline/:jobId/changes
```

**Request**:
```json
{
  "type": "new_feature | modify_feature | remove_feature | priority_change | tech_change | other",
  "description": "string (required)",
  "reason": "string (required)",
  "relatedRequirements": ["REQ-001", "REQ-005"]
}
```

**Response** (200):
```json
{
  "status": "ok",
  "data": {
    "changeId": "uuid",
    "impactReport": {
      "affectedFiles": 5,
      "affectedTasks": 3,
      "affectedTestCases": 8,
      "estimatedExtraHours": 4,
      "risks": ["schema migration required"]
    },
    "state": "awaiting_confirmation"
  }
}
```

---

### 2.9 确认/拒绝变更 ❌ 未实现

```
PUT /api/v1/pipeline/:jobId/changes/:changeId
```

**Request**:
```json
{
  "action": "confirm | defer | cancel",
  "note": "string (optional)"
}
```

---

### 2.10 发布确认 ⚠️ ReleaseCheck 模块存在但未接入此路由

```
POST /api/v1/pipeline/:jobId/release
```

**Request**:
```json
{
  "pmConfirmed": true
}
```

**Response** (200):
```json
{
  "status": "ok",
  "data": {
    "releaseId": "uuid",
    "checkResults": {
      "systemCheck": { "passed": true, "details": [...] },
      "pmCheck": { "passed": true },
      "roleCheck": { "frontend": "confirmed", "backend": "pending" }
    },
    "releasable": false,
    "blockers": ["backend role not confirmed"]
  }
}
```

---

### 2.11 获取度量报告 ⚠️ Archiver 模块存在但未接入此路由

```
GET /api/v1/pipeline/:jobId/metrics
```

**Response** (200):
```json
{
  "status": "ok",
  "data": {
    "totalDuration": { "hours": 48, "stages": {...} },
    "reworkCount": 3,
    "componentReuseRate": 0.45,
    "fixLevels": { "L1": 8, "L2": 5, "L3": 2 },
    "tokenUsage": { "total": 3500000, "byStage": {...}, "cost": "estimated ¥XX" }
  }
}
```

---

### 2.12 健康检查 ✅ 已实现

```
GET /health
```

Response (200): `{ "status": "ok", "uptime": 12345 }`

```
GET /ready
```

Response (200): `{ "status": "ready" }`
Response (503): `{ "status": "not_ready", "reasons": ["LLM API key not configured"] }`

```
GET /metrics
```

Response (200): Prometheus 格式指标

---

## 三、Gitea Webhook 端点 ⚠️ 路由存在但未与 Webhook 触发完整对接

```
POST /api/webhook/gitea
```

**Headers**: `X-Gitea-Event: push`

**Request Body**: [Gitea Webhook Payload](https://docs.gitea.com/usage/webhooks)

**Response** (200): `{ "status": "ok" }`

**幂等性**：使用 `X-Gitea-Delivery` 头去重，已处理的 event 直接返回 200。

---

## 四、Token 预算 API ⚠️ TokenBudget 模块存在但未完全暴露为此 API

### 4.1 获取预算状态

```
GET /api/v1/pipeline/:jobId/budget
```

**Response**:
```json
{
  "totalBudget": 5000000,
  "used": 2300000,
  "remaining": 2700000,
  "usageRate": 0.46,
  "warnings": []
}
```

### 4.2 更新预算

```
PUT /api/v1/pipeline/:jobId/budget
```

**Request**:
```json
{
  "totalBudget": 8000000
}
```

---

## 五、错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|----------|------|
| `INVALID_PRD` | 400 | PRD 文本为空或过短 |
| `PRD_TOO_LONG` | 400 | PRD 超过长度限制 |
| `FILE_TOO_LARGE` | 413 | 附件超过 5MB 限制 |
| `TOO_MANY_FILES` | 400 | 附件超过 10 个限制 |
| `INJECTION_DETECTED` | 400 | 检测到注入攻击 |
| `LLM_UNAVAILABLE` | 503 | LLM API 未配置或不可用 |
| `LLM_TIMEOUT` | 500 | LLM 调用超时 |
| `BUDGET_EXCEEDED` | 402 | Token 预算耗尽 |
| `NOT_FOUND` | 404 | 项目不存在 |
| `INVALID_STATE` | 400 | 不允许的状态转换 |
| `UNAUTHORIZED` | 401 | 未提供认证令牌 |
| `RATE_LIMITED` | 429 | 请求频率超限 |

---

> **下一步**: [数据库 Schema 设计](DATABASE-SCHEMA.md)
