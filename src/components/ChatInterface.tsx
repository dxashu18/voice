import { useState, useCallback, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Loader2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { ChatMessageBubble } from "./ChatMessage";
import {
  ChatMessage,
  streamChatResponse,
} from "../services/grokApi";
import { WebSpeechEngine } from "../engines/WebSpeechEngine";
import { SpeechEngineState } from "../engines/SpeechEngine";
import { isWebSpeechSupported } from "../utils/capabilities";
import { normalizeInterim } from "../utils/normalize";
import { ttsService } from "../services/ttsService";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isSpeaking?: boolean;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [engineState, setEngineState] = useState<SpeechEngineState>("idle");
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(ttsService.isSupported());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const autoSendRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sendMessageRef = useRef<() => void>(() => {});
  const engineRef = useRef<WebSpeechEngine | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isSupported = isWebSpeechSupported();

  // Speak assistant response helper
  const speakResponse = useCallback(
    (text: string, messageId: string) => {
      if (!ttsEnabled) return;
      // Stop any ongoing STT to avoid feedback
      if (engineRef.current && isListening) {
        engineRef.current.stop();
        setIsListening(false);
      }
      setSpeakingMessageId(messageId);
      setIsSpeaking(true);
      ttsService.speak(text, () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      });
    },
    [ttsEnabled, isListening]
  );

  // Initialize speech engine
  useEffect(() => {
    if (!isSupported) return;

    const engine = new WebSpeechEngine({
      onPartial: (text) => {
        const normalized = normalizeInterim(text);
        setInputValue((prev) => {
          const base = prev.replace(/\s*\[.*?\]\s*$/, "");
          return base ? `${base} [${normalized}]` : `[${normalized}]`;
        });
      },
      onFinal: (text) => {
        const normalized = text.trim().replace(/\s+/g, " ");
        setInputValue(normalized);
        autoSendRef.current = true;
      },
      onError: () => {
        setIsListening(false);
      },
      onStateChange: (state) => {
        setEngineState(state);
        if (state === "idle") {
          setIsListening(false);
        }
      },
    });

    engine.setLanguage("en-US");
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [isSupported]);

  // Auto-send after voice input finishes
  useEffect(() => {
    if (autoSendRef.current && inputValue.trim() && !isGenerating) {
      autoSendRef.current = false;
      // Small delay to let the UI update with the transcribed text
      const timer = setTimeout(() => {
        sendMessageRef.current();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [inputValue, isGenerating]);

  // TTS speaking change listener
  useEffect(() => {
    const unsub = ttsService.onSpeakingChange((speaking) => {
      setIsSpeaking(speaking);
      if (!speaking) setSpeakingMessageId(null);
    });
    return unsub;
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Send initial greeting on mount
  useEffect(() => {
    const greet = async () => {
      setIsGenerating(true);
      setStreamingContent("");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      let accumulated = "";

      await streamChatResponse(
        [],
        (chunk) => {
          accumulated += chunk;
          setStreamingContent(accumulated);
        },
        () => {
          const greetId = crypto.randomUUID();
          const greeting: DisplayMessage = {
            id: greetId,
            role: "assistant",
            content: accumulated,
          };
          setMessages([greeting]);
          setStreamingContent("");
          setIsGenerating(false);
          speakResponse(accumulated, greetId);
        },
        (error) => {
          console.error("Greeting error:", error);
          const fbId = crypto.randomUUID();
          const fallback: DisplayMessage = {
            id: fbId,
            role: "assistant",
            content:
              "Hello! I'm here to help you register. Let's start with your full name. What is it?",
          };
          setMessages([fallback]);
          setStreamingContent("");
          setIsGenerating(false);
          speakResponse(fallback.content, fbId);
        },
        controller.signal
      );
    };

    greet();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [speakResponse]);

  const toggleVoice = useCallback(() => {
    if (!engineRef.current || !isSupported) return;

    // Stop TTS when user wants to speak
    if (!isListening) {
      ttsService.stop();
    }

    if (isListening) {
      engineRef.current.stop();
      setIsListening(false);
    } else {
      engineRef.current.start();
      setIsListening(true);
    }
  }, [isSupported, isListening]);

  const sendMessage = useCallback(async () => {
    const text = inputValue
      .replace(/\s*\[.*?\]\s*$/, "")
      .trim();
    if (!text || isGenerating) return;

    // Stop voice if active
    if (isListening && engineRef.current) {
      engineRef.current.stop();
      setIsListening(false);
    }

    const userMessage: DisplayMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsGenerating(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Build API messages from display messages
    const apiMessages: ChatMessage[] = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let accumulated = "";

    await streamChatResponse(
      apiMessages,
      (chunk) => {
        accumulated += chunk;
        setStreamingContent(accumulated);
      },
      () => {
        const msgId = crypto.randomUUID();
        const assistantMessage: DisplayMessage = {
          id: msgId,
          role: "assistant",
          content: accumulated,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent("");
        setIsGenerating(false);
        speakResponse(accumulated, msgId);
      },
      (error) => {
        console.error("Chat error:", error);
        const errorMessage: DisplayMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
        setStreamingContent("");
        setIsGenerating(false);
      },
      controller.signal
    );
  }, [inputValue, messages, isGenerating, isListening, speakResponse]);

  // Keep sendMessageRef updated for auto-send
  sendMessageRef.current = sendMessage;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const toggleTts = useCallback(() => {
    const newVal = !ttsEnabled;
    setTtsEnabled(newVal);
    ttsService.setEnabled(newVal);
    if (!newVal) {
      ttsService.stop();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  }, [ttsEnabled]);

  const resetChat = useCallback(() => {
    abortControllerRef.current?.abort();
    ttsService.stop();
    setMessages([]);
    setStreamingContent("");
    setIsGenerating(false);
    setInputValue("");
    setIsSpeaking(false);
    setSpeakingMessageId(null);

    // Re-trigger greeting
    const greet = async () => {
      setIsGenerating(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      let accumulated = "";

      await streamChatResponse(
        [],
        (chunk) => {
          accumulated += chunk;
          setStreamingContent(accumulated);
        },
        () => {
          const gId = crypto.randomUUID();
          const greeting: DisplayMessage = {
            id: gId,
            role: "assistant",
            content: accumulated,
          };
          setMessages([greeting]);
          setStreamingContent("");
          setIsGenerating(false);
          speakResponse(accumulated, gId);
        },
        () => {
          const fId = crypto.randomUUID();
          const fallback: DisplayMessage = {
            id: fId,
            role: "assistant",
            content:
              "Hello! I'm here to help you register. Let's start with your full name.",
          };
          setMessages([fallback]);
          setStreamingContent("");
          setIsGenerating(false);
          speakResponse(fallback.content, fId);
        },
        controller.signal
      );
    };
    greet();
  }, [speakResponse]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white text-lg font-bold">R</span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">
              Registration Assistant
            </h2>
            <p className="text-xs text-gray-500">
              {isSpeaking
                ? "Speaking..."
                : isGenerating
                ? "Typing..."
                : "Online"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {ttsService.isSupported() && (
            <button
              onClick={toggleTts}
              className={`p-2 rounded-lg transition-colors ${
                ttsEnabled
                  ? "text-purple-500 hover:bg-purple-50"
                  : "text-gray-400 hover:bg-gray-100"
              }`}
              title={ttsEnabled ? "Mute voice responses" : "Enable voice responses"}
            >
              {ttsEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={resetChat}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Start new registration"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isSpeaking={msg.role === "assistant" && speakingMessageId === msg.id}
          />
        ))}

        {streamingContent && (
          <ChatMessageBubble
            role="assistant"
            content={streamingContent}
            isStreaming
          />
        )}

        {isGenerating && !streamingContent && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white p-3">
        <div className="flex items-end gap-2">
          {/* Voice button */}
          {isSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              disabled={isGenerating}
              className={`flex-shrink-0 p-2.5 rounded-full transition-all duration-200 ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {engineState === "listening" ? (
                <MicOff className="w-5 h-5" />
              ) : engineState === "processing" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening ? "Listening..." : "Type or speak your response..."
              }
              rows={1}
              disabled={isGenerating}
              className="w-full resize-none rounded-2xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed max-h-24 overflow-y-auto"
              style={{ minHeight: "42px" }}
            />
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={sendMessage}
            disabled={
              !inputValue.replace(/\s*\[.*?\]\s*$/, "").trim() || isGenerating
            }
            className="flex-shrink-0 p-2.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {isListening && (
          <p className="text-xs text-red-500 mt-1.5 ml-12 animate-pulse">
            Listening... speak now
          </p>
        )}
      </div>
    </div>
  );
}
