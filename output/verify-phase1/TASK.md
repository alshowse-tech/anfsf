// [generated]
# Task Manager - Implementation Tasks

## P0 Features (Must Implement)

### 1. 用户注册与登录（邮箱+密码）
- [ ] Implement user registration API (src/app/api/auth/register/route.ts)
- [ ] Implement login authentication (src/lib/auth.ts)
- [ ] Wire up login form (src/components/auth/login-form.tsx)
- [ ] Wire up register form (src/components/auth/register-form.tsx)

### 2. 任务列表页支持按状态筛选
- [ ] Implement task listing API with status filter (src/app/api/tasks/route.ts)
- [ ] Implement TaskFilter component (src/components/tasks/task-filter.tsx)
- [ ] Connect filter to task list display

### 3. 创建/编辑任务（标题、描述、优先级、截止日期）
- [ ] Implement task creation API (src/app/api/tasks/route.ts POST)
- [ ] Implement task update API (src/app/api/tasks/[taskId]/route.ts PUT)
- [ ] Build complete TaskForm (src/components/tasks/task-form.tsx)
- [ ] Add create/edit dialog

### 4. 删除任务（软删除，移到回收站）
- [ ] Implement soft delete API (src/app/api/tasks/[taskId]/route.ts DELETE)
- [ ] Add delete confirmation dialog
- [ ] Show deleted tasks in trash view

### 5. 任务统计看板
- [ ] Implement stats API (src/app/api/tasks/stats/route.ts)
- [ ] Build TaskStats component (src/components/tasks/task-stats.tsx)
- [ ] Add charts or visual indicators

### 6. 移动端响应式适配
- [ ] Ensure all pages are responsive (Tailwind responsive classes)
- [ ] Test on mobile viewports
- [ ] Add mobile navigation

## Setup Instructions
1. Run `npm install`
2. Set up PostgreSQL database
3. Run `npx prisma migrate dev --name init`
4. Run `npm run dev`
5. Open http://localhost:3000
