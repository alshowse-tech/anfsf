# 🎯 演示环境部署指南

**版本**: V1.0  
**更新时间**: 2026-04-23  
**状态**: Phase 1-7 完成，演示环境就绪

---

## 📋 系统要求

### 硬件要求
- CPU: 4 核以上
- 内存：8GB 以上
- 磁盘：20GB 可用空间
- 网络：可访问外网 (下载依赖)

### 软件要求
- Docker 20.10+
- Docker Compose 2.0+
- 或 Node.js 20+ 和 Python 3.10+

---

## 🚀 快速部署

### 方式一：Docker Compose (推荐)

```bash
cd /root/.openclaw/workspace-main/projects/stock-trading-simulator

# 一键启动生产环境
./start.sh prod

# 查看服务状态
./start.sh status

# 查看日志
docker-compose logs -f

# 停止服务
./start.sh stop
```

### 方式二：开发模式

```bash
# 启动开发环境
./start.sh dev
```

这将启动：
- 前端开发服务器：http://localhost:3000
- 后端 API 服务器：http://localhost:8000
- PostgreSQL 数据库：localhost:5432
- Redis 缓存：localhost:6379

---

## 🌐 访问演示环境

### 前端界面
- **地址**: http://localhost:3000 (开发) 或 http://localhost (生产)
- **功能**:
  - 实时监控仪表盘
  - 规则命中日志
  - 个股诊断
  - 回测对比
  - 审计日志
  - 告警中心

### 后端 API
- **地址**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### WebSocket
- **地址**: ws://localhost:8000/ws
- **用途**: 实时行情推送、交易信号推送

---

## 🧪 测试演示

### 1. 健康检查
```bash
curl http://localhost:8000/api/health
```

### 2. 获取个股诊断
```bash
# 无需认证
curl http://localhost:8000/api/screener/symbol/300308.SZ
```

### 3. 访问前端
浏览器打开 http://localhost:3000

---

## 📁 目录结构

```
stock-trading-simulator/
├── backend/                 # FastAPI 后端
│   ├── main.py             # 主应用
│   ├── config.py           # 配置
│   ├── models.py           # 数据模型
│   ├── auth.py             # 认证
│   ├── api/                # API 路由
│   └── tests/              # 测试
├── frontend/
│   └── stock-dashboard/    # Vue 3 前端
│       ├── src/
│       ├── public/
│       └── dist/           # 构建产物
├── sql/                     # 数据库脚本
│   ├── schema.sql          # 建表
│   └── data-import.sql     # 数据
├── nginx/                   # Nginx 配置
├── docker-compose.yml       # Docker 编排
├── start.sh                 # 启动脚本
└── docs/                    # 文档
```

---

## 🔧 常见问题

### 端口被占用
```bash
# 查看端口占用
lsof -i :8000
lsof -i :3000

# 停止占用进程
kill -9 <PID>
```

### Docker 启动失败
```bash
# 清理 Docker 资源
docker-compose down -v
docker system prune -a

# 重新启动
./start.sh prod
```

### 数据库连接失败
```bash
# 检查 PostgreSQL 状态
docker-compose ps postgres

# 查看日志
docker-compose logs postgres
```

---

## 📊 性能指标

### 前端
- 首屏加载：< 2s
- 页面响应：< 500ms
- 图表渲染：60fps

### 后端
- API 响应：< 100ms
- WebSocket 延迟：< 50ms
- 并发支持：1000+ 连接

### 数据库
- 查询响应：< 10ms
- 连接池：10-20 连接

---

## 🎯 下一步

### Phase 8+ (可选扩展)
- [ ] 实时数据源接入 (AkShare/TuShare)
- [ ] 定时任务调度 (APScheduler)
- [ ] 监控告警 (Prometheus + Grafana)
- [ ] CI/CD 流水线
- [ ] 多环境部署 (dev/staging/prod)

---

## 📞 技术支持

**项目文档**: `docs/` 目录  
**API 文档**: http://localhost:8000/docs  
**问题反馈**: GitHub Issues

---

**签字**: 格格 👸  
**日期**: 2026-04-23  
**版本**: V1.0
