import React, { useEffect, useState } from 'react';
import { Card } from '../components/common';
import Loader from '../components/common/Loader';
import { getWorkoutOverview, getWorkoutTrend } from '../services/workout.service';
import { WorkoutSportBadge, getSportName } from '../components/workout';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Clock, Flame, TrendingUp } from 'lucide-react';

interface WorkoutItem {
  sessionId: string;
  sportType: number;
  startTime: string;
  endTime: string;
  durationSec: number;
  hr: { avg: number; max: number; min: number };
  calories: number;
  steps: number;
  distance: number;
  lunaAccuracyPercent?: number;
  benchmarkDevice?: string;
}

interface WorkoutOverviewData {
  summary: any | null;  // UserAccuracySummary
  totalWorkouts: number;
  totalDurationSec: number;
  workouts: WorkoutItem[];
}

interface TrendData {
  sessionId: string;
  sportType: number;
  durationSec: number;
  lunaAccuracyPercent?: number | null;
  mae?: number | null;
  rmse?: number | null;
  pearsonR?: number | null;
  mape?: number | null;
  meanBias?: number | null;
  lunaCalories?: number | null;
  benchmarkCalories?: number | null;
  caloriesBias?: number | null;
}

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

export const WorkoutOverviewPage: React.FC = () => {
  const [overview, setOverview] = useState<WorkoutOverviewData | null>(null);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [overviewData, trendData] = await Promise.all([
          getWorkoutOverview(),
          getWorkoutTrend(30),
        ]);
        setOverview(overviewData);
        setTrend(trendData || []);
      } catch (err: any) {
        console.error('Error fetching workout overview:', err);
        setError(err.message || 'Failed to load workout data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!overview || overview.totalWorkouts === 0) {
    return (
      <div className="text-center py-12">
        <Activity size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">No workouts recorded yet</p>
        <p className="text-gray-400 text-sm mt-2">
          Upload a workout session to see your stats here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Activity className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Workouts</p>
              <p className="text-2xl font-bold text-gray-900">{overview.totalWorkouts}</p>
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
                {formatDuration(overview.totalDurationSec)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sessions w/ Benchmark</p>
              <p className="text-2xl font-bold text-gray-900">
                {overview.workouts.filter(w => w.lunaAccuracyPercent !== undefined).length}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Flame className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Calories</p>
              <p className="text-2xl font-bold text-gray-900">
                {overview.workouts.reduce((sum, w) => sum + (w.calories || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Accuracy Trend Chart */}
      {trend.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Workout HR Accuracy Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.filter(t => t.lunaAccuracyPercent !== undefined && t.lunaAccuracyPercent !== null)} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="sportType" 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => getSportName(val)}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                  label={{ 
                    value: 'Accuracy %', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: 11 }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value?.toFixed(1)}%`, 'HR Accuracy']}
                  labelFormatter={(label) => getSportName(label)}
                />
                <Line 
                  type="monotone" 
                  dataKey="lunaAccuracyPercent" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Recent Workouts */}
      {overview.workouts && overview.workouts.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Workouts</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg HR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calories</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accuracy</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {overview.workouts.map((workout) => (
                  <tr key={workout.sessionId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(workout.startTime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <WorkoutSportBadge sportType={workout.sportType} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDuration(workout.durationSec)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {workout.hr?.avg || '--'} BPM
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {workout.calories || '--'}
                    </td>
                    <td className="px-4 py-3">
                      {workout.lunaAccuracyPercent !== undefined ? (
                        <span className={`text-sm font-semibold ${
                          workout.lunaAccuracyPercent >= 90 ? 'text-green-600' :
                          workout.lunaAccuracyPercent >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {workout.lunaAccuracyPercent.toFixed(1)}%
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
        </Card>
      )}
    </div>
  );
};

export default WorkoutOverviewPage;
