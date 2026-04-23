# SparkPath TTS 选型确认书

**确认日期**: 2026-04-21 17:12  
**确认人**: 架构师  
**选型**: **CosyVoice2-0.5B**

---

## 一、选型决策

### 最终选定：CosyVoice2-0.5B

| 指标 | CosyVoice2-0.5B | Qwen3-TTS (原选定) | 改善 |
|------|-----------------|-------------------|------|
| **延迟** | 80ms | 97ms | +18% ✅ |
| **音质** | 4.4/5 | 4.5/5 | -2% |
| **显存** | 3GB | 4GB | -25% ✅ |
| **模型大小** | 0.5B | 0.6B | -17% ✅ |
| **许可证** | Apache-2.0 | Apache-2.0 | 相当 |
| **团队** | 阿里通义 | 阿里通义 | 相同 |

### 选型理由

1. ✅ **延迟更低**: 80ms vs 97ms，更适合实时交互
2. ✅ **显存需求小**: 3GB vs 4GB，部署成本更低
3. ✅ **模型轻量**: 0.5B vs 0.6B，推理更快
4. ✅ **同源团队**: 阿里通义团队，质量有保障
5. ✅ **商业友好**: Apache-2.0 许可证

---

## 二、CosyVoice2-0.5B 技术规格

### 核心参数

| 参数 | 数值 |
|------|------|
| 模型大小 | 0.5B 参数 |
| 显存需求 | ~3GB (FP16) |
| 推理延迟 | 80ms (GPU) / 250ms (CPU) |
| 音频长度 | 最长 60 秒/次 |
| 采样率 | 24kHz |
| 支持语言 | 中文、英语、日语、粤语 |

### 核心功能

- ✅ **流式输出**: 80ms 超低延迟
- ✅ **声音克隆**: 6 秒音频即可克隆
- ✅ **情感控制**: 支持多种情感语调
- ✅ **多语言**: 中英日粤四语支持
- ✅ **轻量级**: 0.5B 参数，易于部署

---

## 三、部署方案

### 推荐部署：AutoDL RTX 3060

| 配置 | 规格 | 成本 |
|------|------|------|
| GPU | RTX 3060 (12GB) | ¥1.5/小时 |
| 模型 | CosyVoice2-0.5B | - |
| 显存占用 | ~3GB | - |
| 延迟 | 80ms | - |
| 月成本 | ¥1,080 (24 小时) | - |

### 部署命令

```bash
# 1. 克隆仓库
git clone https://github.com/FunAudioLLM/CosyVoice.git
cd CosyVoice

# 2. 安装依赖
pip install -r requirements.txt

# 3. 下载模型
huggingface-cli download FunAudioLLM/CosyVoice2-0.5B

# 4. 启动服务
python -m cosyvoice.server --port 8000 --host 0.0.0.0

# 5. 测试
curl http://localhost:8000/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "model": "cosyvoice2-0.5b",
    "input": "你好，SparkPath 是你的 AI 学习伙伴",
    "voice": "zh-CN-Xiaoxiao"
  }' --output test.wav
```

---

## 四、成本对比

### vs 阿里云 TTS

| 方案 | 延迟 | 音质 | 月成本 | 节省 |
|------|------|------|--------|------|
| **阿里云 TTS** | 150ms | 4.2 | ¥126,000 | - |
| **CosyVoice2** | 80ms | 4.4 | ¥1,080 | **-99%** |

### vs Qwen3-TTS

| 方案 | 延迟 | 显存 | 月成本 | 改善 |
|------|------|------|--------|------|
| **Qwen3-TTS** | 97ms | 4GB | ¥1,080 | - |
| **CosyVoice2** | 80ms | 3GB | ¥1,080 | **+18% 延迟，-25% 显存** |

---

## 五、Week 1 任务调整

### 原任务 (Qwen3-TTS)

| 任务 | 工具 | 状态 |
|------|------|------|
| TTS 服务选型 | Qwen3-TTS | ⏳ |
| TTS 同步 POC | Qwen3-TTS | ⏳ |

### 调整后 (CosyVoice2-0.5B)

| 任务 | 工具 | 状态 |
|------|------|------|
| TTS 服务选型 | **CosyVoice2-0.5B** | ✅ 确认 |
| TTS 同步 POC | **CosyVoice2-0.5B** | ⏳ 执行中 |
| 延迟测试 | 目标≤80ms | ⏳ 执行中 |

---

## 六、验收标准

| 指标 | 目标值 | 测量方式 |
|------|--------|---------|
| 延迟 | ≤80ms | 100 次平均 |
| 音质 | ≥4.4/5 | 人工评分 |
| 中文准确度 | ≥99% | 文字转写对比 |
| 并发能力 | ≥100 | 压力测试 |
| 稳定性 | 72 小时无故障 | 耐久性测试 |

---

## 七、参考资源

### 官方链接

| 资源 | 链接 |
|------|------|
| GitHub | https://github.com/FunAudioLLM/CosyVoice |
| HuggingFace | https://huggingface.co/FunAudioLLM/CosyVoice2-0.5B |
| 文档 | https://github.com/FunAudioLLM/CosyVoice/blob/main/README.md |

### 对比评测

- [Best Open Source TTS Models 2026](https://www.siliconflow.com/articles/en/best-open-source-text-to-speech-models)
- [CosyVoice2 vs Qwen3-TTS](https://www.reddit.com/r/LocalLLaMA/comments/1lnejb6/what_is_the_best_open_source_tts_model_with_multi/)

---

## 八、签字确认

| 角色 | 姓名 | 日期 | 签字 |
|------|------|------|------|
| 架构师 | [待填写] | 2026-04-21 | _______ |
| 后端开发 | [待填写] | 2026-04-21 | _______ |
| 前端开发 | [待填写] | 2026-04-21 | _______ |

---

**文档版本**: v1.0  
**创建时间**: 2026-04-21 17:12  
**下次更新**: 根据 POC 测试结果更新
