import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import apiClient from '../../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Info, Thermometer } from 'lucide-react';
import AdminSkinTempBenchmarkTab from './AdminSkinTempBenchmarkTab';
import AdminSkinTempFirmwareTab from './AdminSkinTempFirmwareTab';
import type { SubTab } from './SubTabBar';

interface GlobalSummary {
  totalUsers: number;
  totalSessions: number;
  totalReadings: number;
  computedAt: string;
  latestFirmwareVersion?: string;
  skinTempStats?: {
    avgBias?: number;
    avgMean?: number;
    avgMin?: number;
    avgMax?: number;
    avgRange?: number;
    lunaAvg?: number;
    benchmarkAvg?: number;
  };
}

interface DailyTrend {
  date: string;
  lunaAvg?: number;
  benchmarkAvg?: number;
  avgBias?: number;
  sessionCount: number;
}

interface AdminSkinTempOverviewTabProps {
  subTab: SubTab;
}

const formatLastUpdated = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const AdminSkinTempOverviewTab: React.FC<AdminSkinTempOverviewTabProps> = ({ subTab }) => {
  const [globalSummary, setGlobalSummary] = useState<GlobalSummary | null>(null);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<10 | 30>(10);

  // Fetch global summary on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    apiClient.get('/admin/global-summary?metric=SkinTemp')
      .then(res => {
        setGlobalSummary(res.data.data);
      })
      .catch(err => console.error('Error fetching SkinTemp global summary:', err))
      .finally(() => setLoading(false));
  }, []);

  // Fetch daily trends when time range changes
  useEffect(() => {
    const today = new Date();
    const daysAgo = new Date(today);
    daysAgo.setDate(today.getDate() - selectedTimeRange);
    const startDate = daysAgo.toISOString().split('T')[0];
    
    apiClient.get(`/skintemp/admin/trend?startDate=${startDate}`)
      .then(res => {
        setDailyTrends(res.data.data || []);
      })
      .catch(err => console.error('Error fetching SkinTemp trends:', err));
  }, [selectedTimeRange]);

  // Handle sub-tabs
  if (subTab === 'benchmark') {
    return <AdminSkinTempBenchmarkTab />;
  }

  if (subTab === 'firmware') {
    return <AdminSkinTempFirmwareTab />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Stats Cards */}
      {globalSummary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <div className="space-y-2">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Total Users</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                  {globalSummary.totalUsers || 0}
                </p>
                <p className="text-xs text-gray-500">With SkinTemp data</p>
              </div>
            </Card>

            <Card>
              <div className="space-y-2">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Total Sessions</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                  {globalSummary.totalSessions || 0}
                </p>
                <p className="text-xs text-gray-500">
                  {globalSummary.latestFirmwareVersion 
                    ? `Firmware: ${globalSummary.latestFirmwareVersion}` 
                    : 'Across all users'}
                </p>
              </div>
            </Card>

            <Card>
              <div className="space-y-2">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Avg Temp</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                  {globalSummary.skinTempStats?.avgMean?.toFixed(1) || '--'}°C
                </p>
                <p className="text-xs text-gray-500">Global average</p>
              </div>
            </Card>

            <Card>
              <div className="space-y-2">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Last Updated</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
                  {globalSummary.computedAt ? formatLastUpdated(globalSummary.computedAt) : '--'}
                </p>
                <p className="text-xs text-gray-500">Data freshness</p>
              </div>
            </Card>
          </div>

          {/* Bias Stats - Only show bias for SkinTemp */}
          {globalSummary.skinTempStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <Thermometer size={16} className="text-orange-500" />
                      Falcon Average
                    </span>
                    <span className="text-lg font-semibold text-orange-600">
                      {globalSummary.skinTempStats.lunaAvg?.toFixed(2) || '--'}°C
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Average across all sessions</p>
                </div>
              </Card>
              <Card>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <Thermometer size={16} className="text-blue-500" />
                      Apple Average
                    </span>
                    <span className="text-lg font-semibold text-blue-600">
                      {globalSummary.skinTempStats.benchmarkAvg?.toFixed(2) || '--'}°C
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Average from Apple Watch</p>
                </div>
              </Card>
              <Card>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 font-medium">Avg Bias</span>
                    <span className={`text-lg font-semibold ${
                      globalSummary.skinTempStats.avgBias !== undefined
                        ? (globalSummary.skinTempStats.avgBias >= 0 ? 'text-red-500' : 'text-blue-500')
                        : 'text-gray-400'
                    }`}>
                      {globalSummary.skinTempStats.avgBias !== undefined 
                        ? `${globalSummary.skinTempStats.avgBias >= 0 ? '+' : ''}${globalSummary.skinTempStats.avgBias.toFixed(2)}°C`
                        : '--'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {globalSummary.skinTempStats.avgBias !== undefined 
                      ? (globalSummary.skinTempStats.avgBias >= 0 ? 'Falcon reads higher' : 'Falcon reads lower')
                      : 'Falcon - Apple. Target: ±0.3°C'}
                  </p>
                </div>
              </Card>
            </div>
          )}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-1">SkinTemp Comparison Note</h4>
                <p className="text-xs text-blue-700">
                  Apple Watch provides a single average temperature per sleep session. 
                  Only bias comparison is meaningful — MAE, RMSE, and Pearson R are not applicable.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Daily Bias Trend Chart */}
      <Card title={`Daily Bias Trend (Last ${selectedTimeRange} Days)`}>
        <div className="space-y-4">
          {/* Time Range Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTimeRange(10)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedTimeRange === 10
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              10 Days
            </button>
            <button
              onClick={() => setSelectedTimeRange(30)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedTimeRange === 30
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Chart */}
          {dailyTrends.filter(d => d.avgBias !== undefined).length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={dailyTrends.filter(d => d.avgBias !== undefined)} 
                  margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(val) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}°C`}
                    label={{ 
                      value: 'Avg Bias (°C)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fontSize: '14px', fill: '#4b5563' }
                    }}
                  />
                  <Tooltip 
                    formatter={(value: number | undefined) => {
                      const v = value ?? 0;
                      return [`${v >= 0 ? '+' : ''}${v.toFixed(2)}°C`, 'Avg Bias'];
                    }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { 
                      year: 'numeric', month: 'short', day: 'numeric' 
                    })}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgBias"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Avg Bias"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">No bias trend data available for the selected period</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminSkinTempOverviewTab;
