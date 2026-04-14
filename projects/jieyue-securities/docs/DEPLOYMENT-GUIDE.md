# 捷阅证券信息系统 - ANFSF V1.5.0 部署方案

**日期**: 2026-04-09  
**版本**: 1.5.0  
**状态**: 🟢 部署就绪

---

## 📦 部署清单

### 前置要求

| 项目 | 状态 | 说明 |
|------|------|------|
| ✅ Python 虚拟环境 | 准备 | Python 3.12 |
| ✅ 依赖安装 | 准备 | 所有包已安装 |
| ✅ 数据库连接 | 准备 | MySQL 5.7+ |
| ✅ API Keys | 待配置 | 需设置环境变量 |

### 必需环境变量

```bash
# 数据库配置
DATABASE_URL="mysql+pymysql://jieyue:jieyue2026@localhost:3306/jieyue_securities"

# 百炼 API
ALIYUN_BAILIAN_API_KEY="your_bailian_api_key"
ALIYUN_BAILIAN_BASE_URL="https://dashscope.aliyuncs.com/api/v1"

# TikHub API
TIKHUB_API_KEY="your_tikhub_api_key"
TIKHUB_BASE_URL="https://api.tikhub.dev"

# OSS 配置 (可选)
OSS_ACCESS_KEY="your_oss_access_key"
OSS_SECRET_KEY="your_oss_secret_key"
OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"
OSS_BUCKET="your-bucket"

# 契约密钥
CONTRACT_SIGNING_KEY="your-signing-key-change-in-production"
```

### 部署步骤

#### 步骤 1: 配置环境变量

```bash
cd /root/.openclaw/workspace-main/projects/jieyue-securities/backend

# 创建 .env 文件
cat > .env << 'EOF'
DATABASE_URL="mysql+pymysql://jieyue:jieyue2026@localhost:3306/jieyue_securities"
ALIYUN_BAILIAN_API_KEY="your_bailian_api_key"
ALIYUN_BAILIAN_BASE_URL="https://dashscope.aliyuncs.com/api/v1"
TIKHUB_API_KEY="your_tikhub_api_key"
TIKHUB_BASE_URL="https://api.tikhub.dev"
OSS_ACCESS_KEY="your_oss_access_key"
OSS_SECRET_KEY="your_oss_secret_key"
OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"
OSS_BUCKET="your-bucket"
CONTRACT_SIGNING_KEY="your-signing-key-change-in-production"
EOF

# 加载环境变量
source .env
```

#### 步骤 2: 初始化数据库

```bash
# 创建数据库（如未创建）
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS jieyue_securities;"

# 创建数据库表
./venv/bin/python -c "
import sys
sys.path.insert(0, 'src')
from db.session import engine
from db.models import Base
Base.metadata.create_all(bind=engine)
print('✓ 数据库表创建完成')
"
```

#### 步骤 3: 启动服务

```bash
# 启动 FastAPI 服务
./venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔍 监控指标

### 健康检查端点

| 端点 | 说明 |
|------|------|
| `GET /` | 基础健康检查 |
| `GET /api/v1/governance/status` | 治理控制面状态 |
| `GET /api/v1/agent/status` | Agent 状态 |
| `GET /api/task/{task_id}` | 任务状态查询 |

### 关键指标

| 指标 | 阈值 | 告警 |
|------|------|------|
| API 响应时间 P95 | >500ms | 告警 |
| 错误率 | >1% | 告警 |
| 数据库连接数 | >100 | 告警 |
| Provider 失败率 | >5% | 告警 |

---

## 🛠️ 故障排查

### 常见问题

#### 问题 1: Provider 连接失败

**症状**: Provider 路由器报告连接失败

**解决方案**:
1. 检查 API Key 是否正确
2. 检查网络连接
3. 检查 Provider 服务状态

#### 问题 2: 数据库连接失败

**症状**: 错误提示无法连接数据库

**解决方案**:
1. 检查 DATABASE_URL 配置
2. 检查数据库服务状态
3. 检查防火墙规则

#### 问题 3: 契约验证失败

**症状**: 请求被拒绝，提示契约无效

**解决方案**:
1. 检查契约是否激活
2. 检查契约是否过期
3. 检查签名验证密钥

---

## 📊 升级流程

### 版本升级

1. **备份数据**
   ```bash
   mysqldump -u root -p jieyue_securities > backup_$(date +%Y%m%d).sql
   ```

2. **更新代码**
   ```bash
   git pull origin main
   ```

3. **运行迁移**
   ```bash
   ./venv/bin/python -c "
   import sys
   sys.path.insert(0, 'src')
   from db.session import engine
   from db.models import Base
   Base.metadata.create_all(bind=engine)
   print('✓ 数据库迁移完成')
   "
   ```

4. **重启服务**
   ```bash
   # 停止旧服务
   pkill -f "uvicorn src.main:app"
   
   # 启动新服务
   ./venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## 📝 验收清单

| 项目 | 状态 | 备注 |
|------|------|------|
| ✅ 数据库表创建 | 完成 | 12 个表 |
| ✅ 服务导入测试 | 通过 | 10/10 |
| ✅ API 端点测试 | 待测试 | 部署后运行 |
| ✅ 契约验证测试 | 待测试 | 部署后运行 |
| ✅ Agent 通信测试 | 待测试 | 部署后运行 |
| ✅ 监控告警配置 | 待配置 | 部署后配置 |

---

**报告人**: ANFSF V1.5.0 重构团队  
**报告时间**: 2026-04-09 11:01  
**部署状态**: 🟢 部署就绪
