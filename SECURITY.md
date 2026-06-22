# Security Policy

> **项目**: ANFSF — Autonomous Non-Fungible Software Factory
> **最后更新**: 2026-06-17

---

## Supported Versions

| 版本 | 安全更新 |
|------|---------|
| `master` (latest) | ✅ 活跃支持 |

---

## Reporting a Vulnerability

**请勿为安全漏洞创建公开 Issue。**

如发现 ANFSF 中的安全漏洞，请通过以下方式报告：

1. 发送加密邮件至项目维护者（`security@anfsf.dev`），或发起私有 Issue。
2. 报告内容应包含：
   - 漏洞描述
   - 复现步骤
   - 影响范围评估
   - 修复建议（可选）

### 响应时间

| 阶段 | 时限 |
|------|------|
| 确认收到 | 48 小时内 |
| 初步评估 | 5 个工作日内 |
| 修复发布 | 严重问题 30 天内 |
| 公开披露 | 修复发布后协调披露 |

---

## 部署安全最佳实践

### 必须执行（P0）

| # | 措施 | 说明 |
|---|------|------|
| 1 | **不提交 `.env` 到 Git** | `.env` 已在 `.gitignore` 中。若历史中包含过 API Key，立即轮换并重写历史 |
| 2 | **设置 `ANFSF_API_TOKEN`** | 生产环境必须配置 Bearer Token 认证 |
| 3 | **HTTPS 反向代理** | 使用 nginx/Caddy 对外暴露，不要直接暴露 Node.js 端口 |
| 4 | **轮换 API Key** | LLM_API_KEY 定期轮换，不要无限期使用同一密钥 |

### 建议执行（P1）

| # | 措施 | 说明 |
|---|------|------|
| 5 | **启用 Prompt 注入拦截** | 设置 `ANFSF_BLOCK_INJECTIONS=true`，系统内置了中英文注入检测规则 |
| 6 | **使用强密码** | `POSTGRES_PASSWORD`、`GRAFANA_ADMIN_PASSWORD` 等使用 32 字符以上随机密码 |
| 7 | **依赖审计** | 定期运行 `npm audit` 和 `npm audit fix` |
| 8 | **Token 存储用 sessionStorage** | 前端 token 不使用 localStorage（防 XSS 读取） |
| 9 | **CSP 配置** | 生产环境限制 `connect-src` 为已知 LLM API 域名白名单 |

### 进阶措施（P2）

| # | 措施 | 说明 |
|---|------|------|
| 10 | **LLM Playground 限制** | Playground 端已内置 `max_tokens=4096` 和历史截断（10 条），生产环境考虑添加速率限制 |
| 11 | **数据库端口不暴露** | PostgreSQL 和 SQLite 文件端口不暴露到公网 |
| 12 | **Docker 安全** | 不要以 root 运行容器，使用 `--read-only` 等安全选项 |

---

## ANFSF 内置安全机制

| 机制 | 实现位置 | 说明 |
|------|---------|------|
| **Prompt 注入检测** | `input-governance/sanitization.ts` | 中英文模糊词+注入模式检测，支持拦截/告警两种模式 |
| **路径安全校验** | `core/quality/compile-validator.ts` | `SAFE_PATH_RE` 正则拒绝 shell 元字符，`spawn` 而非 `exec` 执行 tsc |
| **LLM Playground 令牌限制** | `server/routes/llm-playground.ts` | `max_tokens=4096` 上限，对话历史截断到 10 条 |
| **输入净化** | `input-governance/sanitization.ts` | PRD 文本长度限制（100K 字符），不可见字符过滤 |
| **附件校验** | `input/sanitization-attachments.ts` | MIME 类型+Magic Bytes 双重校验，文件大小限制 |
| **LLM Circuit Breaker** | `integrations/llm-client.ts` | 连续失败 5 次→断路，30s 后恢复半开状态 |
| **Token 预算硬阻断** | `pipeline/token-budget.ts` | hardBlock(135%) 阻止所有 LLM 调用，防止无限消耗 |
| **CompileValidator 隔离** | `core/quality/compile-validator.ts` | tsc 通过 `spawn(node, [tscPath])` 执行，非 shell 模式 |

---

## 已知安全注意事项

| # | 类别 | 描述 | 状态 |
|---|------|------|------|
| 1 | API Key | `.env` 中曾包含真实 `sk-865b6...` 密钥（[audit-report](docs/audit-report.md) P0-1）。需确认已轮换 | ⚠️ 待确认 |
| 2 | 沙箱 | `npm install` 和 `tsc` 直接在本地文件系统执行，无容器隔离 | ⚠️ 设计约束 |
| 3 | 反馈端点 | `/api/v1/feedback/*` 和 `/api/v1/confirmation/*` 无认证中间件（[audit-report](docs/audit-report.md) P2-20） | ❌ 待修复 |
| 4 | CSP | `connect-src` 当前不包含 `'*'` 通配符（已修复 P2-14） | ✅ 已修复 |

---

## 依赖安全

```bash
# 审计当前依赖
npm audit

# 自动修复安全漏洞
npm audit fix

# 检查过时依赖
npm outdated
```

---

## License

本项目采用 MIT 许可证。
