# 捷阅证券信息助手 - Docker 部署配置

**版本**: 1.0.0  
**创建时间**: 2026-03-31

---

## 一、Dockerfile

### 1.1 后端 Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY src/ ./src/

# 环境变量
ENV PYTHONUNBUFFERED=1
ENV DATABASE_URL=mysql+pymysql://root:password@mysql:3306/jieyue_securities
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 1.2 前端 Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_API_URL=http://backend:8000/api

EXPOSE 3000

CMD ["node", "server.js"]
```

---

## 二、Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  # MySQL 数据库
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: jieyue_securities
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis 缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 后端服务
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: mysql+pymysql://root:password@mysql:3306/jieyue_securities
      REDIS_HOST: redis
      REDIS_PORT: 6379
      TIKHUB_API_KEY: ${TIKHUB_API_KEY}
      VOLCANO_ACCESS_KEY: ${VOLCANO_ACCESS_KEY}
      VOLCANO_SECRET_KEY: ${VOLCANO_SECRET_KEY}
      DASHSCOPE_API_KEY: ${DASHSCOPE_API_KEY}
    ports:
      - "8000:8000"

  # 前端服务
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8000/api
    ports:
      - "3000:3000"

  # BullMQ Worker（队列处理）
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    depends_on:
      - mysql
      - redis
    environment:
      DATABASE_URL: mysql+pymysql://root:password@mysql:3306/jieyue_securities
      REDIS_HOST: redis
      REDIS_PORT: 6379
    command: python -m uvicorn src.worker:app --host 0.0.0.0 --port 8001

volumes:
  mysql_data:
```

---

## 三、部署脚本

### 3.1 一键部署

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 开始部署捷阅证券信息助手..."

# 1. 构建镜像
echo "📦 构建 Docker 镜像..."
docker-compose build

# 2. 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 3. 等待服务就绪
echo "⏳ 等待服务就绪..."
sleep 10

# 4. 健康检查
echo "🏥 健康检查..."
curl -f http://localhost:8000/health || exit 1
curl -f http://localhost:3000 || exit 1

echo "✅ 部署完成！"
echo ""
echo "访问地址:"
echo "  前端：http://localhost:3000"
echo "  后端 API: http://localhost:8000"
echo "  API 文档：http://localhost:8000/docs"
```

### 3.2 停止服务

```bash
#!/bin/bash
# stop.sh

echo "🛑 停止服务..."
docker-compose down

echo "✅ 服务已停止"
```

### 3.3 查看日志

```bash
#!/bin/bash
# logs.sh

docker-compose logs -f $1
```

---

## 四、生产环境配置

### 4.1 环境变量

```bash
# .env.production
# 数据库
DATABASE_URL=mysql+pymysql://user:password@prod-mysql:3306/jieyue_securities

# Redis
REDIS_HOST=prod-redis
REDIS_PORT=6379

# 第三方服务
TIKHUB_API_KEY=your_tikhub_key
VOLCANO_ACCESS_KEY=your_volcano_key
VOLCANO_SECRET_KEY=your_volcano_secret
DASHSCOPE_API_KEY=your_dashscope_key

# 应用配置
APP_ENV=production
DEBUG=False
```

### 4.2 Kubernetes 部署

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jieyue-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: jieyue-backend
  template:
    metadata:
      labels:
        app: jieyue-backend
    spec:
      containers:
      - name: backend
        image: jieyue/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: jieyue-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## 五、监控配置

### 5.1 Prometheus 指标

```python
# 添加 Prometheus 指标
from prometheus_fastapi_instrumentator import Instrumentator

instrumentator = Instrumentator()
instrumentator.instrument(app).expose(app)

# 指标：
# - http_requests_total
# - http_request_duration_seconds
# - task_success_rate
# - asr_fail_rate
```

### 5.2 Grafana 仪表板

```json
{
  "dashboard": {
    "title": "捷阅证券信息助手",
    "panels": [
      {
        "title": "API 请求量",
        "targets": [{"expr": "rate(http_requests_total[5m])"}]
      },
      {
        "title": "任务成功率",
        "targets": [{"expr": "task_success_rate"}]
      },
      {
        "title": "ASR 失败率",
        "targets": [{"expr": "asr_fail_rate"}]
      }
    ]
  }
}
```

---

## 六、回滚方案

### 6.1 Docker 回滚

```bash
# 回滚到上一版本
docker-compose pull
docker-compose up -d
```

### 6.2 Kubernetes 回滚

```bash
# Kubernetes 回滚
kubectl rollout undo deployment/jieyue-backend
```

---

**部署状态**: ⏳ 待执行  
**部署人员**: ANFSF Agent Team  
**部署日期**: 2026-04-01
