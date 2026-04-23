/**
 * EncryptionService 测试文件
 */

import { generateEncryptionKey } from './encryption-service.ts';
import { EncryptionService } from './encryption-service.ts';

async function testEncryptionService() {
  console.log('🧪 测试 EncryptionService...');
  
  // 生成测试密钥
  const testKey = generateEncryptionKey();
  console.log('🔑 生成测试密钥:', testKey.substring(0, 8) + '...');
  
  // 创建加密服务
  const encryptionService = new EncryptionService(testKey);
  
  // 测试基本加密/解密
  const originalText = 'Hello, SparkPath! 这是测试数据。';
  const encrypted = await encryptionService.encrypt(originalText);
  const decrypted = await encryptionService.decrypt(encrypted);
  
  console.log('📝 原文:', originalText);
  console.log('🔒 加密:', encrypted.substring(0, 50) + '...');
  console.log('🔓 解密:', decrypted);
  console.log('✅ 基本加密/解密测试:', originalText === decrypted ? '通过' : '失败');
  
  // 测试 JSON 加密/解密
  const originalObj = { name: '张三', age: 12, grade: '六年级' };
  const encryptedJSON = await encryptionService.encryptJSON(originalObj);
  const decryptedJSON = await encryptionService.decryptJSON(encryptedJSON);
  
  console.log('📄 原对象:', originalObj);
  console.log('🔒 JSON加密:', encryptedJSON.substring(0, 50) + '...');
  console.log('🔓 JSON解密:', decryptedJSON);
  console.log('✅ JSON 加密/解密测试:', JSON.stringify(originalObj) === JSON.stringify(decryptedJSON) ? '通过' : '失败');
  
  // 测试批量操作
  const batchData = ['数据1', '数据2', '数据3'];
  const encryptedBatch = await encryptionService.encryptBatch(batchData);
  const decryptedBatch = await encryptionService.decryptBatch(encryptedBatch);
  
  console.log('📦 批量原文:', batchData);
  console.log('📦 批量解密:', decryptedBatch);
  console.log('✅ 批量操作测试:', JSON.stringify(batchData) === JSON.stringify(decryptedBatch) ? '通过' : '失败');
  
  console.log('🎉 所有测试完成!');
}

// 运行测试
testEncryptionService().catch(console.error);