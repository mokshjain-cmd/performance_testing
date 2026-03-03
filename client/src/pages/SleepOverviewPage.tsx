import React, { useEffect, useState } from 'react';
import { Moon, Clock, Zap, TrendingUp } from 'lucide-react';
import { SleepMetricCard } from '../components/dashboard/sleep/SleepMetricCard';
import { SleepTrendChart } from '../components/dashboard/sleep/SleepTrendChart';
import { SleepArchitectureChart } from '../components/dashboard/sleep/SleepArchitectureChart';
import { sleepService } from '../services/sleep.service';
import { useAuth } from '../hooks/useAuth';
import type { UserSleepOverview, SleepTrendData } from '../types/sleep.types';

export const SleepOverviewPage: React.FC = () => {
  const { userId } = useAuth();
  const [overview, setOverview] = useState<UserSleepOverview | null>(null);
  const [durationTrend, setDurationTrend] = useState<SleepTrendData[]>([]);
  const [stageTrend, setStageTrend] = useState<SleepTrendData[]>([]);
  const [efficiencyTrend, setEfficiencyTrend] = useState<SleepTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [overviewData, trendData] =
          await Promise.all([
            sleepService.getUserSleepOverview({ userId }),
            sleepService.getUserSleepTrend(userId),
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
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading sleep data...</div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error || 'No sleep data available'}</div>
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
          <h1 className="text-3xl font-bold">Sleep Overview</h1>
          <p className="text-gray-600 mt-1">
            Analysis of your sleep patterns over the last {overview.totalSessions} sessions
          </p>
        </div>
        <Moon className="w-12 h-12 text-blue-500" />
      </div>

      {/* Core Metrics Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Core Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SleepMetricCard
            title="Avg Total Sleep Time"
            value={formatTime(overview.avgTotalSleepTimeSec)}
            icon={<Moon className="w-6 h-6" />}
          />
          <SleepMetricCard
            title="Avg Sleep Efficiency"
            value={overview.avgSleepEfficiencyPercent.toFixed(1)}
            unit="%"
            icon={<Zap className="w-6 h-6" />}
          />
          <SleepMetricCard
            title="Avg Deep Sleep"
            value={formatTime(overview.avgDeepSleepSec)}
            subtitle={`${overview.deepSleepPercent.toFixed(1)}% of sleep`}
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <SleepMetricCard
            title="Avg REM Sleep"
            value={formatTime(overview.avgRemSleepSec)}
            subtitle={`${overview.remPercent.toFixed(1)}% of sleep`}
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <SleepMetricCard
            title="Avg Light Sleep"
            value={formatTime(overview.avgLightSleepSec)}
            subtitle={`${((overview.avgLightSleepSec / overview.avgTotalSleepTimeSec) * 100).toFixed(1)}% of sleep`}
          />
          <SleepMetricCard
            title="Avg Awake Time"
            value={formatTime(overview.avgAwakeSec)}
            subtitle={`${((overview.avgAwakeSec / overview.avgTotalSleepTimeSec) * 100).toFixed(1)}% of sleep`}
          />
          <SleepMetricCard
            title="Avg Sleep Start"
            value="N/A"
            icon={<Clock className="w-6 h-6" />}
          />
          <SleepMetricCard
            title="Avg Wake Time"
            value="N/A"
            icon={<Clock className="w-6 h-6" />}
          />
        </div>
      </div>

      {/* Stability Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Sleep Stability</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SleepMetricCard
            title="Deep Sleep Consistency"
            value={overview.deepSleepPercent.toFixed(1)}
            unit="%"
            subtitle={`Target: 15-20%`}
          />
          <SleepMetricCard
            title="REM Sleep Consistency"
            value={overview.remPercent.toFixed(1)}
            unit="%"
            subtitle={`Target: 20-25%`}
          />
          <SleepMetricCard
            title="Duration Variability"
            value={formatTime(overview.sleepDurationStdDev)}
            subtitle="Lower is better"
          />
          <SleepMetricCard
            title="Sleep Consistency Score"
            value={overview.sleepConsistencyScore.toFixed(1)}
            unit="/100"
            subtitle="Higher is better"
          />
        </div>
      </div>

      {/* Sleep Duration Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <SleepTrendChart
          data={durationTrend}
          metrics={['totalSleepTime']}
          title="Sleep Duration Trend (Last 30 Days)"
        />
      </div>

      {/* Deep & REM Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <SleepTrendChart
          data={stageTrend}
          metrics={['deep', 'rem']}
          title="Deep & REM Sleep Trend (Last 30 Days)"
        />
      </div>

      {/* Sleep Efficiency Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <SleepTrendChart
          data={efficiencyTrend}
          metrics={['efficiency']}
          title="Sleep Efficiency Trend (Last 30 Days)"
        />
      </div>

      {/* Sleep Architecture */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Average Sleep Architecture</h2>
        <SleepArchitectureChart
          deep={overview.avgDeepSleepSec}
          light={overview.avgLightSleepSec}
          rem={overview.avgRemSleepSec}
          awake={overview.avgAwakeSec}
        />
      </div>
    </div>
  );
};
