# BullMQ 队列处理器
import json
import asyncio
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any

from db.session import SessionLocal
from db.models import Task, TaskStatus, Content, Summary, Transaction, TransactionType, TransactionStatus, ContentType
from queues.config import QUEUE_PARSE, QUEUE_ASR, QUEUE_SUMMARY, QUEUE_BILLING
from services.url_parser import URLParserService
from services.asr import ASRService
from services.summarizer import SummaryService
from services.risk_detector import RiskTagService

class TaskProcessor:
    """任务队列处理器"""
    
    def __init__(self):
        self.db = SessionLocal()
        # 初始化服务（从环境变量读取配置）
        import os
        self.url_parser = URLParserService(os.getenv("TIKHUB_API_KEY", ""))
        self.asr_service = ASRService(
            os.getenv("VOLCANO_ACCESS_KEY", ""),
            os.getenv("VOLCANO_SECRET_KEY", "")
        )
        self.summarizer = SummaryService(os.getenv("DASHSCOPE_API_KEY", ""))
        self.risk_detector = RiskTagService()
    
    async def process_parse(self, task_id: int) -> Dict[str, Any]:
        """处理 URL 解析任务"""
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return {"success": False, "error": "任务不存在"}
        
        try:
            # 更新状态
            task.status = TaskStatus.PARSING
            self.db.commit()
            
            # 调用 URL 解析服务
            parse_result = await self.url_parser.parse(task.url)
            
            if not parse_result.get("success"):
                raise Exception(f"URL 解析失败：{parse_result.get('error', '未知错误')}")
            
            # 更新任务
            task.status = TaskStatus.ASR_PROCESSING
            task.duration = parse_result.get("duration", 60)
            task.content_type = getattr(ContentType, parse_result.get("content_type", "VIDEO").upper(), ContentType.VIDEO)
            task.parse_provider = "tikhub"
            self.db.commit()
            
            # 保存内容
            content = Content(
                task_id=task_id,
                title=parse_result.get("title", ""),
                author=parse_result.get("author", "")
            )
            self.db.add(content)
            self.db.commit()
            
            return {
                "success": True,
                "next_queue": QUEUE_ASR,
                "data": parse_result
            }
        except Exception as e:
            self.db.rollback()
            task.status = TaskStatus.PARSE_FAILED
            task.error_msg = str(e)
            self.db.commit()
            return {"success": False, "error": str(e)}
    
    async def process_asr(self, task_id: int) -> Dict[str, Any]:
        """处理 ASR 语音识别任务"""
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return {"success": False, "error": "任务不存在"}
        
        try:
            # 更新状态
            task.status = TaskStatus.ASR_PROCESSING
            self.db.commit()
            
            # 获取内容
            content = self.db.query(Content).filter(Content.task_id == task_id).first()
            if not content or not content.transcript:
                # 无音频内容，跳过 ASR
                task.status = TaskStatus.SUMMARIZING
                self.db.commit()
                return {
                    "success": True,
                    "next_queue": QUEUE_SUMMARY,
                    "data": {"transcript": "", "skipped": True}
                }
            
            # 调用 ASR 服务
            asr_result = await self.asr_service.transcribe(content.transcript)
            
            if not asr_result.get("success"):
                raise Exception(f"ASR 失败：{asr_result.get('error', '未知错误')}")
            
            # 更新内容表
            content.transcript = asr_result.get("transcript", "")
            self.db.commit()
            
            # 更新任务状态
            task.status = TaskStatus.SUMMARIZING
            task.asr_provider = "volcano"
            self.db.commit()
            
            return {
                "success": True,
                "next_queue": QUEUE_SUMMARY,
                "data": asr_result
            }
        except Exception as e:
            self.db.rollback()
            task.status = TaskStatus.ASR_FAILED
            task.error_msg = str(e)
            self.db.commit()
            return {"success": False, "error": str(e)}
    
    async def process_summary(self, task_id: int) -> Dict[str, Any]:
        """处理内容摘要任务"""
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return {"success": False, "error": "任务不存在"}
        
        try:
            # 更新状态
            task.status = TaskStatus.SUMMARIZING
            self.db.commit()
            
            # 获取内容
            content = self.db.query(Content).filter(Content.task_id == task_id).first()
            text_to_summarize = content.transcript or content.raw_text or ""
            
            if not text_to_summarize:
                raise Exception("无内容可摘要")
            
            # 调用摘要服务
            summary_result = await self.summarizer.summarize(text_to_summarize)
            
            if not summary_result.get("success"):
                raise Exception(f"摘要失败：{summary_result.get('error', '未知错误')}")
            
            # 风险检测
            risk_result = self.risk_detector.analyze(
                text=text_to_summarize,
                title=content.title or "",
                author=content.author or ""
            )
            
            # 合并风险标签
            all_risk_tags = list(set(summary_result.get("risk_tags", []) + risk_result.get("risk_tags", [])))
            
            # 保存摘要
            summary = Summary(
                task_id=task_id,
                key_points=json.dumps(summary_result.get("key_points", []), ensure_ascii=False),
                abstract=summary_result.get("abstract", ""),
                risk_tags=json.dumps(all_risk_tags, ensure_ascii=False)
            )
            self.db.add(summary)
            
            # 检查是否需要拦截
            if risk_result.get("should_block"):
                task.status = TaskStatus.FAILED
                task.error_msg = f"内容违规：{risk_result.get('action', '禁止发布')}"
            else:
                task.status = TaskStatus.SUCCESS
            
            self.db.commit()
            
            return {
                "success": True,
                "next_queue": QUEUE_BILLING,
                "data": {
                    **summary_result,
                    "risk_tags": all_risk_tags,
                    "risk_level": risk_result.get("highest_level")
                }
            }
        except Exception as e:
            self.db.rollback()
            task.status = TaskStatus.FAILED
            task.error_msg = str(e)
            self.db.commit()
            return {"success": False, "error": str(e)}
    
    async def process_billing(self, task_id: int) -> Dict[str, Any]:
        """处理计费任务"""
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return {"success": False, "error": "任务不存在"}
        
        try:
            # 计算费用
            base_price = Decimal("1.0")
            per_minute_price = Decimal("0.5")
            
            if task.duration:
                minutes = (task.duration + 59) // 60  # 向上取整
                minutes = min(minutes, 90)  # 最多 90 分钟
                cost = base_price + minutes * per_minute_price
            else:
                cost = base_price
            
            task.cost = cost
            self.db.commit()
            
            # 扣费
            from api.wallets import deduct_balance
            result = await deduct_balance(
                user_id=task.user_id,
                amount=float(cost),
                task_id=task_id,
                db=self.db
            )
            
            if not result["success"]:
                return {"success": False, "error": result["error"]}
            
            return {
                "success": True,
                "cost": float(cost),
                "message": "计费成功"
            }
        except Exception as e:
            self.db.rollback()
            return {"success": False, "error": str(e)}

# 全局处理器实例
processor = TaskProcessor()
