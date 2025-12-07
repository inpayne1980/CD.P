import React, { useState } from 'react';
import { getClient, MODEL_NAMES } from '../services/genai';
import { Image as ImageIcon, Wand2, Loader2, Download, Eye, ScanSearch } from 'lucide-react';

const ImageStudio: React.FC = () => {
  const [mode, setMode] = useState<'generate' | 'edit' | 'analyze'>('generate');
  const [prompt, setPrompt] = useState('');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  
  // Results
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  
  // Input Image (for Edit/Analyze)
  const [baseImage, setBaseImage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBaseImage(reader.result as string);
        // Clear previous results when new image loaded
        setResultImage(null);
        setAnalysisText(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const execute = async () => {
    setLoading(true);
    setResultImage(null);
    setAnalysisText(null);
    
    try {
      const client = getClient();
      
      if (mode === 'generate') {
         // Nano Banana Pro Generation
         const response = await client.models.generateContent({
             model: MODEL_NAMES.IMAGE_GEN,
             contents: { parts: [{ text: prompt }] },
             config: {
                 imageConfig: {
                     aspectRatio: aspectRatio,
                     imageSize: imageSize
                 }
             }
         });
         
         const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
         if (part?.inlineData?.data) {
             setResultImage(`data:image/png;base64,${part.inlineData.data}`);
         }
      } 
      else if (mode === 'edit') {
        // Flash Image Editing
        if (!baseImage) throw new Error("Please upload an image first");
        
        const base64Data = baseImage.split(',')[1];
        const mimeType = baseImage.substring(baseImage.indexOf(':') + 1, baseImage.indexOf(';'));

        const response = await client.models.generateContent({
            model: MODEL_NAMES.IMAGE_EDIT,
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType } },
                    { text: prompt || "Edit this image" }
                ]
            }
        });
        
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
         if (part?.inlineData?.data) {
             setResultImage(`data:image/png;base64,${part.inlineData.data}`);
         }
      } 
      else if (mode === 'analyze') {
         // Vision Analysis (Gemini 3 Pro)
         if (!baseImage) throw new Error("Please upload an image first");

         const base64Data = baseImage.split(',')[1];
         const mimeType = baseImage.substring(baseImage.indexOf(':') + 1, baseImage.indexOf(';'));

         const response = await client.models.generateContent({
            model: MODEL_NAMES.TEXT_COMPLEX, // Gemini 3 Pro Preview
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType } },
                    { text: prompt || "Analyze this image in detail. Describe what you see." }
                ]
            }
         });

         const text = response.text;
         if (text) {
             setAnalysisText(text);
         }
      }

    } catch (e) {
      console.error(e);
      alert('Operation failed: ' + (e instanceof Error ? e.message : 'Unknown Error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex flex-col md:flex-row gap-6">
      
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 flex flex-col gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 h-full overflow-y-auto shrink-0">
         <div>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <ImageIcon className="text-pink-500" /> Vision Studio
            </h2>
            
            <div className="flex bg-slate-800 p-1 rounded-lg mb-6 text-xs">
                <button 
                    onClick={() => setMode('generate')}
                    className={`flex-1 py-2 font-medium rounded-md transition-all ${mode === 'generate' ? 'bg-slate-700 text-white shadow' : 'text-slate-400'}`}
                >
                    Generate
                </button>
                <button 
                    onClick={() => setMode('edit')}
                    className={`flex-1 py-2 font-medium rounded-md transition-all ${mode === 'edit' ? 'bg-slate-700 text-white shadow' : 'text-slate-400'}`}
                >
                    Edit
                </button>
                <button 
                    onClick={() => setMode('analyze')}
                    className={`flex-1 py-2 font-medium rounded-md transition-all ${mode === 'analyze' ? 'bg-slate-700 text-white shadow' : 'text-slate-400'}`}
                >
                    Analyze
                </button>
            </div>
         </div>

         <div className="space-y-4 flex-1">
            <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                    {mode === 'analyze' ? 'Question / Prompt' : 'Prompt'}
                </label>
                <textarea 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:border-pink-500 outline-none resize-none h-32 placeholder:text-slate-600"
                    placeholder={
                        mode === 'generate' ? "A futuristic city on Mars..." : 
                        mode === 'edit' ? "Add fireworks in the sky..." :
                        "Describe this image..."
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
            </div>

            {(mode === 'edit' || mode === 'analyze') && (
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-500">Source Image</label>
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-pink-400 hover:file:bg-slate-700"
                    />
                    {baseImage && (
                        <div className="relative">
                            <img src={baseImage} alt="Source" className="w-full h-32 object-cover rounded-lg border border-slate-700" />
                        </div>
                    )}
                </div>
            )}

            {mode === 'generate' && (
                <>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500">Resolution</label>
                        <select 
                            value={imageSize}
                            onChange={(e) => setImageSize(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                        >
                            <option value="1K">1K (Standard)</option>
                            <option value="2K">2K (High)</option>
                            <option value="4K">4K (Ultra)</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500">Aspect Ratio</label>
                        <select 
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                        >
                            <option value="1:1">Square (1:1)</option>
                            <option value="16:9">Landscape (16:9)</option>
                            <option value="9:16">Portrait (9:16)</option>
                            <option value="4:3">4:3</option>
                            <option value="3:4">3:4</option>
                        </select>
                    </div>
                </>
            )}
         </div>

         <button
            onClick={execute}
            disabled={loading || (mode !== 'analyze' && !prompt) || ((mode === 'edit' || mode === 'analyze') && !baseImage)}
            className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-white shadow-lg shadow-pink-900/20 flex items-center justify-center gap-2"
         >
            {loading ? <Loader2 className="animate-spin" /> : mode === 'analyze' ? <ScanSearch /> : <Wand2 />}
            {mode === 'generate' ? 'Generate 3.0' : mode === 'edit' ? 'Magic Edit' : 'Analyze Image'}
         </button>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 bg-black rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden p-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black -z-10"></div>
            
            {loading && (
                <div className="text-center">
                    <Loader2 size={64} className="animate-spin text-pink-500 mx-auto mb-4" />
                    <p className="text-slate-400 animate-pulse">
                        {mode === 'generate' ? 'Dreaming in pixels...' : mode === 'edit' ? 'Applying magic edit...' : 'Analyzing details...'}
                    </p>
                </div>
            )}

            {!loading && !resultImage && !analysisText && (
                <div className="text-slate-600 text-center">
                    {mode === 'analyze' ? <Eye size={64} className="mx-auto mb-4 opacity-30" /> : <ImageIcon size={64} className="mx-auto mb-4 opacity-30" />}
                    <p>Result will appear here</p>
                </div>
            )}

            {/* Image Result */}
            {resultImage && !loading && (
                <div className="relative group w-full h-full flex items-center justify-center">
                    <img src={resultImage} alt="Generated" className="max-w-full max-h-full object-contain rounded shadow-2xl" />
                    <a 
                        href={resultImage} 
                        download="gemini-creation.png"
                        className="absolute bottom-6 right-6 p-3 bg-white text-black rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200"
                    >
                        <Download size={20} />
                    </a>
                </div>
            )}

            {/* Analysis Result */}
            {analysisText && !loading && (
                <div className="w-full h-full overflow-y-auto p-6 bg-slate-900/50 rounded-xl border border-slate-700">
                    <h3 className="text-pink-400 font-bold mb-4 flex items-center gap-2">
                        <ScanSearch size={20} /> Analysis Result
                    </h3>
                    <div className="prose prose-invert prose-sm max-w-none text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {analysisText}
                    </div>
                </div>
            )}
      </div>
    </div>
  );
};

export default ImageStudio;