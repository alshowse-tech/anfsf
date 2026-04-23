/**
 * Vitest 全局设置
 * 
 * 在所有测试之前执行一次
 */
import type { GlobalSetupContext } from 'vitest/node'

export async function setup({ provide }: GlobalSetupContext) {
  console.log('🚀 Vitest 全局设置启动')
  
  // 设置测试环境变量
  process.env.NODE_ENV = 'test'
  process.env.ANF_SF_VERSION = '2.9.0'
  
  // 提供全局数据
  provide('testStartTime', Date.now())
  
  console.log('✅ Vitest 全局设置完成')
}

export async function teardown({ provide }: GlobalSetupContext) {
  console.log('🛑 Vitest 全局清理')
  
  const startTime = provide('testStartTime')
  const duration = Date.now() - startTime
  
  console.log(`📊 测试总耗时：${duration}ms`)
}
