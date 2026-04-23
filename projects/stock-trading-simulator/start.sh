#!/bin/bash

# 股票操盘模拟系统 - 启动脚本
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 股票操盘模拟系统启动脚本"
echo ""

if [ "$1" = "prod" ]; then
    echo "启动生产模式 (Docker Compose)..."
    docker-compose up -d --build
    echo ""
    echo "✅ 服务启动完成!"
    echo "   前端：http://localhost"
    echo "   后端：http://localhost:8000"
    echo "   API 文档：http://localhost:8000/docs"
elif [ "$1" = "stop" ]; then
    echo "停止所有服务..."
    docker-compose down
    echo "✅ 服务已停止"
else
    echo "用法：$0 [prod|stop]"
    echo "  prod  - 启动生产环境"
    echo "  stop  - 停止所有服务"
fi
