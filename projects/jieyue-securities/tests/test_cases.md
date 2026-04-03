# 捷阅证券信息助手 - 测试用例

**版本**: 1.0.0  
**创建时间**: 2026-03-31  
**测试类型**: 全链路测试

---

## 一、API 接口测试

### 1.1 用户 API

#### 创建用户
```bash
# 测试用例：创建新用户
curl -X POST http://localhost:8000/api/user/create \
  -H "Content-Type: application/json" \
  -d '{"phone": "13800138000"}'

# 预期结果：
# {
#   "id": 1,
#   "phone": "13800138000",
#   "wx_openid": null,
#   "created_at": "2026-03-31T17:00:00",
#   "status": 1
# }
```

#### 查询用户
```bash
# 测试用例：查询用户信息
curl http://localhost:8000/api/user/1

# 预期结果：用户信息 JSON
```

#### 查询钱包
```bash
# 测试用例：查询钱包余额
curl http://localhost:8000/api/user/1/wallet

# 预期结果：
# {
#   "user_id": 1,
#   "balance": 0,
#   "updated_at": "..."
# }
```

### 1.2 钱包 API

#### 充值
```bash
# 测试用例：充值 100 元
curl -X POST "http://localhost:8000/api/wallet/recharge?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'

# 预期结果：
# {
#   "id": 1,
#   "user_id": 1,
#   "type": "RECHARGE",
#   "amount": 100,
#   "status": "SUCCESS",
#   "created_at": "..."
# }
```

#### 查询余额
```bash
# 测试用例：查询充值后余额
curl http://localhost:8000/api/wallet/1/balance

# 预期结果：
# {
#   "user_id": 1,
#   "balance": 100,
#   "updated_at": "..."
# }
```

### 1.3 任务 API

#### 创建任务
```bash
# 测试用例：创建视频分析任务
curl -X POST "http://localhost:8000/api/task/create?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.douyin.com/video/xxx"}'

# 预期结果：
# {
#   "id": 1,
#   "user_id": 1,
#   "url": "https://...",
#   "status": "INIT",
#   "content_type": null,
#   "duration": null,
#   "cost": 0,
#   "created_at": "..."
# }
```

#### 查询任务
```bash
# 测试用例：查询任务详情
curl http://localhost:8000/api/task/1

# 预期结果：任务详情（包含结果）
```

#### 任务列表
```bash
# 测试用例：获取任务列表
curl "http://localhost:8000/api/task/list?user_id=1"

# 预期结果：任务列表数组
```

---

## 二、幂等性测试

### 2.1 重复提交同一 URL

```bash
# 第一次提交
curl -X POST "http://localhost:8000/api/task/create?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.douyin.com/video/xxx"}'

# 第二次提交（相同 URL）
curl -X POST "http://localhost:8000/api/task/create?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.douyin.com/video/xxx"}'

# 预期结果：返回相同任务 ID
```

---

## 三、计费测试

### 3.1 正常扣费

```bash
# 1. 充值
curl -X POST "http://localhost:8000/api/wallet/recharge?user_id=1" \
  -d '{"amount": 100}'

# 2. 创建任务（等待处理完成）
# 3. 查询余额
curl http://localhost:8000/api/wallet/1/balance

# 预期结果：余额 = 100 - 任务费用
```

### 3.2 余额不足

```bash
# 1. 充值少量金额
curl -X POST "http://localhost:8000/api/wallet/recharge?user_id=1" \
  -d '{"amount": 1}'

# 2. 创建长视频任务（费用>1 元）
# 3. 等待处理

# 预期结果：任务失败，提示余额不足
```

### 3.3 ASR 失败退款

```bash
# 1. 充值
# 2. 创建音频任务
# 3. 模拟 ASR 失败
# 4. 查询余额

# 预期结果：余额 = 原始余额 - 基础费用（ASR 部分退款）
```

---

## 四、风险检测测试

### 4.1 违法内容拦截

```python
# 测试内容包含违法关键词
text = "这是一个诈骗项目，保证收益 100%"

# 调用风险检测
from services.risk_detector import RiskTagService
detector = RiskTagService()
result = detector.analyze(text)

# 预期结果：
# {
#   "should_block": True,
#   "highest_level": "critical" 或 "high",
#   "risk_tags": ["诈骗风险", ...]
# }
```

### 4.2 投资建议提示

```python
# 测试内容包含投资建议
text = "我推荐买入这只股票，预期上涨 20%"

# 调用风险检测
result = detector.analyze(text)

# 预期结果：
# {
#   "should_block": False,
#   "risk_tags": ["可能包含投资建议", "存在主观判断"]
# }
```

---

## 五、前端测试

### 5.1 提交页面

```bash
# 启动前端
cd frontend
npm run dev

# 访问 http://localhost:3000
# 1. 输入有效 URL，点击提交 → 跳转详情页
# 2. 输入无效 URL，点击提交 → 显示错误
# 3. 空 URL 提交 → 按钮禁用
```

### 5.2 任务列表页

```bash
# 访问 http://localhost:3000/tasks
# 1. 检查任务列表显示
# 2. 检查状态标签颜色
# 3. 点击"详情"→ 跳转详情页
# 4. 点击"提交新任务"→ 跳转提交页
```

### 5.3 任务详情页

```bash
# 访问 http://localhost:3000/task/1
# 1. 检查任务信息显示
# 2. 检查状态实时更新（5 秒轮询）
# 3. 检查分析结果展示
# 4. 检查风险标签颜色
```

---

## 六、性能测试

### 6.1 并发测试

```bash
# 使用 ab 或 wrk 进行压力测试
wrk -t12 -c400 -d30s http://localhost:8000/api/task/list?user_id=1

# 目标：>100 QPS
```

### 6.2 队列处理延迟

```python
# 记录任务创建时间和完成时间
created_at = task.created_at
completed_at = task.updated_at
latency = completed_at - created_at

# 目标：P95 < 30s（90 分钟视频）
```

---

## 七、安全测试

### 7.1 SQL 注入

```bash
# 测试 SQL 注入
curl "http://localhost:8000/api/user/1%20OR%201=1"

# 预期结果：422 验证错误或 404
```

### 7.2 XSS 攻击

```bash
# 测试 XSS
curl -X POST "http://localhost:8000/api/task/create?user_id=1" \
  -d '{"url": "<script>alert(1)</script>"}'

# 预期结果：URL 被正确转义存储
```

### 7.3 认证鉴权

```bash
# 测试未授权访问
curl http://localhost:8000/api/task/1

# 预期结果：需要用户认证（生产环境）
```

---

## 八、验收标准

### 功能验收
- [ ] 用户创建成功
- [ ] 钱包充值成功
- [ ] 任务创建成功
- [ ] 幂等性验证通过
- [ ] 计费准确无误
- [ ] 风险检测准确
- [ ] 前端页面正常

### 性能验收
- [ ] API P95 延迟 < 500ms
- [ ] 队列处理延迟 < 30s
- [ ] 并发支持 > 100 QPS
- [ ] 前端加载 < 3s

### 安全验收
- [ ] SQL 注入防护
- [ ] XSS 防护
- [ ] API 认证鉴权
- [ ] 数据加密存储

---

**测试状态**: ⏳ 待执行  
**测试人员**: ANFSF Agent Team  
**测试日期**: 2026-04-01
