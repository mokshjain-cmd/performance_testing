import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import { Footprints, Activity, TrendingUp, Users } from 'lucide-react';
import { activityService } from '../../services/activity.service';
import type {
  AdminGlobalActivitySummary,
  ActivityAccuracyTrend,
} from '../../types/activity.types';
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

interface AdminActivityOverviewTabProps {}

const AdminActivityOverviewTab: React.FC<AdminActivityOverviewTabProps> = () => {
  const [summary, setSummary] = useState<AdminGlobalActivitySummary | null>(null);
  const [accuracyTrend, setAccuracyTrend] = useState<ActivityAccuracyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'30' | '90'>('90');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(timeRange));
        
        const [summaryData, trendData] = await Promise.all([
          activityService.getAdminGlobalSummary({ latestFirmwareOnly: true }),
          activityService.getAdminAccuracyTrend(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          ),
        ]);

        console.log('[Activity Overview] ✅ Received summary:', summaryData);
        console.log('[Activity Overview] ✅ Received trend data:', trendData);
        setSummary(summaryData);
        setAccuracyTrend(trendData);
      } catch (err) {
        console.error('[Activity Overview] ❌ Error fetching data:', err);
        console.error('Error loading admin activity data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activity data...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-600">No activity data available</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 90) return '#10b981'; // green
    if (accuracy >= 80) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className="space-y-6">
      {/* 1️⃣ KEY KPIs */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Global Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Sessions */}
          <Card>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <p className="text-sm text-gray-500 uppercase tracking-wide">Total Sessions</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {summary.totalSessions}
              </p>
              <p className="text-xs text-gray-500">Activity sessions tested</p>
            </div>
          </Card>

          {/* Total Users */}
          <Card>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                <p className="text-sm text-gray-500 uppercase tracking-wide">Users Tested</p>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {summary.totalUsers}
              </p>
              <p className="text-xs text-gray-500">Unique participants</p>
            </div>
          </Card>

          {/* Latest Firmware */}
          <Card>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <p className="text-sm text-gray-500 uppercase tracking-wide">Latest Firmware</p>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {summary.latestFirmwareVersion}
              </p>
              <p className="text-xs text-gray-500">Current version</p>
            </div>
          </Card>

          
        </div>
      </div>

      {/* 2️⃣ ACCURACY METRICS GRID */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Average Accuracy Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Steps Accuracy */}
          <Card>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Footprints className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Step Accuracy</h3>
              </div>
              <div className="text-4xl font-bold" style={{ color: getAccuracyColor(summary.activityStats.steps.avgAccuracyPercent) }}>
                {summary.activityStats.steps.avgAccuracyPercent.toFixed(1)}%
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Difference:</span>
                  <span className="font-semibold">{Math.round(summary.activityStats.steps.avgDifference)} steps</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Distance Accuracy */}
          <Card>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold">Distance Accuracy</h3>
              </div>
              <div className="text-4xl font-bold" style={{ color: getAccuracyColor(summary.activityStats.distance.avgAccuracyPercent) }}>
                {summary.activityStats.distance.avgAccuracyPercent.toFixed(1)}%
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Difference:</span>
                  <span className="font-semibold">{Math.round(summary.activityStats.distance.avgDifference)}m</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Calorie Accuracy */}
          <Card>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-semibold">Calorie Accuracy</h3>
              </div>
              <div className="text-4xl font-bold" style={{ color: getAccuracyColor(summary.activityStats.calories.avgAccuracyPercent) }}>
                {summary.activityStats.calories.avgAccuracyPercent.toFixed(1)}%
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Difference:</span>
                  <span className="font-semibold">{Math.round(summary.activityStats.calories.avgDifference)} kcal</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 3️⃣ ACCURACY TREND OVER TIME */}
      {accuracyTrend.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Accuracy Trend Over Time</h3>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '30' | '90')}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={accuracyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                domain={[0, 100]}
                label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number | undefined) => value !== undefined ? [`${value.toFixed(1)}%`, ''] : ['N/A', '']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="activityStats.steps.avgAccuracyPercent"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Step Accuracy"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="activityStats.distance.avgAccuracyPercent"
                stroke="#10b981"
                strokeWidth={2}
                name="Distance Accuracy"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="activityStats.calories.avgAccuracyPercent"
                stroke="#f97316"
                strokeWidth={2}
                name="Calorie Accuracy"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Track algorithm improvements over time. Upward trends indicate better performance.
          </p>
        </Card>
      )}

      {/* Info Box */}
      <Card>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">📊 Understanding Metrics</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li><strong>Accuracy %:</strong> How close Falcon is to benchmark (higher is better)</li>
            <li><strong>Bias:</strong> Systematic over/under-estimation (closer to 0 is better)</li>
            <li><strong>MAE:</strong> Mean Absolute Error - average error magnitude</li>
            <li><strong>MAPE:</strong> Mean Absolute Percentage Error - relative error</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default AdminActivityOverviewTab;
