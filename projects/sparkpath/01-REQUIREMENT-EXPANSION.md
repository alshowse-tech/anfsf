# SparkPath 需求展开文档

**生成日期**: 2026-04-16  
**使用工具**: ANFSF V2.0 Requirement Expander  
**设计风格**: Apple 风格

---

## 📦 产品规格

### 产品名称
**SparkPath (贯穿星火)** - AI 个人学习伙伴

### 产品描述
专为 9-18 岁学生打造的贯穿式 AI 学习伙伴，通过"学习加速引擎 + 行为驱动引擎"双引擎闭环，实现短期成绩提升与长期自主学习习惯养成。

### 目标用户
- **主要用户**: 9-18 岁在校学生 (小学 9-12 岁、初中 13-15 岁、高中 16-18 岁)
- **付费决策者**: 家长
- **使用场景**: 课后辅导、自主学习、考前复习、知识巩固

### 核心价值
1. **短期价值**: 知识掌握率提升≥30%
2. **长期价值**: 自主学习习惯养成 (单次学习≥25 分钟，中断率≤5%)

---

## 🎯 功能清单 (P0/P1/P2 优先级)

### P0 - 核心功能 (MVP 必需)

| ID | 类别 | 功能描述 | 阶段适配 |
|----|------|---------|---------|
| **feat-001** | functional | 用户注册与登录 (家长/学生双账户) | 全阶段 |
| **feat-002** | functional | 学生档案创建 (年龄、年级、科目) | 全阶段 |
| **feat-003** | functional | Learner Model 初始化 (知识图谱 + 行为状态) | 全阶段 |
| **feat-004** | functional | 学习加速引擎核心 (知识漏洞定位 + 路径规划) | 全阶段 |
| **feat-005** | functional | 行为驱动引擎核心 (退出风险检测) | 全阶段 |
| **feat-006** | integration | 国家课程知识图谱接入 (教育部课标) | 全阶段 |
| **feat-007** | integration | AI 动态内容生成 (讲解/练习/方法) | 全阶段 |
| **feat-008** | integration | 官方验证闭环 (准确率≥99%) | 全阶段 |
| **feat-009** | ui | 三阶段界面风格切换 (小学/初中/高中) | 全阶段 |
| **feat-010** | ui | TTS 语音输出 + 逐词高亮同步 | 全阶段 |
| **feat-011** | ui | 语音输入支持 (随时打断提问) | 全阶段 |
| **feat-012** | security | 数据本地加密存储 | 全阶段 |
| **feat-013** | security | 家长管控权限 (时长/休息/内容) | 全阶段 |
| **feat-014** | performance | 响应时间≤1.5 秒优化 | 全阶段 |
| **feat-015** | performance | TTS 同步延迟≤200ms 优化 | 全阶段 |

### P1 - 重要功能 (阶段 2)

| ID | 类别 | 功能描述 | 阶段适配 |
|----|------|---------|---------|
| **feat-016** | functional | 家长端仪表盘 (学习路径/掌握报告) | 全阶段 |
| **feat-017** | functional | 多科目扩展中心 (一键开通新科目) | 全阶段 |
| **feat-018** | functional | 跨阶段知识迁移 (升学自动映射) | 全阶段 |
| **feat-019** | functional | 离线模式 (核心知识点本地缓存) | 全阶段 |
| **feat-020** | integration | 社区与挑战系统 (匿名竞赛) | 初中/高中 |
| **feat-021** | integration | 家长周报自动生成 | 全阶段 |
| **feat-022** | ui | 小学阶段：明亮卡通界面 | 小学 |
| **feat-023** | ui | 初中阶段：简洁现代界面 | 初中 |
| **feat-024** | ui | 高中阶段：深色专业界面 | 高中 |
| **feat-025** | ui | 游戏化元素 (小学：徽章/成就) | 小学 |
| **feat-026** | ui | 情景对话界面 (初中：竞争元素) | 初中 |
| **feat-027** | ui | 目标可视化 (高中：长期目标追踪) | 高中 |
| **feat-028** | security | 家长一键导出/删除数据 | 全阶段 |
| **feat-029** | performance | 多设备无缝切换同步 | 全阶段 |

### P2 - 次要功能 (阶段 3)

| ID | 类别 | 功能描述 | 阶段适配 |
|----|------|---------|---------|
| **feat-030** | functional | 全生命周期报告 (小学→初中→高中) | 全阶段 |
| **feat-031** | functional | 高级行为分析 (专注度/挫败信号) | 全阶段 |
| **feat-032** | integration | 教育部数据规范合规认证 | 全阶段 |
| **feat-033** | integration | 教材每日自动同步 | 全阶段 |
| **feat-034** | ui | 动画过渡效果 (Apple 风格流畅动画) | 全阶段 |
| **feat-035** | ui | 深色模式支持 | 初中/高中 |
| **feat-036** | performance | 内容准确率 99.9% 达成 | 全阶段 |

---

## 🏗️ 技术设计

### 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        SparkPath 系统架构                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  学生端 App  │    │  家长端 App  │    │   Web 管理台  │        │
│  │  (iOS/Android)│    │  (iOS/Android)│    │   (React)    │        │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│         │                  │                  │                │
│         └──────────────────┼──────────────────┘                │
│                            │                                   │
│                   ┌────────▼────────┐                          │
│                   │   API Gateway   │                          │
│                   │   (Kong/Nginx)  │                          │
│                   └────────┬────────┘                          │
│                            │                                   │
│    ┌───────────────────────┼───────────────────────┐          │
│    │                       │                       │          │
│    ▼                       ▼                       ▼          │
│  ┌───────────┐      ┌───────────┐      ┌───────────┐        │
│  │学习加速   │      │行为驱动   │      │Experience │        │
│  │引擎服务   │      │引擎服务   │      │Generator  │        │
│  └─────┬─────┘      └─────┬─────┘      └─────┬─────┘        │
│        │                  │                  │                │
│        └──────────────────┼──────────────────┘                │
│                           │                                   │
│                  ┌────────▼────────┐                          │
│                  │  Learner Model  │                          │
│                  │     Engine      │                          │
│                  └────────┬────────┘                          │
│                           │                                   │
│    ┌──────────────────────┼──────────────────────┐           │
│    │                      │                      │           │
│    ▼                      ▼                      ▼           │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │知识图谱  │      │内容生成  │      │验证服务  │         │
│  │(Neo4j)   │      │(Claude)  │      │(Playwright)│        │
│  └──────────┘      └──────────┘      └──────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 核心模块设计

#### 1. Learner Model Engine
```typescript
interface LearnerModel {
  studentId: string;
  stage: 'elementary' | 'middle' | 'high';
  knowledgeGraph: KnowledgeNode[];
  behaviorState: {
    focusDuration: number;      // 专注时长
    activeQuestions: number;    // 主动提问数
    frustrationSignals: number; // 挫败信号
    engagementScore: number;    // 参与度评分
  };
  stageWeights: {
    fun: number;        // 趣味性 (小学 60%)
    mastery: number;    // 掌握度 (小学 40%)
    logic: number;      // 逻辑性 (初中 50%)
    autonomy: number;   // 自主性 (初中 50%)
    efficiency: number; // 效率 (高中 70%)
    stressMgmt: number; // 压力管理 (高中 30%)
  };
}
```

#### 2. 学习加速引擎
```typescript
interface LearningAccelerator {
  // 知识漏洞定位
  identifyGaps(model: LearnerModel): KnowledgeGap[];
  
  // 最短路径规划
  planOptimalPath(gaps: KnowledgeGap[]): LearningPath;
  
  // 方法提炼教学
  extractMethod(topic: string): MethodSteps;
  
  // 动态难度自适应
  adjustDifficulty(currentLevel: number, performance: number): number;
  
  // 输出下一最佳学习动作
  nextBestAction(model: LearnerModel): LearningAction;
}
```

#### 3. 行为驱动引擎
```typescript
interface BehaviorDriver {
  // 退出风险检测
  detectExitRisk(model: LearnerModel): ExitRiskLevel;
  
  // 介入策略库
  interventionStrategies: {
    elementary: GameTask[];      // 游戏化小任务
    middle: ScenarioDialog[];    // 情景对话
    high: GoalVisualization[];   // 目标可视化
  };
  
  // 介入决策 (仅在必要时接管)
  shouldIntervene(risk: ExitRiskLevel): boolean;
  
  // 执行介入策略
  executeIntervention(strategy: Intervention): void;
}
```

#### 4. Experience Generator
```typescript
interface ExperienceGenerator {
  // 实时生成教学形式
  generateContent(topic: string, stage: Stage): TeachingContent;
  
  // TTS 语音 + 逐词高亮
  generateTTSWithHighlight(text: string): TTSStream;
  
  // 三阶段界面风格
  getStageStyle(stage: Stage): UIStyle;
  
  // 实时调整 (基于打断提问)
  adjustOnFly(userInput: string): TeachingContent;
}
```

### 数据模型

#### 知识图谱节点
```typescript
interface KnowledgeNode {
  id: string;
  name: string;
  subject: Subject;
  stage: Stage[];
  coreDefinition: string;
  methodSteps: Step[];
  typicalExamples: Example[];
  commonMistakes: Mistake[];
  crossSubjectLinks: string[];
  prerequisites: string[];  // 前置知识点
  dependents: string[];     // 后续知识点
  officialSource: string;   // 官方来源
  lastUpdated: Date;
}
```

#### 教学内容结构
```typescript
interface TeachingContent {
  topic: string;
  stage: Stage;
  methodSteps: Step[];
  lifeApplication: string;      // 1 个生活应用
  variantPractice: Exercise;    // 1 个变式练习
  stagePackaging: {
    elementary: ComicStyle;    // 小学漫画版
    middle: LogicStyle;        // 初中逻辑版
    high: StrategyStyle;       // 高中策略版
  };
  ttsAudio: string;
  highlights: Highlight[];
  accuracyVerified: boolean;
}
```

---

## 🎨 Apple 风格设计指南

### 设计原则
1. **简洁**: 少即是多，每屏只展示必要信息
2. **优雅**: 流畅动画 (60fps)，细腻过渡 (spring damping)
3. **无 AI 味**: 自然交互，不刻意强调技术
4. **一致性**: 三阶段共享设计语言，差异化表达

### 色彩系统

| 阶段 | 主色 | 辅色 | 背景 | 文字 |
|------|------|------|------|------|
| **小学** | #FF6B6B (珊瑚红) | #4ECDC4 (青绿) | #FFF9F0 (暖白) | #2D3436 |
| **初中** | #0984E3 (湛蓝) | #00CEC9 (青蓝) | #F8F9FA (浅灰) | #2D3436 |
| **高中** | #6C5CE7 (深紫) | #A29BFE (淡紫) | #1A1A2E (深蓝) | #FFFFFF |

### 字体系统
- **英文**: SF Pro Display (Apple 系统字体)
- **中文**: 苹方 (PingFang SC)
- **字号**: 17pt (正文), 22pt (标题), 34pt (大标题)

### 组件规范

#### 按钮
```
小学：圆角 20px, 大尺寸 (min-height: 56px), 活泼阴影
初中：圆角 12px, 中等尺寸 (min-height: 44px), 轻微阴影
高中：圆角 8px, 紧凑尺寸 (min-height: 40px), 无阴影
```

#### 卡片
```
所有阶段：圆角 16px, 白色背景
小学：彩色边框 (3px), 活泼图标
初中：灰色边框 (1px), 简洁图标
高中：深色边框 (1px), 专业图标
```

#### 动画
```
页面过渡：slide + fade, 300ms
按钮点击：scale 0.95, 100ms
内容加载：skeleton + fade-in, 200ms
TTS 高亮：smooth scroll, 跟随语音
```

---

## 📊 成功指标

| 指标 | 目标值 | 测量方法 |
|------|-------|---------|
| **知识掌握率提升** | ≥30% | 前后测对比 |
| **单次学习时长** | ≥25 分钟 | 会话追踪 |
| **中断率** | ≤5% | 异常退出监控 |
| **家长 NPS** | ≥90% | 问卷调查 |
| **内容准确率** | 99.9% | 验证服务日志 |
| **响应时间** | ≤1.5 秒 | 性能监控 |
| **TTS 同步延迟** | ≤200ms | 客户端测量 |

---

**文档状态**: ✅ 需求展开完成  
**下一步**: 详细架构设计 → UI/UX 原型 → 开发实施
