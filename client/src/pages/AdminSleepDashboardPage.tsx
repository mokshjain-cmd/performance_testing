import React, { useEffect, useState } from 'react';
import { Users, CheckCircle, TrendingUp, Activity } from 'lucide-react';
import { SleepMetricCard } from '../components/dashboard/sleep/SleepMetricCard';
import { SleepTrendChart } from '../components/dashboard/sleep/SleepTrendChart';
import { sleepService } from '../services/sleep.service';
import type { AdminGlobalSleepSummary, SleepTrendData } from '../types/sleep.types';

export const AdminSleepDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<AdminGlobalSleepSummary | null>(null);
  const [accuracyTrend, setAccuracyTrend] = useState<SleepTrendData[]>([]);
  const [stageTrend, setStageTrend] = useState<SleepTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summaryData, trendData] = await Promise.all([
          sleepService.getAdminGlobalSummary(),
          sleepService.getAdminAccuracyTrend(),
        ]);

        setSummary(summaryData);
        setAccuracyTrend(trendData);
        setStageTrend(trendData);
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sleep Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Global sleep analysis and validation metrics
          </p>
        </div>
        <Activity className="w-12 h-12 text-blue-500" />
      </div>

      {/* Population Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Population Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SleepMetricCard
            title="Total Sessions"
            value={summary.totalSessions}
            icon={<Activity className="w-6 h-6" />}
          />
          <SleepMetricCard
            title="Total Users"
            value={summary.totalUsers}
            icon={<Users className="w-6 h-6" />}
          />
          <SleepMetricCard
            title="Avg Sleep Duration"
            value={formatTime(summary.avgTotalSleepTimeSec)}
          />
          <SleepMetricCard
            title="Latest Firmware"
            value={summary.latestFirmwareVersion}
          />
        </div>
      </div>

      {/* Stage Distribution */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Average Stage Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          <SleepMetricCard
            title="Deep Sleep"
            value={summary.avgDeepPercent.toFixed(1)}
            unit="%"
          />
          <SleepMetricCard
            title="REM Sleep"
            value={summary.avgRemPercent.toFixed(1)}
            unit="%"
          />
        </div>
      </div>

      {/* Validation Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Validation Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SleepMetricCard
            title="Overall Accuracy"
            value={summary.avgEpochAccuracyPercent.toFixed(1)}
            unit="%"
            icon={<CheckCircle className="w-6 h-6" />}
          />
          <SleepMetricCard
            title="Cohen's Kappa"
            value={summary.avgKappaScore.toFixed(3)}
            subtitle="Agreement score"
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <SleepMetricCard
            title="Deep Sleep Bias"
            value={`${(summary.avgDeepBiasSec / 60).toFixed(1)} min`}
            subtitle="Falcon vs Benchmark"
          />
          <SleepMetricCard
            title="REM Sleep Bias"
            value={`${(summary.avgRemBiasSec / 60).toFixed(1)} min`}
            subtitle="Falcon vs Benchmark"
          />
        </div>
      </div>

      {/* Stage-wise Sensitivity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Stage Detection Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SleepMetricCard
            title="Deep Sleep Sensitivity"
            value={summary.stageSensitivity.DEEP.toFixed(1)}
            unit="%"
            subtitle="True positive rate"
          />
          <SleepMetricCard
            title="Light Sleep Sensitivity"
            value={summary.stageSensitivity.LIGHT.toFixed(1)}
            unit="%"
            subtitle="True positive rate"
          />
          <SleepMetricCard
            title="REM Sleep Sensitivity"
            value={summary.stageSensitivity.REM.toFixed(1)}
            unit="%"
            subtitle="True positive rate"
          />
          <SleepMetricCard
            title="Awake Sensitivity"
            value={summary.stageSensitivity.AWAKE.toFixed(1)}
            unit="%"
            subtitle="True positive rate"
          />
        </div>
      </div>

      {/* Accuracy & Kappa Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <SleepTrendChart
          data={accuracyTrend}
          metrics={['accuracy', 'kappa']}
          title="Validation Performance Trend (Last 90 Days)"
        />
      </div>

      {/* Stage Distribution Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <SleepTrendChart
          data={stageTrend}
          metrics={['deep', 'rem', 'light']}
          title="Population Sleep Stage Trend (Last 90 Days)"
        />
      </div>
    </div>
  );
};
