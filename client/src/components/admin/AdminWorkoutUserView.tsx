import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import Loader from '../common/Loader';
import { getAdminUserWorkoutSummary } from '../../services/workout.service';
import { WorkoutSportBadge } from '../workout';
import { Activity, Clock, Target, TrendingUp } from 'lucide-react';
import type { Metric } from './MetricsSelector';

interface WorkoutSession {
  sessionId: string;
  name?: string;
  sportType: number;
  startTime: string;
  endTime: string;
  durationSec: number;
  lunaAccuracyPercent?: number;
  benchmarkDevice?: string;
  isValid: boolean;
}

interface UserWorkoutData {
  summary: any | null;  // UserAccuracySummary
  sessions: WorkoutSession[];
  totalSessions: number;
  totalWorkouts: number;
  totalDurationSec: number;
}

interface AdminWorkoutUserViewProps {
  userId: string;
  metric: Metric;
}

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const AdminWorkoutUserView: React.FC<AdminWorkoutUserViewProps> = ({ 
  userId, 
  metric: _metric
}) => {
  const [data, setData] = useState<UserWorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getAdminUserWorkoutSummary(userId);
        setData(result);
      } catch (err: any) {
        console.error('Error fetching user workout summary:', err);
        setError(err.message || 'Failed to load user workout data');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data || data.totalWorkouts === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No workout data found for this user</p>
      </div>
    );
  }

  // Calculate average accuracy from sessions with valid lunaAccuracyPercent
  const sessionsWithAccuracy = data.sessions.filter(s => s.lunaAccuracyPercent !== undefined);
  const avgAccuracy = sessionsWithAccuracy.length > 0
    ? sessionsWithAccuracy.reduce((sum, s) => sum + (s.lunaAccuracyPercent || 0), 0) / sessionsWithAccuracy.length
    : null;

  // Find best and worst sessions by accuracy
  const sortedByAccuracy = [...sessionsWithAccuracy].sort((a, b) => 
    (b.lunaAccuracyPercent || 0) - (a.lunaAccuracyPercent || 0)
  );
  const bestSession = sortedByAccuracy[0];
  const worstSession = sortedByAccuracy[sortedByAccuracy.length - 1];

  return (
    <div className="space-y-6">
      {/* User Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Workout Performance</h2>
            <p className="text-sm text-gray-500">User: {userId}</p>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Activity className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Workouts</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalWorkouts}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(data.totalDurationSec)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Target className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg HR Accuracy</p>
              <p className={`text-2xl font-bold ${avgAccuracy && avgAccuracy >= 90 ? 'text-green-600' : avgAccuracy && avgAccuracy >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                {avgAccuracy?.toFixed(1) || '--'}
                <span className="text-sm font-normal text-gray-500"> %</span>
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sessions w/ Benchmark</p>
              <p className="text-2xl font-bold text-gray-900">
                {sessionsWithAccuracy.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Best/Worst Sessions */}
      {(bestSession || worstSession) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestSession && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Best Workout</h3>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <WorkoutSportBadge sportType={bestSession.sportType} size="sm" />
                  <span className="text-green-700 font-bold">
                    {bestSession.lunaAccuracyPercent?.toFixed(1)}% accuracy
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {new Date(bestSession.startTime).toLocaleDateString()}
                </div>
              </div>
            </Card>
          )}
          {worstSession && worstSession !== bestSession && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Needs Improvement</h3>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <WorkoutSportBadge sportType={worstSession.sportType} size="sm" />
                  <span className="text-yellow-700 font-bold">
                    {worstSession.lunaAccuracyPercent?.toFixed(1)}% accuracy
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {new Date(worstSession.startTime).toLocaleDateString()}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* All Workout Sessions */}
      {data.sessions && data.sessions.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Workout Sessions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sport</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Benchmark</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HR Accuracy</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.sessions.slice(0, 20).map((session) => (
                  <tr key={session.sessionId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(session.startTime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <WorkoutSportBadge sportType={session.sportType} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDuration(session.durationSec)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                      {session.benchmarkDevice || '--'}
                    </td>
                    <td className="px-4 py-3">
                      {session.lunaAccuracyPercent !== undefined ? (
                        <span className={`text-sm font-semibold ${
                          session.lunaAccuracyPercent >= 90 ? 'text-green-600' :
                          session.lunaAccuracyPercent >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {session.lunaAccuracyPercent.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.sessions.length > 20 && (
            <p className="text-sm text-gray-500 mt-3 text-center">
              Showing 20 of {data.sessions.length} sessions
            </p>
          )}
        </Card>
      )}
    </div>
  );
};

export default AdminWorkoutUserView;
