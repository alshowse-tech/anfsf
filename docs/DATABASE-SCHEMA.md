# ANFSF 数据库 Schema 设计

> **版本**: 1.1 | **日期**: 2026-06-16 | **数据库**: SQLite 3 (Phase 1-2) → PostgreSQL 17 (Phase 3+)
> ⚠️ **实现状态**: 仅有 `pipeline_runs` 和 `run_steps` 表在运行时活跃使用。
> Phase 1 新增的 `checkpoints` 等表已定义但运行时写入不完整。
> 详见 [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md)。

---

## 一、设计原则

- 所有表使用 UUID 作为主键（TEXT 类型，SQLite 无原生 UUID）
- 时间戳统一 UTC，ISO8601 字符串格式存储
- JSON 字段使用 TEXT 存储，应用层序列化/反序列化
- 外键约束显式声明，级联删除可控
- 索引针对查询模式优化（按 project_id 查询为主）

---

## 二、现有表（保留，小幅扩展）

### 2.1 pipeline_runs

项目主表。现有结构保留，新增字段。

```sql
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,                          -- UUID
  project_name TEXT NOT NULL DEFAULT 'Untitled',
  
  -- 新增：五阶段状态
  project_state TEXT NOT NULL DEFAULT 'created', -- ProjectState enum
  current_stage INTEGER NOT NULL DEFAULT 0,      -- 0-5
  
  -- 现有字段（保留）
  status TEXT NOT NULL DEFAULT 'queued',
  prd_text TEXT NOT NULL,
  prd_attachments TEXT,                          -- JSON: 附件元数据列表
  result TEXT,                                    -- JSON: 阶段产物
  steps TEXT,                                     -- JSON: 步骤记录
  
  -- 新增字段
  requirement_version TEXT,                       -- 需求规格版本号 (v1, v1.1, ...)
  deployment_form TEXT DEFAULT 'web',            -- web | h5 | miniprogram
  token_usage INTEGER DEFAULT 0,                 -- 累计 token 消耗
  token_budget INTEGER DEFAULT 5000000,          -- 预算上限
  locked_at TEXT,                                 -- 需求锁定时间
  locked_by TEXT,                                 -- 需求锁定人
  archived_at TEXT,                               -- 归档时间
  
  -- 时间戳
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX idx_pipeline_runs_state ON pipeline_runs(project_state);
CREATE INDEX idx_pipeline_runs_created ON pipeline_runs(created_at DESC);
```

### 2.2 run_steps

流水线步骤记录（现有表，保持不变）。

```sql
CREATE TABLE IF NOT EXISTS run_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TEXT,
  completed_at TEXT,
  error_message TEXT,
  metadata TEXT,                                 -- JSON
  FOREIGN KEY (run_id) REFERENCES pipeline_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_run_steps_run ON run_steps(run_id);
```

---

## 三、Phase 1 新增表

### 3.1 checkpoints

检查点存储（T-003）。

```sql
CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,                          -- UUID
  project_id TEXT NOT NULL,
  stage TEXT NOT NULL,                           -- ProjectState
  timestamp INTEGER NOT NULL,                    -- Unix timestamp
  data TEXT NOT NULL,                            -- JSON: 阶段产物快照
  
  FOREIGN KEY (project_id) REFERENCES pipeline_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_checkpoints_project ON checkpoints(project_id, stage);
CREATE INDEX idx_checkpoints_timestamp ON checkpoints(project_id, timestamp DESC);
```

### 3.2 code_annotations

代码变动标注（T-202）。

```sql
CREATE TABLE IF NOT EXISTS code_annotations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  file_path TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  source_type TEXT NOT NULL,                     -- 'generated' | 'modified' | 'new'
  annotated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (project_id) REFERENCES pipeline_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_annotations_project ON code_annotations(project_id);
CREATE INDEX idx_annotations_file ON code_annotations(project_id, file_path);
CREATE INDEX idx_annotations_source ON code_annotations(project_id, source_type);
```

### 3.3 verification_results

验证结果记录（T-204）。

```sql
CREATE TABLE IF NOT EXISTS verification_results (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  verification_type TEXT NOT NULL,               -- 'contract' | 'integration' | 'compile'
  passed INTEGER NOT NULL DEFAULT 0,            -- 0 or 1
  errors TEXT,                                   -- JSON: VerificationError[]
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (project_id) REFERENCES pipeline_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_verification_project ON verification_results(project_id);
CREATE INDEX idx_verification_commit ON verification_results(project_id, commit_sha);
```

### 3.4 fix_records

修复记录（T-301）。

```sql
CREATE TABLE IF NOT EXISTS fix_records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  test_case_id TEXT,                              -- 关联的测试用例（如有）
  feedback_id TEXT,                               -- 关联的 PM 反馈（如有）
  level TEXT NOT NULL,                            -- 'L1' | 'L2' | 'L3'
  file_path TEXT,
  line_number INTEGER,
  issue_description TEXT NOT NULL,
  fix_description TEXT,
  fix_status TEXT NOT NULL DEFAULT 'pending',     -- 'auto_fixed' | 'suggestion_ready' | 'dev_fixed' | 'located_only' | 'confirmed'
  fixed_by TEXT,                                  -- 'system' | developer_name
  fixed_at TEXT,
  confirmed_by TEXT,
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (project_id) REFERENCES pipeline_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_fix_records_project ON fix_records(project_id);
CREATE INDEX idx_fix_records_level ON fix_records(project_id, level);
CREATE INDEX idx_fix_records_status ON fix_records(project_id, fix_status);
```

### 3.5 change_requests

需求变更记录。

```sql
CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  description TEXT NOT NULL,
  reason TEXT,
  state TEXT NOT NULL DEFAULT 'pending',          -- 'pending' | 'confirmed' | 'deferred' | 'cancelled' | 'completed'
  impact_report TEXT,                             -- JSON
  confirmed_by TEXT,
  confirmed_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (project_id) REFERENCES pipeline_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_changes_project ON change_requests(project_id);
CREATE INDEX idx_changes_state ON change_requests(project_id, state);
```

### 3.6 test_cases

测试用例存储。

```sql
CREATE TABLE IF NOT EXISTS test_cases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  steps TEXT,                                     -- JSON: 测试步骤
  expected_result TEXT,
  category TEXT,                                  -- 'functional' | 'visual' | 'performance' | 'security'
  source TEXT NOT NULL DEFAULT 'auto',            -- 'auto' | 'pm_added' | 'dev_added'
  automation_status TEXT DEFAULT 'not_scripted',  -- 'scripted' | 'not_scripted' | 'not_automatable'
  script_path TEXT,                               -- E2E 脚本路径（如有）
  requirement_ref TEXT,                           -- 关联需求条目 ID
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (project_id) REFERENCES pipeline_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_test_cases_project ON test_cases(project_id);
```

### 3.7 test_results

测试执行结果。

```sql
CREATE TABLE IF NOT EXISTS test_results (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  test_case_id TEXT NOT NULL,
  run_type TEXT NOT NULL,                         -- 'automated' | 'manual'
  result TEXT NOT NULL,                           -- 'passed' | 'failed' | 'blocked' | 'skipped'
  failure_category TEXT,                          -- 'missing_feature' | 'behavior_mismatch' | 'style_issue' | 'performance' | 'other'
  failure_description TEXT,
  screenshot_path TEXT,
  executed_by TEXT,
  executed_at TEXT NOT NULL DEFAULT (datetime('now')),
  fix_record_id TEXT,                             -- 关联的修复记录
  
  FOREIGN KEY (project_id) REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (test_case_id) REFERENCES test_cases(id),
  FOREIGN KEY (fix_record_id) REFERENCES fix_records(id)
);

CREATE INDEX idx_test_results_project ON test_results(project_id);
CREATE INDEX idx_test_results_case ON test_results(test_case_id);
```

### 3.8 release_checks

发布检查记录（T-304）。

```sql
CREATE TABLE IF NOT EXISTS release_checks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  layer TEXT NOT NULL,                            -- 'system' | 'pm' | 'role'
  check_item TEXT NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0,
  details TEXT,                                   -- JSON
  checked_by TEXT,
  checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (project_id) REFERENCES pipeline_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_release_checks_project ON release_checks(project_id);
```

### 3.9 metrics

项目度量数据（T-305）。

```sql
CREATE TABLE IF NOT EXISTS metrics (
  id TEXT PRIMARY KEY,
  project_id TEXT UNIQUE NOT NULL,
  
  -- 耗时
  total_duration_hours REAL,
  stage_durations TEXT,                           -- JSON: { stage0: N, stage1: N, ... }
  
  -- 返工
  rework_count INTEGER DEFAULT 0,
  rework_distribution TEXT,                       -- JSON: 按模块分布
  
  -- 复用
  component_reuse_rate REAL DEFAULT 0,
  
  -- 修复
  fix_l1_count INTEGER DEFAULT 0,
  fix_l2_count INTEGER DEFAULT 0,
  fix_l3_count INTEGER DEFAULT 0,
  
  -- Token
  total_tokens INTEGER DEFAULT 0,
  token_by_stage TEXT,                            -- JSON
  
  -- 时间戳
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (project_id) REFERENCES pipeline_runs(id) ON DELETE CASCADE
);
```

---

## 四、Phase 2+ 预留表

以下表在 Phase 1 只建 schema，不实现业务逻辑：

### 4.1 component_library

组件库（Phase 2）。

```sql
CREATE TABLE IF NOT EXISTS component_library (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT,                                      -- JSON: string[]
  platform TEXT NOT NULL DEFAULT 'web',           -- 'web' | 'h5' | 'miniprogram'
  source_project_id TEXT,
  status TEXT NOT NULL DEFAULT 'candidate',       -- 'candidate' | 'verified' | 'deprecated'
  version TEXT NOT NULL DEFAULT '1.0.0',
  usage_count INTEGER DEFAULT 0,
  file_path TEXT,                                 -- 组件实现文件路径
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 4.2 experience_entries

经验库（Phase 2）。

```sql
CREATE TABLE IF NOT EXISTS experience_entries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggestion TEXT,
  tags TEXT,                                      -- JSON
  source_projects TEXT,                           -- JSON: string[] (项目 ID 列表)
  severity TEXT DEFAULT 'info',                   -- 'info' | 'warning' | 'critical'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 五、ER 关系

```
pipeline_runs (1) ────< (N) run_steps
pipeline_runs (1) ────< (N) checkpoints
pipeline_runs (1) ────< (N) code_annotations
pipeline_runs (1) ────< (N) verification_results
pipeline_runs (1) ────< (N) fix_records
pipeline_runs (1) ────< (N) change_requests
pipeline_runs (1) ────< (N) test_cases
pipeline_runs (1) ────< (N) test_results
pipeline_runs (1) ────< (N) release_checks
pipeline_runs (1) ──── (1) metrics

test_cases (1) ────< (N) test_results
fix_records (1) ──── (0..1) test_results
```

---

> **下一步**: [开发规范与约定](DEVELOPMENT-STANDARDS.md)
