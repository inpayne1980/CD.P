import React, { useEffect, useRef, useState } from 'react';
import { getClient, MODEL_NAMES } from '../services/genai';
import { LiveServerMessage, Modality } from '@google/genai';
import { base64ToUint8Array, decodeAudioData, pcmToGeminiBlob } from '../utils/audio';
import { Mic, MicOff, Activity, Volume2, Zap } from 'lucide-react';

const LivePage: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('Ready to connect');
  
  // Audio Context Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);

  const cleanup = () => {
    if (sessionRef.current) {
        // We can't really "close" explicitly via SDK but we can stop sending
        sessionRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }
    setIsConnected(false);
    setStatus('Disconnected');
  };

  const connect = async () => {
    try {
      setStatus('Initializing audio...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      
      inputContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;

      const client = getClient();
      
      setStatus('Connecting to Gemini...');
      
      const sessionPromise = client.live.connect({
        model: MODEL_NAMES.LIVE,
        callbacks: {
          onopen: () => {
            setStatus('Connected! Speak now.');
            setIsConnected(true);
            
            // Setup Input Stream
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = pcmToGeminiBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
            
            sourceNodeRef.current = source;
            scriptProcessorRef.current = processor;
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputCtx) {
                // Determine start time
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                
                const audioBuffer = await decodeAudioData(
                    base64ToUint8Array(base64Audio),
                    outputCtx,
                    24000
                );
                
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                source.start(nextStartTimeRef.current);
                
                nextStartTimeRef.current += audioBuffer.duration;
            }

            // Handle Interruptions
            if (msg.serverContent?.interrupted) {
                console.log('Interrupted');
                nextStartTimeRef.current = 0;
                // Note: In a full app, we would track playing sources and stop them here.
            }
          },
          onclose: () => {
            setStatus('Connection closed');
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error(err);
            setStatus('Error occurred');
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: 'You are a helpful, witty, and concise AI assistant. Keep responses short and conversational.',
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error(e);
      setStatus(`Failed to connect: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
          <Zap className="text-amber-400" />
          Live Audio
        </h2>
        <p className="text-slate-400">
          Have a natural conversation with Gemini 2.5 Native Audio (Low Latency).
        </p>
      </div>

      <div className={`
        relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-500
        ${isConnected ? 'bg-amber-500/10 shadow-[0_0_50px_rgba(245,158,11,0.3)]' : 'bg-slate-800'}
      `}>
         {isConnected && (
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping"></div>
         )}
         <div className="z-10 text-center">
            {isConnected ? (
                <Activity size={64} className="text-amber-500 animate-pulse" />
            ) : (
                <MicOff size={64} className="text-slate-600" />
            )}
         </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg px-6 py-3 font-mono text-sm text-amber-400 min-w-[300px] text-center">
        {status}
      </div>

      <div className="flex gap-4">
        {!isConnected ? (
          <button
            onClick={connect}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-full font-semibold transition-colors flex items-center gap-2"
          >
            <Mic size={20} /> Start Conversation
          </button>
        ) : (
          <>
            <button
                onClick={() => setIsMuted(!isMuted)}
                className={`px-6 py-3 rounded-full font-semibold transition-colors flex items-center gap-2 ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-300'}`}
            >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                {isMuted ? 'Muted' : 'Mute Mic'}
            </button>
            <button
              onClick={cleanup}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition-colors"
            >
              End Call
            </button>
          </>
        )}
      </div>
      
      <div className="text-xs text-slate-500 text-center max-w-md">
        Note: Requires microphone permissions. Audio is processed locally and streamed to Gemini via WebSocket.
      </div>
    </div>
  );
};

export default LivePage;