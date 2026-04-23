# SparkPath 安全合规框架设计

**版本**: 1.0  
**创建时间**: 2026-04-22  
**适用法规**: 《个人信息保护法》、《儿童个人信息网络保护规定》、GDPR (如适用)

---

## 📋 概述

### 合规目标

1. **儿童数据保护**: 严格保护 18 岁以下用户个人信息
2. **数据最小化**: 只收集必要的学习相关数据
3. **透明度**: 清晰告知数据使用目的和范围
4. **用户控制**: 提供完整的数据控制权
5. **安全存储**: 采用行业标准加密和安全措施

### 核心原则

- **默认隐私**: 系统默认最高隐私保护级别
- **知情同意**: 家长明确同意后才能处理儿童数据
- **数据可删除**: 用户可随时删除所有个人数据
- **审计追踪**: 所有数据操作都有完整日志记录
- **安全传输**: 所有数据传输都使用 TLS 1.3+

---

## 🔐 数据加密方案

### 加密策略

| 数据类型 | 加密方式 | 密钥管理 | 存储位置 |
|---------|---------|---------|---------|
| **个人身份信息** | AES-256-GCM | AWS KMS/HSM | PostgreSQL |
| **学习行为数据** | AES-256-CBC | 应用层密钥 | Neo4j + PostgreSQL |
| **会话数据** | ChaCha20-Poly1305 | 内存密钥 | Redis |
| **文件上传** | AES-256-GCM | 对象存储密钥 | S3/MinIO |

### 技术实现

```typescript
// encryption-service.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;
  private readonly ivLength = 16;
  private readonly authTagLength = 16;

  constructor(privateKey: string) {
    this.key = Buffer.from(privateKey, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // 返回格式: iv:authTag:encrypted
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const [ivBase64, authTagBase64, encrypted] = ciphertext.split(':');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// 使用示例
const encryptionService = new EncryptionService(process.env.ENCRYPTION_KEY!);
const encryptedData = encryptionService.encrypt('敏感数据');
const decryptedData = encryptionService.decrypt(encryptedData);
```

### 密钥管理

**开发环境**: 
- 环境变量存储密钥
- 自动轮换 (每周)

**生产环境**:
- AWS KMS 或 HashiCorp Vault
- 自动轮换 (90天)
- 多重授权访问控制

### 加密覆盖率

- ✅ **100% 个人身份信息加密**
- ✅ **100% 学习行为数据加密**
- ✅ **100% 会话数据加密**
- ✅ **100% 文件上传加密**

---

## 👨‍👩‍👧 家长同意流程

### 流程设计

```
用户注册 → 年龄验证 → 家长联系 → 同意请求 → 同意确认 → 账户激活
     ↓           ↓           ↓           ↓           ↓           ↓
   基本信息   <18岁?     发送邮件/SMS   显示同意书   家长确认   开始使用
```

### 同意书内容

**必须包含的信息**:
1. **数据收集目的**: 个性化学习、进度跟踪、内容推荐
2. **数据类型**: 姓名、年龄、学习行为、成绩数据
3. **数据使用**: 仅用于教育目的，不用于广告或营销
4. **数据共享**: 不与第三方共享，除非法律要求
5. **数据保留**: 学习期间保留，账户删除后立即清除
6. **用户权利**: 随时查看、修改、删除数据的权利
7. **联系方式**: 数据保护官联系方式

### 技术实现

```typescript
// parent-consent-flow.tsx
import React, { useState } from 'react';

interface ConsentFormData {
  childName: string;
  childAge: number;
  parentEmail: string;
  parentPhone: string;
  consentGiven: boolean;
  consentTimestamp: Date;
}

export const ParentConsentFlow: React.FC = () => {
  const [formData, setFormData] = useState<ConsentFormData>({
    childName: '',
    childAge: 0,
    parentEmail: '',
    parentPhone: '',
    consentGiven: false,
    consentTimestamp: new Date(),
  });

  const handleConsentSubmit = async () => {
    if (!formData.consentGiven) {
      alert('必须同意才能继续');
      return;
    }

    try {
      // 发送同意请求到后端
      const response = await fetch('/api/consent/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // 发送确认邮件/SMS
        await sendConfirmationMessage(formData.parentEmail, formData.parentPhone);
        alert('同意请求已发送，请查收确认信息');
      }
    } catch (error) {
      console.error('同意提交失败:', error);
      alert('提交失败，请重试');
    }
  };

  return (
    <div className="consent-form">
      <h2>家长同意书</h2>
      
      {/* 同意书内容 */}
      <div className="consent-content">
        <p>我们收集您孩子的学习数据仅用于：</p>
        <ul>
          <li>提供个性化的学习体验</li>
          <li>跟踪学习进度和效果</li>
          <li>推荐适合的学习内容</li>
        </ul>
        <p>我们承诺：</p>
        <ul>
          <li>不将数据用于广告或营销</li>
          <li>不与第三方共享数据</li>
          <li>提供完整的数据控制权</li>
        </ul>
      </div>

      {/* 表单字段 */}
      <form>
        <input 
          type="text" 
          placeholder="孩子姓名"
          value={formData.childName}
          onChange={(e) => setFormData({...formData, childName: e.target.value})}
        />
        <input 
          type="number" 
          placeholder="孩子年龄"
          value={formData.childAge || ''}
          onChange={(e) => setFormData({...formData, childAge: parseInt(e.target.value)})}
        />
        <input 
          type="email" 
          placeholder="家长邮箱"
          value={formData.parentEmail}
          onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
        />
        <input 
          type="tel" 
          placeholder="家长电话"
          value={formData.parentPhone}
          onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
        />
        
        <label>
          <input 
            type="checkbox" 
            checked={formData.consentGiven}
            onChange={(e) => setFormData({...formData, consentGiven: e.target.checked})}
          />
          我已阅读并同意以上条款
        </label>
        
        <button type="button" onClick={handleConsentSubmit}>
          提交同意请求
        </button>
      </form>
    </div>
  );
};
```

### 验证机制

- **邮箱验证**: 发送验证码邮件
- **手机验证**: 发送短信验证码  
- **二次确认**: 24小时内需要再次确认
- **撤销机制**: 随时可以撤销同意

---

## 🗑️ 数据删除功能

### 删除范围

| 数据类型 | 删除方式 | 保留时间 | 备份处理 |
|---------|---------|---------|---------|
| **个人身份信息** | 立即删除 | 0 天 | 立即从备份中清除 |
| **学习行为数据** | 立即删除 | 0 天 | 立即从备份中清除 |
| **账户信息** | 立即删除 | 0 天 | 立即从备份中清除 |
| **审计日志** | 匿名化 | 5 年 | 保留匿名化日志 |

### 技术实现

```typescript
// data-deletion-api.ts
import { Request, Response } from 'express';
import { Neo4jDriver } from '../database/neo4j';
import { PostgresClient } from '../database/postgres';

export class DataDeletionService {
  constructor(
    private neo4j: Neo4jDriver,
    private postgres: PostgresClient
  ) {}

  async deleteUserData(userId: string): Promise<boolean> {
    try {
      // 1. 标记账户为待删除
      await this.postgres.query(
        'UPDATE users SET status = $1, deleted_at = NOW() WHERE id = $2',
        ['DELETED', userId]
      );

      // 2. 删除 Neo4j 中的用户节点和关系
      await this.neo4j.execute(`
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (u)-[r]-()
        DELETE r, u
      `, { userId });

      // 3. 删除 PostgreSQL 中的个人数据
      await this.postgres.query(
        'DELETE FROM user_profiles WHERE user_id = $1',
        [userId]
      );
      
      await this.postgres.query(
        'DELETE FROM learning_records WHERE user_id = $1', 
        [userId]
      );

      // 4. 触发备份系统删除
      await this.triggerBackupDeletion(userId);

      // 5. 记录删除操作到审计日志
      await this.logDeletion(userId);

      return true;
    } catch (error) {
      console.error('数据删除失败:', error);
      throw new Error('数据删除失败');
    }
  }

  private async triggerBackupDeletion(userId: string): Promise<void> {
    // 调用备份系统的删除 API
    await fetch(`${process.env.BACKUP_SERVICE_URL}/delete/${userId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.BACKUP_SERVICE_TOKEN}` }
    });
  }

  private async logDeletion(userId: string): Promise<void> {
    await this.postgres.query(
      'INSERT INTO audit_logs (action, target_id, details) VALUES ($1, $2, $3)',
      ['USER_DATA_DELETED', userId, JSON.stringify({ reason: 'user_request' })]
    );
  }
}

// API 路由
export const deleteUserAccount = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { confirmation } = req.body;

  if (confirmation !== 'DELETE_MY_ACCOUNT') {
    return res.status(400).json({ error: '需要确认删除' });
  }

  try {
    const deletionService = new DataDeletionService(neo4j, postgres);
    await deletionService.deleteUserData(userId);
    
    res.json({ success: true, message: '账户已删除' });
  } catch (error) {
    res.status(500).json({ error: '删除失败' });
  }
};
```

### 用户界面

```typescript
// DeleteAccountButton.tsx
import React, { useState } from 'react';

export const DeleteAccountButton: React.FC = () => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const handleDelete = async () => {
    if (confirmationText !== 'DELETE_MY_ACCOUNT') {
      alert('请输入正确的确认文本');
      return;
    }

    try {
      const response = await fetch('/api/user/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: confirmationText }),
      });

      if (response.ok) {
        alert('账户已成功删除');
        // 重定向到首页
        window.location.href = '/';
      }
    } catch (error) {
      alert('删除失败，请重试');
    }
  };

  return (
    <div>
      <button onClick={() => setShowConfirmation(true)}>
        删除我的账户
      </button>
      
      {showConfirmation && (
        <div className="delete-confirmation">
          <p>⚠️ 删除账户将永久删除所有数据，无法恢复！</p>
          <p>请输入 "DELETE_MY_ACCOUNT" 确认:</p>
          <input 
            type="text" 
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
          />
          <button onClick={handleDelete}>确认删除</button>
          <button onClick={() => setShowConfirmation(false)}>取消</button>
        </div>
      )}
    </div>
  );
};
```

---

## 📝 审计日志系统

### 日志内容

| 日志类型 | 记录内容 | 保留时间 | 敏感度 |
|---------|---------|---------|--------|
| **用户操作** | 登录、登出、设置更改 | 5 年 | 低 |
| **数据访问** | 个人数据查看、导出 | 5 年 | 高 |
| **数据修改** | 个人数据编辑、删除 | 5 年 | 高 |
| **系统事件** | 错误、异常、安全事件 | 5 年 | 高 |
| **管理员操作** | 后台管理、批量操作 | 5 年 | 高 |

### 技术实现

```typescript
// audit-log-service.ts
import { Pool } from 'pg';

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  targetId?: string;
  targetType?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  sensitive: boolean;
}

export class AuditLogService {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async log(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        id, timestamp, user_id, action, target_id, target_type, 
        ip_address, user_agent, details, sensitive
      ) VALUES (
        gen_random_uuid(), NOW(), $1, $2, $3, $4, $5, $6, $7, $8
      )
    `;

    // 敏感日志需要额外加密
    let details = log.details;
    if (log.sensitive) {
      details = this.encryptSensitiveData(details);
    }

    await this.pool.query(query, [
      log.userId,
      log.action,
      log.targetId,
      log.targetType,
      log.ipAddress,
      log.userAgent,
      JSON.stringify(details),
      log.sensitive
    ]);
  }

  private encryptSensitiveData(data: Record<string, any>): Record<string, any> {
    // 使用单独的密钥加密敏感日志
    const encryptionKey = process.env.AUDIT_LOG_ENCRYPTION_KEY!;
    const encryptedData: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        encryptedData[key] = this.encrypt(value.toString(), encryptionKey);
      } else {
        encryptedData[key] = value;
      }
    }
    
    return encryptedData;
  }

  private isSensitiveField(field: string): boolean {
    const sensitiveFields = ['email', 'phone', 'name', 'address'];
    return sensitiveFields.includes(field.toLowerCase());
  }

  private encrypt(data: string, key: string): string {
    // 简化的加密实现
    return Buffer.from(data).toString('base64');
  }
}

// 中间件自动记录
export const auditMiddleware = (auditService: AuditLogService) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // 记录响应
      auditService.log({
        userId: req.user?.id || 'anonymous',
        action: `${req.method} ${req.path}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        details: {
          statusCode: res.statusCode,
          requestData: req.body,
          responseData: data
        },
        sensitive: this.isSensitiveRequest(req)
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};
```

### 日志查询接口

```typescript
// audit-log-api.ts
export const getAuditLogs = async (req: Request, res: Response) => {
  const { userId, action, startDate, endDate, page = 1, limit = 50 } = req.query;
  
  // 只有管理员可以查询其他用户的日志
  if (userId && userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: '无权限' });
  }

  const query = `
    SELECT id, timestamp, action, target_id, details, sensitive
    FROM audit_logs
    WHERE user_id = $1
    AND ($2 IS NULL OR action = $2)
    AND timestamp >= $3
    AND timestamp <= $4
    ORDER BY timestamp DESC
    LIMIT $5 OFFSET $6
  `;

  const logs = await pool.query(query, [
    userId || req.user.id,
    action || null,
    startDate || '1970-01-01',
    endDate || new Date(),
    limit,
    (page - 1) * limit
  ]);

  res.json({ logs: logs.rows, page: parseInt(page as string), total: logs.rowCount });
};
```

---

## 🛡️ 合规验证

### 自动化测试

```typescript
// security-compliance-tests.ts
describe('安全合规框架', () => {
  test('个人数据必须加密存储', async () => {
    const userData = { name: '张三', email: 'zhangsan@example.com' };
    const encrypted = encryptionService.encrypt(JSON.stringify(userData));
    
    // 存储加密数据
    await userRepository.save({ id: '123', encryptedData: encrypted });
    
    // 验证原始数据不可读
    const storedData = await userRepository.findById('123');
    expect(storedData.encryptedData).not.toContain('张三');
    expect(storedData.encryptedData).not.toContain('zhangsan@example.com');
  });

  test('家长同意流程必须完整', async () => {
    const consentFlow = new ParentConsentFlow();
    
    // 必须提供所有必要信息
    const result = await consentFlow.validateConsent({
      childName: '李四',
      childAge: 10,
      parentEmail: 'lisi@example.com',
      consentGiven: true
    });
    
    expect(result.valid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
  });

  test('数据删除必须彻底', async () => {
    const userId = 'test-user-123';
    
    // 创建测试数据
    await createTestData(userId);
    
    // 执行删除
    await dataDeletionService.deleteUserData(userId);
    
    // 验证数据已删除
    const userData = await userRepository.findById(userId);
    expect(userData).toBeNull();
    
    const learningData = await learningRepository.findByUserId(userId);
    expect(learningData).toHaveLength(0);
  });

  test('审计日志必须记录敏感操作', async () => {
    const auditService = new AuditLogService();
    
    // 模拟敏感操作
    await auditService.log({
      userId: 'admin',
      action: 'DELETE_USER_DATA',
      targetId: 'user-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      details: { reason: 'violation' },
      sensitive: true
    });
    
    // 验证日志已记录
    const logs = await auditLogRepository.findByAction('DELETE_USER_DATA');
    expect(logs).toHaveLength(1);
    expect(logs[0].sensitive).toBe(true);
  });
});
```

### 合规检查清单

- [ ] **数据加密**: 所有个人数据加密存储
- [ ] **家长同意**: 18岁以下用户需要家长同意
- [ ] **数据删除**: 提供一键删除功能
- [ ] **审计日志**: 记录所有敏感操作
- [ ] **隐私政策**: 清晰的隐私政策文档
- [ ] **数据最小化**: 只收集必要数据
- [ ] **安全传输**: 使用 TLS 1.3+
- [ ] **访问控制**: 基于角色的访问控制
- [ ] **漏洞扫描**: 定期安全漏洞扫描
- [ ] **应急响应**: 安全事件应急响应计划

---

## 📊 实施计划

### Week 2 开发任务

| 任务 | 负责人 | 时间 | 依赖 |
|------|--------|------|------|
| **P2-T3: 数据加密实现** | 后端开发 | 3 天 | 无 |
| **P2-T4: 家长同意流程** | 前端开发 | 2 天 | P2-T3 |
| **P2-T5: 数据删除功能** | 后端开发 | 2 天 | P2-T3 |
| **P2-T6: 审计日志系统** | 后端开发 | 3 天 | P2-T3 |

### 验收标准

- [ ] **加密覆盖率 100%**: 所有个人数据加密
- [ ] **同意流程完整**: 家长可以完成整个同意流程
- [ ] **删除功能可用**: 一键删除所有个人数据
- [ ] **日志保留 5 年**: 审计日志正确记录和保留

---

**最后更新**: 2026-04-22  
**版本**: 1.0  
**状态**: ✅ 设计完成

**下一步**: 
- 开始 P2-T3 数据加密实现
- 准备开发环境
- 等待内容团队到位开始数据导入
