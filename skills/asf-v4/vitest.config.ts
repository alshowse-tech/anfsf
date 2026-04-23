import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // 全局超时
    timeout: 30000,
    
    // 测试环境
    environment: 'node',
    
    // 覆盖率配置
    coverage: {
      // 覆盖率提供者
      provider: 'v8',
      
      // 报告格式
      reporter: ['text', 'json', 'html', 'lcov'],
      
      // 输出目录
      reportsDirectory: './coverage',
      
      // 排除的文件
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '*.d.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mocks/**',
        '**/test-utils/**',
        '**/types.ts'
      ],
      
      // 覆盖率门槛 (先禁用，等测试迁移完成后再启用)
      // thresholds: {
      //   global: {
      //     branches: 85,
      //     functions: 90,
      //     lines: 90,
      //     statements: 90
      //   }
      // },
      
      // 包含的文件
      include: [
        'src/**/*.ts',
        '!src/**/*.test.ts',
        '!src/**/*.spec.ts',
        '!src/**/*.d.ts'
      ],
      
      // 是否报告未覆盖的代码
      reportOnFailure: true,
      
      // 是否只报告变更的文件
      changedOnly: false
    },
    
    // 测试文件匹配
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts'
    ],
    
    // 排除的文件
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.d.ts'
    ],
    
    // 测试隔离
    isolate: true,
    
    // 并发数
    maxConcurrency: 4,
    
    // 失败时继续
    bail: 0,
    
    // 随机种子
    sequence: {
      seed: 1234,
      shuffle: false
    },
    
    // 日志
    logHeapUsage: true,
    
    // 测试转换
    transformMode: {
      web: [
        '\\.[jt]sx$',
        '\\.css$'
      ]
    },
    
    // 模拟
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    
    // 设置文件
    setupFiles: [
      './tests/setup.ts'
    ],
    
    // 测试报告
    reporters: ['default', 'html'],
    
    // 输出文件
    outputFile: {
      html: './test-results/html/index.html',
      json: './test-results/json/results.json'
    }
  },
  
  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@harness': resolve(__dirname, './src/harness'),
      '@skills': resolve(__dirname, './src/skills'),
      '@core': resolve(__dirname, './src/core'),
      '@knowledge': resolve(__dirname, './src/knowledge')
    }
  },
  
  // 定义常量
  define: {
    __VERSION__: JSON.stringify('2.9.0'),
    __TEST__: true
  }
})
