<template>
  <div class="rule-hit-dashboard">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>📋 规则命中日志</h2>
          <el-date-picker
            v-model="selectedDate"
            type="date"
            placeholder="选择日期"
            @change="loadRuleHits"
          />
        </div>
      </template>

      <!-- Rule Filter -->
      <div class="filter-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索股票代码或名称"
          clearable
          style="width: 250px; margin-right: 12px"
          @keyup.enter="filterRules"
        />
        <el-radio-group v-model="ruleTypeFilter" @change="filterRules">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="B">买入规则</el-radio-button>
          <el-radio-button label="M">仓位管理</el-radio-button>
          <el-radio-button label="S">止损规则</el-radio-button>
          <el-radio-button label="T">止盈规则</el-radio-button>
          <el-radio-button label="R">回补规则</el-radio-button>
        </el-radio-group>
      </div>

      <!-- Rule Hit Table -->
      <el-table :data="filteredRuleHits" style="width: 100%" stripe>
        <el-table-column prop="trigger_time" label="触发时间" width="160" />
        <el-table-column prop="rule_id" label="规则 ID" width="80">
          <template #default="{ row }">
            <el-tag :type="getRuleTypeColor(row.rule_id)" size="small">
              {{ row.rule_id }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rule_name" label="规则名称" width="150" />
        <el-table-column prop="symbol" label="股票代码" width="100" />
        <el-table-column prop="stock_name" label="股票名称" width="120" />
        <el-table-column prop="trigger_reason" label="触发原因" show-overflow-tooltip />
        <el-table-column prop="supporting_data" label="支撑数据" width="200">
          <template #default="{ row }">
            <span v-if="row.supporting_data?.rps_10">
              RPS: {{ row.supporting_data.rps_10 }}/{{ row.supporting_data.rps_20 }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="is_valid" label="有效性" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_valid ? 'success' : 'danger'" size="small">
              {{ row.is_valid ? '有效' : '无效' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getStockName } from '@/services/stockService'

const selectedDate = ref(new Date())
const ruleTypeFilter = ref('all')
const searchQuery = ref('')
const ruleHits = ref<any[]>([])

// Mock data for demo
ruleHits.value = [
  {
    rule_id: 'B001',
    rule_name: '超级主线过滤',
    rule_type: 'filter',
    symbol: '300308.SZ',
    stock_name: '中际旭创',
    trade_date: '2026-04-23',
    trigger_time: '2026-04-23T11:30:00+08:00',
    trigger_reason: 'RPS(10/20/50) > 90',
    supporting_data: { rps_10: 98.5, rps_20: 96.2, rps_50: 92.1 },
    is_valid: true
  },
  {
    rule_id: 'B002',
    rule_name: '放量突破',
    rule_type: 'pattern',
    symbol: '300502.SZ',
    stock_name: '新易盛',
    trade_date: '2026-04-23',
    trigger_time: '2026-04-23T11:30:00+08:00',
    trigger_reason: '突破 3-5 天窄幅横盘，量能 2.5x',
    supporting_data: { rps_10: 95.2, rps_20: 93.1 },
    is_valid: true
  },
  {
    rule_id: 'M001',
    rule_name: '仓位管理',
    rule_type: 'position',
    symbol: '300308.SZ',
    stock_name: '中际旭创',
    trade_date: '2026-04-23',
    trigger_time: '2026-04-23T11:30:00+08:00',
    trigger_reason: '单票仓位≤40%',
    supporting_data: {},
    is_valid: true
  }
]

// 加载股票名称
async function loadStockNames() {
  const symbols = [...new Set(ruleHits.value.map(hit => hit.symbol))]
  for (const symbol of symbols) {
    const name = await getStockName(symbol)
    if (name) {
      const hit = ruleHits.value.find(h => h.symbol === symbol)
      if (hit && !hit.stock_name) {
        hit.stock_name = name
      }
    }
  }
}

const filteredRuleHits = computed(() => {
  let filtered = ruleHits.value
  
  // 规则类型筛选
  if (ruleTypeFilter.value !== 'all') {
    filtered = filtered.filter(hit => hit.rule_id.startsWith(ruleTypeFilter.value))
  }
  
  // 股票搜索 (代码或名称)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(hit => 
      hit.symbol.toLowerCase().includes(query) ||
      (hit.stock_name && hit.stock_name.toLowerCase().includes(query))
    )
  }
  
  return filtered
})

onMounted(() => {
  loadStockNames()
})

const getRuleTypeColor = (ruleId: string) => {
  switch (ruleId[0]) {
    case 'B': return 'success'
    case 'M': return 'warning'
    case 'S': return 'danger'
    case 'T': return 'info'
    case 'R': return 'primary'
    default: return ''
  }
}

const filterRules = () => {
  // Filter logic handled by computed property
}

const loadRuleHits = () => {
  // TODO: Load from API
  console.log('Loading rule hits for', selectedDate.value)
}
</script>

<style scoped>
.rule-hit-dashboard {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-section {
  margin-bottom: 16px;
}

h2 {
  margin: 0;
}
</style>
