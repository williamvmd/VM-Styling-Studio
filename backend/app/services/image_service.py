from PIL import Image
from typing import Optional
import io
import os
import uuid
from pathlib import Path
from app.config import settings


class ImageService:
    def __init__(self):
        # 确保目录存在
        Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
        Path(settings.output_dir).mkdir(parents=True, exist_ok=True)

    async def save_upload(self, file_bytes: bytes, filename: str) -> str:
        """保存上传的文件"""
        # 生成唯一文件名
        ext = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.upload_dir, unique_filename)

        # 保存文件
        with open(filepath, "wb") as f:
            f.write(file_bytes)

        return filepath

    async def load_image(self, filepath: str) -> Image.Image:
        """加载图片"""
        try:
            img = Image.open(filepath)
            # 转换为 RGB 模式
            if img.mode != "RGB":
                img = img.convert("RGB")
            return img
        except Exception as e:
            raise Exception(f"Failed to load image: {str(e)}")

    async def save_generated_image(
        self, image_bytes: bytes, session_id: str, index: int
    ) -> str:
        """保存生成的图片"""
        filename = f"{session_id}_{index}.png"
        filepath = os.path.join(settings.output_dir, filename)

        # 保存图片
        with open(filepath, "wb") as f:
            f.write(image_bytes)

        # 返回相对路径或 URL
        return f"/outputs/{filename}"

    async def create_thumbnail(self, image_bytes: bytes, size=(200, 300)) -> bytes:
        """创建缩略图"""
        img = Image.open(io.BytesIO(image_bytes))
        img.thumbnail(size, Image.Resampling.LANCZOS)

        # 转换为字节
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return buffer.getvalue()

    async def read_generated_image(self, url: str) -> bytes:
        """读取生成的图片"""
        # 从 URL 提取文件名
        filename = os.path.basename(url)
        filepath = os.path.join(settings.output_dir, filename)

        # 读取文件
        with open(filepath, "rb") as f:
            return f.read()

    async def cleanup_uploads(self, filepaths: list):
        """清理上传的临时文件"""
        for filepath in filepaths:
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except Exception as e:
                print(f"Failed to cleanup {filepath}: {str(e)}")

    def validate_image(self, file_bytes: bytes) -> bool:
        """验证图片文件"""
        try:
            img = Image.open(io.BytesIO(file_bytes))
            img.verify()
            return True
        except:
            return False


# 单例实例
image_service = ImageService()
