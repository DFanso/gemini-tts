# Gemini TTS API v2.0 Documentation

A RESTful API for converting text to speech using Google's Gemini TTS models with **Background Job Processing**.

## 🚀 New in v2.0: Background Job Processing

- **Immediate Response**: Submit TTS jobs and get instant response with job ID
- **Real-time Progress**: Monitor job progress from 0-100%
- **Job Management**: List, track, and cancel jobs
- **Large Text Support**: Handle up to 32,000 characters efficiently
- **Queue System**: Process multiple jobs in background

## Base URL
```
http://localhost:3000
```

## Authentication
Set your Gemini API key as an environment variable:
```bash
GEMINI_API_KEY=your_api_key_here
```

## Job Processing Flow

1. **Submit Job**: `POST /tts` → Get `jobId` immediately
2. **Monitor Progress**: `GET /job/:jobId` → Check status & progress
3. **Download Result**: `GET /download/:filename` → Get audio file when completed

## Endpoints

### 1. API Documentation
**GET** `/`

Returns comprehensive API information including background processing features.

**Response:**
```json
{
  "name": "Gemini TTS API",
  "version": "2.0.0",
  "description": "Text-to-Speech API using Google Gemini with Background Job Processing",
  "features": [
    "Background job processing for large texts",
    "Real-time job status tracking",
    "Progress monitoring",
    "Job cancellation",
    "Multiple voice options (30 voices)",
    "Support for 24 languages including Sinhala"
  ],
  "jobStatuses": {
    "pending": "Job is queued and waiting to be processed",
    "processing": "Job is currently being processed",
    "completed": "Job completed successfully, audio file ready",
    "failed": "Job failed due to an error"
  }
}
```

### 2. Health Check
**GET** `/health`

Check API health and job queue status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "availableVoices": 30,
  "activeJobs": 2,
  "queuedJobs": 5
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

### 4. Queue TTS Job (Background Processing) 🆕
**POST** `/tts`

Submit a TTS job for background processing. Returns immediately with job ID.

**Request Body:**
```json
{
  "text": "Your text to convert to speech (max 32,000 characters)",
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
  "message": "TTS job queued successfully. Processing will begin shortly.",
  "jobId": "job_1642248600000_abc123def",
  "status": "pending",
  "estimatedTime": "2 minutes"
}
```

### 5. Get Job Status 🆕
**GET** `/job/:jobId`

Get the status and progress of a specific job.

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "job_1642248600000_abc123def",
    "status": "completed",
    "progress": 100,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "startedAt": "2024-01-15T10:30:05.000Z",
    "completedAt": "2024-01-15T10:32:15.000Z",
    "filename": "my_audio_1642248600000.wav",
    "downloadUrl": "/download/my_audio_1642248600000.wav",
    "duration": 45.2,
    "fileSize": 2156.8,
    "textLength": 1250,
    "voiceName": "Kore"
  }
}
```

**Job Status Values:**
- `pending`: Job is queued and waiting to be processed
- `processing`: Job is currently being processed (shows progress 0-100%)
- `completed`: Job completed successfully, audio file ready for download
- `failed`: Job failed due to an error (check `error` field)

### 6. List All Jobs 🆕
**GET** `/jobs`

Get list of all jobs with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `processing`, `completed`, `failed`)
- `limit` (optional): Limit number of results (default: 50)

**Example:** `GET /jobs?status=completed&limit=10`

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "id": "job_1642248600000_abc123def",
      "status": "completed",
      "progress": 100,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "completedAt": "2024-01-15T10:32:15.000Z",
      "filename": "my_audio_1642248600000.wav",
      "downloadUrl": "/download/my_audio_1642248600000.wav",
      "duration": 45.2,
      "fileSize": 2156.8,
      "textLength": 1250,
      "voiceName": "Kore"
    }
  ],
  "count": 1,
  "queueLength": 3
}
```

### 7. Cancel Job 🆕
**DELETE** `/job/:jobId`

Cancel a pending job. Cannot cancel jobs that are processing or completed.

**Response:**
```json
{
  "success": true,
  "message": "Job cancelled successfully",
  "jobId": "job_1642248600000_abc123def"
}
```

### 8. Text-to-Speech (Synchronous Base64)
**POST** `/tts/base64`

Convert text to speech synchronously and return base64 audio data. **Use for short texts only** to avoid timeouts.

**Request Body:**
```json
{
  "text": "Short text for immediate processing",
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

### 9. Download Audio File
**GET** `/download/:filename`

Download a generated audio file.

**Response:**
- Content-Type: `audio/wav`
- Content-Disposition: `attachment; filename="filename.wav"`
- Binary audio data

### 10. List Generated Files
**GET** `/files`

Get list of all generated audio files.

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "filename": "my_audio_1642248600000.wav",
      "size": 2156.8,
      "created": "2024-01-15T10:32:15.000Z",
      "downloadUrl": "/download/my_audio_1642248600000.wav"
    }
  ],
  "count": 1
}
```

## Usage Examples

### Background Job Processing Workflow

#### 1. Submit Job
```bash
curl -X POST http://localhost:3000/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a long text that will be processed in the background...",
    "voiceName": "Kore",
    "filename": "background_job_test"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "TTS job queued successfully. Processing will begin shortly.",
  "jobId": "job_1642248600000_abc123def",
  "status": "pending",
  "estimatedTime": "2 minutes"
}
```

#### 2. Monitor Progress
```bash
curl http://localhost:3000/job/job_1642248600000_abc123def
```

**Response (Processing):**
```json
{
  "success": true,
  "job": {
    "id": "job_1642248600000_abc123def",
    "status": "processing",
    "progress": 65,
    "startedAt": "2024-01-15T10:30:05.000Z",
    "textLength": 1250,
    "voiceName": "Kore"
  }
}
```

#### 3. Download When Complete
```bash
curl -O http://localhost:3000/download/background_job_test_1642248600000.wav
```

### JavaScript/TypeScript Example

```typescript
// Submit background job
async function submitTTSJob(text: string, voiceName: string = 'Kore') {
  const response = await fetch('http://localhost:3000/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceName })
  });
  
  const result = await response.json();
  console.log('Job submitted:', result.jobId);
  return result.jobId;
}

// Monitor job progress
async function monitorJob(jobId: string) {
  const checkStatus = async () => {
    const response = await fetch(`http://localhost:3000/job/${jobId}`);
    const result = await response.json();
    
    console.log(`Job ${jobId}: ${result.job.status} (${result.job.progress}%)`);
    
    if (result.job.status === 'completed') {
      console.log('Download URL:', result.job.downloadUrl);
      return result.job;
    } else if (result.job.status === 'failed') {
      console.error('Job failed:', result.job.error);
      return null;
    }
    
    // Continue monitoring
    setTimeout(checkStatus, 2000);
  };
  
  checkStatus();
}

// Usage
const jobId = await submitTTSJob("Your long text here...", "Zephyr");
monitorJob(jobId);
```

### Python Example

```python
import requests
import time

def submit_tts_job(text, voice_name='Kore', filename=None):
    """Submit a TTS job for background processing"""
    response = requests.post('http://localhost:3000/tts', json={
        'text': text,
        'voiceName': voice_name,
        'filename': filename
    })
    
    result = response.json()
    print(f"Job submitted: {result['jobId']}")
    print(f"Estimated time: {result['estimatedTime']}")
    return result['jobId']

def monitor_job(job_id):
    """Monitor job progress until completion"""
    while True:
        response = requests.get(f'http://localhost:3000/job/{job_id}')
        result = response.json()
        job = result['job']
        
        print(f"Job {job_id}: {job['status']} ({job.get('progress', 0)}%)")
        
        if job['status'] == 'completed':
            print(f"✅ Job completed!")
            print(f"📁 Filename: {job['filename']}")
            print(f"⏱️  Duration: {job['duration']} seconds")
            print(f"📊 File size: {job['fileSize']} KB")
            
            # Download the file
            download_url = f"http://localhost:3000{job['downloadUrl']}"
            audio_response = requests.get(download_url)
            with open(job['filename'], 'wb') as f:
                f.write(audio_response.content)
            print(f"🎵 Audio saved as: {job['filename']}")
            break
            
        elif job['status'] == 'failed':
            print(f"❌ Job failed: {job.get('error', 'Unknown error')}")
            break
            
        time.sleep(2)  # Check every 2 seconds

# Usage
text = """
This is a comprehensive example of using the Gemini TTS API 
with background job processing. The system efficiently handles 
large texts by processing them asynchronously.
"""

job_id = submit_tts_job(text, 'Kore', 'python_background_test')
monitor_job(job_id)
```

### Sinhala Language Example

```bash
curl -X POST http://localhost:3000/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "ආයුබෝවන්! මේ සිංහල භාෂාවෙන් ලියන ලද පණිවිඩයකි. ගෙමිනි ටීටීඑස් සේවාව සිංහල භාෂාව සහාය කරයි.",
    "voiceName": "Kore",
    "filename": "sinhala_background_test"
  }'
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
- `400` - Bad Request (invalid input, job cannot be cancelled)
- `404` - Not Found (job not found, file not found)
- `500` - Internal Server Error

## Performance & Limits

- **Text Length**: Maximum 32,000 characters per request
- **File Upload**: 10MB limit
- **Processing Time**: ~1 second per 100 characters (estimated)
- **Concurrent Jobs**: No limit (processed sequentially)
- **Job Storage**: In-memory (jobs lost on server restart)

## Production Considerations

For production deployment, consider:

1. **Persistent Job Storage**: Use Redis or database instead of in-memory storage
2. **Job Cleanup**: Implement automatic cleanup of old jobs and files
3. **Rate Limiting**: Add rate limiting per user/IP
4. **Authentication**: Implement proper API authentication
5. **Monitoring**: Add comprehensive logging and monitoring
6. **Scaling**: Use job queue systems like Bull/BullMQ for horizontal scaling

## Supported Languages

The Gemini TTS API supports 24 languages including:
- English (US, India)
- Arabic, German, Spanish, French
- Hindi, Indonesian, Italian, Japanese, Korean
- Portuguese, Russian, Dutch, Polish
- Thai, Turkish, Vietnamese, Romanian, Ukrainian
- Bengali, Marathi, Tamil, Telugu

*Note: Sinhala works through auto-detection even though not officially listed.*

## Starting the Server

```bash
# Development mode with auto-restart
pnpm dev

# Production mode
pnpm build
pnpm start
```

The server will start on `http://localhost:3000` by default with full background job processing capabilities. 