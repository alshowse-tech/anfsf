# 捷阅证券信息助手 - API 文档

## 概述

本文档描述捷阅证券信息助手的 RESTful API 接口。

**基础 URL**: `https://api.jieyue.com`  
**认证方式**: JWT Bearer Token

---

## 认证

### 获取 Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "13800138000",
  "password": "your_password"
}
```

**响应**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 86400
}
```

### 使用 Token

在所有需要认证的接口中，添加 Header:
```
Authorization: Bearer <your_token>
```

---

## 用户接口

### 获取用户信息

```http
GET /api/users/me
Authorization: Bearer <token>
```

**响应**:
```json
{
  "id": 1,
  "phone": "13800138000",
  "nickname": "用户昵称",
  "email": "user@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### 更新用户信息

```http
PUT /api/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "nickname": "新昵称",
  "email": "new@example.com"
}
```

---

## 钱包接口

### 获取余额

```http
GET /api/wallets/me
Authorization: Bearer <token>
```

**响应**:
```json
{
  "user_id": 1,
  "balance": 100.00,
  "updated_at": "2024-01-01T12:00:00Z"
}
```

### 创建充值订单

```http
POST /api/payment/create-order
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100.00,
  "method": "wechat",
  "description": "账户充值"
}
```

**响应**:
```json
{
  "success": true,
  "order_id": "ORDER_20240101120000_abc123",
  "pay_url": "https://..."
}
```

### 查询支付订单

```http
GET /api/payment/query-order/{order_id}
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "order_id": "ORDER_...",
  "status": "SUCCESS",
  "amount": 100.00,
  "paid_at": "2024-01-01T12:05:00Z"
}
```

### 申请退款

```http
POST /api/payment/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "order_id": "ORDER_...",
  "amount": 50.00,
  "reason": "用户申请退款"
}
```

---

## 任务接口

### 创建任务

```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://www.douyin.com/video/123"
}
```

**响应**:
```json
{
  "id": 1,
  "url": "https://www.douyin.com/video/123",
  "status": "INIT",
  "created_at": "2024-01-01T12:00:00Z"
}
```

### 获取任务列表

```http
GET /api/tasks?limit=20&offset=0
Authorization: Bearer <token>
```

**响应**:
```json
{
  "items": [
    {
      "id": 1,
      "url": "https://...",
      "status": "SUCCESS",
      "content_type": "VIDEO",
      "duration": 300,
      "cost": 2.50,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 100
}
```

### 获取任务详情

```http
GET /api/tasks/{task_id}
Authorization: Bearer <token>
```

**响应**:
```json
{
  "id": 1,
  "url": "https://...",
  "status": "SUCCESS",
  "content_type": "VIDEO",
  "duration": 300,
  "cost": 2.50,
  "content": {
    "title": "视频标题",
    "author": "作者",
    "transcript": "语音识别文本..."
  },
  "summary": {
    "key_points": ["关键点 1", "关键点 2"],
    "abstract": "摘要内容...",
    "risk_tags": ["投资建议"]
  },
  "created_at": "2024-01-01T12:00:00Z"
}
```

---

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证/Token 过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 限流

- 普通用户：100 次/分钟
- VIP 用户：500 次/分钟

超出限制返回 429 状态码。

---

**最后更新**: 2026-04-01  
**版本**: v1.0.0
