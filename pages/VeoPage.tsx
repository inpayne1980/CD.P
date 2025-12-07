import React, { useState, useRef } from 'react';
import { getClient, MODEL_NAMES } from '../services/genai';
import { VideoGenerationState } from '../types';
import { Video, Loader2, Key, Image as ImageIcon, X } from 'lucide-react';

const VeoPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [videoState, setVideoState] = useState<VideoGenerationState>({ status: 'idle' });
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [imageInput, setImageInput] = useState<{data: string, mimeType: string} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
        const data = result.split(',')[1];
        setImageInput({ data, mimeType });
      };
      reader.readAsDataURL(file);
    }
  };

  const checkKeyAndGenerate = async () => {
    setVideoState({ status: 'generating' });
    try {
      // 1. Check/Select Key
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }

      // 2. Instantiate Client
      const client = getClient(); 

      // 3. Prepare Payload
      const params: any = {
        model: MODEL_NAMES.VEO_FAST,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: aspectRatio,
        }
      };

      if (prompt) {
        params.prompt = prompt;
      }
      
      // Add image if present
      if (imageInput) {
        params.image = {
            imageBytes: imageInput.data,
            mimeType: imageInput.mimeType
        };
      }
      
      // Validation
      if (!prompt && !imageInput) {
          throw new Error("Please provide a prompt or an image.");
      }

      // 4. Start Generation
      let operation = await client.models.generateVideos(params);

      // 5. Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
        operation = await client.operations.getVideosOperation({ operation: operation });
      }

      // 6. Get Result
      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (videoUri) {
        setVideoState({ status: 'complete', videoUri: `${videoUri}&key=${process.env.API_KEY}` });
      } else {
        throw new Error('No video URI in response');
      }

    } catch (e) {
      console.error(e);
      // If error is "Requested entity was not found", reset key
      if (e instanceof Error && e.message.includes('Requested entity was not found')) {
         await window.aistudio.openSelectKey();
         setVideoState({ status: 'error', error: 'API Key invalid. Please try again.' });
      } else {
         setVideoState({ status: 'error', error: e instanceof Error ? e.message : 'Generation failed' });
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
          <Video size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-bold">Veo Video Studio</h2>
          <p className="text-slate-400">Cinematic video generation from Text or Images.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Image Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Input Image (Optional)</label>
            {!imageInput ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border border-dashed border-slate-700 hover:border-purple-500 hover:bg-slate-800/50 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors"
                >
                    <ImageIcon className="text-slate-500 mb-1" />
                    <span className="text-xs text-slate-500">Click to upload starting frame</span>
                </div>
            ) : (
                <div className="relative rounded-lg overflow-hidden border border-purple-500/50">
                    <img 
                        src={`data:${imageInput.mimeType};base64,${imageInput.data}`} 
                        className="w-full h-24 object-cover" 
                        alt="Input"
                    />
                    <button 
                        onClick={() => setImageInput(null)}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload}
            />
          </div>

          <div className="space-y-2">
             <label className="text-sm font-medium text-slate-300">Prompt</label>
             <textarea 
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-purple-500 outline-none resize-none placeholder:text-slate-600"
                placeholder={imageInput ? "Describe how the image should animate..." : "A neon hologram of a cat driving at top speed..."}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
             />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Aspect Ratio</label>
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={() => setAspectRatio('16:9')}
                    className={`p-2 rounded border text-sm ${aspectRatio === '16:9' ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-700 text-slate-400'}`}
                >
                    Landscape (16:9)
                </button>
                <button 
                    onClick={() => setAspectRatio('9:16')}
                    className={`p-2 rounded border text-sm ${aspectRatio === '9:16' ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-700 text-slate-400'}`}
                >
                    Portrait (9:16)
                </button>
            </div>
          </div>

          <button
            onClick={checkKeyAndGenerate}
            disabled={(!prompt && !imageInput) || videoState.status === 'generating'}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg font-bold transition-all flex justify-center items-center gap-2"
          >
            {videoState.status === 'generating' ? (
                <><Loader2 className="animate-spin" /> Generating...</>
            ) : (
                'Generate Video'
            )}
          </button>
          
          <button 
            onClick={() => window.aistudio.openSelectKey()}
            className="text-xs text-slate-500 hover:text-purple-400 flex items-center gap-1 w-full justify-center"
          >
            <Key size={12} /> Change Billing API Key
          </button>
        </div>

        {/* Preview Area */}
        <div className="md:col-span-2 bg-black rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden min-h-[400px]">
            {videoState.status === 'idle' && (
                <div className="text-slate-600 flex flex-col items-center text-center p-6">
                    <Video size={48} className="mb-4 opacity-50" />
                    <p className="max-w-xs">Upload an image to animate it, or type a prompt to generate from scratch.</p>
                </div>
            )}
            {videoState.status === 'generating' && (
                <div className="text-purple-400 flex flex-col items-center animate-pulse">
                    <Loader2 size={48} className="mb-4 animate-spin" />
                    <p>Dreaming up pixels... (This may take a minute)</p>
                </div>
            )}
            {videoState.status === 'error' && (
                <div className="text-red-400 p-8 text-center">
                    <p className="font-bold mb-2">Generation Failed</p>
                    <p className="text-sm">{videoState.error}</p>
                </div>
            )}
            {videoState.status === 'complete' && videoState.videoUri && (
                <video 
                    controls 
                    autoPlay 
                    loop 
                    className="w-full h-full object-contain"
                    src={videoState.videoUri}
                />
            )}
        </div>
      </div>
    </div>
  );
};

export default VeoPage;