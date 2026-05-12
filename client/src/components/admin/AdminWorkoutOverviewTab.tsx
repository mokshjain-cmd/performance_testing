import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import type { SubTab } from './SubTabBar';
import { getAdminWorkoutGlobalSummary } from '../../services/workout.service';
import apiClient from '../../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Info, Users, Activity, BarChart3 } from 'lucide-react';
import AdminWorkoutBenchmarkTab from './AdminWorkoutBenchmarkTab';
import AdminWorkoutFirmwareTab from './AdminWorkoutFirmwareTab';

interface GlobalSummary {
  totalUsers: number;
  totalSessions: number;
  totalReadings: number;
  computedAt: string;
  latestFirmwareVersion?: string;
  // Backend returns lunaStats (from adminGlobalSummary.service.ts)
  lunaStats?: {
    avgMAE?: number;
    avgRMSE?: number;
    avgMAPE?: number;
    avgPearson?: number;
    avgBias?: number;
  };
  workoutStats?: {
    avgHrMae?: number;
    avgHrPearson?: number;
    avgCaloriesBias?: number;
    avgStepsBias?: number;
    avgDistanceBias?: number;
  };
  sportTypeDistribution?: {
    sportType: number;
    count: number;
    sportName: string;
  }[];
}

interface DailyTrend {
  date: string;
  totalSessions: number;
  totalUsers: number;
  lunaStats?: {
    avgMAE?: number;
    avgRMSE?: number;
    avgMAPE?: number;
    avgPearson?: number;
  };
}

interface AdminWorkoutOverviewTabProps {
  subTab: SubTab;
}

const SPORT_COLORS = ['#8B5CF6', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1'];

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

const AdminWorkoutOverviewTab: React.FC<AdminWorkoutOverviewTabProps> = ({ subTab }) => {
  const [globalSummary, setGlobalSummary] = useState<GlobalSummary | null>(null);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<10 | 30>(10);
  const [selectedChartMetric, setSelectedChartMetric] = useState<'avgMae' | 'avgRmse' | 'avgPearson'>('avgMae');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch global summary
        const summaryData = await getAdminWorkoutGlobalSummary();
        setGlobalSummary(summaryData);
        
        // Fetch daily trends
        const today = new Date();
        const daysAgo = new Date(today);
        daysAgo.setDate(today.getDate() - selectedTimeRange);
        const startDate = daysAgo.toISOString().split('T')[0];
        
        const trendRes = await apiClient.get(`/admin/daily-trends?startDate=${startDate}&metric=Workout`);
        setDailyTrends(trendRes.data.data || []);
      } catch (err) {
        console.error('Error fetching workout global data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (subTab === 'overview') {
      fetchData();
    }
  }, [subTab, selectedTimeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workout data...</p>
        </div>
      </div>
    );
  }

  // Render benchmark tab
  if (subTab === 'benchmark') {
    return <AdminWorkoutBenchmarkTab />;
  }

  // Render firmware tab
  if (subTab === 'firmware') {
    return <AdminWorkoutFirmwareTab />;
  }

  // Overview tab content
  const chartData = dailyTrends.map(trend => {
    // Map frontend metric names to backend field names (lunaStats uses uppercase)
    const metricMap: Record<string, keyof NonNullable<DailyTrend['lunaStats']>> = {
      'avgMae': 'avgMAE',
      'avgRmse': 'avgRMSE',
      'avgPearson': 'avgPearson',
    };
    const backendField = metricMap[selectedChartMetric];
    return {
      date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: trend.lunaStats?.[backendField] ?? 0,
      totalSessions: trend.totalSessions,
    };
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{globalSummary?.totalUsers || 0}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Activity className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Workouts</p>
              <p className="text-2xl font-bold text-gray-900">{globalSummary?.totalSessions || 0}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <BarChart3 className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total HR Readings</p>
              <p className="text-2xl font-bold text-gray-900">
                {globalSummary?.totalReadings?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Last Updated</p>
            <p className="text-2xl font-bold text-orange-600">
              {globalSummary?.computedAt ? formatLastUpdated(globalSummary.computedAt) : '--'}
            </p>
            {globalSummary?.latestFirmwareVersion && (
              <p className="text-xs text-gray-500">Firmware: {globalSummary.latestFirmwareVersion}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Accuracy Stats */}
      {globalSummary?.lunaStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">MAE</span>
                <span className="text-lg font-semibold text-gray-800">
                  {globalSummary.lunaStats.avgMAE?.toFixed(2) || '--'} <span className="text-sm text-gray-500">BPM</span>
                </span>
              </div>
              <p className="text-xs text-gray-500">Mean Absolute Error. Target: &lt;5 BPM</p>
            </div>
          </Card>
          <Card>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">RMSE</span>
                <span className="text-lg font-semibold text-gray-800">
                  {globalSummary.lunaStats.avgRMSE?.toFixed(2) || '--'} <span className="text-sm text-gray-500">BPM</span>
                </span>
              </div>
              <p className="text-xs text-gray-500">Root Mean Square Error. Target: &lt;7 BPM</p>
            </div>
          </Card>
          <Card>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">Pearson R</span>
                <span className="text-lg font-semibold text-gray-800">
                  {globalSummary.lunaStats.avgPearson?.toFixed(3) || '--'}
                </span>
              </div>
              <p className="text-xs text-gray-500">Correlation coefficient. Target: &gt;0.9</p>
            </div>
          </Card>
          <Card>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">MAPE</span>
                <span className="text-lg font-semibold text-gray-800">
                  {globalSummary.lunaStats.avgMAPE?.toFixed(2) || '--'}%
                </span>
              </div>
              <p className="text-xs text-gray-500">Mean Absolute % Error. Target: &lt;10%</p>
            </div>
          </Card>
          <Card>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">Mean Bias</span>
                <span className="text-lg font-semibold text-gray-800">
                  {globalSummary.lunaStats.avgBias?.toFixed(2) || '--'} <span className="text-sm text-gray-500">BPM</span>
                </span>
              </div>
              <p className="text-xs text-gray-500">Systematic error. Target: ±2 BPM</p>
            </div>
          </Card>
        </div>
      )}

      {/* Workout Bias Stats (Calories, Steps, Distance) */}
      {globalSummary?.workoutStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">Avg Calories Bias</span>
                <span className={`text-lg font-semibold ${
                  globalSummary.workoutStats.avgCaloriesBias !== undefined 
                    ? (globalSummary.workoutStats.avgCaloriesBias >= 0 ? 'text-red-500' : 'text-blue-500')
                    : 'text-gray-400'
                }`}>
                  {globalSummary.workoutStats.avgCaloriesBias !== undefined 
                    ? `${globalSummary.workoutStats.avgCaloriesBias >= 0 ? '+' : ''}${globalSummary.workoutStats.avgCaloriesBias.toFixed(1)} kcal`
                    : '--'}
                </span>
              </div>
              <p className="text-xs text-gray-500">Falcon - Benchmark. Positive = Falcon higher</p>
            </div>
          </Card>
          <Card>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">Avg Steps Bias</span>
                <span className={`text-lg font-semibold ${
                  globalSummary.workoutStats.avgStepsBias !== undefined 
                    ? (globalSummary.workoutStats.avgStepsBias >= 0 ? 'text-red-500' : 'text-blue-500')
                    : 'text-gray-400'
                }`}>
                  {globalSummary.workoutStats.avgStepsBias !== undefined 
                    ? `${globalSummary.workoutStats.avgStepsBias >= 0 ? '+' : ''}${Math.round(globalSummary.workoutStats.avgStepsBias)}`
                    : '--'}
                </span>
              </div>
              <p className="text-xs text-gray-500">Falcon - Benchmark. Positive = Falcon higher</p>
            </div>
          </Card>
          <Card>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">Avg Distance Bias</span>
                <span className={`text-lg font-semibold ${
                  globalSummary.workoutStats.avgDistanceBias !== undefined 
                    ? (globalSummary.workoutStats.avgDistanceBias >= 0 ? 'text-red-500' : 'text-blue-500')
                    : 'text-gray-400'
                }`}>
                  {globalSummary.workoutStats.avgDistanceBias !== undefined 
                    ? `${globalSummary.workoutStats.avgDistanceBias >= 0 ? '+' : ''}${globalSummary.workoutStats.avgDistanceBias.toFixed(0)} m`
                    : '--'}
                </span>
              </div>
              <p className="text-xs text-gray-500">Falcon - Benchmark. Positive = Falcon higher</p>
            </div>
          </Card>
        </div>
      )}

      {/* Sport Type Distribution */}
      {globalSummary?.sportTypeDistribution && globalSummary.sportTypeDistribution.length > 0 && (
        <Card title="Workout Distribution by Sport Type">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Pie Chart */}
            <div className="h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={globalSummary.sportTypeDistribution}
                    dataKey="count"
                    nameKey="sportName"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name || 'Unknown'} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {globalSummary.sportTypeDistribution.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={SPORT_COLORS[index % SPORT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex-1 grid grid-cols-2 gap-2">
              {globalSummary.sportTypeDistribution.map((sport, index) => (
                <div key={sport.sportType} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: SPORT_COLORS[index % SPORT_COLORS.length] }}
                  />
                  <span className="text-sm text-gray-700">{sport.sportName}</span>
                  <span className="text-sm font-semibold ml-auto">{sport.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Trend Chart */}
      <Card title={`Workout HR Accuracy Trends (Last ${selectedTimeRange} Days)`}>
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTimeRange(10)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTimeRange === 10
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                10 Days
              </button>
              <button
                onClick={() => setSelectedTimeRange(30)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTimeRange === 30
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                30 Days
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedChartMetric('avgMae')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedChartMetric === 'avgMae'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                MAE
              </button>
              <button
                onClick={() => setSelectedChartMetric('avgRmse')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedChartMetric === 'avgRmse'
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
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number | undefined) => [value?.toFixed(3) ?? 'N/A', selectedChartMetric === 'avgMae' ? 'MAE' : selectedChartMetric === 'avgRmse' ? 'RMSE' : 'Pearson R']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No trend data available</p>
            </div>
          )}

          {/* Interpretation */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-700">Interpreting Workout HR Accuracy</span>
            </div>
            <p className="text-xs text-gray-600">
              Workout HR accuracy compares Falcon readings against benchmark devices during exercise sessions.
              Lower MAE/RMSE and higher Pearson R indicate better accuracy. Target: MAE &lt;5 BPM, Pearson R &gt;0.9.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminWorkoutOverviewTab;
