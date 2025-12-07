import { GoogleGenAI } from "@google/genai";

// Helper to get a client.
// Note: For Veo, we re-instantiate to ensure we catch the user-selected key if applicable.
export const getClient = () => {
  const apiKey = process.env.API_KEY || ''; // In a real app, ensure this is set.
  return new GoogleGenAI({ apiKey });
};

export const MODEL_NAMES = {
  LIVE: 'gemini-2.5-flash-native-audio-preview-09-2025',
  VEO_FAST: 'veo-3.1-fast-generate-preview',
  VEO_PRO: 'veo-3.1-generate-preview',
  IMAGE_GEN: 'gemini-3-pro-image-preview',
  IMAGE_EDIT: 'gemini-2.5-flash-image',
  TEXT_BASIC: 'gemini-2.5-flash',
  TEXT_COMPLEX: 'gemini-3-pro-preview',
  TEXT_FAST: 'gemini-2.5-flash-lite-latest', // flash-lite
  TTS: 'gemini-2.5-flash-preview-tts'
};
