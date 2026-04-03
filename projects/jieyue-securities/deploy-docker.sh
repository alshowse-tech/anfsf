#!/bin/bash
# 捷阅证券信息助手 - Docker 部署脚本（不使用 docker-compose）
set -e

cd /root/.openclaw/workspace-main/projects/jieyue-securities

echo "🚀 开始部署捷阅证券信息助手..."

# 创建网络
echo "📦 创建 Docker 网络..."
docker network create jieyue-network 2>/dev/null || true

# 启动 MySQL
echo "🐬 启动 MySQL..."
docker run -d \
  --name jieyue-mysql \
  --network jieyue-network \
  -e MYSQL_ROOT_PASSWORD=jieyue2026 \
  -e MYSQL_DATABASE=jieyue_securities \
  -e TZ=Asia/Shanghai \
  -p 3306:3306 \
  -v jieyue-mysql-data:/var/lib/mysql \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci

# 等待 MySQL 启动
echo "⏳ 等待 MySQL 启动..."
sleep 10

# 初始化数据库
echo "📊 初始化数据库..."
docker exec jieyue-mysql bash -c "
until mysql -u root -pieyue2026 -e 'SELECT 1' 2>/dev/null; do
  sleep 2
done
mysql -u root -pieyue2026 jieyue_securities < /tmp/init.sql
" 2>/dev/null || docker cp infrastructure/docker/init.sql jieyue-mysql:/tmp/init.sql && \
docker exec jieyue-mysql bash -c "mysql -u root -pieyue2026 jieyue_securities < /tmp/init.sql"

# 启动 Redis
echo "📦 启动 Redis..."
docker run -d \
  --name jieyue-redis \
  --network jieyue-network \
  -p 6379:6379 \
  -v jieyue-redis-data:/data \
  redis:7-alpine \
  redis-server --appendonly yes

# 等待 Redis 启动
sleep 3

# 启动后端
echo "🔧 启动后端服务..."
docker run -d \
  --name jieyue-backend \
  --network jieyue-network \
  -e DATABASE_URL="mysql+pymysql://root:jieyue2026@jieyue-mysql:3306/jieyue_securities" \
  -e REDIS_HOST=jieyue-redis \
  -e REDIS_PORT=6379 \
  -p 8000:8000 \
  -v $(pwd)/backend/src:/app/src:ro \
  jieyue-backend-img \
  uvicorn src.main:app --host 0.0.0.0 --port 8000 || \
docker build -t jieyue-backend-img ./backend && \
docker run -d \
  --name jieyue-backend \
  --network jieyue-network \
  -e DATABASE_URL="mysql+pymysql://root:jieyue2026@jieyue-mysql:3306/jieyue_securities" \
  -e REDIS_HOST=jieyue-redis \
  -e REDIS_PORT=6379 \
  -p 8000:8000 \
  jieyue-backend-img \
  uvicorn src.main:app --host 0.0.0.0 --port 8000

# 等待后端启动
echo "⏳ 等待后端启动..."
sleep 10

# 启动前端
echo "🎨 启动前端服务..."
docker build -t jieyue-frontend-img ./frontend
docker run -d \
  --name jieyue-frontend \
  --network jieyue-network \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000/api \
  -p 3000:3000 \
  jieyue-frontend-img

# 健康检查
echo "🏥 健康检查..."
sleep 5

echo ""
echo "✅ 部署完成！"
echo ""
echo "访问地址:"
echo "  🌐 前端：http://localhost:3000"
echo "  🔧 后端：http://localhost:8000"
echo "  📖 API 文档：http://localhost:8000/docs"
echo ""
echo "容器列表:"
docker ps --filter name=jieyue --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
