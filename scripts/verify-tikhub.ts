#!/usr/bin/env ts-node
/**
 * TikHub API 连接验证脚本
 * 用于测试 API 连通性和验证配置
 */

import { TikHubClient } from '../../src/integrations/tikhub';

async function verifyConnection() {
  console.log('🔍 TikHub API 连接验证...\n');

  const apiKey = process.env.TIKHUB_API_KEY;
  
  if (!apiKey) {
    console.error('❌ 错误：未设置 TIKHUB_API_KEY 环境变量');
    console.log('\n请设置环境变量:');
    console.log('  export TIKHUB_API_KEY="your-api-key"');
    process.exit(1);
  }

  const isGlobal = process.env.TIKHUB_REGION === 'GLOBAL';
  const baseURL = isGlobal 
    ? 'https://api.tikhub.io' 
    : 'https://api.tikhub.dev';

  console.log(`📍 API 域名：${baseURL}`);
  console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}`);
  console.log('');

  const client = new TikHubClient({
    apiKey,
    baseURL,
    timeout: 30000,
    retryCount: 2,
  });

  try {
    // 测试 1: 检查余额
    console.log('📊 测试 1: 检查账户余额...');
    const balance = await client.checkBalance();
    console.log(`   ✅ 余额：${balance.balance} ${balance.currency}`);
    console.log(`   🆓 免费账户：${balance.isFree ? '是' : '否'}`);
    console.log('');

    // 测试 2: 检查速率限制
    console.log('📊 测试 2: 检查速率限制...');
    const rateLimit = await client.checkRateLimit();
    console.log(`   📈 限制：${rateLimit.limit} 请求/分钟`);
    console.log(`   📉 剩余：${rateLimit.remaining} 请求`);
    console.log(`   🕐 重置：${new Date(rateLimit.reset * 1000).toLocaleString()}`);
    console.log('');

    // 测试 3: 获取抖音热点榜
    console.log('📊 测试 3: 获取抖音热点榜...');
    const hotList = await client.douyin.getHotBillboard();
    console.log(`   ✅ 平台：${hotList.platform}`);
    console.log(`   📋 榜单项数：${hotList.items.length}`);
    if (hotList.items.length > 0) {
      console.log(`   🔥 TOP 1: ${hotList.items[0].title}`);
    }
    console.log('');

    console.log('✅ 所有测试通过！API 连接正常。\n');
    return true;
  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    if (error.statusCode) {
      console.error(`   HTTP 状态码：${error.statusCode}`);
      console.error(`   错误代码：${error.code}`);
    }
    console.log('\n可能的原因:');
    console.log('   1. API Key 无效或已过期');
    console.log('   2. 网络连接问题');
    console.log('   3. API 服务暂时不可用');
    console.log('   4. 账户余额不足');
    return false;
  }
}

// 运行验证
verifyConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ 未处理的错误:', error);
    process.exit(1);
  });
