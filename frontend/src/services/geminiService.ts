
import { AppState, Pose } from "../types";
import { CORE_PROMPT_TEMPLATE, NEGATIVE_PROMPT } from "../constants";

// Helper to strip the prefix for API usage
const cleanBase64 = (b64: string) => b64.split(',')[1] || b64;
const RELAY_PROXY_BASE_URL = (
  import.meta.env.VITE_RELAY_PROXY_BASE_URL || "https://wuaiapi.com"
).replace(/\/$/, "");

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

  // Collect Parts
  const parts: any[] = [{ text: finalPrompt }];

  // Helper to add image parts with labels
  const addPart = (label: string, img: { base64: string, mimeType: string } | null) => {
    if (img) {
      parts.push({ text: `\n[Reference Image: ${label}]` });
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: cleanBase64(img.base64),
        },
      });
    }
  };

  // Add Images in order
  addPart('Styling Reference', state.inputs.stylingRef);
  addPart('Face Reference', state.inputs.faceRef);
  addPart('Garment Top', state.inputs.clothes.top);
  addPart('Garment Bottom', state.inputs.clothes.bottom);
  addPart('Shoes', state.inputs.clothes.shoes);
  addPart('Sunglasses', state.inputs.clothes.sunglasses);
  addPart('Necklace', state.inputs.accessories.necklace);
  addPart('Earrings', state.inputs.accessories.earrings);
  addPart('Jewelry', state.inputs.accessories.jewelry);
  addPart('Hat/Scarf', state.inputs.accessories.hat);
  addPart('Bag', state.inputs.accessories.bag);
  addPart('Belt', state.inputs.accessories.belt);

  try {
    for (const requestModel of modelCandidates) {
      const url = `${baseUrl}/v1beta/models/${requestModel}:generateContent`;
      const fetchResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            temperature: 1.0,
            aspectRatio: state.aspectRatio,
          },
        }),
      });

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
