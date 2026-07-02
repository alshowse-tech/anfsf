# ANFSF 生产级硬化 — 开发计划

> **基于**: CODEX-HARDEN-PHASEA.md / PHASEB / PHASEC
> **编制日期**: 2026-07-02
> **总预估**: 4 周 (A: 2周 / B: 1周 / C: 1周)

---

## 一、依赖关系

```
Phase A (安全加固)
├── A1: bcrypt + 密码迁移
├── A2: JWT + 统一认证网关 ← 依赖 A1
├── A3: SandboxExecutor 接入运行时 ← 唯一编码注意事项: 先扩 ServerConfig → 再加实例
└── A4: 安全补充项

Phase B (运维能力) ← 依赖 Phase A (auth middleware)
├── B1: 优雅关闭
├── B2: OpenAPI/Swagger
├── B3: Agent 内存持久化
├── B4: EvolutionHarness 特性启用
└── B5: Token 预算持久化接 Store

Phase C (稳定性) ← 依赖 Phase A+B
├── C1: 结构化错误处理 (AppError + 全局 handler)
├── C2: 集成测试扩展 (Auth / Shutdown / Agent / Frontend)
├── C3: 文档完善 (PRODUCTION-CHECKLIST + README)
└── C4: 前端认证集成验证
```

---

## 二、Phase A — 安全加固 (14 天)

### 前置条件
- `npm install bcryptjs jsonwebtoken`
- `npm install -D @types/jsonwebtoken @types/bcryptjs`

### A1: 密码哈希 + 存量迁移 (1 天)

| 文件 | 改动 |
|------|------|
| `src/server/routes/auth.ts` | register 中 bcrypt 加密存储；login 中 bcrypt.compare |
| `src/server/routes/auth.ts` | `loadUsers()` catch 返回空数组 `[]`，删除默认 admin |
| `src/server/routes/auth.ts` | 新增 `migrateLegacyPasswords()` 检测明文→自动 bcrypt |
| `src/server/routes/auth.ts` | 删除 `Math.random()` generateToken + sessions Map |

### A2: JWT + 统一认证网关 (2 天)

**A2a: 中间件** — `src/server/middleware/auth.ts`

| 策略 | 优先级 | 验证方式 |
|------|--------|---------|
| API Token | 高 | `timingSafeEqual(token, apiToken)` — 机器对机器 |
| JWT | 中 | `jwt.verify(token, secret)` — 用户会话 |

豁免路径: `/api/v1/auth/login`, `/api/v1/auth/register`

**A2b: auth.ts 改造**

| 改动点 | 说明 |
|--------|------|
| login 端点 | 验证密码 → 签发 JWT (`expiresIn: '24h'`) |
| /me 端点 | `jwt.verify()` 替代 sessions Map 查找 |
| /logout 端点 | 直接返回 `{ status: 'ok' }` — JWT 无状态 |
| 删除 sessions Map | 整个 `Map<string, Session>` 移除 |
| 环境变量 `JWT_SECRET` | 未设置时 `crypto.randomBytes(32).toString('hex')` + log 警告 |

### A3: SandboxExecutor 接入运行时 (1 天) ⚠️ 编码顺序注意事项

**顺序不可颠倒: 1→2→3→4**

| 步骤 | 文件 | 操作 |
|------|------|------|
| 1 | `src/server/index.ts` | `ServerConfig` 接口新增 `sandbox?: SandboxExecutor` |
| 2 | `src/server/index.ts` | `createServer()` 中 `new SandboxExecutor({maxMemoryMB: 512, maxExecutionTimeMs: 120000})` |
| 3 | `src/server/routes/synthesize.ts` | `ToolContext` 传入 `sandbox` |
| 4 | `src/tools/bash-tool.ts` | 确认 `context.sandbox` 传入 → `requiresSandbox=true` → `executeInSandbox` |

`compile-validator.ts` 已有 sandbox 通路，只需确认。

### A4: 安全补充项 (0.5 天)

| 子项 | 文件 | 改动 |
|------|------|------|
| Role allowlist | `auth.ts` | `VALID_ROLES` 校验，非法 role 返回 400 |
| Login rate limit | `index.ts` + rate-limit | 新增 `/api/v1/auth/*: { qps: 5, burst: 10 }` |
| randomUUID 替换 | `project.ts`, `webhook.ts` | `Math.random()` → `crypto.randomUUID()` |
| Webhook HTTPS 限制 | `webhook.ts` | `registerWebhook()` 新增 `url.startsWith('https://')` 检查 |

### Phase A 验证
```bash
npm install bcryptjs jsonwebtoken
npm install -D @types/jsonwebtoken @types/bcryptjs
npx tsc --noEmit
npm test
# 手动: 注册→登录→JWT→访问受保护路由→重启→JWT仍有效
```

---

## 三、Phase B — 运维能力 (5 天)

### 前置条件
- Phase A 完成 (auth middleware 可用)
- `npm install @fastify/swagger @fastify/swagger-ui`

### B1: 优雅关闭 (0.5 天)

**文件**: `src/server/index.ts`

| 改动 | 说明 |
|------|------|
| 封装 `main()` 函数 | 启动 + 注册 SIGTERM/SIGINT handler |
| `shutdown()` 函数 | 30s 超时保护 → `server.stop()` → `process.exit(0)` |
| 保留 argvPath 检查 | 确保 `node server/index.ts` 启动时执行 main |

### B2: OpenAPI/Swagger (1 天)

**注册位置**: `src/server/index.ts` — cors 之后，health 之前

| 组件 | 配置 |
|------|------|
| `@fastify/swagger` | OpenAPI 3.0, title "ANFSF API", version "1.0.0" |
| `@fastify/swagger-ui` | routePrefix: `/docs` |
| Schema 标签 | synthesize, pipeline, orchestrate 三个核心路由加 schema |

### B3: Agent 内存持久化 (0.1 天)

**文件**: `src/server/index.ts`

```typescript
// 改前:
const agentMemory = new AgentMemoryStore();
// 改后:
const agentMemory = new AgentMemoryStore({ persistencePath: '.anfsf/agent-memory.json' });
```

### B4: EvolutionHarness 特性启用 (0.1 天)

**文件**: `src/server/index.ts` — 3 个 false → true:
- `enableKPIOptimizer: true`
- `enableDataFlywheel: true`
- `enableProgressiveEvolution: true`

### B5: Token 预算持久化接 Store (1 天)

| 步骤 | 文件 | 操作 |
|------|------|------|
| 1 | NEW: `src/pipeline/budget-persistence-store.ts` | `StoreBudgetPersistence` 实现 `BudgetPersistence` 接口 |
| 2 | `src/server/routes/synthesize.ts` | `TokenBudget` 构造时传入 `new StoreBudgetPersistence(store, jobId)` |

### Phase B 验证
```bash
npm install @fastify/swagger @fastify/swagger-ui
npx tsc --noEmit
npm test
# 手动: kill PID → graceful shutdown log
# GET /docs → Swagger UI
# 重启 → agent memory 保留
```

---

## 四、Phase C — 稳定性 (5 天)

### 前置条件
- Phase A + B 完成

### C1: 结构化错误处理 (0.5 天)

| 步骤 | 文件 | 操作 |
|------|------|------|
| 1 | NEW: `src/server/errors.ts` | `AppError` 类 (code + status + message + details) |
| 2 | `src/server/index.ts` | `app.setErrorHandler()` — AppError / Fastify validation / 未知错误 |
| 3 | 分批迁移路由 | 第一批: synthesize, pipeline, orchestrate → 第二批: config-* → 第三批: 剩余 |

### C2: 集成测试扩展 (2 天)

| 测试文件 | 覆盖内容 |
|----------|---------|
| NEW: `src/server/__tests__/auth-flow.test.ts` | 注册→登录→JWT→受保护路由→过期JWT→无token |
| NEW: `src/server/__tests__/graceful-shutdown.test.ts` | 处理中请求完成→超时强制退出 |
| NEW: `src/agents/__tests__/agent-lifecycle.test.ts` | 注册/注销→状态转换→任务委派→健康检查 |
| NEW: `web/src/components/__tests__/LoginPage.test.tsx` | 渲染确认 (Vitest) |

### C3: 文档完善 (0.5 天)

| 文件 | 内容 |
|------|------|
| NEW: `docs/PRODUCTION-CHECKLIST.md` | 环境变量/数据库/安全/监控/运维 checklist |
| `README.md` 更新 | 新增 JWT_SECRET 说明 + 架构图 + `/docs` 指引 |

### C4: 前端认证集成验证 (0.5 天)

无需开发，确认以下通路:
- `LoginPage.tsx` → 调用 `login()` → 存储 JWT 到 sessionStorage
- `ProtectedRoute.tsx` → `isAuthenticated()` → 无 token 重定向 `/login`
- `getApiToken()` → 优先读 `anfsf_jwt` → 回退 `anfsf_api_token`
- `App.tsx` → `/login` 不受保护，其余 `/*` → Layout → ProtectedRoute

### Phase C 验证
```bash
npx tsc --noEmit
npm test
cd web && npm run build
# 手动:
# curl .../nonexistent → {"error":"INTERNAL_ERROR"}
# 注册→登录→JWT→访问受保护路由
# 浏览器无登录→重定向 /login
```

---

## 五、汇总

| Phase | 子任务数 | 新建文件 | 修改文件 | 新依赖 |
|-------|---------|---------|---------|--------|
| A | 4 (A1-A4) | 0 | 7 | bcryptjs, jsonwebtoken |
| B | 5 (B1-B5) | 1 | 4 | @fastify/swagger, @fastify/swagger-ui |
| C | 4 (C1-C4) | 5 | 3 | 无 |
| **总计** | **13** | **6** | **14** | **4 个包** |

### 关键风险

| 风险 | 级别 | 缓解 |
|------|------|------|
| A3 编码顺序（先扩接口再加实例） | 高 | 文档已修复，严格执行 1→2→3→4 |
| JWT_SECRET 未配置导致重启会话失效 | 中 | 自动生成 + 启动 log 警告 |
| bcrypt 兼容性 | 低 | bcryptjs 纯 JS，无 native 依赖 |
| API Token 用户迁移 | 低 | middleware 双策略共存（API Token + JWT） |
| 测试覆盖率 | 低 | Phase C2 补充 auth/shutdown/agent lifecycle 测试 |
