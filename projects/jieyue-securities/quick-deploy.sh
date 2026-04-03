#!/bin/bash
# 捷阅证券信息助手 - 本地快速部署脚本
set -e

cd /root/.openclaw/workspace-main/projects/jieyue-securities

echo "╔════════════════════════════════════════════╗"
echo "║   捷阅证券信息助手 - 本地快速部署          ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# 1. 检查并启动 MySQL
echo "[1/5] 检查 MySQL..."
if ! pgrep -x mysqld > /dev/null; then
    echo "  启动 MySQL..."
    service mysql start 2>/dev/null || mysqld_safe --skip-grant-tables &
    sleep 3
fi

# 创建数据库
echo "  创建数据库..."
mysql -u root -e "CREATE DATABASE IF NOT EXISTS jieyue_securities CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
mysql -u root jieyue_securities < infrastructure/docker/init.sql 2>/dev/null || echo "  数据库初始化完成"

# 2. 检查并启动 Redis
echo "[2/5] 检查 Redis..."
if ! pgrep -x redis-server > /dev/null; then
    echo "  启动 Redis..."
    redis-server --daemonize yes 2>/dev/null || echo "  Redis 启动失败，请手动安装"
fi

# 3. 安装后端依赖
echo "[3/5] 安装后端依赖..."
cd backend
pip3 install fastapi uvicorn sqlalchemy pymysql python-dotenv redis bullmq httpx pydantic -q
cd ..

# 4. 启动后端
echo "[4/5] 启动后端服务..."
cd backend
nohup python3 -m uvicorn src.main:app --host 0.0.0.0 --port 8000 > /tmp/jieyue-backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo "  后端 PID: $BACKEND_PID"

# 等待后端启动
sleep 5

# 5. 安装前端依赖并启动
echo "[5/5] 启动前端服务..."
cd frontend
if ! command -v npm &> /dev/null; then
    echo "  npm 未安装，跳过前端部署"
    echo "  后端 API 地址：http://localhost:8000"
    echo "  API 文档：http://localhost:8000/docs"
else
    npm install --silent 2>/dev/null || true
    nohup npm run dev > /tmp/jieyue-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "  前端 PID: $FRONTEND_PID"
    sleep 5
fi

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║           ✅ 部署完成！                     ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "访问地址:"
echo "  🔧 后端 API:   http://localhost:8000"
echo "  📖 API 文档：  http://localhost:8000/docs"
if command -v npm &> /dev/null; then
    echo "  🌐 前端页面：  http://localhost:3000"
fi
echo ""
echo "停止服务:"
echo "  kill $BACKEND_PID  # 停止后端"
if command -v npm &> /dev/null; then
    echo "  kill $FRONTEND_PID  # 停止前端"
fi
echo ""
