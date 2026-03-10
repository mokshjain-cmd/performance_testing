import React, { useEffect, useState } from 'react';
import { Users, Activity, TrendingUp, Footprints } from 'lucide-react';
import { Card } from '../components/common';
import { activityService } from '../services/activity.service';
import type { AdminGlobalActivitySummary, ActivityAccuracyTrend } from '../types/activity.types';
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

export const AdminActivityDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<AdminGlobalActivitySummary | null>(null);
  const [accuracyTrend, setAccuracyTrend] = useState<ActivityAccuracyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summaryData, trendData] = await Promise.all([
          activityService.getAdminGlobalSummary({ latestFirmwareOnly: true }),
          activityService.getAdminAccuracyTrend(),
        ]);

        setSummary(summaryData);
        setAccuracyTrend(trendData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading admin dashboard...</div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error || 'No data available'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Global activity analysis for Steps, Distance, and Calories
          </p>
        </div>
        <Footprints className="w-12 h-12 text-blue-500" />
      </div>

      {/* Population Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Population Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Total Sessions</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                {summary.totalSessions}
              </p>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500">Activity sessions</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Total Users</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                {summary.totalUsers}
              </p>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500">With activity data</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Latest Firmware</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
                {summary.latestFirmwareVersion}
              </p>
              <p className="text-xs text-gray-500">Current version</p>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Overall Steps Accuracy</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">
                {summary.activityStats.steps.avgAccuracyPercent.toFixed(1)}%
              </p>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500">Falcon vs Benchmark</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Activity Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Activity Validation Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Steps Metrics */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Footprints className="w-5 h-5 text-blue-500" />
              Steps Metrics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Accuracy</span>
                <span className="font-semibold text-blue-600">
                  {summary.activityStats.steps.avgAccuracyPercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Difference</span>
                <span className="font-semibold text-gray-700">
                  {summary.activityStats.steps.avgDifference > 0 ? '+' : ''}
                  {summary.activityStats.steps.avgDifference.toFixed(0)} steps
                </span>
              </div>
            </div>
          </Card>

          {/* Distance Metrics */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Distance Metrics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Accuracy</span>
                <span className="font-semibold text-green-600">
                  {summary.activityStats.distance.avgAccuracyPercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Difference</span>
                <span className="font-semibold text-gray-700">
                  {summary.activityStats.distance.avgDifference > 0 ? '+' : ''}
                  {summary.activityStats.distance.avgDifference.toFixed(0)}m
                </span>
              </div>
            </div>
          </Card>

          {/* Calories Metrics */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Calories Metrics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Accuracy</span>
                <span className="font-semibold text-orange-600">
                  {summary.activityStats.calories.avgAccuracyPercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Difference</span>
                <span className="font-semibold text-gray-700">
                  {summary.activityStats.calories.avgDifference > 0 ? '+' : ''}
                  {summary.activityStats.calories.avgDifference.toFixed(0)} kcal
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Accuracy Trend Chart */}
      {accuracyTrend.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Activity Accuracy Trend (Last 90 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={accuracyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis domain={[0, 100]} label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number | undefined) => value !== undefined ? [`${value.toFixed(1)}%`, ''] : ['N/A', '']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="activityStats.steps.avgAccuracyPercent"
                stroke="#3b82f6"
                name="Steps Accuracy"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="activityStats.distance.avgAccuracyPercent"
                stroke="#10b981"
                name="Distance Accuracy"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="activityStats.calories.avgAccuracyPercent"
                stroke="#f97316"
                name="Calories Accuracy"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
