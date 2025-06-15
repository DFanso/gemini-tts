import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, FileText, Mic, Settings } from 'lucide-react';
import { ttsApi } from '../services/api';

export const CreateJobForm: React.FC = () => {
  const [text, setText] = useState('');
  const [voiceName, setVoiceName] = useState('Kore');
  const [filename, setFilename] = useState('');
  const [useFormData, setUseFormData] = useState(true);
  const [jobType, setJobType] = useState<'background' | 'immediate'>('background');

  const queryClient = useQueryClient();

  const { data: voices } = useQuery({
    queryKey: ['voices'],
    queryFn: ttsApi.getVoices,
  });

  const createJobMutation = useMutation({
    mutationFn: async () => {
      if (jobType === 'background') {
        return useFormData 
          ? ttsApi.createJobFormData(text, voiceName, filename || undefined)
          : ttsApi.createJobJSON(text, voiceName, filename || undefined);
      } else {
        return useFormData
          ? ttsApi.createBase64JobFormData(text, voiceName)
          : ttsApi.createBase64JobJSON(text, voiceName);
      }
    },
    onSuccess: (data) => {
      if ('jobId' in data) {
        // Background job created
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        setText('');
        setFilename('');
      } else {
        // Immediate job completed - handle base64 audio
        const audioData = data.audioData;
        const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tts_${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setText('');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    createJobMutation.mutate();
  };

  const characterCount = text.length;
  const isOverLimit = characterCount > 32000;
  const estimatedTime = Math.max(5, Math.ceil(characterCount / 100));

  return (
    <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Mic className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Create TTS Job</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Processing Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="relative">
                <input
                  type="radio"
                  name="jobType"
                  value="background"
                  checked={jobType === 'background'}
                  onChange={(e) => setJobType(e.target.value as 'background')}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  jobType === 'background' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center">
                    <Settings className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <div className="font-medium text-gray-900">Background Processing</div>
                      <div className="text-sm text-gray-500">Queue job for processing, get immediate response</div>
                    </div>
                  </div>
                </div>
              </label>

              <label className="relative">
                <input
                  type="radio"
                  name="jobType"
                  value="immediate"
                  checked={jobType === 'immediate'}
                  onChange={(e) => setJobType(e.target.value as 'immediate')}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  jobType === 'immediate' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <div className="font-medium text-gray-900">Immediate Processing</div>
                      <div className="text-sm text-gray-500">Process now, download immediately (short texts only)</div>
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Request Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Request Format
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  checked={useFormData}
                  onChange={() => setUseFormData(true)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Form Data <span className="text-green-600">(Recommended for Sinhala)</span>
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  checked={!useFormData}
                  onChange={() => setUseFormData(false)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">JSON</span>
              </label>
            </div>
          </div>

          {/* Text Input */}
          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
              Text to Convert
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                isOverLimit 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Enter your text here... (Supports Sinhala and other languages)"
            />
            <div className="mt-2 flex justify-between text-sm">
              <span className={`${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
                {characterCount.toLocaleString()} / 32,000 characters
              </span>
              {characterCount > 0 && (
                <span className="text-gray-500">
                  Estimated time: ~{estimatedTime < 60 ? `${estimatedTime}s` : `${Math.ceil(estimatedTime / 60)}m`}
                </span>
              )}
            </div>
          </div>

          {/* Voice Selection */}
          <div>
            <label htmlFor="voice" className="block text-sm font-medium text-gray-700 mb-2">
              Voice
            </label>
            <select
              id="voice"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              {voices?.voices.map((voice) => (
                <option key={voice} value={voice}>
                  {voice}
                </option>
              ))}
            </select>
          </div>

          {/* Filename (only for background jobs) */}
          {jobType === 'background' && (
            <div>
              <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-2">
                Filename (Optional)
              </label>
                              <input
                type="text"
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="my_audio (without extension)"
              />
              <p className="mt-1 text-sm text-gray-500">
                If not provided, a timestamp-based filename will be generated
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!text.trim() || isOverLimit || createJobMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createJobMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {jobType === 'background' ? 'Queue Job' : 'Generate Audio'}
            </button>
          </div>
        </form>

        {/* Success/Error Messages */}
        {createJobMutation.isSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              {jobType === 'background' 
                ? '✅ Job queued successfully! Check the Jobs tab to monitor progress.'
                : '✅ Audio generated and downloaded successfully!'
              }
            </p>
          </div>
        )}

        {createJobMutation.isError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              ❌ Failed to create job. Please try again.
            </p>
          </div>
        )}
      </div>

      {/* Tips Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-medium text-blue-900 mb-3">💡 Tips</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Use <strong>Form Data</strong> format for Sinhala text to avoid encoding issues</li>
          <li>• <strong>Background processing</strong> is recommended for texts longer than 1000 characters</li>
          <li>• <strong>Immediate processing</strong> works best for short texts (under 500 characters)</li>
          <li>• The system supports 30 different voices with various characteristics</li>
          <li>• Generated audio files are in WAV format (24kHz, 16-bit, mono)</li>
        </ul>
      </div>
    </div>
  );
}; 