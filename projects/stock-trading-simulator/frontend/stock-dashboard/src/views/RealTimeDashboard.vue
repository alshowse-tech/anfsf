<template>
  <div class="realtime-dashboard">
    <!-- Header -->
    <el-card class="header-card" shadow="hover">
      <div class="header-content">
        <div class="header-left">
          <h2 class="page-title">📈 实时监控</h2>
          <el-tag :type="marketStatus.type" size="large">{{ marketStatus.text }}</el-tag>
          <span class="timestamp">{{ currentTime }}</span>
        </div>
        <div class="header-right">
          <el-button :icon="Refresh" circle @click="refreshData" :loading="loading" />
        </div>
      </div>
    </el-card>

    <!-- Account Summary -->
    <el-row :gutter="16" class="summary-row">
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-item">
            <div class="summary-label">总资产</div>
            <div class="summary-value">¥{{ formatNumber(account?.total_assets || 0) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-item">
            <div class="summary-label">当日盈亏</div>
            <div class="summary-value" :class="profitClass">
              {{ dailyProfitPrefix }}{{ formatNumber(Math.abs(account?.daily_profit || 0)) }}
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-item">
            <div class="summary-label">当日收益率</div>
            <div class="summary-value" :class="profitClass">
              {{ dailyProfitPrefix }}{{ (account?.daily_return_rate || 0).toFixed(2) }}%
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-item">
            <div class="summary-label">持仓数量</div>
            <div class="summary-value">{{ positionCount }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Main Content -->
    <el-row :gutter="16" class="main-content">
      <!-- Left: Positions -->
      <el-col :span="16">
        <el-card shadow="hover" class="positions-card">
          <template #header>
            <div class="card-header">
              <span>当前持仓</span>
              <el-tag type="info">{{ positions.length }} 只</el-tag>
            </div>
          </template>
          <el-table :data="positions" style="width: 100%" stripe>
            <el-table-column prop="symbol" label="代码" width="100" />
            <el-table-column prop="name" label="名称" width="120" />
            <el-table-column prop="quantity" label="数量" width="100" align="right" />
            <el-table-column prop="cost_price" label="成本价" width="100" align="right">
              <template #default="{ row }">
                ¥{{ row.cost_price.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="current_price" label="现价" width="100" align="right">
              <template #default="{ row }">
                ¥{{ row.current_price.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="market_value" label="市值" width="120" align="right">
              <template #default="{ row }">
                ¥{{ formatNumber(row.market_value) }}
              </template>
            </el-table-column>
            <el-table-column prop="profit_rate" label="盈亏率" width="100" align="right">
              <template #default="{ row }">
                <span :class="row.profit_rate >= 0 ? 'text-profit' : 'text-loss'">
                  {{ row.profit_rate >= 0 ? '+' : '' }}{{ row.profit_rate.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="position_pct" label="仓位" width="80" align="right">
              <template #default="{ row }">
                {{ row.position_pct.toFixed(1) }}%
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="row.is_mainline ? 'success' : 'info'" size="small">
                  {{ row.is_mainline ? '主线' : '试错' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- Recent Signals -->
        <el-card shadow="hover" class="signals-card" style="margin-top: 16px">
          <template #header>
            <div class="card-header">
              <span>最近信号</span>
              <el-tag type="warning">{{ activeSignals.length }} 待处理</el-tag>
            </div>
          </template>
          <el-table :data="recentSignals" style="width: 100%" stripe max-height="300">
            <el-table-column prop="signal_time" label="时间" width="160" />
            <el-table-column prop="symbol" label="代码" width="100" />
            <el-table-column prop="signal_type" label="类型" width="80">
              <template #default="{ row }">
                <el-tag :type="getSignalType(row.signal_type)" size="small">
                  {{ row.signal_type }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="signal_reason" label="原因" show-overflow-tooltip />
            <el-table-column prop="signal_strength" label="强度" width="80" align="right">
              <template #default="{ row }">
                <el-progress :percentage="row.signal_strength * 100" :stroke-width="8" />
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'executed' ? 'success' : 'warning'" size="small">
                  {{ row.status === 'executed' ? '已执行' : '待处理' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- Right: Risk Metrics -->
      <el-col :span="8">
        <el-card shadow="hover" class="risk-card">
          <template #header>
            <span>风控指标</span>
          </template>
          <div class="risk-metrics">
            <div class="risk-item">
              <div class="risk-label">仓位风险</div>
              <el-progress
                :percentage="(riskMetrics?.position_risk || 0) * 100"
                :color="getRiskColor(riskMetrics?.position_risk || 0)"
              />
              <div class="risk-value">{{ ((riskMetrics?.position_risk || 0) * 100).toFixed(1) }}%</div>
            </div>
            <div class="risk-item">
              <div class="risk-label">当前回撤</div>
              <div class="risk-value text-loss">
                {{ ((riskMetrics?.current_drawdown || 0) * 100).toFixed(2) }}%
              </div>
            </div>
            <div class="risk-item">
              <div class="risk-label">最大回撤</div>
              <div class="risk-value text-loss">
                {{ ((riskMetrics?.max_drawdown || 0) * 100).toFixed(2) }}%
              </div>
            </div>
            <div class="risk-item">
              <div class="risk-label">止损次数</div>
              <div class="risk-value">{{ riskMetrics?.stop_loss_count || 0 }}</div>
            </div>
          </div>
        </el-card>

        <!-- Market Status -->
        <el-card shadow="hover" class="market-card" style="margin-top: 16px">
          <template #header>
            <span>市场状态</span>
          </template>
          <div class="market-info">
            <div class="market-row">
              <span class="market-label">交易时段:</span>
              <span class="market-value">{{ currentSession }}</span>
            </div>
            <div class="market-row">
              <span class="market-label">下次任务:</span>
              <span class="market-value">{{ nextTaskTime }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { useDashboardStore } from '@/stores/dashboard'

const store = useDashboardStore()

// Computed
const account = computed(() => store.account)
const positions = computed(() => store.positions)
const signals = computed(() => store.signals)
const riskMetrics = computed(() => store.riskMetrics)
const loading = computed(() => store.loading)
const positionCount = computed(() => store.positionCount)
const activeSignals = computed(() => store.activeSignals)

// Current time
const currentTime = ref('')
const updateCurrentTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// Market status
const marketStatus = computed(() => {
  const hour = new Date().getHours()
  const minute = new Date().getMinutes()
  const time = hour * 60 + minute

  if (time >= 570 && time <= 690) { // 09:30 - 11:30
    return { text: '早盘交易中', type: 'success' }
  } else if (time >= 780 && time <= 900) { // 13:00 - 15:00
    return { text: '午盘交易中', type: 'success' }
  } else if (time >= 690 && time < 780) {
    return { text: '午休', type: 'warning' }
  } else {
    return { text: '已收盘', type: 'info' }
  }
})

const currentSession = computed(() => {
  const hour = new Date().getHours()
  const minute = new Date().getMinutes()
  const time = hour * 60 + minute

  if (time >= 570 && time <= 690) return '早盘 (09:30-11:30)'
  if (time >= 780 && time <= 900) return '午盘 (13:00-15:00)'
  if (time >= 690 && time < 780) return '午休'
  return '非交易时段'
})

const nextTaskTime = computed(() => {
  const hour = new Date().getHours()
  const minute = new Date().getMinutes()
  const time = hour * 60 + minute

  if (time < 690) return '11:30 午间任务'
  if (time < 900) return '15:00 日终任务'
  return '次日 09:30 开盘'
})

// Daily profit
const dailyProfitPrefix = computed(() => {
  if (!store.account) return ''
  return store.account.daily_profit >= 0 ? '+' : '-'
})

const profitClass = computed(() => {
  if (!store.account) return ''
  return store.account.daily_profit >= 0 ? 'text-profit' : 'text-loss'
})

// Recent signals
const recentSignals = computed(() => {
  return signals.value.slice(0, 10)
})

// Methods
const formatNumber = (num: number) => {
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const getSignalType = (type: string) => {
  switch (type) {
    case 'BUY':
    case 'REBUY':
      return 'success'
    case 'SELL':
      return 'danger'
    default:
      return 'info'
  }
}

const getRiskColor = (risk: number) => {
  if (risk < 0.5) return '#67c23a'
  if (risk < 0.7) return '#e6a23c'
  return '#f56c6c'
}

const refreshData = async () => {
  await store.refreshAll()
}

// Lifecycle
let timer: number
onMounted(() => {
  updateCurrentTime()
  timer = window.setInterval(updateCurrentTime, 1000)
  refreshData()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.realtime-dashboard {
  padding: 20px;
}

.header-card {
  margin-bottom: 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 24px;
}

.timestamp {
  color: #909399;
  font-size: 14px;
}

.summary-row {
  margin-bottom: 16px;
}

.summary-card {
  text-align: center;
}

.summary-label {
  color: #909399;
  font-size: 14px;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 24px;
  font-weight: bold;
}

.text-profit {
  color: #f56c6c;
}

.text-loss {
  color: #67c23a;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.risk-metrics {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.risk-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.risk-label {
  color: #909399;
  font-size: 14px;
}

.risk-value {
  font-size: 18px;
  font-weight: bold;
}

.market-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.market-row {
  display: flex;
  justify-content: space-between;
}

.market-label {
  color: #909399;
}

.market-value {
  font-weight: bold;
}
</style>
