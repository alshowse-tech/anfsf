# 捷阅证券前端工程规范

**版本**: 1.0.0  
**日期**: 2026-04-02  
**对齐架构**: ANFSF V1.5.0 Layer 10 (Frontend Framework)

---

## 📋 目的

基于 2026-04-02 Tailwind CSS v4 语法不兼容问题的修复经验，制定前端工程规范，防止类似问题再次发生。

---

## 🎯 核心原则

1. **版本锁定** - 所有依赖必须锁定具体版本号
2. **构建门禁** - 构建失败必须阻止部署
3. **兼容性验证** - 主要依赖升级前必须验证兼容性
4. **废弃代码清理** - 未使用的组件/文件必须及时删除

---

## 📦 一、依赖版本管理

### 1.1 版本锁定策略

```json
{
  "dependencies": {
    "next": "14.1.0",        // ✅ 精确版本
    "react": "18.2.0",        // ✅ 精确版本
    "tailwindcss": "4.2.2"    // ✅ 精确版本
  }
}
```

**禁止使用**:
- ❌ `"next": "^14.0.0"` (主版本内自动升级)
- ❌ `"next": "latest"` (最新版本)
- ❌ `"next": "*"` (任意版本)

### 1.2 主要依赖兼容性矩阵

| 依赖 | 版本 | 配置文件 | 语法要求 |
|------|------|----------|----------|
| Next.js | 14.1.0 | `next.config.js` | `output: 'standalone'` |
| Tailwind CSS | 4.x | `postcss.config.js` | `@import "tailwindcss"` |
| Tailwind CSS | 3.x | `postcss.config.js` | `@tailwind base/components/utilities` |
| TypeScript | 5.x | `tsconfig.json` | `jsx: 'preserve'` |

### 1.3 升级检查清单

升级任何主要依赖前必须完成：

- [ ] 阅读官方迁移指南
- [ ] 检查配置文件语法变更
- [ ] 本地构建验证
- [ ] 样式/功能回归测试
- [ ] 更新本文档兼容性矩阵

---

## 🔒 二、构建门禁 (ANFSF V1.5.0 Layer 3)

### 2.1 构建验证步骤

```bash
# 1. 类型检查
npm run typecheck

# 2. 代码 lint
npm run lint

# 3. 构建验证
npm run build

# 4. 构建产物验证
test -d .next/standalone && echo "✅ Standalone 目录存在" || echo "❌ 构建失败"
test -f .next/standalone/server.js && echo "✅ server.js 存在" || echo "❌ 构建失败"
```

### 2.2 Docker 构建门禁

```dockerfile
# Dockerfile 中必须包含构建验证
RUN npm run build && \
    test -d .next/standalone || (echo "❌ Build failed: standalone directory missing" && exit 1) && \
    test -f .next/standalone/server.js || (echo "❌ Build failed: server.js missing" && exit 1)
```

### 2.3 构建失败处理流程

```
构建失败
    │
    ▼
┌───────────────────┐
│ 1. 停止部署流程    │
└───────────────────┘
    │
    ▼
┌───────────────────┐
│ 2. 记录错误日志    │
└───────────────────┘
    │
    ▼
┌───────────────────┐
│ 3. 回滚到上一版本  │
└───────────────────┘
    │
    ▼
┌───────────────────┐
│ 4. 修复后重新构建  │
└───────────────────┘
```

---

## 🧹 三、代码清理规范

### 3.1 废弃组件识别

以下情况标记为废弃组件：

- [ ] 组件未被任何页面引用 (`grep -r "ComponentName" src/app/`)
- [ ] 组件导入路径错误导致构建失败
- [ ] 组件功能已被其他组件替代
- [ ] 组件所属功能已被移除

### 3.2 清理流程

```bash
# 1. 确认组件未被使用
grep -r "MediaTranscription" src/app/ --include="*.tsx" --include="*.ts"
# 返回空表示未使用

# 2. 删除组件文件
rm src/components/MediaTranscription.tsx

# 3. 更新 Git
git add -A
git commit -m "chore: remove unused MediaTranscription component"
```

### 3.3 定期清理计划

| 频率 | 操作 | 负责人 |
|------|------|--------|
| 每周 | 检查未使用组件 | 前端负责人 |
| 每月 | 清理废弃文件 | 技术负责人 |
| 每版本 | 依赖版本审查 | 架构师 |

---

## 🎨 四、Tailwind CSS 配置规范

### 4.1 Tailwind v4 配置

**globals.css**:
```css
@import "tailwindcss";  /* ✅ v4 语法 */

/* 自定义样式 */
:root {
  --foreground-rgb: 0, 0, 0;
}
```

**postcss.config.js**:
```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},  // ✅ v4 插件
    autoprefixer: {},
  },
}
```

### 4.2 Tailwind v3 配置（旧版本参考）

**globals.css**:
```css
@tailwind base;        /* ❌ v3 语法，v4 不兼容 */
@tailwind components;  /* ❌ v3 语法 */
@tailwind utilities;   /* ❌ v3 语法 */
```

**postcss.config.js**:
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},       // ❌ v3 插件
    autoprefixer: {},
  },
}
```

### 4.3 样式验证

```bash
# 构建后验证 CSS 文件大小
CSS_SIZE=$(wc -c < .next/static/css/*.css)
if [ $CSS_SIZE -lt 10000 ]; then
  echo "❌ CSS 文件过小 ($CSS_SIZE bytes)，可能构建不完整"
  exit 1
else
  echo "✅ CSS 文件大小正常 ($CSS_SIZE bytes)"
fi
```

---

## 📊 五、监控指标 (ANFSF V1.5.0 Layer 14)

### 5.1 构建健康度指标

| 指标 | 正常值 | 告警值 | 说明 |
|------|--------|--------|------|
| 构建时间 | < 2min | > 5min | 超过 5 分钟需优化 |
| CSS 文件大小 | > 30KB | < 10KB | 过小可能构建不完整 |
| JS Chunk 数量 | < 20 | > 50 | 过多影响加载性能 |
| TypeScript 错误 | 0 | > 0 | 必须为 0 |

### 5.2 部署健康度指标

| 指标 | 检查方式 | 频率 |
|------|----------|------|
| HTTP 状态码 | `curl -o /dev/null -w "%{http_code}"` | 每 5 分钟 |
| 静态资源加载 | `curl /_next/static/css/*.css` | 每 5 分钟 |
| 容器健康检查 | `docker inspect --format='{{.State.Health.Status}}'` | 实时 |

---

## 🔗 六、ANFSF V1.5.0 架构对齐

### 6.1 Layer 10 (Frontend Framework) 职责

| 职责 | 实现 | 工具 |
|------|------|------|
| 构建系统 | Next.js 14 | `npm run build` |
| 样式系统 | Tailwind CSS v4 | `postcss.config.js` |
| 类型系统 | TypeScript 5.x | `tsconfig.json` |
| 代码质量 | ESLint | `eslint.config.js` |

### 6.2 Layer 3 (Governance Policy) 门禁

| 门禁 | 检查项 | 执行时机 |
|------|--------|----------|
| 类型门禁 | TypeScript 编译 | `npm run build` |
| 风格门禁 | ESLint 检查 | `npm run lint` |
| 构建门禁 | 产物完整性 | Docker build |
| 测试门禁 | 单元测试通过 | `npm run test` |

### 6.3 Layer 16 (Security Guard) 安全

| 安全措施 | 实现 | 说明 |
|----------|------|------|
| 依赖审计 | `npm audit` | 检测漏洞依赖 |
| 版本锁定 | `package-lock.json` | 防止意外升级 |
| 构建隔离 | Docker 多阶段构建 | 生产镜像最小化 |

---

## 📝 七、检查清单

### 7.1 提交前检查

- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 通过
- [ ] `npm run build` 成功
- [ ] 无未使用的组件/文件
- [ ] 依赖版本已锁定

### 7.2 部署前检查

- [ ] 构建产物完整性验证
- [ ] CSS 文件大小 > 10KB
- [ ] server.js 存在
- [ ] Docker 镜像构建成功
- [ ] 健康检查配置正确

### 7.3 版本升级检查

- [ ] 阅读迁移指南
- [ ] 更新兼容性矩阵
- [ ] 本地回归测试
- [ ] 更新本文档

---

## 📚 附录：问题案例

### 案例 1: Tailwind CSS v4 语法不兼容 (2026-04-02)

**现象**: 页面加载后无样式

**根因**: 
- `globals.css` 使用 v3 语法 (`@tailwind base`)
- 项目安装 Tailwind CSS v4.2.2
- 构建出的 CSS 仅 9.3KB（不完整）

**修复**:
1. 更新为 v4 语法 (`@import "tailwindcss"`)
2. CSS 大小恢复至 37KB
3. 样式正常显示

**预防**: 本文档 4.1 节已规范

### 案例 2: 未使用组件导致构建失败 (2026-04-02)

**现象**: Docker 构建失败

**根因**:
- `MediaTranscription.tsx` 使用错误的导入路径
- 组件未被任何页面使用
- TypeScript 类型检查失败

**修复**:
1. 删除未使用组件
2. 构建成功

**预防**: 本文档 3.1-3.3 节已规范

---

**维护者**: ANFSF V1.5.0 Frontend Team  
**最后更新**: 2026-04-02
