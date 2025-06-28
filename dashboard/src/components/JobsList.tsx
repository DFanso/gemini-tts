import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Download, 
  X,
  Eye,
  Calendar,
  User,
  FileText,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { ttsApi } from '../services/api';
import type { TTSJob } from '../types/api';

interface JobsListProps {
  jobs: TTSJob[];
  isLoading: boolean;
}

export const JobsList: React.FC<JobsListProps> = ({ jobs, isLoading }) => {
  const [playingJob, setPlayingJob] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();

  const cancelJobMutation = useMutation({
    mutationFn: ttsApi.cancelJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const retryJobMutation = useMutation({
    mutationFn: ttsApi.retryJob,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      console.log(`✅ Job retried successfully: ${data.message}`);
    },
    onError: (error) => {
      console.error('❌ Failed to retry job:', error);
    },
  });

  const downloadFile = async (filename: string) => {
    try {
      const blob = await ttsApi.downloadFile(filename);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const playJobAudio = async (job: TTSJob) => {
    if (!job.filename) return;

    try {
      setLoadingAudio(job.id);

      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Get audio blob from API
      const blob = await ttsApi.downloadFile(job.filename);
      const audioUrl = window.URL.createObjectURL(blob);

      // Create and configure audio element
      const audio = new Audio(audioUrl);
      audio.volume = 0.7;
      audioRef.current = audio;

      // Set up event listeners
      audio.onloadeddata = () => {
        setLoadingAudio(null);
        setPlayingJob(job.id);
      };

      audio.onended = () => {
        setPlayingJob(null);
        window.URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setLoadingAudio(null);
        window.URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      // Start playing
      await audio.play();
    } catch (error) {
      console.error('Audio playback failed:', error);
      setLoadingAudio(null);
    }
  };

  const stopJobAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingJob(null);
  };

  const getStatusIcon = (status: TTSJob['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadgeClass = (status: TTSJob['status']) => {
    switch (status) {
      case 'pending':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
      case 'completed':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
      case 'failed':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
  };

  const formatFileSize = (kb?: number) => {
    if (!kb) return 'N/A';
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading jobs...</span>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-500">Create your first TTS job to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div key={job.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center mb-2">
                {getStatusIcon(job.status)}
                <span className={`ml-2 ${getStatusBadgeClass(job.status)}`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  Job ID: {job.id.split('_')[1]}
                </span>
                {job.retryCount && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retry {job.retryCount}/3
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <FileText className="h-4 w-4 mr-2" />
                  <span>{job.textLength} characters</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  <span>Voice: {job.voiceName}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{new Date(job.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {job.status === 'processing' && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {job.status === 'completed' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm text-gray-600">
                  <div>Duration: {formatDuration(job.duration)}</div>
                  <div>File Size: {formatFileSize(job.fileSize)}</div>
                  <div>Completed: {job.completedAt ? new Date(job.completedAt).toLocaleTimeString() : 'N/A'}</div>
                </div>
              )}

              {job.status === 'failed' && job.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-red-700">
                    <strong>Error:</strong> {job.error}
                  </p>
                  {job.retryCount && (
                    <p className="text-xs text-red-600 mt-1">
                      Retry attempt: {job.retryCount}/3
                      {job.retryCount >= 3 && (
                        <span className="ml-2 font-medium">- Maximum retries reached</span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {playingJob === job.id && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                  <div className="flex items-center text-sm text-green-700">
                    <div className="flex space-x-1 mr-2">
                      <div className="w-1 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div className="w-1 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span>🎵 Now Playing Audio</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 ml-4">
              {job.status === 'completed' && job.filename && (
                <>
                  <button
                    onClick={() => {
                      if (playingJob === job.id) {
                        stopJobAudio();
                      } else {
                        playJobAudio(job);
                      }
                    }}
                    disabled={loadingAudio === job.id}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center text-sm"
                  >
                    {loadingAudio === job.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : playingJob === job.id ? (
                      <Pause className="h-4 w-4 mr-1" />
                    ) : (
                      <Play className="h-4 w-4 mr-1" />
                    )}
                    {loadingAudio === job.id ? 'Loading...' : playingJob === job.id ? 'Pause' : 'Play'}
                  </button>
                  <button
                    onClick={() => downloadFile(job.filename!)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center text-sm"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </button>
                </>
              )}

              {job.status === 'pending' && (
                <button
                  onClick={() => cancelJobMutation.mutate(job.id)}
                  disabled={cancelJobMutation.isPending}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center text-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </button>
              )}

              {job.status === 'failed' && (job.retryCount || 0) < 3 && (
                <button
                  onClick={() => retryJobMutation.mutate(job.id)}
                  disabled={retryJobMutation.isPending}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center text-sm"
                >
                  {retryJobMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-1" />
                  )}
                  {retryJobMutation.isPending ? 'Retrying...' : 'Retry'}
                </button>
              )}

              <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center text-sm">
                <Eye className="h-4 w-4 mr-1" />
                Details
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}; 