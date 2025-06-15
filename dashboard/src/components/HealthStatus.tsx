import React from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { HealthResponse } from '../types/api';

interface HealthStatusProps {
  health?: HealthResponse;
  isLoading: boolean;
}

export const HealthStatus: React.FC<HealthStatusProps> = ({ health, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Checking status...</span>
      </div>
    );
  }

  const isHealthy = health?.status === 'healthy';

  return (
    <div className="flex items-center">
      {isHealthy ? (
        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500 mr-2" />
      )}
      <div className="text-sm">
        <div className={`font-medium ${isHealthy ? 'text-green-700' : 'text-red-700'}`}>
          {isHealthy ? 'Server Online' : 'Server Offline'}
        </div>
        {health && (
          <div className="text-gray-500">
            Last updated: {new Date(health.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}; 