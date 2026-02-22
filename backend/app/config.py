from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Google AI API
    gemini_api_key: str
    google_gemini_base_url: str

    # 服务配置
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # 存储配置
    upload_dir: str = "./uploads"
    output_dir: str = "./outputs"
    max_file_size: int = 10485760  # 10MB

    # 数据库
    database_url: str = "sqlite:///./vm_studio.db"

    # Gemini 配置
    gemini_model: str = "gemini-3-pro-image-preview"
    default_aspect_ratio: str = "9:16"
    default_image_size: str = "2K"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
