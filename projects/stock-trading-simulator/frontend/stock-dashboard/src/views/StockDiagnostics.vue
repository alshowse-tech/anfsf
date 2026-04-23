<template>
  <div class="stock-diagnostics">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>🔍 个股诊断</h2>
          <div class="header-actions">
            <el-input
              v-model="symbolInput"
              placeholder="输入股票代码或名称"
              clearable
              style="width: 250px; margin-right: 12px"
              @keyup.enter="loadDiagnostics"
            />
            <el-button type="primary" @click="loadDiagnostics">诊断</el-button>
          </div>
        </div>
      </template>

      <div v-if="diagnostics" class="diagnostics-content">
        <!-- Stock Info -->
        <el-descriptions title="基本信息" :column="3" border>
          <el-descriptions-item label="股票代码">{{ diagnostics.symbol }}</el-descriptions-item>
          <el-descriptions-item label="股票名称">{{ diagnostics.name }}</el-descriptions-item>
          <el-descriptions-item label="股票">
            <span style="font-weight: bold; font-size: 16px">
              {{ diagnostics.symbol }} - {{ diagnostics.name }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="所属行业">{{ diagnostics.sector }} - {{ diagnostics.industry }}</el-descriptions-item>
        </el-descriptions>

        <!-- RPS Stats -->
        <el-card shadow="hover" style="margin-top: 16px">
          <template #header>
            <span>RPS 指标</span>
          </template>
          <el-row :gutter="16">
            <el-col :span="8">
              <div class="rps-item">
                <div class="rps-label">RPS(10)</div>
                <div class="rps-value" :class="getRpsClass(diagnostics.rps_stats.rps_10)">
                  {{ diagnostics.rps_stats.rps_10 }}
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="rps-item">
                <div class="rps-label">RPS(20)</div>
                <div class="rps-value" :class="getRpsClass(diagnostics.rps_stats.rps_20)">
                  {{ diagnostics.rps_stats.rps_20 }}
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="rps-item">
                <div class="rps-label">RPS(50)</div>
                <div class="rps-value" :class="getRpsClass(diagnostics.rps_stats.rps_50)">
                  {{ diagnostics.rps_stats.rps_50 }}
                </div>
              </div>
            </el-col>
          </el-row>
          <el-row :gutter="16" style="margin-top: 16px">
            <el-col :span="24">
              <el-tag :type="diagnostics.rps_stats.is_mainline ? 'success' : 'info'" size="large">
                {{ diagnostics.rps_stats.is_mainline ? '✅ 超级主线股' : '普通股票' }}
              </el-tag>
            </el-col>
          </el-row>
        </el-card>

        <!-- Technical Indicators -->
        <el-card shadow="hover" style="margin-top: 16px">
          <template #header>
            <span>技术指标</span>
          </template>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="ATR(14)">{{ diagnostics.indicators.atr_14 }}</el-descriptions-item>
            <el-descriptions-item label="RSI(14)">{{ diagnostics.indicators.rsi_14 }}</el-descriptions-item>
            <el-descriptions-item label="价格位置 (MA5)">{{ diagnostics.indicators.price_pos_ma_5 }}%</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- Recommendation -->
        <el-card shadow="hover" style="margin-top: 16px">
          <template #header>
            <span>交易建议</span>
          </template>
          <el-alert
            :title="diagnostics.recommendation.action"
            :type="getActionType(diagnostics.recommendation.action)"
            show-icon
            :closable="false"
          />
          <ul style="margin-top: 12px; padding-left: 20px">
            <li v-for="(reason, index) in diagnostics.recommendation.rationale" :key="index">
              {{ reason }}
            </li>
          </ul>
          <div class="recommendation-details" style="margin-top: 12px">
            <span>止损位：¥{{ diagnostics.recommendation.stop_loss }}</span>
            <span style="margin-left: 24px">止盈位：¥{{ diagnostics.recommendation.take_profit }}</span>
          </div>
        </el-card>

        <!-- Risk Assessment -->
        <el-card shadow="hover" style="margin-top: 16px">
          <template #header>
            <span>风险评估</span>
          </template>
          <el-row :gutter="16">
            <el-col :span="8">
              <div class="risk-score">
                <div class="score-label">综合评分</div>
                <div class="score-value">{{ diagnostics.risk_assessment.comprehensive_score }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="risk-level">
                <div class="level-label">风险等级</div>
                <el-tag :type="getRiskLevelType(diagnostics.risk_assessment.risk_level)" size="large">
                  {{ diagnostics.risk_assessment.risk_level }}
                </el-tag>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="compliance">
                <div class="compliance-label">合规检查</div>
                <el-tag v-if="!diagnostics.risk_assessment.compliance_check.is_st" type="success" size="small">
                  非 ST
                </el-tag>
                <el-tag v-if="!diagnostics.risk_assessment.compliance_check.is_suspended" type="success" size="small">
                  非停牌
                </el-tag>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </div>

      <el-empty v-else description="请输入股票代码进行诊断" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const symbolInput = ref('')
const diagnostics = ref<any>(null)

const getRpsClass = (rps: number) => {
  if (rps >= 90) return 'rps-high'
  if (rps >= 80) return 'rps-medium'
  return 'rps-low'
}

const getActionType = (action: string) => {
  switch (action) {
    case '买入': return 'success'
    case '卖出': return 'danger'
    case '持有': return 'warning'
    default: return 'info'
  }
}

const getRiskLevelType = (level: string) => {
  switch (level) {
    case '低': return 'success'
    case '中': return 'warning'
    case '高': return 'danger'
    default: return 'info'
  }
}

const loadDiagnostics = () => {
  // Mock data for demo
  if (symbolInput.value) {
    diagnostics.value = {
      symbol: symbolInput.value,
      name: '中际旭创',
      sector: '通信',
      industry: '光模块',
      rps_stats: {
        rps_10: 98.5,
        rps_20: 96.2,
        rps_50: 92.1,
        is_mainline: true
      },
      indicators: {
        atr_14: 3.2,
        rsi_14: 65.2,
        price_pos_ma_5: 2.5
      },
      recommendation: {
        action: '持有',
        rationale: [
          'RPS(10/20/50) > 90, 满足主线条件',
          '放量突破 3-5 天窄幅横盘',
          '站上 5 日线未破'
        ],
        stop_loss: 120.50,
        take_profit: 135.00
      },
      risk_assessment: {
        comprehensive_score: 85.5,
        risk_level: '低',
        compliance_check: {
          is_st: false,
          is_suspended: false,
          has_major_shareholder_reduction: false
        }
      }
    }
  }
}
</script>

<style scoped>
.stock-diagnostics {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

h2 {
  margin: 0;
}

.diagnostics-content {
  margin-top: 16px;
}

.rps-item {
  text-align: center;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}

.rps-label {
  color: #909399;
  font-size: 14px;
  margin-bottom: 8px;
}

.rps-value {
  font-size: 28px;
  font-weight: bold;
}

.rps-high {
  color: #67c23a;
}

.rps-medium {
  color: #e6a23c;
}

.rps-low {
  color: #f56c6c;
}

.risk-score, .risk-level, .compliance {
  text-align: center;
  padding: 16px;
}

.score-label, .level-label, .compliance-label {
  color: #909399;
  font-size: 14px;
  margin-bottom: 8px;
}

.score-value {
  font-size: 36px;
  font-weight: bold;
  color: #409eff;
}

.recommendation-details {
  color: #606266;
  font-size: 14px;
}
</style>
