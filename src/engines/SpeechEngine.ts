export type SpeechEngineState = "idle" | "listening" | "processing" | "error";

export interface SpeechEngineError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface SpeechEngineCallbacks {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (err: SpeechEngineError) => void;
  onStateChange?: (state: SpeechEngineState) => void;
}

export interface SpeechEngine {
  start(): void;
  stop(): void;
  cancel(): void;
  setLanguage(lang: string): void;
  getState(): SpeechEngineState;
  destroy(): void;
}

export interface SpeechEngineConstructor {
  new (callbacks: SpeechEngineCallbacks): SpeechEngine;
}
