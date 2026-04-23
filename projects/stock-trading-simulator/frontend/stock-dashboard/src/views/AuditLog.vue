<template>
  <div class="audit-log">
    <!-- Stats -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-label">总日志数</div>
            <div class="stat-value">{{ stats.total }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-label">错误数</div>
            <div class="stat-value text-danger">{{ stats.errors }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-label">警告数</div>
            <div class="stat-value text-warning">{{ stats.warnings }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-label">今日新增</div>
            <div class="stat-value">{{ stats.today }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-label">关键错误</div>
            <div class="stat-value text-danger">{{ stats.critical }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-label">平均响应</div>
            <div class="stat-value">{{ stats.avgResponse }}ms</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Filters -->
    <el-card shadow="hover" style="margin-top: 16px">
      <div class="filter-container">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="loadLogs"
        />
        <el-select
          v-model="filterLevel"
          placeholder="日志级别"
          style="margin-left: 16px"
          clearable
          @change="loadLogs"
        >
          <el-option label="DEBUG" value="DEBUG" />
          <el-option label="INFO" value="INFO" />
          <el-option label="WARN" value="WARN" />
          <el-option label="ERROR" value="ERROR" />
          <el-option label="FATAL" value="FATAL" />
        </el-select>
        <el-select
          v-model="filterModule"
          placeholder="模块"
          style="margin-left: 16px"
          clearable
          @change="loadLogs"
        >
          <el-option label="数据接入" value="data" />
          <el-option label="指标计算" value="indicator" />
          <el-option label="规则引擎" value="rule" />
          <el-option label="交易执行" value="trading" />
          <el-option label="风控系统" value="risk" />
        </el-select>
        <el-input
          v-model="searchStock"
          placeholder="搜索股票代码/名称"
          style="margin-left: 16px; width: 200px"
          clearable
          @keyup.enter="loadLogs"
        />
        <el-input
          v-model="searchKeyword"
          placeholder="搜索日志内容"
          style="margin-left: 16px; width: 200px"
          clearable
          @keyup.enter="loadLogs"
        />
        <el-button type="primary" style="margin-left: 16px" @click="loadLogs">
          查询
        </el-button>
        <el-button type="success" @click="exportLogs">
          导出
        </el-button>
      </div>
    </el-card>

    <!-- Log List -->
    <el-card shadow="hover" style="margin-top: 16px">
      <template #header>
        <div class="card-header">
          <span>审计日志</span>
          <el-button type="primary" size="small" @click="loadLogs">
            刷新
          </el-button>
        </div>
      </template>
      <el-table :data="logs" style="width: 100%" stripe v-loading="loading">
        <el-table-column prop="timestamp" label="时间" width="180" sortable />
        <el-table-column prop="level" label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.level)" size="small">
              {{ row.level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="120" />
        <el-table-column prop="symbol" label="股票代码" width="100" />
        <el-table-column prop="stock_name" label="股票名称" width="120" />
        <el-table-column prop="message" label="消息" show-overflow-tooltip />
        <el-table-column prop="user" label="用户" width="100" />
        <el-table-column prop="trace_id" label="Trace ID" width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetails(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="loadLogs"
          @current-change="loadLogs"
        />
      </div>
    </el-card>

    <!-- Log Trend Chart -->
    <el-card shadow="hover" style="margin-top: 16px">
      <template #header>
        <span>日志趋势</span>
      </template>
      <div ref="logChartRef" style="height: 300px"></div>
    </el-card>

    <!-- Details Dialog -->
    <el-dialog v-model="detailsVisible" title="日志详情" width="600px">
      <el-descriptions :column="1" border v-if="selectedLog">
        <el-descriptions-item label="时间">{{ selectedLog.timestamp }}</el-descriptions-item>
        <el-descriptions-item label="级别">
          <el-tag :type="getLevelType(selectedLog.level)" size="small">
            {{ selectedLog.level }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="模块">{{ selectedLog.module }}</el-descriptions-item>
        <el-descriptions-item label="股票">
          {{ selectedLog.symbol || '-' }} {{ selectedLog.stock_name ? `- ${selectedLog.stock_name}` : '' }}
        </el-descriptions-item>
        <el-descriptions-item label="消息">{{ selectedLog.message }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ selectedLog.user || '-' }}</el-descriptions-item>
        <el-descriptions-item label="IP">{{ selectedLog.ip || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Trace ID">{{ selectedLog.trace_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="详情">
          <pre>{{ JSON.stringify(selectedLog.details, null, 2) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { getStockName } from '@/services/stockService'

// Stats
const stats = ref({
  total: 12580,
  errors: 156,
  warnings: 892,
  today: 345,
  critical: 8,
  avgResponse: 125
})

// Filters
const dateRange = ref<[Date, Date]>()
const filterLevel = ref('')
const filterModule = ref('')
const searchStock = ref('')
const searchKeyword = ref('')

// Table data
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(12580)

const logs = ref([
  {
    id: '1',
    timestamp: '2026-04-23T09:30:15+08:00',
    level: 'ERROR',
    module: 'trading',
    message: '模拟委托失败：资金不足',
    symbol: '300308.SZ',
    stock_name: '中际旭创',
    user: 'system',
    ip: '127.0.0.1',
    trace_id: 'trace-001',
    details: { symbol: '300308.SZ', stock_name: '中际旭创', required: 125000, available: 100000 }
  },
  {
    id: '2',
    timestamp: '2026-04-23T09:25:30+08:00',
    level: 'WARN',
    module: 'rule',
    message: '规则计算超时，降级处理',
    symbol: '',
    stock_name: '',
    user: 'system',
    ip: '127.0.0.1',
    trace_id: 'trace-002',
    details: { duration_ms: 12500, threshold_ms: 10000 }
  },
  {
    id: '3',
    timestamp: '2026-04-23T09:20:00+08:00',
    level: 'INFO',
    module: 'data',
    message: '分钟线数据拉取完成',
    symbol: '',
    stock_name: '',
    user: 'system',
    ip: '127.0.0.1',
    trace_id: 'trace-003',
    details: { symbols: 50, bars: 6000 }
  },
  {
    id: '4',
    timestamp: '2026-04-23T09:15:45+08:00',
    level: 'DEBUG',
    module: 'indicator',
    message: 'RPS 因子计算完成',
    symbol: '300750.SZ',
    stock_name: '宁德时代',
    user: 'system',
    ip: '127.0.0.1',
    trace_id: 'trace-004',
    details: { duration_ms: 250 }
  },
  {
    id: '5',
    timestamp: '2026-04-23T09:10:20+08:00',
    level: 'ERROR',
    module: 'risk',
    message: '仓位超限告警',
    symbol: '300502.SZ',
    stock_name: '新易盛',
    user: 'admin',
    ip: '192.168.1.100',
    trace_id: 'trace-005',
    details: { symbol: '300502.SZ', stock_name: '新易盛', current_pct: 45, limit_pct: 40 }
  }
])

const detailsVisible = ref(false)
const selectedLog = ref<any>(null)
const logChartRef = ref<HTMLElement>()

// 加载股票名称
async function loadStockNames() {
  const symbols = [...new Set(logs.value.map(log => log.symbol).filter(Boolean))]
  for (const symbol of symbols) {
    const name = await getStockName(symbol)
    if (name) {
      const log = logs.value.find(l => l.symbol === symbol)
      if (log && !log.stock_name) {
        log.stock_name = name
      }
    }
  }
}

onMounted(() => {
  loadStockNames()
})

// Methods
const getLevelType = (level: string) => {
  switch (level) {
    case 'DEBUG': return 'info'
    case 'INFO': return 'success'
    case 'WARN': return 'warning'
    case 'ERROR': return 'danger'
    case 'FATAL': return 'danger'
    default: return ''
  }
}

const loadLogs = () => {
  loading.value = true
  // TODO: Call API
  setTimeout(() => {
    loading.value = false
  }, 500)
}

const exportLogs = () => {
  // TODO: Export to CSV
  console.log('Exporting logs...')
}

const viewDetails = (log: any) => {
  selectedLog.value = log
  detailsVisible.value = true
}

const initLogChart = () => {
  if (!logChartRef.value) return
  
  const chart = echarts.init(logChartRef.value)
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' }
    },
    legend: {
      data: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['04-17', '04-18', '04-19', '04-20', '04-21', '04-22', '04-23']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'DEBUG',
        type: 'line',
        stack: 'Total',
        data: [120, 132, 101, 134, 90, 230, 210],
        itemStyle: { color: '#909399' }
      },
      {
        name: 'INFO',
        type: 'line',
        stack: 'Total',
        data: [220, 182, 191, 234, 290, 330, 310],
        itemStyle: { color: '#67c23a' }
      },
      {
        name: 'WARN',
        type: 'line',
        stack: 'Total',
        data: [150, 232, 201, 154, 190, 330, 410],
        itemStyle: { color: '#e6a23c' }
      },
      {
        name: 'ERROR',
        type: 'line',
        stack: 'Total',
        data: [12, 22, 31, 14, 10, 30, 21],
        itemStyle: { color: '#f56c6c' }
      },
      {
        name: 'FATAL',
        type: 'line',
        stack: 'Total',
        data: [1, 2, 1, 0, 1, 2, 1],
        itemStyle: { color: '#722ed1' }
      }
    ]
  }
  chart.setOption(option)
}

onMounted(() => {
  nextTick(() => {
    initLogChart()
  })
  
  window.addEventListener('resize', () => {
    logChartRef.value && echarts.getInstanceByDom(logChartRef.value)?.resize()
  })
})
</script>

<style scoped>
.audit-log {
  padding: 20px;
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
}

.stat-label {
  color: #909399;
  font-size: 14px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
}

.text-danger {
  color: #f56c6c;
}

.text-warning {
  color: #e6a23c;
}

.filter-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

pre {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  max-height: 300px;
  overflow: auto;
}
</style>
