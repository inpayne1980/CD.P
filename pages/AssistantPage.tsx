import React, { useState, useRef } from 'react';
import { getClient, MODEL_NAMES } from '../services/genai';
import { ChatMessage } from '../types';
import { Send, MapPin, Search, Brain, Volume2, Mic, Bot, Paperclip, X, Loader2 } from 'lucide-react';
import { Modality, Content } from '@google/genai';
import { base64ToUint8Array, decodeAudioData, pcmToGeminiBlob } from '../utils/audio';

const AssistantPage: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Attachments
  const [attachment, setAttachment] = useState<{data: string, mimeType: string} | null>(null);
  
  // Tools Toggles
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [useThinking, setUseThinking] = useState(false);

  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
        const data = result.split(',')[1];
        setAttachment({ data, mimeType });
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' }); // or audio/webm
            await transcribeAudio(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (err) {
        console.error("Error accessing mic:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
      setLoading(true);
      try {
        const client = getClient();
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64data = (reader.result as string).split(',')[1];
            
            const response = await client.models.generateContent({
                model: MODEL_NAMES.TEXT_FAST, // Flash Lite or Flash is good for transcription
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'audio/wav', data: base64data } }, // Assume wav/webm from recorder
                        { text: "Transcribe this audio exactly. Do not add any other text." }
                    ]
                }
            });
            
            const text = response.text;
            if (text) {
                setInput(prev => prev + (prev ? " " : "") + text);
            }
            setLoading(false);
        };
      } catch (e) {
          console.error("Transcription failed", e);
          setLoading(false);
      }
  };

  const sendMessage = async () => {
    if (!input.trim() && !attachment) return;
    
    const userText = input;
    const currentAttachment = attachment;
    
    // Clear Input
    setInput('');
    setAttachment(null);
    
    // Update UI immediately
    const newMsg: ChatMessage = { 
        role: 'user', 
        text: userText, 
        image: currentAttachment ? `data:${currentAttachment.mimeType};base64,${currentAttachment.data}` : undefined 
    };
    
    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      const client = getClient();
      
      const config: any = {};
      const tools: any[] = [];
      let model = MODEL_NAMES.TEXT_BASIC;

      // Tools Config
      if (useSearch) tools.push({ googleSearch: {} });
      if (useMaps) {
         tools.push({ googleMaps: {} });
         config.toolConfig = { retrievalConfig: { latLng: { latitude: 37.7749, longitude: -122.4194 } } };
      }
      if (tools.length > 0) config.tools = tools;

      // Model Selection
      if (useThinking) {
        model = MODEL_NAMES.TEXT_COMPLEX;
        config.thinkingConfig = { thinkingBudget: 1024 };
      } else if (currentAttachment) {
        // Use Pro for Vision tasks usually, but Flash 2.5 is also great. 
        // Let's use Pro if available or complex, but Flash is standard.
        // The prompt says: "Complex Text Tasks... gemini-3-pro-preview".
        // Let's stick to Flash for speed unless Thinking is on, or user wants Pro explicitly. 
        // Actually, for vision, Flash 2.5 is excellent.
      }

      // Build History
      // We need to convert our internal ChatMessage format to the SDK's Content format
      const history: Content[] = messages.map(msg => {
          const parts: any[] = [];
          if (msg.image) {
              const [meta, data] = msg.image.split(',');
              const mimeType = meta.substring(meta.indexOf(':')+1, meta.indexOf(';'));
              parts.push({ inlineData: { mimeType, data } });
          }
          if (msg.text) parts.push({ text: msg.text });
          return { role: msg.role, parts };
      });

      // Current Turn
      const currentParts: any[] = [];
      if (currentAttachment) {
          currentParts.push({ inlineData: { mimeType: currentAttachment.mimeType, data: currentAttachment.data } });
      }
      if (userText) currentParts.push({ text: userText });

      const contents = [...history, { role: 'user', parts: currentParts }];

      // API Call
      const result = await client.models.generateContent({
        model: model,
        contents: contents,
        config: config
      });

      const responseText = result.text || "No response text.";
      
      // Extract Grounding
      const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const groundingSources = groundingChunks?.map((chunk: any) => {
          if (chunk.web) return { uri: chunk.web.uri, title: chunk.web.title };
          if (chunk.maps) return { uri: chunk.maps.uri, title: chunk.maps.title };
          return null;
      }).filter(Boolean);

      setMessages(prev => [...prev, { 
          role: 'model', 
          text: responseText, 
          groundingSources,
          isThinking: useThinking 
      }]);

      // Auto-TTS
      playTTS(responseText.substring(0, 250));

    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: "Error: " + (e instanceof Error ? e.message : "Unknown") }]);
    } finally {
      setLoading(false);
    }
  };

  const playTTS = async (text: string) => {
     try {
        const client = getClient();
        const ttsResp = await client.models.generateContent({
            model: MODEL_NAMES.TTS,
            contents: { parts: [{ text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                }
            }
        });

        const base64Audio = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            }
            const ctx = audioCtxRef.current;
            const audioBuffer = await decodeAudioData(base64ToUint8Array(base64Audio), ctx, 24000);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start();
        }
     } catch (e) {
         console.error("TTS Failed", e);
     }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-100px)] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Header / Config */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-wrap gap-4 items-center justify-between">
         <div className="flex items-center gap-2">
            <Bot className="text-blue-500" />
            <h2 className="font-bold hidden sm:block">Gemini Assistant</h2>
         </div>
         <div className="flex gap-2">
            <button 
                onClick={() => { setUseSearch(!useSearch); if(!useSearch) setUseThinking(false); }}
                className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-all ${useSearch ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
            >
                <Search size={14} /> Search
            </button>
            <button 
                onClick={() => { setUseMaps(!useMaps); if(!useMaps) setUseThinking(false); }}
                className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-all ${useMaps ? 'bg-green-600 border-green-500 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
            >
                <MapPin size={14} /> Maps
            </button>
            <button 
                onClick={() => { setUseThinking(!useThinking); if(!useThinking) { setUseSearch(false); setUseMaps(false); } }}
                className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-all ${useThinking ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
            >
                <Brain size={14} /> Thinking
            </button>
         </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 space-y-2">
                <Brain size={64} className="mb-4" />
                <p>Chat, Search, or Analyze Images.</p>
                <p className="text-xs">Try uploading a photo or using the mic.</p>
            </div>
        )}
        {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                    {msg.isThinking && (
                        <div className="text-xs text-purple-400 mb-2 font-mono flex items-center gap-1 bg-purple-900/20 px-2 py-1 rounded w-fit">
                            <Brain size={12} /> Thoughts Processed
                        </div>
                    )}
                    
                    {msg.image && (
                        <img src={msg.image} alt="User upload" className="max-w-full h-auto rounded-lg mb-2 border border-white/20" />
                    )}

                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                    
                    {msg.groundingSources && msg.groundingSources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1"><Search size={10}/> Sources</p>
                            <div className="flex flex-wrap gap-2">
                                {msg.groundingSources.map((source, i) => (
                                    <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-900 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 text-blue-400 truncate max-w-[200px] block transition-colors">
                                        {source.title || source.uri}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        ))}
        {loading && (
            <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl p-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                </div>
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-950 border-t border-slate-800">
        
        {/* Attachment Preview */}
        {attachment && (
            <div className="mb-2 relative w-fit">
                <div className="h-16 w-16 rounded-lg border border-slate-700 overflow-hidden relative group">
                    <img 
                        src={`data:${attachment.mimeType};base64,${attachment.data}`} 
                        className="h-full w-full object-cover opacity-80"
                        alt="Preview"
                    />
                    <button 
                        onClick={() => setAttachment(null)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        )}

        <div className="flex gap-2 items-end">
            <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-400 transition-colors"
                title="Attach Image"
            >
                <Paperclip size={20} />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden"
            />

            <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl flex items-center focus-within:border-blue-500 transition-colors">
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                    placeholder={isRecording ? "Listening..." : "Message Gemini..."}
                    className="flex-1 bg-transparent border-none outline-none text-white px-4 py-3 max-h-32 resize-none"
                    rows={1}
                />
                <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    disabled={loading}
                    className={`p-2 mr-2 rounded-lg transition-all ${isRecording ? 'bg-red-500/20 text-red-500 scale-110' : 'text-slate-500 hover:text-white'}`}
                >
                    {isRecording ? <div className="animate-pulse"><Mic size={20} /></div> : <Mic size={20} />}
                </button>
            </div>

            <button 
                onClick={sendMessage}
                disabled={(!input && !attachment) || loading}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <Send size={20} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;