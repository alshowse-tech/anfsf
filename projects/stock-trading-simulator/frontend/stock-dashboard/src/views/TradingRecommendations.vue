<template>
  <div class="trading-recommendations">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>📊 操盘建议</h2>
          <div class="header-actions">
            <el-radio-group v-model="sessionType" size="default">
              <el-radio-button label="morning">早盘</el-radio-button>
              <el-radio-button label="afternoon">午盘</el-radio-button>
              <el-radio-button label="close">全天收盘</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <div v-loading="loading" class="recommendations-content">
        <!-- 早盘建议 (9:30-11:30) -->
        <div v-if="sessionType === 'morning'" class="session-section">
          <el-alert
            title="早盘操盘建议"
            type="info"
            description="重点关注开盘后 30 分钟量能和主线板块表现"
            show-icon
            :closable="false"
            style="margin-bottom: 16px"
          />
          
          <el-row :gutter="16">
            <el-col :span="16">
              <el-card shadow="hover">
                <template #header>
                  <span>🎯 重点关注股票</span>
                </template>
                <el-table :data="morningRecommendations.focus_stocks" stripe>
                  <el-table-column prop="symbol" label="代码" width="100" />
                  <el-table-column prop="name" label="名称" width="120" />
                  <el-table-column prop="reason" label="关注理由" />
                  <el-table-column prop="action" label="建议" width="100">
                    <template #default="{ row }">
                      <el-tag :type="getActionType(row.action)" size="small">{{ row.action }}</el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover">
                <template #header>
                  <span>📈 市场情绪</span>
                </template>
                <div class="market-sentiment">
                  <div class="sentiment-item">
                    <span class="label">涨停家数:</span>
                    <span class="value">{{ morningRecommendations.market_sentiment.limit_up }}</span>
                  </div>
                  <div class="sentiment-item">
                    <span class="label">跌停家数:</span>
                    <span class="value">{{ morningRecommendations.market_sentiment.limit_down }}</span>
                  </div>
                  <div class="sentiment-item">
                    <span class="label">连板高度:</span>
                    <span class="value">{{ morningRecommendations.market_sentiment.highest_chain }}</span>
                  </div>
                  <div class="sentiment-item">
                    <span class="label">主线板块:</span>
                    <span class="value">{{ morningRecommendations.market_sentiment.main_sector }}</span>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <!-- 午盘建议 (13:00-15:00) -->
        <div v-if="sessionType === 'afternoon'" class="session-section">
          <el-alert
            title="午盘操盘建议"
            type="warning"
            description="关注上午强势板块的持续性和资金流向"
            show-icon
            :closable="false"
            style="margin-bottom: 16px"
          />
          
          <el-row :gutter="16">
            <el-col :span="16">
              <el-card shadow="hover">
                <template #header>
                  <span>🔄 调仓建议</span>
                </template>
                <el-table :data="afternoonRecommendations.adjustment_suggestions" stripe>
                  <el-table-column prop="symbol" label="代码" width="100" />
                  <el-table-column prop="name" label="名称" width="120" />
                  <el-table-column prop="current_position" label="当前持仓" width="100" />
                  <el-table-column prop="action" label="操作" width="100">
                    <template #default="{ row }">
                      <el-tag :type="getActionType(row.action)" size="small">{{ row.action }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="reason" label="理由" />
                </el-table>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover">
                <template #header>
                  <span>⚠️ 风险提示</span>
                </template>
                <ul class="risk-tips">
                  <li v-for="(tip, index) in afternoonRecommendations.risk_tips" :key="index">
                    {{ tip }}
                  </li>
                </ul>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <!-- 全天收盘建议 (15:00 后) -->
        <div v-if="sessionType === 'close'" class="session-section">
          <el-alert
            title="全天收盘总结"
            type="success"
            description="复盘今日交易，制定明日计划"
            show-icon
            :closable="false"
            style="margin-bottom: 16px"
          />
          
          <el-row :gutter="16">
            <el-col :span="12">
              <el-card shadow="hover">
                <template #header>
                  <span>📊 今日交易总结</span>
                </template>
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="总收益">
                    <span :class="closeSummary.trading_summary.total_profit >= 0 ? 'text-profit' : 'text-loss'">
                      ¥{{ closeSummary.trading_summary.total_profit.toFixed(2) }}
                    </span>
                  </el-descriptions-item>
                  <el-descriptions-item label="交易次数">{{ closeSummary.trading_summary.trade_count }}</el-descriptions-item>
                  <el-descriptions-item label="胜率">{{ closeSummary.trading_summary.win_rate }}%</el-descriptions-item>
                  <el-descriptions-item label="最大回撤">{{ closeSummary.trading_summary.max_drawdown }}%</el-descriptions-item>
                </el-descriptions>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card shadow="hover">
                <template #header>
                  <span>📋 明日计划</span>
                </template>
                <el-table :data="closeSummary.next_day_plan.focus_stocks" stripe>
                  <el-table-column prop="symbol" label="代码" width="100" />
                  <el-table-column prop="name" label="名称" width="120" />
                  <el-table-column prop="strategy" label="策略" />
                </el-table>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <!-- 持仓数据输入 -->
        <el-card shadow="hover" style="margin-top: 16px">
          <template #header>
            <div class="card-header">
              <span>📦 持仓数据管理</span>
              <el-button type="primary" size="small" @click="showImportDialog = true">导入持仓</el-button>
            </div>
          </template>
          
          <el-table :data="positions" stripe>
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
            <el-table-column prop="profit_rate" label="盈亏率" width="100" align="right">
              <template #default="{ row }">
                <span :class="row.profit_rate >= 0 ? 'text-profit' : 'text-loss'">
                  {{ row.profit_rate >= 0 ? '+' : '' }}{{ row.profit_rate.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button size="small" @click="editPosition(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="removePosition(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </el-card>

    <!-- 导入持仓对话框 -->
    <el-dialog v-model="showImportDialog" title="导入持仓数据" width="500px">
      <el-form :model="importForm" label-width="80px">
        <el-form-item label="股票代码">
          <el-input v-model="importForm.symbol" placeholder="如：000001" />
        </el-form-item>
        <el-form-item label="股票名称">
          <el-input v-model="importForm.name" placeholder="如：平安银行" />
        </el-form-item>
        <el-form-item label="持仓数量">
          <el-input-number v-model="importForm.quantity" :min="100" :step="100" />
        </el-form-item>
        <el-form-item label="成本价">
          <el-input-number v-model="importForm.costPrice" :precision="2" :step="0.01" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="addPosition">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const sessionType = ref<'morning' | 'afternoon' | 'close'>('morning')
const showImportDialog = ref(false)

// 持仓数据
const positions = ref([
  {
    symbol: '300308',
    name: '中际旭创',
    quantity: 1000,
    cost_price: 85.50,
    current_price: 92.30,
    profit_rate: 7.95
  }
])

// 导入表单
const importForm = ref({
  symbol: '',
  name: '',
  quantity: 1000,
  costPrice: 0
})

// 早盘建议
const morningRecommendations = ref({
  focus_stocks: [
    { symbol: '300308', name: '中际旭创', reason: 'CPO 龙头，RPS(10)=98', action: '持有' },
    { symbol: '603019', name: '中科曙光', reason: '算力龙头，突破新高', action: '关注' }
  ],
  market_sentiment: {
    limit_up: 45,
    limit_down: 3,
    highest_chain: 5,
    main_sector: 'AI 算力'
  }
})

// 午盘建议
const afternoonRecommendations = ref({
  adjustment_suggestions: [
    { symbol: '300308', name: '中际旭创', current_position: 1000, action: '持有', reason: '趋势完好，继续持有' }
  ],
  risk_tips: [
    '注意高位股分化风险',
    '关注成交量是否持续',
    '避免追高已大幅拉升的个股'
  ]
})

// 收盘总结
const closeSummary = ref({
  trading_summary: {
    total_profit: 12500,
    trade_count: 3,
    win_rate: 66.7,
    max_drawdown: 2.3
  },
  next_day_plan: {
    focus_stocks: [
      { symbol: '300308', name: '中际旭创', strategy: '5 日线附近低吸' },
      { symbol: '603019', name: '中科曙光', strategy: '突破确认后跟进' }
    ]
  }
})

// 获取操作类型
const getActionType = (action: string) => {
  const typeMap: Record<string, string> = {
    '买入': 'success',
    '卖出': 'danger',
    '持有': 'info',
    '关注': 'warning',
    '加仓': 'success',
    '减仓': 'warning'
  }
  return typeMap[action] || 'info'
}

// 添加持仓
const addPosition = () => {
  if (!importForm.value.symbol || !importForm.value.name) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  positions.value.push({
    symbol: importForm.value.symbol,
    name: importForm.value.name,
    quantity: importForm.value.quantity,
    cost_price: importForm.value.costPrice,
    current_price: importForm.value.costPrice,
    profit_rate: 0
  })
  
  ElMessage.success('持仓添加成功')
  showImportDialog.value = false
  importForm.value = { symbol: '', name: '', quantity: 1000, costPrice: 0 }
}

// 编辑持仓
const editPosition = (position: any) => {
  ElMessage.info('编辑功能开发中')
}

// 删除持仓
const removePosition = (position: any) => {
  const index = positions.value.findIndex(p => p.symbol === position.symbol)
  if (index > -1) {
    positions.value.splice(index, 1)
    ElMessage.success('删除成功')
  }
}

onMounted(() => {
  // 加载推荐数据
  loadRecommendations()
})

const loadRecommendations = async () => {
  loading.value = true
  // TODO: 从后端加载推荐数据
  setTimeout(() => {
    loading.value = false
  }, 500)
}
</script>

<style scoped>
.trading-recommendations {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.session-section {
  margin-bottom: 16px;
}

.market-sentiment {
  padding: 16px 0;
}

.sentiment-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sentiment-item .label {
  color: #666;
}

.sentiment-item .value {
  font-weight: bold;
  color: #333;
}

.risk-tips {
  padding-left: 20px;
  margin: 0;
}

.risk-tips li {
  margin-bottom: 8px;
  color: #f56c6c;
}

.text-profit {
  color: #f56c6c;
  font-weight: bold;
}

.text-loss {
  color: #67c23a;
  font-weight: bold;
}
</style>
