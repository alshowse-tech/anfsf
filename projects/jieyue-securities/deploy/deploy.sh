#!/bin/bash
# 一键部署脚本 - JieYue Securities

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
PROJECT_DIR="/root/.openclaw/workspace-main/projects/jieyue-securities"
DOCKER_COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
BACKUP_DIR="/backups/jieyue-securities"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  捷阅证券信息助手 - 一键部署脚本${NC}"
echo -e "${GREEN}======================================${NC}"

# 检查 Docker
check_docker() {
    echo -e "${YELLOW}[1/6] 检查 Docker 环境...${NC}"
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误：Docker 未安装${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}错误：Docker Compose 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker 环境检查通过${NC}"
}

# 备份数据
backup_data() {
    echo -e "${YELLOW}[2/6] 备份现有数据...${NC}"
    
    if [ -d "${BACKUP_DIR}" ]; then
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_NAME="${BACKUP_DIR}/backup_${TIMESTAMP}"
        mkdir -p "${BACKUP_NAME}"
        
        # 备份数据库
        docker-compose -f "${DOCKER_COMPOSE_FILE}" exec -T mysql mysqldump -uroot -proot jieyue_securities > "${BACKUP_NAME}/database.sql" 2>/dev/null || true
        
        echo -e "${GREEN}✓ 数据已备份到 ${BACKUP_NAME}${NC}"
    else
        echo -e "${YELLOW}⚠ 首次部署，跳过备份${NC}"
    fi
}

# 拉取最新镜像
pull_images() {
    echo -e "${YELLOW}[3/6] 拉取最新 Docker 镜像...${NC}"
    
    cd "${PROJECT_DIR}"
    docker-compose pull
    
    echo -e "${GREEN}✓ 镜像拉取完成${NC}"
}

# 数据库迁移
migrate_database() {
    echo -e "${YELLOW}[4/6] 执行数据库迁移...${NC}"
    
    cd "${PROJECT_DIR}"
    docker-compose up -d mysql
    
    # 等待 MySQL 启动
    echo "等待 MySQL 启动..."
    sleep 10
    
    # 运行迁移脚本
    docker-compose run --rm backend python -m src.db.migrate || true
    
    echo -e "${GREEN}✓ 数据库迁移完成${NC}"
}

# 启动服务
start_services() {
    echo -e "${YELLOW}[5/6] 启动服务...${NC}"
    
    cd "${PROJECT_DIR}"
    docker-compose up -d
    
    echo -e "${GREEN}✓ 服务启动完成${NC}"
}

# 健康检查
health_check() {
    echo -e "${YELLOW}[6/6] 执行健康检查...${NC}"
    
    # 等待服务启动
    sleep 15
    
    # 检查后端
    if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 后端服务正常${NC}"
    else
        echo -e "${RED}✗ 后端服务异常${NC}"
    fi
    
    # 检查前端
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 前端服务正常${NC}"
    else
        echo -e "${RED}✗ 前端服务异常${NC}"
    fi
    
    # 检查数据库
    if docker-compose -f "${DOCKER_COMPOSE_FILE}" exec -T mysql mysqladmin ping -uroot -proot > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 数据库服务正常${NC}"
    else
        echo -e "${RED}✗ 数据库服务异常${NC}"
    fi
}

# 显示访问信息
show_info() {
    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}  部署完成！${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
    echo "访问地址:"
    echo "  前端：http://localhost:3000"
    echo "  后端：http://localhost:8000"
    echo "  API 文档：http://localhost:8000/docs"
    echo ""
    echo "查看日志:"
    echo "  docker-compose logs -f"
    echo ""
    echo "停止服务:"
    echo "  docker-compose down"
    echo ""
}

# 主流程
main() {
    check_docker
    backup_data
    pull_images
    migrate_database
    start_services
    health_check
    show_info
}

# 执行
main "$@"
