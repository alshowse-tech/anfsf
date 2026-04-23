import { createRouter, createWebHistory } from 'vue-router'
import RealTimeDashboard from '@/views/RealTimeDashboard.vue'
import RuleHitDashboard from '@/views/RuleHitDashboard.vue'
import BacktestCompare from '@/views/BacktestCompare.vue'
import StockDiagnostics from '@/views/StockDiagnostics.vue'
import AuditLog from '@/views/AuditLog.vue'
import AlertCenter from '@/views/AlertCenter.vue'
import TradingRecommendations from '@/views/TradingRecommendations.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'realtime',
      component: RealTimeDashboard,
      meta: { title: '实时监控' }
    },
    {
      path: '/rules',
      name: 'rules',
      component: RuleHitDashboard,
      meta: { title: '规则命中' }
    },
    {
      path: '/backtest',
      name: 'backtest',
      component: BacktestCompare,
      meta: { title: '回测对比' }
    },
    {
      path: '/diagnostics',
      name: 'diagnostics',
      component: StockDiagnostics,
      meta: { title: '个股诊断' }
    },
    {
      path: '/audit',
      name: 'audit',
      component: AuditLog,
      meta: { title: '审计日志' }
    },
    {
      path: '/alerts',
      name: 'alerts',
      component: AlertCenter,
      meta: { title: '告警中心' }
    },
    {
      path: '/recommendations',
      name: 'recommendations',
      component: TradingRecommendations,
      meta: { title: '操盘建议' }
    }
  ]
})

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 股票操盘模拟系统`
  }
  next()
})

export default router
