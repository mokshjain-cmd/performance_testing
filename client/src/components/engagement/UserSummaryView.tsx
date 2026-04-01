import React from 'react';
import { Activity, Heart, Moon, Wind } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { MetricLineChart } from './charts/MetricLineChart';
import type { UserOverview } from '../../types/engagement';

interface UserSummaryViewProps {
  userOverview: UserOverview;
}

export const UserSummaryView: React.FC<UserSummaryViewProps> = ({ userOverview }) => {
  // Prepare data for charts
  const hrData = userOverview.metrics
    .filter(m => m.hr.hasData && m.hr.avgHR)
    .map(m => ({
      date: m.date,
      value: m.hr.avgHR || null
    }));

  const sleepData = userOverview.metrics
    .filter(m => m.sleep.hasData && m.sleep.sleepScore !== undefined)
    .map(m => ({
      date: m.date,
      value: m.sleep.sleepScore || null
    }));

  const activityData = userOverview.metrics
    .filter(m => m.activity.hasData && m.activity.steps)
    .map(m => ({
      date: m.date,
      value: m.activity.steps || null
    }));

  const spo2Data = userOverview.metrics
    .filter(m => m.spo2.hasData && m.spo2.avgSpO2)
    .map(m => ({
      date: m.date,
      value: m.spo2.avgSpO2 || null
    }));

  // Calculate summary stats
  const calculateStats = (data: { value: number | null }[]) => {
    const values = data.filter(d => d.value !== null).map(d => d.value as number);
    if (values.length === 0) return { avg: 0, min: 0, max: 0, trend: 0 };
    
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Simple trend: compare last 3 days vs previous 3 days
    const recent = values.slice(-3);
    const previous = values.slice(-6, -3);
    const recentAvg = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    const previousAvg = previous.length > 0 ? previous.reduce((a, b) => a + b, 0) / previous.length : 0;
    const trend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
    
    return { avg, min, max, trend };
  };

  const hrStats = calculateStats(hrData);
  const sleepStats = calculateStats(sleepData);
  const activityStats = calculateStats(activityData);
  const spo2Stats = calculateStats(spo2Data);

  return (
    <div className="space-y-5">
      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* HR Summary */}
        <div className="bg-gradient-to-br from-red-50 to-white rounded-xl border border-red-100 p-5 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <Heart className="text-red-500" size={22} />
            <span className="text-sm font-semibold text-gray-800">Heart Rate</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{hrStats.avg.toFixed(0)}</span>
            <span className="text-sm text-gray-600">bpm</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className={`font-medium ${hrStats.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {hrStats.trend >= 0 ? '↑' : '↓'} {Math.abs(hrStats.trend).toFixed(1)}%
            </span>
            <span className="text-gray-500">vs prev 3 days</span>
          </div>
          <div className="mt-3 pt-3 border-t border-red-100 flex justify-between text-xs text-gray-600">
            <span>Min: {hrStats.min.toFixed(0)}</span>
            <span>Max: {hrStats.max.toFixed(0)}</span>
          </div>
        </div>

        {/* Sleep Summary */}
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 p-5 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <Moon className="text-purple-500" size={22} />
            <span className="text-sm font-semibold text-gray-800">Sleep Score</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{sleepStats.avg.toFixed(0)}</span>
            <span className="text-sm text-gray-600">/100</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className={`font-medium ${sleepStats.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {sleepStats.trend >= 0 ? '↑' : '↓'} {Math.abs(sleepStats.trend).toFixed(1)}%
            </span>
            <span className="text-gray-500">vs prev 3 days</span>
          </div>
          <div className="mt-3 pt-3 border-t border-purple-100 flex justify-between text-xs text-gray-600">
            <span>Min: {sleepStats.min.toFixed(0)}</span>
            <span>Max: {sleepStats.max.toFixed(0)}</span>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-5 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="text-blue-500" size={22} />
            <span className="text-sm font-semibold text-gray-800">Daily Steps</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{(activityStats.avg / 1000).toFixed(1)}k</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className={`font-medium ${activityStats.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {activityStats.trend >= 0 ? '↑' : '↓'} {Math.abs(activityStats.trend).toFixed(1)}%
            </span>
            <span className="text-gray-500">vs prev 3 days</span>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-100 flex justify-between text-xs text-gray-600">
            <span>Min: {(activityStats.min / 1000).toFixed(1)}k</span>
            <span>Max: {(activityStats.max / 1000).toFixed(1)}k</span>
          </div>
        </div>

        {/* SpO2 Summary */}
        <div className="bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-100 p-5 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <Wind className="text-green-500" size={22} />
            <span className="text-sm font-semibold text-gray-800">Blood Oxygen</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{spo2Stats.avg.toFixed(1)}</span>
            <span className="text-sm text-gray-600">%</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className={`font-medium ${spo2Stats.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {spo2Stats.trend >= 0 ? '↑' : '↓'} {Math.abs(spo2Stats.trend).toFixed(1)}%
            </span>
            <span className="text-gray-500">vs prev 3 days</span>
          </div>
          <div className="mt-3 pt-3 border-t border-green-100 flex justify-between text-xs text-gray-600">
            <span>Min: {spo2Stats.min.toFixed(1)}%</span>
            <span>Max: {spo2Stats.max.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Trend Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Heart Rate Trend */}
        {hrData.length > 0 && (
          <MetricCard title="Heart Rate Trend" icon={Heart} iconColor="text-red-500">
            <MetricLineChart
              data={hrData}
              metricType="hr"
              label="Avg HR"
              height={250}
              unit=" bpm"
            />
          </MetricCard>
        )}

        {/* Sleep Trend */}
        {sleepData.length > 0 && (
          <MetricCard title="Sleep Score Trend" icon={Moon} iconColor="text-purple-500">
            <MetricLineChart
              data={sleepData}
              metricType="sleep"
              label="Sleep Score"
              height={250}
              unit="/100"
            />
          </MetricCard>
        )}

        {/* Activity Trend */}
        {activityData.length > 0 && (
          <MetricCard title="Activity Trend" icon={Activity} iconColor="text-blue-500">
            <MetricLineChart
              data={activityData}
              metricType="activity"
              label="Steps"
              height={250}
              unit=" steps"
            />
          </MetricCard>
        )}

        {/* SpO2 Trend */}
        {spo2Data.length > 0 && (
          <MetricCard title="Blood Oxygen Trend" icon={Wind} iconColor="text-green-500">
            <MetricLineChart
              data={spo2Data}
              metricType="spo2"
              label="Avg SpO2"
              height={250}
              unit="%"
            />
          </MetricCard>
        )}
      </div>

      {/* Data Availability Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 mb-1">
              {userOverview.metrics.length} days of tracking data
            </p>
            <p className="text-xs text-blue-700">
              Select a specific date from the top bar to view detailed metrics for that day
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
