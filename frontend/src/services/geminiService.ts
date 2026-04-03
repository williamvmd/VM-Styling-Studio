
import { AppState, Pose } from "../types";
import { CORE_PROMPT_TEMPLATE, NEGATIVE_PROMPT } from "../constants";

// Helper to strip the prefix for API usage
const cleanBase64 = (b64: string) => b64.split(',')[1] || b64;
const RELAY_PROXY_BASE_URL = (
  import.meta.env.VITE_RELAY_PROXY_BASE_URL || "https://wuaiapi.com"
).replace(/\/$/, "");

// NOTE: 图片压缩 — 无条件将所有输入图片压缩至 1024px 长边 + JPEG 0.80 质量
// 优化目的：减少请求体大小，降低 API 传输时间，提升生成速度（从 ~130s 缩短到 ~60-80s）
const compressBase64Image = (b64: string): Promise<string> => {
  return new Promise((resolve) => {
    const raw = cleanBase64(b64);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // NOTE: 长边限制 1024px（原为 1600px），AI 识别参考图无需过高分辨率
      const MAX_SIDE = 1024;
      const scale = Math.min(MAX_SIDE / img.width, MAX_SIDE / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // NOTE: JPEG 0.80 质量（原为 0.85），肉眼几乎无差距，体积缩减 20%
      const compressed = canvas.toDataURL('image/jpeg', 0.80);
      resolve(cleanBase64(compressed));
    };
    img.onerror = () => resolve(raw); // 压缩失败则原样发送
    img.src = b64.startsWith('data:') ? b64 : `data:image/png;base64,${raw}`;
  });
};

const extractImageFromResult = (result: any): string | null => {
  for (const candidate of result.candidates || []) {
    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  }

  return null;
};

const shouldFallbackToPro = (model: string, status: number, errData: any): boolean => {
  if (model !== "gemini-3.1-flash-image-preview" || status !== 503) {
    return false;
  }

  const errorText = JSON.stringify(errData || {});
  return (
    errorText.includes('"code":"model_not_found"') ||
    errorText.includes("无可用渠道") ||
    errorText.includes("No available channel")
  );
};

export const generateFashionImage = async (
  state: AppState,
  pose: Pose,
  apiKey: string
): Promise<string> => {
  const baseUrl = RELAY_PROXY_BASE_URL;
  const modelCandidates =
    state.selectedModel === "gemini-3.1-flash-image-preview"
      ? ["gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview"]
      : [state.selectedModel];

  // Interpolate Prompt
  const prompt = CORE_PROMPT_TEMPLATE
    .replace('{{background_mode}}', state.backgroundMode)
    .replace('{{pose_id}}', pose.id)
    .replace('{{pose_description}}', pose.description);

  let finalPrompt = `${prompt}\n${NEGATIVE_PROMPT}`;

  if (state.customPrompt && state.customPrompt.trim()) {
    finalPrompt += `\n\nUSER ADDITIONAL STYLING REQUEST:\n${state.customPrompt.trim()}`;
  }

  // NOTE: 并行压缩所有图片（原为串行），最多 12 张图同时处理，大幅缩短预处理时间
  type ImageSlot = { label: string; img: { base64: string; mimeType: string } | null };
  const imageSlots: ImageSlot[] = [
    { label: 'Styling Reference', img: state.inputs.stylingRef },
    { label: 'Face Reference',    img: state.inputs.faceRef },
    { label: 'Garment Top',       img: state.inputs.clothes.top },
    { label: 'Garment Bottom',    img: state.inputs.clothes.bottom },
    { label: 'Shoes',             img: state.inputs.clothes.shoes },
    { label: 'Sunglasses',        img: state.inputs.clothes.sunglasses },
    { label: 'Necklace',          img: state.inputs.accessories.necklace },
    { label: 'Earrings',          img: state.inputs.accessories.earrings },
    { label: 'Jewelry',           img: state.inputs.accessories.jewelry },
    { label: 'Hat/Scarf',         img: state.inputs.accessories.hat },
    { label: 'Bag',               img: state.inputs.accessories.bag },
    { label: 'Belt',              img: state.inputs.accessories.belt },
  ];

  // 并行压缩所有有效图片
  const compressedSlots = await Promise.all(
    imageSlots.map(async ({ label, img }) => {
      if (!img) return null;
      const compressedData = await compressBase64Image(img.base64);
      return { label, compressedData };
    })
  );

  // 按原始顺序组装 parts（保证顺序稳定）
  const parts: any[] = [{ text: finalPrompt }];
  for (const slot of compressedSlots) {
    if (!slot) continue;
    parts.push({ text: `\n[Reference Image: ${slot.label}]` });
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg', // 压缩后统一用 jpeg
        data: slot.compressedData,
      },
    });
  }

  try {
    for (const requestModel of modelCandidates) {
      const url = `${baseUrl}/v1beta/models/${requestModel}:generateContent`;

      // NOTE: 180 秒超时（3分钟），多图场景下 AI 处理时间较长，60秒容易触发 "signal is aborted without reason"
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180_000);

      const fetchResponse = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            // NOTE: 必须同时包含 "Text" 和 "Image"，只传 "IMAGE" 在部分渠道会触发 Failed to fetch
            responseModalities: ["Text", "Image"],
            temperature: 1.0,
            aspectRatio: state.aspectRatio,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!fetchResponse.ok) {
        const errData = await fetchResponse.json().catch(() => null);
        if (shouldFallbackToPro(requestModel, fetchResponse.status, errData)) {
          continue;
        }

        throw new Error(`API Error ${fetchResponse.status}: ${JSON.stringify(errData)}`);
      }

      const result = await fetchResponse.json();
      const imageData = extractImageFromResult(result);
      if (imageData) {
        return imageData;
      }

      throw new Error("No image data found in response.");
    }

    throw new Error("API Error 503: Flash image channel unavailable and fallback also failed.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
