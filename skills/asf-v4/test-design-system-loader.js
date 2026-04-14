#!/usr/bin/env node

/**
 * Design System Loader 测试脚本
 */

const { DesignSystemConfigLoader } = require('./dist/design');

async function main() {
  console.log('🧪 Testing Design System Config Loader...');
  
  const loader = DesignSystemConfigLoader.getInstance();
  
  // 测试用例
  const testCases = [
    '使用 linear 风格，生成一个 AI SaaS 落地页',
    '生成一个支付系统的后台管理页面',
    '按苹果风格设计移动端页面',
    '创建一个音乐播放器界面',
    '构建一个 AI 聊天机器人',
    '开发一个数据库管理工具',
    '普通页面'
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Input: "${testCase}"`);
    const result = loader.match(testCase);
    console.log(`✅ Matched: ${result.designSystem} (${result.matchedBy}, confidence: ${result.confidence})`);
    if (result.metadata) {
      console.log(`   Name: ${result.metadata.name}`);
      console.log(`   Color: ${result.metadata.primaryColor}`);
      console.log(`   Dark Mode: ${result.metadata.darkMode}`);
    }
  }
  
  console.log('\n🎉 All tests completed!');
}

if (require.main === module) {
  main().catch(console.error);
}