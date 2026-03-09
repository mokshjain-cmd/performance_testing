import React, { useEffect, useState } from 'react';
import { Footprints, Activity, TrendingUp, CheckCircle } from 'lucide-react';
import { Card } from '../components/common';
import { activityService } from '../services/activity.service';
import type { UserActivityOverview, ActivityTrendData } from '../types/activity.types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export const ActivityOverviewPage: React.FC = () => {
  const [overview, setOverview] = useState<UserActivityOverview | null>(null);
  const [trendData, setTrendData] = useState<ActivityTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [overviewData, trend] = await Promise.all([
          activityService.getUserActivityOverview(),
          activityService.getUserActivityTrend(),
        ]);

        setOverview(overviewData);
        setTrendData(trend);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading activity data...</div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error || 'No activity data available'}</div>
      </div>
    );
  }

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 90) return 'text-green-600 bg-green-50';
    if (accuracy >= 80) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Overview</h1>
          <p className="text-gray-600 mt-1">
            Analysis of your activity patterns over the last {overview.totalSessions} sessions
          </p>
        </div>
        <Footprints className="w-12 h-12 text-blue-500" />
      </div>

      {/* Core Metrics Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Core Activity Metrics</h2>
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

      {/* Validation Metrics (if comparison available) */}
      {overview.comparison && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Validation Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Steps Accuracy */}
            <Card>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Footprints className="w-5 h-5 text-blue-500" />
                Steps Accuracy
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Accuracy</span>
                  <div className={`px-3 py-1 rounded-full ${getAccuracyColor(overview.comparison.steps.avgAccuracyPercent)}`}>
                    <span className="font-semibold">
                      {overview.comparison.steps.avgAccuracyPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Bias</span>
                  <span className="font-semibold text-gray-700">
                    {overview.comparison.steps.avgBias > 0 ? '+' : ''}
                    {overview.comparison.steps.avgBias.toFixed(0)} steps
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">MAE</span>
                  <span className="font-semibold text-gray-700">
                    {overview.comparison.steps.avgMae.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">MAPE</span>
                  <span className="font-semibold text-gray-700">
                    {overview.comparison.steps.avgMape.toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>

            {/* Distance Accuracy */}
            <Card>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Distance Accuracy
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Accuracy</span>
                  <div className={`px-3 py-1 rounded-full ${getAccuracyColor(overview.comparison.distance.avgAccuracyPercent)}`}>
                    <span className="font-semibold">
                      {overview.comparison.distance.avgAccuracyPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Bias</span>
                  <span className="font-semibold text-gray-700">
                    {overview.comparison.distance.avgBias > 0 ? '+' : ''}
                    {overview.comparison.distance.avgBias.toFixed(0)}m
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">MAE</span>
                  <span className="font-semibold text-gray-700">
                    {overview.comparison.distance.avgMae.toFixed(0)}m
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">MAPE</span>
                  <span className="font-semibold text-gray-700">
                    {overview.comparison.distance.avgMape.toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>

            {/* Calories Accuracy */}
            <Card>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Calories Accuracy
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Accuracy</span>
                  <div className={`px-3 py-1 rounded-full ${getAccuracyColor(overview.comparison.calories.avgAccuracyPercent)}`}>
                    <span className="font-semibold">
                      {overview.comparison.calories.avgAccuracyPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Bias</span>
                  <span className="font-semibold text-gray-700">
                    {overview.comparison.calories.avgBias > 0 ? '+' : ''}
                    {overview.comparison.calories.avgBias.toFixed(0)} kcal
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">MAE</span>
                  <span className="font-semibold text-gray-700">
                    {overview.comparison.calories.avgMae.toFixed(0)} kcal
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">MAPE</span>
                  <span className="font-semibold text-gray-700">
                    {overview.comparison.calories.avgMape.toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Activity Trend Chart */}
      {trendData.length > 0 && (
        <>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Steps Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis label={{ value: 'Steps', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number | undefined) => value !== undefined ? [value.toLocaleString(), ''] : ['N/A', '']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="lunaSteps"
                  stroke="#3b82f6"
                  name="Luna Steps"
                  strokeWidth={2}
                />
                {trendData.some(d => d.benchmarkSteps) && (
                  <Line
                    type="monotone"
                    dataKey="benchmarkSteps"
                    stroke="#10b981"
                    name="Benchmark Steps"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Distance & Calories Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" label={{ value: 'Distance (km)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Calories (kcal)', angle: 90, position: 'insideRight' }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number | undefined, name: string | undefined) => {
                    if (value === undefined || name === undefined) return ['N/A', name || ''];
                    if (name.includes('Distance')) {
                      return [(value / 1000).toFixed(2) + ' km', name];
                    }
                    return [value.toFixed(0) + ' kcal', name];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="lunaDistance" fill="#10b981" name="Luna Distance" />
                <Bar yAxisId="right" dataKey="lunaCalories" fill="#f97316" name="Luna Calories" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Info Box */}
      <Card>
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-500 mt-1" />
          <div>
            <h3 className="font-semibold mb-1">Understanding Your Activity Metrics</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li><strong>Steps:</strong> Daily step count tracked by Luna device</li>
              <li><strong>Distance:</strong> Total distance covered based on step count and stride length</li>
              <li><strong>Calories:</strong> Estimated energy expenditure (Active + Basal)</li>
              <li><strong>Accuracy:</strong> How close Luna measurements are to benchmark device (higher is better)</li>
              <li><strong>Bias:</strong> Average difference between Luna and benchmark (positive = overestimation)</li>
              <li><strong>MAE:</strong> Mean Absolute Error - average magnitude of errors</li>
              <li><strong>MAPE:</strong> Mean Absolute Percentage Error - error as percentage</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
