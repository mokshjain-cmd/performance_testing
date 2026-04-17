import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import Loader from '../common/Loader';
import { getWorkoutSession, getWorkoutReadings } from '../../services/workout.service';
import { 
  WorkoutSportBadge, 
  WorkoutStatsCard, 
  WorkoutZonesChart, 
  WorkoutHRChart,
  WorkoutComparisonCard 
} from '../workout';
import type { WorkoutSessionDetails, WorkoutReading, WorkoutStats, WorkoutReadingsResult } from '../../types';
import { Calendar, Clock, Cpu, MapPin, FileText, Trash2, Download } from 'lucide-react';
import apiClient from '../../services/api';

interface AdminWorkoutSessionViewProps {
  sessionId: string;
  onSessionDeleted?: () => void;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const AdminWorkoutSessionView: React.FC<AdminWorkoutSessionViewProps> = ({ 
  sessionId,
  onSessionDeleted 
}) => {
  const [sessionData, setSessionData] = useState<WorkoutSessionDetails | null>(null);
  const [readingsData, setReadingsData] = useState<WorkoutReadingsResult>({ luna: [], benchmark: null });
  const [loading, setLoading] = useState(true);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await getWorkoutSession(sessionId);
        setSessionData(data);
        
        setReadingsLoading(true);
        const readingsResult = await getWorkoutReadings(sessionId);
        setReadingsData(readingsResult || { luna: [], benchmark: null });
      } catch (err: any) {
        console.error('Error fetching workout session:', err);
        setError(err.message || 'Failed to load workout data');
      } finally {
        setLoading(false);
        setReadingsLoading(false);
      }
    };

    if (sessionId) {
      fetchData();
    }
  }, [sessionId]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this workout session? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      await apiClient.delete(`/sessions/${sessionId}`);
      alert('Session deleted successfully');
      onSessionDeleted?.();
    } catch (err: any) {
      console.error('Error deleting session:', err);
      alert(err.message || 'Failed to delete session');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (!readingsData.luna.length) return;

    const headers = ['Timestamp', 'Heart Rate (BPM)', 'Confidence', 'Intensity'];
    const rows = readingsData.luna.map(r => [
      r.timestamp,
      r.heartRate,
      r.heartRateConfidence || '',
      r.exerciseIntensity || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout_${sessionId}_readings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Workout session not found</p>
      </div>
    );
  }

  const { session, analysis } = sessionData;
  const workoutStats = analysis?.workoutStats as WorkoutStats | undefined;

  return (
    <div className="space-y-6">
      {/* Admin Actions Bar */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Session ID</span>
            <p className="font-mono text-sm text-gray-700">{sessionId}</p>
          </div>
          <div className="flex items-center gap-3">
            {readingsData.luna.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                <Download size={16} />
                Export CSV
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Trash2 size={16} />
              {deleting ? 'Deleting...' : 'Delete Session'}
            </button>
          </div>
        </div>
      </Card>

      {/* Session Header */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {workoutStats && (
              <WorkoutSportBadge sportType={workoutStats.sportType} size="lg" />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {session.name || 'Workout Session'}
              </h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(session.startTime)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatTime(session.startTime)} - {formatTime(session.endTime)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 text-sm">
            {session.devices.map((device) => (
              <div 
                key={device._id}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full"
              >
                <Cpu size={14} className="text-gray-500" />
                <span className="text-gray-700">{device.deviceType}</span>
                {device.firmwareVersion && (
                  <span className="text-xs text-gray-500">v{device.firmwareVersion}</span>
                )}
              </div>
            ))}
            {session.bandPosition && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                <MapPin size={14} className="text-gray-500" />
                <span className="text-gray-700 capitalize">{session.bandPosition}</span>
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-6">
          <div>
            <span className="text-sm text-gray-500">User</span>
            <p className="text-sm font-medium text-gray-900">
              {typeof session.userId === 'object' ? session.userId.name || session.userId.email : session.userId}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Duration</span>
            <p className="text-sm font-semibold text-gray-900">
              {formatDuration(session.durationSec)}
            </p>
          </div>
          {session.benchmarkDeviceType && (
            <div>
              <span className="text-sm text-gray-500">Benchmark</span>
              <p className="text-sm font-semibold text-gray-900 capitalize">
                {session.benchmarkDeviceType}
              </p>
            </div>
          )}
          <div>
            <span className="text-sm text-gray-500">Valid</span>
            <p className={`text-sm font-semibold ${session.isValid ? 'text-green-600' : 'text-red-600'}`}>
              {session.isValid ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </Card>

      {/* Raw Files Links */}
      {session.rawFiles && Object.keys(session.rawFiles).length > 0 && (
        <Card title="Raw Files">
          <div className="flex flex-wrap gap-3">
            {Object.entries(session.rawFiles).map(([deviceType, url]) => (
              <a
                key={deviceType}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <FileText size={16} className="text-gray-500" />
                <span className="capitalize">{deviceType} Log</span>
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Workout Stats */}
      {workoutStats && (
        <WorkoutStatsCard stats={workoutStats} />
      )}

      {/* HR Timeline Chart */}
      {readingsLoading ? (
        <Card>
          <div className="text-center py-8">
            <Loader />
            <p className="text-gray-500 mt-2">Loading HR readings...</p>
          </div>
        </Card>
      ) : readingsData.luna.length > 0 ? (
        <WorkoutHRChart 
          readings={readingsData.luna}
          benchmarkReadings={readingsData.benchmark}
          benchmarkDeviceType={session.benchmarkDeviceType}
          avgHr={workoutStats?.computedHr?.avg || workoutStats?.hr?.avg}
          maxHr={workoutStats?.computedHr?.max || workoutStats?.hr?.max}
        />
      ) : (
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Heart Rate Timeline</h3>
          <div className="text-center py-8 text-gray-500">
            <p>No HR readings available for this workout</p>
          </div>
        </Card>
      )}

      {/* HR Zones Chart */}
      {workoutStats?.hrZones && (
        <WorkoutZonesChart zones={workoutStats.hrZones} />
      )}

      {/* Benchmark Comparison */}
      <WorkoutComparisonCard comparison={workoutStats?.benchmarkComparison} />
    </div>
  );
};

export default AdminWorkoutSessionView;
