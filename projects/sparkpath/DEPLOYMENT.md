# SparkPath 生产环境部署指南

**文档版本**: 1.0  
**更新日期**: 2026-04-16

---

## 📋 前置要求

### 硬件要求
| 组件 | 最低配置 | 推荐配置 |
|------|---------|---------|
| **CPU** | 4 核 | 8 核+ |
| **内存** | 8GB | 16GB+ |
| **存储** | 50GB | 100GB+ SSD |
| **网络** | 100Mbps | 1Gbps+ |

### 软件要求
- Docker 20.10+
- Docker Compose 2.0+
- OpenSSL 1.1.1+
- Bash 4.0+

---

## 🚀 快速部署

### 1. 克隆项目
```bash
git clone <repo-url> sparkpath
cd sparkpath
```

### 2. 配置环境变量
```bash
cp .env.prod.example .env.prod
# 编辑 .env.prod 修改配置
vim .env.prod
```

### 3. 执行部署脚本
```bash
chmod +x scripts/deploy-prod.sh
./scripts/deploy-prod.sh
```

### 4. 验证部署
```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 健康检查
curl http://localhost/health
```

---

## 🔧 手动部署

### 1. 创建目录
```bash
mkdir -p nginx/ssl nginx/logs
mkdir -p monitoring/prometheus monitoring/grafana/dashboards
mkdir -p monitoring/logstash/pipeline
mkdir -p storage
```

### 2. 生成 SSL 证书
```bash
# API 证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/api.sparkpath.com.key \
    -out nginx/ssl/api.sparkpath.com.crt \
    -subj "/C=CN/ST=Shanghai/L=Shanghai/O=SparkPath/CN=api.sparkpath.com"

# Web 证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/sparkpath.com.key \
    -out nginx/ssl/sparkpath.com.crt \
    -subj "/C=CN/ST=Shanghai/L=Shanghai/O=SparkPath/CN=sparkpath.com"
```

### 3. 启动服务
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 4. 初始化数据库
```bash
# 等待 Neo4j 启动
sleep 10

# 导入 Schema
docker exec -i sparkpath-neo4j cypher-shell -u neo4j -p 'SparkPath2026!' < data/neo4j/schema.cypher
```

---

## 📊 服务访问

| 服务 | 地址 | 账号/密码 |
|------|------|----------|
| **Web 前端** | https://sparkpath.com | - |
| **API 服务** | https://api.sparkpath.com | - |
| **Grafana** | http://localhost:3000 | admin / SparkPath2026! |
| **Prometheus** | http://localhost:9090 | - |
| **Kibana** | http://localhost:5601 | - |
| **Neo4j** | http://localhost:7474 | neo4j / SparkPath2026! |
| **Redis** | localhost:6379 | SparkPath2026! |

---

## 🔍 监控与日志

### Prometheus 指标
- Neo4j 性能指标
- Redis 缓存指标
- Nginx 请求指标
- 系统资源指标

### Grafana 仪表板
- 系统概览
- API 性能
- 数据库性能
- 缓存性能

### 日志查看
```bash
# 查看所有日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f neo4j
docker-compose -f docker-compose.prod.yml logs -f nginx
```

---

## 🛡️ 安全配置

### 防火墙配置
```bash
# 允许 HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# 允许 SSH
ufw allow 22/tcp

# 启用防火墙
ufw enable
```

### SSL/TLS 配置
- 使用强加密套件
- 启用 HSTS
- 定期更新证书

### 数据库安全
- 修改默认密码
- 限制网络访问
- 启用审计日志

---

## 🔄 更新与备份

### 更新服务
```bash
# 拉取最新代码
git pull

# 重新构建并重启
docker-compose -f docker-compose.prod.yml up -d --build
```

### 备份数据
```bash
# Neo4j 备份
docker exec sparkpath-neo4j neo4j-admin dump --to=/backups/neo4j-backup.dump

# Redis 备份
docker exec sparkpath-redis redis-cli BGSAVE

# 下载备份
docker cp sparkpath-neo4j:/backups/neo4j-backup.dump ./backups/
```

### 恢复数据
```bash
# Neo4j 恢复
docker cp ./backups/neo4j-backup.dump sparkpath-neo4j:/backups/
docker exec sparkpath-neo4j neo4j-admin load --from=/backups/neo4j-backup.dump --force
```

---

## 🐛 故障排查

### 常见问题

#### 1. 服务无法启动
```bash
# 检查 Docker 状态
systemctl status docker

# 查看服务日志
docker-compose -f docker-compose.prod.yml logs

# 检查端口占用
netstat -tlnp | grep :7474
netstat -tlnp | grep :6379
```

#### 2. 数据库连接失败
```bash
# 检查 Neo4j 状态
docker exec sparkpath-neo4j neo4j status

# 测试连接
docker exec sparkpath-neo4j cypher-shell -u neo4j -p 'SparkPath2026!' "RETURN 1"
```

#### 3. 内存不足
```bash
# 查看内存使用
docker stats

# 调整 Neo4j 内存
# 编辑 docker-compose.prod.yml 中的 NEO4J_dbms_memory_* 配置
```

---

## 📈 性能优化

### Neo4j 优化
```yaml
# 调整堆内存
NEO4J_dbms_memory_heap_initial__size=2G
NEO4J_dbms_memory_heap_max__size=4G

# 调整页面缓存
NEO4J_dbms_memory_pagecache_size=1G
```

### Redis 优化
```yaml
# 启用持久化
appendonly yes

# 调整内存策略
maxmemory-policy allkeys-lru
```

### Nginx 优化
```nginx
# 调整 worker 数量
worker_processes auto;

# 调整连接数
worker_connections 2048;
```

---

## 📞 技术支持

- **文档**: https://docs.sparkpath.com
- **Issues**: https://github.com/sparkpath/sparkpath/issues
- **邮箱**: support@sparkpath.com

---

**部署完成时间**: 约 10-15 分钟  
**首次启动时间**: 约 2-3 分钟
