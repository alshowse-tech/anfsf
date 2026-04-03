"""
阿里云 OSS 存储服务
支持文件上传、下载、删除等操作
"""
import os
import asyncio
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import httpx

# 尝试导入 oss2，如果不存在则使用 httpx 实现
try:
    import oss2
    OSS2_AVAILABLE = True
except ImportError:
    OSS2_AVAILABLE = False

from config.oss import OSSConfig, get_oss_config


class OSSStorage:
    """阿里云 OSS 存储服务"""
    
    def __init__(self, config: Optional[OSSConfig] = None):
        """
        初始化 OSS 存储
        
        Args:
            config: OSS 配置，默认从环境变量读取
        """
        self.config = config or get_oss_config()
        self.bucket_url = self.config.bucket_url
        
        if OSS2_AVAILABLE:
            # 使用官方 SDK
            self.auth = oss2.Auth(self.config.access_key, self.config.secret_key)
            self.bucket = oss2.Bucket(self.auth, self.config.endpoint, self.config.bucket)
        else:
            # 使用 HTTP API（备用方案）
            self.auth = None
            self.bucket = None
    
    def _get_object_url(self, object_name: str) -> str:
        """获取对象访问 URL"""
        return f"https://{self.config.bucket}.{self.config.endpoint}/{object_name}"
    
    async def upload_file(self, file_path: str, object_name: str, 
                         content_type: Optional[str] = None,
                         progress_callback: Optional[callable] = None) -> str:
        """
        上传文件到 OSS
        
        Args:
            file_path: 本地文件路径
            object_name: OSS 对象名称（包含路径）
            content_type: 内容类型，自动检测
            progress_callback: 进度回调函数
            
        Returns:
            str: 文件访问 URL
            
        Raises:
            IOError: 上传失败
        """
        if not os.path.exists(file_path):
            raise IOError(f"文件不存在：{file_path}")
        
        if OSS2_AVAILABLE and self.bucket:
            # 使用官方 SDK
            try:
                # 自动检测 content_type
                if content_type is None:
                    content_type = self._detect_content_type(file_path)
                
                # 上传文件
                with open(file_path, "rb") as f:
                    if progress_callback:
                        file_size = os.path.getsize(file_path)
                        uploaded = 0
                        def callback(bytes_transferred):
                            nonlocal uploaded
                            uploaded += bytes_transferred
                            progress_callback(uploaded, file_size)
                        self.bucket.put_object_from_file(object_name, file_path, 
                                                        headers={"Content-Type": content_type},
                                                        progress_callback=callback)
                    else:
                        self.bucket.put_object_from_file(object_name, file_path,
                                                        headers={"Content-Type": content_type})
                
                return self._get_object_url(object_name)
                
            except Exception as e:
                raise IOError(f"OSS 上传失败：{str(e)}")
        else:
            # 使用 HTTP API（备用方案）
            return await self._upload_via_http(file_path, object_name, content_type)
    
    async def _upload_via_http(self, file_path: str, object_name: str,
                               content_type: Optional[str] = None) -> str:
        """通过 HTTP PUT 上传（备用方案）"""
        # 阿里云 OSS 支持 PUT 上传，需要计算签名
        # 这里简化实现，实际生产环境建议使用官方 SDK
        raise NotImplementedError(
            "HTTP 上传模式需要实现签名逻辑，建议安装 oss2 SDK: pip install oss2"
        )
    
    async def download_file(self, object_name: str, save_path: str,
                           progress_callback: Optional[callable] = None) -> str:
        """
        从 OSS 下载文件
        
        Args:
            object_name: OSS 对象名称
            save_path: 本地保存路径
            progress_callback: 进度回调函数
            
        Returns:
            str: 保存的文件路径
        """
        if OSS2_AVAILABLE and self.bucket:
            try:
                # 确保目录存在
                os.makedirs(os.path.dirname(save_path) if os.path.dirname(save_path) else ".", exist_ok=True)
                
                if progress_callback:
                    meta = self.bucket.get_object_meta(object_name)
                    total_size = meta.content_length
                    downloaded = 0
                    def callback(bytes_transferred):
                        nonlocal downloaded
                        downloaded += bytes_transferred
                        progress_callback(downloaded, total_size)
                    self.bucket.get_object_to_file(object_name, save_path, progress_callback=callback)
                else:
                    self.bucket.get_object_to_file(object_name, save_path)
                
                return save_path
                
            except Exception as e:
                raise IOError(f"OSS 下载失败：{str(e)}")
        else:
            # 使用 HTTP 下载（公开文件或签名 URL）
            return await self._download_via_http(object_name, save_path)
    
    async def _download_via_http(self, object_name: str, save_path: str) -> str:
        """通过 HTTP GET 下载"""
        url = self._get_object_url(object_name)
        
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                
                os.makedirs(os.path.dirname(save_path) if os.path.dirname(save_path) else ".", exist_ok=True)
                
                with open(save_path, "wb") as f:
                    async for chunk in response.aiter_bytes(8192):
                        f.write(chunk)
                
                return save_path
    
    async def delete_file(self, object_name: str) -> bool:
        """
        删除 OSS 文件
        
        Args:
            object_name: OSS 对象名称
            
        Returns:
            bool: 删除成功返回 True
        """
        if OSS2_AVAILABLE and self.bucket:
            try:
                self.bucket.delete_object(object_name)
                return True
            except Exception:
                return False
        else:
            # HTTP API 不支持直接删除
            return False
    
    async def get_file_url(self, object_name: str, expires: int = 3600) -> str:
        """
        获取文件访问 URL（带签名，适用于私有 Bucket）
        
        Args:
            object_name: OSS 对象名称
            expires: URL 有效期（秒），默认 1 小时
            
        Returns:
            str: 带签名的访问 URL
        """
        if OSS2_AVAILABLE and self.bucket:
            # 生成签名 URL
            return self.bucket.sign_url("GET", object_name, expires)
        else:
            # 公开 Bucket 直接返回 URL
            return self._get_object_url(object_name)
    
    async def list_files(self, prefix: str = "", max_keys: int = 100) -> List[Dict[str, Any]]:
        """
        列出文件
        
        Args:
            prefix: 前缀过滤
            max_keys: 最大数量
            
        Returns:
            List[Dict]: 文件列表
        """
        if OSS2_AVAILABLE and self.bucket:
            result = []
            for obj in oss2.ObjectIterator(self.bucket, prefix=prefix, max_keys=max_keys):
                result.append({
                    "key": obj.key,
                    "size": obj.size,
                    "last_modified": obj.last_modified,
                    "etag": obj.etag
                })
            return result
        else:
            return []
    
    def _detect_content_type(self, file_path: str) -> str:
        """检测文件内容类型"""
        ext = os.path.splitext(file_path)[1].lower()
        content_types = {
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".avi": "video/x-msvideo",
            ".webm": "video/webm",
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".m4a": "audio/mp4",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        return content_types.get(ext, "application/octet-stream")
    
    async def upload_video(self, file_path: str, video_id: str) -> str:
        """
        上传视频文件（便捷方法）
        
        Args:
            file_path: 视频文件路径
            video_id: 视频 ID（用于生成对象名）
            
        Returns:
            str: 视频访问 URL
        """
        object_name = f"videos/{video_id}.mp4"
        return await self.upload_file(file_path, object_name, content_type="video/mp4")
    
    async def upload_audio(self, file_path: str, audio_id: str) -> str:
        """
        上传音频文件（便捷方法）
        
        Args:
            file_path: 音频文件路径
            audio_id: 音频 ID
            
        Returns:
            str: 音频访问 URL
        """
        ext = os.path.splitext(file_path)[1].lower()
        object_name = f"audios/{audio_id}{ext}"
        return await self.upload_file(file_path, object_name)


# 单例实例
_storage_instance: Optional[OSSStorage] = None


def get_oss_storage() -> OSSStorage:
    """获取 OSS 存储实例"""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = OSSStorage()
    return _storage_instance
