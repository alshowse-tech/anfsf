# SparkPath W1 开发计划

**执行周期**: 2026-04-16 ~ 2026-04-23 (7 天)  
**使用架构**: ANFSF V2.0  
**交付物**: 设计系统 v1.0 + 开发环境

---

## 🎯 W1 目标

### 任务 1: 设计系统实现 (3 天)
- [ ] 色彩系统 (三阶段)
- [ ] 字体系统
- [ ] 基础组件 (按钮/卡片/输入框)
- [ ] 动画规范

### 任务 2: 开发环境搭建 (2 天)
- [ ] React Native 环境
- [ ] Neo4j 数据库
- [ ] 项目脚手架

### 任务 3: 测试配置 (1 天)
- [ ] 单元测试配置
- [ ] E2E 测试配置
- [ ] CI/CD 流水线

### 任务 4: 文档完善 (1 天)
- [ ] API 文档
- [ ] 组件文档
- [ ] 开发指南

---

## 📦 功能点展开 (ANFSF V2.0)

### P0 - 核心功能 (W1 必需)

| ID | 类别 | 功能描述 | 优先级 |
|----|------|---------|-------|
| **w1-001** | ui | 色彩系统 (三阶段色板) | P0 |
| **w1-002** | ui | 字体系统 (SF Pro/苹方) | P0 |
| **w1-003** | ui | 按钮组件 (三阶段样式) | P0 |
| **w1-004** | ui | 卡片组件 (学习卡片) | P0 |
| **w1-005** | ui | 输入框组件 (语音/文本) | P0 |
| **w1-006** | ui | 进度条组件 (三阶段样式) | P0 |
| **w1-007** | integration | React Native 环境配置 | P0 |
| **w1-008** | integration | Neo4j 数据库配置 | P0 |
| **w1-009** | integration | TypeScript 配置 | P0 |
| **w1-010** | integration | ESLint + Prettier 配置 | P0 |
| **w1-011** | functional | 单元测试配置 (Jest) | P0 |
| **w1-012** | functional | E2E 测试配置 (Detox) | P0 |

### P1 - 重要功能 (W2)

| ID | 类别 | 功能描述 |
|----|------|---------|
| **w1-013** | ui | 徽章组件 (成就系统) |
| **w1-014** | ui | 导航组件 (底部 TabBar) |
| **w1-015** | ui | 动画组件 (页面过渡) |
| **w1-016** | integration | GitHub Actions CI/CD |
| **w1-017** | functional | 组件文档 (Storybook) |

---

## 🏗️ 技术设计

### 设计系统架构

```
@sparkpath/design-system/
├── src/
│   ├── index.ts                    # 导出所有
│   ├── colors.ts                   # 色彩系统
│   ├── typography.ts               # 字体系统
│   ├── spacing.ts                  # 间距系统
│   ├── animations.ts               # 动画规范
│   │
│   ├── components/                 # 组件库
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.styles.ts
│   │   │   └── Button.test.tsx
│   │   ├── Card/
│   │   ├── Input/
│   │   ├── ProgressBar/
│   │   ├── Badge/
│   │   └── Navigation/
│   │
│   ├── hooks/                      # React Hooks
│   │   ├── useStageStyle.ts
│   │   └── useAnimation.ts
│   │
│   └── utils/                      # 工具函数
│       ├── stageConfig.ts
│       └── themeBuilder.ts
│
├── package.json
└── tsconfig.json
```

### 色彩系统实现

```typescript
// colors.ts
export const colors = {
  // 小学阶段 (9-12 岁)
  elementary: {
    primary: '#FF6B6B',      // 珊瑚红
    secondary: '#4ECDC4',    // 青绿
    accent: '#FFE66D',       // 明黄
    background: '#FFF9F0',   // 暖白
    surface: '#FFFFFF',
    text: '#2D3436',
    success: '#00B894',
    warning: '#FDCB6E',
    error: '#FF7675',
  },
  
  // 初中阶段 (13-15 岁)
  middle: {
    primary: '#0984E3',      // 湛蓝
    secondary: '#00CEC9',    // 青蓝
    accent: '#FD79A8',       // 粉红
    background: '#F8F9FA',
    surface: '#FFFFFF',
    text: '#2D3436',
    success: '#00B894',
    warning: '#FDCB6E',
    error: '#FF7675',
  },
  
  // 高中阶段 (16-18 岁)
  high: {
    primary: '#6C5CE7',      // 深紫
    secondary: '#A29BFE',    // 淡紫
    accent: '#00CEC9',       // 青蓝
    background: '#1A1A2E',   // 深蓝黑
    surface: '#16213E',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    success: '#00B894',
    warning: '#FDCB6E',
    error: '#FF7675',
  },
};

export type Stage = 'elementary' | 'middle' | 'high';
export type ColorScheme = typeof colors[Stage];
```

### 组件接口定义

```typescript
// components/Button/types.ts
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  stage?: Stage;  // 自动适配阶段样式
  disabled?: boolean;
  icon?: string;
  loading?: boolean;
}

// components/Card/types.ts
export interface CardProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  stage?: Stage;
  variant?: 'learning' | 'achievement' | 'stats';
  onPress?: () => void;
  progress?: number;  // 0-100
}
```

---

## 📅 每日计划

### Day 1 (4/16): 项目初始化
- [ ] 创建 monorepo 结构
- [ ] 配置 TypeScript
- [ ] 配置 ESLint + Prettier
- [ ] 创建设计系统基础文件

### Day 2 (4/17): 色彩与字体
- [ ] 实现色彩系统 (三阶段)
- [ ] 实现字体系统
- [ ] 实现间距系统
- [ ] 编写单元测试

### Day 3 (4/18): 基础组件 (上)
- [ ] Button 组件 (三阶段样式)
- [ ] Card 组件
- [ ] Input 组件
- [ ] 组件测试

### Day 4 (4/19): 基础组件 (下)
- [ ] ProgressBar 组件
- [ ] Badge 组件
- [ ] Navigation 组件
- [ ] 组件测试

### Day 5 (4/20): 动画与 Hook
- [ ] 动画规范实现
- [ ] useStageStyle Hook
- [ ] useAnimation Hook
- [ ] 集成测试

### Day 6 (4/21): 环境搭建
- [ ] React Native 环境
- [ ] Neo4j 数据库
- [ ] 示例 App 创建

### Day 7 (4/22): 测试与文档
- [ ] 单元测试配置
- [ ] E2E 测试配置
- [ ] 组件文档
- [ ] W1 验收

---

## ✅ 验收标准

### 设计系统 v1.0
- [ ] 色彩系统完整 (三阶段)
- [ ] 字体系统完整
- [ ] 基础组件≥5 个 (Button/Card/Input/Progress/Badge)
- [ ] 组件测试覆盖率≥80%
- [ ] 支持三阶段样式切换

### 开发环境
- [ ] React Native 可运行
- [ ] Neo4j 可连接
- [ ] TypeScript 编译通过
- [ ] 单元测试通过

### 文档
- [ ] README.md 完整
- [ ] 组件文档完整
- [ ] API 文档完整

---

## 📊 成功指标

| 指标 | 目标 | 测量方法 |
|------|------|---------|
| **组件数量** | ≥5 个 | 文件计数 |
| **测试覆盖率** | ≥80% | Jest 报告 |
| **TypeScript 错误** | 0 | tsc 编译 |
| **Lint 错误** | 0 | eslint 检查 |
| **文档完整度** | 100% | 文档审查 |

---

**计划状态**: ✅ 已批准  
**执行开始**: 2026-04-16  
**预计完成**: 2026-04-22
