import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import type { Metric } from './MetricsSelector';
import type { SubTab } from './SubTabBar';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ActivityAnalysisTab from './ActivityAnalysisTab';
import BenchmarkComparisonTab from './BenchmarkComparisonTab';
import FirmwarePerformanceTab from './FirmwarePerformanceTab';

interface GlobalSummary {
  totalUsers: number;
  totalSessions: number;
  totalReadings: number;
  computedAt: string;
  lunaStats: {
    avgMAE: number;
    avgRMSE: number;
    avgMAPE: number;
    avgPearson: number;
    avgBias: number;
  };
}

interface DailyTrend {
  date: string;
  totalSessions: number;
  totalUsers: number;
  lunaStats: {
    avgMAE?: number;
    avgRMSE?: number;
    avgPearson?: number;
  };
}

type ChartMetric = 'avgMAE' | 'avgRMSE' | 'avgPearson';

interface AdminOverviewTabProps {
  metric: Metric;
  subTab: SubTab;
}

const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({ metric, subTab }) => {
  const [globalSummary, setGlobalSummary] = useState<GlobalSummary | null>(null);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChartMetric, setSelectedChartMetric] = useState<ChartMetric>('avgMAE');

  useEffect(() => {
    // Fetch global summary
    setLoading(true);
    axios.get('http://localhost:3000/api/admin/global-summary')
      .then(res => {
        setGlobalSummary(res.data.data);
      })
      .catch(err => console.error('Error fetching global summary:', err))
      .finally(() => setLoading(false));

    // Fetch daily trends for last 10 days
    const today = new Date();
    const tenDaysAgo = new Date(today);
    tenDaysAgo.setDate(today.getDate() - 10);
    const startDate = tenDaysAgo.toISOString().split('T')[0];

    axios.get(`http://localhost:3000/api/admin/daily-trends?startDate=${startDate}`)
      .then(res => {
        setDailyTrends(res.data.data || []);
        console.log('Fetched daily trends:', res.data.data);
      })
      .catch(err => console.error('Error fetching daily trends:', err));
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getChartData = () => {
    return dailyTrends.map(trend => ({
      date: formatDate(trend.date),
      value: trend.lunaStats[selectedChartMetric] || 0,
      totalSessions: trend.totalSessions,
      totalUsers: trend.totalUsers,
    }));
  };

  const getMetricLabel = (metric: ChartMetric) => {
    switch (metric) {
      case 'avgMAE': return 'Mean Absolute Error';
      case 'avgRMSE': return 'Root Mean Square Error';
      case 'avgPearson': return 'Pearson Correlation';
    }
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    console.log('Last updated date:', date.toISOString());
    console.log('Current date:', now.toISOString());
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Total Users</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
              {globalSummary?.totalUsers || 0}
            </p>
            <p className="text-xs text-gray-500">Registered users</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Total Luna Readings</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
              {globalSummary?.totalReadings.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500">Recorded data points</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Total Sessions</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
              {globalSummary?.totalSessions || 0}
            </p>
            <p className="text-xs text-gray-500">Across all users</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Last Updated</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              {globalSummary?.computedAt ? formatLastUpdated(globalSummary.computedAt) : '--'}
            </p>
            <p className="text-xs text-gray-500">Data freshness</p>
          </div>
        </Card>
      </div>

      {/* Additional Stats */}
      {globalSummary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">MAE</span>
              <span className="text-lg font-semibold text-gray-800">
                {globalSummary.lunaStats.avgMAE.toFixed(2)}
              </span>
            </div>
          </Card>
          <Card>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">RMSE</span>
              <span className="text-lg font-semibold text-gray-800">
                {globalSummary.lunaStats.avgRMSE.toFixed(2)}
              </span>
            </div>
          </Card>
          <Card>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pearson R</span>
              <span className="text-lg font-semibold text-gray-800">
                {globalSummary.lunaStats.avgPearson.toFixed(3)}
              </span>
            </div>
          </Card>
          <Card>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">MAPE</span>
              <span className="text-lg font-semibold text-gray-800">
                {globalSummary.lunaStats.avgMAPE.toFixed(2)}%
              </span>
            </div>
          </Card>
          <Card>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Mean Bias</span>
              <span className="text-lg font-semibold text-gray-800">
                {globalSummary.lunaStats.avgBias.toFixed(2)}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Content based on sub-tab */}
      {subTab === 'overview' && (
        <Card title={`Global ${metric.toUpperCase()} Performance Trends (Last 10 Days)`}>
          <div className="space-y-4">
            {/* Metric Selector */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setSelectedChartMetric('avgMAE')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedChartMetric === 'avgMAE'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                MAE
              </button>
              <button
                onClick={() => setSelectedChartMetric('avgRMSE')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedChartMetric === 'avgRMSE'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                RMSE
              </button>
              <button
                onClick={() => setSelectedChartMetric('avgPearson')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedChartMetric === 'avgPearson'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pearson
              </button>
            </div>

            {/* Chart */}
            {dailyTrends.length > 0 ? (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      label={{ value: getMetricLabel(selectedChartMetric), angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                      formatter={(value: any, name?: string) => {
                        if (name === 'value') {
                          return [Number(value).toFixed(3), getMetricLabel(selectedChartMetric)];
                        }
                         return [value, name || ''];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="space-y-1">
                              <div className="font-semibold">Date: {label}</div>
                              <div className="text-xs text-gray-600">Sessions: {data.totalSessions}</div>
                              <div className="text-xs text-gray-600">Users: {data.totalUsers}</div>
                            </div>
                          );
                        }
                        return `Date: ${label}`;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📊</div>
                <p>No trend data available</p>
                <p className="text-sm mt-2">Data will appear as sessions are recorded</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {subTab === 'activity' && <ActivityAnalysisTab />}

      {subTab === 'benchmark' && <BenchmarkComparisonTab />}

      {subTab === 'firmware' && <FirmwarePerformanceTab />}
    </div>
  );
};

export default AdminOverviewTab;
