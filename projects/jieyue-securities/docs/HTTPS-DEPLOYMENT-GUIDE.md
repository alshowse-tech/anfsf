# 捷阅证券信息助手 - HTTPS 配置部署指南

本文档详细说明如何为捷阅证券信息助手配置 HTTPS，包括开发环境和生产环境。

---

## 目录

1. [概述](#概述)
2. [开发环境配置](#开发环境配置)
3. [生产环境配置（Let's Encrypt）](#生产环境配置 letsencrypt)
4. [Nginx 配置说明](#nginx 配置说明)
5. [故障排查](#故障排查)
6. [安全最佳实践](#安全最佳实践)

---

## 概述

### 为什么需要 HTTPS？

- **数据加密**：保护用户数据在传输过程中不被窃取
- **身份验证**：确保用户访问的是正确的服务器
- **SEO 优化**：搜索引擎优先收录 HTTPS 网站
- **合规要求**：金融类应用必须使用 HTTPS

### 架构说明

```
用户 → Nginx (SSL 终止) → Backend/Frontend
           ↓
      Let's Encrypt (生产)
      自签名证书 (开发)
```

---

## 开发环境配置

### 1. 生成自签名证书

执行以下命令生成自签名 SSL 证书：

```bash
cd /root/.openclaw/workspace-main/projects/jieyue-securities
chmod +x infrastructure/nginx/generate-ssl-cert.sh
./infrastructure/nginx/generate-ssl-cert.sh
```

这将生成：
- `infrastructure/nginx/ssl/cert.pem` - SSL 证书
- `infrastructure/nginx/ssl/key.pem` - SSL 私钥

### 2. 启动 HTTPS 服务

```bash
docker-compose -f infrastructure/nginx/docker-compose.ssl.yml up -d
```

### 3. 访问服务

- HTTPS: https://localhost
- HTTP 会自动重定向到 HTTPS

### 4. 浏览器信任自签名证书

**Chrome/Edge:**
1. 访问 https://localhost
2. 点击"高级" → "继续访问（不安全）"
3. 或导入证书到受信任的根证书颁发机构

**Firefox:**
1. 访问 https://localhost
2. 点击"高级" → "接受风险并继续"

---

## 生产环境配置（Let's Encrypt）

### 前置条件

- 已备案的域名
- 域名解析到服务器 IP
- 80 和 443 端口开放

### 1. 准备域名

将域名 DNS 解析到服务器：

```
A 记录：your-domain.com → 服务器 IP
A 记录：www.your-domain.com → 服务器 IP
```

### 2. 修改 Nginx 配置

编辑 `infrastructure/nginx/nginx.conf`，将 `server_name _` 改为实际域名：

```nginx
server_name your-domain.com www.your-domain.com;
```

### 3. 获取 SSL 证书

#### 方法一：使用 Certbot（推荐）

```bash
# 安装 Certbot
apt update
apt install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期测试
certbot renew --dry-run
```

#### 方法二：Docker Certbot

```bash
# 停止 Nginx
docker-compose stop nginx

# 获取证书
docker run --rm \
  -v $(pwd)/infrastructure/nginx/certbot:/var/www/certbot \
  -v $(pwd)/infrastructure/nginx/ssl:/etc/letsencrypt \
  certbot/certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d your-domain.com \
  -d www.your-domain.com

# 重启 Nginx
docker-compose start nginx
```

### 4. 配置证书自动续期

创建 cron 任务：

```bash
crontab -e
```

添加以下内容（每天凌晨 2 点检查续期）：

```
0 2 * * * certbot renew --quiet --post-hook "docker-compose restart nginx"
```

### 5. 启动服务

```bash
docker-compose -f infrastructure/nginx/docker-compose.ssl.yml up -d
```

### 6. 验证 HTTPS

```bash
# 检查 SSL 配置
curl -I https://your-domain.com

# 检查证书信息
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# 在线检测
# https://www.ssllabs.com/ssltest/
```

---

## Nginx 配置说明

### 核心配置项

```nginx
# SSL 证书路径
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;

# SSL 协议版本（仅允许 TLS 1.2 和 1.3）
ssl_protocols TLSv1.2 TLSv1.3;

# 加密套件
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:...;

# HSTS（强制 HTTPS）
add_header Strict-Transport-Security "max-age=63072000" always;
```

### 安全头说明

| 头名称 | 作用 |
|-------|------|
| Strict-Transport-Security | 强制浏览器使用 HTTPS |
| X-Frame-Options | 防止点击劫持 |
| X-Content-Type-Options | 防止 MIME 类型嗅探 |
| X-XSS-Protection | XSS 防护 |
| Referrer-Policy | 控制 Referrer 信息 |
| Content-Security-Policy | 内容安全策略 |

---

## 故障排查

### 问题 1：证书不受信任

**原因**：使用自签名证书

**解决**：
- 开发环境：手动信任证书
- 生产环境：使用 Let's Encrypt 等可信 CA

### 问题 2：混合内容警告

**原因**：HTTPS 页面加载了 HTTP 资源

**解决**：
```html
<!-- 错误 -->
<img src="http://example.com/image.jpg">

<!-- 正确 -->
<img src="https://example.com/image.jpg">
<!-- 或 -->
<img src="//example.com/image.jpg">
```

### 问题 3：重定向循环

**原因**：Nginx 和后端都配置了重定向

**解决**：检查并移除重复的重定向配置

### 问题 4：证书续期失败

**检查**：
```bash
# 查看 Certbot 日志
tail -f /var/log/letsencrypt/letsencrypt.log

# 检查 80 端口是否开放
netstat -tlnp | grep :80

# 检查 DNS 解析
dig your-domain.com
```

---

## 安全最佳实践

### 1. 定期更新证书

- Let's Encrypt 证书有效期 90 天
- 设置自动续期，提前 30 天续期

### 2. 使用强加密

- 仅启用 TLS 1.2 和 TLS 1.3
- 使用强加密套件
- 禁用弱加密算法（RC4、DES 等）

### 3. 启用 HSTS

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

### 4. 监控证书过期

设置监控告警，证书过期前 30 天、7 天、1 天发送通知。

### 5. 保护私钥

```bash
# 设置正确的权限
chmod 600 /path/to/key.pem
chown root:root /path/to/key.pem
```

### 6. 定期安全扫描

使用以下工具定期检查：
- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [Security Headers](https://securityheaders.com/)

---

## 附录：完整配置示例

### docker-compose.ssl.yml

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./infrastructure/nginx/ssl:/etc/nginx/ssl:ro
      - ./infrastructure/nginx/certbot:/var/www/certbot:rw
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
```

### 环境变量配置

创建 `.env` 文件：

```bash
# SSL 配置
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem

# 域名配置
SERVER_NAME=your-domain.com

# 安全配置
HSTS_MAX_AGE=63072000
```

---

## 联系支持

如遇到问题，请联系：

- 技术支持：support@jieyue-securities.com
- 文档更新：请提交 Issue 或 PR

---

**最后更新：2024 年 1 月 1 日**
