export enum RoutePath {
  HOME = '/',
  LIVE = '/live',
  VIDEO = '/video',
  IMAGE = '/image',
  ASSISTANT = '/assistant',
}

export interface NavItem {
  label: string;
  path: RoutePath;
  icon: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  groundingSources?: {
    uri: string;
    title: string;
  }[];
  image?: string;
  isThinking?: boolean;
}

// Veo / Video Types
export interface VideoGenerationState {
  status: 'idle' | 'generating' | 'complete' | 'error';
  videoUri?: string;
  error?: string;
}

// Global declaration for Veo API Key selection
declare global {
  // Augment the AIStudio interface which is expected by the existing window.aistudio declaration
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // aistudio is already defined with type AIStudio in the environment types. 
    // We augment the AIStudio interface above to ensure these methods exist on it.
    webkitAudioContext: typeof AudioContext;
  }
}