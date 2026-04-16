#!/bin/bash

# ============================================================================
# SparkPath 生产环境部署脚本
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_info "依赖检查通过"
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."
    
    mkdir -p nginx/ssl
    mkdir -p nginx/logs
    mkdir -p monitoring/prometheus
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources
    mkdir -p monitoring/logstash/pipeline
    mkdir -p storage
    
    log_info "目录创建完成"
}

# 生成 SSL 证书 (自签名，生产环境请使用正式证书)
generate_ssl_cert() {
    log_info "生成 SSL 证书..."
    
    if [ ! -f nginx/ssl/sparkpath.com.key ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/sparkpath.com.key \
            -out nginx/ssl/sparkpath.com.crt \
            -subj "/C=CN/ST=Shanghai/L=Shanghai/O=SparkPath/CN=sparkpath.com"
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/api.sparkpath.com.key \
            -out nginx/ssl/api.sparkpath.com.crt \
            -subj "/C=CN/ST=Shanghai/L=Shanghai/O=SparkPath/CN=api.sparkpath.com"
        
        log_info "SSL 证书生成完成"
    else
        log_warn "SSL 证书已存在，跳过生成"
    fi
}

# 配置环境变量
setup_environment() {
    log_info "配置环境变量..."
    
    if [ ! -f .env.prod ]; then
        cp .env.prod.example .env.prod
        log_warn "已创建 .env.prod 文件，请修改配置后重新运行"
        exit 1
    fi
    
    # 加载环境变量
    export $(cat .env.prod | grep -v '^#' | xargs)
    
    log_info "环境变量配置完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    docker-compose -f docker-compose.prod.yml up -d
    
    log_info "服务启动完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 等待服务启动
    sleep 30
    
    # 检查 Neo4j
    if curl -f http://localhost:7474 > /dev/null 2>&1; then
        log_info "✓ Neo4j 运行正常"
    else
        log_error "✗ Neo4j 运行异常"
        exit 1
    fi
    
    # 检查 Redis
    if docker exec sparkpath-redis redis-cli ping > /dev/null 2>&1; then
        log_info "✓ Redis 运行正常"
    else
        log_error "✗ Redis 运行异常"
        exit 1
    fi
    
    # 检查 Nginx
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log_info "✓ Nginx 运行正常"
    else
        log_error "✗ Nginx 运行异常"
        exit 1
    fi
    
    # 检查 Prometheus
    if curl -f http://localhost:9090 > /dev/null 2>&1; then
        log_info "✓ Prometheus 运行正常"
    else
        log_error "✗ Prometheus 运行异常"
    fi
    
    # 检查 Grafana
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log_info "✓ Grafana 运行正常"
    else
        log_error "✗ Grafana 运行异常"
    fi
    
    log_info "健康检查完成"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    # 等待 Neo4j 启动
    sleep 10
    
    # 导入 Schema
    if [ -f data/neo4j/schema.cypher ]; then
        docker exec -i sparkpath-neo4j cypher-shell -u neo4j -p "${NEO4J_AUTH#neo4j/}" < data/neo4j/schema.cypher
        log_info "数据库 Schema 导入完成"
    else
        log_warn "Schema 文件不存在，跳过导入"
    fi
    
    log_info "数据库初始化完成"
}

# 显示访问信息
show_access_info() {
    echo ""
    echo "=============================================="
    echo "  SparkPath 生产环境部署完成"
    echo "=============================================="
    echo ""
    echo "服务访问地址:"
    echo "  - Web 前端：https://sparkpath.com"
    echo "  - API 服务：https://api.sparkpath.com"
    echo "  - Grafana:   http://localhost:3000 (admin/SparkPath2026!)"
    echo "  - Prometheus: http://localhost:9090"
    echo "  - Kibana:    http://localhost:5601"
    echo "  - Neo4j:     http://localhost:7474 (neo4j/SparkPath2026!)"
    echo ""
    echo "常用命令:"
    echo "  - 查看日志：docker-compose -f docker-compose.prod.yml logs -f"
    echo "  - 停止服务：docker-compose -f docker-compose.prod.yml down"
    echo "  - 重启服务：docker-compose -f docker-compose.prod.yml restart"
    echo "  - 查看状态：docker-compose -f docker-compose.prod.yml ps"
    echo ""
    echo "=============================================="
}

# 主函数
main() {
    echo ""
    echo "=============================================="
    echo "  SparkPath 生产环境部署"
    echo "=============================================="
    echo ""
    
    check_dependencies
    create_directories
    generate_ssl_cert
    setup_environment
    start_services
    health_check
    init_database
    show_access_info
    
    log_info "部署完成!"
}

# 执行主函数
main "$@"
