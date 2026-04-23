# 🚀 股票操盘模拟系统 - 快速启动指南

**版本**: V1.0  
**最后更新**: 2026-04-23  
**状态**: Phase 5 前端 100% 完成，等待后端联调

---

## 📋 前置要求

### 系统要求
- Node.js >= 20.19.0 或 >= 22.12.0
- Python >= 3.10 (后端)
- PostgreSQL >= 14
- Redis >= 6

### 端口要求
- 前端开发服务器：3000
- 后端 FastAPI：8000
- PostgreSQL：5432
- Redis：6379

---

## 🔧 快速启动 (开发模式)

### 1. 启动数据库和缓存

```bash
# 启动 PostgreSQL
sudo systemctl start postgresql

# 启动 Redis
sudo systemctl start redis

# 或者使用 Docker
docker run -d --name redis -p 6379:6379 redis:latest
```

### 2. 初始化数据库

```bash
cd /root/.openclaw/workspace-main/projects/stock-trading-simulator

# 创建数据库
psql -U postgres -c "CREATE DATABASE stock_trading;"

# 执行建表脚本
psql -U postgres -d stock_trading -f sql/schema.sql

# 导入示例数据 (可选)
psql -U postgres -d stock_trading -f sql/data-import.sql
```

### 3. 启动前端 (终端 1)

```bash
cd /root/.openclaw/workspace-main/projects/stock-trading-simulator/frontend/stock-dashboard

# 安装依赖 (首次运行)
npm install

# 启动开发服务器
npm run dev
```

访问：http://localhost:3000

### 4. 启动后端 (终端 2) - 待实现

```bash
cd /root/.openclaw/workspace-main/projects/stock-trading-simulator/backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install fastapi uvicorn pandas numpy redis psycopg2-binary akshare

# 启动 FastAPI
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API 文档：http://localhost:8000/docs

---

## 🧪 运行测试

### 前端测试

```bash
cd frontend/stock-dashboard

# 运行所有测试
npm run test:run

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test
```

### 后端测试 - 待实现

```bash
cd backend

# 运行 pytest
pytest
```

---

## 📦 生产构建

### 前端构建

```bash
cd frontend/stock-dashboard

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

输出目录：`dist/`

### 部署到 Nginx

```nginx
server {
    listen 80;
    server_name stock.example.com;

    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 🔍 故障排查

### 前端无法启动

```bash
# 检查 Node.js 版本
node --version

# 清理缓存
rm -rf node_modules package-lock.json
npm install
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 检查连接
psql -U postgres -d stock_trading -c "SELECT 1;"
```

### Redis 连接失败

```bash
# 检查 Redis 状态
sudo systemctl status redis

# 测试连接
redis-cli ping
```

### WebSocket 连接失败

1. 确保后端已启动
2. 检查防火墙设置
3. 查看浏览器控制台错误信息

---

## 📁 项目结构

```
stock-trading-simulator/
├── backend/                    # Python 后端 (待实现)
│   ├── phase1_data_access.py   # 数据接入层
│   ├── phase2_indicators.py    # 指标计算
│   ├── phase3_backtrader.py    # 回测引擎
│   └── phase4_realtime.py      # 实时信号
├── frontend/
│   └── stock-dashboard/        # Vue 3 前端 ✅
│       ├── src/
│       │   ├── views/          # 页面组件
│       │   ├── components/     # 通用组件
│       │   ├── stores/         # Pinia 状态管理
│       │   ├── api/            # API 服务层
│       │   ├── services/       # WebSocket 等服务
│       │   └── router/         # 路由配置
│       └── dist/               # 生产构建输出
├── sql/
│   ├── schema.sql              # 建表脚本
│   └── data-import.sql         # 数据导入
├── fastapi/
│   └── APISPEC.md              # API 接口定义
└── docs/
    ├── scheduling.md           # 调度方案
    ├── frontend-dashboard-design.md  # 前端设计
    └── DEVELOPMENT-PROGRESS.md # 开发进度
```

---

## 🎯 功能清单

### ✅ 已完成 (Phase 1-5)

| 模块 | 功能 | 状态 |
|------|------|------|
| **Phase 1** | 数据接入层 | ✅ Python 实现 |
| **Phase 2** | 指标计算引擎 | ✅ Python 实现 |
| **Phase 3** | 回测引擎 | ✅ Backtrader |
| **Phase 4** | 实时信号生成 | ✅ Python 实现 |
| **Phase 5** | 前端看板 | ✅ Vue 3 + ECharts |

### 前端页面

| 页面 | 功能 | 状态 |
|------|------|------|
| 实时监控 | 账户/持仓/信号/风控 | ✅ 完成 |
| 规则命中 | 规则日志展示 | ✅ 完成 |
| 个股诊断 | RPS/指标/交易建议 | ✅ 完成 |
| 回测对比 | 净值/回撤/月度图表 | ✅ 完成 |
| 审计日志 | 日志列表/趋势/导出 | ✅ 完成 |
| 告警中心 | 告警管理/统计/趋势 | ✅ 完成 |

### ⏳ 待实现

- [ ] 后端 FastAPI 接口
- [ ] WebSocket 服务端
- [ ] 前后端联调
- [ ] 部署脚本

---

## 📞 技术支持

**项目文档**: `docs/` 目录  
**API 文档**: http://localhost:8000/docs (后端启动后)  
**开发进度**: `docs/DEVELOPMENT-PROGRESS.md`

---

**签字**: 格格 👸  
**日期**: 2026-04-23  
**版本**: V1.0
