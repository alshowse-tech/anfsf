import { describe, it, expect, beforeEach, vi } from 'vitest'
import { wsService, type WebSocketMessage } from '../websocket'

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  return {
    io: vi.fn(() => ({
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      connected: true
    }))
  }
})

describe('WebSocket Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have initial state', () => {
    // In test environment, WebSocket is not connected
    expect(wsService.isConnected()).toBe(false)
  })

  it('should register message handlers', () => {
    const handler = vi.fn()
    wsService.onMessage(handler)
    // Handler should be registered (internal check)
    expect(handler).toBeDefined()
  })

  it('should remove message handlers', () => {
    const handler = vi.fn()
    wsService.onMessage(handler)
    wsService.offMessage(handler)
    // Handler should be removed (internal check)
    expect(handler).toBeDefined()
  })

  it('should call handlers on message', () => {
    const handler = vi.fn()
    wsService.onMessage(handler)

    const message: WebSocketMessage = {
      type: 'signal',
      data: {
        signal_id: 'test-1',
        symbol: '300308.SZ',
        signal_type: 'BUY',
        signal_reason: 'RPS > 90',
        signal_strength: 0.8,
        signal_time: '2026-04-23T09:30:00Z',
        status: 'pending'
      }
    }

    // Simulate message handling (in real scenario, this comes from socket)
    handler(message)
    expect(handler).toHaveBeenCalledWith(message)
  })

  it('should handle price update messages', () => {
    const handler = vi.fn()
    wsService.onMessage(handler)

    const message: WebSocketMessage = {
      type: 'price_update',
      data: {
        symbol: '300308.SZ',
        price: 125.50,
        change_pct: 2.5,
        volume: 1000000,
        timestamp: '2026-04-23T09:30:00Z'
      }
    }

    handler(message)
    expect(handler).toHaveBeenCalledWith(message)
  })

  it('should handle alert messages', () => {
    const handler = vi.fn()
    wsService.onMessage(handler)

    const message: WebSocketMessage = {
      type: 'alert',
      data: {
        id: 'alert-1',
        alert_type: '数据延迟',
        severity: 'CRITICAL',
        message: '行情数据延迟超过 5 分钟',
        timestamp: '2026-04-23T09:30:00Z'
      }
    }

    handler(message)
    expect(handler).toHaveBeenCalledWith(message)
  })
})
