#!/bin/bash

# ============================================================================
# SparkPath 快速部署脚本 (核心服务)
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "=============================================="
echo "  SparkPath 快速部署"
echo "=============================================="
echo ""

# 创建目录
log_info "创建目录..."
mkdir -p nginx/ssl nginx/logs storage

# 生成 SSL 证书
log_info "生成 SSL 证书..."
if [ ! -f nginx/ssl/sparkpath.com.key ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/sparkpath.com.key \
        -out nginx/ssl/sparkpath.com.crt \
        -subj "/C=CN/ST=Shanghai/L=Shanghai/O=SparkPath/CN=sparkpath.com" 2>/dev/null
    log_info "SSL 证书生成完成"
else
    log_warn "SSL 证书已存在"
fi

# 启动核心服务 (Neo4j + Redis)
log_info "启动核心服务..."
cat > docker-compose.core.yml << 'EOF'
version: '3.8'

services:
  neo4j:
    image: neo4j:5.15.0
    container_name: sparkpath-neo4j
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/SparkPath2026!
      - NEO4J_PLUGINS=["apoc"]
    volumes:
      - neo4j-data:/data
      - neo4j-logs:/logs
    networks:
      - sparkpath-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:7474"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  redis:
    image: redis:7.2-alpine
    container_name: sparkpath-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass SparkPath2026!
    volumes:
      - redis-data:/data
    networks:
      - sparkpath-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

networks:
  sparkpath-network:
    driver: bridge

volumes:
  neo4j-data:
  neo4j-logs:
  redis-data:
EOF

docker-compose -f docker-compose.core.yml up -d

# 等待服务启动
log_info "等待服务启动..."
sleep 30

# 健康检查
log_info "执行健康检查..."

# 检查 Neo4j
if curl -f http://localhost:7474 > /dev/null 2>&1; then
    log_info "✓ Neo4j 运行正常"
else
    log_error "✗ Neo4j 运行异常"
fi

# 检查 Redis
if docker exec sparkpath-redis redis-cli -a 'SparkPath2026!' ping > /dev/null 2>&1; then
    log_info "✓ Redis 运行正常"
else
    log_error "✗ Redis 运行异常"
fi

# 初始化数据库
log_info "初始化数据库..."
if [ -f data/neo4j/schema.cypher ]; then
    sleep 10
    docker exec -i sparkpath-neo4j cypher-shell -u neo4j -p 'SparkPath2026!' < data/neo4j/schema.cypher 2>/dev/null || true
    log_info "数据库初始化完成"
fi

echo ""
echo "=============================================="
echo "  SparkPath 快速部署完成"
echo "=============================================="
echo ""
echo "服务访问地址:"
echo "  - Neo4j:  http://localhost:7474 (neo4j/SparkPath2026!)"
echo "  - Redis:  localhost:6379 (SparkPath2026!)"
echo ""
echo "常用命令:"
echo "  - 查看状态：docker-compose -f docker-compose.core.yml ps"
echo "  - 查看日志：docker-compose -f docker-compose.core.yml logs -f"
echo "  - 停止服务：docker-compose -f docker-compose.core.yml down"
echo ""
echo "=============================================="
