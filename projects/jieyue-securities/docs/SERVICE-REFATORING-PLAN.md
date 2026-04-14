# 捷阅证券信息系统 - 服务层重构计划

**日期**: 2026-04-09  
**阶段**: 第三阶段（后端重构）  
**状态**: 🟡 进行中

---

## 📋 执行摘要

本计划详细说明捷阅证券信息系统服务层重构的完整路径，包括与 ANFSF V1.5.0 的集成。

---

## 🎯 重构目标

### 1.1 核心目标

- ✅ 集成 ANFSF V1.5.0 新组件
- ✅ 实现 ProviderRouter 多 Provider 路由
- ✅ 实现 PromptCacheManager 缓存优化
- ✅ 实现 URLParserAgent 集成
- ✅ 达到企业级生产标准

### 1.2 质量目标

| 指标 | 当前 | 目标 |
|------|------|------|
| 类型注解覆盖率 | 30% | >90% |
| 文档覆盖率 | 50% | >90% |
| API 响应时间 (P95) | N/A | <500ms |
| 系统可用性 | N/A | >99.9% |

---

## 📅 阶段规划

### 阶段 3.1: 服务层重构 (进行中)

#### 任务 3.1.1: bailian_client.py 重构

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 集成 ProviderRouter 多 Provider 路由
- [ ] 添加重试机制
- [ ] 添加降级策略

**当前文件**: `backend/src/services/bailian_client.py`

---

#### 任务 3.1.2: url_parser.py 重构

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 集成 URLParserAgent
- [ ] 实现平台识别
- [ ] 实现 fallback 机制

**当前文件**: `backend/src/services/url_parser.py`

---

#### 任务 3.1.3: asr.py 重构

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 集成 ProviderRouter
- [ ] 优化 ASR 性能
- [ ] 添加缓存

**当前文件**: `backend/src/services/asr.py`

---

#### 任务 3.1.4: summarizer.py 重构

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 集成 ProviderRouter
- [ ] 优化摘要性能
- [ ] 添加缓存

**当前文件**: `backend/src/services/summarizer.py`

---

#### 任务 3.1.5: risk_detector.py 重构

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 集成 Governance Controls
- [ ] 优化风险检测
- [ ] 添加合规检查

**当前文件**: `backend/src/services/risk_detector.py`

---

#### 任务 3.1.6: oss_storage.py 重构

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 集成支付服务
- [ ] 优化存储性能
- [ ] 添加重试机制

**当前文件**: `backend/src/services/oss_storage.py`

---

#### 任务 3.1.7: media_processor.py 重构

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 集成 VideoGenerationSkill
- [ ] 优化媒体处理
- [ ] 添加质量控制

**当前文件**: `backend/src/services/media_processor.py`

---

#### 任务 3.1.8: tikhub_client.py 重构

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 集成 ProviderRouter
- [ ] 优化 TikHub 调用
- [ ] 添加缓存

**当前文件**: `backend/src/services/tikhub_client.py`

---

#### 任务 3.1.9: url_expander.py 重构

**状态**: ⏳ 待开始

**任务列表**:
- [ ] 集成短链接扩展服务
- [ ] 优化扩展性能
- [ ] 添加缓存

**当前文件**: `backend/src/services/url_expander.py`

---

## 📊 重构路线图

```
阶段 3.1: 服务层重构 (进行中)
     ↓
阶段 3.2: API 层更新
     ↓
阶段 3.3: 数据库模型更新
     ↓
阶段 4: 前端重构
     ↓
阶段 5: 测试与质量保障
     ↓
阶段 6: DevOps 与部署
```

---

## ⏳ 下一步计划

### 立即执行 (当前)

1. **bailian_client.py 重构**
   - 集成 ProviderRouter
   - 添加重试机制
   - 添加降级策略

2. **url_parser.py 重构**
   - 集成 URLParserAgent
   - 实现平台识别
   - 实现 fallback 机制

---

**报告人**: ANFSF V1.5.0 重构团队  
**报告时间**: 2026-04-09 10:03  
**重构状态**: 🟡 第三阶段（服务层重构）进行中  
**进度**: 0%
