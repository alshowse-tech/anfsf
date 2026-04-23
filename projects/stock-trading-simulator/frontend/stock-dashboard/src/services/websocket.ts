/**
 * WebSocket 实时推送服务
 * 用于接收实时交易信号、行情更新、告警推送
 */

import { io, type Socket } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

export interface SignalMessage {
  type: 'signal'
  data: {
    signal_id: string
    symbol: string
    signal_type: 'BUY' | 'SELL' | 'HOLD' | 'REBUY'
    signal_reason: string
    signal_strength: number
    signal_time: string
    status: 'pending' | 'executed'
  }
}

export interface PriceUpdateMessage {
  type: 'price_update'
  data: {
    symbol: string
    price: number
    change_pct: number
    volume: number
    timestamp: string
  }
}

export interface AlertMessage {
  type: 'alert'
  data: {
    id: string
    alert_type: string
    severity: 'WARNING' | 'CRITICAL'
    message: string
    timestamp: string
  }
}

export type WebSocketMessage = SignalMessage | PriceUpdateMessage | AlertMessage

type MessageHandler = (message: WebSocketMessage) => void

class WebSocketService {
  private socket: Socket | null = null
  private handlers: MessageHandler[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000

  connect() {
    if (this.socket?.connected) {
      console.log('WebSocket already connected')
      return
    }

    console.log('Connecting to WebSocket:', WS_URL)
    
    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: this.maxReconnectAttempts
    })

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached')
      }
    })

    // Subscribe to market data channel
    this.socket.on('market_data', (data: PriceUpdateMessage['data']) => {
      this.handleMessage({ type: 'price_update', data })
    })

    // Subscribe to trading signals channel
    this.socket.on('trading_signal', (data: SignalMessage['data']) => {
      this.handleMessage({ type: 'signal', data })
    })

    // Subscribe to alerts channel
    this.socket.on('alert', (data: AlertMessage['data']) => {
      this.handleMessage({ type: 'alert', data })
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler)
  }

  offMessage(handler: MessageHandler) {
    const index = this.handlers.indexOf(handler)
    if (index > -1) {
      this.handlers.splice(index, 1)
    }
  }

  private handleMessage(message: WebSocketMessage) {
    this.handlers.forEach(handler => {
      try {
        handler(message)
      } catch (error) {
        console.error('Error in message handler:', error)
      }
    })
  }

  // Subscribe to specific symbol
  subscribe(symbol: string) {
    this.socket?.emit('subscribe', { symbol })
  }

  // Unsubscribe from specific symbol
  unsubscribe(symbol: string) {
    this.socket?.emit('unsubscribe', { symbol })
  }

  // Subscribe to all symbols in watchlist
  subscribeWatchlist(symbols: string[]) {
    this.socket?.emit('subscribe_watchlist', { symbols })
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }
}

// Export singleton instance
export const wsService = new WebSocketService()

// Auto-connect on import (disabled in test environment)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  wsService.connect()
}
