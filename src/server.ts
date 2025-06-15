import express, { Request, Response } from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { GeminiTTS } from './gemini-tts';

// Load environment variables
dotenv.config();

const app: express.Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize Gemini TTS
let tts: GeminiTTS;

try {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is required');
  }
  tts = new GeminiTTS(apiKey);
  console.log('✅ Gemini TTS initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Gemini TTS:', error);
  process.exit(1);
}

// Interfaces
interface TTSRequest {
  text: string;
  voiceName?: string;
  filename?: string;
}

interface TTSResponse {
  success: boolean;
  message: string;
  filename?: string;
  downloadUrl?: string;
  audioData?: string; // base64 encoded audio
  duration?: number;
  fileSize?: number;
}

// Routes

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    availableVoices: tts.getAvailableVoices().length
  });
});

// Get available voices
app.get('/voices', (req: Request, res: Response) => {
  try {
    const voices = tts.getAvailableVoices();
    res.json({
      success: true,
      voices: voices,
      count: voices.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get available voices',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Text-to-Speech conversion
app.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore', filename }: TTSRequest = req.body;

    // Validation
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text is required and cannot be empty'
      });
    }

    if (text.length > 32000) {
      return res.status(400).json({
        success: false,
        message: 'Text is too long. Maximum 32,000 characters allowed.'
      });
    }

    const availableVoices = tts.getAvailableVoices();
    if (!availableVoices.includes(voiceName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid voice name. Available voices: ${availableVoices.join(', ')}`
      });
    }

    // Generate unique filename if not provided
    const timestamp = Date.now();
    const outputFilename = filename ? 
      `${filename.replace(/\.[^/.]+$/, '')}_${timestamp}.wav` : 
      `tts_${timestamp}.wav`;
    
    const outputPath = path.join(uploadsDir, outputFilename);

    console.log(`🎤 Processing TTS request: ${text.length} characters, voice: ${voiceName}`);

    // Convert text to speech
    await tts.textToSpeech(text, {
      voiceName: voiceName,
      outputFile: outputPath
    });

    // Get file stats
    const stats = fs.statSync(outputPath);
    const fileSizeKB = Math.round(stats.size / 1024 * 10) / 10;

    // Calculate approximate duration (assuming 24kHz, 16-bit, mono)
    const audioDataSize = stats.size - 44; // Subtract WAV header size
    const durationSeconds = Math.round((audioDataSize / (24000 * 2)) * 10) / 10;

    const response: TTSResponse = {
      success: true,
      message: 'Text-to-speech conversion completed successfully',
      filename: outputFilename,
      downloadUrl: `/download/${outputFilename}`,
      duration: durationSeconds,
      fileSize: fileSizeKB
    };

    console.log(`✅ TTS completed: ${outputFilename} (${fileSizeKB}KB, ~${durationSeconds}s)`);

    res.json(response);

  } catch (error) {
    console.error('❌ TTS Error:', error);
    res.status(500).json({
      success: false,
      message: 'Text-to-speech conversion failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Text-to-Speech with base64 response (for direct audio data)
app.post('/tts/base64', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore' }: TTSRequest = req.body;

    // Validation (same as above)
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text is required and cannot be empty'
      });
    }

    if (text.length > 32000) {
      return res.status(400).json({
        success: false,
        message: 'Text is too long. Maximum 32,000 characters allowed.'
      });
    }

    const availableVoices = tts.getAvailableVoices();
    if (!availableVoices.includes(voiceName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid voice name. Available voices: ${availableVoices.join(', ')}`
      });
    }

    console.log(`🎤 Processing TTS request (base64): ${text.length} characters, voice: ${voiceName}`);

    // Generate temporary file
    const tempFilename = `temp_${Date.now()}.wav`;
    const tempPath = path.join(uploadsDir, tempFilename);

    // Convert text to speech
    await tts.textToSpeech(text, {
      voiceName: voiceName,
      outputFile: tempPath
    });

    // Read file and convert to base64
    const audioBuffer = fs.readFileSync(tempPath);
    const audioBase64 = audioBuffer.toString('base64');

    // Clean up temp file
    fs.unlinkSync(tempPath);

    // Calculate stats
    const fileSizeKB = Math.round(audioBuffer.length / 1024 * 10) / 10;
    const audioDataSize = audioBuffer.length - 44;
    const durationSeconds = Math.round((audioDataSize / (24000 * 2)) * 10) / 10;

    const response: TTSResponse = {
      success: true,
      message: 'Text-to-speech conversion completed successfully',
      audioData: audioBase64,
      duration: durationSeconds,
      fileSize: fileSizeKB
    };

    console.log(`✅ TTS completed (base64): ${fileSizeKB}KB, ~${durationSeconds}s`);

    res.json(response);

  } catch (error) {
    console.error('❌ TTS Error:', error);
    res.status(500).json({
      success: false,
      message: 'Text-to-speech conversion failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Download audio file
app.get('/download/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    // Security check - ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    console.log(`📥 File downloaded: ${filename}`);

  } catch (error) {
    console.error('❌ Download Error:', error);
    res.status(500).json({
      success: false,
      message: 'File download failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List uploaded files
app.get('/files', (req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(uploadsDir)
      .filter(file => file.endsWith('.wav'))
      .map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: Math.round(stats.size / 1024 * 10) / 10, // KB
          created: stats.birthtime,
          downloadUrl: `/download/${file}`
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    res.json({
      success: true,
      files: files,
      count: files.length
    });

  } catch (error) {
    console.error('❌ Files listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list files',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API documentation
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Gemini TTS API',
    version: '1.0.0',
    description: 'Text-to-Speech API using Google Gemini',
    endpoints: {
      'GET /': 'API documentation',
      'GET /health': 'Health check',
      'GET /voices': 'Get available voices',
      'POST /tts': 'Convert text to speech (returns file info)',
      'POST /tts/base64': 'Convert text to speech (returns base64 audio)',
      'GET /download/:filename': 'Download audio file',
      'GET /files': 'List generated audio files'
    },
    usage: {
      'POST /tts': {
        body: {
          text: 'Text to convert to speech (required)',
          voiceName: 'Voice name (optional, default: Kore)',
          filename: 'Output filename (optional, auto-generated if not provided)'
        }
      }
    }
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Gemini TTS API Server started');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🎵 Available voices: ${tts.getAvailableVoices().length}`);
  console.log(`📁 Upload directory: ${uploadsDir}`);
  console.log('');
  console.log('📖 API Endpoints:');
  console.log(`   GET  http://localhost:${PORT}/          - API documentation`);
  console.log(`   GET  http://localhost:${PORT}/health    - Health check`);
  console.log(`   GET  http://localhost:${PORT}/voices    - Available voices`);
  console.log(`   POST http://localhost:${PORT}/tts       - Text to speech`);
  console.log(`   POST http://localhost:${PORT}/tts/base64 - Text to speech (base64)`);
  console.log(`   GET  http://localhost:${PORT}/files     - List files`);
  console.log('');
});

export default app; 