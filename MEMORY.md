# 👸 格格的长期记忆

## 关于用户
- **称呼**: 用户
- **时区**: Asia/Shanghai
- **工作**: 软件开发/系统架构
- **偏好**: 专业严谨的回复，先结论后理由，数据驱动决策

## 项目背景

### ANFSF V1.5.0 架构
- **目标**: AI Native Full-Stack Software Factory 工业化增强
- **状态**: ✅ 生产就绪 (2026-04-01 完成)
- **版本**: V1.5.0 (Layer 8.5 Governance Control Plane)
- **技能路径**: `/root/.openclaw/workspace-main/skills/asf-v4/`
- **OpenClaw 适配**: v2026.4.1 完全兼容

**核心模块**:
- L4 认知内核 (需求图谱引擎)
- L9 Agent OS (多 Agent 协同)
- Layer 8.5 治理控制平面 (MCP 总线 + Skills Registry + Harness)
- L17 进化安全护栏

**关键决策**:
- 采用白名单工具调用 (`tools.alsoAllow: ["anfsf_v1"]`)
- 独立沙箱执行 (内存 256MB + 时间 30s 限制)
- 金丝雀部署策略 (0.01→0.05→0.2→0.5→1.0)
- 统计显著性检验 (p<0.05)

### OpenClaw 系统
- **版本**: 2026.4.1
- **部署**: 本地部署 (Huawei 主机 192.168.2.22)
- **Gateway**: ws://127.0.0.1:18789 (local loopback)
- **默认模型**: bailian/qwen3.5-plus (1000k 上下文)
- **插件信任**: `["openclaw-lark"]`

## 重要偏好
- [ ] 安全优先：涉及外部操作需确认
- [ ] 数据驱动：提供量化指标和测试结果
- [ ] 结构清晰：使用表格和列表组织信息
- [ ] 备份先行：重大变更前执行全量备份

## 系统配置
### 信任插件
- `openclaw-lark` - 飞书集成插件

### 启用技能
- clawhub, coding-agent, healthcheck, node-connect, oracle, skill-creator, weather
- anfsf_v1 (ANFSF V1.5.0 工具集)

### 安全边界
- 插件白名单模式：启用
- 飞书频道：禁用 (可按需启用)
- 外部 API 调用：需确认

## 经验教训
- 重大更新前必须执行全量备份
- 插件信任配置影响安全审计结果
- Layer 8.5 测试通过率 94.5% (87/92) 可接受

---
_最后更新：2026-04-03 10:09_
