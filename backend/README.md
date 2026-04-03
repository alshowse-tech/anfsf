# 捷阅证券后端 - Jieyue Securities Backend

Layer 8.5 治理控制面集成的 FastAPI 后端服务

## 📁 项目结构

```
backend/
├── src/
│   ├── main.py              # 应用入口
│   ├── api/                 # API 路由
│   │   ├── health.py        # 健康检查
│   │   ├── users.py         # 用户认证
│   │   ├── wallets.py       # 钱包管理
│   │   ├── tasks.py         # 任务管理
│   │   └── transcription.py # 转写服务
│   ├── services/            # 服务层
│   │   ├── user_service.py
│   │   ├── wallet_service.py
│   │   ├── task_service.py
│   │   └── transcription_service.py
│   ├── models/              # 数据模型
│   │   ├── user.py
│   │   ├── wallet.py
│   │   ├── transaction.py
│   │   ├── task.py
│   │   ├── transcription.py
│   │   ├── contract.py
│   │   └── ownership_record.py
│   ├── core/                # 核心模块
│   │   ├── security.py      # 安全认证
│   │   └── layer8.py        # Layer 8.5 集成
│   └── config/              # 配置
│       ├── settings.py
│       ├── database.py
│       └── queue.py
├── alembic/                 # 数据库迁移
├── .env.example             # 环境变量模板
├── requirements.txt         # Python 依赖
├── start.sh                 # 本地启动脚本
└── start-prod.sh            # 生产启动脚本
```

## 🚀 快速开始

### 1. 环境准备

```bash
# Python 3.10+
python3 --version

# PostgreSQL
createdb jieyue_db

# Redis
redis-server --version
```

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，填入你的配置
```

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 启动服务

```bash
# 本地开发
./start.sh

# 生产环境
./start-prod.sh
```

## 🌐 本地访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| **API 文档** | http://localhost:8000/docs | Swagger UI |
| **API 文档** | http://localhost:8000/redoc | ReDoc |
| **OpenAPI** | http://localhost:8000/openapi.json | OpenAPI Schema |
| **健康检查** | http://localhost:8000/health | 基础健康检查 |
| **就绪检查** | http://localhost:8000/health/ready | Layer 8.5 Readiness Gate |
| **存活检查** | http://localhost:8000/health/live | 存活探针 |
| **用户 API** | http://localhost:8000/users | 用户管理 |
| **钱包 API** | http://localhost:8000/wallets | 钱包管理 |
| **任务 API** | http://localhost:8000/tasks | 任务管理 |
| **转写 API** | http://localhost:8000/transcription | 转写服务 |

## 📡 API 端点

### 用户认证
- `POST /users/register` - 注册用户
- `POST /users/login` - 登录获取 Token
- `GET /users/me` - 获取当前用户信息
- `PUT /users/me` - 更新用户信息

### 钱包管理
- `GET /wallets/balance` - 查询余额
- `GET /wallets` - 获取钱包信息
- `POST /wallets/recharge` - 充值
- `POST /wallets/consume` - 消费
- `GET /wallets/transactions` - 交易记录

### 任务管理
- `POST /tasks` - 创建任务
- `GET /tasks` - 获取任务列表
- `GET /tasks/{id}` - 获取任务详情
- `PUT /tasks/{id}` - 更新任务
- `PATCH /tasks/{id}/status` - 更新任务状态
- `POST /tasks/{id}/cancel` - 取消任务
- `DELETE /tasks/{id}` - 删除任务

### 转写服务
- `POST /transcription` - 创建转写任务
- `GET /transcription` - 获取转写列表
- `GET /transcription/{id}` - 获取转写详情
- `POST /transcription/{id}/process` - 处理转写
- `POST /transcription/{id}/cancel` - 取消转写

### 健康检查
- `GET /health` - 基础健康检查
- `GET /health/ready` - 就绪检查 (Layer 8.5)
- `GET /health/live` - 存活检查

## 🔐 Layer 8.5 集成

### Ownership Lattice (所有权晶格)
- 所有资源创建时自动生成所有权记录
- 支持所有权验证和转移
- 完整的 provenance 追踪

### Contract Pack (契约包)
- 智能契约定义操作规则
- 契约验证集成到关键操作
- 支持契约有效期和约束

### MCP Bus (消息总线)
- 事件驱动架构
- 实时事件发布/订阅
- 服务间解耦通信

### Readiness Gate (就绪门)
- 数据库连接探针
- Redis 连接探针
- 自定义探针扩展

## 🗄️ 数据库迁移

```bash
# 创建新迁移
alembic revision --autogenerate -m "Description"

# 应用迁移
alembic upgrade head

# 回滚迁移
alembic downgrade -1
```

## 🧪 测试

```bash
# 运行测试
pytest

# 带覆盖率
pytest --cov=src
```

## 📝 环境变量

关键环境变量见 `.env.example`:

- `DATABASE_URL` - PostgreSQL 连接
- `REDIS_URL` - Redis 连接
- `SECRET_KEY` - JWT 密钥
- `TIKHUB_API_KEY` - TikHub API 密钥
- `BAILIAN_API_KEY` - 百炼 API 密钥
- `OSS_*` - 阿里云 OSS 配置

## 📄 许可证

Copyright © 2024 捷阅证券
