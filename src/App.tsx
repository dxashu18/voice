import { useState, useCallback } from "react";
import { VoiceInputField } from "./components/VoiceInputField";
import {
  LanguageSelect,
  getStoredLanguage,
} from "./components/LanguageSelect";
import { isWebSpeechSupported, getBrowserInfo } from "./utils/capabilities";
import { SpeechEngineError } from "./engines/SpeechEngine";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import "./App.css";

function App() {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState(getStoredLanguage);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<SpeechEngineError | null>(null);

  const isSupported = isWebSpeechSupported();
  const browserInfo = getBrowserInfo();

  const handleStatusChange = useCallback((newStatus: string) => {
    setStatus(newStatus);
  }, []);

  const handleErrorChange = useCallback(
    (newError: SpeechEngineError | null) => {
      setError(newError);
    },
    []
  );

  const handleLanguageChange = useCallback((newLang: string) => {
    setLanguage(newLang);
  }, []);

  const getStatusColor = () => {
    if (error) return "text-red-600";
    if (status === "Listening...") return "text-green-600";
    if (status === "Processing...") return "text-yellow-600";
    return "text-gray-600";
  };

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="w-5 h-5" />;
    if (status === "Listening...") return <CheckCircle className="w-5 h-5" />;
    return <Info className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Voice Input Demo
          </h1>
          <p className="text-gray-600">
            Speak to fill in the form field using your voice
          </p>
        </header>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="mb-6">
            <LanguageSelect
              value={language}
              onChange={handleLanguageChange}
              disabled={!isSupported}
            />
          </div>

          <div className="mb-6">
            <VoiceInputField
              label="Name"
              value={name}
              onChange={setName}
              lang={language}
              onLangChange={handleLanguageChange}
              placeholder="Enter your name or speak..."
              onStatusChange={handleStatusChange}
              onErrorChange={handleErrorChange}
            />
          </div>

          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              error
                ? "bg-red-50"
                : status === "Listening..."
                ? "bg-green-50"
                : "bg-gray-50"
            }`}
          >
            <span className={getStatusColor()}>{getStatusIcon()}</span>
            <span className={`font-medium ${getStatusColor()}`}>
              Status: {error ? error.message : status}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Browser Compatibility
          </h2>
          <div
            className={`p-4 rounded-lg ${
              isSupported ? "bg-green-50" : "bg-yellow-50"
            }`}
          >
            <div className="flex items-start gap-3">
              {isSupported ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-medium ${
                    isSupported ? "text-green-800" : "text-yellow-800"
                  }`}
                >
                  {browserInfo.name} -{" "}
                  {isSupported ? "Supported" : "Not Supported"}
                </p>
                <p
                  className={`text-sm ${
                    isSupported ? "text-green-700" : "text-yellow-700"
                  }`}
                >
                  {browserInfo.message}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            How to Use
          </h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-500">1.</span>
              <span>
                Select your preferred language from the dropdown above
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-500">2.</span>
              <span>
                Hold the microphone button and speak, or click to toggle
                listening mode
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-500">3.</span>
              <span>
                Release the button or click again to stop and commit your speech
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-500">4.</span>
              <span>
                Use keyboard: Space/Enter to toggle, Escape to cancel
              </span>
            </li>
          </ul>
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500">
          <p className="mb-2">
            Privacy Note: Your browser may process audio remotely for speech
            recognition.
          </p>
          <p>
            Best experience in Chrome or Edge. Firefox and Safari have limited
            support.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
