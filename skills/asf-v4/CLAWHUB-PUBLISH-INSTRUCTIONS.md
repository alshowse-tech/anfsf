# ClawHub V1.5.6 手动发布指南

**原因**: ClawHub CLI 在某些环境下可能遇到 SKILL.md 验证问题

---

## 方法 1: 使用 Web 界面发布（推荐）

### 步骤 1: 访问 ClawHub

打开浏览器访问：https://clawhub.ai

### 步骤 2: 登录

使用账号 `alshowse-tech` 登录。

### 步骤 3: 找到 asf-v4 技能

1. 访问你的技能列表
2. 找到 `asf-v4` 技能
3. 点击 "发布新版本" 或 "Publish New Version"

### 步骤 4: 填写版本信息

- **Version**: 1.5.6
- **Changelog**: 
  ```
  v1.5.6 - 100% health status (187/187 tests), enhanced hybrid adaptive parser, complete security audit (0 critical/warn), self-health check mechanism
  ```
- **Tags**: latest, governance, optimization, health-check

### 步骤 5: 上传文件

打包技能文件：

```bash
cd /root/.openclaw/workspace-main/skills/asf-v4
tar -czf asf-v4-1.5.6.tar.gz \
  index.ts \
  package.json \
  SKILL.md \
  skill.yaml \
  src/ \
  config/ \
  tools/ \
  integrations/ \
  benchmarks/ \
  scripts/ \
  README.md \
  RELEASE-1.5.6.md
```

上传 `asf-v4-1.5.6.tar.gz` 到 ClawHub。

**包位置**: `/tmp/asf-v4-1.5.6-release.tar.gz` (120KB)

---

## 方法 2: 使用 CLI 重试

```bash
# 1. 确认登录状态
clawhub whoami

# 2. 如果显示未登录，重新登录
clawhub login

# 3. 尝试使用 sync 命令
cd /root/.openclaw/workspace-main/skills
npx clawhub sync --all

# 4. 或者使用 publish 命令
cd /root/.openclaw/workspace-main/skills/asf-v4
npx clawhub publish . --version 1.5.6 --changelog "v1.5.6 - 100% health status"
```

---

## 方法 3: 使用 API 直接发布

```bash
# 获取认证 token
TOKEN=$(cat ~/.clawhub/token 2>/dev/null)

# 发布新版本
curl -X POST https://clawhub.ai/api/skills/asf-v4/versions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.5.6",
    "changelog": "v1.5.6 - 100% health status (187/187 tests)",
    "tags": ["latest"]
  }'
```

---

## 验证发布

发布完成后，验证：

```bash
# 检查最新版本
clawhub inspect asf-v4

# 应该显示 Latest: 1.5.6
```

---

## 当前状态

- **GitHub**: ✅ 已发布 (Tag: v1.5.6)
- **ClawHub**: ⏳ 等待手动确认
- **包文件**: ✅ 已打包 (/tmp/asf-v4-1.5.6-release.tar.gz)

---

**创建时间**: 2026-04-15 11:18  
**创建人**: 格格 👸
