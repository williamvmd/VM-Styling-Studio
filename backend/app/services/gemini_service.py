from google import genai
from google.genai import types
from PIL import Image
from typing import List, Dict, Optional
from app.config import settings
import base64
import io


class GeminiService:
    def __init__(self):
        self.client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options={'base_url': settings.google_gemini_base_url}
        )

    async def generate_fashion_image(
        self,
        styling_ref: Image.Image,
        face_ref: Image.Image,
        pose_id: str,
        gender: str,
        background_mode: str,
        clothes: Optional[Dict[str, Image.Image]] = None,
        accessories: Optional[Dict[str, Image.Image]] = None,
        model: str = None,
    ) -> bytes:
        """
        生成时尚造型图片

        Args:
            styling_ref: 造型参考图
            face_ref: 面部参考图
            pose_id: 姿势 ID
            gender: 性别
            background_mode: 背景模式
            clothes: 服装图片字典
            accessories: 配饰图片字典
            model: 模型名称

        Returns:
            生成的图片字节数据
        """
        model_name = model or settings.gemini_model

        # 构建提示词
        prompt = self._build_prompt(
            pose_id=pose_id,
            gender=gender,
            background_mode=background_mode,
            has_clothes=bool(clothes),
            has_accessories=bool(accessories),
        )

        # 调用 Gemini API
        try:
            # 构建 multimodal contents - 文本 + 图片标注 + 图片数据
            contents = [prompt]

            # 添加 Styling Reference
            contents.append("\n[Reference Image: Styling Reference]")
            contents.append(styling_ref)

            # 添加 Face Reference
            contents.append("\n[Reference Image: Face Reference]")
            contents.append(face_ref)

            # 添加服装图片
            if clothes:
                clothing_labels = {
                    'top': 'Garment Top',
                    'bottom': 'Garment Bottom',
                    'shoes': 'Shoes',
                    'sunglasses': 'Sunglasses'
                }
                for key, img in clothes.items():
                    if img:
                        label = clothing_labels.get(key, key.title())
                        contents.append(f"\n[Reference Image: {label}]")
                        contents.append(img)

            # 添加配饰图片
            if accessories:
                accessory_labels = {
                    'necklace': 'Necklace',
                    'earrings': 'Earrings',
                    'jewelry': 'Jewelry',
                    'hat': 'Hat/Scarf',
                    'bag': 'Bag',
                    'belt': 'Belt'
                }
                for key, img in accessories.items():
                    if img:
                        label = accessory_labels.get(key, key.title())
                        contents.append(f"\n[Reference Image: {label}]")
                        contents.append(img)

            # 使用 generate_content API with IMAGE response modality
            response = self.client.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    temperature=1.0,
                ),
            )

            # 提取生成的图片
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, "inline_data") and part.inline_data:
                            # inline_data.data 是 base64 编码的字符串，需要解码
                            if isinstance(part.inline_data.data, str):
                                return base64.b64decode(part.inline_data.data)
                            else:
                                return part.inline_data.data
                        elif hasattr(part, "image") and part.image:
                            # 如果是 PIL Image，转换为字节
                            img_bytes = io.BytesIO()
                            part.image.save(img_bytes, format='PNG')
                            return img_bytes.getvalue()

            raise Exception("No image generated in response")

        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")

    def _build_prompt(
        self,
        pose_id: str,
        gender: str,
        background_mode: str,
        has_clothes: bool,
        has_accessories: bool,
    ) -> str:
        """构建生成提示词"""

        # 姿势库描述
        pose_descriptions = {
            # Female poses
            "F1": "Triangle Stand: Classic base: weight on one leg (back/outer), other leg relaxed slightly bent, hip slightly pushed, shoulder relaxed, one hand naturally down.",
            "F2": "Elegant Cross Leg: One leg lightly placed in front of the other, body front or slightly sideways, elegant and steady, balanced posture.",
            "F3": "One Hand Pocket: Weight on one leg, only one hand in pocket for fashion look, other hand naturally down with relaxed wrist.",
            "F4": "Ankle Cross: French relaxed style: Front leg crosses lightly in front of back leg, toe touching ground, knee not locked, slight cross, one hand on waist or in pocket.",
            "F5": "Natural Side Stand: Slightly sideways, legs relaxed, one bent one straight, natural and elegant.",
            "F6": "Hand on Hip: Body slightly side, confident and powerful, relaxed posture, one hand on hip one down.",
            "F7": "Arms Crossed: Upright, focused gaze, calm and noble.",
            "F8": "Soft S-Curve: S-curve soft, highlighting drape and silhouette.",
            "F9": "Runway Stop: Body 3/4 angle, upper body straight with slight S-curve, head up, chin in, looking forward; right hand on waist, left arm down, legs crossed, back leg weight bearing, front leg crossed forward pointing toe.",

            # Male poses
            "M1": "Front Relaxed: Full body front, body slightly turned, weight on one leg, other leg relaxed slightly forward; one hand in pocket, other down.",
            "M2": "Minimal Upright: Front upright, shoulders relaxed, arms down, back straight looking at camera. Feet slightly offset, clean minimalist.",
            "M3": "Casual Pocket: Front casual, weight slightly to side, both hands in pockets. Feet natural split step, head slightly tilted, cool expression.",
            "M4": "Lazy Stance: Front lazy, hands in pockets, shoulders relaxed. Weight to one side, feet natural offset, head tilted, cold expression.",
            "M5": "Clean Straight: Front natural upright, shoulders relaxed, arms down, eyes controlled. Feet slightly apart and offset, clean and sharp.",
            "M6": "Runway Walk: Runway straight line, core tight, chest up, shoulders relaxed, gaze forward; arms slight swing. Feet crossing in line, hip stable.",
        }

        gender_text = "female" if gender == "female" else "male"
        background_text = (
            "pure white seamless studio background, even soft lighting, minimal shadows"
            if background_mode == "white"
            else "preserve the styling reference background as much as possible (no messy artifacts)"
        )

        # 获取姿势描述
        pose_description = pose_descriptions.get(pose_id, f"pose {pose_id}")

        # 核心 Prompt 模板（与 React 版本一致）
        prompt = f"""You are a high-end fashion editorial image generator for VM STYLING STUDIO.

GOAL
Create a full-body standing fashion photo (9:16) of ONE consistent model identity, following the selected pose ID and styling reference.

HARD LOCKS (must follow)
1) Identity lock: The face identity MUST match the provided face reference exactly. Do not change facial structure, age, ethnicity, skin tone, or expression style beyond natural micro-variation.
2) Garment fidelity lock: Clothing items MUST exactly match the uploaded garment images (top, bottom, shoes, sunglasses) in design details, logos, patterns, stitching, silhouette, and material behavior. Do not redesign.
3) Color fidelity lock: Preserve original garment colors accurately; no hue shift, no filter that alters color.
4) Accessory fidelity lock: STRICTLY use ONLY the provided accessory images. If a specific accessory category (necklace, earrings, jewelry/watch, hat/scarf, bag, belt) is NOT provided as an input image, YOU MUST NOT GENERATE IT. The subject must be bare of any accessories that are not explicitly uploaded. Do not hallucinate or add items 'to complete the look'.
5) Body spec lock: 8.5-head proportion, supermodel physique, idealized long legs with smooth clean lines; elegant posture; fashion-forward.
6) Output must be clean: NO text, NO watermark, NO countdown overlay, NO UI elements embedded in the image.

COMPOSITION
- Full-body, standing pose, head-to-toe visible, centered or slightly off-center editorial framing.
- Background mode: {background_text}
- Camera: professional fashion photography, magazine cover quality, sharp details, realistic skin texture (not plastic), soft even key light + subtle cinematic depth.
- Styling: follow the styling reference image for overall vibe, proportions, mood, and editorial energy.

POSE ENFORCEMENT
Current Request Pose: {pose_id} - {pose_description}
The output MUST strictly follow this pose description.

QUALITY
Ultra high resolution, 4K look, clean, luxury, no blur, no noise, no over-sharpening, refined shadows, accurate fabric texture.

NEGATIVE PROMPT (Avoid)
Low quality, blurry, noisy, oversaturated, neon colors, cheap gradients, messy shadows, distorted anatomy, extra fingers, warped face, changed identity, changed garment design, changed garment color, missing clothing items, added random accessories, unrequested jewelry, unrequested bags, unrequested hats, unrequested belts, text, watermark, logo overlay, UI overlay, countdown, stickers, heavy filters, plastic skin, cartoon/anime style, CGI look, background clutter, inconsistent iconography.

INPUTS PROVIDED
I will provide the images labeled by their category below.
"""

        return prompt

    async def generate_batch(
        self,
        styling_ref: Image.Image,
        face_ref: Image.Image,
        pose_ids: List[str],
        gender: str,
        background_mode: str,
        clothes: Optional[Dict[str, Image.Image]] = None,
        accessories: Optional[Dict[str, Image.Image]] = None,
        model: str = None,
    ) -> List[bytes]:
        """批量生成多个姿势的图片"""

        results = []
        for pose_id in pose_ids:
            try:
                image_bytes = await self.generate_fashion_image(
                    styling_ref=styling_ref,
                    face_ref=face_ref,
                    pose_id=pose_id,
                    gender=gender,
                    background_mode=background_mode,
                    clothes=clothes,
                    accessories=accessories,
                    model=model,
                )
                results.append(image_bytes)
            except Exception as e:
                print(f"Error generating pose {pose_id}: {str(e)}")
                # 继续生成其他姿势
                continue

        return results


# 单例实例
gemini_service = GeminiService()
