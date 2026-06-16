# 固定资产投资项目管理系统 - 二期 (Fixed Asset v2)

## 功能模块

### P0 - 核心功能
- **批复数据同步**: 从总公司系统导入已批复项目信息
- **项目过程管控**: 跟踪项目进度、资金使用、合同管理

### P1 - 扩展功能
- **统计报表**: 生成月度/季度/年度投资报表
- **预警提醒**: 超期/超预算自动预警

## 技术栈
- TypeScript + Express
- TypeORM + PostgreSQL
- 模块化设计，易于扩展

## 快速开始

\`\`\`bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建生产版本
npm run build

# 运行生产版本
npm start
\`\`\`

## API 端点

### 批复数据
- GET /api/approvals - 获取批复列表
- POST /api/approvals/sync - 从总公司同步数据
- GET /api/approvals/:id - 获取批复详情

### 项目管理
- GET /api/projects - 获取项目列表
- POST /api/projects - 创建项目
- GET /api/projects/:id - 获取项目详情
- PUT /api/projects/:id/progress - 更新项目进度
- GET /api/projects/:id/contracts - 获取项目合同

### 报表
- GET /api/reports/monthly - 月度报表
- GET /api/reports/quarterly - 季度报表
- GET /api/reports/annual - 年度报表
- POST /api/reports/generate - 生成自定义报表

### 预警
- GET /api/alerts - 获取预警列表
- PUT /api/alerts/:id/acknowledge - 确认预警
- PUT /api/alerts/:id/resolve - 解决预警