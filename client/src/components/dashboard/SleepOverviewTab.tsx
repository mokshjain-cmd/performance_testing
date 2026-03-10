import React, { useEffect, useState } from 'react';
import { Moon, Clock, Zap, TrendingUp } from 'lucide-react';
import { SleepTrendChart } from './sleep/SleepTrendChart';
import { SleepArchitectureChart } from './sleep/SleepArchitectureChart';
import { sleepService } from '../../services/sleep.service';
import type { UserSleepOverview, SleepTrendData } from '../../types/sleep.types';
import Loader from '../common/Loader';

interface SleepOverviewTabProps {}

const SleepOverviewTab: React.FC<SleepOverviewTabProps> = () => {
  const [overview, setOverview] = useState<UserSleepOverview | null>(null);
  const [durationTrend, setDurationTrend] = useState<SleepTrendData[]>([]);
  const [stageTrend, setStageTrend] = useState<SleepTrendData[]>([]);
  const [efficiencyTrend, setEfficiencyTrend] = useState<SleepTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [overviewData, trendData] = await Promise.all([
          sleepService.getUserSleepOverview(),
          sleepService.getUserSleepTrend(),
        ]);

        setOverview(overviewData);
        setDurationTrend(trendData);
        setStageTrend(trendData);
        setEfficiencyTrend(trendData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sleep data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loader />;

  if (error || !overview) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-600">{error || 'No sleep data available'}</p>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sleep Overview</h2>
            <p className="text-gray-600 mt-1">
              Analysis of your sleep patterns over the last {overview.totalSessions} sessions
            </p>
          </div>
          <Moon className="w-10 h-10 text-indigo-500" />
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Core Sleep Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Avg Total Sleep</p>
              <Moon className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatTime(overview.avgTotalSleepTimeSec)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {overview.avgTotalSleepTimeSec >= 25200 ? '✓ Healthy range' : 
               overview.avgTotalSleepTimeSec >= 21600 ? '△ Borderline' : '⚠ Below recommended'}
            </p>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            overview.avgSleepEfficiency >= 85 ? 'bg-green-50 border-green-200' :
            overview.avgSleepEfficiency >= 75 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Avg Sleep Efficiency</p>
              <Zap className={`w-5 h-5 ${
                overview.avgSleepEfficiency >= 85 ? 'text-green-500' :
                overview.avgSleepEfficiency >= 75 ? 'text-yellow-500' : 'text-red-500'
              }`} />
            </div>
            <p className={`text-2xl font-bold ${
              overview.avgSleepEfficiency >= 85 ? 'text-green-700' :
              overview.avgSleepEfficiency >= 75 ? 'text-yellow-700' : 'text-red-700'
            }`}>
              {overview.avgSleepEfficiency.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {overview.avgSleepEfficiency >= 85 ? '✓ Excellent' : 
               overview.avgSleepEfficiency >= 75 ? '△ Good' : '⚠ Needs improvement'}
            </p>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Avg Deep Sleep</p>
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-indigo-700">{formatTime(overview.avgDeepSleepSec)}</p>
            <p className="text-xs text-gray-600 mt-1">
              {overview.avgDeepPercent.toFixed(1)}% of sleep
              {overview.avgDeepPercent >= 15 && overview.avgDeepPercent <= 25 ? ' ✓' : ''}
            </p>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Avg REM Sleep</p>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-700">{formatTime(overview.avgRemSleepSec)}</p>
            <p className="text-xs text-gray-600 mt-1">
              {overview.avgRemPercent.toFixed(1)}% of sleep
              {overview.avgRemPercent >= 20 && overview.avgRemPercent <= 25 ? ' ✓' : ''}
            </p>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-sky-50 to-blue-50 rounded-lg border border-sky-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Avg Light Sleep</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{formatTime(overview.avgLightSleepSec)}</p>
            <p className="text-xs text-gray-600 mt-1">
              {overview.avgLightPercent.toFixed(1)}% of sleep
            </p>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Avg Awake Time</p>
            </div>
            <p className="text-2xl font-bold text-gray-700">{formatTime(overview.avgAwakeSec)}</p>
            <p className="text-xs text-gray-600 mt-1">
              {overview.avgTimeInBedSec > 0 ? ((overview.avgAwakeSec / overview.avgTimeInBedSec) * 100).toFixed(1) : '0.0'}% of time in bed
            </p>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">{overview.totalSessions}</p>
            <p className="text-xs text-gray-600 mt-1">Sleep recordings analyzed</p>
          </div>
        </div>
      </div>

      {/* Tracking Accuracy */}
      {overview.comparison && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Tracking Accuracy vs Benchmark</h3>
          
          {/* Average Accuracy with interpretation */}
          <div className="mb-6">
            <div 
              className={`inline-block px-6 py-3 rounded-lg ${
                overview.comparison.avgAccuracyPercent >= 80 
                  ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                  : overview.comparison.avgAccuracyPercent >= 70 
                  ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' 
                  : 'bg-red-100 text-red-800 border-2 border-red-300'
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Average Accuracy:</span>
                  <span className="text-2xl font-bold">
                    {overview.comparison.avgAccuracyPercent.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs">
                  {overview.comparison.avgAccuracyPercent >= 80 
                    ? '✓ Excellent - Falcon closely matches benchmark' 
                    : overview.comparison.avgAccuracyPercent >= 70 
                    ? '△ Good - Minor differences expected' 
                    : '⚠ Needs review - Consider recalibration'}
                </p>
              </div>
            </div>
          </div>

          {/* Bias Metrics - Enhanced */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Average Differences (Falcon vs Benchmark)</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Total Sleep Time</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Difference:</span>
                  <span className={`font-bold text-base ${
                    Math.abs(overview.comparison.avgTotalSleepDiffSec) < 600 
                      ? 'text-green-600' 
                      : Math.abs(overview.comparison.avgTotalSleepDiffSec) < 1200 
                      ? 'text-yellow-600' 
                      : 'text-red-600'
                  }`}>
                    {overview.comparison.avgTotalSleepDiffSec > 0 ? '+' : ''}
                    {formatTime(Math.abs(overview.comparison.avgTotalSleepDiffSec))}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {overview.comparison.avgTotalSleepDiffSec > 0 ? 'Falcon detects more sleep' : 'Falcon detects less sleep'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Deep Sleep</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Difference:</span>
                  <span className={`font-bold text-base ${
                    Math.abs(overview.comparison.avgDeepDiffSec) < 300 
                      ? 'text-green-600' 
                      : Math.abs(overview.comparison.avgDeepDiffSec) < 600 
                      ? 'text-yellow-600' 
                      : 'text-red-600'
                  }`}>
                    {overview.comparison.avgDeepDiffSec > 0 ? '+' : ''}
                    {formatTime(Math.abs(overview.comparison.avgDeepDiffSec))}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {overview.comparison.avgDeepDiffSec > 0 ? 'Falcon detects more' : 'Falcon detects less'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-600 mb-2">REM Sleep</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Difference:</span>
                  <span className={`font-bold text-base ${
                    Math.abs(overview.comparison.avgRemDiffSec) < 300 
                      ? 'text-green-600' 
                      : Math.abs(overview.comparison.avgRemDiffSec) < 600 
                      ? 'text-yellow-600' 
                      : 'text-red-600'
                  }`}>
                    {overview.comparison.avgRemDiffSec > 0 ? '+' : ''}
                    {formatTime(Math.abs(overview.comparison.avgRemDiffSec))}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {overview.comparison.avgRemDiffSec > 0 ? 'Falcon detects more' : 'Falcon detects less'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
            <p className="font-semibold mb-1">💡 Understanding the Differences:</p>
            <p>
              <span className="text-green-600 font-semibold">Green</span> indicates excellent agreement. 
              <span className="text-yellow-600 font-semibold ml-2">Yellow</span> shows acceptable variation. 
              <span className="text-red-600 font-semibold ml-2">Red</span> suggests larger differences that may need attention.
            </p>
          </div>
        </div>
      )}

      {/* Sleep Stage Distribution */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Sleep Stage Distribution</h3>
        <SleepArchitectureChart
          deep={overview.avgDeepPercent}
          rem={overview.avgRemPercent}
          light={overview.avgLightPercent}
          awake={overview.avgTimeInBedSec > 0 ? (overview.avgAwakeSec / overview.avgTimeInBedSec) * 100 : 0}
        />
      </div>

      {/* Sleep Duration Trend */}
      {durationTrend.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <SleepTrendChart
            data={durationTrend}
            metrics={['totalSleepTime']}
            title="Sleep Duration Trend (Last 30 Days)"
          />
        </div>
      )}

      {/* Stage Trend */}
      {stageTrend.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <SleepTrendChart
            data={stageTrend}
            metrics={['deep', 'rem', 'light']}
            title="Sleep Stage Trend (Last 30 Days)"
          />
        </div>
      )}

      {/* Efficiency Trend */}
      {efficiencyTrend.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <SleepTrendChart
            data={efficiencyTrend}
            metrics={['efficiency']}
            title="Sleep Efficiency Trend (Last 30 Days)"
          />
        </div>
      )}
    </div>
  );
};

export default SleepOverviewTab;
