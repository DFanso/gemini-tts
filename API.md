# Gemini TTS API Documentation

A RESTful API for converting text to speech using Google's Gemini TTS models.

## Base URL
```
http://localhost:3000
```

## Authentication
Set your Gemini API key as an environment variable:
```bash
GEMINI_API_KEY=your_api_key_here
```

## Endpoints

### 1. API Documentation
**GET** `/`

Returns API information and available endpoints.

**Response:**
```json
{
  "name": "Gemini TTS API",
  "version": "1.0.0",
  "description": "Text-to-Speech API using Google Gemini",
  "endpoints": {
    "GET /": "API documentation",
    "GET /health": "Health check",
    "GET /voices": "Get available voices",
    "POST /tts": "Convert text to speech (returns file info)",
    "POST /tts/base64": "Convert text to speech (returns base64 audio)",
    "GET /download/:filename": "Download audio file",
    "GET /files": "List generated audio files"
  }
}
```

### 2. Health Check
**GET** `/health`

Check if the API is running and healthy.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "availableVoices": 30
}
```

### 3. Get Available Voices
**GET** `/voices`

Get list of all available voice options.

**Response:**
```json
{
  "success": true,
  "voices": [
    "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda",
    "Orus", "Aoede", "Callirrhoe", "Autonoe", "Enceladus", 
    "Iapetus", "Umbriel", "Algieba", "Despina", "Erinome", 
    "Algenib", "Rasalgethi", "Laomedeia", "Achernar", 
    "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", 
    "Zubenelgenubi", "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat"
  ],
  "count": 30
}
```

### 4. Text-to-Speech (File Response)
**POST** `/tts`

Convert text to speech and save as a file on the server.

**Request Body:**
```json
{
  "text": "Hello, this is a test message in Sinhala: ආයුබෝවන්!",
  "voiceName": "Kore",
  "filename": "my_audio"
}
```

**Parameters:**
- `text` (required): Text to convert to speech (max 32,000 characters)
- `voiceName` (optional): Voice name (default: "Kore")
- `filename` (optional): Custom filename (auto-generated if not provided)

**Response:**
```json
{
  "success": true,
  "message": "Text-to-speech conversion completed successfully",
  "filename": "my_audio_1642248600000.wav",
  "downloadUrl": "/download/my_audio_1642248600000.wav",
  "duration": 3.2,
  "fileSize": 156.8
}
```

### 5. Text-to-Speech (Base64 Response)
**POST** `/tts/base64`

Convert text to speech and return audio data as base64.

**Request Body:**
```json
{
  "text": "Hello, this is a test message!",
  "voiceName": "Puck"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Text-to-speech conversion completed successfully",
  "audioData": "UklGRiQAAABXQVZFZm10IBAAAAABAAEA...",
  "duration": 2.1,
  "fileSize": 102.4
}
```

### 6. Download Audio File
**GET** `/download/:filename`

Download a generated audio file.

**Parameters:**
- `filename`: Name of the audio file to download

**Response:**
- Content-Type: `audio/wav`
- Content-Disposition: `attachment; filename="filename.wav"`
- Binary audio data

### 7. List Generated Files
**GET** `/files`

Get list of all generated audio files.

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "filename": "tts_1642248600000.wav",
      "size": 156.8,
      "created": "2024-01-15T10:30:00.000Z",
      "downloadUrl": "/download/tts_1642248600000.wav"
    }
  ],
  "count": 1
}
```

## Voice Options

The API supports 30 different voices with various characteristics:

| Voice | Style | Voice | Style |
|-------|-------|-------|-------|
| Zephyr | Bright | Puck | Upbeat |
| Charon | Informative | Kore | Firm |
| Fenrir | Excitable | Leda | Youthful |
| Orus | Firm | Aoede | Breezy |
| Autonoe | Bright | Enceladus | Breathy |
| Umbriel | Easy-going | Algieba | Smooth |
| Erinome | Clear | Algenib | Gravelly |
| Laomedeia | Upbeat | Achernar | Soft |
| Schedar | Even | Gacrux | Mature |
| Achird | Friendly | Zubenelgenubi | Casual |
| Sadachbia | Lively | Sadaltager | Knowledgeable |
| Callirrhoe | Easy-going | Iapetus | Clear |
| Despina | Smooth | Rasalgethi | Informative |
| Alnilam | Firm | Pulcherrima | Forward |
| Vindemiatrix | Gentle | Sulafat | Warm |

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (invalid input)
- `404` - Not Found (file not found)
- `500` - Internal Server Error

## Usage Examples

### cURL Examples

**Convert text to speech:**
```bash
curl -X POST http://localhost:3000/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "ආයුබෝවන්! මේ සිංහල පරීක්ෂණ පණිවිඩයකි.",
    "voiceName": "Kore",
    "filename": "sinhala_test"
  }'
```

**Get available voices:**
```bash
curl http://localhost:3000/voices
```

**Download audio file:**
```bash
curl -O http://localhost:3000/download/sinhala_test_1642248600000.wav
```

### JavaScript/TypeScript Example

```typescript
// Convert text to speech
const response = await fetch('http://localhost:3000/tts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Hello, this is a test!',
    voiceName: 'Puck',
    filename: 'test_audio'
  })
});

const result = await response.json();
console.log('Audio file:', result.filename);

// Download the file
const audioResponse = await fetch(`http://localhost:3000${result.downloadUrl}`);
const audioBlob = await audioResponse.blob();
```

### Python Example

```python
import requests

# Convert text to speech
response = requests.post('http://localhost:3000/tts', json={
    'text': 'Hello from Python!',
    'voiceName': 'Kore',
    'filename': 'python_test'
})

result = response.json()
print(f"Generated: {result['filename']}")

# Download the file
audio_response = requests.get(f"http://localhost:3000{result['downloadUrl']}")
with open(result['filename'], 'wb') as f:
    f.write(audio_response.content)
```

## Supported Languages

The Gemini TTS API supports 24 languages including:
- English (US, India)
- Arabic, German, Spanish, French
- Hindi, Indonesian, Italian, Japanese, Korean
- Portuguese, Russian, Dutch, Polish
- Thai, Turkish, Vietnamese, Romanian, Ukrainian
- Bengali, Marathi, Tamil, Telugu

*Note: Sinhala may work through auto-detection even though not officially listed.*

## Rate Limits

- Maximum text length: 32,000 characters per request
- File upload limit: 10MB
- No specific rate limits implemented (depends on Gemini API limits)

## File Management

- Generated files are stored in the `uploads/` directory
- Files are automatically timestamped to prevent conflicts
- No automatic cleanup implemented (files persist until manually deleted)

## Starting the Server

```bash
# Development mode
pnpm dev

# Production mode
pnpm build
pnpm start
```

The server will start on `http://localhost:3000` by default. 