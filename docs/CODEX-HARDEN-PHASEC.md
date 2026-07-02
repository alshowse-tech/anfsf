# ANFSF 生产级硬化 — Phase C: 稳定性

> **日期**: 2026-07-02 | **状态**: 📋 待执行
> **执行方**: CODEX
> **前置**: Phase A (JWT 认证), Phase B (优雅关闭 + Swagger)
> **预估**: 1 周（子任务: C1=0.5d, C2=2d, C3=0.5d, C4=0.5d, C5=0d）

---

## 1. 目标

错误处理标准化、测试扩展、文档完善、前端认证集成。

---

## 2. C1: 结构化错误处理

### 目标

当前路由错误返回格式不统一——有的返回 `{ error: string }`，有的返回 `{ status: "error", error: { code, message } }`，有的直接 throw。改为统一格式 + 全局 handler。

### 2.1 AppError 类

**新增文件**: `src/server/errors.ts`

```typescript
/**
 * ANFSF 统一错误类型
 *
 * 所有路由应抛出 AppError，由全局 error handler 统一格式化。
 * 不要再返回字符串或自定义对象。
 */

export class AppError extends Error {
  constructor(
    /** 机器可读的错误码，如 'VALIDATION_ERROR', 'NOT_FOUND' */
    public readonly code: string,
    /** HTTP 状态码 */
    public readonly status: number,
    message: string,
    /** 可选的人类可读详细信息 */
    public readonly details?: string[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

### 2.2 全局 Error Handler

**文件**: `src/server/index.ts`

在 route 注册之后、`return { app, store, llm }` 之前添加:

```typescript
// 注册全局错误处理器
app.setErrorHandler((error, request, reply) => {
  // AppError — 已知的业务错误
  if (error instanceof AppError) {
    return reply.code(error.status).send({
      error: error.code,
      message: error.message,
      details: error.details,
    });
  }

  // Fastify 内置验证错误
  if (error.validation) {
    return reply.code(400).send({
      error: 'VALIDATION_ERROR',
      message: error.message,
      details: error.validation?.map((v: any) => v.message),
    });
  }

  // 未知错误 — 生产环境不暴露堆栈
  app.log?.error?.({ err: error }, 'Unhandled error');
  return reply.code(500).send({
    error: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
});
```

### 2.3 逐步迁移路由

分三个批次迁移，每批完成后 `npm test` 确认通过:

**第一批 — 核心路由** (Phase B schema 已添加的):
| 路由 | 原返回格式 | 改为 |
|------|-----------|------|
| `synthesize` | 已有 `reply.code(400).send({ error, details })` | `throw new AppError('VALIDATION_ERROR', 400, msg, details)` |
| `pipeline` | `reply.code(404).send({ error, id })` | `throw new AppError('NOT_FOUND', 404, "Pipeline run not found")` |
| `orchestrate` | `reply.code(400).send({ error })` | `throw new AppError('BAD_REQUEST', 400, msg)` |

**第二批 — 配置路由**:
| 路由 | 迁移 |
|------|------|
| `config-llm` | 统一 error format |
| `config-pipeline` | 同上 |
| `projects` | 同上 |

**第三批 — 剩余路由**:
| 路由 | 迁移 |
|------|------|
| `confirmation` | 同上 |
| `feedback` | 同上 |
| `knowledge` | 同上 |

**迁移模式示例**:

```typescript
// 改前:
import { AppError } from '../errors';   // <-- 新增导入
// ...
if (!body.prdText) {
  return reply.code(400).send({ error: 'Bad Request', details: ['prdText is required'] });
}

// 改后:
import { AppError } from '../errors';
// ...
if (!body.prdText) {
  throw new AppError('VALIDATION_ERROR', 400, 'prdText is required');
}
```

> ⚠️ 每迁移一个路由文件，必须添加 `import { AppError } from '../errors'`。遗漏将导致编译失败。

### 2.4 验证

```bash
npx tsc --noEmit
npm test
# 手动:
# curl -X POST localhost:3001/api/v1/synthesize -H 'Content-Type: application/json' -d '{}'
# → {"error":"VALIDATION_ERROR","message":"prdText is required"}
# curl nonexistent-route
# → {"error":"INTERNAL_ERROR","message":"Internal server error"}
```

---

## 3. C2: 集成测试扩展

### 3.1 Auth Flow 测试

**新增文件**: `src/server/__tests__/auth-flow.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
// 使用现有的 mock server 模式（参考 llm-client.test.ts）

describe('Auth Flow (JWT)', () => {
  it('should reject login with wrong password', async () => {
    // POST /api/v1/auth/login { username: 'test', password: 'wrong' }
    // expect 401
  });

  it('should register a new user', async () => {
    // POST /api/v1/auth/register { username: 'newuser', password: 'secure123' }
    // expect 200 with { status: 'ok' }
  });

  it('should login and return JWT', async () => {
    // POST /api/v1/auth/login { username: 'newuser', password: 'secure123' }
    // expect 200 with token field
  });

  it('should access protected route with JWT', async () => {
    // login → 获取 JWT → GET /api/v1/pipeline with Authorization
    // expect 200
  });

  it('should reject expired JWT', async () => {
    // 使用过期的 JWT 访问受保护路由
    // expect 401
  });

  it('should reject request without token', async () => {
    // GET /api/v1/pipeline 无 Authorization
    // expect 401
  });
});
```

### 3.2 Graceful Shutdown 测试

**新增文件**: `src/server/__tests__/graceful-shutdown.test.ts`

```typescript
describe('Graceful Shutdown', () => {
  it('should complete in-flight requests before exiting', async () => {
    // 1. 启动服务
    // 2. 发送一个慢请求
    // 3. 发送 SIGTERM
    // 4. 验证慢请求完成 + 服务关闭
  });

  it('should force exit after timeout', async () => {
    // 1. 启动服务
    // 2. 使 stop() 阻塞
    // 3. 发送 SIGTERM
    // 4. 验证 30s 后强制退出
  });
});
```

### 3.3 Agent Lifecycle 测试

**新增文件**: `src/agents/__tests__/agent-lifecycle.test.ts`

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Agent Lifecycle', () => {
  it('should register and deregister an agent');
  it('should transition through valid states');
  it('should delegate a task and receive result');
  it('should report health status');
  it('should reject invalid state transitions');
});
```

### 3.4 Frontend Smoke Tests

利用 Phase 0 已搭建的 Vitest 框架，为关键组件添加 smoke tests。

```bash
# 在 web/src/components/__tests__/ 目录中添加:
# - LoginPage.test.tsx — 渲染确认
# - PipelineProgress.test.tsx — 组件能挂载
# - VerifyPanel.test.tsx — 组件能挂载
```

### 3.5 验证

```bash
npm test
# 新增测试全部通过
```

---

## 4. C3: 文档完善

### 4.1 PRODUCTION-CHECKLIST.md

**新增文件**: `docs/PRODUCTION-CHECKLIST.md`

```markdown
# ANFSF 生产部署检查清单

## 环境变量
- [ ] `JWT_SECRET` 已设置为 32 字符随机字符串
- [ ] `ANFSF_API_TOKEN` 已设置为 API Token
- [ ] `LLM_API_KEY` / `LLM_BASE_URL` 已配置
- [ ] `ANFSF_ALLOWED_ORIGINS` 已设置为允许的前端域名
- [ ] `ANFSF_DATA_RETENTION_DAYS` 已设置
- [ ] `LOG_FILE` / `LOG_LEVEL` 已配置

## 数据库
- [ ] PostgreSQL（生产）: `DATABASE_URL` 已设置
- [ ] 迁移已运行
- [ ] 定期备份已配置 (pg_dump)

## 安全
- [ ] 默认 admin 账户已移除
- [ ] HTTPS 已配置（反向代理）
- [ ] Rate limiting 已启用
- [ ] CSP headers 已审查

## 监控
- [ ] Prometheus 已部署并配置 scrape target
- [ ] Grafana 仪表盘已导入
- [ ] 关键告警已配置 (pipeline 失败率, token 预算)

## 运维
- [ ] Docker 镜像已构建并推送到 registry
- [ ] 数据卷已挂载 (.anfsf, output)
- [ ] 健康检查已配置 (GET /health)
- [ ] 优雅关闭已验证
```

### 4.2 API-REFERENCE.md

`README.md` 中注明:

```markdown
## API 文档

启动服务后访问 `/docs` 查看交互式 Swagger UI。
```

如需离线文档，可运行 `npx fastify-swagger-ui-cli` 导出。

### 4.3 README.md 更新

| 章节 | 更新内容 |
|------|---------|
| 快速开始 | 新增 `JWT_SECRET` 和 `ANFSF_ADMIN_PASSWORD` 环境变量说明 |
| 环境变量表 | 补充 5 个新变量: `JWT_SECRET`, `ANFSF_ADMIN_PASSWORD`, `LOG_FILE` 等 |
| 架构图 | 更新为包含认证网关和沙箱的最新架构 |
| 部署 | 指向 `PRODUCTION-CHECKLIST.md` |
| API | 指向 `/docs` |

### 4.4 C5: 审计日志持久化验证

审计确认 `src/server/routes/audit-log.ts` 第 47 行已有文件持久化:

```typescript
fs.writeFileSync(STORAGE, JSON.stringify(entries.slice(0, 10000), null, 2), 'utf-8'); // keep last 10000
```

无需开发。在 C3 文档中注明:
- 审计日志位置: `.anfsf/audit-log.json`
- 保留上限: 最新 10,000 条
- 配置: 无（始终记录）

### 4.5 验证

```bash
# 确认文档可被首次部署人员完整执行
```

---

## 5. C4: 前端认证集成

### 目标

确认 Phase A 的 JWT 认证与前端已有组件正确对接。

### 5.1 LoginPage 验证

**文件**: `web/src/components/LoginPage.tsx`

确认登录表单调用 `login()` 函数（在 `api/client.ts` 中），该函数已实现:

```typescript
// web/src/api/client.ts 第 275-283 行:
export async function login(username: string, password: string): Promise<{...}> {
  const res = await safeFetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.token) sessionStorage.setItem('anfsf_jwt', data.token);
  return data;
}
```

> 此函数已在 Phase A 开发前由 CODEX 创建。Phase C4 只需确认通路。

### 5.2 ProtectedRoute 验证

**文件**: `web/src/components/ProtectedRoute.tsx`

确认路由守卫逻辑:

```typescript
// 检查: 是否调用 isAuthenticated()? 无 JWT 时重定向 /login?
// isAuthenticated() 在 api/client.ts 中已实现:
export function isAuthenticated(): boolean {
  return !!getApiToken();
}
```

`App.tsx` 中的路由结构应为:

```tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>} />
```

### 5.3 getApiToken 优先使用 JWT

**文件**: `web/src/api/client.ts`

确认 `getApiToken()` 已有 JWT 优先逻辑:

```typescript
export function getApiToken(): string | undefined {
  const jwt = sessionStorage.getItem('anfsf_jwt');
  if (jwt) return jwt;
  return sessionStorage.getItem('anfsf_api_token') || import.meta.env.VITE_ANFSF_API_TOKEN || undefined;
}
```

> 此逻辑已在 Phase 0-9 开发中由 CODEX 实现。Phase C4 只需确认并测试。

### 5.4 验证

```bash
cd web && npm run dev
# 1. 访问 http://localhost:5173/require
# → 应重定向到 /login
# 2. 登录（使用 Phase A 注册的用户）
# → 登录成功 → 跳转回首页
# 3. 关闭 Tab → 重新打开 → 需要重新登录（sessionStorage）
# 4. 确认 "记住我" 选项（可选）使用 localStorage
```

---

## 6. 验证清单

```bash
# 0. 类型检查
npx tsc --noEmit
cd web && npm run build

# 1. 测试
npm test

# 2. 错误格式
# curl .../nonexistent → {"error":"INTERNAL_ERROR",...}
# curl .../synthesize -d '{}' → {"error":"VALIDATION_ERROR",...}

# 3. Auth flow
# 注册 → 登录 → JWT → 访问 /api/v1/pipeline → 200
# 无 JWT → 访问 /api/v1/pipeline → 401

# 4. 文档
# docs/PRODUCTION-CHECKLIST.md 可执行
# README.md 更新

# 5. 前端
# 无登录 → 重定向 /login
# 登录 → 正常访问
```
