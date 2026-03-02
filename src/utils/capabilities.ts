export function isWebSpeechSupported(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  return !!SpeechRecognition;
}

export function isMicrophoneAvailable(): Promise<boolean> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return Promise.resolve(false);
  }

  return navigator.mediaDevices
    .enumerateDevices()
    .then((devices) => devices.some((device) => device.kind === "audioinput"))
    .catch(() => false);
}

export function getBrowserInfo(): {
  name: string;
  isSupported: boolean;
  message: string;
} {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes("chrome") && !userAgent.includes("edg")) {
    return {
      name: "Chrome",
      isSupported: true,
      message: "Full speech recognition support.",
    };
  }

  if (userAgent.includes("edg")) {
    return {
      name: "Edge",
      isSupported: true,
      message: "Full speech recognition support.",
    };
  }

  if (userAgent.includes("firefox")) {
    return {
      name: "Firefox",
      isSupported: false,
      message:
        "Speech recognition is not supported in Firefox. Please use Chrome or Edge.",
    };
  }

  if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
    return {
      name: "Safari",
      isSupported: false,
      message:
        "Speech recognition has limited support in Safari. Please use Chrome or Edge for best experience.",
    };
  }

  return {
    name: "Unknown",
    isSupported: isWebSpeechSupported(),
    message: isWebSpeechSupported()
      ? "Speech recognition may work in this browser."
      : "Speech recognition is not supported in this browser.",
  };
}
