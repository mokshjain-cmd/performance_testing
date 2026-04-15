import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, Thermometer, Activity } from 'lucide-react';
import { Card } from '../components/common';
import { skintempService } from '../services/skintemp.service';
import type { AdminSkinTempGlobalSummary, SkinTempTrendData } from '../types/skintemp.types';
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

export const AdminSkinTempDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<AdminSkinTempGlobalSummary | null>(null);
  const [accuracyTrend, setAccuracyTrend] = useState<SkinTempTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summaryData, trendData] = await Promise.all([
          skintempService.getAdminGlobalSummary(true),
          skintempService.getAdminAccuracyTrend(),
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

  const formatTemperature = (val: number): string => {
    return `${val.toFixed(1)}°C`;
  };

  const getAccuracyColor = (value: number): string => {
    if (value >= 90) return 'text-green-600';
    if (value >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Skin Temperature Admin Dashboard
            {summary.latestFirmwareVersion ? ` for v${summary.latestFirmwareVersion}` : ''}
          </h1>
          <p className="text-gray-600 mt-1">
            Global skin temperature analysis across all users and sessions
          </p>
        </div>
        <Thermometer className="w-12 h-12 text-orange-500" />
      </div>

      {/* Population Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Population Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Total Sessions</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                {summary.totalSessions}
              </p>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500">SkinTemp sessions</p>
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
                <p className="text-xs text-gray-500">With skin temp data</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Latest Firmware</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
                {summary.latestFirmwareVersion || 'N/A'}
              </p>
              <p className="text-xs text-gray-500">Current version</p>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Overall Correlation</p>
              <p className={`text-3xl font-bold ${getAccuracyColor((summary.skinTempStats?.avgCorrelation || 0) * 100)}`}>
                {((summary.skinTempStats?.avgCorrelation || 0) * 100).toFixed(1)}%
              </p>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500">Falcon vs Benchmark</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Temperature Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Temperature Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-orange-500" />
              Avg Temperature
            </h3>
            <p className="text-3xl font-bold text-orange-600">
              {formatTemperature(summary.skinTempStats?.avgMean || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Global average</p>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-500" />
              Avg Max
            </h3>
            <p className="text-3xl font-bold text-red-600">
              {formatTemperature(summary.skinTempStats?.avgMax || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Average maximum</p>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500 rotate-180" />
              Avg Min
            </h3>
            <p className="text-3xl font-bold text-blue-600">
              {formatTemperature(summary.skinTempStats?.avgMin || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Average minimum</p>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              Avg Range
            </h3>
            <p className="text-3xl font-bold text-purple-600">
              {(summary.skinTempStats?.avgRange || 0).toFixed(2)}°C
            </p>
            <p className="text-xs text-gray-500 mt-2">Daily variation</p>
          </Card>
        </div>
      </div>

      {/* Validation Metrics (if comparison available) */}
      {summary.skinTempStats?.avgMAE !== undefined && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Validation Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <h3 className="text-lg font-semibold mb-2">Correlation</h3>
              <p className={`text-3xl font-bold ${getAccuracyColor((summary.skinTempStats.avgCorrelation || 0) * 100)}`}>
                {((summary.skinTempStats.avgCorrelation || 0) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-2">Agreement with benchmark</p>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-2">MAE</h3>
              <p className="text-3xl font-bold text-blue-600">
                {summary.skinTempStats.avgMAE.toFixed(2)}°C
              </p>
              <p className="text-xs text-gray-500 mt-2">Mean Absolute Error</p>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-2">MAPE</h3>
              <p className="text-3xl font-bold text-purple-600">
                {(summary.skinTempStats.avgMAPE || 0).toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500 mt-2">Mean Absolute % Error</p>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-2">RMSE</h3>
              <p className="text-3xl font-bold text-orange-600">
                {(summary.skinTempStats.avgRMSE || 0).toFixed(2)}°C
              </p>
              <p className="text-xs text-gray-500 mt-2">Root Mean Square Error</p>
            </Card>
          </div>
        </div>
      )}

      {/* Accuracy Trend Chart */}
      {accuracyTrend.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Temperature Trend Over Time</h2>
          <Card className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={accuracyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) =>
                    new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={(val) => `${val}°C`}
                />
                <Tooltip
                  formatter={(val: number | undefined, name?: string) => [`${(val ?? 0).toFixed(2)}°C`, name ?? '']}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="lunaAvg"
                  name="Falcon Avg"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: '#f97316', r: 3 }}
                />
                {accuracyTrend.some((d) => d.benchmarkAvg !== undefined) && (
                  <Line
                    type="monotone"
                    dataKey="benchmarkAvg"
                    name="Benchmark Avg"
                    stroke="#6366f1"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#6366f1', r: 3 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* User Summary Table (if available) */}
      {summary.userSummaries && summary.userSummaries.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">User Summaries</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Temp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Correlation
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summary.userSummaries.map((user) => (
                    <tr
                      key={user.userId}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        window.location.href = `/admin/skintemp/user/${user.userId}`;
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {user.userName || user.userId.substring(0, 8) + '...'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.totalSessions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                        {formatTemperature(user.avgMean)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                        {user.avgRange.toFixed(2)}°C
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.avgCorrelation !== undefined ? (
                          <span className={getAccuracyColor(user.avgCorrelation * 100)}>
                            {(user.avgCorrelation * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminSkinTempDashboardPage;
