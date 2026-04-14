-- 捷阅证券信息助手 - 数据库初始化脚本
-- 创建时间：2026-03-31

-- 使用数据库
USE jieyue_securities;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20),
  wx_openid VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TINYINT DEFAULT 1,
  INDEX idx_phone (phone),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 钱包表
CREATE TABLE IF NOT EXISTS wallets (
  user_id BIGINT PRIMARY KEY,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 交易流水表
CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  task_id BIGINT,
  type ENUM('RECHARGE','CONSUME','REFUND') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('INIT','SUCCESS','FAILED') DEFAULT 'INIT',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_task_id (task_id),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 任务表（核心）
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  url TEXT,
  url_hash VARCHAR(64),
  platform VARCHAR(20),
  status ENUM('INIT','PARSING','PARSE_FAILED','ASR_PROCESSING','ASR_FAILED','SUMMARIZING','SUCCESS','FAILED') DEFAULT 'INIT',
  content_type ENUM('TEXT','AUDIO','VIDEO'),
  duration INT,
  cost DECIMAL(10,2),
  parse_provider VARCHAR(20),
  asr_provider VARCHAR(20),
  -- ANFSF V1.5.0 Layer 8.5 增强
  parse_contract_id VARCHAR(64),
  parse_agent_id VARCHAR(64),
  parse_agent_status ENUM('OFFLINE','ONLINE','BUSY','MAINTENANCE'),
  asr_contract_id VARCHAR(64),
  asr_agent_id VARCHAR(64),
  summary_contract_id VARCHAR(64),
  summary_agent_id VARCHAR(64),
  error_msg TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_url (user_id, url_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 内容表
CREATE TABLE IF NOT EXISTS contents (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  task_id BIGINT UNIQUE NOT NULL,
  raw_text MEDIUMTEXT,
  transcript MEDIUMTEXT,
  title VARCHAR(512),
  author VARCHAR(256),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_content_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  INDEX idx_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 摘要表
CREATE TABLE IF NOT EXISTS summaries (
  task_id BIGINT PRIMARY KEY,
  key_points JSON,
  abstract TEXT,
  risk_tags JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_summary_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 定价配置表
CREATE TABLE IF NOT EXISTS pricing_configs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  base_price DECIMAL(10,2) DEFAULT 1.00,
  per_minute_price DECIMAL(10,2) DEFAULT 0.50,
  start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认定价配置
INSERT INTO pricing_configs (base_price, per_minute_price, status) VALUES (1.00, 0.50, 1);

-- 插入测试用户
INSERT INTO users (id, phone, wx_openid, status) VALUES (1, '13800138000', 'test_openid', 1);
INSERT INTO wallets (user_id, balance) VALUES (1, 100.00);

-- 显示表
SHOW TABLES;
