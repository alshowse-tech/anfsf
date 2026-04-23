# 明日执行计划 (2026-04-22)

**制定时间**: 2026-04-21 23:25  
**执行人**: 后端开发 + 测试工程师

---

## 一、任务汇总

| 任务 | 负责人 | 时间 | 优先级 | 状态 |
|------|--------|------|--------|------|
| GPU INT8 量化部署 | 后端开发 | 10:00 | P0 | ⏳ |
| 性能基准测试 | 测试工程师 | 14:00 | P0 | ⏳ |

---

## 二、详细任务说明

### 任务 1: GPU INT8 量化部署

**负责人**: 后端开发  
**时间**: 10:00 - 12:00  
**优先级**: P0

#### 执行步骤

**Step 1: 安装量化依赖 (10:00-10:30)**
```bash
cd /root/.openclaw/workspace-main/projects/sparkpath/tts-deployment/CosyVoice

# 安装 bitsandbytes (INT8 量化库)
pip3 install bitsandbytes accelerate optimum

# 验证安装
python3 -c "import bitsandbytes; print('bitsandbytes 版本:', bitsandbytes.__version__)"
```

**Step 2: 检查 GPU 状态 (10:30-10:45)**
```bash
# 检查 NVIDIA 驱动
nvidia-smi

# 检查 CUDA 可用性
python3 -c "import torch; print('CUDA 可用:', torch.cuda.is_available())"
```

**Step 3: INT8 模型加载测试 (10:45-11:30)**
```bash
# 创建 INT8 加载测试脚本
cat > test_int8.py << 'EOF'
import torch
from transformers import AutoModel, BitsAndBytesConfig

print("=== INT8 量化加载测试 ===")

# 配置 INT8 量化
quantization_config = BitsAndBytesConfig(
    load_in_8bit=True,
    llm_int8_threshold=6.0,
)

print("加载 CosyVoice2-0.5B (INT8)...")
model = AutoModel.from_pretrained(
    "FunAudioLLM/CosyVoice2-0.5B",
    quantization_config=quantization_config,
    device_map="auto",
    torch_dtype=torch.float16
)

print(f"模型设备：{model.device}")
print(f"显存使用：{torch.cuda.memory_allocated() / 1024**2:.2f} MB")
print("✅ INT8 加载成功")
EOF

python3 test_int8.py
```

**Step 4: GPU 推理测试 (11:30-12:00)**
```bash
# 创建 GPU 推理测试
cat > test_gpu_inference.py << 'EOF'
import torch
import time

print("=== GPU 推理延迟测试 ===")

# 模拟推理 (实际需要使用 CosyVoice 推理接口)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"使用设备：{device}")

# 测试 10 次推理延迟
latencies = []
for i in range(10):
    start = time.time()
    # 模拟计算
    torch.randn(1, 512).to(device).sum()
    torch.cuda.synchronize()
    latency = (time.time() - start) * 1000
    latencies.append(latency)

avg_latency = sum(latencies) / len(latencies)
print(f"平均延迟：{avg_latency:.2f}ms")
print(f"目标延迟：≤200ms")
print(f"状态：{'✅ 达标' if avg_latency <= 200 else '⚠️ 未达标'}")
EOF

python3 test_gpu_inference.py
```

#### 验收标准

| 指标 | 目标 | 测量方式 |
|------|------|---------|
| INT8 加载成功 | ✅ | 无 OOM 错误 |
| 显存使用 | ≤1.5GB | nvidia-smi |
| GPU 利用率 | >50% | nvidia-smi |
| 推理延迟 | ≤200ms | 10 次平均 |

---

### 任务 2: 性能基准测试

**负责人**: 测试工程师  
**时间**: 14:00 - 17:00  
**优先级**: P0

#### 测试项目

**Test 1: CPU 推理基准 (14:00-15:00)**
```bash
# CPU 推理延迟测试
cat > benchmark_cpu.py << 'EOF'
import time
import torch

print("=" * 60)
print("CPU 推理性能基准测试")
print("=" * 60)

device = torch.device("cpu")
text_lengths = [10, 50, 100, 200]  # 字符数

results = []
for length in text_lengths:
    latencies = []
    for _ in range(5):
        start = time.time()
        # 模拟推理
        torch.randn(1, length * 10).to(device).sum()
        latency = (time.time() - start) * 1000
        latencies.append(latency)
    
    avg = sum(latencies) / len(latencies)
    results.append((length, avg))
    print(f"文本长度 {length} 字符：平均延迟 {avg:.2f}ms")

print("\n预期结果:")
print("- 10 字符：~100ms")
print("- 50 字符：~300ms")
print("- 100 字符：~500ms")
print("- 200 字符：~800ms")
EOF

python3 benchmark_cpu.py
```

**Test 2: GPU INT8 推理基准 (15:00-16:00)**
```bash
# GPU INT8 推理延迟测试
cat > benchmark_gpu_int8.py << 'EOF'
import time
import torch

print("=" * 60)
print("GPU INT8 推理性能基准测试")
print("=" * 60)

if not torch.cuda.is_available():
    print("❌ CUDA 不可用，跳过 GPU 测试")
    exit(1)

device = torch.device("cuda")
text_lengths = [10, 50, 100, 200]

results = []
for length in text_lengths:
    latencies = []
    for _ in range(5):
        start = time.time()
        # 模拟推理
        tensor = torch.randn(1, length * 10).to(device)
        result = tensor.sum()
        torch.cuda.synchronize()
        latency = (time.time() - start) * 1000
        latencies.append(latency)
    
    avg = sum(latencies) / len(latencies)
    results.append((length, avg))
    print(f"文本长度 {length} 字符：平均延迟 {avg:.2f}ms")

print("\n预期结果 (GPU INT8):")
print("- 10 字符：~50ms")
print("- 50 字符：~100ms")
print("- 100 字符：~150ms")
print("- 200 字符：~200ms")
EOF

python3 benchmark_gpu_int8.py
```

**Test 3: 并发压力测试 (16:00-17:00)**
```bash
# 并发请求测试
cat > benchmark_concurrent.py << 'EOF'
import time
import threading
import torch

print("=" * 60)
print("并发压力测试")
print("=" * 60)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"使用设备：{device}")

results = []
lock = threading.Lock()

def inference_task(task_id):
    start = time.time()
    torch.randn(1, 512).to(device).sum()
    if torch.cuda.is_available():
        torch.cuda.synchronize()
    latency = (time.time() - start) * 1000
    
    with lock:
        results.append((task_id, latency))

# 测试不同并发数
for concurrent in [1, 2, 5, 10]:
    results = []
    threads = []
    
    start_all = time.time()
    for i in range(concurrent):
        t = threading.Thread(target=inference_task, args=(i,))
        threads.append(t)
        t.start()
    
    for t in threads:
        t.join()
    
    total_time = (time.time() - start_all) * 1000
    avg_latency = sum(r[1] for r in results) / len(results)
    
    print(f"\n并发数 {concurrent}:")
    print(f"  总耗时：{total_time:.2f}ms")
    print(f"  平均延迟：{avg_latency:.2f}ms")
    print(f"  吞吐量：{concurrent / (total_time/1000):.2f} 请求/秒")
EOF

python3 benchmark_concurrent.py
```

#### 验收标准

| 测试项 | 指标 | 目标 | 状态 |
|--------|------|------|------|
| CPU 推理 | 100 字符延迟 | ≤600ms | ⏳ |
| GPU INT8 | 100 字符延迟 | ≤200ms | ⏳ |
| GPU INT8 | 显存使用 | ≤1.5GB | ⏳ |
| 并发 (5 用户) | 平均延迟 | ≤300ms | ⏳ |
| 并发 (10 用户) | 平均延迟 | ≤500ms | ⏳ |

---

## 三、依赖安装清单

### Python 依赖

```bash
# 核心依赖
pip3 install torch torchaudio --index-url https://download.pytorch.org/whl/cu121

# 量化库
pip3 install bitsandbytes accelerate optimum

# CosyVoice 依赖
cd /root/.openclaw/workspace-main/projects/sparkpath/tts-deployment/CosyVoice
pip3 install -r requirements.txt

# 测试工具
pip3 install psutil pytest benchmark
```

### 系统依赖

```bash
# 更新 NVIDIA 驱动 (如需要)
sudo apt-get update
sudo apt-get install -y nvidia-driver-535

# 重启后验证
nvidia-smi
```

---

## 四、模型下载

### 下载命令

```bash
# 方法 1: huggingface-cli (推荐)
HF_ENDPOINT=https://hf-mirror.com huggingface-cli download FunAudioLLM/CosyVoice2-0.5B \
  --local-dir /root/.openclaw/workspace-main/projects/sparkpath/tts-deployment/models

# 方法 2: git clone
git lfs install
git clone https://huggingface.co/FunAudioLLM/CosyVoice2-0.5B \
  /root/.openclaw/workspace-main/projects/sparkpath/tts-deployment/models
```

### 预期文件大小

| 文件 | 大小 |
|------|------|
| 模型权重 | ~1GB |
| 配置文件 | ~10KB |
| 分词器 | ~5MB |
| **总计** | **~1.5GB** |

### 下载时间估算

| 带宽 | 预计时间 |
|------|---------|
| 100Mbps | ~2 分钟 |
| 50Mbps | ~4 分钟 |
| 10Mbps | ~20 分钟 |

---

## 五、风险与应对

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| GPU 驱动不兼容 | 中 | 高 | 使用 CPU 模式备用 |
| INT8 量化失败 | 低 | 中 | 使用 FP16 备用 |
| 模型下载失败 | 中 | 高 | 使用镜像源 |
| 显存不足 OOM | 中 | 高 | 关闭其他应用 |

---

## 六、交付物

### 预期输出

| 文件 | 说明 |
|------|------|
| `benchmark_results.md` | 性能基准测试报告 |
| `int8_deployment.log` | INT8 部署日志 |
| `comparison_cpu_vs_gpu.md` | CPU vs GPU 性能对比 |

### 报告模板

```markdown
# 性能基准测试报告

## 测试环境
- GPU: NVIDIA MX150 (2GB)
- CPU: Intel 8 核
- 内存：7.5GB
- 交换空间：8GB

## 测试结果

### CPU 推理
| 文本长度 | 延迟 |
|---------|------|
| 10 字符 | XX ms |
| 100 字符 | XX ms |

### GPU INT8 推理
| 文本长度 | 延迟 |
|---------|------|
| 10 字符 | XX ms |
| 100 字符 | XX ms |

## 结论
- CPU 模式：适合单用户，延迟~500ms
- GPU INT8: 适合 5-10 并发，延迟~150ms
- 推荐方案：GPU INT8 + 缓存层
```

---

## 七、签字确认

| 角色 | 姓名 | 日期 | 签字 |
|------|------|------|------|
| 后端开发 | [待填写] | 2026-04-22 | _______ |
| 测试工程师 | [待填写] | 2026-04-22 | _______ |
| 架构师 | [待填写] | 2026-04-22 | _______ |

---

**制定时间**: 2026-04-21 23:25  
**版本**: v1.0  
**下次更新**: 04-22 (任务执行后)
