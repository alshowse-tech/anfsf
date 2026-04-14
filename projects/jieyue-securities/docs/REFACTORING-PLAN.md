# 捷阅证券信息系统 - ANFSF V1.5.0 重构计划

**日期**: 2026-04-09  
**版本**: 1.5.0  
**状态**: 第三阶段（后端重构）进行中

---

## 📋 执行摘要

本计划详细说明捷阅证券信息系统从当前架构迁移到 ANFSF V1.5.0 架构的完整路径，包括服务层重构、API 层更新和前端集成。

---

## 🎯 重构目标

### 1.1 核心目标

- ✅ 实现 ANFSF V1.5.0 17 层架构
- ✅ 实现 Layer 8.5 Governance Control Plane
- ✅ 实现 MCP 多 Agent 协作协议
- ✅ 实现 Ownership Lattice 权限控制
- ✅ 实现 Contract Pack 契约管理
- ✅ 建立 Harness 测试验证体系
- ✅ 达到企业级生产标准

### 1.2 质量目标

| 指标 | 当前 | 目标 |
|------|------|------|
| 测试覆盖率 (后端) | 40% | >80% |
| 测试覆盖率 (前端) | 30% | >80% |
| 测试覆盖率 (核心服务) | N/A | >90% |
| 类型注解覆盖率 | 30% | >90% |
| 文档覆盖率 | 50% | >90% |
| API 响应时间 (P95) | N/A | <500ms |
| 系统可用性 | N/A | >99.9% |

---

## 📅 阶段规划

### 阶段 1: 架构分析与设计 (2 小时) ✅

**状态**: ✅ 已完成

**交付物**:
- ✅ `docs/CURRENT-STATE-ANALYSIS.md` - 当前状态分析
- ✅ `docs/REFACTORING-PLAN.md` - 重构计划
- ✅ `docs/ARCHITECTURE-DESIGN.md` - 架构设计文档
- ✅ `docs/LAYER-8.5-DESIGN.md` - Layer 8.5 详细设计

### 阶段 2: 核心架构实现 (2 小时) ✅

**状态**: ✅ 已完成

**交付物**:
- ✅ Layer 8.5 Governance Control Plane (5 个模块)
- ✅ URL Parser Agent (支持 5 个平台)
- ✅ 主要数据模型
- ✅ 配置文件

### 阶段 3: 后端重构 (进行中)

#### 任务 3.1: main.py 更新 ✅

**状态**: ✅ 完成

**交付物**:
- ✅ 集成 Layer 8.5 模块
- ✅ 集成 Layer 9 Agent

#### 任务 3.2: 服务层重构

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 重构 `url_parser.py` - 集成 URLParserAgent
- [ ] 重构 `bailian_client.py` - 集成 ProviderRouter
- [ ] 重构 `asr.py` - 集成 ASR 服务
- [ ] 重构 `summarizer.py` - 集成摘要服务
- [ ] 重构 `risk_detector.py` - 集成风险检测
- [ ] 重构 `oss_storage.py` - 集成 OSS 存储
- [ ] 重构 `media_processor.py` - 集成媒体处理
- [ ] 重构 `tikhub_client.py` - 集成 TikHub 客户端
- [ ] 重构 `url_expander.py` - 集成 URL 扩展

#### 任务 3.3: API 层更新

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 实现 Layer 8.5 API 端点
- [ ] 添加 governance 路由
- [ ] 添加 agent 路由
- [ ] 实现 API契约验证

#### 任务 3.4: 数据库模型更新

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 更新模型 - 加入契约字段
- [ ] 更新模型 - 加入 Agent 字段
- [ ] 创建迁移脚本

### 阶段 4: 前端重构 (3 小时)

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 集成 ANFSF 架构
- [ ] 更新前端组件
- [ ] 实现新 UI/UX

### 阶段 5: 测试体系 (2 小时)

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 单元测试增加到 >80%
- [ ] 集成测试完善
- [ ] E2E 测试覆盖

### 阶段 6: 部署与验证 (2 小时)

**状态**: ⏳ 待开始

**任务列表**:
- [ ] Docker 部署
- [ ] Kubernetes 部署
- [ ] 性能测试
- [ ] 安全审计

---

## 📊 重构路线图

```
阶段 1: Architecture Analysis ✅
阶段 2: Core Implementation ✅
     ↓
阶段 3: Backend Refactoring (进行中)
     - main.py 更新 ✅
     - 服务层重构 ⏳
     - API 层更新 ⏳
     - 数据库模型更新 ⏳
     ↓
阶段 4: Frontend Refactoring ⏳
阶段 5: Test Upgrade ⏳
阶段 6: Deployment ⏳
```

---

## 🎯 下一步行动

### 立即执行:

1. **服务层重构**
   - 重构 `url_parser.py` - 集成 URLParserAgent
   - 重构 `bailian_client.py` - 集成 ProviderRouter

2. **API 层更新**
   - 实现 Layer 8.5 API 端点
   - 添加 governance 路由

3. **数据库模型更新**
   - 更新模型 - 加入契约字段
   - 更新模型 - 加入 Agent 字段

---

**报告人**: ANFSF V1.5.0 重构团队  
**报告时间**: 2026-04-09 09:45  
**重构状态**: 🟡 第三阶段（后端重构）进行中  
**进度**: 33% (1/3)
