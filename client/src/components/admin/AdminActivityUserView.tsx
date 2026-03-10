import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import { Footprints, Activity, TrendingUp, CheckCircle, Info } from 'lucide-react';
import { activityService } from '../../services/activity.service';
import type { AdminUserActivitySummary, ActivityTrendData } from '../../types/activity.types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AdminActivityUserViewProps {
  userId: string;
}

const AdminActivityUserView: React.FC<AdminActivityUserViewProps> = ({ userId }) => {
  const [userSummary, setUserSummary] = useState<AdminUserActivitySummary | null>(null);
  const [trendData, setTrendData] = useState<ActivityTrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('[Activity User View] Fetching user summary and trend for userId:', userId);
        
        const [summary, trend] = await Promise.all([
          activityService.getAdminUserSummary({ userId }),
          activityService.getAdminUserActivityTrend(userId),
        ]);
        
        console.log('[Activity User View] ✅ Received summary:', summary);
        console.log('[Activity User View] ✅ Received trend:', trend);
        setUserSummary(summary);
        setTrendData(trend);
      } catch (err) {
        console.error('[Activity User View] ❌ Error:', err);
        console.error('Error loading user activity data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user activity data...</p>
        </div>
      </div>
    );
  }

  if (!userSummary || !userSummary.activityOverview) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No activity data available for this user</p>
      </div>
    );
  }

  const overview = userSummary.activityOverview;

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 90) return 'text-green-600 bg-green-50';
    if (accuracy >= 80) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">User Activity Performance</h2>
        <p className="text-gray-600">
          Analysis of activity patterns over {overview.totalSessions} sessions
        </p>
      </div>

      {/* Core Metrics Grid */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Core Activity Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Footprints className="w-5 h-5 text-blue-500" />
                <p className="text-sm text-gray-500 uppercase tracking-wide">Avg Daily Steps</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {overview.avgTotalSteps.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Average across all sessions</p>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                <p className="text-sm text-gray-500 uppercase tracking-wide">Avg Distance</p>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {(overview.avgTotalDistance / 1000).toFixed(2)} km
              </p>
              <p className="text-xs text-gray-500">
                {overview.avgTotalDistance.toFixed(0)} meters per session
              </p>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <p className="text-sm text-gray-500 uppercase tracking-wide">Avg Calories</p>
              </div>
              <p className="text-3xl font-bold text-orange-600">
                {overview.avgTotalCalories.toFixed(0)} kcal
              </p>
              <p className="text-xs text-gray-500">Average energy expenditure</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Validation Metrics */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Validation Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Steps Accuracy */}
          <Card>
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Footprints className="w-5 h-5 text-blue-500" />
              Steps Accuracy
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Accuracy</span>
                <div className={`px-3 py-1 rounded-full ${getAccuracyColor(overview.avgStepsAccuracyPercent)}`}>
                  <span className="font-semibold">
                    {overview.avgStepsAccuracyPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  Avg Difference
                  <span className="group relative">
                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      Average bias across all sessions (Falcon - Benchmark)
                    </span>
                  </span>
                </span>
                <span className="font-semibold text-gray-700">
                  {overview.avgStepsBias > 0 ? '+' : ''}
                  {overview.avgStepsBias.toFixed(0)} steps
                </span>
              </div>
            </div>
          </Card>

          {/* Distance Accuracy */}
          <Card>
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Distance Accuracy
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Accuracy</span>
                <div className={`px-3 py-1 rounded-full ${getAccuracyColor(overview.avgDistanceAccuracyPercent)}`}>
                  <span className="font-semibold">
                    {overview.avgDistanceAccuracyPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  Avg Difference
                  <span className="group relative">
                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      Average bias across all sessions (Falcon - Benchmark)
                    </span>
                  </span>
                </span>
                <span className="font-semibold text-gray-700">
                  {overview.avgDistanceBias > 0 ? '+' : ''}
                  {overview.avgDistanceBias.toFixed(0)}m
                </span>
              </div>
            </div>
          </Card>

          {/* Calories Accuracy */}
          <Card>
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Calories Accuracy
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Accuracy</span>
                <div className={`px-3 py-1 rounded-full ${getAccuracyColor(overview.avgCaloriesAccuracyPercent)}`}>
                  <span className="font-semibold">
                    {overview.avgCaloriesAccuracyPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  Avg Difference
                  <span className="group relative">
                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      Average bias across all sessions (Falcon - Benchmark)
                    </span>
                  </span>
                </span>
                <span className="font-semibold text-gray-700">
                  {overview.avgCaloriesBias > 0 ? '+' : ''}
                  {overview.avgCaloriesBias.toFixed(0)} kcal
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Calorie Breakdown (Active vs Basal) */}
        {(overview.avgActiveCaloriesAccuracyPercent > 0 || overview.avgBasalCaloriesAccuracyPercent > 0) && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-4">Calorie Breakdown Accuracy</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overview.avgActiveCaloriesAccuracyPercent > 0 && (
                <Card>
                  <h5 className="text-md font-semibold mb-3">Active Calories</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Accuracy</span>
                      <div className={`px-3 py-1 rounded-full ${getAccuracyColor(overview.avgActiveCaloriesAccuracyPercent)}`}>
                        <span className="font-semibold">
                          {overview.avgActiveCaloriesAccuracyPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        Avg Difference
                        <span className="group relative">
                          <Info className="w-3 h-3 text-gray-400 cursor-help" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            Average bias across all sessions (Falcon - Benchmark)
                          </span>
                        </span>
                      </span>
                      <span className="font-semibold text-gray-700">
                        {overview.avgActiveCaloriesBias > 0 ? '+' : ''}
                        {overview.avgActiveCaloriesBias.toFixed(0)} kcal
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Energy from physical activity</p>
                </Card>
              )}
              {overview.avgBasalCaloriesAccuracyPercent > 0 && (
                <Card>
                  <h5 className="text-md font-semibold mb-3">Basal Calories</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Accuracy</span>
                      <div className={`px-3 py-1 rounded-full ${getAccuracyColor(overview.avgBasalCaloriesAccuracyPercent)}`}>
                        <span className="font-semibold">
                          {overview.avgBasalCaloriesAccuracyPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        Avg Difference
                        <span className="group relative">
                          <Info className="w-3 h-3 text-gray-400 cursor-help" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            Average bias across all sessions (Falcon - Benchmark)
                          </span>
                        </span>
                      </span>
                      <span className="font-semibold text-gray-700">
                        {overview.avgBasalCaloriesBias > 0 ? '+' : ''}
                        {overview.avgBasalCaloriesBias.toFixed(0)} kcal
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Energy at rest (BMR)</p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Activity Trend Charts */}
      {trendData.length > 0 && (
        <>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Steps - Bias & Accuracy Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" label={{ value: 'Bias (steps)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Accuracy (%)', angle: 90, position: 'insideRight' }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number | undefined, name?: string) => {
                    if (value === undefined) return ['N/A', ''];
                    if (name?.includes('Accuracy')) return [value.toFixed(1) + '%', ''];
                    return [value.toFixed(0), ''];
                  }}
                />
                <Legend />
                {trendData.some(d => d.stepsBias !== undefined) && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="stepsBias"
                    stroke="#f59e0b"
                    name="Steps Bias"
                    strokeWidth={2}
                  />
                )}
                {trendData.some(d => d.stepsAccuracyPercent !== undefined) && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="stepsAccuracyPercent"
                    stroke="#10b981"
                    name="Steps Accuracy"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Distance - Bias & Accuracy Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" label={{ value: 'Bias (meters)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Accuracy (%)', angle: 90, position: 'insideRight' }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number | undefined, name?: string) => {
                    if (value === undefined) return ['N/A', ''];
                    if (name?.includes('Accuracy')) return [value.toFixed(1) + '%', ''];
                    return [value.toFixed(0) + ' m', ''];
                  }}
                />
                <Legend />
                {trendData.some(d => d.distanceBias !== undefined) && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="distanceBias"
                    stroke="#f59e0b"
                    name="Distance Bias"
                    strokeWidth={2}
                  />
                )}
                {trendData.some(d => d.distanceAccuracyPercent !== undefined) && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="distanceAccuracyPercent"
                    stroke="#10b981"
                    name="Distance Accuracy"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Total Calories - Bias & Accuracy Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" label={{ value: 'Bias (kcal)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Accuracy (%)', angle: 90, position: 'insideRight' }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number | undefined, name?: string) => {
                    if (value === undefined) return ['N/A', ''];
                    if (name?.includes('Accuracy')) return [value.toFixed(1) + '%', ''];
                    return [value.toFixed(0) + ' kcal', ''];
                  }}
                />
                <Legend />
                {trendData.some(d => d.caloriesBias !== undefined) && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="caloriesBias"
                    stroke="#f59e0b"
                    name="Calories Bias"
                    strokeWidth={2}
                  />
                )}
                {trendData.some(d => d.caloriesAccuracyPercent !== undefined) && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="caloriesAccuracyPercent"
                    stroke="#10b981"
                    name="Calories Accuracy"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Active Calories - Bias & Accuracy Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" label={{ value: 'Bias (kcal)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Accuracy (%)', angle: 90, position: 'insideRight' }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number | undefined, name?: string) => {
                    if (value === undefined) return ['N/A', ''];
                    if (name?.includes('Accuracy')) return [value.toFixed(1) + '%', ''];
                    return [value.toFixed(0) + ' kcal', ''];
                  }}
                />
                <Legend />
                {trendData.some(d => d.activeCaloriesBias !== undefined) && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="activeCaloriesBias"
                    stroke="#f59e0b"
                    name="Active Calories Bias"
                    strokeWidth={2}
                  />
                )}
                {trendData.some(d => d.activeCaloriesAccuracyPercent !== undefined) && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="activeCaloriesAccuracyPercent"
                    stroke="#10b981"
                    name="Active Calories Accuracy"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Basal Calories - Bias & Accuracy Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" label={{ value: 'Bias (kcal)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Accuracy (%)', angle: 90, position: 'insideRight' }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number | undefined, name?: string) => {
                    if (value === undefined) return ['N/A', ''];
                    if (name?.includes('Accuracy')) return [value.toFixed(1) + '%', ''];
                    return [value.toFixed(0) + ' kcal', ''];
                  }}
                />
                <Legend />
                {trendData.some(d => d.basalCaloriesBias !== undefined) && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="basalCaloriesBias"
                    stroke="#f59e0b"
                    name="Basal Calories Bias"
                    strokeWidth={2}
                  />
                )}
                {trendData.some(d => d.basalCaloriesAccuracyPercent !== undefined) && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="basalCaloriesAccuracyPercent"
                    stroke="#10b981"
                    name="Basal Calories Accuracy"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Info Box */}
      <Card>
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-500 mt-1" />
          <div>
            <h3 className="font-semibold mb-1">Understanding Activity Metrics</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li><strong>Steps:</strong> Daily step count tracked by Falcon device</li>
              <li><strong>Distance:</strong> Total distance covered based on step count and stride length</li>
              <li><strong>Calories:</strong> Estimated energy expenditure (Active + Basal)</li>
              <li><strong>Accuracy:</strong> How close Falcon measurements are to benchmark device (higher is better)</li>
              <li><strong>Avg Difference (Bias):</strong> Average difference between Falcon and benchmark across all sessions. Positive values indicate Falcon overestimates, negative values indicate Falcon underestimates compared to benchmark device</li>
              <li><strong>Bias Trend:</strong> Shows how the difference between Falcon and benchmark changes over time</li>
              <li><strong>Accuracy Trend:</strong> Shows how Falcon's accuracy % changes over time</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminActivityUserView;
