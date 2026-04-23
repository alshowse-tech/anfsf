import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDashboardStore } from '../dashboard'

describe('Dashboard Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with empty state', () => {
    const store = useDashboardStore()
    expect(store.account).toBeNull()
    expect(store.positions).toEqual([])
    expect(store.signals).toEqual([])
    expect(store.watchlist).toBeNull()
    expect(store.riskMetrics).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('computes totalProfit correctly', async () => {
    const store = useDashboardStore()
    // Mock account data
    store.account = {
      total_assets: 1000000,
      cash_balance: 750000,
      market_value: 250000,
      daily_profit: 2500,
      daily_return_rate: 0.25,
      overall_return_rate: 5.0
    }
    expect(store.totalProfit).toBe(2500)
  })

  it('computes totalReturnRate correctly', async () => {
    const store = useDashboardStore()
    store.account = {
      total_assets: 1000000,
      cash_balance: 750000,
      market_value: 250000,
      daily_profit: 2500,
      daily_return_rate: 0.25,
      overall_return_rate: 5.0
    }
    expect(store.totalReturnRate).toBe(0.25)
  })

  it('computes positionCount correctly', () => {
    const store = useDashboardStore()
    store.positions = [
      { symbol: '300308.SZ', name: '中际旭创', quantity: 1000, cost_price: 115, current_price: 125, market_value: 125000, profit_loss: 10000, profit_rate: 8.7, position_pct: 12.5, is_mainline: true, is_auto_rebuy: false },
      { symbol: '300502.SZ', name: '新 NL', quantity: 500, cost_price: 200, current_price: 210, market_value: 105000, profit_loss: 5000, profit_rate: 5.0, position_pct: 10.5, is_mainline: true, is_auto_rebuy: true }
    ]
    expect(store.positionCount).toBe(2)
  })

  it('filters activeSignals correctly', () => {
    const store = useDashboardStore()
    store.signals = [
      { signal_id: '1', symbol: '300308.SZ', signal_type: 'BUY', signal_reason: 'RPS > 90', signal_strength: 0.8, signal_time: '2026-04-23T09:30:00Z', status: 'pending' },
      { signal_id: '2', symbol: '300502.SZ', signal_type: 'SELL', signal_reason: 'Stop loss', signal_strength: 0.9, signal_time: '2026-04-23T09:35:00Z', status: 'executed' }
    ]
    expect(store.activeSignals.length).toBe(1)
    expect(store.activeSignals[0].status).toBe('pending')
  })

  it('filters mainlinePositions correctly', () => {
    const store = useDashboardStore()
    store.positions = [
      { symbol: '300308.SZ', name: '中际旭创', quantity: 1000, cost_price: 115, current_price: 125, market_value: 125000, profit_loss: 10000, profit_rate: 8.7, position_pct: 12.5, is_mainline: true, is_auto_rebuy: false },
      { symbol: '002463.SZ', name: '电科芯片', quantity: 800, cost_price: 50, current_price: 48, market_value: 38400, profit_loss: -1600, profit_rate: -4.0, position_pct: 3.84, is_mainline: false, is_auto_rebuy: false }
    ]
    expect(store.mainlinePositions.length).toBe(1)
    expect(store.mainlinePositions[0].is_mainline).toBe(true)
  })

  it('clearData resets all state', () => {
    const store = useDashboardStore()
    store.account = { total_assets: 1000000, cash_balance: 750000, market_value: 250000, daily_profit: 2500, daily_return_rate: 0.25, overall_return_rate: 5.0 }
    store.positions = [{ symbol: '300308.SZ', name: '中际旭创', quantity: 1000, cost_price: 115, current_price: 125, market_value: 125000, profit_loss: 10000, profit_rate: 8.7, position_pct: 12.5, is_mainline: true, is_auto_rebuy: false }]
    store.signals = [{ signal_id: '1', symbol: '300308.SZ', signal_type: 'BUY', signal_reason: 'RPS > 90', signal_strength: 0.8, signal_time: '2026-04-23T09:30:00Z', status: 'pending' }]
    store.watchlist = { version_id: '1', version_name: 'test', status: 'active', items: [] }
    store.riskMetrics = { position_risk: 0.5, stop_loss_count: 2, max_drawdown: 0.03, current_drawdown: 0.02 }
    store.lastUpdateTime = new Date()

    store.clearData()

    expect(store.account).toBeNull()
    expect(store.positions).toEqual([])
    expect(store.signals).toEqual([])
    expect(store.watchlist).toBeNull()
    expect(store.riskMetrics).toBeNull()
    expect(store.lastUpdateTime).toBeNull()
  })
})
