"""
DeepSeek AI 数据分析模块
"""
import httpx
import json
from typing import Dict, List, Optional
from datetime import datetime
from config import settings
from loguru import logger


class DeepSeekAnalyzer:
    """DeepSeek AI 数据分析器"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or "sk-ce67c8965f8d4be882e6fa7809048c8a"
        self.base_url = "https://api.deepseek.com"
        self.model = "deepseek-chat"
        self.timeout = 30
    
    async def analyze_stock(self, symbol: str, stock_data: Dict) -> Dict:
        """
        分析个股
        
        Args:
            symbol: 股票代码
            stock_data: 股票数据 (RPS/指标/形态等)
        
        Returns:
            AI 分析报告
        """
        prompt = self._build_stock_analysis_prompt(symbol, stock_data)
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "你是一位专业的股票分析师，擅长技术分析和量化交易。请基于提供的数据进行客观分析，给出明确的投资建议。"
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": 0.3,
                        "max_tokens": 1000
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    analysis = result["choices"][0]["message"]["content"]
                    
                    return {
                        "success": True,
                        "analysis": analysis,
                        "timestamp": datetime.now().isoformat(),
                        "model": self.model
                    }
                else:
                    logger.error(f"DeepSeek API 错误：{response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "error": f"API 错误：{response.status_code}",
                        "timestamp": datetime.now().isoformat()
                    }
                    
        except Exception as e:
            logger.error(f"DeepSeek 分析失败：{e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def analyze_market(self, market_data: Dict) -> Dict:
        """
        分析市场整体情况
        
        Args:
            market_data: 市场数据 (板块/涨跌家数/成交量等)
        
        Returns:
            AI 市场分析报告
        """
        prompt = self._build_market_analysis_prompt(market_data)
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "你是一位专业的市场策略师，擅长判断市场趋势和情绪。请基于提供的数据进行客观分析。"
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": 0.3,
                        "max_tokens": 1000
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    analysis = result["choices"][0]["message"]["content"]
                    
                    return {
                        "success": True,
                        "analysis": analysis,
                        "timestamp": datetime.now().isoformat(),
                        "model": self.model
                    }
                else:
                    logger.error(f"DeepSeek API 错误：{response.status_code}")
                    return {
                        "success": False,
                        "error": f"API 错误：{response.status_code}",
                        "timestamp": datetime.now().isoformat()
                    }
                    
        except Exception as e:
            logger.error(f"DeepSeek 分析失败：{e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def generate_trade_plan(self, positions: List[Dict], signals: List[Dict]) -> Dict:
        """
        生成交易计划
        
        Args:
            positions: 当前持仓列表
            signals: 交易信号列表
        
        Returns:
            AI 生成的交易计划
        """
        prompt = self._build_trade_plan_prompt(positions, signals)
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "你是一位专业的交易员，擅长制定交易计划和风险控制。请基于持仓和信号给出明确的交易建议。"
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": 0.3,
                        "max_tokens": 1500
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    plan = result["choices"][0]["message"]["content"]
                    
                    return {
                        "success": True,
                        "plan": plan,
                        "timestamp": datetime.now().isoformat(),
                        "model": self.model
                    }
                else:
                    logger.error(f"DeepSeek API 错误：{response.status_code}")
                    return {
                        "success": False,
                        "error": f"API 错误：{response.status_code}",
                        "timestamp": datetime.now().isoformat()
                    }
                    
        except Exception as e:
            logger.error(f"DeepSeek 分析失败：{e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _build_stock_analysis_prompt(self, symbol: str, data: Dict) -> str:
        """构建个股分析提示词"""
        return f"""
请分析以下股票数据：

**股票代码**: {symbol}

**RPS 指标**:
- RPS(10): {data.get('rps_10', 'N/A')}
- RPS(20): {data.get('rps_20', 'N/A')}
- RPS(50): {data.get('rps_50', 'N/A')}

**技术指标**:
- ATR(14): {data.get('atr_14', 'N/A')}
- RSI(14): {data.get('rsi_14', 'N/A')}
- 价格位置 (MA5): {data.get('price_pos_ma_5', 'N/A')}%

**形态**: {data.get('pattern', 'N/A')}

**当前价**: ¥{data.get('price', 'N/A')}
**止损位**: ¥{data.get('stop_loss', 'N/A')}
**止盈位**: ¥{data.get('take_profit', 'N/A')}

请给出：
1. 技术面分析
2. 风险评估
3. 明确的买卖建议
4. 仓位建议
"""
    
    def _build_market_analysis_prompt(self, data: Dict) -> str:
        """构建市场分析提示词"""
        return f"""
请分析当前市场情况：

**市场数据**:
- 上涨家数：{data.get('advancing', 'N/A')}
- 下跌家数：{data.get('declining', 'N/A')}
- 涨停家数：{data.get('limit_up', 'N/A')}
- 跌停家数：{data.get('limit_down', 'N/A')}
- 成交量：{data.get('volume', 'N/A')} 亿
- 北向资金：{data.get('north_flow', 'N/A')} 亿

**强势板块**:
{json.dumps(data.get('strong_sectors', []), ensure_ascii=False, indent=2)}

请给出：
1. 市场情绪判断
2. 主线板块分析
3. 仓位建议
4. 风险提示
"""
    
    def _build_trade_plan_prompt(self, positions: List[Dict], signals: List[Dict]) -> str:
        """构建交易计划提示词"""
        return f"""
请制定今日交易计划：

**当前持仓** ({len(positions)} 只):
{json.dumps(positions, ensure_ascii=False, indent=2)}

**交易信号** ({len(signals)} 个):
{json.dumps(signals, ensure_ascii=False, indent=2)}

**风控规则**:
- 单票最大仓位：40%
- 非主线最大仓位：20%
- 总仓位上限：80%

请给出：
1. 持仓处理建议 (持有/加仓/减仓/清仓)
2. 新开仓建议
3. 仓位配置计划
4. 止损止盈调整建议
5. 风险提示
"""


# 全局实例
analyzer = DeepSeekAnalyzer()
