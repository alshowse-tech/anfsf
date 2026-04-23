#!/bin/bash

# 股票操盘模拟系统 - 启动脚本
# 用法：./start.sh [dev|prod]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo_warn "docker-compose 未安装，尝试使用 docker compose"
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
}

# 开发模式启动
start_dev() {
    echo_info "🚀 启动开发模式..."
    
    # 启动数据库和缓存
    echo_info "启动 PostgreSQL 和 Redis..."
    $COMPOSE_CMD up -d postgres redis
    
    # 等待服务就绪
    echo_info "等待服务启动..."
    sleep 5
    
    # 启动后端
    echo_info "启动后端服务 (http://localhost:8000)..."
    cd backend
    if [ ! -d "venv" ]; then
        echo_info "创建 Python 虚拟环境..."
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install -q -r requirements.txt
    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
    cd ..
    
    # 启动前端
    echo_info "启动前端服务 (http://localhost:3000)..."
    cd frontend/stock-dashboard
    if [ ! -d "node_modules" ]; then
        echo_info "安装前端依赖..."
        npm install
    fi
    npm run dev &
    cd ../..
    
    echo_info ""
    echo_info "✅ 开发环境启动完成!"
    echo_info ""
    echo_info "📡 服务地址:"
    echo_info "   前端开发服务器：http://localhost:3000"
    echo_info "   后端 API 服务器：http://localhost:8000"
    echo_info "   API 文档：http://localhost:8000/docs"
    echo_info ""
    echo_info "按 Ctrl+C 停止所有服务"
    
    # 等待所有后台进程
    wait
}

# 生产模式启动
start_prod() {
    echo_info "🚀 启动生产模式..."
    
    # 构建并启动所有服务
    $COMPOSE_CMD up -d --build
    
    echo_info ""
    echo_info "✅ 生产环境启动完成!"
    echo_info ""
    echo_info "📡 服务地址:"
    echo_info "   前端：http://localhost"
    echo_info "   后端 API：http://localhost:8000"
    echo_info "   API 文档：http://localhost:8000/docs"
    echo_info ""
    echo_info "查看日志：$COMPOSE_CMD logs -f"
    echo_info "停止服务：$COMPOSE_CMD down"
}

# 停止服务
stop_services() {
    echo_info "🛑 停止所有服务..."
    $COMPOSE_CMD down
    echo_info "✅ 服务已停止"
}

# 查看状态
show_status() {
    echo_info "📊 服务状态:"
    $COMPOSE_CMD ps
}

# 主函数
main() {
    check_docker
    
    case "${1:-dev}" in
        dev)
            start_dev
            ;;
        prod)
            start_prod
            ;;
        stop)
            stop_services
            ;;
        status)
            show_status
            ;;
        *)
            echo "用法：$0 [dev|prod|stop|status]"
            echo ""
            echo "命令:"
            echo "  dev     启动开发模式 (默认)"
            echo "  prod    启动生产模式 (Docker Compose)"
            echo "  stop    停止所有服务"
            echo "  status  查看服务状态"
            exit 1
            ;;
    esac
}

main "$@"
