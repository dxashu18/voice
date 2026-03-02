type TTSCallback = () => void;

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private enabled: boolean = true;
  private onSpeakingChangeCallbacks: Array<(speaking: boolean) => void> = [];

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
    }
  }

  isSupported(): boolean {
    return this.synth !== null;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  isSpeaking(): boolean {
    return this.synth?.speaking ?? false;
  }

  onSpeakingChange(callback: (speaking: boolean) => void): () => void {
    this.onSpeakingChangeCallbacks.push(callback);
    return () => {
      this.onSpeakingChangeCallbacks = this.onSpeakingChangeCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  private notifySpeakingChange(speaking: boolean): void {
    for (const cb of this.onSpeakingChangeCallbacks) {
      cb(speaking);
    }
  }

  speak(text: string, onEnd?: TTSCallback): void {
    if (!this.synth || !this.enabled || !text.trim()) {
      onEnd?.();
      return;
    }

    // Cancel any ongoing speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to pick a natural-sounding English voice
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.toLowerCase().includes("natural") ||
          v.name.toLowerCase().includes("google") ||
          v.name.toLowerCase().includes("samantha") ||
          v.name.toLowerCase().includes("daniel"))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    } else {
      const englishVoice = voices.find((v) => v.lang.startsWith("en"));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
    }

    utterance.onstart = () => {
      this.notifySpeakingChange(true);
    };

    utterance.onend = () => {
      this.notifySpeakingChange(false);
      onEnd?.();
    };

    utterance.onerror = (event) => {
      // "interrupted" and "canceled" are expected when we call stop()
      if (event.error !== "interrupted" && event.error !== "canceled") {
        console.error("TTS error:", event.error);
      }
      this.notifySpeakingChange(false);
      onEnd?.();
    };

    this.synth.speak(utterance);
  }

  stop(): void {
    if (this.synth?.speaking) {
      this.synth.cancel();
      this.notifySpeakingChange(false);
    }
  }
}

// Singleton instance
export const ttsService = new TTSService();
