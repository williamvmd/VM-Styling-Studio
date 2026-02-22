from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session as DBSession
from typing import List
import os

from app.models.schemas import HistoryListResponse, HistoryItem, SessionDetail
from app.models.database import Session as SessionModel, get_db
from app.config import settings

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/history", response_model=HistoryListResponse)
async def get_history(
    skip: int = 0,
    limit: int = 50,
    db: DBSession = Depends(get_db),
):
    """获取历史记录列表"""
    try:
        # 查询总数
        total = db.query(SessionModel).count()

        # 查询记录
        sessions = (
            db.query(SessionModel)
            .order_by(SessionModel.timestamp.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        # 转换为响应格式
        items = [
            HistoryItem(
                id=session.id,
                timestamp=session.timestamp,
                gender=session.gender,
                background_mode=session.background_mode,
                pose_ids=session.pose_ids,
                model=session.model,
                output_count=len(session.outputs),
                thumbnail=session.thumbnail,
            )
            for session in sessions
        ]

        return HistoryListResponse(total=total, items=items)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{session_id}", response_model=SessionDetail)
async def get_session_detail(
    session_id: str,
    db: DBSession = Depends(get_db),
):
    """获取特定会话的详细信息"""
    try:
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        return SessionDetail(
            id=session.id,
            timestamp=session.timestamp,
            inputs=session.inputs,
            parameters={
                "gender": session.gender,
                "background_mode": session.background_mode,
                "pose_ids": session.pose_ids,
                "model": session.model,
            },
            outputs=session.outputs,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/{session_id}")
async def delete_session(
    session_id: str,
    db: DBSession = Depends(get_db),
):
    """删除特定会话"""
    try:
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # 删除生成的图片文件
        for output_url in session.outputs:
            filepath = os.path.join(settings.output_dir, os.path.basename(output_url))
            if os.path.exists(filepath):
                os.remove(filepath)

        # 删除缩略图
        if session.thumbnail:
            thumb_path = os.path.join(
                settings.output_dir, os.path.basename(session.thumbnail)
            )
            if os.path.exists(thumb_path):
                os.remove(thumb_path)

        # 从数据库删除
        db.delete(session)
        db.commit()

        return {"message": "Session deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history")
async def clear_all_history(
    db: DBSession = Depends(get_db),
):
    """清空所有历史记录"""
    try:
        # 获取所有会话
        sessions = db.query(SessionModel).all()

        # 删除所有生成的文件
        for session in sessions:
            for output_url in session.outputs:
                filepath = os.path.join(
                    settings.output_dir, os.path.basename(output_url)
                )
                if os.path.exists(filepath):
                    os.remove(filepath)

            if session.thumbnail:
                thumb_path = os.path.join(
                    settings.output_dir, os.path.basename(session.thumbnail)
                )
                if os.path.exists(thumb_path):
                    os.remove(thumb_path)

        # 删除所有记录
        db.query(SessionModel).delete()
        db.commit()

        return {"message": "All history cleared successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
