import { Pose } from './types';

export const FEMALE_POSES: Pose[] = [
  { id: 'F1', title: 'Triangle Stand', description: 'Classic base: weight on one leg (back/outer), other leg relaxed slightly bent, hip slightly pushed, shoulder relaxed, one hand naturally down.' },
  { id: 'F2', title: 'Elegant Cross Leg', description: 'One leg lightly placed in front of the other, body front or slightly sideways, elegant and steady, balanced posture.' },
  { id: 'F3', title: 'One Hand Pocket', description: 'Weight on one leg, only one hand in pocket for fashion look, other hand naturally down with relaxed wrist.' },
  { id: 'F4', title: 'Ankle Cross', description: 'French relaxed style: Front leg crosses lightly in front of back leg, toe touching ground, knee not locked, slight cross, one hand on waist or in pocket.' },
  { id: 'F5', title: 'Natural Side Stand', description: 'Slightly sideways, legs relaxed, one bent one straight, natural and elegant.' },
  { id: 'F6', title: 'Hand on Hip', description: 'Body slightly side, confident and powerful, relaxed posture, one hand on hip one down.' },
  { id: 'F7', title: 'Arms Crossed', description: 'Upright, focused gaze, calm and noble.' },
  { id: 'F8', title: 'Soft S-Curve', description: 'S-curve soft, highlighting drape and silhouette.' },
  { id: 'F9', title: 'Runway Stop', description: 'Body 3/4 angle, upper body straight with slight S-curve, head up, chin in, looking forward; right hand on waist, left arm down, legs crossed, back leg weight bearing, front leg crossed forward pointing toe.' },
];

export const MALE_POSES: Pose[] = [
  { id: 'M1', title: 'Front Relaxed', description: 'Full body front, body slightly turned, weight on one leg, other leg relaxed slightly forward; one hand in pocket, other down.' },
  { id: 'M2', title: 'Minimal Upright', description: 'Front upright, shoulders relaxed, arms down, back straight looking at camera. Feet slightly offset, clean minimalist.' },
  { id: 'M3', title: 'Casual Pocket', description: 'Front casual, weight slightly to side, both hands in pockets. Feet natural split step, head slightly tilted, cool expression.' },
  { id: 'M4', title: 'Lazy Stance', description: 'Front lazy, hands in pockets, shoulders relaxed. Weight to one side, feet natural offset, head tilted, cold expression.' },
  { id: 'M5', title: 'Clean Straight', description: 'Front natural upright, shoulders relaxed, arms down, eyes controlled. Feet slightly apart and offset, clean and sharp.' },
  { id: 'M6', title: 'Runway Walk', description: 'Runway straight line, core tight, chest up, shoulders relaxed, gaze forward; arms slight swing. Feet crossing in line, hip stable.' },
];

export const CORE_PROMPT_TEMPLATE = `
You are a high-end fashion editorial image generator for VM STYLING STUDIO.

GOAL
Create a full-body standing fashion photo of ONE consistent model identity, following the selected pose ID and styling reference.

HARD VISION LOCKS (MUST FOLLOW OR FAIL):
1) Identity: 不要随意改动上传人物的相貌！The face identity MUST match the provided face reference exactly. Do not change facial structure, age, ethnicity, or expression style.
2) Garment Color & Fit (CRITICAL): 服装色彩真实还原，无任何偏色，服装版型精准呈现，展现真实的质感与细节。不要改动上传图片中服装的设计细节和颜色！Clothing items MUST exactly match the uploaded garment images (top, bottom, shoes, sunglasses) in color, design, logos, patterns, stitching, silhouette, and fit.
3) Accessories: STRICTLY use ONLY the provided accessory images. If a specific accessory category is NOT provided, the subject MUST be bare of that item. Do not add unrequested items to "complete the look."
4) Body Spec: 8.5-head proportion, supermodel physique, idealized long legs with smooth clean lines, elegant posture, fashion-forward.
5) Clean Output: NO text, NO watermark, NO countdown overlay, NO UI elements embedded in the image.

PHOTOGRAPHY & COMPOSITION QUALITY:
- Full-body, standing pose, head-to-toe visible, centered or slightly off-center editorial framing.
- Resolution & Details: 超清细节 (hyper-detailed), 高清 2K 分辨率 (High-res 2K).
- Style & Mood: 采用专业时尚摄影风格，杂志封面质感，展现出国际一线时尚大片 (professional fashion photography, magazine cover quality, international blockbuster level).
- Skin & Texture: 皮肤真实质感 (realistic skin texture), no plastic skin.
- Lighting: 光线柔和且均匀，电影级光影 (soft even lighting, cinematic lighting), refined shadows. 
- Appearance: Ultra high resolution, 2K output, 9:16 aspect ratio, luxury, clean, no blur, no noise.

- Background mode: {{background_mode}}
  - if white: pure white seamless studio background, even soft lighting, minimal shadows.
  - if keep_original: preserve the styling reference background as much as possible (no messy artifacts).

POSE ENFORCEMENT
Current Request Pose: {{pose_id}} - {{pose_description}}.
The output MUST strictly follow this pose description.

INPUTS PROVIDED
I will provide the images labeled by their category below.
`;

export const NEGATIVE_PROMPT = `
Avoid: low quality, blurry, noisy, oversaturated, neon colors, cheap gradients, messy shadows, distorted anatomy, extra fingers, warped face, changed identity, changed garment design, changed garment color (CRITICAL), missing clothing items, added random accessories, unrequested jewelry, bags, hats, belts, text, watermark, logo overlay, UI overlay, countdown, stickers, heavy filters, plastic skin, cartoon/anime style, CGI look, background clutter.
`;
