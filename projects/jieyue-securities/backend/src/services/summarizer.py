# 内容摘要服务
import httpx
from typing import Dict, Any, List
from datetime import datetime

class LLMSummarizer:
    """LLM 内容摘要"""
    
    def __init__(self, api_key: str, model: str = "qwen-plus"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
    
    async def summarize(self, text: str) -> Dict[str, Any]:
        """生成内容摘要"""
        prompt = f"""请对以下内容进行分析和总结：

{text}

请输出：
1. 关键点列表（3-5 个）
2. 摘要（100-200 字）
3. 风险标签（如有）

风险标签参考：
- 可能包含投资建议
- 存在主观判断
- 提及具体股票代码
- 承诺收益
- 内幕消息
- 稳赚不赔
- 带单推荐

请以 JSON 格式输出：
{{
  "key_points": ["关键点 1", "关键点 2"],
  "abstract": "摘要内容",
  "risk_tags": ["风险标签 1"]
}}
"""
        
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                response = await client.post(
                    self.base_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "input": {
                            "messages": [
                                {
                                    "role": "user",
                                    "content": prompt
                                }
                            ]
                        }
                    }
                )
                response.raise_for_status()
                result = response.json()
                
                # 解析 LLM 输出
                content = result["output"]["choices"][0]["message"]["content"]
                import json
                summary = json.loads(content)
                
                return {
                    "success": True,
                    "key_points": summary.get("key_points", []),
                    "abstract": summary.get("abstract", ""),
                    "risk_tags": summary.get("risk_tags", [])
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }


class TemplateSummarizer:
    """模板摘要（fallback）"""
    
    async def summarize(self, text: str) -> Dict[str, Any]:
        """使用模板生成摘要"""
        # 简单提取前 100 字作为摘要
        abstract = text[:100] + "..." if len(text) > 100 else text
        
        # 简单风险检测
        risk_keywords = ["投资建议", "收益", "股票", "推荐", "稳赚", "内幕"]
        risk_tags = []
        for keyword in risk_keywords:
            if keyword in text:
                risk_tags.append(f"提及{keyword}")
        
        return {
            "success": True,
            "key_points": ["内容摘要已生成"],
            "abstract": abstract,
            "risk_tags": risk_tags if risk_tags else ["无明确风险"]
        }


class SummaryService:
    """摘要服务（带 fallback）"""
    
    def __init__(self, api_key: str):
        self.llm = LLMSummarizer(api_key)
        self.template = TemplateSummarizer()
    
    async def summarize(self, text: str, retry: int = 2) -> Dict[str, Any]:
        """生成摘要（带重试）"""
        for i in range(retry):
            result = await self.llm.summarize(text)
            if result["success"]:
                return result
            await asyncio.sleep(2 ** i)
        
        # LLM 失败，使用模板
        return await self.template.summarize(text)
