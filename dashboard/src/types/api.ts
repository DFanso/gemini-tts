export interface TTSJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  filename?: string;
  downloadUrl?: string;
  duration?: number;
  fileSize?: number;
  textLength: number;
  voiceName: string;
  error?: string;
  retryCount?: number;
  originalJobId?: string;
}

export interface JobsResponse {
  success: boolean;
  jobs: TTSJob[];
  count: number;
  queueLength: number;
}

export interface JobResponse {
  success: boolean;
  job: TTSJob;
}

export interface JobCreateResponse {
  success: boolean;
  message: string;
  jobId: string;
  status: string;
  estimatedTime: string;
}

export interface JobRetryResponse {
  success: boolean;
  message: string;
  jobId: string;
  originalJobId: string;
  retryCount: number;
  status: string;
  estimatedTime: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  availableVoices: number;
  activeJobs: number;
  queuedJobs: number;
}

export interface VoicesResponse {
  success: boolean;
  voices: string[];
  count: number;
}

export interface FilesResponse {
  success: boolean;
  files: {
    filename: string;
    size: number;
    created: string;
    downloadUrl: string;
  }[];
  count: number;
} 