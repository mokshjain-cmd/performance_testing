import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import type { SubTab } from './SubTabBar';
import apiClient from '../../services/api';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, LineChart, Line } from 'recharts';

interface GlobalSleepSummary {
  totalUsers: number;
  totalSessions: number;
  totalSleepTimeSec: number;
  avgTotalSleepTimeSec: number;
  avgDeepPercent: number;
  avgRemPercent: number;
  avgEpochAccuracyPercent: number;
  avgKappaScore: number;
  avgDeepBiasSec: number;
  avgRemBiasSec: number;
  avgTotalSleepBiasSec: number;
  stageSensitivity: {
    AWAKE: number;
    LIGHT: number;
    DEEP: number;
    REM: number;
  };
  latestFirmwareVersion: string;
}

interface FirmwarePerformance {
  firmwareVersion: string;
  avgAccuracyPercent: number;
  avgKappaScore: number;
  avgTotalSleepBiasSec: number;
  avgDeepBiasSec: number;
  avgRemBiasSec: number;
  totalSessions: number;
  stageSensitivity: {
    AWAKE: number;
    LIGHT: number;
    DEEP: number;
    REM: number;
  };
}

interface BenchmarkComparison {
  benchmarkDevice: string;
  avgAccuracyPercent: number;
  avgKappaScore: number;
  avgDeepBiasSec: number;
  avgRemBiasSec: number;
  totalSessions: number;
  stageSensitivity: {
    AWAKE: number;
    LIGHT: number;
    DEEP: number;
    REM: number;
  };
}

interface AccuracyTrend {
  date: string;
  avgAccuracyPercent: number;
  avgKappaScore: number;
  avgBiasSec: number;
  sessionCount: number;
}

interface AdminSleepOverviewTabProps {
  subTab: SubTab;
}

const AdminSleepOverviewTab: React.FC<AdminSleepOverviewTabProps> = ({ subTab }) => {
  const [globalSummary, setGlobalSummary] = useState<GlobalSleepSummary | null>(null);
  const [firmwareData, setFirmwareData] = useState<FirmwarePerformance[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkComparison[]>([]);
  const [trendData, setTrendData] = useState<AccuracyTrend[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    
    // Fetch global summary
    apiClient.get('/sleep/admin/global-summary')
      .then(res => {
        setGlobalSummary(res.data.data);
      })
      .catch(err => console.error('Error fetching global sleep summary:', err))
      .finally(() => setLoading(false));

    // Fetch firmware comparison
    apiClient.get('/sleep/admin/firmware-comparison')
      .then(res => {
        setFirmwareData(res.data.data || []);
      })
      .catch(err => console.error('Error fetching firmware comparison:', err));

    // Fetch benchmark comparison
    apiClient.get('/sleep/admin/benchmark-comparison')
      .then(res => {
        setBenchmarkData(res.data.data || []);
      })
      .catch(err => console.error('Error fetching benchmark comparison:', err));

    // Fetch accuracy trend (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    apiClient.get('/sleep/admin/accuracy-trend', {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    })
      .then(res => {
        setTrendData(res.data.data || []);
      })
      .catch(err => console.error('Error fetching accuracy trend:', err));
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sleep data...</p>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Total Users</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
              {globalSummary?.totalUsers || 0}
            </p>
            <p className="text-xs text-gray-500">With sleep data</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Total Sessions</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
              {globalSummary?.totalSessions || 0}
            </p>
            <p className="text-xs text-gray-500">Sleep sessions analyzed</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Total Sleep Time</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">
              {formatTime(globalSummary?.totalSleepTimeSec || 0)}
            </p>
            <p className="text-xs text-gray-500">Across all users (firmware {globalSummary?.latestFirmwareVersion})</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Avg Accuracy</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
              {globalSummary?.avgEpochAccuracyPercent.toFixed(1) || 0}%
            </p>
            <p className="text-xs text-gray-500">Epoch-level accuracy</p>
          </div>
        </Card>
      </div>

      {/* Accuracy Metrics */}
      <Card>
        <h3 className="text-lg font-semibold mb-6">System Validation Metrics</h3>
        
        {/* Main Metrics - Prominent Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Epoch Accuracy</p>
                <p className="text-xs text-gray-500 mt-0.5">30-second agreement</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-blue-700">
                  {globalSummary?.avgEpochAccuracyPercent.toFixed(1) || 0}%
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-blue-200">
              {(globalSummary?.avgEpochAccuracyPercent || 0) >= 85 && <p className="text-sm text-green-700 font-semibold">Excellent: Clinical-grade</p>}
              {(globalSummary?.avgEpochAccuracyPercent || 0) >= 75 && (globalSummary?.avgEpochAccuracyPercent || 0) < 85 && <p className="text-sm text-yellow-700 font-semibold">Good: Approaching target</p>}
              {(globalSummary?.avgEpochAccuracyPercent || 0) < 75 && <p className="text-sm text-red-700 font-semibold">Below target (&lt;85%)</p>}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Cohen's Kappa</p>
                <p className="text-xs text-gray-500 mt-0.5">Statistical agreement</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-purple-700">
                  {globalSummary?.avgKappaScore.toFixed(3) || 0}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-purple-200">
              {(globalSummary?.avgKappaScore || 0) >= 0.8 && <p className="text-sm text-green-700 font-semibold">Excellent (&gt;0.8)</p>}
              {(globalSummary?.avgKappaScore || 0) >= 0.6 && (globalSummary?.avgKappaScore || 0) < 0.8 && <p className="text-sm text-yellow-700 font-semibold">Good (0.6-0.8)</p>}
              {(globalSummary?.avgKappaScore || 0) >= 0.4 && (globalSummary?.avgKappaScore || 0) < 0.6 && <p className="text-sm text-orange-700 font-semibold">Moderate (0.4-0.6)</p>}
              {(globalSummary?.avgKappaScore || 0) < 0.4 && <p className="text-sm text-red-700 font-semibold">Poor (&lt;0.4)</p>}
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-300 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Sleep Bias</p>
                <p className="text-xs text-gray-500 mt-0.5">Avg difference</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">
                  {formatTime(Math.abs(globalSummary?.avgTotalSleepBiasSec || 0))}
                  <span className="text-2xl ml-1">
                    {(globalSummary?.avgTotalSleepBiasSec || 0) > 0 ? '↑' : '↓'}
                  </span>
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-300">
              <p className="text-sm text-gray-700 font-semibold">
                {(globalSummary?.avgTotalSleepBiasSec || 0) > 0 ? 'Over-estimation' : 'Under-estimation'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Latest Firmware Version</p>
              <p className="text-xs text-gray-500 mt-0.5">Current system version</p>
            </div>
            <p className="text-2xl font-bold text-indigo-900">
              {globalSummary?.latestFirmwareVersion || 'N/A'}
            </p>
          </div>
        </div>

        {/* Interpretation Guide - Collapsed */}
        <details className="group mt-4">
          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
            <svg className="h-4 w-4 mr-1 transform group-open:rotate-90 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            What do these metrics mean?
          </summary>
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-900 space-y-2">
              <p><strong>Epoch Accuracy:</strong> Percentage of 30-second epochs where Luna agrees with benchmark. Target: &gt;85% for clinical-grade accuracy.</p>
              <p><strong>Cohen's Kappa:</strong> Statistical measure of agreement accounting for chance. &gt;0.8 = Excellent, 0.6-0.8 = Good, 0.4-0.6 = Moderate, &lt;0.4 = Poor.</p>
              <p><strong>Total Sleep Bias:</strong> Average difference in total sleep time. ↑ = Luna overestimates (detects more sleep), ↓ = Luna underestimates.</p>
            </div>
          </div>
        </details>
      </Card>

      {/* Stage-wise Performance */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">
          Stage-wise Detection Accuracy
          {benchmarkData.length > 0 && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              (vs {benchmarkData.map(b => b.benchmarkDevice).join(', ')})
            </span>
          )}
        </h3>
        <p className="text-sm text-gray-600 mb-4">How accurately Luna detects each sleep stage when compared to benchmark devices</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Awake</p>
            <p className="text-2xl font-bold text-gray-900">
              {(globalSummary?.stageSensitivity?.AWAKE ?? 0).toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 mb-1">Light</p>
            <p className="text-2xl font-bold text-blue-900">
              {(globalSummary?.stageSensitivity?.LIGHT ?? 0).toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-indigo-600 mb-1">Deep</p>
            <p className="text-2xl font-bold text-indigo-900">
              {(globalSummary?.stageSensitivity?.DEEP ?? 0).toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600 mb-1">REM</p>
            <p className="text-2xl font-bold text-purple-900">
              {(globalSummary?.stageSensitivity?.REM ?? 0).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-900">
          <p className="font-semibold mb-2">Understanding Detection Accuracy:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Measures True Positive Rate: Of all actual stage occurrences in benchmark data, what percentage did Luna correctly detect?</li>
            <li>&gt;80%: Excellent detection accuracy</li>
            <li>60-80%: Moderate detection accuracy</li>
            <li>&lt;60%: Poor detection accuracy</li>
          </ul>
        </div>
      </Card>

      {/* Bias Breakdown */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Stage-wise Bias (Luna vs Benchmark)</h3>
        <p className="text-sm text-gray-600 mb-4">Average difference between Luna and benchmark devices</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Sleep</p>
            <p className="text-xl font-bold text-gray-900">
              {formatTime(Math.abs(globalSummary?.avgTotalSleepBiasSec || 0))}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(globalSummary?.avgTotalSleepBiasSec || 0) > 0 ? '↑ Over' : '↓ Under'}
            </p>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-indigo-600 mb-1">Deep Sleep</p>
            <p className="text-xl font-bold text-indigo-900">
              {formatTime(Math.abs(globalSummary?.avgDeepBiasSec || 0))}
            </p>
            <p className="text-xs text-indigo-500 mt-1">
              {(globalSummary?.avgDeepBiasSec || 0) > 0 ? '↑ Over' : '↓ Under'}
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600 mb-1">REM Sleep</p>
            <p className="text-xl font-bold text-purple-900">
              {formatTime(Math.abs(globalSummary?.avgRemBiasSec || 0))}
            </p>
            <p className="text-xs text-purple-500 mt-1">
              {(globalSummary?.avgRemBiasSec || 0) > 0 ? '↑ Over' : '↓ Under'}
            </p>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-900">
          <p className="font-semibold mb-2">Interpreting Bias:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>↑ Over = Luna overestimates (detects more than benchmark)</li>
            <li>↓ Under = Luna underestimates (detects less than benchmark)</li>
            <li>Systematic bias helps identify calibration opportunities</li>
          </ul>
        </div>
      </Card>

      {/* Daily Accuracy & Kappa Trends */}
      <Card>
        <h3 className="text-lg font-semibold mb-6">Daily Performance Trends (Last 30 Days)</h3>
        {trendData.length > 0 ? (
          <div className="space-y-6">
            {/* Accuracy Trend */}
            <div>
              <h4 className="text-md font-medium mb-3 text-gray-700">Epoch Accuracy</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value: number | undefined) => value ? `${value.toFixed(1)}%` : 'N/A'}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgAccuracyPercent" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', r: 3 }}
                    name="Accuracy"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Kappa Trend */}
            <div>
              <h4 className="text-md font-medium mb-3 text-gray-700">Cohen's Kappa Score</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                    domain={[0, 1]}
                    tickFormatter={(value) => value.toFixed(2)}
                  />
                  <Tooltip 
                    formatter={(value: number | undefined) => value ? value.toFixed(3) : 'N/A'}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgKappaScore" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 3 }}
                    name="Kappa"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Session count info */}
            <div className="text-center text-sm text-gray-600">
              <p>Total sessions analyzed: {trendData.reduce((sum, item) => sum + item.sessionCount, 0)}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No trend data available for the last 30 days</p>
          </div>
        )}
      </Card>
    </>
  );

  const renderFirmware = () => (
    <div className="space-y-6">
      {/* Summary Table */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Firmware Performance Summary</h3>
        {firmwareData.length === 0 ? (
          <p className="text-gray-500">No firmware comparison data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firmware</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kappa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {firmwareData.map((fw) => (
                  <tr key={fw.firmwareVersion} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{fw.firmwareVersion}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fw.avgAccuracyPercent.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fw.avgKappaScore.toFixed(3)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fw.totalSessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Charts Grid */}
      {firmwareData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overall Accuracy Chart */}
          <Card>
            <h4 className="text-md font-semibold mb-4 text-gray-700">Overall Accuracy Comparison</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={firmwareData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="firmwareVersion" 
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: number | undefined) => value ? `${value.toFixed(1)}%` : 'N/A'}
                />
                <Bar dataKey="avgAccuracyPercent" fill="#8b5cf6" name="Accuracy" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Stage-wise Sensitivity Chart */}
          <Card>
            <h4 className="text-md font-semibold mb-4 text-gray-700">Stage-wise Detection Accuracy</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={firmwareData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="firmwareVersion" 
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: number | undefined) => value ? `${value.toFixed(1)}%` : 'N/A'}
                />
                <Bar dataKey="stageSensitivity.AWAKE" fill="#94a3b8" name="Awake" />
                <Bar dataKey="stageSensitivity.LIGHT" fill="#60a5fa" name="Light" />
                <Bar dataKey="stageSensitivity.DEEP" fill="#8b5cf6" name="Deep" />
                <Bar dataKey="stageSensitivity.REM" fill="#f59e0b" name="REM" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );

  const renderBenchmark = () => (
    <div className="space-y-6">
      {/* Summary Table */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Benchmark Device Performance Summary</h3>
        {benchmarkData.length === 0 ? (
          <p className="text-gray-500">No benchmark comparison data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benchmark Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kappa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deep Bias</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">REM Bias</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {benchmarkData.map((bm) => (
                  <tr key={bm.benchmarkDevice} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{bm.benchmarkDevice}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{bm.avgAccuracyPercent.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{bm.avgKappaScore.toFixed(3)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatTime(Math.abs(bm.avgDeepBiasSec))}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatTime(Math.abs(bm.avgRemBiasSec))}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{bm.totalSessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Charts Grid */}
      {benchmarkData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overall Accuracy Chart */}
          <Card>
            <h4 className="text-md font-semibold mb-4 text-gray-700">Overall Accuracy Comparison</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={benchmarkData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="benchmarkDevice" 
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: number | undefined) => value ? `${value.toFixed(1)}%` : 'N/A'}
                />
                <Bar dataKey="avgAccuracyPercent" fill="#10b981" name="Accuracy" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Stage-wise Sensitivity Chart */}
          <Card>
            <h4 className="text-md font-semibold mb-4 text-gray-700">Stage-wise Detection Accuracy</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={benchmarkData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="benchmarkDevice" 
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: number | undefined) => value ? `${value.toFixed(1)}%` : 'N/A'}
                />
                <Bar dataKey="stageSensitivity.AWAKE" fill="#94a3b8" name="Awake" />
                <Bar dataKey="stageSensitivity.LIGHT" fill="#60a5fa" name="Light" />
                <Bar dataKey="stageSensitivity.DEEP" fill="#8b5cf6" name="Deep" />
                <Bar dataKey="stageSensitivity.REM" fill="#f59e0b" name="REM" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {subTab === 'overview' && renderOverview()}
      {subTab === 'firmware' && renderFirmware()}
      {subTab === 'benchmark' && renderBenchmark()}
    </div>
  );
};

export default AdminSleepOverviewTab;
