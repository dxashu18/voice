import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, AlertCircle } from "lucide-react";
import { WebSpeechEngine } from "../engines/WebSpeechEngine";
import {
  SpeechEngine,
  SpeechEngineError,
  SpeechEngineState,
} from "../engines/SpeechEngine";
import { isWebSpeechSupported } from "../utils/capabilities";
import { normalizeInterim, normalizeFinal } from "../utils/normalize";

interface VoiceInputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  lang: string;
  onLangChange: (lang: string) => void;
  normalizeFinalFn?: (text: string) => string;
  normalizeInterimFn?: (text: string) => string;
  placeholder?: string;
  disabled?: boolean;
  onStatusChange?: (status: string) => void;
  onErrorChange?: (error: SpeechEngineError | null) => void;
}

export function VoiceInputField({
  label,
  value,
  onChange,
  lang,
  normalizeFinalFn = normalizeFinal,
  normalizeInterimFn = normalizeInterim,
  placeholder = "",
  disabled = false,
  onStatusChange,
  onErrorChange,
}: VoiceInputFieldProps) {
  const [engineState, setEngineState] = useState<SpeechEngineState>("idle");
  const [interimText, setInterimText] = useState<string>("");
  const [error, setError] = useState<SpeechEngineError | null>(null);
  const [isSupported] = useState(() => isWebSpeechSupported());
  const [isHolding, setIsHolding] = useState(false);
  const [isToggleMode, setIsToggleMode] = useState(false);

  const engineRef = useRef<SpeechEngine | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isSupported) {
      onStatusChange?.("Speech recognition not supported in this browser.");
      return;
    }

    const engine = new WebSpeechEngine({
      onPartial: (text) => {
        const normalized = normalizeInterimFn(text);
        setInterimText(normalized);
      },
      onFinal: (text) => {
        const normalized = normalizeFinalFn(text);
        setInterimText("");
        onChange(value ? `${value} ${normalized}` : normalized);
      },
      onError: (err) => {
        setError(err);
        onErrorChange?.(err);
        setInterimText("");
        setIsHolding(false);
        setIsToggleMode(false);
      },
      onStateChange: (state) => {
        setEngineState(state);
        if (state === "idle") {
          setError(null);
          onErrorChange?.(null);
        }
        updateStatus(state);
      },
    });

    engine.setLanguage(lang);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [isSupported]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setLanguage(lang);
    }
  }, [lang]);

  const updateStatus = useCallback(
    (state: SpeechEngineState) => {
      switch (state) {
        case "listening":
          onStatusChange?.("Listening...");
          break;
        case "processing":
          onStatusChange?.("Processing...");
          break;
        case "error":
          onStatusChange?.("Error occurred");
          break;
        default:
          onStatusChange?.("Ready");
      }
    },
    [onStatusChange]
  );

  const startRecognition = useCallback(() => {
    if (!engineRef.current || !isSupported || disabled) return;
    setError(null);
    onErrorChange?.(null);
    engineRef.current.start();
  }, [isSupported, disabled, onErrorChange]);

  const stopRecognition = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.stop();
  }, []);

  const cancelRecognition = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.cancel();
    setInterimText("");
    setIsHolding(false);
    setIsToggleMode(false);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || !isSupported || disabled) return;
      e.preventDefault();

      holdTimeoutRef.current = window.setTimeout(() => {
        setIsHolding(true);
        startRecognition();
      }, 150);
    },
    [isSupported, disabled, startRecognition]
  );

  const handleMouseUp = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (isHolding) {
      setIsHolding(false);
      stopRecognition();
    }
  }, [isHolding, stopRecognition]);

  const handleMouseLeave = useCallback(() => {
    if (isHolding) {
      handleMouseUp();
    }
  }, [isHolding, handleMouseUp]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isSupported || disabled) return;
      e.preventDefault();
      touchStartRef.current = true;

      holdTimeoutRef.current = window.setTimeout(() => {
        setIsHolding(true);
        startRecognition();
      }, 150);
    },
    [isSupported, disabled, startRecognition]
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = false;

    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (isHolding) {
      setIsHolding(false);
      stopRecognition();
    }
  }, [isHolding, stopRecognition]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isSupported || disabled) return;

      if (isHolding || touchStartRef.current) {
        return;
      }

      e.preventDefault();

      if (isToggleMode) {
        setIsToggleMode(false);
        stopRecognition();
      } else {
        setIsToggleMode(true);
        startRecognition();
      }
    },
    [isSupported, disabled, isHolding, isToggleMode, startRecognition, stopRecognition]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isSupported || disabled) return;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (engineState === "listening") {
          setIsToggleMode(false);
          stopRecognition();
        } else {
          setIsToggleMode(true);
          startRecognition();
        }
      } else if (e.key === "Escape") {
        cancelRecognition();
      }
    },
    [isSupported, disabled, engineState, startRecognition, stopRecognition, cancelRecognition]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const getMicButtonClasses = useCallback(() => {
    const baseClasses =
      "relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

    if (!isSupported || disabled) {
      return `${baseClasses} bg-gray-200 text-gray-400 cursor-not-allowed`;
    }

    switch (engineState) {
      case "listening":
        return `${baseClasses} bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 animate-pulse`;
      case "processing":
        return `${baseClasses} bg-yellow-500 text-white cursor-wait`;
      case "error":
        return `${baseClasses} bg-red-100 text-red-600 hover:bg-red-200 focus:ring-red-500`;
      default:
        return `${baseClasses} bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500`;
    }
  }, [isSupported, disabled, engineState]);

  const getMicIcon = useCallback(() => {
    if (!isSupported) {
      return <MicOff className="w-6 h-6" />;
    }

    switch (engineState) {
      case "listening":
        return <Mic className="w-6 h-6" />;
      case "processing":
        return <Loader2 className="w-6 h-6 animate-spin" />;
      case "error":
        return <AlertCircle className="w-6 h-6" />;
      default:
        return <Mic className="w-6 h-6" />;
    }
  }, [isSupported, engineState]);

  const getTooltip = useCallback(() => {
    if (!isSupported) {
      return "Speech recognition not supported in this browser";
    }
    if (disabled) {
      return "Voice input is disabled";
    }
    switch (engineState) {
      case "listening":
        return "Release to stop or click to toggle";
      case "processing":
        return "Processing speech...";
      case "error":
        return error?.message || "An error occurred";
      default:
        return "Hold to speak or click to toggle";
    }
  }, [isSupported, disabled, engineState, error]);

  const displayValue = interimText
    ? value
      ? `${value} ${interimText}`
      : interimText
    : value;

  return (
    <div className="w-full max-w-md">
      <label
        htmlFor={`voice-input-${label}`}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>

      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            id={`voice-input-${label}`}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
              interimText ? "text-gray-500 italic" : "text-gray-900"
            } ${error ? "border-red-300" : "border-gray-300"}`}
          />

          {interimText && (
            <div className="absolute -top-8 left-0 right-0 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 truncate">
              {interimText}
            </div>
          )}
        </div>

        <button
          type="button"
          className={getMicButtonClasses()}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          disabled={!isSupported || disabled}
          title={getTooltip()}
          aria-label={getTooltip()}
        >
          {getMicIcon()}

          {engineState === "listening" && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error.message}
        </p>
      )}

      <p className="mt-1 text-xs text-gray-500">
        {isSupported
          ? "Hold mic button to speak, or click to toggle"
          : "Speech recognition not supported - type manually"}
      </p>
    </div>
  );
}
