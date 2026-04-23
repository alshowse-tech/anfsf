"""
Task Splitter - 任务拆分

将复杂任务拆分为可并行执行的子任务
"""
from typing import Dict, List, Any
from dataclasses import dataclass
import asyncio
from loguru import logger


@dataclass
class SubTask:
    """子任务"""
    id: str
    action: str
    payload: Dict
    dependencies: List[str]  # 依赖的子任务 ID


@dataclass
class TaskResult:
    """任务结果"""
    task_id: str
    success: bool
    results: Dict[str, Any]
    errors: Dict[str, str]
    total_latency_ms: float


class TaskSplitter:
    """任务拆分器"""
    
    def __init__(self):
        self.splitters: Dict[str, callable] = {}
        self._register_default_splitters()
    
    def _register_default_splitters(self):
        """注册默认拆分器"""
        self.splitters["batch_stock_query"] = self._split_batch_stock_query
        self.splitters["portfolio_analysis"] = self._split_portfolio_analysis
        self.splitters["market_screening"] = self._split_market_screening
    
    def _split_batch_stock_query(self, payload: Dict) -> List[SubTask]:
        """批量股票查询拆分"""
        symbols = payload.get("symbols", [])
        return [
            SubTask(
                id=f"stock_{i}",
                action="stock.info",
                payload={"symbol": symbol},
                dependencies=[]
            )
            for i, symbol in enumerate(symbols)
        ]
    
    def _split_portfolio_analysis(self, payload: Dict) -> List[SubTask]:
        """持仓分析拆分"""
        positions = payload.get("positions", [])
        tasks = []
        
        for i, pos in enumerate(positions):
            # 并行查询股票信息
            tasks.append(SubTask(
                id=f"pos_{i}_info",
                action="stock.info",
                payload={"symbol": pos["symbol"]},
                dependencies=[]
            ))
            
            # 并行 AI 分析
            tasks.append(SubTask(
                id=f"pos_{i}_ai",
                action="ai.analyze",
                payload={"symbol": pos["symbol"], "data": pos},
                dependencies=[f"pos_{i}_info"]
            ))
        
        return tasks
    
    def _split_market_screening(self, payload: Dict) -> List[SubTask]:
        """市场筛选拆分"""
        sectors = payload.get("sectors", [])
        return [
            SubTask(
                id=f"sector_{i}",
                action="screener.run",
                payload={"sector": sector},
                dependencies=[]
            )
            for i, sector in enumerate(sectors)
        ]
    
    def split(self, task_type: str, payload: Dict) -> List[SubTask]:
        """
        拆分任务
        
        Args:
            task_type: 任务类型
            payload: 任务负载
        
        Returns:
            子任务列表
        """
        splitter = self.splitters.get(task_type)
        
        if not splitter:
            # 无法拆分，返回单任务
            logger.debug(f"⚠️ 无拆分器：{task_type}, 返回单任务")
            return [
                SubTask(
                    id="main",
                    action=task_type,
                    payload=payload,
                    dependencies=[]
                )
            ]
        
        return splitter(payload)
    
    async def execute_parallel(
        self,
        tasks: List[SubTask],
        executor: callable
    ) -> TaskResult:
        """
        并行执行子任务
        
        Args:
            tasks: 子任务列表
            executor: 执行函数 (async)
        
        Returns:
            任务结果
        """
        import time
        start_time = time.time()
        
        results = {}
        errors = {}
        
        # 构建依赖图
        task_map = {task.id: task for task in tasks}
        completed = set()
        
        # 拓扑排序执行
        while len(completed) < len(tasks):
            # 找出可执行的任务 (依赖已完成)
            ready_tasks = [
                task for task in tasks
                if task.id not in completed and
                all(dep in completed for dep in task.dependencies)
            ]
            
            if not ready_tasks:
                errors["deadlock"] = "检测到循环依赖"
                break
            
            # 并行执行
            coroutines = [
                executor(task.action, task.payload)
                for task in ready_tasks
            ]
            
            task_results = await asyncio.gather(*coroutines, return_exceptions=True)
            
            # 收集结果
            for task, result in zip(ready_tasks, task_results):
                if isinstance(result, Exception):
                    errors[task.id] = str(result)
                else:
                    results[task.id] = result
                completed.add(task.id)
        
        return TaskResult(
            task_id=f"batch_{int(start_time)}",
            success=len(errors) == 0,
            results=results,
            errors=errors,
            total_latency_ms=(time.time() - start_time) * 1000
        )
