#!/bin/bash

# 捷阅证券 - Backend 启动脚本

echo "=== 启动捷阅证券 Backend 服务 ==="
echo ""

# 检查 API Key
if [ -z "$DASHSCOPE_API_KEY" ]; then
    echo "❌ 错误: DASHSCOPE_API_KEY 环境变量未设置"
    echo "请先运行: ./setup-api-key.sh"
    exit 1
fi

echo "✅ DASHSCOPE_API_KEY 已配置"

# 激活虚拟环境
source venv/bin/activate

# 启动服务
echo "🚀 启动 Uvicorn 服务..."
echo "服务地址: http://localhost:8000"
echo "按 Ctrl+C 停止服务"
echo ""

uvicorn src.main:app --host 0.0.0.0 --port 8000