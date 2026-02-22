
import { AppState, Pose } from "../types";
import { CORE_PROMPT_TEMPLATE, NEGATIVE_PROMPT } from "../constants";

// Helper to strip the prefix for API usage
const cleanBase64 = (b64: string) => b64.split(',')[1] || b64;

export const generateFashionImage = async (
  state: AppState,
  pose: Pose,
  apiKey: string
): Promise<string> => {
  const customBaseUrl = "http://zx2.52youxi.cc:3000";
  // The SDK would usually call /v1beta/models/{model}:generateContent
  // Depending on how your proxy is setup, either /api represents the root or you need the full path.
  // Assuming the proxy is a direct passthrough of Google's API path:
  const url = `${customBaseUrl}/v1beta/models/${state.selectedModel}:generateContent?key=${apiKey}`;

  // Interpolate Prompt
  const prompt = CORE_PROMPT_TEMPLATE
    .replace('{{background_mode}}', state.backgroundMode)
    .replace('{{pose_id}}', pose.id)
    .replace('{{pose_description}}', pose.description);

  const finalPrompt = `${prompt}\n${NEGATIVE_PROMPT}`;

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
    const fetchResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 1.0,
          aspectRatio: "9:16",
        },
      }),
    });

    if (!fetchResponse.ok) {
      const errData = await fetchResponse.json().catch(() => null);
      throw new Error(`API Error ${fetchResponse.status}: ${JSON.stringify(errData)}`);
    }

    const result = await fetchResponse.json();

    // Handle Response - extract image
    for (const candidate of result.candidates || []) {
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("No image data found in response.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
