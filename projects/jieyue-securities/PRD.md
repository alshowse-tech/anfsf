# 捷阅证券信息助手 - AI-Native PRD

**版本**: 1.0.0  
**创建时间**: 2026-03-31  
**项目类型**: 证券内容智能分析与合规审核平台  
**架构**: AI Native Full-Stack Software Factory V1.0

---

## 一、产品概述

### 1.1 产品定位
面向证券从业者的视频/音频内容合规审核平台，自动解析 URLs，提取内容，生成摘要并识别投资风险提示标签。

### 1.2 核心价值
- ⚡ **效率提升**: 自动解析 + ASR+ 摘要，人工审核时间减少 80%
- 🛡️ **合规保障**: 自动识别"内幕消息"、"稳赚"、"带单"等违规内容
- 💰 **成本可控**: 按分钟计费，成功才扣费

---

## 二、功能需求

### 2.1 核心功能

| 功能 | 描述 | 优先级 |
|------|------|--------|
| URL 解析 | 支持抖音、快手、B 站、视频号等平台 | P0 |
| ASR 语音识别 | 音频/视频内容转文字 | P0 |
| 内容摘要 | 生成关键点 + 摘要 | P0 |
| 风险标签 | 识别投资建议、主观判断等风险 | P0 |
| 钱包充值 | 支持微信/支付宝充值 | P0 |
| 按量计费 | 成功才扣费，ASR 失败退款 | P0 |
| 任务队列 | BullMQ 异步处理 | P0 |
| 幂等设计 | 相同 URL 不重复处理 | P0 |

### 2.2 内容审核规则

#### 2.2.1 拦截规则（违法内容）
- 违法内容
- 明确诈骗（如"保证收益"+ 收钱）

#### 2.2.2 提示标签（前端展示）
```json
{
  "risk_tags": [
    "可能包含投资建议",
    "存在主观判断"
  ]
}
```

#### 2.2.3 复核队列（MVP 可先日志记录）
触发条件：
- "内幕消息"
- "稳赚"
- "带单"

---

## 三、技术架构

### 3.1 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | React 18 + Next.js 15 + Vite |
| 后端 | FastAPI + Python 3.11 |
| 数据库 | MySQL 8.0 + Prisma ORM |
| 队列 | BullMQ + Redis |
| ASR | 火山引擎 / 阿里云（fallback） |
| URL 解析 | TikHub / fallback |
| 部署 | Docker + Kubernetes |

### 3.2 ANFSF V1.0 架构映射

| ASF 层 | 模块 | 说明 |
|--------|------|------|
| L1 | PRD | 本产品需求文档 |
| L2 | Requirement Validator | 需求验证 |
| L3 | Governance Policy | 合规策略 |
| L4 | Knowledge Graph | 需求知识图谱 |
| L5 | IR Generation | 中间代码生成 |
| L6 | Code Compilation | 代码编译 |
| L7 | Efficiency | 性能优化 |
| L8 | Bidirectional Sync | 双向同步 |
| L9 | Stability | 自愈系统 |
| L10 | Frontend | 前端框架 |
| L11 | Testing | 测试体系 |
| L12 | Monitoring | 监控告警 |
| L13 | Collective Intelligence | 集体智能 |

---

## 四、数据库设计

### 4.1 用户表 (users)
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20),
  wx_openid VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TINYINT DEFAULT 1
);
```

### 4.2 钱包表 (wallets)
```sql
CREATE TABLE wallets (
  user_id BIGINT PRIMARY KEY,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at DATETIME
);
```

### 4.3 交易流水表 (transactions)
```sql
CREATE TABLE transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  task_id BIGINT,
  type ENUM('recharge','consume','refund'),
  amount DECIMAL(10,2),
  status ENUM('init','success','failed'),
  created_at DATETIME
);
```

### 4.4 任务表 (tasks) - 核心
```sql
CREATE TABLE tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  url TEXT,
  url_hash VARCHAR(64),
  platform VARCHAR(20),
  
  status ENUM(
    'INIT',
    'PARSING',
    'PARSE_FAILED',
    'ASR_PROCESSING',
    'ASR_FAILED',
    'SUMMARIZING',
    'SUCCESS',
    'FAILED'
  ),

  content_type ENUM('text','audio','video'),
  
  duration INT, -- 秒
  cost DECIMAL(10,2),

  parse_provider VARCHAR(20), -- tikhub / fallback
  asr_provider VARCHAR(20),

  error_msg TEXT,
  
  created_at DATETIME,
  updated_at DATETIME,

  UNIQUE KEY uniq_user_url (user_id, url_hash)
);
```

### 4.5 内容表 (contents)
```sql
CREATE TABLE contents (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  task_id BIGINT,
  raw_text MEDIUMTEXT,
  transcript MEDIUMTEXT,
  title VARCHAR(512),
  author VARCHAR(256),
  created_at DATETIME
);
```

### 4.6 摘要表 (summaries)
```sql
CREATE TABLE summaries (
  task_id BIGINT PRIMARY KEY,
  key_points JSON,
  abstract TEXT,
  risk_tags JSON,
  created_at DATETIME
);
```

### 4.7 定价配置表 (pricing_configs)
```sql
CREATE TABLE pricing_configs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  base_price DECIMAL(10,2),
  per_minute_price DECIMAL(10,2),
  start_time DATETIME,
  end_time DATETIME,
  status TINYINT,
  created_at DATETIME
);
```

---

## 五、API 设计

### 5.1 创建任务
```
POST /api/task/create
Request: { "url": "https://..." }
Response: { "task_id": 123, "status": "INIT" }
```

### 5.2 查询任务详情
```
GET /api/task/{id}
Response: {
  "id": 123,
  "status": "SUCCESS",
  "content_type": "video",
  "duration": 320,
  "cost": 2.5,
  "result": {
    "key_points": ["..."],
    "abstract": "...",
    "risk_tags": ["可能包含投资建议"]
  }
}
```

### 5.3 任务列表
```
GET /api/tasks
Response: {
  "list": [
    { "id": 1, "title": "...", "status": "SUCCESS" }
  ]
}
```

### 5.4 充值
```
POST /api/wallet/recharge
Request: { "amount": 50 }
```

---

## 六、队列与任务执行

### 6.1 队列分解 (BullMQ)
```
queue_parse     → URL 解析
queue_asr       → 语音识别（可选）
queue_summary   → 内容摘要
queue_billing   → 计费扣款
```

### 6.2 流程（带状态）
```
create_task
    ↓
queue_parse
    ↓
queue_asr（可选）
    ↓
queue_summary
    ↓
queue_billing
```

---

## 七、重试与失败策略

### 7.1 解析任务
| 条件 | 策略 |
|------|------|
| TikHub 失败 | 重试 2 次 |
| 仍失败 | 切 fallback |

```js
attempts: 3
backoff: exponential (2s, 5s, 10s)
```

### 7.2 ASR 任务
| 条件 | 策略 |
|------|------|
| 网络失败 | 重试 3 次 |
| 识别失败 | 标记 ASR_FAILED |

### 7.3 摘要任务
| 条件 | 策略 |
|------|------|
| LLM 失败 | 重试 2 次 |
| 仍失败 | fallback 模板摘要 |

---

## 八、幂等设计（必须实现）

### 8.1 核心逻辑
```sql
UNIQUE(user_id, url_hash)
```

### 8.2 服务层逻辑
```python
if exists(task):
    return existing_result
else:
    create_task()
```

---

## 九、计费实现（精确到代码逻辑）

### 9.1 成功才扣费
```sql
UPDATE wallets 
SET balance = balance - cost
WHERE user_id = ? AND balance >= cost;
```

### 9.2 成本计算
```python
cost = base_price

if content_type in ['audio','video']:
    minutes = ceil(duration / 60)
    minutes = min(minutes, 90)
    cost += minutes * per_minute_price
```

### 9.3 ASR 失败退款
```python
refund = minutes * per_minute_price
```

---

## 十、降级策略（工程级）

### 10.1 TikHub 失败
```text
if fail_rate > 30%:
    switch_to_fallback()
```

### 10.2 无 duration
```text
默认 duration = 60 秒
标记：estimated_duration=true
```

### 10.3 超 90 分钟
```text
直接拒绝任务
status = FAILED
error = "超过 90 分钟"
```

### 10.4 ASR 失败
```json
{
  "partial": true,
  "message": "音频解析失败，仅提供文本摘要"
}
```

---

## 十一、可观测性（必须埋点）

### 11.1 日志
```json
{
  "task_id": 123,
  "stage": "ASR",
  "duration_ms": 1200,
  "status": "success"
}
```

### 11.2 指标 (Prometheus)
- task_success_rate
- asr_fail_rate
- avg_latency
- cost_per_task

---

## 十二、研发排期建议

### 12.1 后端（2 人）
| 模块 | 工期 |
|------|------|
| 用户 + 钱包 | 2 天 |
| 任务系统 | 4 天 |
| 队列系统 | 3 天 |
| ASR 接入 | 3 天 |

### 12.2 前端（1 人）
| 模块 | 工期 |
|------|------|
| 提交页 | 2 天 |
| 列表页 | 2 天 |
| 详情页 | 2 天 |

### 12.3 测试（1 人）
| 模块 | 工期 |
|------|------|
| 链路测试 | 2 天 |
| 计费校验 | 1 天 |
| 幂等验证 | 1 天 |

**总计**: 12 人天（约 3 周）

---

## 十三、验收标准

### 13.1 功能验收
- [ ] URL 解析成功率 > 95%
- [ ] ASR 准确率 > 90%
- [ ] 风险标签识别准确率 > 85%
- [ ] 计费准确无误
- [ ] 幂等性验证通过

### 13.2 性能验收
- [ ] P95 延迟 < 30s（90 分钟视频）
- [ ] 并发支持 > 100 QPS
- [ ] 队列积压 < 1000 任务

### 13.3 安全验收
- [ ] 用户数据加密存储
- [ ] API 认证鉴权
- [ ] 防重放攻击
- [ ] 金额操作事务保护

---

## 十四、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| TikHub 不稳定 | 解析失败 | 多 provider fallback |
| ASR 成本高 | 利润低 | 优化时长计算 |
| 并发量大 | 队列积压 | 动态扩容 worker |
| 合规风险 | 法律风险 | 严格拦截规则 |

---

**文档状态**: ✅ 已完成  
**下一步**: 启动 ANFSF V1.0 架构开发流程
