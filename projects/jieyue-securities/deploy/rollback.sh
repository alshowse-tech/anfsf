#!/bin/bash
# 回滚脚本 - JieYue Securities

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 配置
BACKUP_DIR="/backups/jieyue-securities"
PROJECT_DIR="/root/.openclaw/workspace-main/projects/jieyue-securities"
DOCKER_COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  捷阅证券信息助手 - 回滚脚本${NC}"
echo -e "${GREEN}======================================${NC}"

# 显示可用备份
list_backups() {
    echo -e "${YELLOW}可用的备份:${NC}"
    ls -lt "${BACKUP_DIR}" | head -10
}

# 选择备份
select_backup() {
    if [ -z "$1" ]; then
        list_backups
        echo ""
        read -p "请输入要回滚的备份目录名：" BACKUP_NAME
    else
        BACKUP_NAME="$1"
    fi
    
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
    
    if [ ! -d "${BACKUP_PATH}" ]; then
        echo -e "${RED}错误：备份目录不存在${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 选择备份：${BACKUP_NAME}${NC}"
}

# 停止当前服务
stop_services() {
    echo -e "${YELLOW}[1/4] 停止当前服务...${NC}"
    
    cd "${PROJECT_DIR}"
    docker-compose down
    
    echo -e "${GREEN}✓ 服务已停止${NC}"
}

# 恢复数据库
restore_database() {
    echo -e "${YELLOW}[2/4] 恢复数据库...${NC}"
    
    if [ -f "${BACKUP_PATH}/database.sql" ]; then
        # 启动 MySQL
        docker-compose up -d mysql
        sleep 10
        
        # 恢复数据
        cat "${BACKUP_PATH}/database.sql" | docker-compose exec -T mysql mysql -uroot -proot jieyue_securities
        
        echo -e "${GREEN}✓ 数据库恢复完成${NC}"
    else
        echo -e "${YELLOW}⚠ 未找到数据库备份，跳过${NC}"
    fi
}

# 恢复应用版本
restore_version() {
    echo -e "${YELLOW}[3/4] 恢复应用版本...${NC}"
    
    if [ -f "${BACKUP_PATH}/docker-compose.yml" ]; then
        cp "${BACKUP_PATH}/docker-compose.yml" "${DOCKER_COMPOSE_FILE}"
        echo -e "${GREEN}✓ Docker Compose 配置已恢复${NC}"
    fi
}

# 启动服务
start_services() {
    echo -e "${YELLOW}[4/4] 启动服务...${NC}"
    
    cd "${PROJECT_DIR}"
    docker-compose up -d
    
    sleep 15
    
    echo -e "${GREEN}✓ 服务已启动${NC}"
}

# 验证
verify() {
    echo -e "${YELLOW}验证服务状态...${NC}"
    
    if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 后端服务正常${NC}"
    else
        echo -e "${RED}✗ 后端服务异常${NC}"
    fi
}

# 主流程
main() {
    select_backup "$1"
    stop_services
    restore_database
    restore_version
    start_services
    verify
    
    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}  回滚完成！${NC}"
    echo -e "${GREEN}======================================${NC}"
}

# 执行
main "$@"
