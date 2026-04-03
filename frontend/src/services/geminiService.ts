
import { AppState, Pose } from "../types";
import { CORE_PROMPT_TEMPLATE, NEGATIVE_PROMPT } from "../constants";

// Helper to strip the prefix for API usage
const cleanBase64 = (b64: string) => b64.split(',')[1] || b64;
const RELAY_PROXY_BASE_URL = (
  import.meta.env.VITE_RELAY_PROXY_BASE_URL || "https://wuaiapi.com"
).replace(/\/$/, "");

// NOTE: 图片压缩 — 当 base64 超过 3MB 时自动压缩，防止请求体过大导致 "Failed to fetch"
const compressBase64Image = (b64: string, maxBytes = 3 * 1024 * 1024): Promise<string> => {
  return new Promise((resolve) => {
    const raw = cleanBase64(b64);
    // 已经足够小，无需压缩
    if (raw.length * 0.75 <= maxBytes) {
      resolve(raw);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // 按比例缩小，目标长边 1600px
      const MAX_SIDE = 1600;
      const scale = Math.min(MAX_SIDE / img.width, MAX_SIDE / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // 以 JPEG 0.85 质量压缩
      const compressed = canvas.toDataURL('image/jpeg', 0.85);
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

  // Collect Parts（先异步压缩所有图片，再组装请求体，避免 Failed to fetch）
  const parts: any[] = [{ text: finalPrompt }];

  // Helper to add image parts with labels（自动压缩大图）
  const addPart = async (label: string, img: { base64: string, mimeType: string } | null) => {
    if (img) {
      parts.push({ text: `\n[Reference Image: ${label}]` });
      const compressedData = await compressBase64Image(img.base64);
      // NOTE: 压缩后统一用 jpeg mimeType（除非原图很小未被压缩）
      const finalMime = compressedData === cleanBase64(img.base64) ? img.mimeType : 'image/jpeg';
      parts.push({
        inlineData: {
          mimeType: finalMime,
          data: compressedData,
        },
      });
    }
  };

  // Add Images in order（串行等待所有压缩完成）
  await addPart('Styling Reference', state.inputs.stylingRef);
  await addPart('Face Reference', state.inputs.faceRef);
  await addPart('Garment Top', state.inputs.clothes.top);
  await addPart('Garment Bottom', state.inputs.clothes.bottom);
  await addPart('Shoes', state.inputs.clothes.shoes);
  await addPart('Sunglasses', state.inputs.clothes.sunglasses);
  await addPart('Necklace', state.inputs.accessories.necklace);
  await addPart('Earrings', state.inputs.accessories.earrings);
  await addPart('Jewelry', state.inputs.accessories.jewelry);
  await addPart('Hat/Scarf', state.inputs.accessories.hat);
  await addPart('Bag', state.inputs.accessories.bag);
  await addPart('Belt', state.inputs.accessories.belt);

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
