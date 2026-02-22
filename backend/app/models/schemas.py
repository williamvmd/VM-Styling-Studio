from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum


class Gender(str, Enum):
    FEMALE = "female"
    MALE = "male"


class BackgroundMode(str, Enum):
    WHITE = "white"
    KEEP_ORIGINAL = "keep_original"


class ModelTier(str, Enum):
    PRO = "gemini-3-pro-image-preview"
    FLASH = "gemini-2.5-flash-image"


class GenerateRequest(BaseModel):
    gender: Gender
    background_mode: BackgroundMode
    selected_poses: List[str] = Field(..., min_items=1, max_items=3)
    selected_model: ModelTier = ModelTier.PRO

    class Config:
        json_schema_extra = {
            "example": {
                "gender": "female",
                "background_mode": "white",
                "selected_poses": ["F1", "F2"],
                "selected_model": "gemini-3-pro-image-preview"
            }
        }


class GenerateResponse(BaseModel):
    session_id: str
    outputs: List[str]  # 生成的图片 URL 列表
    parameters: Dict
    timestamp: int


class HistoryItem(BaseModel):
    id: str
    timestamp: int
    gender: Gender
    background_mode: BackgroundMode
    pose_ids: List[str]
    model: ModelTier
    output_count: int
    thumbnail: Optional[str] = None


class HistoryListResponse(BaseModel):
    total: int
    items: List[HistoryItem]


class SessionDetail(BaseModel):
    id: str
    timestamp: int
    inputs: Dict
    parameters: Dict
    outputs: List[str]


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
