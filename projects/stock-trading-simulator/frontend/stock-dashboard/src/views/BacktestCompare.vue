<template>
  <div class="backtest-compare">
    <!-- Time Range Selector -->
    <el-card shadow="hover" class="filter-card">
      <div class="filter-container">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="loadBacktestData"
        />
        <el-select v-model="strategy" placeholder="选择策略" style="margin-left: 16px" @change="loadBacktestData">
          <el-option label="V7.5 主线策略" value="v75-mainline" />
          <el-option label="V7.5 试错策略" value="v75-retry" />
          <el-option label="基准指数 (沪深 300)" value="benchmark" />
        </el-select>
        <el-button type="primary" style="margin-left: 16px" @click="loadBacktestData">
          对比分析
        </el-button>
      </div>
    </el-card>

    <!-- Key Metrics -->
    <el-row :gutter="16" class="metrics-row">
      <el-col :span="3" v-for="metric in metrics" :key="metric.label">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-item">
            <div class="metric-label">{{ metric.label }}</div>
            <div class="metric-value" :class="metric.valueClass">
              {{ metric.value }}
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Charts -->
    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <span>净值曲线对比</span>
          </template>
          <div ref="equityChartRef" style="height: 400px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>回撤曲线</span>
          </template>
          <div ref="drawdownChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>月度收益分布</span>
          </template>
          <div ref="monthlyChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Trade Analysis -->
    <el-card shadow="hover" style="margin-top: 16px">
      <template #header>
        <span>交易分析</span>
      </template>
      <el-table :data="tradeAnalysis" style="width: 100%" stripe>
        <el-table-column prop="metric" label="指标" width="200" />
        <el-table-column prop="strategy" label="策略值" align="right" />
        <el-table-column prop="benchmark" label="基准值" align="right" />
        <el-table-column prop="difference" label="差异" align="right">
          <template #default="{ row }">
            <span :class="row.difference >= 0 ? 'text-profit' : 'text-loss'">
              {{ row.difference >= 0 ? '+' : '' }}{{ row.difference }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

// Date range
const dateRange = ref<[Date, Date]>([
  new Date(2026, 0, 1),
  new Date()
])

const strategy = ref('v75-mainline')

// Metrics
const metrics = ref([
  { label: '累计收益', value: '12.35%', valueClass: 'text-profit' },
  { label: '年化收益', value: '18.52%', valueClass: 'text-profit' },
  { label: '夏普比率', value: '1.85', valueClass: '' },
  { label: '最大回撤', value: '-3.21%', valueClass: 'text-loss' },
  { label: '胜率', value: '66.67%', valueClass: 'text-profit' },
  { label: '盈亏比', value: '2.35', valueClass: 'text-profit' },
  { label: '交易次数', value: '48', valueClass: '' },
  { label: '日均持仓', value: '2.3', valueClass: '' }
])

// Chart refs
const equityChartRef = ref<HTMLElement>()
const drawdownChartRef = ref<HTMLElement>()
const monthlyChartRef = ref<HTMLElement>()

// Mock data
const equityData = {
  dates: ['2026-01', '2026-02', '2026-03', '2026-04'],
  strategy: [100, 105.2, 108.5, 112.35],
  benchmark: [100, 102.1, 103.8, 105.2]
}

const drawdownData = {
  dates: ['2026-01', '2026-02', '2026-03', '2026-04'],
  strategy: [0, -1.2, -2.5, -3.21],
  benchmark: [0, -2.1, -3.5, -4.8]
}

const monthlyData = {
  months: ['1 月', '2 月', '3 月', '4 月'],
  returns: [5.2, 3.3, 3.8, 3.5]
}

const tradeAnalysis = ref([
  { metric: '累计收益率', strategy: '12.35%', benchmark: '5.20%', difference: 7.15 },
  { metric: '年化收益率', strategy: '18.52%', benchmark: '7.80%', difference: 10.72 },
  { metric: '夏普比率', strategy: '1.85', benchmark: '0.95', difference: 0.90 },
  { metric: '最大回撤', strategy: '-3.21%', benchmark: '-4.80%', difference: 1.59 },
  { metric: '胜率', strategy: '66.67%', benchmark: '52.00%', difference: 14.67 },
  { metric: '盈亏比', strategy: '2.35', benchmark: '1.45', difference: 0.90 },
  { metric: '交易次数', strategy: '48', benchmark: '-', difference: 0 },
  { metric: '平均持仓天数', strategy: '5.2', benchmark: '-', difference: 0 }
])

// Initialize charts
const initEquityChart = () => {
  if (!equityChartRef.value) return
  
  const chart = echarts.init(equityChartRef.value)
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>{a0}: {c0}%<br/>{a1}: {c1}%'
    },
    legend: {
      data: ['V7.5 主线策略', '沪深 300']
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
      data: equityData.dates
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: 'V7.5 主线策略',
        type: 'line',
        smooth: true,
        data: equityData.strategy,
        itemStyle: { color: '#409EFF' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64,158,255,0.3)' },
            { offset: 1, color: 'rgba(64,158,255,0.05)' }
          ])
        }
      },
      {
        name: '沪深 300',
        type: 'line',
        smooth: true,
        data: equityData.benchmark,
        itemStyle: { color: '#909399' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(144,147,153,0.3)' },
            { offset: 1, color: 'rgba(144,147,153,0.05)' }
          ])
        }
      }
    ]
  }
  chart.setOption(option)
}

const initDrawdownChart = () => {
  if (!drawdownChartRef.value) return
  
  const chart = echarts.init(drawdownChartRef.value)
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>{a0}: {c0}%<br/>{a1}: {c1}%'
    },
    legend: {
      data: ['V7.5 主线策略', '沪深 300']
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
      data: drawdownData.dates
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%',
        color: (value) => value < 0 ? '#f56c6c' : '#67c23a'
      }
    },
    series: [
      {
        name: 'V7.5 主线策略',
        type: 'line',
        smooth: true,
        data: drawdownData.strategy,
        itemStyle: { color: '#f56c6c' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245,108,108,0.3)' },
            { offset: 1, color: 'rgba(245,108,108,0.05)' }
          ])
        }
      },
      {
        name: '沪深 300',
        type: 'line',
        smooth: true,
        data: drawdownData.benchmark,
        itemStyle: { color: '#e6a23c' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(230,162,60,0.3)' },
            { offset: 1, color: 'rgba(230,162,60,0.05)' }
          ])
        }
      }
    ]
  }
  chart.setOption(option)
}

const initMonthlyChart = () => {
  if (!monthlyChartRef.value) return
  
  const chart = echarts.init(monthlyChartRef.value)
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>{a0}: {c0}%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: monthlyData.months
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: '月度收益',
        type: 'bar',
        data: monthlyData.returns,
        itemStyle: {
          color: (params) => {
            return params.value >= 0 ? '#67c23a' : '#f56c6c'
          }
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%'
        }
      }
    ]
  }
  chart.setOption(option)
}

const loadBacktestData = () => {
  // TODO: Load from API
  console.log('Loading backtest data for', dateRange.value, strategy.value)
  // Re-init charts with new data
  nextTick(() => {
    initEquityChart()
    initDrawdownChart()
    initMonthlyChart()
  })
}

onMounted(() => {
  nextTick(() => {
    initEquityChart()
    initDrawdownChart()
    initMonthlyChart()
  })
  
  // Resize charts on window resize
  window.addEventListener('resize', () => {
    equityChartRef.value && echarts.getInstanceByDom(equityChartRef.value)?.resize()
    drawdownChartRef.value && echarts.getInstanceByDom(drawdownChartRef.value)?.resize()
    monthlyChartRef.value && echarts.getInstanceByDom(monthlyChartRef.value)?.resize()
  })
})
</script>

<style scoped>
.backtest-compare {
  padding: 20px;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-container {
  display: flex;
  align-items: center;
}

.metrics-row {
  margin-top: 16px;
}

.metric-card {
  text-align: center;
}

.metric-label {
  color: #909399;
  font-size: 14px;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 20px;
  font-weight: bold;
}

.text-profit {
  color: #67c23a;
}

.text-loss {
  color: #f56c6c;
}
</style>
