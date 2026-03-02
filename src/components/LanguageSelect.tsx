import { useEffect } from "react";

const STORAGE_KEY = "voice-input-language";

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en-US", name: "English (US)", nativeName: "English" },
  { code: "hi-IN", name: "Hindi", nativeName: "हिन्दी" },
  { code: "es-ES", name: "Spanish", nativeName: "Español" },
  { code: "ar-SA", name: "Arabic", nativeName: "العربية" },
  { code: "fr-FR", name: "French", nativeName: "Français" },
  { code: "ru-RU", name: "Russian", nativeName: "Русский" },
  { code: "tg-TJ", name: "Tajik", nativeName: "Тоҷикӣ" },
];

export function getStoredLanguage(): string {
  if (typeof window === "undefined") {
    return "en-US";
  }
  return localStorage.getItem(STORAGE_KEY) || "en-US";
}

export function setStoredLanguage(lang: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, lang);
  }
}

interface LanguageSelectProps {
  value: string;
  onChange: (lang: string) => void;
  disabled?: boolean;
  className?: string;
}

export function LanguageSelect({
  value,
  onChange,
  disabled = false,
  className = "",
}: LanguageSelectProps) {
  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored !== value) {
      onChange(stored);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setStoredLanguage(newLang);
    onChange(newLang);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label
        htmlFor="language-select"
        className="text-sm font-medium text-gray-700"
      >
        Language:
      </label>
      <select
        id="language-select"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="block w-48 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name} ({lang.nativeName})
          </option>
        ))}
      </select>
    </div>
  );
}
