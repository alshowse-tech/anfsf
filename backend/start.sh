#!/bin/bash
# 捷阅证券后端 - Local Development Start Script

set -e

echo "=============================================="
echo "  捷阅证券后端 - 本地启动"
echo "=============================================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✓ Created .env file. Please edit with your configuration."
    echo "  Then run this script again."
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
REQUIRED_VERSION="3.10"

echo "Python version: $PYTHON_VERSION"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pip install -r requirements.txt -q

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
alembic upgrade head

# Start the application
echo ""
echo "🚀 Starting application..."
echo ""
echo "=============================================="
echo "  API Documentation:"
echo "  - Swagger UI:  http://localhost:8000/docs"
echo "  - ReDoc:       http://localhost:8000/redoc"
echo "  - OpenAPI:     http://localhost:8000/openapi.json"
echo ""
echo "  Health Checks:"
echo "  - Health:      http://localhost:8000/health"
echo "  - Ready:       http://localhost:8000/health/ready"
echo "  - Live:        http://localhost:8000/health/live"
echo ""
echo "  API Endpoints:"
echo "  - Users:       http://localhost:8000/users"
echo "  - Wallets:     http://localhost:8000/wallets"
echo "  - Tasks:       http://localhost:8000/tasks"
echo "  - Transcription: http://localhost:8000/transcription"
echo "=============================================="
echo ""

# Start uvicorn
cd src
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
