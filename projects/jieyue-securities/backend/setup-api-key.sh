#!/bin/bash

# 捷阅证券 - API Key 配置脚本

echo "=== 捷阅证券信息助手 API Key 配置 ==="
echo ""

# 检查是否已设置 API Key
if [ -z "$DASHSCOPE_API_KEY" ]; then
    echo "当前未设置 DASHSCOPE_API_KEY 环境变量"
    echo ""
    
    # 提示用户输入 API Key
    read -p "请输入您的 DashScope API Key: " api_key
    
    if [ -n "$api_key" ]; then
        export DASHSCOPE_API_KEY="$api_key"
        echo ""
        echo "✅ API Key 已设置"
        echo "您可以现在启动 backend 服务："
        echo "cd backend && source venv/bin/activate && ./start-backend.sh"
    else
        echo "❌ 未提供 API Key，退出配置"
        exit 1
    fi
else
    echo "✅ DASHSCOPE_API_KEY 已设置"
    echo "当前 API Key: ${DASHSCOPE_API_KEY:0:8}..."
fi

echo ""
echo "=== 配置完成 ==="