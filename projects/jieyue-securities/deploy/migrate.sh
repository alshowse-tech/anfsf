#!/bin/bash
# 数据库迁移脚本 - JieYue Securities

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  数据库迁移脚本${NC}"
echo -e "${GREEN}======================================${NC}"

# 获取迁移目录
MIGRATIONS_DIR="${PROJECT_DIR:-.}/backend/src/db/migrations"

# 创建迁移
create_migration() {
    MIGRATION_NAME="$1"
    
    if [ -z "$MIGRATION_NAME" ]; then
        echo -e "${RED}错误：请提供迁移名称${NC}"
        echo "用法：$0 create <migration_name>"
        exit 1
    fi
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    MIGRATION_FILE="${MIGRATIONS_DIR}/${TIMESTAMP}_${MIGRATION_NAME}.py"
    
    cat > "${MIGRATION_FILE}" << EOF
"""
Migration: ${MIGRATION_NAME}
Created: ${TIMESTAMP}
"""

from sqlalchemy import text

def upgrade(connection):
    """
    升级操作
    """
    # 示例：添加列
    # connection.execute(text("ALTER TABLE users ADD COLUMN nickname VARCHAR(100)"))
    pass

def downgrade(connection):
    """
    降级操作
    """
    # 示例：删除列
    # connection.execute(text("ALTER TABLE users DROP COLUMN nickname"))
    pass
EOF
    
    echo -e "${GREEN}✓ 迁移文件已创建：${MIGRATION_FILE}${NC}"
}

# 执行迁移
run_migrations() {
    echo -e "${YELLOW}执行数据库迁移...${NC}"
    
    # 使用 Alembic 或自定义迁移逻辑
    cd "${PROJECT_DIR:-.}/backend"
    
    if command -v alembic &> /dev/null; then
        alembic upgrade head
    else
        echo -e "${YELLOW}Alembic 未安装，使用自定义迁移...${NC}"
        python -m src.db.migrate
    fi
    
    echo -e "${GREEN}✓ 迁移完成${NC}"
}

# 回滚迁移
rollback() {
    STEPS="${1:-1}"
    
    echo -e "${YELLOW}回滚 ${STEPS} 步迁移...${NC}"
    
    cd "${PROJECT_DIR:-.}/backend"
    
    if command -v alembic &> /dev/null; then
        alembic downgrade -${STEPS}
    else
        echo -e "${RED}错误：自定义迁移不支持回滚${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 回滚完成${NC}"
}

# 显示迁移状态
show_status() {
    echo -e "${YELLOW}迁移状态:${NC}"
    
    cd "${PROJECT_DIR:-.}/backend"
    
    if command -v alembic &> /dev/null; then
        alembic current
        echo ""
        alembic history
    else
        echo "Alembic 未安装"
    fi
}

# 主流程
case "$1" in
    create)
        create_migration "$2"
        ;;
    migrate|upgrade)
        run_migrations
        ;;
    rollback|downgrade)
        rollback "$2"
        ;;
    status)
        show_status
        ;;
    *)
        echo "用法：$0 {create|upgrade|rollback|status} [args]"
        echo ""
        echo "命令:"
        echo "  create <name>     创建新迁移"
        echo "  upgrade           执行所有迁移"
        echo "  rollback [steps]  回滚迁移 (默认 1 步)"
        echo "  status            显示迁移状态"
        exit 1
        ;;
esac
