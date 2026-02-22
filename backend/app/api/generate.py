from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession
from typing import List, Optional
import time
import uuid
import json
import asyncio

from app.models.schemas import GenerateResponse, ErrorResponse
from app.models.database import Session as SessionModel, get_db
from app.services.gemini_service import gemini_service
from app.services.image_service import image_service

router = APIRouter(prefix="/api", tags=["generate"])


@router.post("/generate", response_model=GenerateResponse)
async def generate_fashion_images(
    # 必需的参考图片
    styling_ref: UploadFile = File(..., description="造型参考图"),
    face_ref: UploadFile = File(..., description="面部参考图"),
    # 参数
    gender: str = Form(..., description="性别: female 或 male"),
    background_mode: str = Form(..., description="背景模式: white 或 keep_original"),
    selected_poses: str = Form(..., description="选中的姿势 ID 列表，JSON 格式"),
    selected_model: str = Form(
        "gemini-3-pro-image-preview", description="模型: gemini-3-pro-image-preview 或 gemini-2.5-flash-image"
    ),
    # 可选的服装图片
    top: Optional[UploadFile] = File(None),
    bottom: Optional[UploadFile] = File(None),
    shoes: Optional[UploadFile] = File(None),
    sunglasses: Optional[UploadFile] = File(None),
    # 可选的配饰图片
    necklace: Optional[UploadFile] = File(None),
    earrings: Optional[UploadFile] = File(None),
    jewelry: Optional[UploadFile] = File(None),
    hat: Optional[UploadFile] = File(None),
    bag: Optional[UploadFile] = File(None),
    belt: Optional[UploadFile] = File(None),
    # 数据库会话
    db: DBSession = Depends(get_db),
):
    """
    生成时尚造型图片

    接收用户上传的参考图片和参数，调用 Gemini API 生成时尚造型图片
    """
    try:
        # 解析姿势列表
        pose_ids = json.loads(selected_poses)
        if not pose_ids or len(pose_ids) > 3:
            raise HTTPException(status_code=400, detail="Must select 1-3 poses")

        # 生成会话 ID
        session_id = str(uuid.uuid4())
        timestamp = int(time.time() * 1000)

        # 保存上传的文件
        uploaded_files = []

        # 保存必需的参考图
        styling_ref_path = await image_service.save_upload(
            await styling_ref.read(), styling_ref.filename
        )
        uploaded_files.append(styling_ref_path)

        face_ref_path = await image_service.save_upload(
            await face_ref.read(), face_ref.filename
        )
        uploaded_files.append(face_ref_path)

        # 加载参考图
        styling_img = await image_service.load_image(styling_ref_path)
        face_img = await image_service.load_image(face_ref_path)

        # 处理服装图片
        clothes = {}
        for name, file in [
            ("top", top),
            ("bottom", bottom),
            ("shoes", shoes),
            ("sunglasses", sunglasses),
        ]:
            if file:
                path = await image_service.save_upload(await file.read(), file.filename)
                uploaded_files.append(path)
                clothes[name] = await image_service.load_image(path)

        # 处理配饰图片
        accessories = {}
        for name, file in [
            ("necklace", necklace),
            ("earrings", earrings),
            ("jewelry", jewelry),
            ("hat", hat),
            ("bag", bag),
            ("belt", belt),
        ]:
            if file:
                path = await image_service.save_upload(await file.read(), file.filename)
                uploaded_files.append(path)
                accessories[name] = await image_service.load_image(path)

        # 调用 Gemini 生成图片
        generated_images = await gemini_service.generate_batch(
            styling_ref=styling_img,
            face_ref=face_img,
            pose_ids=pose_ids,
            gender=gender,
            background_mode=background_mode,
            clothes=clothes if clothes else None,
            accessories=accessories if accessories else None,
            model=selected_model,
        )

        # 保存生成的图片
        output_urls = []
        for idx, img_bytes in enumerate(generated_images):
            url = await image_service.save_generated_image(img_bytes, session_id, idx)
            output_urls.append(url)

        # 创建缩略图
        thumbnail_url = None
        if generated_images:
            thumbnail_bytes = await image_service.create_thumbnail(generated_images[0])
            thumbnail_url = await image_service.save_generated_image(
                thumbnail_bytes, session_id, "thumb"
            )

        # 保存到数据库
        session_record = SessionModel(
            id=session_id,
            timestamp=timestamp,
            gender=gender,
            background_mode=background_mode,
            pose_ids=pose_ids,
            model=selected_model,
            inputs={
                "styling_ref": styling_ref.filename,
                "face_ref": face_ref.filename,
                "clothes": {k: True for k in clothes.keys()},
                "accessories": {k: True for k in accessories.keys()},
            },
            outputs=output_urls,
            thumbnail=thumbnail_url,
        )
        db.add(session_record)
        db.commit()

        # 清理上传的临时文件
        await image_service.cleanup_uploads(uploaded_files)

        return GenerateResponse(
            session_id=session_id,
            outputs=output_urls,
            parameters={
                "gender": gender,
                "background_mode": background_mode,
                "pose_ids": pose_ids,
                "model": selected_model,
            },
            timestamp=timestamp,
        )

    except Exception as e:
        # 清理上传的文件
        if uploaded_files:
            await image_service.cleanup_uploads(uploaded_files)

        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/stream")
async def generate_fashion_images_stream(
    # 必需的参考图片
    styling_ref: UploadFile = File(..., description="造型参考图"),
    face_ref: UploadFile = File(..., description="面部参考图"),
    # 参数
    gender: str = Form(..., description="性别: female 或 male"),
    background_mode: str = Form(..., description="背景模式: white 或 keep_original"),
    selected_poses: str = Form(..., description="选中的姿势 ID 列表，JSON 格式"),
    selected_model: str = Form(
        "gemini-3-pro-image-preview", description="模型: gemini-3-pro-image-preview 或 gemini-2.5-flash-image"
    ),
    # 可选的服装图片
    top: Optional[UploadFile] = File(None),
    bottom: Optional[UploadFile] = File(None),
    shoes: Optional[UploadFile] = File(None),
    sunglasses: Optional[UploadFile] = File(None),
    # 可选的配饰图片
    necklace: Optional[UploadFile] = File(None),
    earrings: Optional[UploadFile] = File(None),
    jewelry: Optional[UploadFile] = File(None),
    hat: Optional[UploadFile] = File(None),
    bag: Optional[UploadFile] = File(None),
    belt: Optional[UploadFile] = File(None),
    # 数据库会话
    db: DBSession = Depends(get_db),
):
    """
    生成时尚造型图片（流式响应，支持进度显示）

    返回 Server-Sent Events 流，实时显示生成进度
    """

    async def event_generator():
        uploaded_files = []

        try:
            # 解析姿势列表
            pose_ids = json.loads(selected_poses)
            if not pose_ids or len(pose_ids) > 3:
                yield f"data: {json.dumps({'error': 'Must select 1-3 poses'})}\n\n"
                return

            # 生成会话 ID
            session_id = str(uuid.uuid4())
            timestamp = int(time.time() * 1000)

            yield f"data: {json.dumps({'status': 'uploading', 'message': '正在上传图片...'})}\n\n"
            await asyncio.sleep(0.1)

            # 读取并保存上传的文件
            styling_ref_bytes = await styling_ref.read()
            styling_ref_path = await image_service.save_upload(
                styling_ref_bytes, styling_ref.filename
            )
            uploaded_files.append(styling_ref_path)

            face_ref_bytes = await face_ref.read()
            face_ref_path = await image_service.save_upload(
                face_ref_bytes, face_ref.filename
            )
            uploaded_files.append(face_ref_path)

            # 加载参考图
            styling_img = await image_service.load_image(styling_ref_path)
            face_img = await image_service.load_image(face_ref_path)

            # 处理服装图片
            clothes = {}
            for name, file in [
                ("top", top),
                ("bottom", bottom),
                ("shoes", shoes),
                ("sunglasses", sunglasses),
            ]:
                if file:
                    file_bytes = await file.read()
                    path = await image_service.save_upload(file_bytes, file.filename)
                    uploaded_files.append(path)
                    clothes[name] = await image_service.load_image(path)

            # 处理配饰图片
            accessories = {}
            for name, file in [
                ("necklace", necklace),
                ("earrings", earrings),
                ("jewelry", jewelry),
                ("hat", hat),
                ("bag", bag),
                ("belt", belt),
            ]:
                if file:
                    file_bytes = await file.read()
                    path = await image_service.save_upload(file_bytes, file.filename)
                    uploaded_files.append(path)
                    accessories[name] = await image_service.load_image(path)

            yield f"data: {json.dumps({'status': 'processing', 'message': '图片上传完成，开始生成...'})}\n\n"
            await asyncio.sleep(0.1)

            # 生成图片（带进度）
            output_urls = []
            total_poses = len(pose_ids)

            for idx, pose_id in enumerate(pose_ids):
                # 估算每张图片生成时间约30-60秒
                estimated_time = 45

                yield f"data: {json.dumps({'status': 'generating', 'message': f'正在生成第 {idx + 1}/{total_poses} 张图片 (姿势: {pose_id})', 'progress': idx / total_poses, 'current': idx + 1, 'total': total_poses})}\n\n"

                # 倒计时显示
                for remaining in range(estimated_time, 0, -5):
                    yield f"data: {json.dumps({'status': 'generating', 'message': f'正在生成第 {idx + 1}/{total_poses} 张图片 (姿势: {pose_id})', 'progress': idx / total_poses, 'current': idx + 1, 'total': total_poses, 'remaining_seconds': remaining})}\n\n"
                    await asyncio.sleep(5)

                # 实际生成
                img_bytes = await gemini_service.generate_fashion_image(
                    styling_ref=styling_img,
                    face_ref=face_img,
                    pose_id=pose_id,
                    gender=gender,
                    background_mode=background_mode,
                    clothes=clothes if clothes else None,
                    accessories=accessories if accessories else None,
                    model=selected_model,
                )

                # 保存生成的图片
                url = await image_service.save_generated_image(img_bytes, session_id, idx)
                output_urls.append(url)

                yield f"data: {json.dumps({'status': 'generating', 'message': f'第 {idx + 1}/{total_poses} 张图片生成完成', 'progress': (idx + 1) / total_poses, 'current': idx + 1, 'total': total_poses, 'completed_image': url})}\n\n"
                await asyncio.sleep(0.1)

            # 创建缩略图
            thumbnail_url = None
            if output_urls:
                yield f"data: {json.dumps({'status': 'finalizing', 'message': '正在创建缩略图...'})}\n\n"

                # 读取第一张生成的图片
                first_img_bytes = await image_service.read_generated_image(output_urls[0])
                thumbnail_bytes = await image_service.create_thumbnail(first_img_bytes)
                thumbnail_url = await image_service.save_generated_image(
                    thumbnail_bytes, session_id, "thumb"
                )

            # 保存到数据库
            session_record = SessionModel(
                id=session_id,
                timestamp=timestamp,
                gender=gender,
                background_mode=background_mode,
                pose_ids=pose_ids,
                model=selected_model,
                inputs={
                    "styling_ref": styling_ref.filename,
                    "face_ref": face_ref.filename,
                    "clothes": {k: True for k in clothes.keys()},
                    "accessories": {k: True for k in accessories.keys()},
                },
                outputs=output_urls,
                thumbnail=thumbnail_url,
            )
            db.add(session_record)
            db.commit()

            # 清理上传的临时文件
            await image_service.cleanup_uploads(uploaded_files)

            # 完成
            yield f"data: {json.dumps({'status': 'completed', 'message': '生成完成！', 'session_id': session_id, 'outputs': output_urls, 'thumbnail': thumbnail_url, 'timestamp': timestamp})}\n\n"

        except Exception as e:
            # 清理上传的文件
            if uploaded_files:
                await image_service.cleanup_uploads(uploaded_files)

            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

