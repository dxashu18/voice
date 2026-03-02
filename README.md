# Voice Input Feature

A production-quality voice input feature for web apps that converts speech to text and inserts it into form fields, similar to Google Keyboard.

## Features

- **Low perceived latency**: Shows interim transcript quickly while speaking
- **Multilingual support**: Language dropdown with persistent selection (localStorage)
- **Reliable UX**: Clear mic states (idle/listening/processing/error) and graceful error handling
- **Client-only**: Uses browser Web Speech API with fallback to typing-only mode
- **Modular architecture**: Clean SpeechEngine interface for adding future engines (cloud/Vosk)

## How to Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173` (or the next available port).

## Supported Browsers

### Full Support
- **Google Chrome** (desktop and Android): Full speech recognition support
- **Microsoft Edge**: Full speech recognition support

### Limited/No Support
- **Firefox**: Speech recognition API is not supported. The app will work for typing only.
- **Safari**: Limited support. Speech recognition may not work reliably. Use Chrome or Edge for best experience.
- **Mobile Safari (iOS)**: Limited support. Consider using Chrome on iOS for better experience.

## File Structure

```
src/
├── engines/
│   ├── SpeechEngine.ts      # Core interface and types
│   └── WebSpeechEngine.ts   # Web Speech API implementation
├── utils/
│   ├── capabilities.ts      # Browser capability detection
│   └── normalize.ts         # Text normalization for names
├── components/
│   ├── VoiceInputField.tsx  # Main voice input component
│   └── LanguageSelect.tsx   # Language dropdown with persistence
├── App.tsx                  # Demo page
└── App.css                  # Styles
```

## Supported Languages

- English (US) - en-US
- Hindi - hi-IN
- Spanish - es-ES
- Arabic - ar-SA
- French - fr-FR
- Russian - ru-RU
- Tajik - tg-TJ

## Usage

### Basic Usage

```tsx
import { VoiceInputField } from './components/VoiceInputField';
import { LanguageSelect, getStoredLanguage } from './components/LanguageSelect';

function MyForm() {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState(getStoredLanguage);

  return (
    <>
      <LanguageSelect value={language} onChange={setLanguage} />
      <VoiceInputField
        label="Name"
        value={name}
        onChange={setName}
        lang={language}
        onLangChange={setLanguage}
      />
    </>
  );
}
```

### VoiceInputField Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | Yes | Label for the input field |
| `value` | `string` | Yes | Current input value |
| `onChange` | `(value: string) => void` | Yes | Callback when value changes |
| `lang` | `string` | Yes | Language code (e.g., "en-US") |
| `onLangChange` | `(lang: string) => void` | Yes | Callback when language changes |
| `normalizeFinal` | `(text: string) => string` | No | Custom normalization for final text |
| `normalizeInterim` | `(text: string) => string` | No | Custom normalization for interim text |
| `placeholder` | `string` | No | Input placeholder text |
| `disabled` | `boolean` | No | Disable the input and mic button |
| `onStatusChange` | `(status: string) => void` | No | Callback for status updates |
| `onErrorChange` | `(error: SpeechEngineError \| null) => void` | No | Callback for error updates |

### Interaction Modes

1. **Press-and-hold** (Desktop): Hold the mic button to speak, release to stop
2. **Touch** (Mobile): Touch and hold the mic button to speak, release to stop
3. **Toggle mode**: Click/tap the mic button to start, click again to stop
4. **Keyboard**: Space/Enter to toggle listening, Escape to cancel

## Architecture

### SpeechEngine Interface

The `SpeechEngine` interface provides a clean abstraction for speech recognition:

```typescript
interface SpeechEngine {
  start(): void;
  stop(): void;
  cancel(): void;
  setLanguage(lang: string): void;
  getState(): SpeechEngineState;
  destroy(): void;
}
```

### Adding New Engines

To add a new speech recognition engine (e.g., cloud-based or Vosk):

1. Create a new file in `src/engines/` (e.g., `CloudSpeechEngine.ts`)
2. Implement the `SpeechEngine` interface
3. Handle the same callbacks: `onPartial`, `onFinal`, `onError`, `onStateChange`
4. Update `VoiceInputField` to use the new engine based on configuration

## Limitations

1. **Browser dependency**: Speech recognition requires Chrome or Edge for full functionality
2. **Network required**: The Web Speech API typically requires an internet connection as audio is processed remotely
3. **No offline mode**: The current implementation doesn't support offline speech recognition
4. **Single field focus**: The component is designed for single-field dictation (continuous=false)

## Privacy Note

**Important**: When using the Web Speech API, your browser may send audio data to remote servers (e.g., Google's servers for Chrome) for processing. This is handled by the browser, not by this application. Users should be aware that:

- Audio may be transmitted over the internet
- Speech recognition processing happens on external servers
- Different browsers may have different privacy policies

For applications requiring strict privacy, consider implementing a local speech recognition engine (e.g., Vosk) as an alternative.

## Error Handling

The component handles the following error scenarios:

- **Permission denied**: User denied microphone access
- **No speech detected**: No speech was detected during listening
- **Network error**: Connection issues during recognition
- **Audio capture error**: Microphone not available or not working
- **Service not allowed**: Speech recognition service blocked

All errors are displayed to the user with clear messages and the component gracefully falls back to typing mode.

## License

MIT
