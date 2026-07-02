# ANFSF Agent Loop 平台 — 试生产操作手册

> **版本**: 1.0 | **日期**: 2026-07-02
> **系统**: ANFSF (Autonomous Non-Fungible Software Factory)

---

## 第一章: 系统概述

### 1.1 平台简介

ANFSF 是一个**智能软件开发系统**，能够将 PRD（产品需求文档）自动转化为可编译的 TypeScript 项目骨架代码。

**核心能力**:
- 输入 PRD 文本 → 自动生成全栈项目骨架
- 代码质量/幻觉/安全三重验证
- 测试文件自动生成
- 多 Agent 并行生成（大项目自动拆分）
- Gitea 仓库自动推送

### 1.2 系统架构

```
┌──────────────────────────────────────────────────────┐
│                   用户 (浏览器)                        │
└──────────┬──────────────────────────────┬─────────────┘
           │ HTTP (8080)                  │ HTTP (3001)
           ▼                              ▼
┌──────────────────┐          ┌────────────────────┐
│   Frontend       │          │   Grafana           │
│   React SPA      │          │   (监控仪表盘)       │
│   nginx :8080    │          │   :3001             │
└────────┬─────────┘          └────────────────────┘
         │ /api → proxy :3000        ▲
         ▼                            │
┌──────────────────────────────────────────────────┐
│   Backend API (Fastify)  :3000                   │
│   POST /api/v1/synthesize  — 生成代码             │
│   GET  /api/v1/pipeline     — 查询状态            │
│   GET  /docs                — API 文档            │
│   POST /api/v1/auth/login   — 登录               │
└──────────┬───────────────────────────┬───────────┘
           │                           │
           ▼                           ▼
┌──────────────────┐    ┌──────────────────────────┐
│   PostgreSQL     │    │   Prometheus              │
│   (或 SQLite)    │    │   (指标采集)              │
└──────────────────┘    └──────────────────────────┘
```

### 1.3 端口一览

| 服务 | 端口 | 访问地址 |
|------|------|---------|
| 前端界面 (Docker) | 8080 | `http://localhost:8080` |
| 前端界面 (本地开发) | 5173 | `http://localhost:5173` |
| 后端 API | 3000 | `http://localhost:3000` |
| API 文档 (Swagger) | 3000 | `http://localhost:3000/docs` |
| Grafana 监控 | 3001 | `http://localhost:3001` |
| 健康检查 | 3000 | `GET http://localhost:3000/health` |
| Prometheus 指标 | 3000 | `GET http://localhost:3000/metrics` |

---

## 第二章: 环境准备

### 2.1 前置条件

| 依赖 | 版本要求 | 验证命令 |
|------|---------|---------|
| Node.js | >= 18.0.0 | `node -v` |
| npm | >= 10.0 | `npm -v` |
| Docker (可选) | 24+ | `docker -v` |
| Docker Compose (可选) | 2.0+ | `docker compose version` |

### 2.2 环境变量

```bash
# === 必填 ===
export LLM_API_KEY="sk-xxxxxxxxxxxx"       # LLM Provider API Key
export JWT_SECRET="<32字节随机字符串>"       # JWT 签名密钥, 推荐: openssl rand -hex 32

# === 推荐 ===
export ANFSF_API_TOKEN="anfsf-token-xxx"   # API 访问令牌
export ANFSF_MODEL="qwen3.5-plus"          # 默认 LLM 模型
export LLM_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"

# === 可选 ===
export TOKEN_BUDGET="5000000"              # 项目 Token 预算
export ANFSF_PORT="3000"                   # 服务端口
export LOG_LEVEL="info"                    # 日志级别
export LOG_FILE="./logs/anfsf.log"         # 日志文件路径

# === PostgreSQL (可选，默认 SQLite) ===
export DATABASE_URL="postgresql://anfsf:password@localhost:5432/anfsf"
export POSTGRES_PASSWORD="your_password"
```

### 2.3 快速启动验证

```bash
# 验证 LLM 连接
curl $LLM_BASE_URL/chat/completions \
  -H "Authorization: Bearer $LLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3.5-plus","messages":[{"role":"user","content":"hi"}],"max_tokens":5}'

# 应收到 200 响应
```

---

## 第三章: 启动系统

### 3.1 方式一: Docker Compose (推荐)

```bash
# 1. 克隆代码
git clone <repo-url>
cd anfsf

# 2. 配置环境变量
export LLM_API_KEY="sk-xxxxxxxx"
export JWT_SECRET="$(openssl rand -hex 32)"
export ANFSF_API_TOKEN="anfsf-token-prod-001"
export GRAFANA_ADMIN_PASSWORD="grafana-admin-xxx"

# 3. 启动全部服务
docker compose up -d

# 4. 确认启动
docker compose ps
# 应看到全部 5 个服务状态为 healthy 或 running:
#   anfsf-backend    healthy
#   anfsf-frontend   healthy
#   anfsf-postgres   healthy
#   prometheus       running
#   grafana          running

# 5. 验证
curl http://localhost:3000/health
# → {"status":"ok","uptime":...,"version":"1.0.0"}
```

### 3.2 方式二: 本地开发模式

```bash
# 1. 安装依赖
cd anfsf
npm install
cd web && npm install && cd ..

# 2. 配置环境变量
export LLM_API_KEY="sk-xxxxxxxx"
export JWT_SECRET="local-dev-jwt-secret"

# 3. 启动后端 (终端 1)
npm run server

# 4. 启动前端 (终端 2)
cd web && npm run dev

# 5. 访问
# 前端: http://localhost:5173
# API:  http://localhost:3000
# Docs: http://localhost:3000/docs
```

### 3.3 方式三: 生产单机部署

```bash
# 1. 构建
npm run build
cd web && npm run build && cd ..

# 2. 启动
export NODE_ENV=production
npm run start

# 3. 前端单独部署
cd web && npm run preview
```

---

## 第四章: 首次登录

### 4.1 用户注册

系统启动后没有默认账户。首次使用时需要注册：

**方式 A — 通过 API 注册**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "YourStrongPassword123!",
    "role": "admin"
  }'
# → {"status":"ok"}
```

**方式 B — 通过前端注册**:

1. 打开浏览器访问 `http://localhost:8080` (Docker) 或 `http://localhost:5173` (本地开发)
2. 页面自动跳转到登录页 `/login`
3. 点击 **"No account? Register here"** 链接进入注册页 `/register`
4. 填写用户名、密码（至少6位）、确认密码
5. 注册成功后自动登录并跳转首页

### 4.2 登录

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "YourStrongPassword123!"}'
# → {"status":"ok","token":"eyJhbGciOiJIUzI1NiIs...","user":{...}}
```

从响应中获取 JWT token，后续 API 调用需要此 token。

### 4.3 验证登录

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <your-jwt-token>"
# → {"authenticated":true,"username":"admin","role":"admin"}
```

### 4.4 密码管理

- 密码使用 bcrypt 加密存储
- 注册时需满足最小长度 6 位
- 管理员角色可选择: `admin`, `pm`, `frontend`, `backend`, `qa`, `devops`, `viewer`
- 如果遗忘密码，删除 `.anfsf/users.json` 后重启服务即可重新注册

---

## 第五章: 使用系统

### 5.1 首页导航

登录成功后进入首页 (`/`)，页面包含:

```
┌────────────────────────────────────────────────────────┐
│  ANFSF OS                        [⚙ 设置]              │
│  [首页] [需求] [开发] [验证] [测试] [发布] [编排]...    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  项目清单                          [+ 新建项目]         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Todo App  │  │ 电商平台  │  │ 博客系统  │              │
│  │ created   │  │ stage2   │  │ done     │              │
│  │ 2026-06-28│  │ 2026-06-25│  │ 2026-06-20│              │
│  │ [Pipeline]│  │ [Pipeline]│  │ [Pipeline]│              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                        │
│  系统健康                                               │
│  项目: 3   流水线运行: 12   活跃阶段: 4                │
└────────────────────────────────────────────────────────┘
```

**顶部导航栏**:
| Tab | 路径 | 功能 |
|-----|------|------|
| 首页 | `/` | 项目总览 + 系统健康 |
| 需求 | `/require` | 提交 PRD + 查看生成进度 |
| 开发 | `/dev` | 修复记录 + 工单 |
| 验证 | `/verify` | 代码验证结果 |
| 测试 | `/test` | 测试反馈 |
| 发布 | `/release` | 发布门禁检查 |
| 编排 | `/orchestrate` | 多 Agent 状态 |
| 技能 | `/skills` | 技能注册信息 |
| Webhooks | `/webhooks` | 自动修复记录 |
| 项目 | `/projects` | 项目清单 |
| 分析 | `/analysis/global` | 全局分析 |
| 进化 | `/evolve` | 系统指标 |
| 设置 | `/settings` | 系统配置 |

### 5.2 创建项目并生成代码

**步骤 1: 提交 PRD**

1. 点击首页的"+ 新建项目"按钮 → 跳转到 `/require`
2. 在文本框中输入 PRD 内容 — 例如:

```markdown
# Todo 应用

一个简单的任务管理应用，支持:
- 添加任务（标题 + 描述）
- 标记任务为已完成
- 删除任务
- 查看所有任务列表

技术栈:
- 前端: React + TypeScript
- 后端: Node.js + Express
- 数据库: SQLite
```

3. 可选：上传附件（图片、PDF 等）
4. 点击"运行流水线"按钮

**步骤 2: 查看生成进度**

提交后页面自动切换到进度视图，显示:

```
┌─ 实时进度 ─────────────────────────────────────────┐
│  [● 实时] Todo App — 正在生成...                    │
│                                                     │
│  ① 质量检查 ───── ② Agent Loop ● ──── ③ 生成完毕    │
│                                                     │
│  生成轮数: 1/2  文件: 12  Token: 15K  耗时: 4.2s    │
│                                                     │
│  ✓ PRD Quality: 85/100                              │
│  ✓ Generating skeleton...                           │
│  ● Installing dependencies...                        │
│  ○ Running compile check...                          │
└─────────────────────────────────────────────────────┘
```

进度条会根据后端 SSE 事件实时更新。绿色圆点表示"实时"状态。

**步骤 3: 查看生成结果**

流水线完成后，页面显示:
- **"查看产出物"** → 浏览生成的文件代码
- **"在 Gitea 中查看"** → 跳转到 Gitea 仓库（如已配置）

### 5.3 查看验证结果

项目生成完成后，进入 `/verify` 页面:

```
┌─ 验证摘要 ──────────────────────────────────────────┐
│  已确认修复: 3      待处理修复: 1                    │
│  L1 Auto: 2   L2 Suggest: 1   L3 Manual: 1         │
├─ 验证工具详情 ──────────────────────────────────────┤
│  ▼ tsc-compile    ✅ 通过  耗时: 3.2s               │
│  ▼ code-quality   ⚠️ 警告  耗时: 0.01s             │
│     • [static] 文件过长: 520 行                     │
│     • [policy] 检测到 console.log                   │
│  ▼ hallucination  ✅ 通过  耗时: 0.01s              │
│  ▼ security       ✅ 通过  耗时: 0.02s              │
├─ 状态操作 ──────────────────────────────────────────┤
│  [验证通过→开发]  [进入测试]  [返回开发]              │
└─────────────────────────────────────────────────────┘
```

验证执行 4 项检查:
1. **tsc-compile** — TypeScript 编译检查
2. **code-quality-guard** — 代码质量（复杂度/TODO/console.log）
3. **hallucination-guard** — 幻觉检测（不存在的 API/矛盾声明）
4. **security-auditor** — 安全审计（OWASP Top 10）

### 5.4 查看编排状态

进入 `/orchestrate` 页面查看多 Agent 系统状态:

```
┌─ Agent 健康 ─────────────────────────────────────────┐
│  ● Active Agents: 2                                  │
│  ● Registered: 4 (code-generation, test-generation)   │
│  ● Queued Messages: 0                                │
├─ 总线统计 ───────────────────────────────────────────┤
│  ● Messages Processed: 234                           │
│  ● Avg Latency: 8ms                                  │
├─ DAG 状态 ──────────────────────────────────────────┤
│  Wave 1: [auth-task ■, crud-task ■]                  │
│  Wave 2: [ui-task □]                                 │
│  总计: 2/3 任务完成                                   │
└──────────────────────────────────────────────────────┘
```

### 5.5 配置 LLM Provider

进入 `/settings/llm`:

```
┌─ LLM Provider 配置 ────────────────────────────────┐
│  API Key:    [••••••••••••••••]  (已配置)           │
│  Base URL:   [https://dashscope.aliyuncs.com/...]   │
│  默认模型:   [qwen3.5-plus ▼]                       │
│                                                     │
│  [测试连接]  [保存]                                  │
│  ✅ 连接成功 (延迟: 320ms)                          │
└─────────────────────────────────────────────────────┘
```

其他配置页面:
- `/settings/pipeline` — Pipeline 参数（maxRetries/超时/阈值）
- `/settings/notifications` — Webhook 通知配置
- `/settings/tenants` — 租户管理
- `/settings/gitea` — Gitea 仓库配置

### 5.6 查看系统分析

进入 `/analysis/global`:

```
┌─ 瓶颈阶段排名 ─────────────────────────────────────┐
│  #1  stage2_dev   avg: 4.5s  P95: 6.0s  失败率 33% │
│     ████████████████████████████████░░░░  4.5s      │
│  #2  stage4_verify avg: 3.2s  P95: 5.1s  失败率 20% │
│     ██████████████████████████░░░░░░░░  3.2s        │
├─ 编译错误 TOP 5 ────────────────────────────────────┤
│  TS2322: Type X not assignable to Y   15 次         │
│  TS6133: X declared but never used    8 次          │
├─ 组件复用排行 ─────────────────────────────────────┤
│  Button   出现在 5 个项目                            │
│  Card     出现在 4 个项目                            │
└─────────────────────────────────────────────────────┘
```

---

## 第六章: 故障排除

### 6.1 服务启动失败

| 症状 | 检查项 | 解决 |
|------|--------|------|
| 端口占用 | `lsof -ti:3000` | 关闭占用进程或修改 `ANFSF_PORT` |
| LLM 连接失败 | `curl $LLM_BASE_URL/...` | 检查 `LLM_API_KEY` 和 `LLM_BASE_URL` |
| 数据库连接失败 | `docker compose logs postgres` | 检查 `DATABASE_URL`，确认 PostgreSQL 健康 |
| JWT 未配置 | 启动日志 warning | 设置环境变量 `JWT_SECRET` |

### 6.2 前端访问异常

| 问题 | 检查 |
|------|------|
| 白屏 | 浏览器控制台查看错误 → 确认后端启动 |
| 401 未授权 | 重新登录获取新 Token |
| API 请求失败 | `vite.config.ts` 中 proxy 配置的 target 端口是否与后端一致 |

### 6.3 代码生成失败

| 症状 | 原因 |
|------|------|
| 0 个生成文件 | PRD 质量评分过低 → 需进入引导模式 |
| 编译错误未修复 | Token 预算耗尽 → 增加 `TOKEN_BUDGET` |
| Gitea 推送失败 | Gitea 服务未启动或配置错误 |

### 6.4 实用命令

```bash
# 查看实时日志
docker compose logs -f anfsf

# 查看 API 文档
open http://localhost:3000/docs

# 查看 Prometheus 指标
curl http://localhost:3000/metrics

# 重置用户数据
rm .anfsf/users.json && docker compose restart anfsf
# (如用 SQLite) 重置数据库
rm .anfsf/runs.db && docker compose restart anfsf
```

---

## 第七章: 生产部署清单

### 7.1 安全加固

- [ ] `JWT_SECRET` 已设置为 32 字节随机字符串
- [ ] `ANFSF_API_TOKEN` 已设置
- [ ] 注册的用户已赋予合适角色
- [ ] 已配置 HTTPS（建议 Nginx 反向代理）
- [ ] CORS 已限制到具体域名（设置 `ANFSF_ALLOWED_ORIGINS`）

### 7.2 运维准备

- [ ] Docker 数据卷已挂载持久化目录
- [ ] Prometheus 已配置报警规则
- [ ] Grafana 仪表盘已导入
- [ ] 日志轮转已配置（设置 `LOG_FILE`）
- [ ] 数据库定期备份已配置

---

## 附录

### A. 环境变量完整清单

| 变量名 | 说明 | 必填 | 默认值 |
|--------|------|------|--------|
| `LLM_API_KEY` | LLM Provider API Key | **是** | — |
| `JWT_SECRET` | JWT 签名密钥 | **是** | 自动生成(重启失效) |
| `ANFSF_API_TOKEN` | API 访问令牌 | 推荐 | — |
| `LLM_BASE_URL` | LLM Provider URL | 否 | DashScope 默认地址 |
| `ANFSF_MODEL` | 默认模型 | 否 | `qwen3.5-plus` |
| `ANFSF_PORT` | 服务端口 | 否 | `3000` |
| `ANFSF_HOST` | 绑定地址 | 否 | `0.0.0.0` |
| `TOKEN_BUDGET` | 项目 Token 预算 | 否 | `5000000` |
| `LOG_LEVEL` | 日志级别 | 否 | `info` |
| `LOG_FILE` | 日志文件路径 | 否 | stderr 输出 |
| `DATABASE_URL` | PostgreSQL 连接串 | 否 | 默认 SQLite |
| `ANFSF_ALLOWED_ORIGINS` | CORS 允许域名 | 否 | 仅 localhost |
| `GITEA_URL` | Gitea 地址 | 否 | `http://localhost:3001` |
| `GITEA_WEBHOOK_SECRET` | Gitea Webhook 密钥 | 否 | 不验证 |

### B. API 端点速查

| 方法 | 路径 | 说明 | 是否需要 Token |
|------|------|------|:------------:|
| GET | `/health` | 健康检查 | ❌ |
| GET | `/ready` | 就绪检查 | ❌ |
| GET | `/metrics` | Prometheus 指标 | ❌ |
| POST | `/api/v1/auth/register` | 注册 | ❌ |
| POST | `/api/v1/auth/login` | 登录 | ❌ |
| GET | `/api/v1/auth/me` | 当前用户 | ✅ |
| POST | `/api/v1/auth/logout` | 登出 | ✅ |
| POST | `/api/v1/synthesize` | 提交 PRD 生成代码 | ✅ |
| POST | `/api/v1/synthesize/multipart` | 带附件提交 PRD | ✅ |
| GET | `/api/v1/pipeline/:id/status` | 查询运行状态 | ✅ |
| GET | `/api/v1/pipeline/:id/files` | 列出生成文件 | ✅ |
| GET | `/api/v1/pipeline` | 运行历史 | ✅ |
| GET | `/api/v1/pipeline/:id/stream` | SSE 实时进度 | ✅ |
| GET | `/api/v1/orchestrate/status` | 编排状态 | ✅ |
| GET | `/api/v1/skills` | 技能列表 | ✅ |
| GET | `/docs` | Swagger API 文档 | ❌ |
| GET | `/api/v1/knowledge/metrics/stages` | 阶段指标 | ✅ |
| GET | `/api/v1/knowledge/metrics/bottlenecks` | 瓶颈分析 | ✅ |
| GET | `/api/v1/knowledge/compile-patterns` | 编译错误模式 | ✅ |

### C. 参考链接

- API 交互文档: `http://localhost:3000/docs`
- Prometheus 指标: `http://localhost:3000/metrics`
- Grafana 仪表盘: `http://localhost:3001` (admin / 配置密码)
- Docker Hub 镜像: `ghcr.io/your-org/anfsf`
