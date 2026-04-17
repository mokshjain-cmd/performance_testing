import React, { useEffect, useState } from 'react';
import { Card } from '../components/common';
import Loader from '../components/common/Loader';
import { getWorkoutSession, getWorkoutReadings } from '../services/workout.service';
import { 
  WorkoutSportBadge, 
  WorkoutStatsCard, 
  WorkoutZonesChart, 
  WorkoutHRChart,
  WorkoutComparisonCard 
} from '../components/workout';
import type { WorkoutSessionDetails, WorkoutReading, WorkoutStats, WorkoutReadingsResult } from '../types';
import { Calendar, Clock, Cpu, MapPin } from 'lucide-react';

interface WorkoutSessionPageProps {
  sessionId: string | null;
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

export const WorkoutSessionPage: React.FC<WorkoutSessionPageProps> = ({ sessionId }) => {
  const [sessionData, setSessionData] = useState<WorkoutSessionDetails | null>(null);
  const [readingsData, setReadingsData] = useState<WorkoutReadingsResult>({ luna: [], benchmark: null });
  const [loading, setLoading] = useState(true);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setSessionData(null);
      setReadingsData({ luna: [], benchmark: null });
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch session details first
        console.log('[WorkoutSessionPage] Fetching session:', sessionId);
        const data = await getWorkoutSession(sessionId);
        console.log('[WorkoutSessionPage] Session data received:', data);
        setSessionData(data);
        
        // Then fetch readings (includes both luna and benchmark)
        setReadingsLoading(true);
        console.log('[WorkoutSessionPage] Fetching readings for session:', sessionId);
        const readingsResult = await getWorkoutReadings(sessionId);
        console.log('[WorkoutSessionPage] Readings received:', readingsResult);
        console.log('[WorkoutSessionPage] Luna readings count:', readingsResult?.luna?.length || 0);
        console.log('[WorkoutSessionPage] Benchmark readings count:', readingsResult?.benchmark?.length || 0);
        setReadingsData(readingsResult || { luna: [], benchmark: null });
      } catch (err: any) {
        console.error('Error fetching workout session:', err);
        setError(err.message || 'Failed to load workout data');
      } finally {
        setLoading(false);
        setReadingsLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a workout session from the sidebar</p>
      </div>
    );
  }

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

        {/* Duration summary */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6">
          <div>
            <span className="text-sm text-gray-500">Duration</span>
            <p className="text-lg font-semibold text-gray-900">
              {formatDuration(session.durationSec)}
            </p>
          </div>
          {session.benchmarkDeviceType && (
            <div>
              <span className="text-sm text-gray-500">Benchmark</span>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {session.benchmarkDeviceType}
              </p>
            </div>
          )}
        </div>
      </Card>

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

export default WorkoutSessionPage;
