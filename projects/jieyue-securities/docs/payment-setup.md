# 支付配置指南

## 微信支付配置

### 1. 申请商户号

**步骤**:
1. 访问 [微信支付商户平台](https://pay.weixin.qq.com)
2. 点击"立即入驻"
3. 准备材料:
   - 营业执照
   - 法人身份证
   - 对公账户信息
   - 特殊行业许可证（如需要）
4. 填写商户信息
5. 等待审核（1-3 个工作日）
6. 审核通过后签约

### 2. 获取 API 密钥

**步骤**:
1. 登录商户平台
2. 进入"账户中心" → "API 安全"
3. 设置 API 密钥（32 位字符串）
4. 下载 API 证书

### 3. 配置参数

```bash
# .env 文件
WECHAT_APP_ID=wx_xxx                    # 公众号/小程序 AppID
WECHAT_MCH_ID=1234567890                # 商户号
WECHAT_API_KEY=xxx                      # API 密钥（v2）
WECHAT_API_SECRET=xxx                   # API v3 密钥
WECHAT_CERT_PATH=/path/to/apiclient_cert.pem
WECHAT_KEY_PATH=/path/to/apiclient_key.pem
```

### 4. 沙箱测试

微信支付提供沙箱环境用于测试:

```python
# 使用沙箱配置
wechat_pay = WeChatPayService(
    app_id="wx_xxx",
    mch_id="1234567890",
    api_key="test_key",
    sandbox=True  # 启用沙箱
)
```

### 5. 生产切换

```python
# 生产配置
wechat_pay = WeChatPayService(
    app_id="wx_xxx",
    mch_id="1234567890",
    api_key="production_key",
    api_secret="production_secret",
    cert_path="/etc/certs/apiclient_cert.pem",
    key_path="/etc/certs/apiclient_key.pem",
    sandbox=False  # 关闭沙箱
)
```

---

## 支付宝配置

### 1. 申请商户号

**步骤**:
1. 访问 [支付宝开放平台](https://open.alipay.com)
2. 点击"立即入驻"
3. 准备材料:
   - 营业执照
   - 法人身份证
   - 对公账户信息
4. 完成实名认证
5. 创建应用
6. 签约产品（手机网站支付/电脑网站支付）

### 2. 配置密钥

**步骤**:
1. 下载支付宝密钥生成工具
2. 生成应用私钥和公钥
3. 在开放平台配置公钥
4. 下载支付宝公钥

### 3. 配置参数

```bash
# .env 文件
ALIPAY_APP_ID=2021000000000000        # 应用 APPID
ALIPAY_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...  # 应用私钥
ALIPAY_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...       # 支付宝公钥
```

### 4. 沙箱测试

支付宝提供沙箱环境:

```python
# 使用沙箱配置
alipay_pay = AlipayService(
    app_id="2021000000000000",
    private_key="sandbox_private_key",
    alipay_public_key="sandbox_public_key",
    sandbox=True  # 启用沙箱
)
```

**沙箱账号**:
- 买家账号：查看沙箱环境
- 卖家账号：查看沙箱环境

### 5. 生产切换

```python
# 生产配置
alipay_pay = AlipayService(
    app_id="2021000000000000",
    private_key="production_private_key",
    alipay_public_key="production_public_key",
    sandbox=False  # 关闭沙箱
)
```

---

## 回调地址配置

### 微信支付回调

1. 登录商户平台
2. 进入"产品中心" → "开发配置"
3. 配置支付回调 URL:
   ```
   https://api.jieyue.com/api/payment/wechat/notify
   ```
4. 确保外网可访问

### 支付宝回调

1. 登录开放平台
2. 进入应用详情
3. 配置网关地址:
   ```
   https://openapi.alipay.com/gateway.do
   ```
4. 配置回调地址:
   ```
   https://api.jieyue.com/api/payment/alipay/notify
   ```

---

## 测试流程

### 1. 沙箱测试

```bash
# 1. 启动服务
docker-compose up -d

# 2. 创建测试订单
curl -X POST http://localhost:8000/api/payment/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"amount": 0.01, "method": "wechat"}'

# 3. 使用沙箱账号支付
# 微信：使用沙箱扫码
# 支付宝：使用沙箱账号登录

# 4. 查询订单状态
curl http://localhost:8000/api/payment/query-order/ORDER_xxx \
  -H "Authorization: Bearer <token>"
```

### 2. 生产验证

```bash
# 1. 充值小额测试（¥0.01）
# 2. 验证余额到账
# 3. 测试退款流程
# 4. 验证退款到账
```

---

## 安全建议

### 1. 密钥管理

- ✅ 使用环境变量存储密钥
- ✅ 生产环境使用密钥管理服务（KMS）
- ✅ 定期轮换密钥
- ❌ 不要将密钥提交到代码仓库

### 2. 签名验证

- ✅ 严格验证回调签名
- ✅ 使用 HTTPS 传输
- ✅ 验证订单金额一致性
- ✅ 防止重放攻击

### 3. 风控措施

- ✅ 设置单日充值限额
- ✅ 大额充值人工审核
- ✅ 异常交易监控
- ✅ IP 黑白名单

---

## 常见问题

### Q: 回调收不到怎么办？

A: 检查:
1. 回调 URL 是否外网可访问
2. 防火墙是否放行
3. 服务器日志是否有记录
4. 使用内网穿透工具测试（ngrok）

### Q: 签名验证失败？

A: 检查:
1. 密钥是否正确
2. 签名算法是否匹配
3. 参数顺序是否正确
4. 时间戳是否在有效期内

### Q: 支付成功但余额未到账？

A: 检查:
1. 回调处理逻辑
2. 数据库事务是否正常
3. 订单状态是否正确更新
4. 查看日志排查问题

---

## 技术支持

- 微信支付客服：95017
- 支付宝客服：95188
- 技术支持邮箱：support@jieyue.com

---

**最后更新**: 2026-04-01  
**版本**: v1.0.0
