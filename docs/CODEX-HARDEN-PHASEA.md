# ANFSF 生产级硬化 — Phase A: 安全加固

> **日期**: 2026-07-02 | **状态**: 📋 待执行
> **执行方**: CODEX
> **前置**: 无
> **预估**: 2 周（子任务: A1=1d, A2=2d, A3=1d, A4=0.5d）

---

## 1. 目标

将 ANFSF 的安全等级从"明文密码/内存会话"提升到生产级。这是三个阶段中最重的 Phase — `auth.ts` 和 `middleware/auth.ts` 需要完全重写，两套独立认证系统合二为一。

### 关键变化

| 当前状态 | 目标状态 |
|---------|---------|
| 明文密码存储 + 默认 `admin/admin` | bcrypt 密文存储 + 首次启动强制设密 |
| 内存 `Map<string, Session>`（重启丢失） | JWT 无状态（签名验证，服务端不存储） |
| middleware 独立、routes 独立 | 统一认证网关（API Token OR JWT） |
| `Math.random()` 生成 ID | `crypto.randomUUID()` |
| SandboxExecutor 代码存在但未接入 | 运行时实例化 |

---

## 2. A1: 密码哈希 + 存量迁移

### 2.1 新增依赖
```bash
npm install bcryptjs
npm install -D @types/bcryptjs  # 如需要
```

### 2.2 auth.ts 改造

**文件**: `src/server/routes/auth.ts`

**改动 1 — 注册端点 (register)**:

```typescript
import bcrypt from 'bcryptjs';

// 在 register 中替换:
// 原: users.push({ username: body.username, password: body.password, role: body.role || 'developer' });
// 改为:
const hashed = bcrypt.hashSync(body.password, 10);
// 用 allowlist 校验 role
const validRoles = ['admin', 'pm', 'frontend', 'backend', 'qa', 'devops', 'viewer'];
const role = validRoles.includes(body.role || '') ? body.role : 'viewer';
users.push({ username: body.username, password: hashed, role });
```

**改动 2 — 登录端点 (login) → 改为签发 JWT (详见 A2c)**:

```typescript
// 移除:
// const users = loadUsers();
// const user = users.find(u => u.username === body.username && u.password === body.password);
// const token = generateToken();
// sessions.set(token, {...});
// return { status: 'ok', token, ... };

// 改为 (详见 A2c — JWT 签发):
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

const user = users.find(u => u.username === body.username);
if (!user || !bcrypt.compareSync(body.password, user.password)) {
  return reply.code(401).send({ error: 'Invalid credentials' });
}
const token = jwt.sign(
  { sub: user.username, role: user.role },
  JWT_SECRET,
  { expiresIn: '24h' }
);
return { status: 'ok', token, user: { username: user.username, role: user.role } };
```

### 2.3 A1b — 存量用户迁移

```typescript
// 在 server/index.ts 启动时调用（或 auth.ts 模块加载时）:
// 位置: 在 loadUsers() 之后立即执行

function migrateLegacyPasswords(users: UserStore[]): boolean {
  let migrated = false;
  for (const u of users) {
    // bcrypt hash 以 $2a$ / $2b$ / $2y$ 开头 — 明文不匹配
    if (u.password && !u.password.startsWith('$2')) {
      u.password = bcrypt.hashSync(u.password, 10);
      migrated = true;
    }
  }
  return migrated;
}

// 调用处（loadUsers 返回后）:
const users = loadUsers();
if (migrateLegacyPasswords(users)) {
  fs.writeFileSync(STORAGE, JSON.stringify(users, null, 2), 'utf-8');
  console.log('[auth] Migrated legacy plaintext passwords to bcrypt');
}
```

### 2.4 移除默认 admin/admin

**删除** loadUsers() 中 catch 块的默认用户创建逻辑:

```typescript
// 原:
function loadUsers(): UserStore[] {
  try { return JSON.parse(fs.readFileSync(STORAGE, 'utf-8')); }
  catch {
    // 删除以下 4 行:
    const defaults = [{ username: 'admin', password: 'admin', role: 'admin' }];
    fs.mkdirSync(path.dirname(STORAGE), { recursive: true });
    fs.writeFileSync(STORAGE, JSON.stringify(defaults, null, 2), 'utf-8');
    return defaults;
  }
}

// 改为: catch 块返回空数组 []
function loadUsers(): UserStore[] {
  try { return JSON.parse(fs.readFileSync(STORAGE, 'utf-8')); }
  catch { return []; }
}
```

### 2.5 验证

```bash
npx tsc --noEmit
npm test
# 手动验证:
# 1. 启动服务 → 注册一个新用户
# 2. cat .anfsf/users.json → 密码字段应为 "$2a$..." (bcrypt hash)
# 3. 用该用户登录 → 返回 JWT
# 4. 停止 → 删除 .anfsf/users.json → 重启 → 确认没有默认 admin/admin
```

---

## 3. A2: JWT + 统一认证网关

### 3.1 新增依赖
```bash
npm install jsonwebtoken
npm install -D @types/jsonwebtoken  # 如需要
```

### 3.2 A2b — 统一认证网关中间件

**文件**: `src/server/middleware/auth.ts` — 完全重写

```typescript
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';

// 免认证路径
const AUTH_EXEMPT_PATHS = ['/api/v1/auth/login', '/api/v1/auth/register'];

function getJwtSecret(): string {
  return process.env.JWT_SECRET || (() => {
    const generated = require('crypto').randomBytes(32).toString('hex');
    console.warn('[auth] JWT_SECRET not set — sessions invalidated on restart');
    return generated;
  })();
}

function secureTokenCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function registerAuthMiddleware(app: FastifyInstance, apiToken: string): void {
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // 免认证路径放行
    if (AUTH_EXEMPT_PATHS.some(p => request.url.startsWith(p))) return;
    // 只保护 /api/v1/* 路由
    if (!request.url.startsWith('/api/v1/')) return;

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: '请提供有效的 Bearer Token' });
    }

    const token = authHeader.slice(7);

    // 策略 1: 静态 API Token (机器对机器)
    if (apiToken && secureTokenCompare(token, apiToken)) {
      (request as any).auth = { type: 'api-token' };
      return;
    }

    // 策略 2: JWT (用户会话)
    try {
      const payload = jwt.verify(token, getJwtSecret()) as { sub: string; role: string };
      (request as any).auth = { type: 'jwt', user: payload.sub, role: payload.role };
      return;
    } catch {
      // JWT 验证失败 → 继续到 401
    }

    return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Token 无效或已过期' });
  });
}
```

### 3.3 A2c — JWT 签发

**文件**: `src/server/routes/auth.ts` — login 端点简化

```typescript
// 删除以下导入和代码:
// import * as crypto from 'crypto';
// const sessions = new Map<string, Session>();
// function generateToken(): string { ... }

// 保留: import * as crypto 仍需要用于 randomBytes (JWT_SECRET 生成)

// login 端点 (完整替换):
app.post('/api/v1/auth/login', async (request, reply) => {
  const body = request.body as { username?: string; password?: string };
  if (!body.username || !body.password)
    return reply.code(400).send({ error: 'Username and password required' });

  const users = loadUsers();
  const user = users.find(u => u.username === body.username);
  if (!user || !bcrypt.compareSync(body.password, user.password)) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
  const token = jwt.sign(
    { sub: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { status: 'ok', token, user: { username: user.username, role: user.role } };
});

// /me 端点 (使用 JWT 验证替代 session 查找):
app.get('/api/v1/auth/me', async (request) => {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return { authenticated: false };

  const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { sub: string; role: string };
    return { authenticated: true, username: payload.sub, role: payload.role };
  } catch {
    return { authenticated: false };
  }
});

// /logout 端点 (JWT 无状态 — 无需服务端操作):
app.post('/api/v1/auth/logout', async (_request) => {
  return { status: 'ok' };
});
```

### 3.4 环境变量

在 `src/server/index.ts` 的环境校验中增加:
```typescript
const jwtSecret = process.env.JWT_SECRET || '';
if (!jwtSecret) {
  warnings.push('JWT_SECRET is empty — JWT tokens invalidated on server restart');
}
```

### 3.5 验证

```bash
npx tsc --noEmit
npm test
# 手动验证:
# 1. curl -X POST localhost:3001/api/v1/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin"}'
# → 应返回 401（默认 admin 已被移除）
# 2. curl -X POST localhost:3001/api/v1/auth/register -H 'Content-Type: application/json' -d '{"username":"test","password":"test123"}'
# → 返回 {"status":"ok"}
# 3. 再次 login → 返回 JWT
# 4. curl localhost:3001/api/v1/auth/me -H 'Authorization: Bearer <JWT>'
# → 返回 user info
# 5. 重启服务 → 再次用同一 JWT 访问 /me → 仍然有效（JWT 是无状态的）
```

---

## 4. A3: SandboxExecutor 接入运行时

### 4.1 ServerConfig 扩展 + index.ts 实例化

**文件**: `src/server/index.ts` — 两处改动

**改动 1 — 扩展 ServerConfig 接口**:

在 `export interface ServerConfig` 中添加 `sandbox` 属性:

```typescript
export interface ServerConfig {
  // ... 现有属性 ...
  skillsRegistry?: SkillsRegistry;
  /** Sandbox executor for process isolation */
  sandbox?: SandboxExecutor;
}
```

**改动 2 — 实例化 SandboxExecutor**:

在 `createServer()` 函数中，找到 LLMClient 初始化附近（约第 243 行）:

```typescript
// 在 const llm = new LLMClient({...}); 后面添加:
import { SandboxExecutor } from '../skills/sandbox-executor';

const sandbox = new SandboxExecutor({
  maxMemoryMB: 512,
  maxExecutionTimeMs: 120_000,
});
resolved.sandbox = sandbox;  // 注入到 config
```

### 4.2 synthesize.ts 使用沙箱

**文件**: `src/server/routes/synthesize.ts`

在构建 `ToolContext` 的地方传入 sandbox:

```typescript
// 现有:
const toolContext = {
  workingDir: outputDir,
  allowedPaths: [outputDir],
  timeoutMs: this.config.llmTimeout,
};

// 改为:
const toolContext = {
  workingDir: outputDir,
  allowedPaths: [outputDir],
  timeoutMs: this.config.llmTimeout,
  sandbox,  // 新增
};
```

### 4.3 确认 bash-tool.ts 沙箱通路

**文件**: `src/tools/bash-tool.ts` — 代码已存在，确认:

```typescript
// 第 111-113 行（已存在）:
if (useSandbox) {
  return this.executeInSandbox(command, timeout, context);
}
// 第 75 行（已存在）:
const useSandbox = this.definition.requiresSandbox && context.sandbox;
```

`requiresSandbox: true` 已在 `BASH_TOOL_DEFINITION` 中定义（第 64 行）。只需确认通路：
- `context.sandbox` 在 A3.2 中传入
- `requiresSandbox` 为 true → `useSandbox` 为 true → 走 `executeInSandbox`

### 4.4 确认 compile-validator.ts 沙箱通路

**文件**: `src/core/quality/compile-validator.ts` — 代码已存在，确认:

```typescript
// 第 57 行（已有）:
if (this.sandbox) {
  return this.runTscInSandbox(safeDir, start);
}
```

path 通过。

### 4.5 验证

```bash
npx tsc --noEmit
npm test
# 手动验证:
# 运行 synthesize → 查看日志，确认 npm install 通过沙箱执行（日志含 sandbox-executor 输出）
```

---

## 5. A4: 安全补充项

### 5.1 Register role allowlist

在 `src/server/routes/auth.ts` 中添加:

```typescript
const VALID_ROLES = ['admin', 'pm', 'frontend', 'backend', 'qa', 'devops', 'viewer'];

// 在 register 端点中:
if (body.role && !VALID_ROLES.includes(body.role)) {
  return reply.code(400).send({ error: 'BAD_REQUEST', message: `Invalid role. Valid: ${VALID_ROLES.join(', ')}` });
}
```

### 5.2 Login rate limit

`src/server/middleware/rate-limit.ts` 中已有路由差异化配置，增加 login 路由:

```typescript
// 在 index.ts 的 rateLimitConfig.routes 中新增:
'/api/v1/auth/*': { qps: 5, burst: 10 },  // 5 req/min burst
```

或直接在 rate-limit 中间件中单独配置 login 路由。

### 5.3 randomUUID 替换 Math.random()

**文件**: `src/pipeline/project.ts`:

```typescript
// 原:
const id = "proj_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now();

// 改为:
import * as crypto from 'crypto';
const id = "proj_" + crypto.randomUUID().slice(0, 8) + "_" + Date.now();
```

**文件**: `src/pipeline/webhook.ts`:

```typescript
// 原:
const id = "wh_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now();

// 改为:
import * as crypto from 'crypto';
const id = "wh_" + crypto.randomUUID().slice(0, 8) + "_" + Date.now();
```

### 5.4 Webhook HTTPS 限制

**文件**: `src/pipeline/webhook.ts`:

```typescript
// 在 registerWebhook 中:
export function registerWebhook(url: string, events: string[]): WebhookRegistration {
  // 新增 URL 验证
  if (!url.startsWith('https://')) {
    throw new Error('Webhook URL must use HTTPS');
  }
  // ...
}
```

### 5.5 验证

```bash
npx tsc --noEmit
npm test
# 手动验证:
# 1. curl -X POST .../register -d '{"role":"superadmin"}' → 400
# 2. 快速连续 login → 5 次后返回 429
# 3. 检查日志确认默认 admin/admin 未创建
```

---

## 6. 验证清单

```bash
# 0. 安装依赖
npm install bcryptjs jsonwebtoken @fastify/swagger @fastify/swagger-ui
npm install -D @types/jsonwebtoken @types/bcryptjs

# 1. 类型检查
npx tsc --noEmit

# 2. 测试
npm test

# 3. 手动集成测试
# 3a. 启动服务
# 3b. 确认无默认 admin/admin 账户
# 3c. 注册 → 登录 → JWT → 访问受保护路由
# 3d. 重启 → JWT 仍然有效
# 3e. 检查 .anfsf/users.json 密码密文

# 4. 沙箱验证
# 触发 synthesize → 观察日志
```

---

## 7. 风险与缓解

| 风险 | 缓解 |
|------|------|
| bcryptjs 与现有代码兼容性 | bcryptjs 是纯 JS，无 native 编译依赖 |
| JWT_SECRET 未配置导致重启失效 | 自动生成 + 启动 log 警告 |
| 认证重构可能导致现有 API Token 用户失效 | middleware 策略链同时支持 API Token + JWT |
| SandboxExecutor 超时影响 pipeline | 默认 120s 超时 + executeDirect fallback |
