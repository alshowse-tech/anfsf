#!/bin/bash

# 捷阅证券信息助手 - SSL 证书生成脚本
# 用于开发环境的自签名证书

set -e

SSL_DIR="$(dirname "$0")/ssl"
CERT_FILE="$SSL_DIR/cert.pem"
KEY_FILE="$SSL_DIR/key.pem"

echo "🔐 捷阅证券信息助手 - SSL 证书生成"
echo "=================================="

# 创建 SSL 目录
mkdir -p "$SSL_DIR"

# 检查是否已存在证书
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "✓ SSL 证书已存在"
    echo "  证书：$CERT_FILE"
    echo "  密钥：$KEY_FILE"
    read -p "是否重新生成？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# 生成自签名证书
echo "📝 生成自签名 SSL 证书..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=CN/ST=Shanghai/L=Shanghai/O=Jieyue Securities/OU=IT/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# 设置权限
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo ""
echo "✅ SSL 证书生成成功！"
echo ""
echo "📁 证书文件:"
echo "  - 证书：$CERT_FILE"
echo "  - 密钥：$KEY_FILE"
echo ""
echo "⚠️  注意："
echo "  - 这是自签名证书，仅用于开发环境"
echo "  - 生产环境请使用 Let's Encrypt 或其他 CA 颁发的证书"
echo "  - 浏览器可能会显示安全警告，这是正常的"
echo ""
echo "🚀 启动 HTTPS 服务:"
echo "  docker-compose -f infrastructure/nginx/docker-compose.ssl.yml up -d"
echo ""
