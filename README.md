# Gemini TTS - Text-to-Speech with Google Gemini API

A TypeScript application that converts text to speech using Google's Gemini API with native TTS capabilities.

## Features

- 🎤 Convert text files to high-quality speech audio
- 🎵 30 different voice options available
- 🌍 Supports multiple languages (including Sinhala)
- 📁 Easy file-based input
- 🔧 TypeScript for better development experience
- ⚡ Uses the latest Gemini 2.5 TTS models

## Prerequisites

- Node.js 18 or later
- pnpm (recommended) or npm
- A Google Gemini API key

## Installation

1. Clone this repository or download the files
2. Install dependencies:

```bash
pnpm install
```

Or if you prefer npm:
```bash
npm install
```

3. Set up your environment variables:

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**Get your API key from:** https://aistudio.google.com/app/apikey

## Usage

### Quick Start

1. Make sure your text is in the `text.txt` file (it's already there with Sinhala text)
2. Run the application:

```bash
# Development mode (with ts-node)
pnpm dev

# Or build and run
pnpm build
pnpm start
```

3. The audio file will be generated as `sinhala_text_audio.wav`

### Available Voices

The application supports 30 different voices:

- **Bright**: Zephyr, Autonoe
- **Upbeat**: Puck, Laomedeia  
- **Firm**: Kore, Orus, Alnilam
- **Informative**: Charon, Rasalgethi
- **Excitable**: Fenrir
- **Youthful**: Leda
- **Easy-going**: Umbriel, Callirrhoe
- **Clear**: Erinome, Iapetus
- **Breezy**: Aoede
- **Breathy**: Enceladus
- **Smooth**: Algieba, Despina
- **Gravelly**: Algenib
- **Soft**: Achernar
- **Mature**: Gacrux
- **Casual**: Zubenelgenubi
- **Forward**: Pulcherrima
- **Even**: Schedar
- **Friendly**: Achird
- **Lively**: Sadachbia
- **Knowledgeable**: Sadaltager
- **Gentle**: Vindemiatrix
- **Warm**: Sulafat

### Customizing Voice and Output

You can modify the voice and output filename in `src/index.ts`:

```typescript
await tts.convertFileToSpeech('text.txt', {
  voiceName: 'Puck', // Change to any available voice
  outputFile: 'my_custom_audio.wav'
});
```

## Supported Languages

The Gemini TTS API supports 24 languages including:

- English (US, India)
- Arabic (Egyptian)
- German, Spanish, French
- Hindi, Indonesian, Italian
- Japanese, Korean
- Portuguese (Brazil)
- Russian, Dutch, Polish
- Thai, Turkish, Vietnamese
- Romanian, Ukrainian
- Bengali, Marathi, Tamil, Telugu

*Note: While Sinhala isn't officially listed, the API may auto-detect and process it.*

## Project Structure

```
gemini-tts/
├── src/
│   └── index.ts          # Main TypeScript application
├── dist/                 # Compiled JavaScript (after build)
├── text.txt             # Input text file (Sinhala content)
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## Scripts

- `pnpm dev` - Run in development mode with ts-node
- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm start` - Run the compiled JavaScript
- `pnpm clean` - Clean the dist directory

## API Usage

The application uses the Gemini 2.5 Flash Preview TTS model:

```typescript
const response = await this.ai.models.generateContent({
  model: "gemini-2.5-flash-preview-tts",
  contents: [{ 
    role: "user", 
    parts: [{ text: `Please read this text aloud: ${text}` }] 
  }],
  config: {
    responseModalities: ['AUDIO'],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { 
          voiceName: 'Kore' 
        }
      }
    }
  }
});
```

## Error Handling

The application includes comprehensive error handling for:

- Missing API keys
- File reading errors
- API response errors
- Audio file saving errors

## Limitations

- TTS models accept text-only inputs
- Context window limit of 32k tokens
- Audio output is in WAV format at 24kHz
- Preview feature - may have usage limits

## Troubleshooting

### Common Issues

1. **"GEMINI_API_KEY is required"**
   - Make sure you've created a `.env` file with your API key
   - Verify the API key is correct

2. **"Failed to read file text.txt"**
   - Ensure the `text.txt` file exists in the root directory
   - Check file permissions

3. **"No audio data received from Gemini API"**
   - Check your API key has TTS permissions
   - Verify the text isn't too long (32k token limit)

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details.

## References

- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Google AI Studio](https://aistudio.google.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

