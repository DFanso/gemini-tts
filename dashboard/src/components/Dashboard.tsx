import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  Mic, 
  FileAudio, 
  Clock, 
  Users, 
  Server,
  Plus
} from 'lucide-react';
import { ttsApi } from '../services/api';
import { JobsList } from './JobsList';
import { CreateJobForm } from './CreateJobForm';
import { FilesList } from './FilesList';
import { HealthStatus } from './HealthStatus';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'create' | 'files'>('jobs');

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: ttsApi.getHealth,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => ttsApi.getJobs(),
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  const tabs = [
    { id: 'jobs' as const, label: 'Jobs', icon: Activity, count: jobs?.count },
    { id: 'create' as const, label: 'Create TTS', icon: Plus },
    { id: 'files' as const, label: 'Files', icon: FileAudio },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Mic className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gemini TTS Dashboard</h1>
                <p className="text-sm text-gray-500">Text-to-Speech Management System</p>
              </div>
            </div>
            <HealthStatus health={health} isLoading={healthLoading} />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Jobs</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {healthLoading ? '...' : health?.activeJobs || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Queued Jobs</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {healthLoading ? '...' : health?.queuedJobs || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Available Voices</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {healthLoading ? '...' : health?.availableVoices || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Server className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Server Status</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {healthLoading ? '...' : health?.status === 'healthy' ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'jobs' && (
            <JobsList jobs={jobs?.jobs || []} isLoading={jobsLoading} />
          )}
          {activeTab === 'create' && <CreateJobForm />}
          {activeTab === 'files' && <FilesList />}
        </div>
      </div>
    </div>
  );
}; 