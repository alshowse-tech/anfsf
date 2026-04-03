#!/bin/bash
# 捷阅证券后端 - Production Start Script

set -e

echo "=============================================="
echo "  捷阅证券后端 - 生产环境启动"
echo "=============================================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "   Please create .env file with production configuration."
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Verify production settings
if [ "$DEBUG" = "true" ]; then
    echo "⚠️  WARNING: DEBUG mode is enabled in production!"
    echo "   Consider setting DEBUG=false in .env"
fi

if [ "$SECRET_KEY" = "your-super-secret-key-change-in-production" ]; then
    echo "❌ ERROR: Default SECRET_KEY detected!"
    echo "   Please change SECRET_KEY in .env before running in production."
    exit 1
fi

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  WARNING: Running as root is not recommended"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pip install -r requirements.txt --no-cache-dir

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
alembic upgrade head

# Create necessary directories
mkdir -p logs

# Start the application with uvicorn
echo ""
echo "🚀 Starting production server..."
echo ""
echo "=============================================="
echo "  Server:      http://0.0.0.0:8000"
echo "  Workers:     4"
echo "  Log Level:   info"
echo "=============================================="
echo ""

# Start with multiple workers for production
cd src
exec python -m uvicorn main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --log-level info \
    --access-log \
    --no-access-log
