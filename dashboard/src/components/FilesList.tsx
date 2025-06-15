import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileAudio, 
  Download, 
  Calendar, 
  HardDrive, 
  Loader2,
  Music
} from 'lucide-react';
import { ttsApi } from '../services/api';

export const FilesList: React.FC = () => {
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
          <FileAudio className="h-12 w-12 text-blue-600" />
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
              <button
                onClick={() => downloadFile(file.filename)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center text-sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 