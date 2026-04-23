/**
 * SparkPath 数据加密服务
 * 实现 AES-256-GCM 加密，用于保护用户个人数据
 * 
 * 合规要求:
 * - 100% 个人身份信息加密
 * - 100% 学习行为数据加密  
 * - 符合《个人信息保护法》和《儿童个人信息网络保护规定》
 */

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const randomBytesAsync = promisify(randomBytes);

export interface EncryptionConfig {
  /** 加密算法，默认 aes-256-gcm */
  algorithm?: string;
  /** 初始化向量长度，默认 16 字节 */
  ivLength?: number;
  /** 认证标签长度，默认 16 字节 */
  authTagLength?: number;
  /** 是否启用安全比较，默认 true */
  secureCompare?: boolean;
}

export class EncryptionService {
  private readonly algorithm: string;
  private readonly key: Buffer;
  private readonly ivLength: number;
  private readonly authTagLength: number;
  private readonly secureCompare: boolean;

  /**
   * 创建加密服务实例
   * @param encryptionKey 32字节的十六进制密钥字符串
   * @param config 加密配置选项
   */
  constructor(encryptionKey: string, config: EncryptionConfig = {}) {
    // 验证密钥格式
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('加密密钥必须是64字符的十六进制字符串 (32字节)');
    }

    this.key = Buffer.from(encryptionKey, 'hex');
    this.algorithm = config.algorithm || 'aes-256-gcm';
    this.ivLength = config.ivLength || 16;
    this.authTagLength = config.authTagLength || 16;
    this.secureCompare = config.secureCompare !== undefined ? config.secureCompare : true;

    // 验证算法支持
    const supportedAlgorithms = ['aes-256-gcm', 'aes-256-cbc'];
    if (!supportedAlgorithms.includes(this.algorithm)) {
      throw new Error(`不支持的加密算法: ${this.algorithm}`);
    }
  }

  /**
   * 加密明文数据
   * @param plaintext 要加密的明文字符串
   * @returns 加密后的字符串 (格式: iv:authTag:encrypted)
   */
  async encrypt(plaintext: string): Promise<string> {
    if (typeof plaintext !== 'string') {
      throw new Error('明文必须是字符串');
    }

    try {
      // 生成随机初始化向量
      const iv = await randomBytesAsync(this.ivLength);
      
      // 创建加密器
      const cipher = createCipheriv(this.algorithm, this.key, iv);
      
      // 执行加密
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // 获取认证标签 (仅 GCM 模式)
      let authTag = '';
      if (this.algorithm === 'aes-256-gcm') {
        const tag = cipher.getAuthTag();
        authTag = tag.toString('base64');
      }

      // 返回格式: iv:authTag:encrypted
      if (this.algorithm === 'aes-256-gcm') {
        return `${iv.toString('base64')}:${authTag}:${encrypted}`;
      } else {
        return `${iv.toString('base64')}:${encrypted}`;
      }
    } catch (error) {
      console.error('加密失败:', error);
      throw new Error(`加密失败: ${(error as Error).message}`);
    }
  }

  /**
   * 解密密文数据
   * @param ciphertext 要解密的密文字符串 (格式: iv:authTag:encrypted)
   * @returns 解密后的明文字符串
   */
  async decrypt(ciphertext: string): Promise<string> {
    if (typeof ciphertext !== 'string') {
      throw new Error('密文必须是字符串');
    }

    try {
      let iv: Buffer;
      let authTag: Buffer | null = null;
      let encrypted: string;

      if (this.algorithm === 'aes-256-gcm') {
        // GCM 模式: iv:authTag:encrypted
        const parts = ciphertext.split(':');
        if (parts.length !== 3) {
          throw new Error('密文格式错误: 期望格式 iv:authTag:encrypted');
        }
        
        iv = Buffer.from(parts[0], 'base64');
        authTag = Buffer.from(parts[1], 'base64');
        encrypted = parts[2];
      } else {
        // CBC 模式: iv:encrypted  
        const parts = ciphertext.split(':');
        if (parts.length !== 2) {
          throw new Error('密文格式错误: 期望格式 iv:encrypted');
        }
        
        iv = Buffer.from(parts[0], 'base64');
        encrypted = parts[1];
      }

      // 验证 IV 长度
      if (iv.length !== this.ivLength) {
        throw new Error(`IV 长度错误: 期望 ${this.ivLength} 字节, 实际 ${iv.length} 字节`);
      }

      // 创建解密器
      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      
      // 设置认证标签 (仅 GCM 模式)
      if (authTag) {
        decipher.setAuthTag(authTag);
      }

      // 执行解密
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('解密失败:', error);
      throw new Error(`解密失败: ${(error as Error).message}`);
    }
  }

  /**
   * 安全比较两个字符串 (防止时序攻击)
   * @param a 第一个字符串
   * @param b 第二个字符串
   * @returns 是否相等
   */
  secureCompare(a: string, b: string): boolean {
    if (!this.secureCompare) {
      return a === b;
    }

    try {
      const bufferA = Buffer.from(a, 'utf8');
      const bufferB = Buffer.from(b, 'utf8');
      
      // 长度不同直接返回 false
      if (bufferA.length !== bufferB.length) {
        return false;
      }
      
      // 使用 timingSafeEqual 进行安全比较
      return timingSafeEqual(bufferA, bufferB);
    } catch (error) {
      console.warn('安全比较失败，回退到普通比较:', error);
      return a === b;
    }
  }

  /**
   * 批量加密数据
   * @param data 要加密的数据数组
   * @returns 加密后的数据数组
   */
  async encryptBatch(data: string[]): Promise<string[]> {
    const promises = data.map(item => this.encrypt(item));
    return Promise.all(promises);
  }

  /**
   * 批量解密数据
   * @param data 要解密的数据数组  
   * @returns 解密后的数据数组
   */
  async decryptBatch(data: string[]): Promise<string[]> {
    const promises = data.map(item => this.decrypt(item));
    return Promise.all(promises);
  }

  /**
   * 加密 JSON 对象
   * @param obj 要加密的对象
   * @returns 加密后的字符串
   */
  async encryptJSON<T>(obj: T): Promise<string> {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  /**
   * 解密 JSON 对象
   * @param ciphertext 要解密的密文
   * @returns 解密后的对象
   */
  async decryptJSON<T>(ciphertext: string): Promise<T> {
    const jsonString = await this.decrypt(ciphertext);
    return JSON.parse(jsonString) as T;
  }
}

// 密钥生成工具函数
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}

// 环境变量密钥获取
export function getEncryptionKeyFromEnv(): string {
  const key = process.env.SPARKPATH_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('环境变量 SPARKPATH_ENCRYPTION_KEY 未设置');
  }
  return key;
}

// 默认加密服务实例
let defaultEncryptionService: EncryptionService | null = null;

export function getDefaultEncryptionService(): EncryptionService {
  if (!defaultEncryptionService) {
    const key = getEncryptionKeyFromEnv();
    defaultEncryptionService = new EncryptionService(key);
  }
  return defaultEncryptionService;
}
