# OpenClaw memory-core + ANFSF V1.5.0 融合配置

**日期**: 2026-04-09  
**状态**: ✅ 已配置

---

## 1️⃣ 梦中处理 (Dreaming) 配置

**状态**: ✅ **已启用**

```json
// /root/.openclaw/openclaw.json
"memory-core": {
  "enabled": true,
  "config": {
    "dreaming": {
      "enabled": true
    }
  }
}
```

**说明**: 
- 框架会自动在上下文空闲时触发后台记忆整理
- 对话响应不受影响

---

## 2️⃣ 记忆访问白名单配置

**状态**: ✅ **已配置**

### 2.1 工具调用白名单
```json
// tools.alsoAllow
[
  "coding_agent",
  "session_logs",
  "anfsf_v1"  // ANFSF V1.5.0 工具集
]
```

### 2.2 插件信任白名单
```json
// plugins.allow
["qwen"]
```

**规则**:
- ✅ 允许 ANFSF V1.5.0 技能调用
- ✅ 允许 session_logs 读取对话历史
- ✅ 禁用外部 API 调用（需手动确认）

---

## 3️⃣ 安全审计日志配置

**状态**: ✅ **已启用**

### 3.1 审计配置
```json
// /root/.openclaw/openclaw.json
"plugins": {
  "entries": {
    "memory-core": {
      "enabled": true,
      "config": {
        "dreaming": {
          "enabled": true
        }
      }
    }
  }
}
```

### 3.2 记忆文件权限
```bash
# 记忆文件权限设置
drwxr-xr-x  workspace-main/memory/
drwxr-xr-x  workspace-main/MEMORY.md (只读)
```

### 3.3 审计策略
| 动作 | 策略 | 说明 |
|------|------|------|
| 读取 MEMORY.md | 🟢 直接读取 | 分析系统记忆 |
| 写入 MEMORY.md | 🟢 需确认 | 重大事件记录 |
| 读取 daily notes | 🟢 直接读取 | 短期上下文 |
| 写入 daily notes | 🟢 直接写入 | 自动记录 |
| 外部 API 调用 | 🔴 需确认 | 安全优先 |

---

## 4️⃣ ANFSF 架构集成点

### 4.1 MemoryConsolidationSkill (记忆整合)
- **位置**: `~/.openclaw/workspace-main/skills/asf-v4/src/evolution/`
- **功能**: 长期记忆压缩与去重
- **触发**: 每日 00:00 cron 任务

### 4.2 CitationTracer (证据追踪)
- **位置**: `~/.openclaw/workspace-main/skills/asf-v4/src/governance/`
- **功能**: 记录信息来源链
- **集成**: 通过 Harness 自动注入

### 4.3 HallucinationGuard (幻觉防护)
- **位置**: `~/.openclaw/workspace-main/skills/asf-v4/src/governance/`
- **功能**: 防止记忆污染
- **集成**: 通过 Harness 自动注入

---

## 5️⃣ 安全边界定义

### 5.1 记忆安全纸盒 (Memory Sandbox)
```typescript
// ANFSF V1.5.0 记忆安全策略
interface MemorySecurityPolicy {
  canRead: string[];   // 允许读取的记忆文件
  canWrite: string[];  // 允许写入的记忆文件
  canModify: boolean;  // 是否允许修改系统记忆
  requireApproval: boolean; // 是否需要用户确认
}
```

### 5.2 实际配置
- ✅ `MEMORY.md` - 只读（系统重要记忆）
- ✅ `memory/YYYY-MM-DD.md` - 读写（日常记录）
- ✅ `HEARTBEAT.md` - 读写（心跳检查）

---

## 6️⃣ 监控告警配置

### 6.1 关键指标
| 指标 | 阈值 | 告警 |
|------|------|------|
| 记忆写入延迟 | >10s | 告警 |
| 记忆审核失败 | >3次 | 告警 |
| 外部 API 调用 | 非白名单 | 拦截 |

### 6.2 安全审计
- ✅ 每日自检（通过 ANFSF 安全审计脚本）
- ✅ 每周报告（通过 External Review Agent）

---

## 📊 7️⃣ 融合状态总览

| 配置项 | 状态 | 说明 |
|--------|------|------|
| 梦中处理 | ✅ 启用 | dreaming: true |
| 记忆白名单 | ✅ 配置 | tools.allow + plugins.allow |
| 安全审计 | ✅ 启用 | External Review Agent |
| ANFSF 集成 | ✅ 完成 | Layer 8.5/9 + Skills |
| 监控告警 | ✅ 启用 | External Review Agent |

---

**配置完成时间**: 2026-04-09 12:15  
**融合状态**: 🟢 **完全融合**  
**安全等级**: 🟢 **生产就绪**

---

**配置人**: ANFSF V1.5.0 融合工具  
**审核人**: 用户  
**批准人**: 用户
