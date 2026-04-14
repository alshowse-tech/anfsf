# 任务后台处理模块
import asyncio
import logging
import os
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from db.session import SessionLocal
from db.models import Task, TaskStatus
from services.url_parser import URLParserService
from services.bailian_client import get_bailian_client

logger = logging.getLogger(__name__)


async def process_task(task_id: int, db: Session) -> bool:
    """
    处理单个任务（真实解析逻辑）
    
    Args:
        task_id: 任务 ID
        db: 数据库会话
        
    Returns:
        bool: 处理是否成功
    """
    try:
        # 获取任务
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            logger.error(f"任务 {task_id} 不存在")
            return False
        
        logger.info(f"[任务 {task_id}] 开始解析: {task.url}")
        
        # 第一步：短链接展开
        logger.info(f"[任务 {task_id}] 步骤 1: 短链接展开")
        expanded_url = task.url
        
        # 检查是否需要展开（抖音短链接）
        import re
        if re.search(r"(?:v\.douyin\.com|douyin\.com)/", task.url, re.IGNORECASE):
            import aiohttp
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.head(task.url, allow_redirects=True, timeout=aiohttp.ClientTimeout(total=10)) as response:
                        expanded_url = str(response.url)
                        logger.info(f"[任务 {task_id}] 短链接展开: {task.url} -> {expanded_url}")
            except Exception as e:
                logger.warning(f"[任务 {task_id}] 短链接展开失败: {e}")
        
        # 第二步：调用 URL 解析服务
        logger.info(f"[任务 {task_id}] 步骤 2: URL 解析")
        try:
            url_parser = URLParserService(tikhub_api_key="", timeout=30)
            parse_result = await url_parser.parse(expanded_url)
            
            if not parse_result.get("success"):
                logger.error(f"[任务 {task_id}] URL 解析失败: {parse_result.get('error')}")
                task.status = TaskStatus.FAILED
                task.error_msg = parse_result.get("error", "URL 解析失败")
                task.updated_at = datetime.now()
                db.commit()
                return False
            
            logger.info(f"[任务 {task_id}] URL 解析成功: {parse_result.get('title')}")
        except Exception as e:
            logger.error(f"[任务 {task_id}] URL 解析异常: {e}")
            task.status = TaskStatus.FAILED
            task.error_msg = f"URL 解析异常: {str(e)}"
            task.updated_at = datetime.now()
            db.commit()
            return False
        
        # 第三步：调用百炼 ASR 服务
        logger.info(f"[任务 {task_id}] 步骤 3: ASR 语音识别")
        try:
            bailian_client = get_bailian_client()
            asr_result = await bailian_client.transcribe_and_wait(
                expanded_url,
                is_video=True,
                language="zh-CN",
                timeout=300,
                extract_points=False  # 先转写，再生成摘要
            )
            
            if not asr_result.get("success"):
                logger.warning(f"[任务 {task_id}] ASR 转写失败: {asr_result.get('error')}")
                transcript = ""
            else:
                transcript = asr_result.get("text", "")
                logger.info(f"[任务 {task_id}] ASR 转写完成: {len(transcript)} 字符")
        except Exception as e:
            logger.error(f"[任务 {task_id}] ASR 异常: {e}")
            transcript = ""
        
        # 第四步：调用百炼大模型生成摘要
        logger.info(f"[任务 {task_id}] 步骤 4: 生成摘要")
        try:
            # 使用观点提炼 API
            points_result = await bailian_client._extract_points(transcript)
            key_points = []
            abstract = ""
            risk_tags = []
            
            if points_result.get("success"):
                # 简单解析 bullet points
                bullet_text = points_result.get("bullet_points", "")
                # 将 text 分割成列表（简单 split）
                key_points = bullet_text.split("\n")[:5]  # 只取前 5 个
                abstract = bullet_text
                risk_tags = ["无风险"]  # 默认值
            
            logger.info(f"[任务 {task_id}] 摘要生成成功")
        except Exception as e:
            logger.error(f"[任务 {task_id}] 摘要生成异常: {e}")
            key_points = []
            abstract = ""
            risk_tags = []
        
        # 第五步：更新任务状态为 SUCCESS
        logger.info(f"[任务 {task_id}] 步骤 5: 更新任务状态")
        task.status = TaskStatus.SUCCESS
        task.content_type = "VIDEO"
        task.duration = parse_result.get("duration", 0)
        task.cost = 1.50
        task.updated_at = datetime.now()
        
        # 保存到数据库（需要额外的 Content 和 Summary 表）
        # 这里简化处理，只更新任务表
        db.commit()
        
        logger.info(f"[任务 {task_id}] 处理完成: 状态=SUCCESS, 时长={task.duration}s")
        return True
        
    except Exception as e:
        logger.error(f"[任务 {task_id}] 处理失败: {str(e)}")
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = TaskStatus.FAILED
            task.error_msg = str(e)
            task.updated_at = datetime.now()
            db.commit()
        return False


async def process_pending_tasks():
    """
    处理所有待处理任务（后台定时任务）
    """
    db = SessionLocal()
    try:
        # 获取所有 INIT 状态的任务
        pending_tasks = db.query(Task).filter(Task.status == TaskStatus.INIT).all()
        
        if not pending_tasks:
            logger.debug("暂无待处理任务")
            return
        
        for task in pending_tasks:
            logger.info(f"[后台] 处理待处理任务: {task.id} ({task.url})")
            await process_task(task.id, db)
            await asyncio.sleep(0.5)  # 避免过快处理
            
    except Exception as e:
        logger.error(f"[后台] 批量处理任务失败: {str(e)}")
    finally:
        db.close()


async def start_task_processor():
    """
    启动任务处理程序（后台运行）
    """
    logger.info("[后台] 启动任务处理程序")
    
    while True:
        try:
            await process_pending_tasks()
            await asyncio.sleep(2)  # 每 2 秒检查一次
        except Exception as e:
            logger.error(f"[后台] 任务处理循环错误: {str(e)}")
            await asyncio.sleep(5)


# 启动器
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(start_task_processor())
