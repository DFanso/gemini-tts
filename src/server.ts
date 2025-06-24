import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { GeminiTTS } from './gemini-tts';

// Load environment variables
dotenv.config();

const app: express.Application = express();
const PORT = process.env.PORT || 3000;

// Configure multer for form-data handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 50 * 1024 * 1024, // 50MB for large text fields
    fields: 10
  }
});

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

// Job Management System
interface TTSJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  text: string;
  voiceName: string;
  filename?: string;
  outputFilename?: string;
  downloadUrl?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress?: number; // 0-100
}

interface JobQueue {
  [jobId: string]: TTSJob;
}

// In-memory job storage (in production, use Redis or database)
const jobs: JobQueue = {};
const processingQueue: string[] = [];
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10);
let activeJobs = 0;

// Generate unique job ID
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Background job scheduler
function processJobQueue(): void {
  while (activeJobs < MAX_CONCURRENT_JOBS && processingQueue.length > 0) {
    const jobId = processingQueue.shift();
    if (jobId && jobs[jobId]) {
      activeJobs++;
      // Execute job asynchronously
      executeJob(jobId);
    }
  }
}

// Background job executor
async function executeJob(jobId: string) {
  const job = jobs[jobId];
  if (!job) {
    activeJobs--;
    processJobQueue(); // Try to process next job
    return;
  }

  try {
    console.log(`🔄 Starting job ${jobId} (${activeJobs}/${MAX_CONCURRENT_JOBS}): ${job.text.length} characters, voice: ${job.voiceName}`);
    
    // Update job status
    job.status = 'processing';
    job.startedAt = new Date();
    job.progress = 10;

    // Generate unique filename if not provided
    const timestamp = Date.now();
    const outputFilename = job.filename ? 
      `${job.filename.replace(/\.[^/.]+$/, '')}.wav` : 
      `tts_${timestamp}.wav`;
    
    const outputPath = path.join(uploadsDir, outputFilename);
    job.outputFilename = outputFilename;
    job.progress = 25;

    // Convert text to speech
    await tts.textToSpeech(job.text, {
      voiceName: job.voiceName,
      outputFile: outputPath
    });

    job.progress = 80;

    // Get file stats
    const stats = fs.statSync(outputPath);
    const fileSizeKB = Math.round(stats.size / 1024 * 10) / 10;

    // Calculate approximate duration (assuming 24kHz, 16-bit, mono)
    const audioDataSize = stats.size - 44; // Subtract WAV header size
    const durationSeconds = Math.round((audioDataSize / (24000 * 2)) * 10) / 10;

    // Update job with results
    job.status = 'completed';
    job.completedAt = new Date();
    job.downloadUrl = `/download/${outputFilename}`;
    job.duration = durationSeconds;
    job.fileSize = fileSizeKB;
    job.progress = 100;

    console.log(`✅ Job ${jobId} completed: ${outputFilename} (${fileSizeKB}KB, ~${durationSeconds}s)`);

  } catch (error) {
    console.error(`❌ Job ${jobId} failed:`, error);
    job.status = 'failed';
    job.completedAt = new Date();
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.progress = 0;
  } finally {
    activeJobs--;
    // Schedule next job if any
    processJobQueue();
  }
}

// Start job processor as a fallback
setInterval(() => {
  if (processingQueue.length > 0) {
    console.log(`Scheduler check: ${processingQueue.length} jobs pending, ${activeJobs} active.`);
    processJobQueue();
  }
}, 5000);

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

interface JobResponse {
  success: boolean;
  message: string;
  jobId: string;
  status: string;
  estimatedTime?: string;
}

// Routes

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    availableVoices: tts.getAvailableVoices().length,
    activeJobs: Object.values(jobs).filter(job => job.status === 'processing').length,
    queuedJobs: processingQueue.length
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

// Helper function to process TTS job (used by both JSON and form-data endpoints)
async function processTTSRequest(text: string, voiceName: string = 'Kore', filename?: string): Promise<JobResponse> {
  // Validation
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required and cannot be empty');
  }

  if (text.length > 32000) {
    throw new Error('Text is too long. Maximum 32,000 characters allowed.');
  }

  const availableVoices = tts.getAvailableVoices();
  if (!availableVoices.includes(voiceName)) {
    throw new Error(`Invalid voice name. Available voices: ${availableVoices.join(', ')}`);
  }

  // Create job
  const jobId = generateJobId();
  const job: TTSJob = {
    id: jobId,
    status: 'pending',
    text: text,
    voiceName: voiceName,
    filename: filename,
    createdAt: new Date(),
    progress: 0
  };

  // Store job and add to queue
  jobs[jobId] = job;
  processingQueue.push(jobId);

  // Trigger queue processing
  processJobQueue();

  // Estimate processing time (rough calculation: ~1 second per 100 characters)
  const estimatedSeconds = Math.max(5, Math.ceil(text.length / 100));
  const estimatedTime = estimatedSeconds < 60 ? 
    `${estimatedSeconds} seconds` : 
    `${Math.ceil(estimatedSeconds / 60)} minutes`;

  console.log(`📝 Job ${jobId} queued: ${text.length} characters, voice: ${voiceName}`);
  console.log(`⏱️  Estimated processing time: ${estimatedTime}`);

  return {
    success: true,
    message: 'TTS job queued successfully. Processing will begin shortly.',
    jobId: jobId,
    status: 'pending',
    estimatedTime: estimatedTime
  };
}

// Text-to-Speech conversion (Background Processing) - JSON
app.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore', filename }: TTSRequest = req.body;
    const response = await processTTSRequest(text, voiceName, filename);
    res.json(response);
  } catch (error) {
    console.error('❌ TTS Job Creation Error (JSON):', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create TTS job',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Text-to-Speech conversion (Background Processing) - Form Data
app.post('/tts/form', upload.none(), async (req: Request, res: Response) => {
  try {
    const text = req.body.text;
    const voiceName = req.body.voiceName || 'Kore';
    const filename = req.body.filename;

    console.log(`📝 Form-data TTS request received: ${text ? text.length : 0} characters`);
    
    const response = await processTTSRequest(text, voiceName, filename);
    res.json(response);
  } catch (error) {
    console.error('❌ TTS Job Creation Error (Form-data):', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create TTS job',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get job status
app.get('/job/:jobId', (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId;
    const job = jobs[jobId];

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const response = {
      success: true,
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress || 0,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        filename: job.outputFilename,
        downloadUrl: job.downloadUrl,
        duration: job.duration,
        fileSize: job.fileSize,
        error: job.error,
        textLength: job.text.length,
        voiceName: job.voiceName
      }
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Job Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List all jobs
app.get('/jobs', (req: Request, res: Response) => {
  try {
    const { status, limit = 50 } = req.query;
    
    let jobList = Object.values(jobs);
    
    // Filter by status if provided
    if (status && typeof status === 'string') {
      jobList = jobList.filter(job => job.status === status);
    }
    
    // Sort by creation date (newest first)
    jobList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Limit results
    const limitNum = parseInt(limit as string, 10);
    if (limitNum > 0) {
      jobList = jobList.slice(0, limitNum);
    }

    const response = {
      success: true,
      jobs: jobList.map(job => ({
        id: job.id,
        status: job.status,
        progress: job.progress || 0,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        filename: job.outputFilename,
        downloadUrl: job.downloadUrl,
        duration: job.duration,
        fileSize: job.fileSize,
        textLength: job.text.length,
        voiceName: job.voiceName,
        error: job.error
      })),
      count: jobList.length,
      queueLength: processingQueue.length
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Jobs List Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get jobs list',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cancel job
app.delete('/job/:jobId', (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId;
    const job = jobs[jobId];

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.status === 'processing') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel job that is currently processing'
      });
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed or failed job'
      });
    }

    // Remove from queue if pending
    const queueIndex = processingQueue.indexOf(jobId);
    if (queueIndex > -1) {
      processingQueue.splice(queueIndex, 1);
    }

    // Update job status
    job.status = 'failed';
    job.error = 'Job cancelled by user';
    job.completedAt = new Date();

    console.log(`🚫 Job ${jobId} cancelled by user`);

    res.json({
      success: true,
      message: 'Job cancelled successfully',
      jobId: jobId
    });

  } catch (error) {
    console.error('❌ Job Cancellation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel job',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function for synchronous TTS processing
async function processSyncTTS(text: string, voiceName: string = 'Kore'): Promise<TTSResponse> {
  // Validation
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required and cannot be empty');
  }

  if (text.length > 32000) {
    throw new Error('Text is too long. Maximum 32,000 characters allowed.');
  }

  const availableVoices = tts.getAvailableVoices();
  if (!availableVoices.includes(voiceName)) {
    throw new Error(`Invalid voice name. Available voices: ${availableVoices.join(', ')}`);
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

  console.log(`✅ TTS completed (base64): ${fileSizeKB}KB, ~${durationSeconds}s`);

  return {
    success: true,
    message: 'Text-to-speech conversion completed successfully',
    audioData: audioBase64,
    duration: durationSeconds,
    fileSize: fileSizeKB
  };
}

// Text-to-Speech with base64 response (for direct audio data) - SYNCHRONOUS JSON
app.post('/tts/base64', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore' }: TTSRequest = req.body;
    const response = await processSyncTTS(text, voiceName);
    res.json(response);
  } catch (error) {
    console.error('❌ TTS Error (JSON):', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Text-to-speech conversion failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Text-to-Speech with base64 response (for direct audio data) - SYNCHRONOUS Form Data
app.post('/tts/base64/form', upload.none(), async (req: Request, res: Response) => {
  try {
    const text = req.body.text;
    const voiceName = req.body.voiceName || 'Kore';

    console.log(`📝 Form-data TTS base64 request received: ${text ? text.length : 0} characters`);
    
    const response = await processSyncTTS(text, voiceName);
    res.json(response);
  } catch (error) {
    console.error('❌ TTS Error (Form-data):', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Text-to-speech conversion failed',
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
    version: '2.0.0',
    description: 'Text-to-Speech API using Google Gemini with Background Job Processing',
    features: [
      'Background job processing for large texts',
      'Real-time job status tracking',
      'Progress monitoring',
      'Job cancellation',
      'Multiple voice options (30 voices)',
      'Support for 24 languages including Sinhala'
    ],
    endpoints: {
      'GET /': 'API documentation',
      'GET /health': 'Health check with job queue status',
      'GET /voices': 'Get available voices',
      'POST /tts': 'Queue text-to-speech job (background processing) - JSON',
      'POST /tts/form': 'Queue text-to-speech job (background processing) - Form Data',
      'GET /job/:jobId': 'Get job status and progress',
      'GET /jobs': 'List all jobs with filtering',
      'DELETE /job/:jobId': 'Cancel pending job',
      'POST /tts/base64': 'Convert text to speech (synchronous, returns base64 audio) - JSON',
      'POST /tts/base64/form': 'Convert text to speech (synchronous, returns base64 audio) - Form Data',
      'GET /download/:filename': 'Download audio file',
      'GET /files': 'List generated audio files'
    },
    usage: {
      'POST /tts (Background)': {
        description: 'Queue a TTS job for background processing. Returns immediately with job ID.',
        body: {
          text: 'Text to convert to speech (required, max 32,000 chars)',
          voiceName: 'Voice name (optional, default: Kore)',
          filename: 'Output filename (optional, auto-generated if not provided)'
        },
        response: {
          jobId: 'Unique job identifier',
          status: 'Job status (pending)',
          estimatedTime: 'Estimated processing time'
        }
      },
      'GET /job/:jobId': {
        description: 'Check job status and get results when completed',
        response: {
          status: 'pending | processing | completed | failed',
          progress: 'Progress percentage (0-100)',
          downloadUrl: 'Download URL when completed',
          duration: 'Audio duration in seconds',
          fileSize: 'File size in KB'
        }
      }
    },
    jobStatuses: {
      'pending': 'Job is queued and waiting to be processed',
      'processing': 'Job is currently being processed',
      'completed': 'Job completed successfully, audio file ready',
      'failed': 'Job failed due to an error'
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
  console.log('🚀 Gemini TTS API Server v2.0 started with Background Job Processing');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🎵 Available voices: ${tts.getAvailableVoices().length}`);
  console.log(`📁 Upload directory: ${uploadsDir}`);
  console.log('');
  console.log('📖 API Endpoints:');
  console.log(`   GET    http://localhost:${PORT}/              - API documentation`);
  console.log(`   GET    http://localhost:${PORT}/health        - Health check + job queue status`);
  console.log(`   GET    http://localhost:${PORT}/voices        - Available voices`);
  console.log(`   POST   http://localhost:${PORT}/tts           - Queue TTS job (background, JSON)`);
  console.log(`   POST   http://localhost:${PORT}/tts/form      - Queue TTS job (background, Form-data)`);
  console.log(`   GET    http://localhost:${PORT}/job/:jobId    - Get job status & progress`);
  console.log(`   GET    http://localhost:${PORT}/jobs          - List all jobs`);
  console.log(`   DELETE http://localhost:${PORT}/job/:jobId    - Cancel pending job`);
  console.log(`   POST   http://localhost:${PORT}/tts/base64    - TTS (synchronous, base64, JSON)`);
  console.log(`   POST   http://localhost:${PORT}/tts/base64/form - TTS (synchronous, base64, Form-data)`);
  console.log(`   GET    http://localhost:${PORT}/files         - List generated files`);
  console.log(`   GET    http://localhost:${PORT}/download/:file - Download audio file`);
  console.log('');
  console.log('🔄 Background Processing Features:');
  console.log('   ✅ Immediate response with job ID');
  console.log('   ✅ Real-time progress tracking');
  console.log('   ✅ Job status monitoring');
  console.log('   ✅ Queue management');
  console.log('   ✅ Job cancellation support');
  console.log('');
});

export default app; 