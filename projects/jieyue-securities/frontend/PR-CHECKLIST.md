# PR 审查清单 (Pull Request Checklist)

**目的**: 预防常见配置错误，确保代码质量  
**适用范围**: 所有提交到 `jieyue-securities/frontend` 的 PR

---

## 📋 通用审查项

- [ ] 代码通过 TypeScript 类型检查 (`npm run typecheck` 或 `tsc --noEmit`)
- [ ] 代码通过 Lint 检查 (`npm run lint`)
- [ ] 构建成功 (`npm run build`)
- [ ] 无控制台警告/错误

---

## 🎨 UI 相关 PR 审查项

**适用于**: 涉及 UI 组件、样式、布局的变更

### Tailwind CSS 兼容性

- [ ] **Tailwind 版本兼容性确认**
  - Tailwind v3 语法：`@tailwind base/components/utilities`
  - Tailwind v4 语法：`@import "tailwindcss"`
  - 当前项目使用：**Tailwind v4.2.2** → 必须使用 v4 语法

- [ ] **globals.css 语法检查**
  ```css
  /* ✅ 正确 (v4) */
  @import "tailwindcss";
  
  /* ❌ 错误 (v3) */
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```

### 构建输出验证

- [ ] **CSS 文件大小检查**
  - 运行：`npm run check:css`
  - 预期：CSS 文件 > 30KB
  - 如 < 30KB，可能原因：
    - Tailwind 配置错误
    - 语法不兼容
    - PostCSS 配置问题

- [ ] **强制刷新浏览器验证**
  - 使用 `Ctrl+Shift+R` (Windows/Linux) 或 `Cmd+Shift+R` (Mac)
  - 确认样式正常显示
  - 检查无样式闪烁 (FOUC)

### 样式完整性

- [ ] **常用工具类可用**
  - 布局类：`.flex`, `.grid`, `.block`, `.inline`
  - 间距类：`.p-4`, `.m-2`, `.gap-4`
  - 颜色类：`.bg-blue-500`, `.text-white`, `.text-gray-800`
  - 响应式类：`.md:flex`, `.lg:grid`

- [ ] **自定义样式无冲突**
  - 自定义 CSS 不与 Tailwind 工具类冲突
  - 使用 `@layer components` 定义自定义组件

---

## 🔧 配置变更审查项

**适用于**: 修改 `package.json`, `tailwind.config.js`, `postcss.config.js` 等

- [ ] **依赖版本变更说明**
  - 升级/降级原因
  - 兼容性影响评估
  - 是否需要迁移步骤

- [ ] **peerDependencies 更新**
  - 新增依赖是否声明 peerDependencies
  - 版本范围是否合理（如 `^3.0.0 || ^4.0.0`）

- [ ] **构建脚本变更**
  - 新增脚本是否测试
  - 脚本是否有错误处理
  - 脚本是否有清晰错误提示

---

## 🧪 测试审查项

- [ ] **单元测试覆盖**（如适用）
- [ ] **E2E 测试通过**（如适用）
- [ ] **手动测试场景记录**
  - 测试步骤
  - 预期结果
  - 实际结果

---

## 📝 提交质量

- [ ] **提交信息规范**
  - 格式：`<type>(<scope>): <description>`
  - 例如：`feat(ui): add login page component`
  - 类型：`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

- [ ] **代码审查响应**
  - 及时回复审查意见
  - 修改后重新标记审查人

---

## ⚠️ 常见问题排查

### 样式不显示

```bash
# 1. 检查 CSS 构建
npm run build && npm run check:css

# 2. 强制刷新浏览器
# Windows/Linux: Ctrl+Shift+R
# Mac: Cmd+Shift+R

# 3. 清除 .next 缓存
rm -rf .next && npm run build
```

### Tailwind 类名不生效

```bash
# 检查 globals.css 语法
cat src/app/globals.css | head -5

# 应该是：@import "tailwindcss";
# 不是：@tailwind base;
```

### 构建失败

```bash
# 查看详细错误
npm run build 2>&1 | tee build.log

# 检查 Node 版本
node -v  # 应 >= 18.0.0

# 清理依赖重装
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 相关文档

- [UI/UX 优化报告](./UI-UX-OPTIMIZATION-REPORT.md)
- [Tailwind CSS v4 迁移指南](https://tailwindcss.com/docs/upgrade-guide)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)

---

**最后更新**: 2026-04-02  
**维护者**: ASF V4.0 Team
