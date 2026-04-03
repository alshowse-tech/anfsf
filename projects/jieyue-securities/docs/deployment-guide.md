# 捷阅证券信息助手 - 部署文档

## 目录

1. [环境要求](#环境要求)
2. [快速部署](#快速部署)
3. [手动部署](#手动部署)
4. [配置说明](#配置说明)
5. [验证部署](#验证部署)

---

## 环境要求

### 最低配置

- CPU: 4 核
- 内存：8GB
- 磁盘：50GB
- 操作系统：Ubuntu 20.04+ / CentOS 7+

### 推荐配置

- CPU: 8 核
- 内存：16GB
- 磁盘：100GB SSD
- 操作系统：Ubuntu 22.04 LTS

### 依赖软件

- Docker 20.10+
- Docker Compose 2.0+
- Git

---

## 快速部署

### 1. 克隆项目

```bash
git clone https://github.com/your-org/jieyue-securities.git
cd jieyue-securities
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入必要配置
```

### 3. 一键部署

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### 4. 验证

访问 http://localhost:3000 查看前端  
访问 http://localhost:8000/docs 查看 API 文档

---

## 手动部署

### 1. 启动数据库

```bash
docker-compose up -d mysql redis
```

### 2. 初始化数据库

```bash
docker-compose run --rm backend python -m src.db.init
```

### 3. 启动后端

```bash
docker-compose up -d backend
```

### 4. 启动前端

```bash
docker-compose up -d frontend
```

### 5. 启动监控（可选）

```bash
docker-compose up -d prometheus grafana
```

---

## 配置说明

### 环境变量 (.env)

```bash
# 数据库
DATABASE_URL=mysql+pymysql://user:password@mysql:3306/jieyue_securities
REDIS_URL=redis://redis:6379

# JWT 配置
JWT_SECRET_KEY=your-secret-key-here
JWT_EXPIRE_MINUTES=1440

# 支付配置
WECHAT_APP_ID=wx_xxx
WECHAT_MCH_ID=1234567890
WECHAT_API_KEY=xxx
ALIPAY_APP_ID=2021xxx
ALIPAY_PRIVATE_KEY=xxx
ALIPAY_PUBLIC_KEY=xxx

# 第三方服务
TIKHUB_API_KEY=xxx
VOLCANO_ACCESS_KEY=xxx
VOLCANO_SECRET_KEY=xxx

# 服务地址
BACKEND_URL=http://backend:8000
FRONTEND_URL=http://frontend:3000
```

### Docker Compose 配置

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: jieyue_securities
    volumes:
      - mysql_data:/var/lib/mysql
  
  redis:
    image: redis:7
    volumes:
      - redis_data:/data
  
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    ports:
      - "8000:8000"
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"

volumes:
  mysql_data:
  redis_data:
```

---

## 验证部署

### 健康检查

```bash
# 后端健康检查
curl http://localhost:8000/api/health

# 前端健康检查
curl http://localhost:3000

# 数据库连接
docker-compose exec mysql mysqladmin ping -uroot -proot

# Redis 连接
docker-compose exec redis redis-cli ping
```

### 功能测试

1. **注册登录**: 创建账号并登录
2. **充值**: 测试支付流程（沙箱环境）
3. **提交任务**: 提交测试链接
4. **查看结果**: 等待处理完成并查看

---

## 升级部署

### 1. 备份数据

```bash
./deploy/deploy.sh backup
```

### 2. 拉取最新代码

```bash
git pull origin main
```

### 3. 执行迁移

```bash
./deploy/migrate.sh upgrade
```

### 4. 重启服务

```bash
docker-compose restart
```

---

## 故障排查

### 后端无法启动

```bash
# 查看日志
docker-compose logs backend

# 检查数据库连接
docker-compose exec backend python -c "from src.db.session import engine; print(engine.connect())"
```

### 前端无法访问

```bash
# 查看日志
docker-compose logs frontend

# 检查端口占用
netstat -tlnp | grep 3000
```

### 数据库连接失败

```bash
# 检查 MySQL 状态
docker-compose ps mysql

# 查看 MySQL 日志
docker-compose logs mysql
```

---

## 性能优化

### 数据库优化

```sql
-- 添加索引
ALTER TABLE tasks ADD INDEX idx_user_status (user_id, status);
ALTER TABLE transactions ADD INDEX idx_user_created (user_id, created_at);
```

### 缓存配置

```bash
# Redis 内存配置
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

---

**最后更新**: 2026-04-01  
**版本**: v1.0.0
