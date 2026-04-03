# 捷阅证券信息助手 - 运维手册

## 目录

1. [日常运维](#日常运维)
2. [监控告警](#监控告警)
3. [日志管理](#日志管理)
4. [备份恢复](#备份恢复)
5. [故障处理](#故障处理)
6. [性能优化](#性能优化)

---

## 日常运维

### 服务状态检查

```bash
# 查看所有服务状态
docker-compose ps

# 查看特定服务状态
docker-compose ps backend

# 查看服务日志
docker-compose logs -f backend
```

### 服务启停

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启特定服务
docker-compose restart backend

# 重新构建并启动
docker-compose up -d --build backend
```

### 资源监控

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df

# 清理无用资源
docker system prune -a
```

---

## 监控告警

### Prometheus 指标

**关键指标**:

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| `http_requests_total` | 请求总数 | - |
| `http_request_duration_seconds` | 请求延迟 | p99 > 2s |
| `task_processing_total` | 任务处理数 | - |
| `task_failure_rate` | 任务失败率 | > 5% |
| `asr_api_calls_total` | ASR 调用数 | - |
| `asr_failure_rate` | ASR 失败率 | > 10% |

### 告警规则

```yaml
# prometheus/rules/alerts.yml
groups:
  - name: jieyue_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "高错误率"
          description: "5 分钟错误率超过 10%"
      
      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "高延迟"
          description: "P99 延迟超过 2 秒"
      
      - alert: DatabaseDown
        expr: mysql_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "数据库不可用"
```

### Grafana 仪表板

访问 http://localhost:3001 查看 Grafana

**预置仪表板**:
1. 系统概览
2. API 性能
3. 任务处理
4. 支付监控
5. 用户活跃

---

## 日志管理

### 日志位置

```bash
# 应用日志
/var/log/jieyue/backend/

# Nginx 日志
/var/log/nginx/

# Docker 日志
docker-compose logs > /var/log/jieyue/docker.log
```

### 日志收集

```yaml
# Filebeat 配置
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/jieyue/backend/*.log
    json.keys_under_root: true
    
  - type: log
    enabled: true
    paths:
      - /var/log/nginx/*.log
```

### 日志轮转

```bash
# /etc/logrotate.d/jieyue
/var/log/jieyue/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
```

### 日志查询 (Kibana)

访问 http://localhost:5601 查看 Kibana

**常用查询**:
```
# 错误日志
service: backend AND level: ERROR

# 特定用户
user_id: 123

# 特定时间段
@timestamp:[2024-01-01T00:00:00Z TO 2024-01-01T23:59:59Z]

# 慢请求
response_time:>2000
```

---

## 备份恢复

### 数据库备份

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/jieyue"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p ${BACKUP_DIR}

# 备份数据库
docker-compose exec -T mysql mysqldump -uroot -proot \
  --single-transaction \
  --routines \
  --triggers \
  jieyue_securities > ${BACKUP_DIR}/db_${TIMESTAMP}.sql

# 压缩备份
gzip ${BACKUP_DIR}/db_${TIMESTAMP}.sql

# 清理 30 天前的备份
find ${BACKUP_DIR} -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: db_${TIMESTAMP}.sql.gz"
```

### 数据库恢复

```bash
# 解压备份
gunzip db_20240101_120000.sql.gz

# 恢复数据
cat db_20240101_120000.sql | docker-compose exec -T mysql mysql -uroot -proot jieyue_securities
```

### 配置文件备份

```bash
# 备份配置
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
  .env \
  docker-compose.yml \
  monitoring/ \
  deploy/
```

---

## 故障处理

### 常见故障

#### 1. 数据库连接失败

**症状**: 后端启动失败，报错"MySQL Connection refused"

**排查**:
```bash
# 检查 MySQL 状态
docker-compose ps mysql

# 查看 MySQL 日志
docker-compose logs mysql

# 测试连接
docker-compose exec mysql mysqladmin ping -uroot -proot
```

**解决**:
```bash
# 重启 MySQL
docker-compose restart mysql

# 检查磁盘空间
df -h

# 检查连接数
docker-compose exec mysql mysql -uroot -proot -e "SHOW PROCESSLIST"
```

#### 2. 任务处理卡住

**症状**: 任务长时间处于"处理中"状态

**排查**:
```bash
# 查看队列状态
docker-compose exec redis redis-cli llen queue_parse
docker-compose exec redis redis-cli llen queue_asr

# 查看处理器日志
docker-compose logs -f processor
```

**解决**:
```bash
# 重启队列处理器
docker-compose restart processor

# 清理卡住的任务
docker-compose exec redis redis-cli del queue_parse
```

#### 3. 支付回调失败

**症状**: 用户支付成功但余额未到账

**排查**:
```bash
# 查看支付日志
grep "payment" /var/log/jieyue/backend/*.log

# 检查回调记录
docker-compose exec mysql mysql -uroot -proot -e \
  "SELECT * FROM jieyue_securities.transactions WHERE status='INIT' LIMIT 10"
```

**解决**:
```bash
# 手动查询支付状态
curl -X GET https://api.weixin.qq.com/pay/orderquery...

# 手动更新订单状态
docker-compose exec mysql mysql -uroot -proot -e \
  "UPDATE transactions SET status='SUCCESS' WHERE order_id='xxx'"
```

### 应急预案

#### 服务完全不可用

```bash
# 1. 停止所有服务
docker-compose down

# 2. 清理网络
docker network prune -f

# 3. 重新启动
docker-compose up -d

# 4. 检查服务
docker-compose ps
```

#### 数据丢失

```bash
# 1. 停止服务
docker-compose down

# 2. 恢复最新备份
gunzip -c /backups/jieyue/db_latest.sql.gz | \
  docker-compose exec -T mysql mysql -uroot -proot jieyue_securities

# 3. 重启服务
docker-compose up -d
```

---

## 性能优化

### 数据库优化

```sql
-- 分析慢查询
SELECT * FROM mysql.slow_log;

-- 优化表
OPTIMIZE TABLE tasks;
OPTIMIZE TABLE transactions;

-- 添加索引
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_transactions_user_time ON transactions(user_id, created_at);
```

### Redis 优化

```bash
# 设置内存限制
redis-cli CONFIG SET maxmemory 2gb

# 设置淘汰策略
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# 查看内存使用
redis-cli INFO memory
```

### 应用优化

```bash
# 调整 worker 数量
export WORKERS=4

# 调整连接池
export DATABASE_POOL_SIZE=20
export DATABASE_MAX_OVERFLOW=10
```

---

## 联系支持

- **紧急故障**: 电话联系值班人员
- **技术支持**: support@jieyue.com
- **文档**: https://docs.jieyue.com

---

**最后更新**: 2026-04-01  
**版本**: v1.0.0
