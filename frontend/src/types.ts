export type Gender = 'female' | 'male';
export type BackgroundMode = 'white' | 'keep_original';
export type ModelTier = 'gemini-3-pro-image-preview' | 'gemini-3.1-flash-image-preview';
export type AspectRatio = '9:16' | '16:9' | '1:1' | '3:4' | '4:3';

export interface Pose {
  id: string;
  title: string;
  description: string;
}

export interface UploadedImage {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export interface GenerationInputs {
  stylingRef: UploadedImage | null;
  faceRef: UploadedImage | null;
  clothes: {
    top: UploadedImage | null;
    bottom: UploadedImage | null;
    shoes: UploadedImage | null;
    sunglasses: UploadedImage | null;
  };
  accessories: {
    necklace: UploadedImage | null;
    earrings: UploadedImage | null;
    jewelry: UploadedImage | null;
    hat: UploadedImage | null;
    bag: UploadedImage | null;
    belt: UploadedImage | null;
  };
}

export interface Session {
  id: string;
  timestamp: number;
  inputs: GenerationInputs;
  parameters: {
    poseIds: string[];
    gender: Gender;
    backgroundMode: BackgroundMode;
    model: ModelTier;
    aspectRatio: AspectRatio;
    customPrompt: string;
  };
  outputs: string[]; // URLs/Base64 of generated images
}

export interface AppState {
  gender: Gender;
  backgroundMode: BackgroundMode;
  selectedPoses: string[];
  selectedModel: ModelTier;
  aspectRatio: AspectRatio;
  inputs: GenerationInputs;
  isGenerating: boolean;
  progressSeconds: number;
  history: Session[];
  currentSessionId: string | null;
  error: string | null;
  customPrompt: string;
  apiKey: string;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
