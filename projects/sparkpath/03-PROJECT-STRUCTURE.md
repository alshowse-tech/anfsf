# SparkPath 项目结构

**创建日期**: 2026-04-16  
**技术栈**: ANFSF V2.0 + OpenClaw + React Native + Neo4j

---

## 📁 目录结构

```
sparkpath/
├── README.md                          # 项目说明
├── PRD.md                             # 产品需求文档
├── 01-REQUIREMENT-EXPANSION.md        # 需求展开文档
├── 02-APPLE-DESIGN-MD.md              # Apple 风格设计文档
├── 03-PROJECT-STRUCTURE.md            # 项目结构 (本文档)
├── package.json                       # 项目配置
├── tsconfig.json                      # TypeScript 配置
│
├── apps/                              # 应用程序
│   ├── student-mobile/                # 学生端 App (React Native)
│   │   ├── src/
│   │   │   ├── components/            # UI 组件
│   │   │   ├── screens/               # 页面
│   │   │   ├── styles/                # 三阶段样式
│   │   │   │   ├── elementary.ts      # 小学样式
│   │   │   │   ├── middle.ts          # 初中样式
│   │   │   │   └── high.ts            # 高中样式
│   │   │   ├── hooks/                 # React Hooks
│   │   │   └── utils/                 # 工具函数
│   │   └── package.json
│   │
│   ├── parent-mobile/                 # 家长端 App (React Native)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   └── dashboard/             # 管控仪表盘
│   │   └── package.json
│   │
│   └── web-admin/                     # Web 管理台 (React)
│       ├── src/
│       └── package.json
│
├── packages/                          # 共享包
│   ├── learner-model/                 # Learner Model Engine
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── knowledge-graph.ts     # 知识图谱构建
│   │   │   ├── behavior-state.ts      # 行为状态追踪
│   │   │   └── stage-mapping.ts       # 跨阶段映射
│   │   └── package.json
│   │
│   ├── learning-accelerator/          # 学习加速引擎
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── gap-identification.ts  # 漏洞定位
│   │   │   ├── path-planning.ts       # 路径规划
│   │   │   ├── method-extraction.ts   # 方法提炼
│   │   │   └── difficulty-adjust.ts   # 难度自适应
│   │   └── package.json
│   │
│   ├── behavior-driver/               # 行为驱动引擎
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── exit-risk-detection.ts # 退出风险检测
│   │   │   ├── intervention-strategy.ts # 介入策略
│   │   │   └── stage-strategies/      # 三阶段策略
│   │   │       ├── elementary.ts
│   │   │       ├── middle.ts
│   │   │       └── high.ts
│   │   └── package.json
│   │
│   ├── experience-generator/          # Experience Generator
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── content-generation.ts  # 内容生成
│   │   │   ├── tts-sync.ts            # TTS 同步
│   │   │   └── stage-styling.ts       # 阶段样式
│   │   └── package.json
│   │
│   ├── knowledge-graph/               # 知识图谱服务
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── neo4j-client.ts        # Neo4j 客户端
│   │   │   ├── curriculum-api.ts      # 课标 API 同步
│   │   │   └── validation.ts          # 内容验证
│   │   └── package.json
│   │
│   └── design-system/                 # Apple 风格设计系统
│       ├── src/
│       │   ├── index.ts
│       │   ├── colors.ts              # 色彩系统
│       │   ├── typography.ts          # 字体系统
│       │   ├── components/            # 共享组件
│       │   └── animations.ts          # 动画规范
│       └── package.json
│
├── services/                          # 后端服务
│   ├── api-gateway/                   # API 网关
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── learning-service/              # 学习加速服务
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── behavior-service/              # 行为驱动服务
│   │   ├── src/
│   │   └── package.json
│   │
│   └── content-service/               # 内容生成服务
│       ├── src/
│       └── package.json
│
├── data/                              # 数据层
│   ├── knowledge-graph/               # 知识图谱数据
│   │   ├── curriculum/                # 课程标准
│   │   │   ├── elementary/            # 小学
│   │   │   ├── middle/                # 初中
│   │   │   └── high/                  # 高中
│   │   └── neo4j/                     # Neo4j 配置
│   │
│   └── content-cache/                 # 内容缓存
│       └── offline/                   # 离线缓存
│
├── tests/                             # 测试
│   ├── unit/                          # 单元测试
│   ├── integration/                   # 集成测试
│   └── e2e/                           # E2E 测试
│       ├── student-flow/              # 学生学习流程
│       ├── parent-dashboard/          # 家长仪表盘
│       └── cross-stage/               # 跨阶段测试
│
└── docs/                              # 文档
    ├── api/                           # API 文档
    ├── architecture/                  # 架构文档
    └── user-guides/                   # 用户指南
```

---

## 🛠️ 技术栈

### 前端
| 组件 | 技术 | 说明 |
|------|------|------|
| **学生端 App** | React Native | iOS + Android 跨平台 |
| **家长端 App** | React Native | iOS + Android 跨平台 |
| **Web 管理台** | React 18 + TypeScript | 响应式设计 |
| **设计系统** | Styled Components | Apple 风格组件库 |

### 后端
| 组件 | 技术 | 说明 |
|------|------|------|
| **API 网关** | Kong/Nginx | 路由 + 限流 + 认证 |
| **微服务** | Node.js + TypeScript | ANFSF Skill 架构 |
| **知识图谱** | Neo4j | 图数据库 |
| **缓存** | Redis | 会话 + 内容缓存 |

### AI/ML
| 组件 | 技术 | 说明 |
|------|------|------|
| **内容生成** | Claude 4.6 | 个性化教学内容 |
| **TTS** | Azure TTS / ElevenLabs | 逐词高亮同步 |
| **语音识别** | Whisper | 随时打断提问 |

### 基础设施
| 组件 | 技术 | 说明 |
|------|------|------|
| **容器化** | Docker + Kubernetes | 容器编排 |
| **CI/CD** | GitHub Actions | 自动化部署 |
| **监控** | Prometheus + Grafana | 性能监控 |
| **日志** | ELK Stack | 日志聚合 |

---

## 📦 依赖管理

### 核心依赖
```json
{
  "dependencies": {
    "@sparkpath/learner-model": "workspace:*",
    "@sparkpath/learning-accelerator": "workspace:*",
    "@sparkpath/behavior-driver": "workspace:*",
    "@sparkpath/experience-generator": "workspace:*",
    "@sparkpath/knowledge-graph": "workspace:*",
    "@sparkpath/design-system": "workspace:*",
    
    "react": "^18.2.0",
    "react-native": "^0.73.0",
    "neo4j-driver": "^5.15.0",
    
    "anfsf-v4": "workspace:*",
    "openclaw-core": "^2026.4.1"
  }
}
```

### 开发依赖
```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.4.0",
    "detox": "^20.14.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  }
}
```

---

## 🚀 开发工作流

### 1. 环境设置
```bash
# 克隆项目
git clone <repo>
cd sparkpath

# 安装依赖
npm install

# 设置环境变量
cp .env.example .env
# 编辑 .env 配置 API 密钥等

# 启动开发服务器
npm run dev
```

### 2. 本地开发
```bash
# 运行单元测试
npm test

# 运行 E2E 测试
npm run test:e2e

# 构建开发版本
npm run build:dev

# 代码检查
npm run lint
```

### 3. 提交流程
```bash
# 创建功能分支
git checkout -b feature/xxx

# 提交代码
git add .
git commit -m "feat: 实现 xxx 功能"

# 推送并创建 PR
git push origin feature/xxx
# GitHub 创建 Pull Request
```

---

## 📋 开发里程碑

### 阶段 1: MVP 核心闭环 (8-10 周)

| 周次 | 任务 | 交付物 |
|------|------|-------|
| **W1-2** | 项目初始化 + 设计系统 | 设计系统 v1.0 |
| **W3-4** | Learner Model Engine | 知识图谱 + 行为状态 |
| **W5-6** | 学习加速引擎 | 漏洞定位 + 路径规划 |
| **W7-8** | 行为驱动引擎 | 退出风险检测 + 介入 |
| **W9-10** | Experience Generator + 整合 | MVP 可演示版本 |

### 阶段 2: 功能完善 (4-6 周)

| 周次 | 任务 | 交付物 |
|------|------|-------|
| **W11-12** | 家长端仪表盘 | 家长 App v1.0 |
| **W13-14** | 多科目扩展 | 数/语/英全支持 |
| **W15-16** | 离线模式 + 性能优化 | 离线学习支持 |

### 阶段 3: 高级功能 (待定)

| 任务 | 说明 |
|------|------|
| 全生命周期报告 | 小学→初中→高中完整报告 |
| 社区与挑战系统 | 匿名竞赛功能 |
| 高级行为分析 | 专注度/挫败信号深度分析 |

---

## 🔐 安全与合规

### 数据安全
- 所有用户数据本地加密存储 (AES-256)
- 传输层加密 (TLS 1.3)
- 家长一键导出/删除数据

### 隐私合规
- 符合《儿童个人信息网络保护规定》
- 符合教育部数据规范
- 无第三方数据共享

### 内容安全
- 官方知识图谱验证 (准确率≥99%)
- AI 生成内容人工抽检
- 敏感内容过滤

---

## 📊 质量保障

### 测试覆盖率要求
| 模块 | 覆盖率要求 |
|------|-----------|
| **核心引擎** | ≥90% |
| **UI 组件** | ≥80% |
| **API 服务** | ≥85% |
| **整体** | ≥85% |

### 性能指标
| 指标 | 目标 | 测量方法 |
|------|------|---------|
| **App 启动时间** | ≤2 秒 | 冷启动测量 |
| **页面响应** | ≤1.5 秒 | 交互延迟 |
| **TTS 同步** | ≤200ms | 音频 - 高亮延迟 |
| **动画帧率** | 60fps | 性能监控 |

---

**文档状态**: ✅ 项目结构定义完成  
**下一步**: 详细设计 → 开发实施
