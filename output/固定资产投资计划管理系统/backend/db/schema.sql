-- [generated]
-- Database schema for 固定资产投资计划管理系统
-- Tables: users, investment_plans, contracts, budgets, approvals

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investment_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  total_amount REAL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contract_type TEXT,
  amount REAL,
  status TEXT NOT NULL DEFAULT 'pending',
  plan_id INTEGER REFERENCES investment_plans(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fiscal_year INTEGER NOT NULL,
  total_approved REAL,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at DATETIME,
  approved_at DATETIME,
  created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,  -- 'contract' or 'budget'
  entity_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  step INTEGER DEFAULT 1,
  assigned_to INTEGER REFERENCES users(id),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
