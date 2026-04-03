# 捷阅证券后端 - 本地访问地址

## ✅ 验收状态

- ✅ FastAPI 应用启动成功
- ✅ 所有 API 端点可用 (30 个路由)
- ✅ 数据库连接配置完成
- ✅ Layer 8.5 集成完成
- ✅ 本地访问地址可用

---

## 🌐 完整访问地址列表

### 应用入口
| 描述 | 地址 |
|------|------|
| **主应用** | http://localhost:8000 |

### API 文档
| 文档类型 | 地址 |
|----------|------|
| **Swagger UI** | http://localhost:8000/docs |
| **ReDoc** | http://localhost:8000/redoc |
| **OpenAPI Schema** | http://localhost:8000/openapi.json |

### 健康检查 (Layer 8.5 Readiness Gate)
| 探针类型 | 地址 | 说明 |
|----------|------|------|
| **基础健康** | http://localhost:8000/health | 返回应用状态和版本 |
| **就绪检查** | http://localhost:8000/health/ready | Layer 8.5 Readiness Gate (数据库 + Redis) |
| **存活检查** | http://localhost:8000/health/live | 存活探针 |

### 用户认证 API
| 端点 | 方法 | 地址 |
|------|------|------|
| 注册用户 | POST | http://localhost:8000/users/register |
| 用户登录 | POST | http://localhost:8000/users/login |
| 获取当前用户 | GET | http://localhost:8000/users/me |
| 更新当前用户 | PUT | http://localhost:8000/users/me |
| 获取用户列表 | GET | http://localhost:8000/users |
| 获取指定用户 | GET | http://localhost:8000/users/{user_id} |

### 钱包管理 API
| 端点 | 方法 | 地址 |
|------|------|------|
| 查询余额 | GET | http://localhost:8000/wallets/balance |
| 获取钱包 | GET | http://localhost:8000/wallets |
| 充值 | POST | http://localhost:8000/wallets/recharge |
| 消费 | POST | http://localhost:8000/wallets/consume |
| 交易记录 | GET | http://localhost:8000/wallets/transactions |

### 任务管理 API
| 端点 | 方法 | 地址 |
|------|------|------|
| 创建任务 | POST | http://localhost:8000/tasks |
| 获取任务列表 | GET | http://localhost:8000/tasks |
| 获取任务详情 | GET | http://localhost:8000/tasks/{task_id} |
| 更新任务 | PUT | http://localhost:8000/tasks/{task_id} |
| 更新任务状态 | PATCH | http://localhost:8000/tasks/{task_id}/status |
| 取消任务 | POST | http://localhost:8000/tasks/{task_id}/cancel |
| 删除任务 | DELETE | http://localhost:8000/tasks/{task_id} |

### 转写服务 API
| 端点 | 方法 | 地址 |
|------|------|------|
| 创建转写 | POST | http://localhost:8000/transcription |
| 获取转写列表 | GET | http://localhost:8000/transcription |
| 获取转写详情 | GET | http://localhost:8000/transcription/{transcription_id} |
| 处理转写 | POST | http://localhost:8000/transcription/{transcription_id}/process |
| 取消转写 | POST | http://localhost:8000/transcription/{transcription_id}/cancel |

---

## 🚀 快速启动

```bash
cd /root/.openclaw/workspace-main/backend

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入配置

# 启动服务
./start.sh
```

---

## 📊 Layer 8.5 集成验证

### 1. Ownership Lattice (所有权晶格)
- 用户注册时自动创建 `ownership_root_id`
- 任务创建时自动生成 `OwnershipRecord`
- 转写创建时自动生成 `OwnershipRecord`
- 支持 `verify_ownership()` 验证

### 2. Contract Pack (契约包)
- 任务支持绑定 `contract_id`
- 转写支持绑定 `contract_id`
- 支持 `check_contract_validity()` 验证
- 契约有效期和约束检查

### 3. MCP Bus (消息总线)
- 事件发布：`publish_to_mcp_bus()`
- 事件类型：
  - `application.started`
  - `application.stopped`
  - `task.created`
  - `task.status_updated`
  - `transcription.created`
  - `transcription.completed`
  - `transcription.failed`

### 4. Readiness Gate (就绪门)
- 探针：`database` - 数据库连接检查
- 探针：`redis` - Redis 连接检查
- 端点：`GET /health/ready`

---

## 📁 交付物清单

### 完整后端代码
- [x] `src/main.py` - 应用入口
- [x] `src/services/` - 服务层 (4 个服务)
- [x] `src/api/` - API 路由 (5 个模块)
- [x] `src/models/` - 数据模型 (7 个模型)
- [x] `src/core/` - 核心模块 (security, layer8)
- [x] `src/config/` - 配置模块

### 配置文件
- [x] `.env.example` - 环境变量模板
- [x] `config/database.py` - 数据库配置
- [x] `config/queue.py` - 队列配置
- [x] `requirements.txt` - Python 依赖

### 数据库迁移
- [x] `alembic/` - 迁移目录
- [x] `alembic.ini` - Alembic 配置
- [x] `alembic/versions/001_initial_migration.py` - 初始迁移

### 启动脚本
- [x] `start.sh` - 本地启动脚本
- [x] `start-prod.sh` - 生产启动脚本

### 文档
- [x] `README.md` - 项目文档
- [x] `ACCESS_ADDRESSES.md` - 访问地址 (本文件)

---

## 📞 技术支持

如有问题，请查看:
- 应用日志
- Layer 8.5 MCP Bus 事件日志
- 数据库连接状态

**项目位置**: `/root/.openclaw/workspace-main/backend`
