export type Gender = 'female' | 'male';
export type BackgroundMode = 'white' | 'keep_original';
export type ModelTier = 'gemini-3-pro-image-preview' | 'gemini-2.5-flash-image';

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
  };
  outputs: string[]; // URLs/Base64 of generated images
}

export interface AppState {
  gender: Gender;
  backgroundMode: BackgroundMode;
  selectedPoses: string[];
  selectedModel: ModelTier;
  inputs: GenerationInputs;
  isGenerating: boolean;
  progressSeconds: number;
  history: Session[];
  currentSessionId: string | null;
  error: string | null;
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
