import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Zap, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import UploadSlot from './components/UploadSlot';
import HistoryDrawer from './components/HistoryDrawer';
import { AppState, ModelTier, UploadedImage, Session, Pose } from './types';
import { FEMALE_POSES, MALE_POSES } from './constants';
import { generateFashionImage } from './services/geminiService';

const INITIAL_STATE: AppState = {
  gender: 'female',
  backgroundMode: 'white',
  selectedPoses: ['F1'],
  selectedModel: 'gemini-3-pro-image-preview',
  inputs: {
    stylingRef: null,
    faceRef: null,
    clothes: { top: null, bottom: null, shoes: null, sunglasses: null },
    accessories: { necklace: null, earrings: null, jewelry: null, hat: null, bag: null, belt: null },
  },
  isGenerating: false,
  progressSeconds: 0,
  history: [],
  currentSessionId: null,
  error: null,
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  const availablePoses = useMemo(() =>
    state.gender === 'female' ? FEMALE_POSES : MALE_POSES,
    [state.gender]);

  useEffect(() => {
    const validIds = availablePoses.map(p => p.id);
    const newSelection = state.selectedPoses.filter(id => validIds.includes(id));
    if (newSelection.length === 0) {
      setState(s => ({ ...s, selectedPoses: [availablePoses[0].id] }));
    } else if (newSelection.length !== state.selectedPoses.length) {
      setState(s => ({ ...s, selectedPoses: newSelection }));
    }
  }, [state.gender, availablePoses, state.selectedPoses]);

  const updateInput = (
    category: 'clothes' | 'accessories' | 'root',
    key: string,
    img: UploadedImage | null
  ) => {
    setState(prev => {
      if (category === 'root') {
        return { ...prev, inputs: { ...prev.inputs, [key]: img } };
      }
      return {
        ...prev,
        inputs: {
          ...prev.inputs,
          [category]: { ...prev.inputs[category as 'clothes' | 'accessories'], [key]: img },
        },
      };
    });
  };

  const handlePoseToggle = (id: string) => {
    setState(prev => {
      if (prev.selectedPoses.includes(id)) {
        if (prev.selectedPoses.length === 1) return prev;
        return { ...prev, selectedPoses: prev.selectedPoses.filter(p => p !== id) };
      }
      if (prev.selectedPoses.length >= 3) return prev;
      return { ...prev, selectedPoses: [...prev.selectedPoses, id] };
    });
  };

  const handleGenerate = async () => {
    setState(s => ({ ...s, error: null }));

    // API Key handling
    if (state.selectedModel === 'gemini-3-pro-image-preview' && (window as any).aistudio) {
      try {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
        }
      } catch (err) {
        console.warn("API Key selection dialog error", err);
      }
    }

    // @ts-ignore
    const apiKey = (process.env as any).API_KEY || prompt("Please enter your Google AI API Key:");
    if (!apiKey) {
      setState(s => ({ ...s, error: 'API Key missing. Please provide your API key.' }));
      return;
    }

    if (!state.inputs.stylingRef || !state.inputs.faceRef) {
      setState(s => ({ ...s, error: 'Please upload Styling Reference and Face Reference.' }));
      return;
    }

    setState(s => ({ ...s, isGenerating: true, progressSeconds: 0, error: null }));
    setGeneratedImages([]);

    const timerInterval = setInterval(() => {
      setState(s => ({ ...s, progressSeconds: s.progressSeconds + 1 }));
    }, 1000);

    try {
      const orderedPoses = state.selectedPoses.map(id => availablePoses.find(p => p.id === id)).filter(Boolean) as Pose[];
      const promises = orderedPoses.map(pose => generateFashionImage(state, pose, apiKey));
      const results = await Promise.all(promises);

      setGeneratedImages(results);
      setCurrentPreviewIndex(0);

      const newSession: Session = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        inputs: state.inputs,
        parameters: {
          poseIds: state.selectedPoses,
          gender: state.gender,
          backgroundMode: state.backgroundMode,
          model: state.selectedModel
        },
        outputs: results
      };

      setState(s => ({
        ...s,
        history: [newSession, ...s.history],
        currentSessionId: newSession.id,
        isGenerating: false
      }));

    } catch (err: any) {
      let errorMessage = err.message || 'Generation failed';
      if (errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED')) {
        errorMessage = 'Permission denied. Try switching to "Gemini Flash" or ensure your API Key has access to the Pro model.';
      }
      setState(s => ({ ...s, isGenerating: false, error: errorMessage }));
    } finally {
      clearInterval(timerInterval);
    }
  };

  const timerDisplay = useMemo(() => {
    const m = Math.floor(state.progressSeconds / 60).toString().padStart(2, '0');
    const s = (state.progressSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [state.progressSeconds]);

  return (
    <div className="min-h-screen bg-white text-black selection:bg-gray-200">
      <header className="px-6 py-8 md:px-12 border-b border-gray-100 flex justify-between items-center bg-white z-40 relative">
        <h1 className="text-3xl md:text-[40px] font-sans tracking-[0.2em] font-medium text-[#111]">VM STYLING STUDIO</h1>
        <button onClick={() => setIsHistoryOpen(true)} className="p-2 border border-gray-100 hover:bg-gray-50 rounded-md transition-colors">
          <Menu className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
        </button>
      </header>

      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 md:px-12 py-6 shadow-[0_4px_20px_-15px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-8 max-w-[1400px]">
          {/* Row 1: Model, Background, Gender */}
          <div className="flex flex-wrap gap-12 items-start">
            <div className="flex flex-col gap-3 min-w-[200px]">
              <label className="text-[10px] tracking-wider uppercase font-bold text-gray-400">Model</label>
              <div className="relative border-b border-gray-200 pb-2">
                <select
                  value={state.selectedModel}
                  onChange={(e) => setState(s => ({ ...s, selectedModel: e.target.value as ModelTier }))}
                  className="appearance-none bg-transparent font-sans text-sm text-gray-600 w-full cursor-pointer focus:outline-none"
                >
                  <option value="gemini-3-pro-image-preview">Nano Banana Pro</option>
                  <option value="gemini-2.5-flash-image">Gemini Flash</option>
                </select>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                  <ChevronRight className="w-4 h-4 rotate-90" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] tracking-wider uppercase font-bold text-gray-400">Background</label>
              <div className="flex">
                <button
                  onClick={() => setState(s => ({ ...s, backgroundMode: 'white' }))}
                  className={`text-xs px-6 py-2.5 tracking-widest transition-colors font-medium border ${state.backgroundMode === 'white' ? 'bg-black text-white border-black' : 'text-gray-400 border-gray-100 hover:border-gray-300'
                    }`}
                >WHITE</button>
                <button
                  onClick={() => setState(s => ({ ...s, backgroundMode: 'keep_original' }))}
                  className={`text-xs px-6 py-2.5 tracking-widest transition-colors font-medium border-y border-r ${state.backgroundMode === 'keep_original' ? 'bg-black text-white border-black' : 'text-gray-400 border-gray-100 hover:border-gray-300'
                    }`}
                >ORIGINAL</button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] tracking-wider uppercase font-bold text-gray-400">Gender</label>
              <div className="flex">
                <button
                  onClick={() => setState(s => ({ ...s, gender: 'female' }))}
                  className={`text-xs px-6 py-2.5 tracking-widest uppercase transition-colors font-medium border ${state.gender === 'female' ? 'bg-black text-white border-black' : 'text-gray-400 border-gray-100 hover:border-gray-300'
                    }`}
                >FEMALE</button>
                <button
                  onClick={() => setState(s => ({ ...s, gender: 'male' }))}
                  className={`text-xs px-6 py-2.5 tracking-widest uppercase transition-colors font-medium border-y border-r ${state.gender === 'male' ? 'bg-black text-white border-black' : 'text-gray-400 border-gray-100 hover:border-gray-300'
                    }`}
                >MALE</button>
              </div>
            </div>
          </div>

          {/* Row 2: Poses and Generate Button */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mt-2">
            <div className="flex flex-col gap-3">
              <label className="text-[10px] tracking-wider uppercase font-bold text-gray-400">Poses (Max 3) - {availablePoses.length} Options</label>
              <div className="flex flex-wrap gap-2">
                {availablePoses.map(pose => (
                  <button
                    key={pose.id}
                    onClick={() => handlePoseToggle(pose.id)}
                    className={`text-[10px] w-10 h-10 flex items-center justify-center border transition-colors ${state.selectedPoses.includes(pose.id) ? 'bg-black text-white border-black' : 'border-gray-100 text-gray-400 hover:border-gray-300'
                      }`}
                    title={pose.title}
                  >
                    {pose.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {state.isGenerating && (
                <div className="flex items-center gap-2 text-xs font-mono text-gray-400 animate-pulse">
                  <span>GENERATING</span>
                  <span>{timerDisplay}</span>
                </div>
              )}

              <button
                disabled={state.isGenerating}
                onClick={handleGenerate}
                className="bg-black text-white px-12 py-3.5 font-sans text-xs tracking-[0.2em] hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {state.isGenerating ? 'PROCESSING...' : 'GENERATE'}
              </button>
            </div>
          </div>
        </div>

        {state.error && (
          <div className="mt-4 bg-red-50 border border-red-100 text-red-600 px-4 py-2 text-xs flex items-center gap-2">
            <AlertTriangle size={12} /> {state.error}
          </div>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <section className="lg:col-span-5 space-y-12">
          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 text-gray-900">Reference Specs</h3>
            <div className="grid grid-cols-2 gap-4">
              <UploadSlot
                label="Styling Ref"
                required
                image={state.inputs.stylingRef}
                onUpload={(f) => updateInput('root', 'stylingRef', f)}
                onClear={() => updateInput('root', 'stylingRef', null)}
              />
              <UploadSlot
                label="Face Ref"
                required
                image={state.inputs.faceRef}
                onUpload={(f) => updateInput('root', 'faceRef', f)}
                onClear={() => updateInput('root', 'faceRef', null)}
              />
            </div>
          </div>

          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 text-gray-900">Wardrobe</h3>
            <div className="grid grid-cols-2 gap-4">
              <UploadSlot label="Top" image={state.inputs.clothes.top} onUpload={(f) => updateInput('clothes', 'top', f)} onClear={() => updateInput('clothes', 'top', null)} />
              <UploadSlot label="Bottom" image={state.inputs.clothes.bottom} onUpload={(f) => updateInput('clothes', 'bottom', f)} onClear={() => updateInput('clothes', 'bottom', null)} />
              <UploadSlot label="Shoes" image={state.inputs.clothes.shoes} onUpload={(f) => updateInput('clothes', 'shoes', f)} onClear={() => updateInput('clothes', 'shoes', null)} />
              <UploadSlot label="Sunglasses" image={state.inputs.clothes.sunglasses} onUpload={(f) => updateInput('clothes', 'sunglasses', f)} onClear={() => updateInput('clothes', 'sunglasses', null)} />
            </div>
          </div>

          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 text-gray-900">Accessories</h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(state.inputs.accessories) as Array<keyof typeof state.inputs.accessories>).map((key) => (
                <UploadSlot
                  key={key as string}
                  label={key as string}
                  image={state.inputs.accessories[key]}
                  onUpload={(f) => updateInput('accessories', key as string, f)}
                  onClear={() => updateInput('accessories', key as string, null)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 relative flex flex-col items-center">
          {generatedImages.length > 0 ? (
            <div className="w-full max-w-[500px] flex flex-col gap-6">
              <div className="relative w-full aspect-[9/16] bg-gray-50 overflow-hidden group">
                <img
                  src={generatedImages[currentPreviewIndex]}
                  alt="Generated Result"
                  className="w-full h-full object-cover"
                />

                {generatedImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPreviewIndex(i => i > 0 ? i - 1 : generatedImages.length - 1)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={() => setCurrentPreviewIndex(i => i < generatedImages.length - 1 ? i + 1 : 0)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}
              </div>

              {generatedImages.length > 1 && (
                <div className="flex gap-2 justify-center">
                  {generatedImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPreviewIndex(idx)}
                      className={`w-12 h-16 border-2 transition-all ${currentPreviewIndex === idx ? 'border-black' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    >
                      <img src={img} className="w-full h-full object-cover" alt={`Thumbnail ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center w-full pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-400">
                  Generated by {state.selectedModel}
                </div>
                <a
                  href={generatedImages[currentPreviewIndex]}
                  download={`vm-studio-${Date.now()}.png`}
                  className="text-xs uppercase tracking-wider hover:underline"
                >
                  Download
                </a>
              </div>
            </div>
          ) : (
            <div className="w-full h-[600px] flex flex-col items-center justify-center border border-dashed border-gray-100 bg-[#fafafa] text-gray-300">
              <div className="flex flex-col items-center gap-4 w-full max-w-sm px-8">
                {state.isGenerating ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <p className="font-sans text-xs tracking-widest uppercase text-gray-900 font-bold mb-1">
                      Generating High-Res Image
                    </p>
                    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black transition-all duration-1000 ease-linear"
                        style={{ width: `${Math.min((state.progressSeconds / 20) * 100, 99)}%` }}
                      />
                    </div>
                    <div className="flex justify-between w-full text-[10px] font-mono tracking-wider text-gray-400">
                      <span>PROCESSING...</span>
                      <span>{state.progressSeconds}s</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Zap size={36} strokeWidth={1} className="text-[#e0e0e0]" />
                    <p className="font-serif italic text-[#c0c0c0]">Preview will appear here</p>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={state.history}
        onLoadSession={(session) => {
          setGeneratedImages(session.outputs);
          setCurrentPreviewIndex(0);
        }}
      />
    </div>
  );
};

export default App;
