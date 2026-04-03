# 捷阅证券 UI/UX 设计系统文档

基于 **ANFSF V1.5.0** 架构，包含 **Layer 8.5.6 UI/UX Synthesis Module** 和 **Layer 8.5.7 Readiness Gate**。

## 📋 目录

1. [设计令牌](#设计令牌)
2. [组件库](#组件库)
3. [使用指南](#使用指南)
4. [测试报告](#测试报告)

---

## 🎨 设计令牌

设计令牌位于 `src/styles/design-tokens.ts`，包含完整的视觉系统定义。

### 颜色系统

#### 主色调 (Primary)
```typescript
primary: {
  50: '#eef2ff',  // 最浅
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1', // 主色
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
  950: '#1e1b4b', // 最深
}
```

#### 语义色
- **Success**: `#22c55e` - 成功状态
- **Warning**: `#f59e0b` - 警告状态
- **Error**: `#ef4444` - 错误状态
- **Info**: `#3b82f6` - 信息提示

### 字体系统

```typescript
typography: {
  fontFamily: {
    heading: '"Inter", "Noto Sans SC", sans-serif',
    body: '"Inter", "Noto Sans SC", sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
  }
}
```

### 间距系统

基于 **4px 基准**：

```typescript
spacing: {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
}
```

### 响应式断点

```typescript
breakpoints: {
  sm: '640px',    // 手机横屏
  md: '768px',    // 平板
  lg: '1024px',   // 小屏笔记本
  xl: '1280px',   // 桌面
  '2xl': '1536px',// 大屏
}
```

---

## 🧩 组件库

所有组件位于 `src/components/ui/`，支持暗色模式和完整的可访问性。

### 已实现组件

| 组件 | 文件 | 状态 |
|------|------|------|
| Button | `Button.tsx` | ✅ 完成 |
| Card | `Card.tsx` | ✅ 完成 |
| Input | `Input.tsx` | ✅ 完成 |
| Modal | `Modal.tsx` | ✅ 完成 |
| Toast | `Toast.tsx` | ✅ 完成 |
| Skeleton | `Skeleton.tsx` | ✅ 完成 |

### Button 组件

```tsx
import { Button } from '@/components/ui'

// 基础用法
<Button variant="primary">提交</Button>

// 带加载状态
<Button isLoading>处理中...</Button>

// 带图标
<Button leftIcon={<SendIcon />}>发送</Button>

// 变体
<Button variant="primary">主要</Button>
<Button variant="secondary">次要</Button>
<Button variant="outline">边框</Button>
<Button variant="ghost">幽灵</Button>
<Button variant="danger">危险</Button>

// 尺寸
<Button size="sm">小</Button>
<Button size="md">中</Button>
<Button size="lg">大</Button>
```

### Card 组件

```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui'

<Card>
  <CardHeader>
    <h3>标题</h3>
  </CardHeader>
  <CardBody>
    <p>内容</p>
  </CardBody>
  <CardFooter>
    <p>底部</p>
  </CardFooter>
</Card>
```

### Input 组件

```tsx
import { Input } from '@/components/ui'

<Input
  label="邮箱"
  type="email"
  placeholder="请输入邮箱"
  error="邮箱格式不正确"
  hint="我们将发送验证邮件"
  leftIcon={<EmailIcon />}
/>
```

### Modal 组件

```tsx
import { Modal } from '@/components/ui'

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="确认操作"
  size="md"
>
  <p>确定要执行此操作吗？</p>
</Modal>
```

### Toast 组件

```tsx
import { toast } from '@/components/ui'

// 成功提示
toast.success('操作成功！')

// 错误提示
toast.error('操作失败，请重试')

// 警告提示
toast.warning('请注意此操作')

// 信息提示
toast.info('新消息通知')
```

### Skeleton 组件

```tsx
import { Skeleton, SkeletonText, SkeletonCard } from '@/components/ui'

// 基础骨架屏
<Skeleton width={100} height={20} />

// 文本骨架屏
<SkeletonText lines={3} />

// 卡片骨架屏
<SkeletonCard />
```

---

## 📖 使用指南

### 1. 导入组件

```tsx
// 单个导入
import { Button } from '@/components/ui/Button'

// 批量导入
import { Button, Input, Card } from '@/components/ui'
```

### 2. 使用设计令牌

```tsx
import { designTokens } from '@/styles/design-tokens'

// 访问颜色
const primaryColor = designTokens.colors.primary[500]

// 访问间距
const spacing = designTokens.spacing[4]
```

### 3. 响应式设计

```tsx
// Tailwind CSS 响应式类
<div className="
  grid
  grid-cols-1      /* 手机 */
  md:grid-cols-2   /* 平板 */
  lg:grid-cols-3   /* 桌面 */
">
  {/* 内容 */}
</div>
```

### 4. 暗色模式

```tsx
// 自动支持系统暗色模式
<div className="
  bg-white
  dark:bg-gray-800
  text-gray-900
  dark:text-white
">
  内容
</div>
```

---

## 🧪 测试报告

运行样式加载测试：

```tsx
import { runAllTests } from '@/lib/test-style-loading'

// 在浏览器控制台运行
runAllTests()
```

### 验收标准

| 指标 | 目标 | 当前状态 |
|------|------|----------|
| 样式加载成功率 | >99% | ✅ 达标 |
| Critical CSS 内联 | 100% | ✅ 达标 |
| FOUC 风险 | 无 | ✅ 达标 |
| 首屏加载时间 | <2s | ✅ 达标 |
| 样式文件大小 | <50KB | ✅ 达标 |
| 设计系统完整度 | 100% | ✅ 达标 |
| 组件库完整度 | 5+ 组件 | ✅ 6 个组件 |
| 响应式布局 | 完整 | ✅ 达标 |
| 暗色模式支持 | 支持 | ✅ 达标 |

---

## 📁 文件结构

```
src/
├── styles/
│   ├── design-tokens.ts      # 设计令牌
│   └── globals-enhanced.css  # 增强全局样式
├── components/
│   └── ui/
│       ├── index.ts          # 统一导出
│       ├── Button.tsx        # 按钮组件
│       ├── Card.tsx          # 卡片组件
│       ├── Input.tsx         # 输入框组件
│       ├── Modal.tsx         # 模态框组件
│       ├── Toast.tsx         # 通知组件
│       └── Skeleton.tsx      # 骨架屏组件
├── lib/
│   └── test-style-loading.ts # 样式测试工具
└── app/
    ├── layout.tsx            # 根布局 (含 Readiness Gate)
    ├── page.tsx              # 首页
    └── tasks/
        └── page.tsx          # 任务列表页
```

---

## 🚀 性能优化

### Critical CSS 内联

在 `layout.tsx` 中已内联关键样式，防止 FOUC：

```tsx
const criticalCSS = `
  :root { --bg-primary: #ffffff; }
  body { margin: 0; font-family: 'Inter', sans-serif; }
`.replace(/\n/g, '')

<style id="critical-css" dangerouslySetInnerHTML={{ __html: criticalCSS }} />
```

### 字体优化

```tsx
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // 字体加载时显示后备字体
})
```

### 图片懒加载

```tsx
<img 
  src="/image.jpg" 
  loading="lazy" 
  alt="描述"
/>
```

---

## 📞 技术支持

如有问题，请联系：
- 📧 support@jieyue.com
- 📱 400-xxx-xxxx

---

**版本**: 1.0.0  
**最后更新**: 2026-04-01  
**基于**: ANFSF V1.5.0
