import {
  SpeechEngine,
  SpeechEngineCallbacks,
  SpeechEngineError,
  SpeechEngineState,
} from "./SpeechEngine";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

function mapErrorCode(error: string): SpeechEngineError {
  const errorMap: Record<string, SpeechEngineError> = {
    "not-allowed": {
      code: "permission-denied",
      message: "Microphone permission was denied. Please allow microphone access.",
      recoverable: false,
    },
    "service-not-allowed": {
      code: "service-not-allowed",
      message: "Speech recognition service is not allowed. Please check browser settings.",
      recoverable: false,
    },
    "no-speech": {
      code: "no-speech",
      message: "No speech was detected. Please try again.",
      recoverable: true,
    },
    aborted: {
      code: "aborted",
      message: "Speech recognition was aborted.",
      recoverable: true,
    },
    network: {
      code: "network",
      message: "Network error occurred. Please check your connection.",
      recoverable: true,
    },
    "audio-capture": {
      code: "audio-capture",
      message: "No microphone was found or microphone is not working.",
      recoverable: false,
    },
    "bad-grammar": {
      code: "bad-grammar",
      message: "Speech grammar error occurred.",
      recoverable: true,
    },
    "language-not-supported": {
      code: "language-not-supported",
      message: "The selected language is not supported.",
      recoverable: false,
    },
  };

  return (
    errorMap[error] || {
      code: "unknown",
      message: `An unknown error occurred: ${error}`,
      recoverable: true,
    }
  );
}

export class WebSpeechEngine implements SpeechEngine {
  private recognition: SpeechRecognition | null = null;
  private state: SpeechEngineState = "idle";
  private language: string = "en-US";
  private callbacks: SpeechEngineCallbacks;
  private isStarting: boolean = false;
  private isStopping: boolean = false;
  private pendingStop: boolean = false;

  constructor(callbacks: SpeechEngineCallbacks) {
    this.callbacks = callbacks;
    this.initRecognition();
  }

  private initRecognition(): void {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      this.setState("error");
      this.callbacks.onError?.({
        code: "not-supported",
        message: "Speech recognition is not supported in this browser.",
        recoverable: false,
      });
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.language;

    this.recognition.onstart = () => {
      this.isStarting = false;
      if (this.pendingStop) {
        this.pendingStop = false;
        this.recognition?.stop();
        return;
      }
      this.setState("listening");
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        this.callbacks.onPartial?.(interimTranscript);
      }

      if (finalTranscript) {
        this.setState("processing");
        this.callbacks.onFinal?.(finalTranscript);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.isStarting = false;
      this.isStopping = false;
      this.pendingStop = false;

      if (event.error === "aborted" && this.state === "idle") {
        return;
      }

      const error = mapErrorCode(event.error);
      this.setState("error");
      this.callbacks.onError?.(error);
    };

    this.recognition.onend = () => {
      this.isStarting = false;
      this.isStopping = false;
      this.pendingStop = false;

      if (this.state !== "error") {
        this.setState("idle");
      }
    };

    this.recognition.onspeechend = () => {
      if (this.state === "listening") {
        this.setState("processing");
      }
    };
  }

  private setState(newState: SpeechEngineState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChange?.(newState);
    }
  }

  start(): void {
    if (!this.recognition) {
      this.callbacks.onError?.({
        code: "not-supported",
        message: "Speech recognition is not supported in this browser.",
        recoverable: false,
      });
      return;
    }

    if (this.isStarting || this.state === "listening") {
      return;
    }

    if (this.isStopping) {
      this.pendingStop = false;
      return;
    }

    try {
      this.isStarting = true;
      this.recognition.lang = this.language;
      this.recognition.start();
    } catch (error) {
      this.isStarting = false;
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        return;
      }
      this.setState("error");
      this.callbacks.onError?.({
        code: "start-error",
        message: "Failed to start speech recognition.",
        recoverable: true,
      });
    }
  }

  stop(): void {
    if (!this.recognition) {
      return;
    }

    if (this.isStarting) {
      this.pendingStop = true;
      return;
    }

    if (this.isStopping || this.state === "idle") {
      return;
    }

    try {
      this.isStopping = true;
      this.recognition.stop();
    } catch (error) {
      this.isStopping = false;
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        this.setState("idle");
        return;
      }
    }
  }

  cancel(): void {
    if (!this.recognition) {
      return;
    }

    try {
      this.pendingStop = false;
      this.isStarting = false;
      this.isStopping = false;
      this.recognition.abort();
      this.setState("idle");
    } catch (error) {
      this.setState("idle");
    }
  }

  setLanguage(lang: string): void {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  getState(): SpeechEngineState {
    return this.state;
  }

  destroy(): void {
    this.cancel();
    this.recognition = null;
  }
}
