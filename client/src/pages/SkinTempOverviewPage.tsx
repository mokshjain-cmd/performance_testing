import React, { useEffect, useState } from 'react';
import { Thermometer, TrendingUp, Info, Calendar } from 'lucide-react';
import { Card } from '../components/common';
import { skintempService } from '../services/skintemp.service';
import type { UserSkinTempOverview, SkinTempTrendData } from '../types/skintemp.types';
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

export const SkinTempOverviewPage: React.FC = () => {
  const [overview, setOverview] = useState<UserSkinTempOverview | null>(null);
  const [trendData, setTrendData] = useState<SkinTempTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('[User SkinTemp Overview] Fetching user skin temperature overview and trend...');
        const [overviewData, trend] = await Promise.all([
          skintempService.getUserSkinTempOverview(),
          skintempService.getUserSkinTempTrend(),
        ]);

        setOverview(overviewData);
        setTrendData(trend);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load skin temperature data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading skin temperature data...</div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error || 'No skin temperature data available'}</div>
      </div>
    );
  }

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 90) return 'text-green-600 bg-green-50';
    if (accuracy >= 80) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatTemperature = (val: number): string => {
    return `${val.toFixed(1)}°C`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Skin Temperature Overview</h1>
          <p className="text-gray-600 mt-1">
            Analysis of your skin temperature patterns over the last {overview.totalSessions} sessions
          </p>
        </div>
        <Thermometer className="w-12 h-12 text-orange-500" />
      </div>

      {/* Core Metrics Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Core Temperature Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-orange-500" />
                <p className="text-sm text-gray-500 uppercase tracking-wide">Avg Temperature</p>
              </div>
              <p className="text-3xl font-bold text-orange-600">
                {formatTemperature(overview.avgMean)}
              </p>
              <p className="text-xs text-gray-500">Average across all sessions</p>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-500" />
                <p className="text-sm text-gray-500 uppercase tracking-wide">Max Temperature</p>
              </div>
              <p className="text-3xl font-bold text-red-600">
                {formatTemperature(overview.avgMax)}
              </p>
              <p className="text-xs text-gray-500">Average maximum recorded</p>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500 rotate-180" />
                <p className="text-sm text-gray-500 uppercase tracking-wide">Min Temperature</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {formatTemperature(overview.avgMin)}
              </p>
              <p className="text-xs text-gray-500">Average minimum recorded</p>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <p className="text-sm text-gray-500 uppercase tracking-wide">Avg Range</p>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {overview.avgRange.toFixed(2)}°C
              </p>
              <p className="text-xs text-gray-500">Daily temperature variation</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Validation vs Apple Watch (if comparison available) */}
      {overview.comparison && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Validation vs Apple Watch</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-orange-500" />
                Falcon Average
              </h3>
              <p className="text-3xl font-bold text-orange-600">
                {formatTemperature(overview.comparison.lunaAvg)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Average across all sessions
              </p>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-blue-500" />
                Apple Average
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                {formatTemperature(overview.comparison.benchmarkAvg)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Average from Apple Watch
              </p>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                Bias
              </h3>
              <p className={`text-3xl font-bold ${overview.comparison.avgBias >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {overview.comparison.avgBias >= 0 ? '+' : ''}{overview.comparison.avgBias.toFixed(2)}°C
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {overview.comparison.avgBias >= 0 ? 'Falcon reads higher' : 'Falcon reads lower'}
              </p>
            </Card>
          </div>
          <p className="text-sm text-gray-500 mt-4 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Apple Watch provides a single average temperature per sleep session. Only bias comparison is meaningful.
          </p>
        </div>
      )}

      {/* Temperature Trend Chart */}
      {trendData.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Temperature Trend</h2>
          <Card className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
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
                  formatter={(val: number | undefined) => [`${(val ?? 0).toFixed(1)}°C`, '']}
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
                {trendData.some((d) => d.benchmarkAvg !== undefined) && (
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

      {/* Session List */}
      {overview.sessions && overview.sessions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Temp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Min
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max
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
                  {overview.sessions.map((session) => (
                    <tr
                      key={session.sessionId}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        window.location.href = `/skintemp/session/${session.sessionId}`;
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {new Date(session.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                        {formatTemperature(session.luna.mean)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        {formatTemperature(session.luna.min)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {formatTemperature(session.luna.max)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                        {session.luna.range.toFixed(2)}°C
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {session.comparison && session.comparison.correlation !== undefined ? (
                          <span className={getAccuracyColor(session.comparison.correlation * 100)}>
                            {(session.comparison.correlation * 100).toFixed(1)}%
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

export default SkinTempOverviewPage;
