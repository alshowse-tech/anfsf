<template>
  <div class="alert-center">
    <el-row :gutter="16">
      <!-- Alert Stats -->
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-label">总告警数</div>
            <div class="stat-value">{{ stats.total }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-label">待处理</div>
            <div class="stat-value text-warning">{{ stats.pending }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-label">严重</div>
            <div class="stat-value text-danger">{{ stats.critical }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-label">警告</div>
            <div class="stat-value text-warning">{{ stats.warning }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Filters -->
    <el-card shadow="hover" style="margin-top: 16px">
      <div class="filter-container">
        <el-radio-group v-model="filterStatus" size="default">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="pending">待处理</el-radio-button>
          <el-radio-button label="acknowledged">已确认</el-radio-button>
          <el-radio-button label="resolved">已解决</el-radio-button>
        </el-radio-group>
        <el-select v-model="filterSeverity" placeholder="严重等级" style="margin-left: 16px" clearable>
          <el-option label="严重 (CRITICAL)" value="CRITICAL" />
          <el-option label="警告 (WARNING)" value="WARNING" />
        </el-select>
        <el-date-picker
          v-model="filterDate"
          type="date"
          placeholder="选择日期"
          style="margin-left: 16px"
          @change="loadAlerts"
        />
      </div>
    </el-card>

    <!-- Alert List -->
    <el-card shadow="hover" style="margin-top: 16px">
      <template #header>
        <div class="card-header">
          <span>告警列表</span>
          <el-button type="primary" size="small" @click="loadAlerts">
            刷新
          </el-button>
        </div>
      </template>
      <el-table :data="filteredAlerts" style="width: 100%" stripe>
        <el-table-column prop="severity" label="等级" width="100">
          <template #default="{ row }">
            <el-tag :type="row.severity === 'CRITICAL' ? 'danger' : 'warning'" size="small">
              {{ row.severity }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="alert_type" label="类型" width="150" />
        <el-table-column prop="timestamp" label="时间" width="180" />
        <el-table-column prop="message" label="消息" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              type="primary"
              size="small"
              @click="acknowledgeAlert(row)"
            >
              确认
            </el-button>
            <el-button
              v-if="row.status !== 'resolved'"
              type="success"
              size="small"
              @click="resolveAlert(row)"
            >
              解决
            </el-button>
            <el-button
              type="info"
              size="small"
              @click="viewDetails(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Alert Chart -->
    <el-card shadow="hover" style="margin-top: 16px">
      <template #header>
        <span>告警趋势</span>
      </template>
      <div ref="alertChartRef" style="height: 300px"></div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

// Filters
const filterStatus = ref('all')
const filterSeverity = ref('')
const filterDate = ref('')

// Stats
const stats = ref({
  total: 156,
  pending: 12,
  critical: 8,
  warning: 148
})

// Mock alerts data
const alerts = ref([
  {
    id: '1',
    alert_type: '数据延迟',
    severity: 'CRITICAL',
    timestamp: '2026-04-23T09:15:00+08:00',
    message: '行情数据延迟超过 5 分钟：300308.SZ',
    status: 'pending',
    details: { symbol: '300308.SZ', delay_minutes: 6 }
  },
  {
    id: '2',
    alert_type: '规则计算超时',
    severity: 'WARNING',
    timestamp: '2026-04-23T09:10:00+08:00',
    message: 'V7.5 规则计算超时 (12 秒)',
    status: 'acknowledged',
    details: { duration_seconds: 12, threshold: 10 }
  },
  {
    id: '3',
    alert_type: '仓位超限',
    severity: 'WARNING',
    timestamp: '2026-04-23T09:05:00+08:00',
    message: '单票仓位超限：300502.SZ (45% > 40%)',
    status: 'resolved',
    details: { symbol: '300502.SZ', current_pct: 45, limit_pct: 40 }
  },
  {
    id: '4',
    alert_type: '止损触发',
    severity: 'CRITICAL',
    timestamp: '2026-04-22T14:30:00+08:00',
    message: '止损触发：002463.SZ (跌破平台 -5.2%)',
    status: 'resolved',
    details: { symbol: '002463.SZ', loss_pct: -5.2 }
  },
  {
    id: '5',
    alert_type: 'Redis 缓存命中率低',
    severity: 'WARNING',
    timestamp: '2026-04-22T11:45:00+08:00',
    message: 'Redis 缓存命中率低于阈值 (92% < 95%)',
    status: 'acknowledged',
    details: { current_rate: 0.92, threshold: 0.95 }
  }
])

const alertChartRef = ref<HTMLElement>()

// Computed
const filteredAlerts = computed(() => {
  return alerts.value.filter(alert => {
    if (filterStatus.value !== 'all' && alert.status !== filterStatus.value) {
      return false
    }
    if (filterSeverity.value && alert.severity !== filterSeverity.value) {
      return false
    }
    return true
  })
})

// Methods
const getStatusType = (status: string) => {
  switch (status) {
    case 'pending': return 'warning'
    case 'acknowledged': return 'info'
    case 'resolved': return 'success'
    default: return ''
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return '待处理'
    case 'acknowledged': return '已确认'
    case 'resolved': return '已解决'
    default: return status
  }
}

const acknowledgeAlert = (alert: any) => {
  alert.status = 'acknowledged'
  // TODO: Call API
}

const resolveAlert = (alert: any) => {
  alert.status = 'resolved'
  // TODO: Call API
}

const viewDetails = (alert: any) => {
  // TODO: Show details dialog
  console.log('View details:', alert)
}

const loadAlerts = () => {
  // TODO: Load from API
  console.log('Loading alerts...')
}

const initAlertChart = () => {
  if (!alertChartRef.value) return
  
  const chart = echarts.init(alertChartRef.value)
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['严重', '警告']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['04-17', '04-18', '04-19', '04-20', '04-21', '04-22', '04-23']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '严重',
        type: 'bar',
        stack: 'total',
        data: [2, 1, 0, 3, 1, 2, 1],
        itemStyle: { color: '#f56c6c' }
      },
      {
        name: '警告',
        type: 'bar',
        stack: 'total',
        data: [15, 18, 12, 22, 16, 20, 8],
        itemStyle: { color: '#e6a23c' }
      }
    ]
  }
  chart.setOption(option)
}

onMounted(() => {
  nextTick(() => {
    initAlertChart()
  })
  
  window.addEventListener('resize', () => {
    alertChartRef.value && echarts.getInstanceByDom(alertChartRef.value)?.resize()
  })
})
</script>

<style scoped>
.alert-center {
  padding: 20px;
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
  font-size: 28px;
  font-weight: bold;
}

.text-warning {
  color: #e6a23c;
}

.text-danger {
  color: #f56c6c;
}

.filter-container {
  display: flex;
  align-items: center;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
