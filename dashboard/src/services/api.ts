import axios from 'axios';
import type { 
  JobsResponse, 
  JobResponse, 
  JobCreateResponse, 
  JobRetryResponse,
  HealthResponse, 
  VoicesResponse, 
  FilesResponse 
} from '../types/api';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const ttsApi = {
  // Health check
  getHealth: async (): Promise<HealthResponse> => {
    const response = await api.get('/health');
    return response.data;
  },

  // Get available voices
  getVoices: async (): Promise<VoicesResponse> => {
    const response = await api.get('/voices');
    return response.data;
  },

  // Create TTS job (JSON)
  createJobJSON: async (text: string, voiceName: string, filename?: string): Promise<JobCreateResponse> => {
    const response = await api.post('/tts', {
      text,
      voiceName,
      filename,
    });
    return response.data;
  },

  // Create TTS job (Form Data)
  createJobFormData: async (text: string, voiceName: string, filename?: string): Promise<JobCreateResponse> => {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('voiceName', voiceName);
    if (filename) {
      formData.append('filename', filename);
    }

    const response = await api.post('/tts/form', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get job status
  getJob: async (jobId: string): Promise<JobResponse> => {
    const response = await api.get(`/job/${jobId}`);
    return response.data;
  },

  // Get all jobs
  getJobs: async (status?: string, limit?: number): Promise<JobsResponse> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    
    const response = await api.get(`/jobs?${params.toString()}`);
    return response.data;
  },

  // Cancel job
  cancelJob: async (jobId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/job/${jobId}`);
    return response.data;
  },

  // Retry failed job
  retryJob: async (jobId: string): Promise<JobRetryResponse> => {
    const response = await api.post(`/job/${jobId}/retry`);
    return response.data;
  },

  // Get files
  getFiles: async (): Promise<FilesResponse> => {
    const response = await api.get('/files');
    return response.data;
  },

  // Download file
  downloadFile: async (filename: string): Promise<Blob> => {
    const response = await api.get(`/download/${filename}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Create TTS job with base64 response (JSON)
  createBase64JobJSON: async (text: string, voiceName: string): Promise<{ success: boolean; message: string; audioData: string; duration: number; fileSize: number }> => {
    const response = await api.post('/tts/base64', {
      text,
      voiceName,
    });
    return response.data;
  },

  // Create TTS job with base64 response (Form Data)
  createBase64JobFormData: async (text: string, voiceName: string): Promise<{ success: boolean; message: string; audioData: string; duration: number; fileSize: number }> => {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('voiceName', voiceName);

    const response = await api.post('/tts/base64/form', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
}; 