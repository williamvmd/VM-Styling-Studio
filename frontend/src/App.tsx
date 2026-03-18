import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Zap, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import UploadSlot from './components/UploadSlot';
import HistoryDrawer from './components/HistoryDrawer';
import { AppState, ModelTier, UploadedImage, Session, Pose, AspectRatio } from './types';
import { FEMALE_POSES, MALE_POSES } from './constants';
import { generateFashionImage } from './services/geminiService';

const INITIAL_STATE: AppState = {
  gender: 'female',
  backgroundMode: 'white',
  selectedPoses: ['F1'],
  selectedModel: 'gemini-3-pro-image-preview',
  aspectRatio: '9:16',
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
  customPrompt: '',
  apiKey: localStorage.getItem('GEMINI_API_KEY') || '',
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

    // API Key handling
    const finalApiKey = state.apiKey.trim();

    if (!finalApiKey) {
      setState(s => ({ ...s, error: 'API Key / Relay Token missing. Please paste it in the settings above.' }));
      return;
    }

    // Save to local storage for future sessions
    localStorage.setItem('GEMINI_API_KEY', finalApiKey);

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
      const promises = orderedPoses.map(pose => generateFashionImage(state, pose, finalApiKey));
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
          model: state.selectedModel,
          aspectRatio: state.aspectRatio,
          customPrompt: state.customPrompt
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
      if (
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('PERMISSION_DENIED') ||
        errorMessage.includes('API_KEY_INVALID')
      ) {
        errorMessage = 'API Key 或 Relay Token 无效，已清除保存的凭证。请重新输入正确的值。';
        localStorage.removeItem('GEMINI_API_KEY');
        setState(s => ({ ...s, apiKey: '' }));
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

      <div className="relative bg-white border-b border-gray-100 px-6 md:px-12 py-6 shadow-[0_4px_20px_-15px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-8 max-w-[1400px]">
          {/* Row 1: Model, Background, Gender, Aspect Ratio */}
          <div className="flex flex-col md:flex-row flex-wrap gap-8 md:gap-12 items-start">
            <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[200px]">
              <label className="text-[10px] tracking-wider uppercase font-bold text-gray-400">Model</label>
              <div className="relative border-b border-gray-200 pb-2">
                <select
                  value={state.selectedModel}
                  onChange={(e) => setState(s => ({ ...s, selectedModel: e.target.value as ModelTier }))}
                  className="appearance-none bg-transparent font-sans text-sm text-gray-600 w-full cursor-pointer focus:outline-none"
                >
                  <option value="gemini-3.1-flash-image-preview">Nano Banana 2</option>
                  <option value="gemini-3-pro-image-preview">Nano Banana Pro</option>
                </select>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                  <ChevronRight className="w-4 h-4 rotate-90" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[200px] md:flex-1">
              <label className="text-[10px] tracking-wider uppercase font-bold text-gray-400">API Key / Relay Token</label>
              <div className="relative border-b border-gray-200 pb-2">
                <input
                  type="password"
                  value={state.apiKey}
                  onChange={(e) => {
                    setState(s => ({ ...s, apiKey: e.target.value }));
                    localStorage.setItem('GEMINI_API_KEY', e.target.value);
                  }}
                  placeholder="Paste API key or relay token here..."
                  className="appearance-none bg-transparent font-sans text-sm text-gray-600 w-full focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <label className="text-[10px] tracking-wider uppercase font-bold text-gray-400">Background</label>
              <div className="flex w-full">
                <button
                  onClick={() => setState(s => ({ ...s, backgroundMode: 'white' }))}
                  className={`text-xs px-4 sm:px-6 py-2.5 flex-1 sm:flex-none tracking-widest transition-colors font-medium border ${state.backgroundMode === 'white' ? 'bg-black text-white border-black' : 'text-gray-400 border-gray-100 hover:border-gray-300'
                    }`}
                >WHITE</button>
                <button
                  onClick={() => setState(s => ({ ...s, backgroundMode: 'keep_original' }))}
                  className={`text-xs px-4 sm:px-6 py-2.5 flex-1 sm:flex-none tracking-widest transition-colors font-medium border-y border-r ${state.backgroundMode === 'keep_original' ? 'bg-black text-white border-black' : 'text-gray-400 border-gray-100 hover:border-gray-300'
                    }`}
                >ORIGINAL</button>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <label className="text-[10px] tracking-wider uppercase font-bold text-gray-400">Gender</label>
              <div className="flex w-full">
                <button
                  onClick={() => setState(s => ({ ...s, gender: 'female' }))}
                  className={`text-xs px-4 sm:px-6 py-2.5 flex-1 sm:flex-none tracking-widest uppercase transition-colors font-medium border ${state.gender === 'female' ? 'bg-black text-white border-black' : 'text-gray-400 border-gray-100 hover:border-gray-300'
                    }`}
                >FEMALE</button>
                <button
                  onClick={() => setState(s => ({ ...s, gender: 'male' }))}
                  className={`text-xs px-4 sm:px-6 py-2.5 flex-1 sm:flex-none tracking-widest uppercase transition-colors font-medium border-y border-r ${state.gender === 'male' ? 'bg-black text-white border-black' : 'text-gray-400 border-gray-100 hover:border-gray-300'
                    }`}
                >MALE</button>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <label className="text-[10px] tracking-wider uppercase font-bold text-gray-400">Aspect Ratio</label>
              <div className="relative border-b border-gray-200 pb-2 w-full">
                <select
                  value={state.aspectRatio}
                  onChange={(e) => setState(s => ({ ...s, aspectRatio: e.target.value as AspectRatio }))}
                  className="appearance-none bg-transparent font-sans text-sm text-gray-600 w-full cursor-pointer focus:outline-none pr-6"
                >
                  <option value="9:16">9:16</option>
                  <option value="16:9">16:9</option>
                  <option value="1:1">1:1</option>
                  <option value="3:4">3:4</option>
                  <option value="4:3">4:3</option>
                </select>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                  <ChevronRight className="w-4 h-4 rotate-90" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Poses, Custom Prompt, Generate Button */}
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-8 mt-4 md:mt-2 w-full">
            <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
              <label className="text-[10px] tracking-wider uppercase font-bold text-gray-400">Poses (Max 3) - {availablePoses.length} Options</label>
              <div className="flex flex-wrap gap-2">
                {availablePoses.map(pose => (
                  <div key={pose.id} className="relative group">
                    <button
                      onClick={() => handlePoseToggle(pose.id)}
                      className={`text-[10px] w-10 h-10 flex items-center justify-center border transition-all duration-300 ${state.selectedPoses.includes(pose.id)
                        ? 'bg-black text-white border-black shadow-[0_4px_10px_-4px_rgba(0,0,0,0.5)] scale-105'
                        : 'bg-white border-gray-100 text-gray-500 hover:border-gray-800 hover:text-black hover:shadow-sm'
                        }`}
                    >
                      {pose.id}
                    </button>

                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+12px)] md:bottom-[calc(100%+12px)] w-[80vw] sm:w-56 max-w-[250px] bg-black text-white p-4 opacity-0 pointer-events-none group-hover:opacity-100 outline-none focus:outline-none transition-all duration-[400ms] translate-y-2 group-hover:translate-y-0 z-[100] shadow-2xl">
                      <div className="text-[10px] font-bold tracking-widest uppercase mb-1.5 text-white/90 whitespace-normal text-left">
                        {pose.title}
                      </div>
                      <div className="text-[11px] font-serif italic text-white/70 leading-relaxed whitespace-normal text-left">
                        {pose.description}
                      </div>
                      {/* Triangle Pointer */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-[5px] border-transparent border-t-black"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Prompt merged into Row 2 */}
            <div className="flex flex-col gap-3 w-full md:flex-1 h-full min-w-0">
              <label className="text-[10px] tracking-wider uppercase font-bold text-transparent select-none hidden md:block">PROMPT</label>
              <div className="relative border-b border-gray-200 pb-2 h-10 flex items-center">
                <input
                  type="text"
                  value={state.customPrompt}
                  onChange={(e) => setState(s => ({ ...s, customPrompt: e.target.value }))}
                  placeholder="补充提示词 (如: '赛博朋克风格')..."
                  className="appearance-none bg-transparent font-sans text-sm text-gray-600 w-full focus:outline-none truncate"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto shrink-0 border-b border-transparent pb-0 md:pb-[3px]">
              {state.isGenerating && (
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-gray-400 animate-pulse">
                  <span>GENERATING</span>
                  <span>{timerDisplay}</span>
                </div>
              )}

              <button
                disabled={state.isGenerating}
                onClick={handleGenerate}
                className="bg-black text-white px-12 h-10 md:h-[42px] font-sans text-xs tracking-[0.2em] hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 w-full md:w-auto flex items-center justify-center"
              >
                {state.isGenerating ? 'PROCESSING...' : 'GENERATE'}
              </button>
            </div>
          </div>
        </div>

        {state.error && (
          <div className="mt-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 text-xs flex items-center gap-2 break-words">
            <AlertTriangle size={16} className="shrink-0" /> <span className="flex-1">{state.error}</span>
          </div>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <section className="lg:col-span-5 space-y-12 order-2 lg:order-1 outline-none">
          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 text-gray-900">Reference Specs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <UploadSlot label="Shoes" image={state.inputs.clothes.shoes} onUpload={(f) => updateInput('clothes', 'shoes', f)} onClear={() => updateInput('clothes', 'shoes', null)} />
              <UploadSlot label="Bottom" image={state.inputs.clothes.bottom} onUpload={(f) => updateInput('clothes', 'bottom', f)} onClear={() => updateInput('clothes', 'bottom', null)} />
              <UploadSlot label="Sunglasses" image={state.inputs.clothes.sunglasses} onUpload={(f) => updateInput('clothes', 'sunglasses', f)} onClear={() => updateInput('clothes', 'sunglasses', null)} />
            </div>
          </div>

          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 text-gray-900">Accessories</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

        <section className="lg:col-span-7 relative flex flex-col items-center order-1 lg:order-2">
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
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white p-2 rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
                    </button>
                    <button
                      onClick={() => setCurrentPreviewIndex(i => i < generatedImages.length - 1 ? i + 1 : 0)}
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white p-2 rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight size={20} className="sm:w-6 sm:h-6" />
                    </button>
                  </>
                )}
              </div>

              {generatedImages.length > 1 && (
                <div className="flex gap-2 justify-center flex-wrap">
                  {generatedImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPreviewIndex(idx)}
                      className={`w-10 sm:w-12 h-14 sm:h-16 border-2 transition-all ${currentPreviewIndex === idx ? 'border-black' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    >
                      <img src={img} className="w-full h-full object-cover" alt={`Thumbnail ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-center w-full pt-4 border-t border-gray-100 gap-3 sm:gap-0">
                <div className="text-[10px] sm:text-xs text-gray-400 text-center sm:text-left">
                  Generated by {state.selectedModel}
                </div>
                <a
                  href={generatedImages[currentPreviewIndex]}
                  download={`vm-studio-${Date.now()}.png`}
                  className="text-xs uppercase tracking-wider font-bold border-b border-black md:border-transparent hover:border-black transition-colors"
                >
                  Download
                </a>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-[9/16] max-h-[600px] sm:h-[600px] flex flex-col items-center justify-center border border-dashed border-gray-100 bg-[#fafafa] text-gray-300">
              <div className="flex flex-col items-center gap-4 w-full max-w-sm px-6 sm:px-8">
                {state.isGenerating ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <p className="font-sans text-[10px] sm:text-xs tracking-widest uppercase text-gray-900 font-bold mb-1 text-center">
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
                    <p className="font-serif italic text-[#c0c0c0] text-center text-sm md:text-base">Preview will appear here</p>
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
