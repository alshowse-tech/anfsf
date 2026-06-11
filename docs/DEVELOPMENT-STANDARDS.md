# ANFSF 开发规范与约定

> **版本**: 1.0 | **适用范围**: Phase 1 起 | **强制执行**: 代码审查通过条件

---

## 一、代码组织

### 1.1 文件命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 模块文件 | `kebab-case.ts` | `pipeline-state-machine.ts` |
| 测试文件 | `*.test.ts`，与源文件同目录 | `__tests__/pipeline-state-machine.test.ts` |
| React 组件 | `PascalCase.tsx` | `RequirementReview.tsx` |
| 类型定义 | 就近放在模块文件中，跨模块使用的放 `types.ts` | |
| 文档 | `UPPERCASE.md` | `TECHNICAL-DESIGN.md` |

### 1.2 目录约定

- 新增模块放在对应 `src/<category>/` 下
- 每个新增模块必须有对应的 `__tests__/` 目录
- 不修改 `src/skills/` 和 `src/core/` 的内部实现——只通过接口调用

### 1.3 导入顺序

```typescript
// 1. Node.js 标准库
import * as path from 'path';

// 2. 第三方依赖
import { describe, it, expect } from '@jest/globals';

// 3. 跨模块导入（src/ 内部）
import { PipelineStateMachine } from '../pipeline/pipeline-state-machine';

// 4. 类型导入（单独分组）
import type { CheckpointData } from '../pipeline/checkpoint';
```

---

## 二、TypeScript 规范

### 2.1 严格模式

所有新增文件使用 strict mode（项目已默认配置）。

### 2.2 类型定义

- 优先使用 `interface`，需要联合类型时用 `type`
- 导出给外部使用的类型必须 `export`
- 不使用 `any`，除非：
  - 对接现有遗留代码（如现有 test 文件中的 `as any`）
  - JSON 反序列化后的中间状态
  - 使用 `any` 时必须加注释说明原因

### 2.3 错误处理

```typescript
// ✅ 正确：自定义错误类
class PipelineError extends Error {
  constructor(
    message: string,
    public code: string,
    public state: ProjectState
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

// ❌ 错误：直接抛字符串
throw 'something went wrong';

// ✅ 正确：异步函数标记错误可能
async function generateCode(): Promise<AgentLoopResult> {
  // ...
}
```

---

## 三、测试规范

### 3.1 覆盖要求

- 每个新增模块必须有单元测试
- 状态机：覆盖所有合法和非法状态转换
- API 路由：覆盖成功、参数错误、权限错误、超时
- Agent 循环：mock LLM 返回，验证修复循环逻辑

### 3.2 测试命名

```typescript
describe('PipelineStateMachine', () => {
  describe('transition()', () => {
    it('should allow valid transition from stage1_parsing to stage1_locked', () => {});
    it('should reject invalid transition from stage1_parsing to stage5_done', () => {});
    it('should trigger onLeave callback on successful transition', () => {});
    it('should enter failed state when onEnter callback throws', () => {});
  });
});
```

### 3.3 Mock 原则

- Mock 外部依赖（LLM API、Gitea API），不 mock 内部模块
- Mock 数据使用工厂函数，不硬编码
- 每个测试用例独立，不共享状态

---

## 四、Git 工作流

### 4.1 分支策略

```
master          —— 稳定分支，只通过 PR 合并
  ├── develop   —— 开发主线
  │   ├── feat/T-001-pipeline-state-machine
  │   ├── feat/T-002-agent-loop
  │   └── ...
  └── hotfix/   —— 紧急修复
```

### 4.2 Commit 格式

```
<type>(<scope>): <description>

类型：
  feat     - 新功能
  fix      - Bug 修复
  refactor - 重构（不改功能）
  test     - 测试
  docs     - 文档
  chore    - 构建/工具

示例：
  feat(pipeline): implement five-stage state machine (T-001)
  fix(agent-loop): handle LLM timeout gracefully
  test(checkpoint): add recovery scenario tests
  docs(api): add release endpoint spec
```

### 4.3 提交前检查

- `npm run typecheck` 通过
- `npm run lint` 通过
- 相关模块的测试通过

---

## 五、错误处理模式

### 5.1 通用模式

```typescript
// 所有异步操作使用 try/catch + 结构化错误
async function stageTransition(stateMachine: IPipelineStateMachine): Promise<void> {
  try {
    await stateMachine.transition('stage1_generating');
  } catch (error) {
    if (error instanceof PipelineError) {
      logger.error('Transition failed', { 
        from: stateMachine.getState(), 
        to: 'stage1_generating', 
        code: error.code 
      });
    }
    throw error; // 让上层决定如何处理
  }
}
```

### 5.2 LLM 调用

```typescript
// 所有 LLM 调用设置超时 + 重试
const result = await llm.generate(prompt, {
  timeout: 60000,       // 60s
  retries: 2,           // 最多重试 2 次
  retryDelay: 1000,     // 重试间隔
});
```

### 5.3 状态不变量

```typescript
// 状态转换前后验证不变量
transition(to: ProjectState): void {
  const from = this.state;
  
  // 前置条件
  if (!this.canTransition(to)) {
    throw new PipelineError(
      `Invalid transition: ${from} → ${to}`,
      'INVALID_STATE',
      from
    );
  }
  
  // 执行转换
  this.state = to;
  
  // 后置条件
  assert(this.state === to, 'State not updated');
}
```

---

## 六、日志规范

### 6.1 日志级别

| 级别 | 使用场景 |
|------|---------|
| `error` | 需要人工介入的问题（LLM 不可用、数据库损坏） |
| `warn` | 可自动恢复的问题（LLM 超时重试、fallback 触发） |
| `info` | 状态变更、阶段完成、关键决策 |
| `debug` | 开发调试信息（生产环境关闭） |

### 6.2 日志格式

```typescript
// ✅ 结构化日志
logger.info('Pipeline stage completed', {
  projectId: 'uuid',
  stage: 1,
  duration: 1234,
  tokensUsed: 50000,
});

// ❌ 字符串拼接
console.log(`Stage ${stage} done in ${duration}ms`);
```

---

## 七、新增模块清单检查

Phase 1 新开发者加入时，按此清单检查代码质量：

- [ ] 所有 public 方法有 JSDoc 注释
- [ ] 所有 `as any` 用法有注释说明原因
- [ ] 异步方法有超时处理
- [ ] 外部 API 调用有错误处理
- [ ] 测试覆盖了正常路径和主要错误路径
- [ ] 新增数据库表有对应的 migration
- [ ] API 端点有对应的 API spec 更新
- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 通过
- [ ] `npm test` 通过（或已知失败有记录在案）

---

## 八、文档更新规范

代码变更时同步更新对应文档：

| 变更类型 | 需更新文档 |
|----------|-----------|
| 新增/修改 API 端点 | `API-SPEC.md` |
| 新增/修改数据库表 | `DATABASE-SCHEMA.md` |
| 架构变更 | `TECHNICAL-DESIGN.md` |
| 新增模块 | `IMPLEMENTATION-PLAN.md` 中标记完成 |
| 变更设计决策 | `product-discussion-2026-05-28.md` 追加记录 |

---

> **最后更新**: 2026-05-31。本文档随项目演进持续更新。
