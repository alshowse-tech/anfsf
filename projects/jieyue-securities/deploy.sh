#!/bin/bash
# 捷阅证券信息助手 - 一键部署脚本
set -e

cd /root/.openclaw/workspace-main/projects/jieyue-securities

echo "🚀 开始部署捷阅证券信息助手..."

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi

# 停止旧容器
echo "📦 停止旧容器..."
docker-compose down 2>/dev/null || true

# 构建镜像
echo "🔨 构建镜像..."
docker-compose build

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 等待服务
echo "⏳ 等待服务就绪..."
sleep 15

# 健康检查
echo "🏥 健康检查..."
curl -s http://localhost:8000/health && echo " ✓ 后端 OK" || echo " ✗ 后端失败"
curl -s http://localhost:3000 > /dev/null && echo " ✓ 前端 OK" || echo " ✗ 前端失败"

echo ""
echo "✅ 部署完成！"
echo ""
echo "访问地址:"
echo "  前端：http://localhost:3000"
echo "  后端：http://localhost:8000"
echo "  API 文档：http://localhost:8000/docs"
