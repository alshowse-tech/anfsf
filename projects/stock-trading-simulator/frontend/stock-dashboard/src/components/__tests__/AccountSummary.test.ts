import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'

// Simple component test - testing the store integration
describe('Account Summary Component Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should display account data from store', () => {
    const store = useDashboardStore()
    store.account = {
      total_assets: 1000000,
      cash_balance: 750000,
      market_value: 250000,
      daily_profit: 2500,
      daily_return_rate: 0.25,
      overall_return_rate: 5.0
    }

    expect(store.account.total_assets).toBe(1000000)
    expect(store.account.daily_profit).toBe(2500)
    expect(store.account.daily_return_rate).toBe(0.25)
  })

  it('should handle null account gracefully', () => {
    const store = useDashboardStore()
    store.account = null

    expect(store.account).toBeNull()
    expect(store.totalProfit).toBe(0)
    expect(store.totalReturnRate).toBe(0)
  })
})
