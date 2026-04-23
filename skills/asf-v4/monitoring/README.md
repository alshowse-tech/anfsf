# 📊 ANFSF Grafana 监控仪表盘

**版本**: 1.0  
**日期**: 2026-04-23  
**状态**: ✅ 完成

---

## 🚀 快速启动

### 1. 启动监控服务

```bash
cd skills/asf-v4/monitoring
docker-compose up -d
```

### 2. 访问服务

| 服务 | URL | 用户名/密码 |
|------|-----|-----------|
| Grafana | http://localhost:3000 | admin / anfsf123 |
| Prometheus | http://localhost:9090 | - |
| Node Exporter | http://localhost:9100 | - |

### 3. 查看仪表盘

登录 Grafana 后，导航到：
- **Dashboards** → **ANFSF** 文件夹
- 选择要查看的仪表盘

---

## 📈 可用仪表盘

### 1. 系统健康监控 (System Health)

**UID**: `anfsf-system-health`

**监控内容**:
- CPU 使用率
- 内存使用率
- 磁盘使用率
- CPU 核心数
- CPU 使用趋势
- 内存使用趋势

**刷新频率**: 30s

---

### 2. 测试覆盖率 (Test Coverage)

**UID**: `anfsf-test-coverage`

**监控内容**:
- 行覆盖率
- 分支覆盖率
- 函数覆盖率
- 语句覆盖率
- 覆盖率趋势
- 测试总数
- 失败测试数

**刷新频率**: 1m

---

### 3. KPI 监控 (KPI Monitoring)

**UID**: `anfsf-kpi-monitoring`

**监控内容**:
- 平均响应延迟
- 成功率
- 吞吐量

**刷新频率**: 30s

---

## 🔔 告警规则

### 配置位置

`prometheus/alerts.yml`

### 告警类型

| 告警名称 | 阈值 | 严重性 |
|---------|------|--------|
| HighLatency | >1s (5m) | Warning |
| HighErrorRate | >5% (5m) | Critical |
| ServiceDown | up=0 (1m) | Critical |
| HighMemoryUsage | >90% (5m) | Warning |
| HighCPUUsage | >80% (5m) | Warning |
| LowTestCoverage | <90% (1h) | Warning |
| HighTestFailureRate | >10% (30m) | Warning |
| LowDiskSpace | <10% (5m) | Critical |

---

## 📁 文件结构

```
monitoring/
├── docker-compose.yml          # Docker Compose 配置
├── prometheus/
│   ├── prometheus.yml          # Prometheus 配置
│   └── alerts.yml              # 告警规则
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasources.yml # 数据源配置
│   │   └── dashboards/
│   │       └── dashboards.yml  # 仪表盘配置
│   └── dashboards/
│       ├── system-health.json  # 系统健康仪表盘
│       ├── test-coverage.json  # 测试覆盖率仪表盘
│       └── kpi-monitoring.json # KPI 监控仪表盘
└── README.md                   # 本文档
```

---

## 🔧 自定义配置

### 添加新仪表盘

1. 在 Grafana UI 中创建仪表盘
2. 点击 **Dashboard Settings** → **JSON Model**
3. 复制 JSON 内容
4. 保存为 `grafana/dashboards/your-dashboard.json`
5. Grafana 会自动加载 (30s 内)

### 修改数据源

编辑 `grafana/provisioning/datasources/datasources.yml`

### 修改告警规则

编辑 `prometheus/alerts.yml`，然后重新加载 Prometheus：

```bash
curl -X POST http://localhost:9090/-/reload
```

---

## 🛠 故障排查

### Grafana 无法启动

```bash
docker-compose logs grafana
```

### Prometheus 无法抓取指标

检查 `prometheus.yml` 配置，确保 targets 正确。

### 仪表盘未加载

检查 `grafana/provisioning/dashboards/dashboards.yml` 配置。

---

## 📊 指标说明

### 系统指标 (Node Exporter)

- `node_cpu_seconds_total` - CPU 使用时间
- `node_memory_MemTotal_bytes` - 总内存
- `node_memory_MemAvailable_bytes` - 可用内存
- `node_filesystem_avail_bytes` - 可用磁盘空间

### 测试指标 (Vitest)

- `test_coverage_lines` - 行覆盖率
- `test_coverage_branches` - 分支覆盖率
- `test_coverage_functions` - 函数覆盖率
- `test_coverage_statements` - 语句覆盖率
- `test_total` - 测试总数
- `test_failures` - 失败测试数

### 应用指标 (ANFSF)

- `anfsf_request_latency_ms` - 请求延迟
- `anfsf_success_rate` - 成功率
- `anfsf_requests_total` - 请求总数

---

**签字**: 格格 👸  
**日期**: 2026-04-23 23:30  
**状态**: ✅ Grafana 仪表盘完成
