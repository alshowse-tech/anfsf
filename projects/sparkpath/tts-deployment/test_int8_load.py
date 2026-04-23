#!/usr/bin/env python3
"""INT8 量化加载测试"""

import torch
from transformers import AutoModel, BitsAndBytesConfig
import time

print("=" * 60)
print("INT8 量化加载测试")
print("=" * 60)

# 检查 CUDA
if not torch.cuda.is_available():
    print("❌ CUDA 不可用，使用 CPU 模式")
    device = torch.device("cpu")
else:
    print(f"✅ CUDA 可用")
    print(f"  GPU: {torch.cuda.get_device_name(0)}")
    print(f"  显存：{torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
    device = torch.device("cuda")

# 配置 INT8 量化
print("\n配置 INT8 量化...")
quantization_config = BitsAndBytesConfig(
    load_in_8bit=True,
    llm_int8_threshold=6.0,
)

# 测试模型加载 (使用小模型测试)
print("\n加载测试模型...")
start = time.time()

try:
    # 由于 CosyVoice2 模型较大，先用小模型测试
    from transformers import AutoModelForCausalLM
    
    print("尝试加载 INT8 模型...")
    model = AutoModelForCausalLM.from_pretrained(
        "Qwen/Qwen2-0.5B",  # 使用 0.5B 模型测试
        quantization_config=quantization_config,
        device_map="auto",
        torch_dtype=torch.float16,
        trust_remote_code=True
    )
    
    load_time = time.time() - start
    print(f"✅ 模型加载成功 ({load_time:.2f}s)")
    
    # 显存使用
    if torch.cuda.is_available():
        mem_used = torch.cuda.memory_allocated() / 1024**2
        print(f"  显存使用：{mem_used:.2f} MB")
    
    print("\n" + "=" * 60)
    print("INT8 加载测试通过 ✅")
    print("=" * 60)
    
except Exception as e:
    print(f"❌ 加载失败：{e}")
    print("\n回退方案：使用 CPU + FP16 模式")
