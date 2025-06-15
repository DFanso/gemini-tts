# Quick Setup Guide

## 1. Install pnpm (if not already installed)

```bash
npm install -g pnpm
```

## 2. Install dependencies

```bash
pnpm install
```

## 3. Set up your API key

Create a `.env` file in the root directory:

```bash
# Windows
echo GEMINI_API_KEY=your_actual_api_key_here > .env

# Linux/Mac
echo "GEMINI_API_KEY=your_actual_api_key_here" > .env
```

**Get your API key from:** https://aistudio.google.com/app/apikey

## 4. Run the application

```bash
# Development mode (recommended)
pnpm dev

# Or build and run
pnpm build
pnpm start
```

## 5. Check the output

The application will:
1. Read the Sinhala text from `text.txt`
2. Convert it to speech using Gemini TTS
3. Save the audio as `sinhala_text_audio.wav`

## Troubleshooting

- Make sure your API key is valid and has TTS access
- Ensure `text.txt` exists and contains text
- Check that you have Node.js 18+ installed

## Next Steps

- Try different voices by modifying the `voiceName` in `src/index.ts`
- Replace the content in `text.txt` with your own text
- Experiment with different output filenames 