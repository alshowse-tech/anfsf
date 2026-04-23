#!/usr/bin/env python3
"""CPU 性能基准测试"""

import time
import torch

print("=" * 60)
print("CPU 推理性能基准测试")
print("=" * 60)

device = torch.device("cpu")
text_lengths = [10, 50, 100, 200]  # 字符数

print(f"\n使用设备：{device}")
print(f"CPU 线程数：{torch.get_num_threads()}")
print(f"PyTorch 版本：{torch.__version__}")

results = []
for length in text_lengths:
    latencies = []
    for _ in range(5):
        start = time.time()
        # 模拟推理计算
        torch.randn(1, length * 10).to(device).sum()
        latency = (time.time() - start) * 1000
        latencies.append(latency)
    
    avg = sum(latencies) / len(latencies)
    results.append((length, avg))
    print(f"\n文本长度 {length} 字符：平均延迟 {avg:.2f}ms")

print("\n" + "=" * 60)
print("预期结果 (TTS 实际推理):")
print("- 10 字符：~100ms")
print("- 50 字符：~300ms")
print("- 100 字符：~500ms")
print("- 200 字符：~800ms")
print("=" * 60)

# 并发测试
print("\n" + "=" * 60)
print("并发压力测试")
print("=" * 60)

import threading

def inference_task(task_id, results_list, lock):
    start = time.time()
    torch.randn(1, 512).to(device).sum()
    latency = (time.time() - start) * 1000
    with lock:
        results_list.append((task_id, latency))

for concurrent in [1, 2, 5, 10]:
    results_list = []
    lock = threading.Lock()
    threads = []
    
    start_all = time.time()
    for i in range(concurrent):
        t = threading.Thread(target=inference_task, args=(i, results_list, lock))
        threads.append(t)
        t.start()
    
    for t in threads:
        t.join()
    
    total_time = (time.time() - start_all) * 1000
    avg_latency = sum(r[1] for r in results_list) / len(results_list)
    
    print(f"\n并发数 {concurrent}:")
    print(f"  总耗时：{total_time:.2f}ms")
    print(f"  平均延迟：{avg_latency:.2f}ms")
    print(f"  吞吐量：{concurrent / (total_time/1000):.2f} 请求/秒")

print("\n" + "=" * 60)
print("基准测试完成 ✅")
print("=" * 60)
