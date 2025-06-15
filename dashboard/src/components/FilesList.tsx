import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileAudio, 
  Download, 
  Calendar, 
  HardDrive, 
  Loader2,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react';
import { ttsApi } from '../services/api';

export const FilesList: React.FC = () => {
  const [playingFile, setPlayingFile] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: files, isLoading } = useQuery({
    queryKey: ['files'],
    queryFn: ttsApi.getFiles,
    refetchInterval: 10000, // Refresh every 10 seconds
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

  const playAudio = async (filename: string) => {
    try {
      setLoadingAudio(filename);
      setAudioError(null);

      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Get audio blob from API
      const blob = await ttsApi.downloadFile(filename);
      const audioUrl = window.URL.createObjectURL(blob);

      // Create and configure audio element
      const audio = new Audio(audioUrl);
      audio.volume = isMuted ? 0 : volume;
      audioRef.current = audio;

      // Set up event listeners
      audio.onloadeddata = () => {
        setLoadingAudio(null);
        setPlayingFile(filename);
      };

      audio.onended = () => {
        setPlayingFile(null);
        window.URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setLoadingAudio(null);
        setAudioError(filename);
        window.URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      // Start playing
      await audio.play();
    } catch (error) {
      console.error('Audio playback failed:', error);
      setLoadingAudio(null);
      setAudioError(filename);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingFile(null);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? volume : 0;
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatFileSize = (kb: number) => {
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading files...</span>
        </div>
      </div>
    );
  }

  if (!files || files.files.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No audio files found</h3>
          <p className="text-gray-500">Generated audio files will appear here once TTS jobs are completed.</p>
        </div>
      </div>
    );
  }

  const totalSize = files.files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">Audio Files Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div className="flex items-center">
                <FileAudio className="h-4 w-4 mr-2" />
                <span>{files.count} files</span>
              </div>
              <div className="flex items-center">
                <HardDrive className="h-4 w-4 mr-2" />
                <span>{formatFileSize(totalSize)} total</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <FileAudio className="h-12 w-12 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {files.files.map((file) => (
          <div key={file.filename} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <FileAudio className="h-8 w-8 text-blue-600 mr-3" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {file.filename}
                  </h4>
                  <p className="text-xs text-gray-500">WAV Audio</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <HardDrive className="h-4 w-4 mr-2" />
                <span>{formatFileSize(file.size)}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{formatDate(file.created)}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              {/* Play/Pause Button */}
              <button
                onClick={() => {
                  if (playingFile === file.filename) {
                    stopAudio();
                  } else {
                    playAudio(file.filename);
                  }
                }}
                disabled={loadingAudio === file.filename}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center text-sm"
              >
                {loadingAudio === file.filename ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : playingFile === file.filename ? (
                  <Pause className="h-4 w-4 mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                {loadingAudio === file.filename ? 'Loading...' : playingFile === file.filename ? 'Pause' : 'Play'}
              </button>

              {/* Download Button */}
              <button
                onClick={() => downloadFile(file.filename)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center text-sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </button>
            </div>

            {/* Audio Error Message */}
            {audioError === file.filename && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-700">
                  ❌ Failed to play audio. Try downloading the file instead.
                </p>
              </div>
            )}

            {/* Now Playing Indicator */}
            {playingFile === file.filename && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center text-xs text-green-700">
                  <div className="flex space-x-1 mr-2">
                    <div className="w-1 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="w-1 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>🎵 Now Playing</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 